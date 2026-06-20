import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import ChoiceGameScreen from '../screens/ChoiceGameScreen';
import CountdownScreen from '../screens/CountdownScreen';
import DeckScreen from '../screens/DeckScreen';
import FutureScreen from '../screens/FutureScreen';
import GamesScreen from '../screens/GamesScreen';
import HomeScreen from '../screens/HomeScreen';
import InsightsScreen from '../screens/InsightsScreen';
import JournalScreen from '../screens/JournalScreen';
import KnowMeScreen from '../screens/KnowMeScreen';
import LettersScreen from '../screens/LettersScreen';
import MissYouScreen from '../screens/MissYouScreen';
import MomentsScreen from '../screens/MomentsScreen';
import MoreScreen from '../screens/MoreScreen';
import PulseScreen from '../screens/PulseScreen';
import RemindersScreen from '../screens/RemindersScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TicTacToeScreen from '../screens/TicTacToeScreen';
import VaultScreen from '../screens/VaultScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function tabIcon(emoji: string) {
  const Icon = ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>
  );
  return Icon;
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: tabIcon('🏠'), title: 'Home' }} />
      <Tab.Screen name="Pulse" component={PulseScreen} options={{ tabBarIcon: tabIcon('💗'), title: 'Pulse' }} />
      <Tab.Screen name="MissYou" component={MissYouScreen} options={{ tabBarIcon: tabIcon('🤍'), title: 'Miss you' }} />
      <Tab.Screen name="Moments" component={MomentsScreen} options={{ tabBarIcon: tabIcon('📸'), title: 'Moments' }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarIcon: tabIcon('☰'), title: 'More' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="Vault" component={VaultScreen} />
      <Stack.Screen name="Letters" component={LettersScreen} />
      <Stack.Screen name="Deck" component={DeckScreen} />
      <Stack.Screen name="Journal" component={JournalScreen} />
      <Stack.Screen name="Insights" component={InsightsScreen} />
      <Stack.Screen name="Future" component={FutureScreen} />
      <Stack.Screen name="Countdown" component={CountdownScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Games" component={GamesScreen} />
      <Stack.Screen name="ChoiceGame" component={ChoiceGameScreen} />
      <Stack.Screen name="KnowMe" component={KnowMeScreen} />
      <Stack.Screen name="TicTacToe" component={TicTacToeScreen} />
    </Stack.Navigator>
  );
}
