import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { colors } from '../theme/colors'
import { matOsClient, type IdentityProfile } from '../api/MatOSClient'
import { useSettings } from '../context/SettingsContext'
import { registerForPushNotifications } from '../notifications/pushNotifications'

const MODES: Array<{ id: 'work' | 'trading' | 'learning'; label: string; icon: string }> = [
  { id: 'work', label: 'Work', icon: '💼' },
  { id: 'trading', label: 'Trading', icon: '📈' },
  { id: 'learning', label: 'Learning', icon: '🎓' },
]

export default function SettingsScreen() {
  const { backendUrl, setBackendUrl, notificationsEnabled, setNotificationsEnabled } = useSettings()
  const [urlInput, setUrlInput] = useState(backendUrl)
  const [savedFlash, setSavedFlash] = useState(false)
  const [identity, setIdentity] = useState<IdentityProfile | null>(null)
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')

  useEffect(() => {
    matOsClient.getIdentity().then((profile) => {
      if (profile) {
        setIdentity(profile)
        setName(profile.name)
        setNickname(profile.nickname)
      }
    })
  }, [])

  const saveUrl = async () => {
    await setBackendUrl(urlInput)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  const saveProfile = async () => {
    await matOsClient.updateIdentity('name', name)
    await matOsClient.updateIdentity('nickname', nickname)
  }

  const setMode = async (mode: string) => {
    const updated = await matOsClient.updateIdentity('active_mode', mode)
    if (updated) setIdentity(updated)
  }

  const toggleNotifications = async (enabled: boolean) => {
    await setNotificationsEnabled(enabled)
    if (enabled) await registerForPushNotifications()
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Backend</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Backend URL</Text>
        <TextInput
          style={styles.input}
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="http://192.168.1.10:8000"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={saveUrl}>
          <Text style={styles.saveBtnText}>{savedFlash ? 'Saved!' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={colors.textSecondary} />
        <Text style={styles.label}>Nickname</Text>
        <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholderTextColor={colors.textSecondary} />
        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
          <Text style={styles.saveBtnText}>Save profile</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Mode</Text>
      <View style={styles.modeRow}>
        {MODES.map((mode) => (
          <TouchableOpacity
            key={mode.id}
            style={[styles.modeBtn, identity?.active_mode === mode.id && styles.modeBtnActive]}
            onPress={() => setMode(mode.id)}
          >
            <Text style={styles.modeIcon}>{mode.icon}</Text>
            <Text style={styles.modeLabel}>{mode.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Push notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: colors.border, true: colors.accentPurple }}
          />
        </View>
        <Text style={styles.hint}>Daily briefing (8 AM) and weekly review (Mon 9 AM) are pushed from MAT-AI-OS.</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  content: { padding: 16, gap: 8 },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  card: { backgroundColor: colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  label: { color: colors.textSecondary, fontSize: 11 },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  saveBtn: { backgroundColor: colors.accentPurple, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: { flex: 1, backgroundColor: colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', paddingVertical: 14, gap: 4 },
  modeBtnActive: { borderColor: colors.accentPurple, backgroundColor: 'rgba(139,92,246,0.18)' },
  modeIcon: { fontSize: 20 },
  modeLabel: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint: { color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
})
