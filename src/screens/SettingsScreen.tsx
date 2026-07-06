// src/screens/SettingsScreen.tsx
import { useEffect, useState } from 'react'
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { useSettings } from '../context/SettingsContext'
import { registerForPushNotifications } from '../notifications/pushNotifications'
import BottomSheet from '../components/BottomSheet'
import { useTheme } from '../context/ThemeContext'

interface SettingsScreenProps {
  visible: boolean
  onClose: () => void
}

export default function SettingsScreen({ visible, onClose }: SettingsScreenProps) {
  const { colors, isDark, toggleTheme } = useTheme()
  const { notificationsEnabled, setNotificationsEnabled, backendUrl, setBackendUrl, apiKey, setApiKey } = useSettings()
  const [urlDraft, setUrlDraft] = useState(backendUrl)
  const [apiKeyDraft, setApiKeyDraft] = useState(apiKey)

  useEffect(() => {
    setUrlDraft(backendUrl)
  }, [backendUrl])

  useEffect(() => {
    setApiKeyDraft(apiKey)
  }, [apiKey])

  const toggleNotifications = async (enabled: boolean) => {
    await setNotificationsEnabled(enabled)
    if (enabled) await registerForPushNotifications()
  }

  const saveBackendUrl = async () => {
    const cleaned = urlDraft.trim()
    if (cleaned && cleaned !== backendUrl) await setBackendUrl(cleaned)
  }

  const saveApiKey = async () => {
    if (apiKeyDraft.trim() !== apiKey) await setApiKey(apiKeyDraft)
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Settings">
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Backend</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Backend URL</Text>
        <TextInput
          style={[styles.urlInput, { color: colors.textPrimary, borderColor: colors.border }]}
          value={urlDraft}
          onChangeText={setUrlDraft}
          onBlur={saveBackendUrl}
          onSubmitEditing={saveBackendUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://192.168.0.10:8000"
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Where MAT-AI-OS is running — a LAN address or tunnel URL. Saved when you tap away.
        </Text>

        <Text style={[styles.label, { color: colors.textPrimary }]}>API Key</Text>
        <TextInput
          style={[styles.urlInput, { color: colors.textPrimary, borderColor: colors.border }]}
          value={apiKeyDraft}
          onChangeText={setApiKeyDraft}
          onBlur={saveApiKey}
          onSubmitEditing={saveApiKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder="Only needed if the backend has MAT_API_KEY set"
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Must match the backend's MAT_API_KEY exactly. Leave blank if it isn't configured.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notifications</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Push notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: colors.border, true: colors.accentPurple }}
          />
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Daily briefing (8 AM) and weekly review (Mon 9 AM).
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Night mode</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.accentPurple }}
          />
        </View>
      </View>

      <View style={{ height: 40 }} />
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
  },
})
