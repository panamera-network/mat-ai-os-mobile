import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { matOsClient, type HealthStatus } from '../api/MatOSClient'
import { useSettings } from './SettingsContext'
import { getQueue, removeFromQueue } from '../storage/offlineQueue'

interface BackendStatusState {
  online: boolean
  health: HealthStatus | null
  pendingTasks: number
  syncedCount: number
  refresh: () => Promise<void>
}

const BackendStatusContext = createContext<BackendStatusState>({
  online: false,
  health: null,
  pendingTasks: 0,
  syncedCount: 0,
  refresh: async () => {},
})

const POLL_INTERVAL_MS = 8000

async function flushOfflineQueue(): Promise<number> {
  const items = await getQueue()
  if (items.length === 0) return 0
  let synced = 0
  for (const item of items) {
    const result = item.type === 'memo'
      ? await matOsClient.saveMemo(item.text)
      : await matOsClient.saveReminder(item.text)
    if (result.ok) {
      await removeFromQueue(item.id)
      synced++
    }
  }
  return synced
}

export function BackendStatusProvider({ children }: { children: ReactNode }) {
  const { loaded } = useSettings()
  const [online, setOnline] = useState(false)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [pendingTasks, setPendingTasks] = useState(0)
  const [syncedCount, setSyncedCount] = useState(0)
  const wasOnlineRef = useRef(false)

  const refresh = useCallback(async () => {
    const status = await matOsClient.getStatus()
    if (status.online) {
      const justCameOnline = !wasOnlineRef.current
      wasOnlineRef.current = true
      setOnline(true)
      setHealth(status.data)
      setPendingTasks(await matOsClient.getQueuePendingCount())

      if (justCameOnline) {
        const synced = await flushOfflineQueue()
        if (synced > 0) setSyncedCount(c => c + synced)
      }
    } else {
      wasOnlineRef.current = false
      setOnline(false)
      setHealth(null)
      setPendingTasks(0)
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    refresh()
    const id = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, refresh])

  return (
    <BackendStatusContext.Provider value={{ online, health, pendingTasks, syncedCount, refresh }}>
      {children}
    </BackendStatusContext.Provider>
  )
}

export function useBackendStatus() {
  return useContext(BackendStatusContext)
}
