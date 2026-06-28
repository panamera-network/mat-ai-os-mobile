// src/navigation/RootNavigator.tsx
import { NavigationContainer, DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import HomeScreen from '../screens/HomeScreen'
import AgentsScreen from '../screens/AgentsScreen'
import GoalsScreen from '../screens/GoalsScreen'
import SettingsScreen from '../screens/SettingsScreen'
import {
  AgentsIcon,
  GoalsIcon,
  MicIcon,
  StatsIcon,
  SettingsIcon,
} from '../theme/icons/MatIcons'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import React, { JSX } from 'react'

export type RootTabParamList = {
  Home: undefined
}

const Tab = createBottomTabNavigator<RootTabParamList>()

// Custom tab bar component
function CustomTabBar(): JSX.Element | null {
  const [navExpanded, setNavExpanded] = React.useState(false)
  const { colors, isDark } = useTheme()
  const {
    setAgentsVisible,
    setGoalsVisible,
    setSettingsVisible,
    toggleStats,
    togglePTT,
    isRecording,
    commandComposerVisible,
  } = useApp()

  const handleAgents = () => setAgentsVisible(true)
  const handleGoals = () => setGoalsVisible(true)
  const handleSettings = () => setSettingsVisible(true)
  const handleStats = () => toggleStats()

  const handlePTT = () => {
    togglePTT()
  }

  if (commandComposerVisible) return null

  const items = [
    { label: 'agent', onPress: handleAgents, icon: AgentsIcon },
    { label: 'goal', onPress: handleGoals, icon: GoalsIcon },
    { label: 'stat', onPress: handleStats, icon: StatsIcon },
    { label: 'setting', onPress: handleSettings, icon: SettingsIcon },
  ]
  const glassBg = isDark ? 'rgba(15,23,42,0.76)' : 'rgba(255,255,255,0.74)'
  const glassShadow = isDark ? '0 14px 34px rgba(0,0,0,0.42)' : '0 12px 30px rgba(15, 23, 42, 0.10)'
  const orbHalo = isDark ? 'rgba(79, 70, 229, 0.28)' : 'rgba(14, 165, 233, 0.16)'
  const orbBorder = isDark ? 'rgba(226,232,240,0.22)' : 'rgba(17,17,17,0.16)'

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.bgApp }]}>
      {navExpanded ? (
        <TouchableOpacity
          style={[
            styles.segmentedNav,
            { backgroundColor: glassBg, borderColor: colors.border, boxShadow: glassShadow },
          ]}
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
          {items.map((item, index) => {
            const Icon = item.icon
            return (
              <React.Fragment key={item.label}>
                <TouchableOpacity
                  style={styles.segmentButton}
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
        </TouchableOpacity>
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

      <TouchableOpacity
        style={[styles.pttOrb, isRecording && styles.pttOrbActive]}
        onPress={handlePTT}
        activeOpacity={0.76}
      >
        <View style={[styles.orbHalo, { backgroundColor: orbHalo, borderColor: orbBorder, boxShadow: isDark ? '0 14px 34px rgba(124, 58, 237, 0.28)' : '0 14px 34px rgba(14, 165, 233, 0.24)' }]} />
        <View style={[styles.orbCore, { borderColor: orbBorder }, isRecording && styles.orbCoreActive]}>
          <View style={styles.orbSheen} />
          <View style={styles.orbHotspotCyan} />
          <View style={styles.orbHotspotPink} />
          <MicIcon size={22} color="#fff" strokeWidth={1.9} />
        </View>
      </TouchableOpacity>
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
      </View>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    height: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
  },
  segmentedNav: {
    flex: 1,
    minHeight: 52,
    maxWidth: 260,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
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
  pttOrb: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
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
    backgroundColor: '#7c3aed',
    borderWidth: 1,
  },
  orbCoreActive: {
    backgroundColor: '#ef4444',
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
})
