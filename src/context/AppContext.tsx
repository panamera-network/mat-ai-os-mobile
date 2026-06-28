// src/context/AppContext.tsx
import React, { createContext, useContext, useState, useCallback, JSX } from 'react'

export interface AppContextType {
  agentsVisible: boolean
  setAgentsVisible: (v: boolean) => void
  goalsVisible: boolean
  setGoalsVisible: (v: boolean) => void
  settingsVisible: boolean
  setSettingsVisible: (v: boolean) => void
  statsToggle: number
  toggleStats: () => void
  pttToggle: number
  togglePTT: () => void
  isRecording: boolean
  setIsRecording: (v: boolean) => void
  commandComposerVisible: boolean
  setCommandComposerVisible: (v: boolean) => void
  darkMode: boolean
  setDarkMode: (v: boolean) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [agentsVisible, setAgentsVisible] = useState<boolean>(false)
  const [goalsVisible, setGoalsVisible] = useState<boolean>(false)
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false)
  const [statsToggle, setStatsToggle] = useState<number>(0)
  const [pttToggle, setPttToggle] = useState<number>(0)
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [commandComposerVisible, setCommandComposerVisible] = useState<boolean>(false)
  const [darkMode, setDarkMode] = useState<boolean>(true)

  const toggleStats = useCallback(() => {
    setStatsToggle(k => k + 1)
  }, [])

  const togglePTT = useCallback(() => {
    setPttToggle(k => k + 1)
  }, [])

  const value: AppContextType = {
    agentsVisible,
    setAgentsVisible,
    goalsVisible,
    setGoalsVisible,
    settingsVisible,
    setSettingsVisible,
    statsToggle,
    toggleStats,
    pttToggle,
    togglePTT,
    isRecording,
    setIsRecording,
    commandComposerVisible,
    setCommandComposerVisible,
    darkMode,
    setDarkMode,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider')
  }
  return ctx
}
