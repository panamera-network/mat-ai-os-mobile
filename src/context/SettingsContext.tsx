import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { matOsClient, DEFAULT_BASE_URL } from '../api/MatOSClient'
import { STORAGE_KEYS } from '../storage/storageKeys'

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

interface SettingsState {
  backendUrl: string
  sessionId: string
  notificationsEnabled: boolean
  loaded: boolean
  setBackendUrl: (url: string) => Promise<void>
  newSession: () => Promise<void>
  setNotificationsEnabled: (enabled: boolean) => Promise<void>
}

const SettingsContext = createContext<SettingsState>({
  backendUrl: DEFAULT_BASE_URL,
  sessionId: '',
  notificationsEnabled: true,
  loaded: false,
  setBackendUrl: async () => {},
  newSession: async () => {},
  setNotificationsEnabled: async () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [backendUrl, setBackendUrlState] = useState(DEFAULT_BASE_URL)
  const [sessionId, setSessionIdState] = useState('')
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [storedUrl, storedSession, storedNotif] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.backendUrl),
        AsyncStorage.getItem(STORAGE_KEYS.sessionId),
        AsyncStorage.getItem(STORAGE_KEYS.notificationsEnabled),
      ])

      const url = storedUrl || DEFAULT_BASE_URL
      const session = storedSession || generateSessionId()

      setBackendUrlState(url)
      setSessionIdState(session)
      setNotificationsEnabledState(storedNotif !== 'false')

      matOsClient.setBaseUrl(url)
      matOsClient.setSessionId(session)

      if (!storedSession) await AsyncStorage.setItem(STORAGE_KEYS.sessionId, session)
      setLoaded(true)
    }
    load()
  }, [])

  const setBackendUrl = useCallback(async (url: string) => {
    const trimmed = url.trim().replace(/\/+$/, '') || DEFAULT_BASE_URL
    setBackendUrlState(trimmed)
    matOsClient.setBaseUrl(trimmed)
    await AsyncStorage.setItem(STORAGE_KEYS.backendUrl, trimmed)
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

  return (
    <SettingsContext.Provider
      value={{ backendUrl, sessionId, notificationsEnabled, loaded, setBackendUrl, newSession, setNotificationsEnabled }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
