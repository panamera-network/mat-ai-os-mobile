// src/screens/GoalsScreen.tsx
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { matOsClient, type DailyBriefing, type Goal } from '../api/MatOSClient'
import BottomSheet from '../components/BottomSheet'
import { useTheme } from '../context/ThemeContext'

interface GoalsScreenProps {
  visible: boolean
  onClose: () => void
}

export default function GoalsScreen({ visible, onClose }: GoalsScreenProps) {
  const { colors } = useTheme()
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
    if (visible) load()
  }, [visible, load])

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
    <BottomSheet visible={visible} onClose={onClose} title="Goals">
      {briefing && (
        <View style={[styles.briefingCard, { backgroundColor: colors.accentPurple + '14', borderColor: colors.accentPurple }]}>
          <Text style={[styles.briefingGreeting, { color: colors.textPrimary }]}>{briefing.greeting}!</Text>
          <Text style={[styles.briefingLine, { color: colors.textSecondary }]}>
            Goals: {briefing.goals.active_count} active, avg {briefing.goals.average_progress}%
          </Text>
          <Text style={[styles.briefingLine, { color: colors.textSecondary }]}>Tasks waiting: {briefing.pending_tasks}</Text>
          <Text style={[styles.briefingLine, { color: colors.textSecondary }]}>
            Loops: {briefing.active_loops}/{briefing.total_loops} active
          </Text>
        </View>
      )}

      <View style={styles.addRow}>
        <TextInput
          style={[styles.addInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="New goal..."
          placeholderTextColor={colors.textSecondary}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={addGoal}
        />
        {(['short_term', 'long_term'] as const).map((type) => {
          const active = newType === type
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeToggle,
                { backgroundColor: colors.bgCard, borderColor: colors.border },
                active && { borderColor: colors.accentPurple, backgroundColor: colors.accentPurple + '30' },
              ]}
              onPress={() => setNewType(type)}
            >
              <Text style={[styles.typeToggleText, { color: active ? colors.textPrimary : colors.textSecondary }]}>
                {type === 'short_term' ? 'Short' : 'Long'}
              </Text>
            </TouchableOpacity>
          )
        })}
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accentPurple }]} onPress={addGoal}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {goals.length === 0 && !loading && (
        <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>No goals yet. Add one above.</Text>
      )}

      {goals.map((item) => (
        <View
          key={item.id}
          style={[
            styles.goalCard,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
            item.status === 'completed' && styles.goalCardCompleted,
          ]}
        >
          <View style={styles.goalHeader}>
            <Text style={[styles.goalTypeBadge, { color: colors.accentBlue, borderColor: colors.accentBlue }]}>
              {item.type === 'short_term' ? 'SHORT' : 'LONG'}
            </Text>
            <Text style={[styles.goalTitle, { color: colors.textPrimary }]}>{item.title}</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${item.progress}%`, backgroundColor: colors.accentPurple }]} />
          </View>
          <View style={styles.goalFooter}>
            <Text style={[styles.goalProgressText, { color: colors.textSecondary }]}>{item.progress}%</Text>
            {item.status !== 'completed' && (
              <TouchableOpacity onPress={() => completeGoal(item.id)}>
                <Text style={[styles.completeBtn, { color: colors.accentGreen }]}>Mark complete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      <View style={{ height: 20 }} />
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  briefingCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  briefingGreeting: { fontWeight: '700', fontSize: 14, marginBottom: 4 },
  briefingLine: { fontSize: 12 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  addInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  typeToggle: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  typeToggleText: { fontSize: 11, fontWeight: '700' },
  addBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  emptyHint: { textAlign: 'center', marginTop: 30 },
  goalCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  goalCardCompleted: { opacity: 0.55 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalTypeBadge: { fontSize: 9, fontWeight: '800', borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  goalTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  progressTrack: { height: 6, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  goalProgressText: { fontSize: 11 },
  completeBtn: { fontSize: 11, fontWeight: '700' },
})
