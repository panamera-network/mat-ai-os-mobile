// src/context/ThemeContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, JSX } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface ThemeColors {
  bgApp: string
  bgPanel: string
  bgCard: string
  border: string
  textPrimary: string
  textSecondary: string
  accentPurple: string
  accentGreen: string
  accentRed: string
  accentBlue: string
  nodeIdle: string
}

export const darkColors: ThemeColors = {
  bgApp: '#02030a',
  bgPanel: '#090b16',
  bgCard: '#111525',
  border: 'rgba(226,232,240,0.16)',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  accentPurple: '#8b5cf6',
  accentGreen: '#22c55e',
  accentRed: '#ef4444',
  accentBlue: '#38bdf8',
  nodeIdle: '#64748b',
}

export const lightColors: ThemeColors = {
  bgApp: '#ffffff',
  bgPanel: '#ffffff',
  bgCard: 'rgba(255,255,255,0.78)',
  border: 'rgba(23,23,23,0.18)',
  textPrimary: '#111111',
  textSecondary: '#5f6472',
  accentPurple: '#7c3aed',
  accentGreen: '#16a34a',
  accentRed: '#dc2626',
  accentBlue: '#0284c7',
  nodeIdle: '#9ca3af',
}

interface ThemeContextType {
  isDark: boolean
  colors: ThemeColors
  toggleTheme: () => void
  setTheme: (dark: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = '@mat_ai_theme'

export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element | null {
  const [isDark, setIsDark] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY)
        if (stored !== null) {
          setIsDark(stored === 'dark')
        }
      } catch (e) {
        console.log('Failed to load theme', e)
      }
      setLoaded(true)
    }
    loadTheme()
  }, [])

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev
      AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light').catch(() => {})
      return next
    })
  }, [])

  const setTheme = useCallback((dark: boolean) => {
    setIsDark(dark)
    AsyncStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light').catch(() => {})
  }, [])

  const colors = isDark ? darkColors : lightColors

  if (!loaded) return null // or loading spinner

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }
  return ctx
}
