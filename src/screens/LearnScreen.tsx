// src/screens/LearnScreen.tsx
import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { matOsClient, type LearnSuggestion } from '../api/MatOSClient'
import BottomSheet from '../components/BottomSheet'
import { useTheme } from '../context/ThemeContext'

interface LearnScreenProps {
  visible: boolean
  onClose: () => void
}

export default function LearnScreen({ visible, onClose }: LearnScreenProps) {
  const { colors } = useTheme()
  const [source, setSource] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [suggestion, setSuggestion] = useState<LearnSuggestion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmedMsg, setConfirmedMsg] = useState<string | null>(null)

  const submit = async () => {
    const src = source.trim()
    if (!src) return
    setSubmitting(true)
    setError(null)
    setConfirmedMsg(null)
    const outcome = await matOsClient.submitLearn(src)
    setSubmitting(false)
    if (!outcome.ok) {
      setError(outcome.error)
      setSuggestion(null)
      return
    }
    setSuggestion(outcome.suggestion)
  }

  const confirm = async (approved: boolean) => {
    if (!suggestion) return
    setConfirming(true)
    const outcome = await matOsClient.confirmLearn(suggestion, approved)
    setConfirming(false)
    if (outcome.ok) {
      setConfirmedMsg(approved ? 'Learned and saved.' : 'Discarded.')
      setSuggestion(null)
      setSource('')
    } else {
      setError(outcome.error)
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Teach">
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Paste a link, GitHub repo, or raw text. MAT will check it and suggest what to learn from it — nothing is saved until you approve.
      </Text>

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
          placeholder="https://... or raw text"
          placeholderTextColor={colors.textSecondary}
          value={source}
          onChangeText={setSource}
          multiline
        />
      </View>
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.accentPurple }, submitting && { opacity: 0.6 }]}
        onPress={submit}
        disabled={submitting || !source.trim()}
      >
        {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Check</Text>}
      </TouchableOpacity>

      {error && <Text style={[styles.error, { color: colors.accentRed }]}>{error}</Text>}
      {confirmedMsg && <Text style={[styles.confirmed, { color: colors.accentGreen }]}>{confirmedMsg}</Text>}

      {suggestion && (
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.status, { color: suggestion.status === 'suggest' ? colors.accentGreen : colors.accentRed }]}>
            {suggestion.status === 'suggest' ? 'Suggested' : 'Rejected'}
          </Text>
          {suggestion.name && <Text style={[styles.name, { color: colors.textPrimary }]}>{suggestion.name}</Text>}
          <Text style={[styles.reason, { color: colors.textSecondary }]}>{suggestion.reason}</Text>
          {suggestion.description && <Text style={[styles.description, { color: colors.textSecondary }]}>{suggestion.description}</Text>}

          {suggestion.status === 'suggest' && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.accentRed + '22', borderColor: colors.accentRed }]}
                onPress={() => confirm(false)}
                disabled={confirming}
              >
                <Text style={[styles.actionText, { color: colors.accentRed }]}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.accentGreen + '22', borderColor: colors.accentGreen }]}
                onPress={() => confirm(true)}
                disabled={confirming}
              >
                <Text style={[styles.actionText, { color: colors.accentGreen }]}>{confirming ? '...' : 'Learn it'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 20 }} />
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, marginBottom: 14, lineHeight: 17 },
  addRow: { marginBottom: 10 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, minHeight: 44 },
  submitBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  error: { fontSize: 12, marginTop: 10 },
  confirmed: { fontSize: 12, marginTop: 10, fontWeight: '700' },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 14 },
  status: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  name: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  reason: { fontSize: 12, marginTop: 4 },
  description: { fontSize: 12, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: 'center' },
  actionText: { fontSize: 12, fontWeight: '700' },
})
