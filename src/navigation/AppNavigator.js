/**
 * AppNavigator.js — Phase 5 update
 * Adds: ExploreScreen, ArtistProfileScreen, BadgeCabinetScreen, FriendsLeaderboardScreen
 * Explore replaces the old Social tab; Profile tab gets Badges + Leaderboard as nested routes.
 *
 * Fix: removed unused SocialStack definition.
 * Fix: removed import of NotificationSettingsScreen (now imported only inside ProfileStack).
 */
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
    </Stack.Navigator>
  );
}

function MyTattoosStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MyTattoos" component={MyTattoosScreen} options={{ title: 'My Tattoos' }} />
      <Stack.Screen name="TattooDetail" component={TattooDetailScreen} options={{ title: 'Tattoo Detail' }} />
      <Stack.Screen name="AddTattoo" component={AddTattooScreen} options={{ title: 'Add Tattoo', presentation: 'modal' }} />
      <Stack.Screen name="CareLog" component={CareLogScreen} options={{ title: 'Care Log' }} />
      <Stack.Screen name="CreateJournalPost" component={CreateJournalPostScreen} options={{ title: 'New Journal Post', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

// Explore: public grid + artist profiles
function ExploreStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Explore" component={ExploreScreen} options={{ title: 'Explore' }} />
      <Stack.Screen name="ArtistProfile" component={ArtistProfileScreen} options={({ route }) => ({ title: route.params?.artistName || 'Artist' })} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
}

// Portfolio
function PortfolioStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Portfolio" component={PortfolioScreen} options={{ title: 'Portfolio' }} />
      <Stack.Screen name="TattooDetail" component={TattooDetailScreen} options={{ title: 'Tattoo Detail' }} />
      <Stack.Screen name="CareLog" component={CareLogScreen} options={{ title: 'Care Log' }} />
      <Stack.Screen name="CreateJournalPost" component={CreateJournalPostScreen} options={{ title: 'New Journal Post', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

// Profile: own profile, notifications, badges, leaderboard, settings
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="BadgeCabinet" component={BadgeCabinetScreen} options={{ title: 'Badges & Achievements' }} />
      <Stack.Screen name="FriendsLeaderboard" component={FriendsLeaderboardScreen} options={{ title: 'Leaderboard' }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'Notification Settings' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(12,11,8,0.92)',
          borderTopColor: COLORS.tabBarBorder,
          borderTopWidth: 1,
          height: TAB_BAR_HEIGHT,
          paddingBottom: 8,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios'
            ? <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
            : null
        ),
        tabBarActiveTintColor: COLORS.tabBarActive,
        tabBarInactiveTintColor: COLORS.tabBarInactive,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            HomeTab:      'home',
            TattoosTab:   'layers',
            ExploreTab:   'compass',
            PortfolioTab: 'image',
            ProfileTab:   'user',
          };
          return <Feather name={icons[route.name] || 'circle'} size={size - 2} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      })}
    >
      <Tab.Screen name="HomeTab"      component={HomeStack}      options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="TattoosTab"   component={MyTattoosStack}  options={{ tabBarLabel: 'Tattoos' }} />
      <Tab.Screen name="ExploreTab"   component={ExploreStack}    options={{ tabBarLabel: 'Explore' }} />
      <Tab.Screen name="PortfolioTab" component={PortfolioStack}  options={{ tabBarLabel: 'Portfolio' }} />
      <Tab.Screen name="ProfileTab"   component={ProfileStack}    options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}
