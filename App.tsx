// src/App.tsx
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SettingsProvider, useSettings } from './src/context/SettingsContext'
import { BackendStatusProvider } from './src/context/BackendStatusContext'
import { AppProvider } from './src/context/AppContext'
import { ThemeProvider, useTheme } from './src/context/ThemeContext'
import { registerForPushNotifications } from './src/notifications/pushNotifications'
import RootNavigator from './src/navigation/RootNavigator'

function PushNotificationBootstrap() {
  const { loaded, notificationsEnabled } = useSettings()

  useEffect(() => {
    if (loaded && notificationsEnabled) {
      registerForPushNotifications()
    }
  }, [loaded, notificationsEnabled])

  return null
}

function StatusBarManager() {
  const { isDark } = useTheme()
  return <StatusBar style={isDark ? 'light' : 'dark'} />
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SettingsProvider>
          <BackendStatusProvider>
            <AppProvider>
              <PushNotificationBootstrap />
              <RootNavigator />
              <StatusBarManager />
            </AppProvider>
          </BackendStatusProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

