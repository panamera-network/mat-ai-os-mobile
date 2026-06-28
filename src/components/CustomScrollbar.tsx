// src/components/CustomScrollbar.tsx
import React, { useRef, useState, useCallback } from 'react'
import {
  View,
  StyleSheet,
  Animated,
} from 'react-native'
import { useTheme } from '../context/ThemeContext'

interface ScrollbarProps {
  scrollY: Animated.Value
  contentHeight: number
  scrollViewHeight: number
}

export default function CustomScrollbar({ scrollY, contentHeight, scrollViewHeight }: ScrollbarProps) {
  const { colors } = useTheme()
  const [visible, setVisible] = useState(false)
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const thumbHeight = Math.max(
    40,
    (scrollViewHeight / contentHeight) * scrollViewHeight
  )

  const thumbPosition = scrollY.interpolate({
    inputRange: [0, Math.max(contentHeight - scrollViewHeight, 1)],
    outputRange: [0, scrollViewHeight - thumbHeight],
    extrapolate: 'clamp',
  })

  const opacity = useRef(new Animated.Value(0)).current

  const showScrollbar = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current)

    Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start()
    setVisible(true)

    hideTimeout.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false))
    }, 1500)
  }, [opacity])

  if (!visible && contentHeight <= scrollViewHeight) return null

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          height: scrollViewHeight,
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            height: thumbHeight,
            transform: [{ translateY: thumbPosition }],
            backgroundColor: colors.textSecondary + '40',
          },
        ]}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 2,
    top: 0,
    width: 4,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  thumb: {
    width: 3,
    borderRadius: 2,
  },
})
