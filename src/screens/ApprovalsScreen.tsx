// src/screens/ApprovalsScreen.tsx
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { matOsClient, type McpApproval } from '../api/MatOSClient'
import BottomSheet from '../components/BottomSheet'
import { useTheme } from '../context/ThemeContext'

interface ApprovalsScreenProps {
  visible: boolean
  onClose: () => void
}

export default function ApprovalsScreen({ visible, onClose }: ApprovalsScreenProps) {
  const { colors } = useTheme()
  const [approvals, setApprovals] = useState<McpApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setApprovals(await matOsClient.getPendingApprovals())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (visible) load()
  }, [visible, load])

  const approve = async (id: string) => {
    setActingId(id)
    await matOsClient.approveMcpApproval(id)
    await load()
    setActingId(null)
  }

  const deny = async (id: string) => {
    setActingId(id)
    await matOsClient.denyMcpApproval(id)
    await load()
    setActingId(null)
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Approvals">
      {approvals.length === 0 && !loading && (
        <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>Nothing waiting on your permission.</Text>
      )}

      {approvals.map((item) => (
        <View key={item.id} style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.server, { color: colors.accentPurple }]}>{item.server}</Text>
            <Text style={[styles.tool, { color: colors.textPrimary }]}>{item.tool}</Text>
          </View>
          <Text style={[styles.reason, { color: colors.textSecondary }]}>{item.reason}</Text>
          {typeof item.params.command === 'string' && (
            <Text style={[styles.command, { color: colors.textPrimary, backgroundColor: colors.bgApp, borderColor: colors.border }]}>
              {item.params.command}
            </Text>
          )}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.accentRed + '22', borderColor: colors.accentRed }]}
              onPress={() => deny(item.id)}
              disabled={actingId === item.id}
            >
              <Text style={[styles.actionText, { color: colors.accentRed }]}>{actingId === item.id ? '...' : 'Deny'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.accentGreen + '22', borderColor: colors.accentGreen }]}
              onPress={() => approve(item.id)}
              disabled={actingId === item.id}
            >
              <Text style={[styles.actionText, { color: colors.accentGreen }]}>{actingId === item.id ? '...' : 'Approve'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={{ height: 20 }} />
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  emptyHint: { textAlign: 'center', marginTop: 40 },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  server: { fontSize: 11, fontWeight: '700' },
  tool: { fontSize: 14, fontWeight: '700', flex: 1 },
  reason: { fontSize: 12, marginTop: 4 },
  command: { fontSize: 11, fontFamily: 'monospace', marginTop: 8, padding: 8, borderRadius: 8, borderWidth: 1 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: 'center' },
  actionText: { fontSize: 12, fontWeight: '700' },
})
