import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import RootNavigator from './src/navigation/RootNavigator'
import { SettingsProvider, useSettings } from './src/context/SettingsContext'
import { BackendStatusProvider } from './src/context/BackendStatusContext'
import { registerForPushNotifications } from './src/notifications/pushNotifications'

function PushNotificationBootstrap() {
  const { loaded, notificationsEnabled } = useSettings()

  useEffect(() => {
    if (loaded && notificationsEnabled) {
      registerForPushNotifications()
    }
  }, [loaded, notificationsEnabled])

  return null
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <BackendStatusProvider>
          <PushNotificationBootstrap />
          <RootNavigator />
          <StatusBar style="light" />
        </BackendStatusProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  )
}
