import { useCallback, useEffect, useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { colors } from '../theme/colors'
import { matOsClient, type DailyBriefing, type Goal } from '../api/MatOSClient'

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null)
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<'short_term' | 'long_term'>('short_term')

  const load = useCallback(async () => {
    const [g, b] = await Promise.all([matOsClient.getGoals(), matOsClient.getDailyBriefing()])
    setGoals(g)
    setBriefing(b)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addGoal = async () => {
    const title = newTitle.trim()
    if (!title) return
    setNewTitle('')
    const created = await matOsClient.addGoal(title, newType)
    if (created) await load()
  }

  const completeGoal = async (id: string) => {
    const ok = await matOsClient.completeGoal(id)
    if (ok) await load()
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={goals}
        keyExtractor={(g) => g.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {briefing && (
              <View style={styles.briefingCard}>
                <Text style={styles.briefingGreeting}>{briefing.greeting}!</Text>
                <Text style={styles.briefingLine}>
                  Goals: {briefing.goals.active_count} active, avg {briefing.goals.average_progress}%
                </Text>
                <Text style={styles.briefingLine}>Tasks waiting: {briefing.pending_tasks}</Text>
                <Text style={styles.briefingLine}>
                  Loops: {briefing.active_loops}/{briefing.total_loops} active
                </Text>
              </View>
            )}
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="New goal..."
                placeholderTextColor={colors.textSecondary}
                value={newTitle}
                onChangeText={setNewTitle}
                onSubmitEditing={addGoal}
              />
              <TouchableOpacity
                style={[styles.typeToggle, newType === 'short_term' && styles.typeToggleActive]}
                onPress={() => setNewType('short_term')}
              >
                <Text style={styles.typeToggleText}>Short</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeToggle, newType === 'long_term' && styles.typeToggleActive]}
                onPress={() => setNewType('long_term')}
              >
                <Text style={styles.typeToggleText}>Long</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={addGoal}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={!loading ? <Text style={styles.emptyHint}>No goals yet — add one above.</Text> : null}
        renderItem={({ item }) => (
          <View style={[styles.goalCard, item.status === 'completed' && styles.goalCardCompleted]}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalTypeBadge}>{item.type === 'short_term' ? 'SHORT' : 'LONG'}</Text>
              <Text style={styles.goalTitle}>{item.title}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
            </View>
            <View style={styles.goalFooter}>
              <Text style={styles.goalProgressText}>{item.progress}%</Text>
              {item.status !== 'completed' && (
                <TouchableOpacity onPress={() => completeGoal(item.id)}>
                  <Text style={styles.completeBtn}>Mark complete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  list: { padding: 16, gap: 10 },
  briefingCard: {
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentPurple,
    padding: 14,
    marginBottom: 14,
  },
  briefingGreeting: { color: colors.textPrimary, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  briefingLine: { color: colors.textSecondary, fontSize: 12 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  addInput: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  typeToggle: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  typeToggleActive: { borderColor: colors.accentPurple, backgroundColor: 'rgba(139,92,246,0.18)' },
  typeToggleText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  addBtn: { backgroundColor: colors.accentPurple, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  emptyHint: { color: colors.textSecondary, textAlign: 'center', marginTop: 30 },
  goalCard: { backgroundColor: colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10 },
  goalCardCompleted: { opacity: 0.55 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalTypeBadge: { color: colors.accentBlue, fontSize: 9, fontWeight: '800', borderWidth: 1, borderColor: colors.accentBlue, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  goalTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', flex: 1 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accentPurple, borderRadius: 3 },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  goalProgressText: { color: colors.textSecondary, fontSize: 11 },
  completeBtn: { color: colors.accentGreen, fontSize: 11, fontWeight: '700' },
})
