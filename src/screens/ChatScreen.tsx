import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Audio } from 'expo-av'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { colors } from '../theme/colors'
import { matOsClient, type MatOSAttachment } from '../api/MatOSClient'
import { useSettings } from '../context/SettingsContext'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  feedbackTaskId?: string | null
  feedbackRating?: number
}

export default function ChatScreen() {
  const { sessionId, newSession } = useSettings()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [attachment, setAttachment] = useState<MatOSAttachment | null>(null)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const listRef = useRef<FlatList<ChatMessage>>(null)

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message])
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))
  }

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim()
    const file = attachment
    if (!text && !file) return
    setInput('')
    setAttachment(null)
    appendMessage({ id: `${Date.now()}-user`, role: 'user', text: text || `Attached: ${file?.name ?? ''}` })
    setPending(true)
    try {
      const outcome = await matOsClient.sendTask(text || `Attached file: ${file?.name ?? ''}`, sessionId, file ?? undefined)
      if (outcome.ok) {
        appendMessage({ id: `${Date.now()}-assistant`, role: 'assistant', text: outcome.text, feedbackTaskId: outcome.feedbackTaskId })
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
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setAttachment({ uri: asset.uri, name: asset.fileName ?? 'photo.jpg', mimeType: asset.mimeType ?? 'image/jpeg' })
  }

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain', 'text/markdown', 'text/csv'],
      copyToCacheDirectory: true,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setAttachment({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' })
  }

  const startRecording = async () => {
    const permission = await Audio.requestPermissionsAsync()
    if (!permission.granted) return
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
    const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
    setRecording(rec)
  }

  const stopRecordingAndTranscribe = async () => {
    if (!recording) return
    setRecording(null)
    await recording.stopAndUnloadAsync()
    const uri = recording.getURI()
    if (!uri) return
    setIsTranscribing(true)
    try {
      const outcome = await matOsClient.transcribeAudio({ uri, name: 'recording.m4a', mimeType: 'audio/m4a' })
      if (outcome.ok && outcome.text.trim()) {
        await send(outcome.text.trim())
      } else if (!outcome.ok) {
        appendMessage({ id: `${Date.now()}-error`, role: 'system', text: outcome.error })
      }
    } finally {
      setIsTranscribing(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={newSession}>
          <Text style={styles.newSessionBtn}>+ New conversation</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={<Text style={styles.emptyHint}>Ask MAT.AI anything</Text>}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' ? styles.bubbleUser : item.role === 'system' ? styles.bubbleSystem : styles.bubbleAssistant,
            ]}
          >
            <Text style={styles.bubbleText}>{item.text}</Text>
            {item.feedbackTaskId && (
              <View style={styles.feedbackRow}>
                <TouchableOpacity
                  disabled={item.feedbackRating !== undefined}
                  onPress={() => rateMessage(item.id, item.feedbackTaskId!, 5)}
                >
                  <Text style={[styles.feedbackBtn, item.feedbackRating === 5 && styles.feedbackBtnActive]}>👍</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={item.feedbackRating !== undefined}
                  onPress={() => rateMessage(item.id, item.feedbackTaskId!, 1)}
                >
                  <Text style={[styles.feedbackBtn, item.feedbackRating !== undefined && item.feedbackRating <= 2 && styles.feedbackBtnActive]}>
                    👎
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />

      {pending && (
        <View style={styles.pendingRow}>
          <ActivityIndicator size="small" color={colors.accentPurple} />
          <Text style={styles.pendingText}>Thinking…</Text>
        </View>
      )}

      {attachment && (
        <View style={styles.attachmentPreview}>
          <Text style={styles.attachmentPreviewText} numberOfLines={1}>
            📎 {attachment.name}
          </Text>
          <TouchableOpacity onPress={() => setAttachment(null)}>
            <Text style={styles.attachmentRemove}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={pickImage} disabled={pending}>
          <Text style={styles.iconBtnText}>🖼️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={pickDocument} disabled={pending}>
          <Text style={styles.iconBtnText}>📎</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, recording && styles.iconBtnRecording]}
          onPress={recording ? stopRecordingAndTranscribe : startRecording}
          disabled={pending || isTranscribing}
        >
          <Text style={styles.iconBtnText}>{isTranscribing ? '…' : recording ? '⏹️' : '🎤'}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask MAT.AI anything..."
          placeholderTextColor={colors.textSecondary}
          editable={!pending}
          onSubmitEditing={() => send()}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={() => send()} disabled={pending}>
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgApp },
  toolbar: { paddingHorizontal: 16, paddingTop: 12, alignItems: 'flex-end' },
  newSessionBtn: { color: colors.textSecondary, fontSize: 12 },
  messageList: { padding: 16, gap: 8, flexGrow: 1 },
  emptyHint: { color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
  bubble: { borderRadius: 12, padding: 10, maxWidth: '85%' },
  bubbleUser: { backgroundColor: 'rgba(139,92,246,0.18)', alignSelf: 'flex-end', borderColor: colors.accentPurple, borderWidth: 1 },
  bubbleAssistant: { backgroundColor: colors.bgCard, alignSelf: 'flex-start', borderColor: colors.border, borderWidth: 1 },
  bubbleSystem: { backgroundColor: 'rgba(239,68,68,0.12)', alignSelf: 'center', borderColor: colors.accentRed, borderWidth: 1 },
  bubbleText: { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  feedbackRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  feedbackBtn: { fontSize: 14, opacity: 0.5 },
  feedbackBtnActive: { opacity: 1 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  pendingText: { color: colors.textSecondary, fontSize: 12 },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.accentPurple,
  },
  attachmentPreviewText: { color: colors.textPrimary, fontSize: 12, flex: 1 },
  attachmentRemove: { color: colors.textSecondary, fontSize: 14, paddingHorizontal: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 16, paddingTop: 4 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnRecording: { borderColor: colors.accentRed, backgroundColor: 'rgba(239,68,68,0.15)' },
  iconBtnText: { fontSize: 15 },
  input: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: 15 },
})
