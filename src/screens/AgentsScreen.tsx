// src/screens/AgentsScreen.tsx
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { matOsClient, type Agent } from '../api/MatOSClient'
import BottomSheet from '../components/BottomSheet'
import { useTheme } from '../context/ThemeContext'

interface AgentsScreenProps {
  visible: boolean
  onClose: () => void
}

export default function AgentsScreen({ visible, onClose }: AgentsScreenProps) {
  const { colors } = useTheme()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  const loadAgents = useCallback(async () => {
    setAgents(await matOsClient.getAgents())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (visible) loadAgents()
  }, [visible, loadAgents])

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Agents">
      {agents.length === 0 && !loading && (
        <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>No agents yet.</Text>
      )}

      {agents.map((item) => (
        <View key={item.agent_id} style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.agentHeader}>
            <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? colors.accentGreen : colors.nodeIdle }]} />
            <Text style={[styles.agentName, { color: colors.textPrimary }]}>{item.name}</Text>
            <Text style={[styles.agentDomain, { color: colors.accentPurple }]}>{item.domain}</Text>
          </View>
          <Text style={[styles.agentSkills, { color: colors.textSecondary }]}>{item.skill_ids.join(', ')}</Text>
        </View>
      ))}

      <View style={{ height: 20 }} />
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  emptyHint: { textAlign: 'center', marginTop: 40 },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  agentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  agentName: { fontWeight: '700', fontSize: 14, flex: 1 },
  agentDomain: { fontSize: 11, fontWeight: '700' },
  agentSkills: { fontSize: 11, marginTop: 6 },
})
