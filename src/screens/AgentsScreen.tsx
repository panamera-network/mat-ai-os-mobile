// src/screens/AgentsScreen.tsx
import { useCallback, useEffect, useState } from 'react'
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { matOsClient, type Agent } from '../api/MatOSClient'
import BottomSheet from '../components/BottomSheet'
import ScrollViewWithScrollbar from '../components/ScrollViewWithScrollbar'
import { useTheme } from '../context/ThemeContext'

interface SkillSummary {
  id: string
  name: string
  domain: string
}

interface AgentsScreenProps {
  visible: boolean
  onClose: () => void
}

export default function AgentsScreen({ visible, onClose }: AgentsScreenProps) {
  const { colors } = useTheme()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [skillsByDomain, setSkillsByDomain] = useState<Record<string, SkillSummary[]>>({})
  const [name, setName] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)

  const loadAgents = useCallback(async () => {
    setAgents(await matOsClient.getAgents())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (visible) loadAgents()
  }, [visible, loadAgents])

  const openCreate = async () => {
    setCreateOpen(true)
    setSkillsByDomain(await matOsClient.getSkillsByDomain())
  }

  const toggleSkill = (id: string) => {
    setSelectedSkillIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submitCreate = async () => {
    if (!name.trim() || !selectedDomain || selectedSkillIds.size === 0) return
    setCreating(true)
    const created = await matOsClient.createAgent(name.trim(), selectedDomain, Array.from(selectedSkillIds))
    setCreating(false)
    if (created) {
      setCreateOpen(false)
      setName('')
      setSelectedDomain(null)
      setSelectedSkillIds(new Set())
      await loadAgents()
    }
  }

  const domains = Object.keys(skillsByDomain)

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

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.accentPurple }]} onPress={openCreate}>
        <Text style={styles.fabText}>+ New Agent</Text>
      </TouchableOpacity>

      <Modal visible={createOpen} animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.bgPanel, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>New Agent</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Agent name"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Domain</Text>
            <ScrollViewWithScrollbar style={styles.chipRow}>
              {domains.map((domain) => {
                const active = selectedDomain === domain
                return (
                  <TouchableOpacity
                    key={domain}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.bgCard, borderColor: colors.border },
                      active && { backgroundColor: colors.accentPurple + '30', borderColor: colors.accentPurple },
                    ]}
                    onPress={() => {
                      setSelectedDomain(domain)
                      setSelectedSkillIds(new Set())
                    }}
                  >
                    <Text style={[styles.chipText, { color: active ? colors.textPrimary : colors.textSecondary }, active && styles.chipTextActive]}>
                      {domain}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollViewWithScrollbar>

            {selectedDomain && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Skills</Text>
                <ScrollViewWithScrollbar style={styles.skillsScroll}>
                  {(skillsByDomain[selectedDomain] ?? []).map((skill) => (
                    <TouchableOpacity key={skill.id} style={styles.skillRow} onPress={() => toggleSkill(skill.id)}>
                      <Text style={[styles.skillCheckbox, { color: colors.accentPurple }]}>
                        {selectedSkillIds.has(skill.id) ? 'selected' : 'open'}
                      </Text>
                      <Text style={[styles.skillRowText, { color: colors.textPrimary }]}>{skill.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollViewWithScrollbar>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                onPress={() => setCreateOpen(false)}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.accentPurple }]} onPress={submitCreate} disabled={creating}>
                <Text style={styles.createText}>{creating ? 'Creating...' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    maxHeight: '85%',
    borderTopWidth: 1,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    fontSize: 14,
  },
  label: { fontSize: 11, fontWeight: '800', marginTop: 14, marginBottom: 6, textTransform: 'uppercase' },
  chipRow: { maxHeight: 50 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: { fontSize: 12 },
  chipTextActive: { fontWeight: '700' },
  skillsScroll: { maxHeight: 180 },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  skillCheckbox: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  skillRowText: { fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  cancelText: { fontWeight: '700' },
  createBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  createText: { color: '#fff', fontWeight: '700' },
})
