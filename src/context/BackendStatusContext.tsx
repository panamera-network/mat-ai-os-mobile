import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { matOsClient, type HealthStatus } from '../api/MatOSClient'
import { useSettings } from './SettingsContext'

interface BackendStatusState {
  online: boolean
  health: HealthStatus | null
  pendingTasks: number
  refresh: () => Promise<void>
}

const BackendStatusContext = createContext<BackendStatusState>({
  online: false,
  health: null,
  pendingTasks: 0,
  refresh: async () => {},
})

const POLL_INTERVAL_MS = 8000

export function BackendStatusProvider({ children }: { children: ReactNode }) {
  const { loaded, backendUrl } = useSettings()
  const [online, setOnline] = useState(false)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [pendingTasks, setPendingTasks] = useState(0)

  const refresh = useCallback(async () => {
    const status = await matOsClient.getStatus()
    if (status.online) {
      setOnline(true)
      setHealth(status.data)
      setPendingTasks(await matOsClient.getQueuePendingCount())
    } else {
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
  }, [loaded, backendUrl, refresh])

  return <BackendStatusContext.Provider value={{ online, health, pendingTasks, refresh }}>{children}</BackendStatusContext.Provider>
}

export function useBackendStatus() {
  return useContext(BackendStatusContext)
}
