// src/components/AttachmentSheet.tsx
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native'
import { CameraIcon, GalleryIcon, AttachmentIcon, VoiceIcon, CloseIcon } from '../theme/icons/MatIcons'
import { useTheme } from '../context/ThemeContext'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

interface AttachmentSheetProps {
  visible: boolean
  onClose: () => void
  onCamera: () => void
  onGallery: () => void
  onDocument: () => void
  onVoice: () => void
}

export default function AttachmentSheet({
  visible,
  onClose,
  onCamera,
  onGallery,
  onDocument,
  onVoice,
}: AttachmentSheetProps) {
  const { colors } = useTheme()
  const translateY = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current

  React.useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [visible])

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 0,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          onClose()
        } else {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start()
        }
      },
    })
  ).current

  const options = [
    { icon: CameraIcon, label: 'Take Photo', onPress: onCamera },
    { icon: GalleryIcon, label: 'Choose from Gallery', onPress: onGallery },
    { icon: AttachmentIcon, label: 'Attach Document', onPress: onDocument },
    { icon: VoiceIcon, label: 'Voice Message', onPress: onVoice },
  ]

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }], backgroundColor: colors.bgPanel }]}
          {...panResponder.panHandlers}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {options.map((option, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.option, { borderBottomColor: colors.border }]}
              onPress={() => {
                option.onPress()
                onClose()
              }}
            >
              <option.icon size={22} color={colors.textPrimary} />
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.accentRed }]}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
})
