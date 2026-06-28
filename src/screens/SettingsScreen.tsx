// src/screens/SettingsScreen.tsx
import { useEffect, useState } from 'react'
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { matOsClient, type IdentityProfile } from '../api/MatOSClient'
import { useSettings } from '../context/SettingsContext'
import { registerForPushNotifications } from '../notifications/pushNotifications'
import BottomSheet from '../components/BottomSheet'
import { useTheme } from '../context/ThemeContext'

const MODES: Array<{ id: 'work' | 'trading' | 'learning'; label: string; icon: string }> = [
  { id: 'work', label: 'Work', icon: 'W' },
  { id: 'trading', label: 'Trading', icon: 'T' },
  { id: 'learning', label: 'Learning', icon: 'L' },
]

interface SettingsScreenProps {
  visible: boolean
  onClose: () => void
}

export default function SettingsScreen({ visible, onClose }: SettingsScreenProps) {
  const { colors, isDark, toggleTheme } = useTheme()
  const { backendUrl, setBackendUrl, notificationsEnabled, setNotificationsEnabled } = useSettings()
  const [urlInput, setUrlInput] = useState(backendUrl)
  const [savedFlash, setSavedFlash] = useState(false)
  const [identity, setIdentity] = useState<IdentityProfile | null>(null)
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')

  useEffect(() => {
    if (visible) {
      matOsClient.getIdentity().then((profile) => {
        if (profile) {
          setIdentity(profile)
          setName(profile.name)
          setNickname(profile.nickname)
        }
      })
    }
  }, [visible])

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
    <BottomSheet visible={visible} onClose={onClose} title="Settings">
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Backend</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Backend URL</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgPanel, borderColor: colors.border, color: colors.textPrimary }]}
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="http://192.168.1.10:8000"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accentPurple }]} onPress={saveUrl}>
          <Text style={styles.saveBtnText}>{savedFlash ? 'Saved!' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Profile</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgPanel, borderColor: colors.border, color: colors.textPrimary }]}
          value={name}
          onChangeText={setName}
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={[styles.label, { color: colors.textSecondary }]}>Nickname</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgPanel, borderColor: colors.border, color: colors.textPrimary }]}
          value={nickname}
          onChangeText={setNickname}
          placeholderTextColor={colors.textSecondary}
        />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.accentPurple }]} onPress={saveProfile}>
          <Text style={styles.saveBtnText}>Save profile</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Mode</Text>
      <View style={styles.modeRow}>
        {MODES.map((mode) => {
          const active = identity?.active_mode === mode.id
          return (
            <TouchableOpacity
              key={mode.id}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.bgCard, borderColor: colors.border },
                active && { borderColor: colors.accentPurple, backgroundColor: colors.accentPurple + '24' },
              ]}
              onPress={() => setMode(mode.id)}
            >
              <Text style={[styles.modeIcon, { color: colors.textPrimary, borderColor: colors.border }]}>{mode.icon}</Text>
              <Text style={[styles.modeLabel, { color: colors.textPrimary }]}>{mode.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notifications</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Push notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: colors.border, true: colors.accentPurple }}
          />
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>Daily briefing (8 AM) and weekly review (Mon 9 AM) are pushed from MAT-AI-OS.</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Night mode</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.accentPurple }}
          />
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>Pure white by day, galaxy black by night.</Text>
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
  label: {
    fontSize: 11,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  saveBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  modeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    textAlign: 'center',
    lineHeight: 27,
    fontSize: 13,
    fontWeight: '800',
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
})
