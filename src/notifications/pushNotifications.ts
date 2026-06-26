// Push notification registration: gets an Expo push token, registers it with
// MAT-AI-OS (POST /notifications/register-device), and configures how notifications
// display in the foreground. The backend pushes daily briefing (8 AM KL) and weekly
// review (Monday 9 AM KL) notifications to every registered device — see
// core/notifications.py's send_push() on the backend.

import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { matOsClient } from '../api/MatOSClient'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push tokens don't work in the simulator/emulator.
    return null
  }

  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync()
    status = requested.status
  }
  if (status !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'MAT.AI OS',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8b5cf6',
    })
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync()
    await matOsClient.registerDevice(token, Platform.OS)
    return token
  } catch {
    return null
  }
}
