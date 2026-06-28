// src/components/ScrollViewWithScrollbar.tsx
import React, { useRef, useState, useCallback } from 'react'
import {
  ScrollView,
  View,
  StyleSheet,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  LayoutChangeEvent,
} from 'react-native'
import CustomScrollbar from './CustomScrollbar'

interface ScrollViewWithScrollbarProps {
  children: React.ReactNode
  style?: any
  contentContainerStyle?: any
  showsVerticalScrollIndicator?: boolean
  [key: string]: any
}

export default function ScrollViewWithScrollbar({
  children,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  ...props
}: ScrollViewWithScrollbarProps) {
  const scrollY = useRef(new Animated.Value(0)).current
  const [contentHeight, setContentHeight] = useState(0)
  const [scrollViewHeight, setScrollViewHeight] = useState(0)

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  )

  const handleContentSizeChange = useCallback((w: number, h: number) => {
    setContentHeight(h)
  }, [])

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setScrollViewHeight(event.nativeEvent.layout.height)
  }, [])

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        {...props}
        style={styles.scrollView}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
      >
        {children}
      </ScrollView>
      <CustomScrollbar
        scrollY={scrollY}
        contentHeight={contentHeight}
        scrollViewHeight={scrollViewHeight}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
})