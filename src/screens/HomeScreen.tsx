import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { colors } from '../theme/colors'
import { useBackendStatus } from '../context/BackendStatusContext'
import type { RootTabParamList } from '../navigation/RootNavigator'

type Nav = NativeStackNavigationProp<RootTabParamList>

export default function HomeScreen() {
  const navigation = useNavigation<Nav>()
  const { online, health, pendingTasks, refresh } = useBackendStatus()

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={undefined}>
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, online ? styles.statusDotOnline : styles.statusDotOffline]} />
          <Text style={styles.statusText}>{online ? 'MAT-AI-OS online' : 'MAT-AI-OS offline'}</Text>
        </View>
        {health?.active_model && (
          <Text style={styles.statusSubtext}>
            {health.active_model.provider} · {health.active_model.model}
          </Text>
        )}
        <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{health?.active_agents_count ?? '-'}</Text>
          <Text style={styles.statLabel}>Active agents</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{health?.agents_count ?? '-'}</Text>
          <Text style={styles.statLabel}>Total agents</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{pendingTasks}</Text>
          <Text style={styles.statLabel}>Pending tasks</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('Chat')}>
          <Text style={styles.quickActionIcon}>💬</Text>
          <Text style={styles.quickActionLabel}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('Goals')}>
          <Text style={styles.quickActionIcon}>🎯</Text>
          <Text style={styles.quickActionLabel}>Goals</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('Agents')}>
          <Text style={styles.quickActionIcon}>🤖</Text>
          <Text style={styles.quickActionLabel}>Agents</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.quickActionIcon}>⚙️</Text>
          <Text style={styles.quickActionLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  content: { padding: 16, gap: 16 },
  statusCard: {
    backgroundColor: colors.bgPanel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusDotOnline: { backgroundColor: colors.accentGreen },
  statusDotOffline: { backgroundColor: colors.accentRed },
  statusText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  statusSubtext: { color: colors.textSecondary, fontSize: 12, marginTop: 6 },
  refreshBtn: { marginTop: 10, alignSelf: 'flex-start' },
  refreshBtnText: { color: colors.accentPurple, fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center' },
  sectionTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickActionBtn: {
    width: '47%',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
  },
  quickActionIcon: { fontSize: 24 },
  quickActionLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
})
