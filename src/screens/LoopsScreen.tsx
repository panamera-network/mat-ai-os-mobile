// src/screens/LoopsScreen.tsx
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { matOsClient, type Loop } from '../api/MatOSClient'
import BottomSheet from '../components/BottomSheet'
import { useTheme } from '../context/ThemeContext'

interface LoopsScreenProps {
  visible: boolean
  onClose: () => void
}

export default function LoopsScreen({ visible, onClose }: LoopsScreenProps) {
  const { colors } = useTheme()
  const [loops, setLoops] = useState<Loop[]>([])
  const [loading, setLoading] = useState(true)

  const loadLoops = useCallback(async () => {
    setLoops(await matOsClient.getLoops())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (visible) loadLoops()
  }, [visible, loadLoops])

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Loops">
      {loops.length === 0 && !loading && (
        <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>No loops yet.</Text>
      )}

      {loops.map((item) => (
        <View key={item.id} style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.headerRow}>
            <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? colors.accentGreen : colors.nodeIdle }]} />
            <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
            <Text style={[styles.pipeline, { color: colors.accentPurple }]}>{item.pipeline}</Text>
          </View>
          {!!item.description && <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>}
          <Text style={[styles.meta, { color: colors.textSecondary }]}>Trigger: {item.trigger} · {item.schedule}</Text>
          {item.next_run && <Text style={[styles.meta, { color: colors.textSecondary }]}>Next run: {item.next_run}</Text>}
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
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  name: { fontWeight: '700', fontSize: 14, flex: 1 },
  pipeline: { fontSize: 11, fontWeight: '700' },
  description: { fontSize: 12, marginTop: 6 },
  meta: { fontSize: 11, marginTop: 4 },
})
