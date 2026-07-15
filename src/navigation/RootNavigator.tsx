// src/navigation/RootNavigator.tsx
import { NavigationContainer, DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, Animated, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import HomeScreen from '../screens/HomeScreen'
import AgentsScreen from '../screens/AgentsScreen'
import GoalsScreen from '../screens/GoalsScreen'
import SettingsScreen from '../screens/SettingsScreen'
import ApprovalsScreen from '../screens/ApprovalsScreen'
import LoopsScreen from '../screens/LoopsScreen'
import LearnScreen from '../screens/LearnScreen'
import {
  AgentsIcon,
  GoalsIcon,
  MicIcon,
  StatsIcon,
  SettingsIcon,
  MemoIcon,
  ReminderIcon,
  ShieldIcon,
  LoopIcon,
  LearnIcon,
} from '../theme/icons/MatIcons'
import { useApp, type PttMode } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import React, { JSX, useRef, useState } from 'react'

export type RootTabParamList = {
  Home: undefined
}

const Tab = createBottomTabNavigator<RootTabParamList>()

const PTT_MODES: Array<{ id: PttMode; label: string; color: string; icon: typeof MicIcon }> = [
  { id: 'memo',     label: 'Memo',     color: '#0ea5e9', icon: MemoIcon },
  { id: 'agent',    label: 'Agent',    color: '#7c3aed', icon: MicIcon },
  { id: 'reminder', label: 'Reminder', color: '#f59e0b', icon: ReminderIcon },
]

// Fan positions relative to PTT orb center — arc going left (orb is right-side).
// All dy values sit safely below -SWIPE_THRESHOLD (-45) so hover-detection (which only
// starts tracking once the finger has moved up past that threshold) can still reach
// every item. Each adjacent pair is also spaced so |dx| or |dy| clears the fanItem's own
// size (68x58) with margin — two boxes only avoid overlapping if they're separated far
// enough on AT LEAST ONE axis, not just far enough apart in raw diagonal distance.
const FAN_POSITIONS = [
  { dx: -56,  dy: -171 }, // memo — steep upper-left
  { dx: -127, dy: -127 }, // agent — diagonal left
  { dx: -169, dy: -62  }, // reminder — shallow lower-left
]

const HOLD_THRESHOLD_MS = 400
const SWIPE_THRESHOLD = 45        // min px upward before fan opens
const SWIPE_UP_RATIO = 2.0        // dy must be 2x bigger than |dx| — intentional upward only

function PttOrb(): JSX.Element {
  const { colors, isDark } = useTheme()
  const { togglePTT, isRecording, pttMode, setPttMode, toggleComposer } = useApp()

  const [fanOpen, setFanOpen] = useState(false)
  const fanOpenRef = useRef(false)
  const [hoveredMode, setHoveredMode] = useState<PttMode | null>(null)
  const fanAnim = useRef(new Animated.Value(0)).current
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHoldingRef = useRef(false)
  const hasSwiped = useRef(false)

  const orbBorder = isDark ? 'rgba(226,232,240,0.22)' : 'rgba(17,17,17,0.16)'
  const activeMode = PTT_MODES.find(m => m.id === pttMode)!
  const orbColor = isRecording ? '#ef4444' : activeMode.color

  const openFan = () => {
    fanOpenRef.current = true
    setFanOpen(true)
    setHoveredMode(pttMode)
    Animated.spring(fanAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start()
  }

  const closeFan = (selectedMode?: PttMode) => {
    fanOpenRef.current = false
    Animated.timing(fanAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setFanOpen(false)
      setHoveredMode(null)
    })
    if (selectedMode) setPttMode(selectedMode)
  }

  const hoveredModeRef = useRef<PttMode | null>(null)
  hoveredModeRef.current = hoveredMode

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isHoldingRef.current = false
        hasSwiped.current = false
        // Start hold timer — fires if user doesn't swipe or release quickly
        holdTimerRef.current = setTimeout(() => {
          isHoldingRef.current = true
          if (!hasSwiped.current) {
            togglePTT() // start recording
          }
        }, HOLD_THRESHOLD_MS)
      },
      onPanResponderMove: (_, gs) => {
        const isDeliberateSwipeUp = gs.dy < -SWIPE_THRESHOLD && Math.abs(gs.dy) >= Math.abs(gs.dx) * SWIPE_UP_RATIO
        if (!hasSwiped.current && isDeliberateSwipeUp) {
          hasSwiped.current = true
          if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
          openFan()
        }
        if (fanOpenRef.current && gs.dy < -SWIPE_THRESHOLD) {
          let closest: PttMode = 'agent'
          let minDist = Infinity
          FAN_POSITIONS.forEach((pos, i) => {
            const dist = Math.sqrt((gs.dx - pos.dx) ** 2 + (gs.dy - pos.dy) ** 2)
            if (dist < minDist) { minDist = dist; closest = PTT_MODES[i].id }
          })
          setHoveredMode(closest)
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current)

        if (hasSwiped.current && gs.dy < -SWIPE_THRESHOLD / 2) {
          // Swipe up — confirm mode selection
          closeFan(hoveredModeRef.current ?? undefined)
        } else if (isHoldingRef.current) {
          // Was holding → stop recording
          togglePTT()
        } else if (!hasSwiped.current) {
          // Quick tap → open text composer
          toggleComposer()
        }
        isHoldingRef.current = false
        hasSwiped.current = false
      },
      onPanResponderTerminate: () => {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
        if (isHoldingRef.current) togglePTT()
        closeFan()
        isHoldingRef.current = false
        hasSwiped.current = false
      },
    })
  ).current

  return (
    <View style={styles.pttContainer}>
      {/* Fan items */}
      {fanOpen && PTT_MODES.map((mode, i) => {
        const pos = FAN_POSITIONS[i]
        const isHovered = hoveredMode === mode.id
        const Icon = mode.icon
        return (
          <Animated.View
            key={mode.id}
            style={[
              styles.fanItem,
              {
                transform: [
                  { translateX: fanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, pos.dx] }) },
                  { translateY: fanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, pos.dy] }) },
                  { scale: fanAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, isHovered ? 1.1 : 1] }) },
                ],
                opacity: fanAnim,
                backgroundColor: isHovered ? mode.color : isDark ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.92)',
                borderColor: mode.color,
              },
            ]}
          >
            <Icon size={18} color={isHovered ? '#fff' : mode.color} strokeWidth={1.8} />
            <Text style={[styles.fanLabel, { color: isHovered ? '#fff' : mode.color }]}>{mode.label}</Text>
          </Animated.View>
        )
      })}

      {/* PTT Orb */}
      <View
        style={[styles.pttOrb, isRecording && styles.pttOrbActive]}
        {...panResponder.panHandlers}
      >
        <View style={[
          styles.orbHalo,
          {
            backgroundColor: orbColor + '30',
            borderColor: orbBorder,
            boxShadow: `0 14px 34px ${orbColor}44`,
          },
        ]} />
        <View style={[styles.orbCore, { backgroundColor: orbColor, borderColor: orbBorder }]}>
          <View style={styles.orbSheen} />
          <View style={[styles.orbHotspotCyan, { opacity: pttMode === 'agent' ? 1 : 0.4 }]} />
          <View style={[styles.orbHotspotPink, { opacity: pttMode === 'agent' ? 1 : 0.4 }]} />
          <MicIcon size={22} color="#fff" strokeWidth={1.9} />
        </View>
      </View>

      {/* Mode label below orb */}
      {!isRecording && pttMode !== 'agent' && (
        <Text style={[styles.modeLabel, { color: activeMode.color }]}>{activeMode.label}</Text>
      )}
    </View>
  )
}

// Custom tab bar component
function CustomTabBar(): JSX.Element | null {
  const [navExpanded, setNavExpanded] = React.useState(false)
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const navAnim = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    Animated.timing(navAnim, {
      toValue: navExpanded ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start()
  }, [navExpanded, navAnim])
  const {
    setAgentsVisible,
    setGoalsVisible,
    setSettingsVisible,
    setApprovalsVisible,
    setLoopsVisible,
    setLearnVisible,
    toggleStats,
    commandComposerVisible,
  } = useApp()

  const handleAgents = () => setAgentsVisible(true)
  const handleGoals = () => setGoalsVisible(true)
  const handleSettings = () => setSettingsVisible(true)
  const handleStats = () => toggleStats()
  const handleApprovals = () => setApprovalsVisible(true)
  const handleLoops = () => setLoopsVisible(true)
  const handleLearn = () => setLearnVisible(true)

  if (commandComposerVisible) return null

  const items = [
    { label: 'agent', onPress: handleAgents, icon: AgentsIcon },
    { label: 'goal', onPress: handleGoals, icon: GoalsIcon },
    { label: 'loop', onPress: handleLoops, icon: LoopIcon },
    { label: 'ok?', onPress: handleApprovals, icon: ShieldIcon },
    { label: 'learn', onPress: handleLearn, icon: LearnIcon },
    { label: 'stat', onPress: handleStats, icon: StatsIcon },
    { label: 'setting', onPress: handleSettings, icon: SettingsIcon },
  ]
  const glassBg = isDark ? 'rgba(15,23,42,0.76)' : 'rgba(255,255,255,0.74)'
  const glassShadow = isDark ? '0 14px 34px rgba(0,0,0,0.42)' : '0 12px 30px rgba(15, 23, 42, 0.10)'

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.bgApp, paddingBottom: 18 + insets.bottom }]}>
      {navExpanded ? (
        <Animated.View
          style={[
            styles.segmentedNav,
            {
              backgroundColor: glassBg,
              borderColor: colors.border,
              boxShadow: glassShadow,
              opacity: navAnim,
              transformOrigin: 'left',
              transform: [{ scaleX: navAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }) }],
            },
          ]}
        >
        <TouchableOpacity
          style={styles.segmentedNavTouchable}
          onPress={() => setNavExpanded(false)}
          activeOpacity={0.82}
        >
          <TouchableOpacity
            style={styles.segmentCollapseButton}
            onPressIn={(event) => event.stopPropagation()}
            onPress={() => setNavExpanded(false)}
            activeOpacity={0.7}
          >
            <View style={styles.segmentCollapseGrid}>
              <View style={[styles.segmentCollapseDot, { backgroundColor: colors.textPrimary }]} />
              <View style={[styles.segmentCollapseDot, { backgroundColor: colors.textPrimary }]} />
              <View style={[styles.segmentCollapseDot, { backgroundColor: colors.textPrimary }]} />
              <View style={[styles.segmentCollapseDot, { backgroundColor: colors.textPrimary }]} />
            </View>
          </TouchableOpacity>
          <View style={styles.segmentDivider} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentScrollContent}
            onStartShouldSetResponder={() => true}
          >
            {items.map((item, index) => {
              const Icon = item.icon
              return (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    style={styles.segmentButtonScroll}
                    onPressIn={(event) => event.stopPropagation()}
                    onPress={() => {
                      item.onPress()
                      setNavExpanded(false)
                    }}
                    activeOpacity={0.72}
                  >
                    <Icon size={16} color={colors.textPrimary} strokeWidth={1.8} />
                    <Text style={[styles.segmentText, { color: colors.textPrimary }]}>{item.label}</Text>
                  </TouchableOpacity>
                  {index < items.length - 1 && <View style={[styles.segmentDivider, { backgroundColor: colors.border }]} />}
                </React.Fragment>
              )
            })}
          </ScrollView>
        </TouchableOpacity>
        </Animated.View>
      ) : (
        <TouchableOpacity
          style={[
            styles.navBubble,
            { backgroundColor: glassBg, borderColor: colors.border, boxShadow: glassShadow },
          ]}
          onPress={() => setNavExpanded(true)}
          activeOpacity={0.76}
        >
          <View style={styles.navDotGrid}>
            <View style={[styles.navDot, { backgroundColor: colors.textPrimary }]} />
            <View style={[styles.navDot, { backgroundColor: colors.textPrimary }]} />
            <View style={[styles.navDot, { backgroundColor: colors.textPrimary }]} />
            <View style={[styles.navDot, { backgroundColor: colors.textPrimary }]} />
          </View>
        </TouchableOpacity>
      )}

      <PttOrb />
    </View>
  )
}

export default function RootNavigator(): JSX.Element {
  const { isDark, colors } = useTheme()
  const {
    agentsVisible,
    setAgentsVisible,
    goalsVisible,
    setGoalsVisible,
    settingsVisible,
    setSettingsVisible,
    approvalsVisible,
    setApprovalsVisible,
    loopsVisible,
    setLoopsVisible,
    learnVisible,
    setLearnVisible,
    statsToggle,
    pttToggle,
  } = useApp()

  const navTheme: Theme = isDark ? DarkTheme : DefaultTheme
  const customTheme: Theme = {
    ...navTheme,
    colors: {
      ...navTheme.colors,
      background: colors.bgApp,
      card: colors.bgPanel,
      border: colors.border,
      primary: colors.accentPurple,
      text: colors.textPrimary,
    },
  }

  return (
    <NavigationContainer theme={customTheme}>
      <View style={{ flex: 1, backgroundColor: colors.bgApp }}>
        <Tab.Navigator
          tabBar={() => <CustomTabBar />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="Home">
            {() => (
              <HomeScreen
                statsToggle={statsToggle}
                pttToggle={pttToggle}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>

        {/* Bottom Sheets */}
        <AgentsScreen visible={agentsVisible} onClose={() => setAgentsVisible(false)} />
        <GoalsScreen visible={goalsVisible} onClose={() => setGoalsVisible(false)} />
        <SettingsScreen visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
        <ApprovalsScreen visible={approvalsVisible} onClose={() => setApprovalsVisible(false)} />
        <LoopsScreen visible={loopsVisible} onClose={() => setLoopsVisible(false)} />
        <LearnScreen visible={learnVisible} onClose={() => setLearnVisible(false)} />
      </View>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    overflow: 'visible',
  },
  segmentedNav: {
    flex: 1,
    minHeight: 52,
    maxWidth: 260,
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segmentedNavTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navBubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  navDotGrid: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  navDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    opacity: 0.78,
  },
  segmentButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  segmentScrollContent: {
    alignItems: 'center',
    height: '100%',
  },
  segmentButtonScroll: {
    width: 46,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  segmentCollapseButton: {
    width: 34,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentCollapseGrid: {
    width: 14,
    height: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  segmentCollapseDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
    opacity: 0.55,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '800',
  },
  segmentDivider: {
    width: 1,
    height: 30,
  },
  pttContainer: {
    alignItems: 'center',
    marginLeft: 10,
    width: 76,
    height: 76,
  },
  pttOrb: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pttOrbActive: {
    transform: [{ scale: 0.98 }],
  },
  orbHalo: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
  },
  orbCore: {
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  orbSheen: {
    position: 'absolute',
    top: -8,
    left: -6,
    width: 52,
    height: 36,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.28)',
    transform: [{ rotate: '-28deg' }],
  },
  orbHotspotCyan: {
    position: 'absolute',
    right: -6,
    top: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 211, 238, 0.74)',
  },
  orbHotspotPink: {
    position: 'absolute',
    left: -8,
    bottom: -4,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(236, 72, 153, 0.76)',
  },
  fanItem: {
    position: 'absolute',
    width: 68,
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    // Center on the orb (76x76) — offset by half fanItem size
    top: 9,   // (76 - 58) / 2
    left: 4,  // (76 - 68) / 2
  },
  fanLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  modeLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
