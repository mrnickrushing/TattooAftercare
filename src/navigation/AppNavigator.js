import React from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS, TAB_BAR_HEIGHT } from '../constants/theme';

import HomeScreen from '../screens/HomeScreen';
import MyTattoosScreen from '../screens/MyTattoosScreen';
import TattooDetailScreen from '../screens/TattooDetailScreen';
import AddTattooScreen from '../screens/AddTattooScreen';
import CareLogScreen from '../screens/CareLogScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import CreateJournalPostScreen from '../screens/CreateJournalPostScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ArtistProfileScreen from '../screens/ArtistProfileScreen';
import BadgeCabinetScreen from '../screens/BadgeCabinetScreen';
import FriendsLeaderboardScreen from '../screens/FriendsLeaderboardScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import HealingTimelineScreen from '../screens/HealingTimelineScreen';
import InstagramLoginScreen from '../screens/InstagramLoginScreen';
import CareToolsScreen from '../screens/CareToolsScreen';
import CareCoachScreen from '../screens/CareCoachScreen';
import SymptomCheckScreen from '../screens/SymptomCheckScreen';
import SanidermModeScreen from '../screens/SanidermModeScreen';
import PhotoTimelineScreen from '../screens/PhotoTimelineScreen';
import AppointmentPrepScreen from '../screens/AppointmentPrepScreen';
import AppControlScreen from '../screens/AppControlScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const screenOptions = {
  headerStyle: {
    backgroundColor: COLORS.surface,
    shadowColor: 'rgba(200,169,81,0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  headerTintColor: COLORS.accent,
  headerTitleStyle: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerShadowVisible: false,
  cardStyle: { backgroundColor: COLORS.background },
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TattooDetail" component={TattooDetailScreen} options={{ title: 'Tattoo Detail' }} />
      <Stack.Screen name="AddTattoo" component={AddTattooScreen} options={{ title: 'Add Tattoo', presentation: 'modal' }} />
      <Stack.Screen name="CareLog" component={CareLogScreen} options={{ title: 'Care Log' }} />
      <Stack.Screen name="CreateJournalPost" component={CreateJournalPostScreen} options={{ title: 'New Journal Post', presentation: 'modal' }} />
      <Stack.Screen name="HealingTimeline" component={HealingTimelineScreen} options={{ title: 'Healing Timeline' }} />
    </Stack.Navigator>
  );
}

function MyTattoosStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MyTattoos" component={MyTattoosScreen} options={{ title: 'My Tattoos', headerShown: false }} />
      <Stack.Screen name="TattooDetail" component={TattooDetailScreen} options={{ title: 'Tattoo Detail' }} />
      <Stack.Screen name="AddTattoo" component={AddTattooScreen} options={{ title: 'Add Tattoo', presentation: 'modal' }} />
      <Stack.Screen name="CareLog" component={CareLogScreen} options={{ title: 'Care Log' }} />
      <Stack.Screen name="CreateJournalPost" component={CreateJournalPostScreen} options={{ title: 'New Journal Post', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function ToolsStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="CareTools" component={CareToolsScreen} options={{ title: 'Care Tools', headerShown: false }} />
      <Stack.Screen name="CareCoach" component={CareCoachScreen} options={{ title: 'Care Coach', headerShown: false }} />
      <Stack.Screen name="SymptomCheck" component={SymptomCheckScreen} options={{ title: 'Symptom Check', headerShown: false }} />
      <Stack.Screen name="SanidermMode" component={SanidermModeScreen} options={{ title: 'Saniderm Mode', headerShown: false }} />
      <Stack.Screen name="PhotoTimeline" component={PhotoTimelineScreen} options={{ title: 'Photo Timeline', headerShown: false }} />
      <Stack.Screen name="AppointmentPrep" component={AppointmentPrepScreen} options={{ title: 'Appointment Prep', headerShown: false }} />
      <Stack.Screen name="AppControl" component={AppControlScreen} options={{ title: 'App Control', headerShown: false }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'Notification Settings' }} />
      <Stack.Screen name="TattooDetail" component={TattooDetailScreen} options={{ title: 'Tattoo Detail' }} />
    </Stack.Navigator>
  );
}

function ExploreStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Explore" component={ExploreScreen} options={{ title: 'Explore' }} />
      <Stack.Screen name="ArtistProfile" component={ArtistProfileScreen} options={({ route }) => ({ title: route.params?.artistName || 'Artist' })} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Profile', headerShown: false }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'My Profile', headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="BadgeCabinet" component={BadgeCabinetScreen} options={{ title: 'Badges & Achievements' }} />
      <Stack.Screen name="FriendsLeaderboard" component={FriendsLeaderboardScreen} options={{ title: 'Leaderboard' }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'Notification Settings' }} />
      <Stack.Screen name="InstagramLogin" component={InstagramLoginScreen} options={{ title: 'Connect Instagram', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function TabIcon({ routeName, focused, color, size }) {
  const icons = {
    HomeTab: 'home',
    TattoosTab: 'layers',
    ToolsTab: 'tool',
    ExploreTab: 'compass',
    ProfileTab: 'user',
  };

  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <Feather name={icons[routeName] || 'circle'} size={size - 4} color={focused ? COLORS.textInverse : color} />
    </View>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          Platform.OS === 'ios'
            ? <BlurView intensity={90} tint="dark" style={[StyleSheet.absoluteFill, styles.tabBarBlur]} />
            : <View style={[StyleSheet.absoluteFill, styles.androidTabBg]} />
        ),
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.tabBarInactive,
        tabBarIcon: ({ focused, color, size }) => <TabIcon routeName={route.name} focused={focused} color={color} size={size} />,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="TattoosTab" component={MyTattoosStack} options={{ tabBarLabel: 'Tattoos' }} />
      <Tab.Screen name="ToolsTab" component={ToolsStack} options={{ tabBarLabel: 'Tools' }} />
      <Tab.Screen name="ExploreTab" component={ExploreStack} options={{ tabBarLabel: 'Explore' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 10,
    height: TAB_BAR_HEIGHT + 10,
    paddingTop: 8,
    paddingBottom: 10,
    borderRadius: 26,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(18,12,9,0.95)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 16,
  },
  tabBarBlur: { borderRadius: 26, overflow: 'hidden' },
  androidTabBg: { backgroundColor: 'rgba(18,12,9,0.95)' },
  tabItem: { paddingVertical: 2 },
  tabLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3, marginTop: 2 },
  iconPill: { width: 34, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  iconPillActive: { backgroundColor: COLORS.accent, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.45, shadowRadius: 8, elevation: 6 },
});
