import { useCallback, useEffect, useState } from 'react'
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { colors } from '../theme/colors'
import { matOsClient, type Agent } from '../api/MatOSClient'

interface SkillSummary {
  id: string
  name: string
  domain: string
}

export default function AgentsScreen() {
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
    loadAgents()
  }, [loadAgents])

  const openCreate = async () => {
    setCreateOpen(true)
    const skills = await matOsClient.getSkillsByDomain()
    setSkillsByDomain(skills)
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
    <View style={styles.screen}>
      <FlatList
        data={agents}
        keyExtractor={(a) => a.agent_id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadAgents}
        ListEmptyComponent={!loading ? <Text style={styles.emptyHint}>No agents yet.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.agentCard}>
            <View style={styles.agentHeader}>
              <View style={[styles.statusDot, item.status === 'active' ? styles.statusDotActive : styles.statusDotIdle]} />
              <Text style={styles.agentName}>{item.name}</Text>
              <Text style={styles.agentDomain}>{item.domain}</Text>
            </View>
            <Text style={styles.agentSkills}>{item.skill_ids.join(', ')}</Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Text style={styles.fabText}>+ New Agent</Text>
      </TouchableOpacity>

      <Modal visible={createOpen} animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Agent</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Agent name"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.modalLabel}>Domain</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {domains.map((domain) => (
                <TouchableOpacity
                  key={domain}
                  style={[styles.chip, selectedDomain === domain && styles.chipActive]}
                  onPress={() => {
                    setSelectedDomain(domain)
                    setSelectedSkillIds(new Set())
                  }}
                >
                  <Text style={[styles.chipText, selectedDomain === domain && styles.chipTextActive]}>{domain}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedDomain && (
              <>
                <Text style={styles.modalLabel}>Skills</Text>
                <ScrollView style={styles.skillsScroll}>
                  {(skillsByDomain[selectedDomain] ?? []).map((skill) => (
                    <TouchableOpacity key={skill.id} style={styles.skillRow} onPress={() => toggleSkill(skill.id)}>
                      <Text style={styles.skillCheckbox}>{selectedSkillIds.has(skill.id) ? '☑' : '☐'}</Text>
                      <Text style={styles.skillRowText}>{skill.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCreateOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreateBtn} onPress={submitCreate} disabled={creating}>
                <Text style={styles.modalCreateText}>{creating ? 'Creating…' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  list: { padding: 16, gap: 10 },
  emptyHint: { color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
  agentCard: { backgroundColor: colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 },
  agentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotActive: { backgroundColor: colors.accentGreen },
  statusDotIdle: { backgroundColor: colors.nodeIdle },
  agentName: { color: colors.textPrimary, fontWeight: '700', fontSize: 14, flex: 1 },
  agentDomain: { color: colors.accentPurple, fontSize: 11, fontWeight: '600' },
  agentSkills: { color: colors.textSecondary, fontSize: 11, marginTop: 6 },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: colors.accentPurple,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.bgPanel,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  modalInput: {
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    padding: 10,
    fontSize: 14,
  },
  modalLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 14, marginBottom: 6, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: 'rgba(139,92,246,0.18)', borderColor: colors.accentPurple },
  chipText: { color: colors.textSecondary, fontSize: 12 },
  chipTextActive: { color: colors.textPrimary, fontWeight: '700' },
  skillsScroll: { maxHeight: 180 },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  skillCheckbox: { color: colors.accentPurple, fontSize: 16 },
  skillRowText: { color: colors.textPrimary, fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancelBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.bgCard, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  modalCancelText: { color: colors.textSecondary, fontWeight: '600' },
  modalCreateBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: colors.accentPurple, alignItems: 'center' },
  modalCreateText: { color: '#fff', fontWeight: '700' },
})
