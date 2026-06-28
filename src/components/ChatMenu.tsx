// src/components/ChatMenu.tsx
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native'
import { useTheme } from '../context/ThemeContext'

interface ChatMenuProps {
  visible: boolean
  onClose: () => void
  onNewConversation: () => void
  onClearChat: () => void
  onExportChat: () => void
}

export default function ChatMenu({
  visible,
  onClose,
  onNewConversation,
  onClearChat,
  onExportChat,
}: ChatMenuProps) {
  const { colors } = useTheme()
  const fadeAnim = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start()
    }
  }, [visible])

  const options = [
    { label: 'New Conversation', onPress: onNewConversation },
    { label: 'Clear Chat', onPress: onClearChat },
    { label: 'Export Chat', onPress: onExportChat },
  ]

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <Animated.View style={[styles.menu, { opacity: fadeAnim, backgroundColor: colors.bgPanel, borderColor: colors.border }]}>
          {options.map((option, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.option, i < options.length - 1 && { borderBottomColor: colors.border }]}
              onPress={() => {
                option.onPress()
                onClose()
              }}
            >
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menu: {
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
})
