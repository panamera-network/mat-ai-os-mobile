import { NavigationContainer, DarkTheme, type Theme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import { colors } from '../theme/colors'
import HomeScreen from '../screens/HomeScreen'
import ChatScreen from '../screens/ChatScreen'
import AgentsScreen from '../screens/AgentsScreen'
import GoalsScreen from '../screens/GoalsScreen'
import SettingsScreen from '../screens/SettingsScreen'

export type RootTabParamList = {
  Home: undefined
  Chat: undefined
  Agents: undefined
  Goals: undefined
  Settings: undefined
}

const Tab = createBottomTabNavigator<RootTabParamList>()

const TAB_ICONS: Record<keyof RootTabParamList, string> = {
  Home: '🏠',
  Chat: '💬',
  Agents: '🤖',
  Goals: '🎯',
  Settings: '⚙️',
}

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bgApp,
    card: colors.bgPanel,
    border: colors.border,
    primary: colors.accentPurple,
    text: colors.textPrimary,
  },
}

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: colors.bgPanel },
          headerTintColor: colors.textPrimary,
          tabBarStyle: { backgroundColor: colors.bgPanel, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.accentPurple,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>{TAB_ICONS[route.name]}</Text>,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'MAT.AI OS' }} />
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Agents" component={AgentsScreen} />
        <Tab.Screen name="Goals" component={GoalsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  )
}
