// src/screens/HomeScreen.tsx
import { useRef, useState, useCallback, useEffect, JSX } from 'react'
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Audio } from 'expo-av'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { matOsClient, type MatOSAttachment } from '../api/MatOSClient'
import { enqueue } from '../storage/offlineQueue'
import { useSettings } from '../context/SettingsContext'
import { useBackendStatus } from '../context/BackendStatusContext'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import MatWaveform from '../components/Waveform'
import AttachmentSheet from '../components/AttachmentSheet'
import ChatMenu from '../components/ChatMenu'
import {
  PlusIcon,
  SendIcon,
  MoreIcon,
  CloseIcon,
  AttachmentIcon,
  MemoIcon,
  ReminderIcon,
  MicIcon,
} from '../theme/icons/MatIcons'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  feedbackTaskId?: string | null
  feedbackRating?: number
}

interface HomeScreenProps {
  statsToggle: number
  pttToggle: number
}

// A fallback reply ends with "\n\n_<provider label>_" (see agents/base_agent.py's
// run() + core/llm_provider.py's normalize_provider_label on the backend) - split it
// off so it can render smaller/italic/muted instead of as part of the main answer.
const MODEL_LABEL_PATTERN = /\n\n_([^_\n]+)_$/

function splitModelLabel(text: string): { body: string; label: string | null } {
  const match = text.match(MODEL_LABEL_PATTERN)
  if (!match || match.index === undefined) return { body: text, label: null }
  return { body: text.slice(0, match.index), label: match[1] }
}

export default function HomeScreen({ statsToggle, pttToggle }: HomeScreenProps): JSX.Element {
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const { sessionId, newSession } = useSettings()
  const { online, pendingTasks, health, syncedCount } = useBackendStatus()
  const prevSyncedCount = useRef(0)
  const [syncToast, setSyncToast] = useState<string | null>(null)

  useEffect(() => {
    if (syncedCount > prevSyncedCount.current) {
      const diff = syncedCount - prevSyncedCount.current
      setSyncToast(`${diff} item${diff > 1 ? 's' : ''} synced to Obsidian`)
      const t = setTimeout(() => setSyncToast(null), 3000)
      prevSyncedCount.current = syncedCount
      return () => clearTimeout(t)
    }
  }, [syncedCount])
  const { setIsRecording, setCommandComposerVisible, pttMode, composerToggle } = useApp()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [attachment, setAttachment] = useState<MatOSAttachment | null>(null)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [statsVisible, setStatsVisible] = useState(false)
  const [attachmentSheetVisible, setAttachmentSheetVisible] = useState(false)
  const [chatMenuVisible, setChatMenuVisible] = useState(false)
  const [composerExpanded, setComposerExpanded] = useState(false)

  const scrollViewRef = useRef<ScrollView>(null)
  const inputRef = useRef<TextInput>(null)
  const revealAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(revealAnim, {
      toValue: composerExpanded ? 1 : 0,
      duration: 240,
      useNativeDriver: true,
    }).start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composerExpanded])

  useEffect(() => {
    if (statsToggle > 0) {
      setStatsVisible((v) => !v)
      setComposerExpanded(false)
    }
  }, [statsToggle])


  useEffect(() => {
    if (pttToggle > 0) {
      if (recording) {
        stopRecordingAndTranscribe()
      } else {
        startRecording()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pttToggle])

  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages.length])

  useEffect(() => {
    setCommandComposerVisible(composerExpanded)
    return () => setCommandComposerVisible(false)
  }, [composerExpanded, setCommandComposerVisible])

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message])
  }

  const openComposer = useCallback(() => {
    setStatsVisible(false)
    setComposerExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [])

  useEffect(() => {
    if (composerToggle > 0) openComposer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composerToggle])

  const closeComposer = useCallback(() => {
    setComposerExpanded(false)
    inputRef.current?.blur()
  }, [])

  const goHome = useCallback(() => {
    setStatsVisible(false)
    setComposerExpanded(false)
    setChatMenuVisible(false)
    inputRef.current?.blur()
  }, [])

  // A queued task's answer arrives via the backend's queue worker, not the /task
  // response — poll for it in the background and drop it into the chat when it lands.
  const watchQueuedTask = async (taskId: string) => {
    const result = await matOsClient.waitForQueuedTask(taskId)
    if (result.ok) {
      appendMessage({ id: `${Date.now()}-assistant`, role: 'assistant', text: result.text })
    } else {
      appendMessage({ id: `${Date.now()}-error`, role: 'system', text: result.error })
    }
  }

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim()
    const file = attachment
    if (!text && !file) return

    setInput('')
    setAttachment(null)
    appendMessage({
      id: `${Date.now()}-user`,
      role: 'user',
      text: text || `Attached: ${file?.name ?? ''}`,
    })

    setPending(true)
    try {
      // memo/reminder mode — typed text goes to Obsidian, not the agent
      if (pttMode === 'memo' && text) {
        const result = await matOsClient.saveMemo(text)
        if (result.ok) {
          appendMessage({ id: `${Date.now()}-assistant`, role: 'assistant', text: `Memo saved — "${text}"` })
        } else {
          await enqueue('memo', text)
          appendMessage({ id: `${Date.now()}-assistant`, role: 'assistant', text: `Backend offline — memo queued locally. Will sync when online.` })
        }
        return
      }

      if (pttMode === 'reminder' && text) {
        const result = await matOsClient.saveReminder(text)
        if (result.ok) {
          appendMessage({ id: `${Date.now()}-assistant`, role: 'assistant', text: `Reminder set — "${text}"` })
        } else {
          await enqueue('reminder', text)
          appendMessage({ id: `${Date.now()}-assistant`, role: 'assistant', text: `Backend offline — reminder queued locally. Will sync when online.` })
        }
        return
      }

      const outcome = await matOsClient.sendTask(
        text || `Attached file: ${file?.name ?? ''}`,
        sessionId,
        file ?? undefined
      )

      if (outcome.ok) {
        appendMessage({
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: outcome.text,
          feedbackTaskId: outcome.feedbackTaskId,
        })
        if (outcome.queuedTaskId) void watchQueuedTask(outcome.queuedTaskId)
      } else {
        appendMessage({ id: `${Date.now()}-error`, role: 'system', text: outcome.error })
      }
    } finally {
      setPending(false)
    }
  }

  const rateMessage = async (id: string, taskId: string, rating: number) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, feedbackRating: rating } : m)))
    await matOsClient.submitFeedback(taskId, rating)
  }

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setAttachment({
      uri: asset.uri,
      name: asset.fileName ?? 'photo.jpg',
      mimeType: asset.mimeType ?? 'image/jpeg',
    })
    openComposer()
  }

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain', 'text/markdown', 'text/csv'],
      copyToCacheDirectory: true,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setAttachment({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
    })
    openComposer()
  }

  const startRecording = async () => {
    if (recording || pending || isTranscribing) return
    const permission = await Audio.requestPermissionsAsync()
    if (!permission.granted) return
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
    const { recording: rec } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    )
    setRecording(rec)
    setIsRecording(true)
    setStatsVisible(false)
  }

  const stopRecordingAndTranscribe = async () => {
    if (!recording) return
    const rec = recording
    setRecording(null)
    setIsRecording(false)
    await rec.stopAndUnloadAsync()
    const uri = rec.getURI()
    if (!uri) return

    setIsTranscribing(true)
    setComposerExpanded(true)
    try {
      const outcome = await matOsClient.transcribeAudio({
        uri,
        name: 'recording.m4a',
        mimeType: 'audio/m4a',
      })
      if (!outcome.ok) {
        appendMessage({ id: `${Date.now()}-error`, role: 'system', text: outcome.error })
        return
      }
      const text = outcome.text.trim()
      if (!text) return

      if (pttMode === 'memo') {
        const result = await matOsClient.saveMemo(text)
        if (result.ok) {
          appendMessage({ id: `${Date.now()}-assistant`, role: 'assistant', text: `Memo saved — "${text}"` })
        } else {
          await enqueue('memo', text)
          appendMessage({ id: `${Date.now()}-assistant`, role: 'assistant', text: `Backend offline — memo queued locally. Will sync when online.` })
        }
      } else if (pttMode === 'reminder') {
        const result = await matOsClient.saveReminder(text)
        if (result.ok) {
          appendMessage({ id: `${Date.now()}-assistant`, role: 'assistant', text: `Reminder set — "${text}"` })
        } else {
          await enqueue('reminder', text)
          appendMessage({ id: `${Date.now()}-assistant`, role: 'assistant', text: `Backend offline — reminder queued locally. Will sync when online.` })
        }
      } else {
        await send(text)
      }
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleNewConversation = useCallback(async () => {
    setMessages([])
    setComposerExpanded(false)
    await newSession()
  }, [newSession])

  const handleClearChat = useCallback(() => {
    setMessages([])
  }, [])

  const handleExportChat = useCallback(() => {
    console.log('Export chat')
  }, [])

  const recentMessages = messages.slice(-8)
  const showChat = composerExpanded
  const waveformState = recording ? 'listening' : pending || isTranscribing ? 'thinking' : 'idle'
  const glassShadow = isDark ? '0 12px 34px rgba(0,0,0,0.38)' : '0 10px 24px rgba(15, 23, 42, 0.08)'
  const buttonBg = isDark ? 'rgba(15,23,42,0.74)' : 'rgba(255,255,255,0.72)'
  const inputBg = isDark ? 'rgba(15,23,42,0.88)' : '#ffffff'
  const subtleBg = isDark ? 'rgba(17,21,37,0.82)' : 'rgba(255,255,255,0.86)'

  const PTT_MODE_META = {
    agent:    { label: 'Agent Mode',    color: '#7c3aed', Icon: MicIcon },
    memo:     { label: 'Memo Mode',     color: '#0ea5e9', Icon: MemoIcon },
    reminder: { label: 'Reminder Mode', color: '#f59e0b', Icon: ReminderIcon },
  }
  const activeMeta = PTT_MODE_META[pttMode]

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bgApp }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.shell, { paddingTop: insets.top + 18 }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.brandPill,
              {
                backgroundColor: buttonBg,
                borderColor: colors.border,
                boxShadow: glassShadow,
              },
            ]}
            onPress={goHome}
            activeOpacity={0.75}
          >
            <Text style={[styles.brandText, { color: colors.textPrimary }]}>MAT.ai OS</Text>
          </TouchableOpacity>

          <View style={styles.headerRight}>
            <Text style={[styles.onlineText, { color: colors.textPrimary }]}>{online ? 'online' : 'offline'}</Text>
            <View
              style={[
                styles.onlineDot,
                { borderColor: colors.textPrimary, backgroundColor: colors.bgApp },
                online && { backgroundColor: colors.accentGreen },
              ]}
            />
          </View>
        </View>

        {showChat && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setChatMenuVisible(true)}
            activeOpacity={0.7}
          >
            <MoreIcon size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        )}

        {statsVisible && (
          <View style={[styles.statsPill, { backgroundColor: buttonBg, borderColor: colors.border, boxShadow: glassShadow }]}>
            <View style={styles.statsItem}>
              <Text style={[styles.statsValue, { color: colors.textPrimary }]}>{health?.active_agents_count ?? '-'}</Text>
              <Text style={[styles.statsLabel, { color: colors.textPrimary }]}>active</Text>
            </View>
            <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statsItem}>
              <Text style={[styles.statsValue, { color: colors.textPrimary }]}>{pendingTasks}</Text>
              <Text style={[styles.statsLabel, { color: colors.textPrimary }]}>queue</Text>
            </View>
            <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statsItem}>
              <Text style={[styles.statsValue, { color: colors.textPrimary }]}>{health?.skills_count ?? '-'}</Text>
              <Text style={[styles.statsLabel, { color: colors.textPrimary }]}>skill</Text>
            </View>
          </View>
        )}

        {syncToast && (
          <View style={[styles.syncToast, { backgroundColor: colors.accentGreen + '22', borderColor: colors.accentGreen }]}>
            <Text style={[styles.syncToastText, { color: colors.accentGreen }]}>✓ {syncToast}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.waveformWrap,
            statsVisible && styles.waveformWrapStats,
          ]}
          onPress={openComposer}
          activeOpacity={0.84}
        >
          <View style={styles.waveformScale}>
            <MatWaveform state={waveformState} compact />
          </View>
        </TouchableOpacity>

        {!showChat && (
          <View style={[styles.modeBadge, { borderColor: activeMeta.color + '55' }]}>
            <activeMeta.Icon size={9} color={activeMeta.color} strokeWidth={2} />
            <Text style={[styles.modeBadgeText, { color: activeMeta.color }]}>{activeMeta.label}</Text>
          </View>
        )}

        {showChat && (
          <Animated.View
            style={[
              styles.chatScroll,
              {
                opacity: revealAnim,
                transformOrigin: 'right',
                transform: [{ scaleX: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 1] }) }],
              },
            ]}
          >
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatScrollInner}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            {recentMessages.length === 0 ? (
              <View style={styles.chatEmpty}>
                <Text style={[styles.chatEmptyText, { color: colors.textSecondary }]}>Ask MAT.ai OS anything.</Text>
              </View>
            ) : (
              recentMessages.map((item) => {
                const { body, label } = item.role === 'assistant' ? splitModelLabel(item.text) : { body: item.text, label: null }
                return (
                <View
                  key={item.id}
                  style={[
                    styles.messageBlock,
                    item.role === 'user' && styles.userMessageBlock,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      { color: colors.textPrimary },
                      item.role === 'system' && { color: colors.accentRed },
                    ]}
                  >
                    {body}
                  </Text>
                  {label && (
                    <Text style={[styles.modelLabelText, { color: colors.textSecondary }]}>{label}</Text>
                  )}
                  {item.feedbackTaskId && (
                    <View style={styles.feedbackRow}>
                      <TouchableOpacity
                        disabled={item.feedbackRating !== undefined}
                        onPress={() => rateMessage(item.id, item.feedbackTaskId!, 5)}
                      >
                        <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>good</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={item.feedbackRating !== undefined}
                        onPress={() => rateMessage(item.id, item.feedbackTaskId!, 1)}
                      >
                        <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>bad</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                )
              })
            )}
          </ScrollView>
          </Animated.View>
        )}

        {composerExpanded && (
          <Animated.View
            style={[
              styles.composerDock,
              {
                bottom: 16 + insets.bottom,
                opacity: revealAnim,
                transformOrigin: 'right',
                transform: [{ scaleX: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 1] }) }],
              },
            ]}
          >
            {attachment && (
              <View style={[styles.attachmentPreview, { backgroundColor: subtleBg, borderColor: colors.border, boxShadow: glassShadow }]}>
                <AttachmentIcon size={14} color={colors.textPrimary} />
                <Text style={[styles.attachmentPreviewText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {attachment.name}
                </Text>
                <TouchableOpacity onPress={() => setAttachment(null)}>
                  <CloseIcon size={14} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            )}

            {pttMode !== 'agent' && (
              <View style={[styles.composerModeBadge, { backgroundColor: activeMeta.color + '18', borderColor: activeMeta.color + '66' }]}>
                <activeMeta.Icon size={11} color={activeMeta.color} strokeWidth={2} />
                <Text style={[styles.composerModeBadgeText, { color: activeMeta.color }]}>{activeMeta.label}</Text>
              </View>
            )}

            <View style={styles.composerRow}>
              <TouchableOpacity
                style={[styles.plusButton, { backgroundColor: inputBg, borderColor: colors.border }]}
                onPress={() => setAttachmentSheetVisible(true)}
                disabled={pending || isTranscribing || pttMode !== 'agent'}
              >
                <PlusIcon size={26} color={pttMode !== 'agent' ? colors.textSecondary : colors.textPrimary} strokeWidth={1.8} />
              </TouchableOpacity>
              <TextInput
                ref={inputRef}
                style={[styles.input, { backgroundColor: inputBg, borderColor: pttMode !== 'agent' ? activeMeta.color + '66' : colors.border, color: colors.textPrimary }]}
                value={input}
                onChangeText={setInput}
                placeholder={pttMode === 'memo' ? 'Type a memo...' : pttMode === 'reminder' ? 'Type a reminder...' : 'Ask MAT.ai OS...'}
                placeholderTextColor={colors.textSecondary}
                editable={!pending && !isTranscribing}
                onSubmitEditing={() => send()}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: inputBg, borderColor: colors.border },
                  (!input.trim() && !attachment) && styles.sendButtonDisabled,
                ]}
                onPress={() => send()}
                disabled={pending || (!input.trim() && !attachment)}
              >
                <SendIcon size={21} color={colors.textPrimary} strokeWidth={1.8} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <AttachmentSheet
          visible={attachmentSheetVisible}
          onClose={() => setAttachmentSheetVisible(false)}
          onCamera={() => {
            console.log('Camera')
          }}
          onGallery={pickImage}
          onDocument={pickDocument}
          onVoice={() => {
            startRecording()
          }}
        />

        <ChatMenu
          visible={chatMenuVisible}
          onClose={() => setChatMenuVisible(false)}
          onNewConversation={handleNewConversation}
          onClearChat={handleClearChat}
          onExportChat={handleExportChat}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  shell: {
    flex: 1,
    paddingHorizontal: 22,
  },
  header: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandPill: {
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  onlineDot: {
    width: 15,
    height: 15,
    borderRadius: 10,
    borderWidth: 1.2,
  },
  menuButton: {
    position: 'absolute',
    top: 116,
    right: 24,
    width: 34,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  statsPill: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 25,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  statsItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statsLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  statsDivider: {
    width: 1.8,
    height: 34,
  },
  waveformWrap: {
    alignSelf: 'center',
    marginTop: 84,
    width: '100%',
    height: 172,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformWrapStats: {
    marginTop: 38,
  },
  waveformScale: {
    width: '100%',
    transform: [{ scale: 0.82 }],
  },
  syncToast: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 6,
  },
  syncToastText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modeBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: -8,
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  chatScroll: {
    flex: 1,
    marginTop: 4,
    marginBottom: 92,
  },
  chatScrollInner: {
    flex: 1,
  },
  chatContent: {
    paddingTop: 12,
    paddingBottom: 22,
    gap: 18,
  },
  chatEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 220,
  },
  chatEmptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  messageBlock: {
    maxWidth: '88%',
    alignSelf: 'flex-start',
  },
  userMessageBlock: {
    alignSelf: 'flex-end',
  },
  messageText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
  },
  modelLabelText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
    opacity: 0.75,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '600',
  },
  composerDock: {
    position: 'absolute',
    left: 18,
    right: 18,
    gap: 8,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  attachmentPreviewText: {
    maxWidth: 210,
    fontSize: 12,
    fontWeight: '600',
  },
  composerModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 2,
  },
  composerModeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plusButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 50,
    maxHeight: 98,
    borderRadius: 20,
    borderWidth: 1.8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 16,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
})
