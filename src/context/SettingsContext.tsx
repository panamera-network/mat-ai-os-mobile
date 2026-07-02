import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { matOsClient, discoverBackend, probeBackend, DEFAULT_BASE_URL } from '../api/MatOSClient'
import { STORAGE_KEYS } from '../storage/storageKeys'

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

interface SettingsState {
  sessionId: string
  notificationsEnabled: boolean
  backendUrl: string
  loaded: boolean
  newSession: () => Promise<void>
  setNotificationsEnabled: (enabled: boolean) => Promise<void>
  setBackendUrl: (url: string) => Promise<void>
}

const SettingsContext = createContext<SettingsState>({
  sessionId: '',
  notificationsEnabled: true,
  backendUrl: DEFAULT_BASE_URL,
  loaded: false,
  newSession: async () => {},
  setNotificationsEnabled: async () => {},
  setBackendUrl: async () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionIdState] = useState('')
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true)
  const [backendUrl, setBackendUrlState] = useState(DEFAULT_BASE_URL)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [storedSession, storedNotif] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.sessionId),
        AsyncStorage.getItem(STORAGE_KEYS.notificationsEnabled),
      ])

      const session = storedSession || generateSessionId()
      setSessionIdState(session)
      setNotificationsEnabledState(storedNotif !== 'false')
      if (!storedSession) await AsyncStorage.setItem(STORAGE_KEYS.sessionId, session)

      // Auto-discover backend — try cached URL first, then scan candidates
      const cachedUrl = await AsyncStorage.getItem(STORAGE_KEYS.backendUrl)
      if (cachedUrl) {
        matOsClient.setBaseUrl(cachedUrl)
        setBackendUrlState(cachedUrl)
        // Only re-scan if the saved URL stopped working — a URL the user typed into
        // Settings must not be silently swapped out while it's still healthy.
        probeBackend(cachedUrl).then(async (ok) => {
          if (ok) return
          const found = await discoverBackend()
          if (found) {
            matOsClient.setBaseUrl(found)
            setBackendUrlState(found)
            await AsyncStorage.setItem(STORAGE_KEYS.backendUrl, found)
          }
        })
      } else {
        const found = await discoverBackend()
        const url = found ?? DEFAULT_BASE_URL
        matOsClient.setBaseUrl(url)
        setBackendUrlState(url)
        if (found) await AsyncStorage.setItem(STORAGE_KEYS.backendUrl, found)
      }

      matOsClient.setSessionId(session)
      setLoaded(true)
    }
    load()
  }, [])

  const newSession = useCallback(async () => {
    const session = generateSessionId()
    setSessionIdState(session)
    matOsClient.setSessionId(session)
    await AsyncStorage.setItem(STORAGE_KEYS.sessionId, session)
  }, [])

  const setNotificationsEnabled = useCallback(async (enabled: boolean) => {
    setNotificationsEnabledState(enabled)
    await AsyncStorage.setItem(STORAGE_KEYS.notificationsEnabled, enabled ? 'true' : 'false')
  }, [])

  const setBackendUrl = useCallback(async (url: string) => {
    const cleaned = url.trim().replace(/\/+$/, '')
    if (!cleaned) return
    setBackendUrlState(cleaned)
    matOsClient.setBaseUrl(cleaned)
    await AsyncStorage.setItem(STORAGE_KEYS.backendUrl, cleaned)
  }, [])

  return (
    <SettingsContext.Provider
      value={{ sessionId, notificationsEnabled, backendUrl, loaded, newSession, setNotificationsEnabled, setBackendUrl }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
