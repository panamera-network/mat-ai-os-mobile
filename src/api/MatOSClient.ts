// The ONLY place in the mobile app that talks to MAT-AI-OS. Same pattern as MK1's
// core/os-client.ts (Electron) — a thin client around the backend's REST API, no
// silent fallback: failures come back as {ok:false, error} for the caller to surface.

import Constants from 'expo-constants'

export const DEFAULT_BASE_URL = 'http://localhost:8000'

// Candidates tried in order during auto-discovery.
function buildCandidates(): string[] {
  const configured = (Constants.expoConfig?.extra as { backendUrl?: string } | undefined)?.backendUrl
  const candidates: string[] = []
  if (configured) candidates.push(configured.replace(/\/+$/, ''))
  candidates.push('http://localhost:8000')
  // Derive LAN candidates from the JS bundle URL (works in Expo Go / dev builds)
  try {
    const debugUrl = (Constants.expoConfig as unknown as { hostUri?: string })?.hostUri
    if (debugUrl) {
      const host = debugUrl.split(':')[0]
      if (host && host !== 'localhost') {
        candidates.push(`http://${host}:8000`)
      }
    }
  } catch {}
  return [...new Set(candidates)]
}

/** Check whether one specific backend URL is reachable (GET /health). */
export async function probeBackend(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/health`, { signal: AbortSignal.timeout(2500) })
    return res.ok
  } catch {
    return false
  }
}

export async function discoverBackend(): Promise<string | null> {
  const candidates = buildCandidates()
  for (const url of candidates) {
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2500) })
      if (res.ok) return url
    } catch {}
  }
  return null
}

export interface MatOSAttachment {
  uri: string
  name: string
  mimeType?: string
}

export interface TaskResult {
  ok: true
  text: string
  sessionId: string
  feedbackTaskId: string | null
  // Set when the orchestrator was busy and the task went to the queue instead of
  // running directly — poll waitForQueuedTask() with it to get the eventual result.
  queuedTaskId: string | null
}

export interface MatOSError {
  ok: false
  error: string
}

export type TaskOutcome = TaskResult | MatOSError

interface TaskResponseBody {
  result?: string | null
  session_id?: string | null
  queued?: boolean
  task_id?: string | null
  feedback_task_id?: string | null
}

export interface HealthStatus {
  status: string
  agents_count: number
  active_agents_count: number
  skills_count: number
  domains_count: number
  active_model?: { provider: string; model: string }
  telegram_status?: string
}

export interface Agent {
  agent_id: string
  name: string
  domain: string
  skill_ids: string[]
  status: 'active' | 'idle'
}

export interface Milestone {
  id: string
  title: string
  done: boolean
}

export interface Goal {
  id: string
  title: string
  type: 'short_term' | 'long_term'
  status: 'active' | 'completed' | 'paused'
  milestones: Milestone[]
  progress: number
  created_at: string
  target_date: string | null
}

export interface DailyBriefing {
  greeting: string
  generated_at: string
  goals: { active_count: number; average_progress: number }
  pending_tasks: number
  active_loops: number
  total_loops: number
  suggestions_count: number
  alerts: unknown[]
}

export interface IdentityProfile {
  name: string
  nickname: string
  profession: string[]
  active_projects: string[]
  goals: { short_term: string[]; long_term: string[] }
  preferences: { communication_style: string; work_hours: string }
  timezone: string
  active_mode: string
}

const OFFLINE_MESSAGE = (url: string) => `Could not reach MAT-AI-OS at ${url}. Check the backend URL in Settings.`

export class MatOSClient {
  private baseUrl: string
  private sessionId: string | null = null

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, '')
  }

  getBaseUrl(): string {
    return this.baseUrl
  }

  setSessionId(sessionId: string | null): void {
    this.sessionId = sessionId
  }

  getSessionId(): string | null {
    return this.sessionId
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`
  }

  /** POST /task or /task/upload (when a file is attached). Never throws. */
  async sendTask(message: string, sessionId?: string | null, file?: MatOSAttachment): Promise<TaskOutcome> {
    const activeSessionId = sessionId ?? this.sessionId ?? undefined

    let response: Response
    try {
      if (file) {
        const form = new FormData()
        form.append('task', message)
        if (activeSessionId) form.append('session_id', activeSessionId)
        form.append('priority', 'normal')
        // React Native's fetch/FormData polyfill accepts {uri, name, type} directly —
        // no need to read the file into memory ourselves.
        form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob)
        response = await fetch(this.url('/task/upload'), { method: 'POST', body: form })
      } else {
        response = await fetch(this.url('/task'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: message, session_id: activeSessionId }),
        })
      }
    } catch {
      return { ok: false, error: OFFLINE_MESSAGE(this.baseUrl) }
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      return { ok: false, error: `MAT-AI-OS returned ${response.status}${bodyText ? `: ${bodyText}` : ''}` }
    }

    const data = (await response.json()) as TaskResponseBody
    if (data.session_id) this.sessionId = data.session_id

    if (data.queued) {
      return {
        ok: true,
        text: "MAT-AI-OS is busy right now — your task has been queued and the answer will appear here once it runs, BOSS.",
        sessionId: this.sessionId ?? '',
        feedbackTaskId: null,
        queuedTaskId: data.task_id ?? null,
      }
    }

    return {
      ok: true,
      text: data.result ?? '',
      sessionId: this.sessionId ?? '',
      feedbackTaskId: data.feedback_task_id ?? null,
      queuedTaskId: null,
    }
  }

  /** Poll GET /queue/{task_id} until a queued task (see TaskResult.queuedTaskId) finishes.
   *  Resolves with the result text, or {ok:false} on failure/cancellation/timeout. Never throws. */
  async waitForQueuedTask(taskId: string): Promise<{ ok: true; text: string } | MatOSError> {
    const intervalMs = 3000
    const maxAttempts = 200 // ~10 minutes, then give up rather than poll forever
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
      let record: { status: string; result: string | null; error: string | null }
      try {
        const response = await fetch(this.url(`/queue/${taskId}`), { signal: AbortSignal.timeout(5000) })
        if (!response.ok) continue
        record = (await response.json()) as { status: string; result: string | null; error: string | null }
      } catch {
        continue // transient network blip — keep polling
      }
      if (record.status === 'completed') return { ok: true, text: record.result ?? '' }
      if (record.status === 'failed') return { ok: false, error: `Queued task failed: ${record.error ?? 'unknown error'}` }
      if (record.status === 'cancelled') return { ok: false, error: 'The queued task was cancelled before it ran.' }
    }
    return { ok: false, error: 'Still waiting on the queued task — it will finish on the backend, but polling timed out.' }
  }

  /** Upload a recorded voice message and get back the transcribed text. */
  async transcribeAudio(file: MatOSAttachment): Promise<{ ok: true; text: string } | MatOSError> {
    try {
      const form = new FormData()
      form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'audio/m4a' } as unknown as Blob)
      const response = await fetch(this.url('/voice/transcribe'), { method: 'POST', body: form })
      if (!response.ok) return { ok: false, error: `Transcription failed: HTTP ${response.status}` }
      const data = (await response.json()) as { text: string }
      return { ok: true, text: data.text }
    } catch {
      return { ok: false, error: OFFLINE_MESSAGE(this.baseUrl) }
    }
  }

  /** GET /health — online/offline + agent/skill counts. */
  async getStatus(): Promise<{ online: true; data: HealthStatus } | { online: false; error: string }> {
    try {
      const response = await fetch(this.url('/health'), { signal: AbortSignal.timeout(5000) })
      if (!response.ok) return { online: false, error: `HTTP ${response.status}` }
      const data = (await response.json()) as HealthStatus
      return { online: true, data }
    } catch {
      return { online: false, error: OFFLINE_MESSAGE(this.baseUrl) }
    }
  }

  async getAgents(): Promise<Agent[]> {
    try {
      const response = await fetch(this.url('/agents'), { signal: AbortSignal.timeout(5000) })
      if (!response.ok) return []
      return (await response.json()) as Agent[]
    } catch {
      return []
    }
  }

  async getQueuePendingCount(): Promise<number> {
    try {
      const response = await fetch(this.url('/queue'), { signal: AbortSignal.timeout(5000) })
      if (!response.ok) return 0
      const data = (await response.json()) as { tasks: Array<{ status: string }> }
      return data.tasks.filter((t) => t.status === 'pending' || t.status === 'running').length
    } catch {
      return 0
    }
  }

  async getGoals(): Promise<Goal[]> {
    try {
      const response = await fetch(this.url('/goals'), { signal: AbortSignal.timeout(5000) })
      if (!response.ok) return []
      const data = (await response.json()) as { goals: Goal[] }
      return data.goals
    } catch {
      return []
    }
  }

  async addGoal(title: string, type: 'short_term' | 'long_term'): Promise<Goal | null> {
    try {
      const response = await fetch(this.url('/goals'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type }),
      })
      if (!response.ok) return null
      return (await response.json()) as Goal
    } catch {
      return null
    }
  }

  async completeGoal(goalId: string): Promise<boolean> {
    try {
      const response = await fetch(this.url(`/goals/${goalId}/complete`), { method: 'POST' })
      return response.ok
    } catch {
      return false
    }
  }

  async getDailyBriefing(): Promise<DailyBriefing | null> {
    try {
      const response = await fetch(this.url('/briefing'), { signal: AbortSignal.timeout(5000) })
      if (!response.ok) return null
      const data = (await response.json()) as { daily: DailyBriefing | null }
      return data.daily
    } catch {
      return null
    }
  }

  async getIdentity(): Promise<IdentityProfile | null> {
    try {
      const response = await fetch(this.url('/identity'), { signal: AbortSignal.timeout(5000) })
      if (!response.ok) return null
      return (await response.json()) as IdentityProfile
    } catch {
      return null
    }
  }

  async updateIdentity(field: string, value: unknown): Promise<IdentityProfile | null> {
    try {
      const response = await fetch(this.url('/identity'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      })
      if (!response.ok) return null
      return (await response.json()) as IdentityProfile
    } catch {
      return null
    }
  }

  async submitFeedback(taskId: string, rating: number): Promise<void> {
    try {
      await fetch(this.url('/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, rating }),
      })
    } catch {
      // best-effort
    }
  }

  /** POST /obsidian/note — save a quick memo into the vault. */
  async saveMemo(text: string): Promise<{ ok: true; filename: string } | MatOSError> {
    try {
      const now = new Date()
      const title = `Memo ${now.toISOString().slice(0, 16).replace('T', ' ')}`
      const content = `# ${title}\n\n${text}\n\n---\n_Captured via MAT.ai OS mobile_`
      const response = await fetch(this.url('/obsidian/note'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, folder: 'Mobile/Memos' }),
      })
      if (!response.ok) return { ok: false, error: `Failed to save memo: HTTP ${response.status}` }
      const data = (await response.json()) as { filename: string }
      return { ok: true, filename: data.filename }
    } catch {
      return { ok: false, error: OFFLINE_MESSAGE(this.baseUrl) }
    }
  }

  /** POST /obsidian/note — save a reminder into the vault. */
  async saveReminder(text: string): Promise<{ ok: true; filename: string } | MatOSError> {
    try {
      const now = new Date()
      const title = `Reminder ${now.toISOString().slice(0, 16).replace('T', ' ')}`
      const content = `# ${title}\n\n- [ ] ${text}\n\n---\n_Captured via MAT.ai OS mobile_`
      const response = await fetch(this.url('/obsidian/note'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, folder: 'Mobile/Reminders' }),
      })
      if (!response.ok) return { ok: false, error: `Failed to save reminder: HTTP ${response.status}` }
      const data = (await response.json()) as { filename: string }
      return { ok: true, filename: data.filename }
    } catch {
      return { ok: false, error: OFFLINE_MESSAGE(this.baseUrl) }
    }
  }

  /** POST /notifications/register-device — register this device's Expo push token. */
  async registerDevice(token: string, platform: string): Promise<boolean> {
    try {
      const response = await fetch(this.url('/notifications/register-device'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, platform }),
      })
      return response.ok
    } catch {
      return false
    }
  }
}

export const matOsClient = new MatOSClient()
