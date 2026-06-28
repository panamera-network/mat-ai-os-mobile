// src/components/StatsOverlay.tsx
import React, { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { useTheme } from '../context/ThemeContext'
import { useBackendStatus } from '../context/BackendStatusContext'
import { RefreshIcon } from '../theme/icons/MatIcons'

interface StatsOverlayProps {
  visible: boolean
}

export default function StatsOverlay({ visible }: StatsOverlayProps) {
  const { colors } = useTheme()
  const { health, pendingTasks, refresh } = useBackendStatus()

  const heightAnim = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(heightAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(heightAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible])

  const animatedHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80],
  })

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: animatedHeight,
          opacity: opacityAnim,
          overflow: 'hidden',
          backgroundColor: colors.bgPanel,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{health?.active_agents_count ?? '-'}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{pendingTasks}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{health?.agents_count ?? '-'}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={refresh}>
          <RefreshIcon size={16} color={colors.accentPurple} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    height: 80,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
