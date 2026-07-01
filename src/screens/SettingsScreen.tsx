// src/screens/SettingsScreen.tsx
import { StyleSheet, Switch, Text, View } from 'react-native'
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
  const { notificationsEnabled, setNotificationsEnabled } = useSettings()

  const toggleNotifications = async (enabled: boolean) => {
    await setNotificationsEnabled(enabled)
    if (enabled) await registerForPushNotifications()
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Settings">
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
  hint: {
    fontSize: 11,
    lineHeight: 16,
  },
})
