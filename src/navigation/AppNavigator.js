import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

import HomeScreen from '../screens/HomeScreen';
import MyTattoosScreen from '../screens/MyTattoosScreen';
import TattooDetailScreen from '../screens/TattooDetailScreen';
import AddTattooScreen from '../screens/AddTattooScreen';
import CareLogScreen from '../screens/CareLogScreen';
import LearnScreen from '../screens/LearnScreen';
import PortfolioScreen from '../screens/PortfolioScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.textPrimary,
  headerTitleStyle: { color: COLORS.textPrimary, fontWeight: '600' },
  headerShadowVisible: false,
  cardStyle: { backgroundColor: COLORS.background },
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TattooDetail" component={TattooDetailScreen} options={{ title: 'Tattoo Detail' }} />
      <Stack.Screen name="AddTattoo" component={AddTattooScreen} options={{ title: 'Add Tattoo', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function MyTattoosStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MyTattoos" component={MyTattoosScreen} options={{ title: 'My Tattoos' }} />
      <Stack.Screen name="TattooDetail" component={TattooDetailScreen} options={{ title: 'Tattoo Detail' }} />
      <Stack.Screen name="AddTattoo" component={AddTattooScreen} options={{ title: 'Add Tattoo', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

function CareLogStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="CareLog" component={CareLogScreen} options={{ title: 'Care Log' }} />
    </Stack.Navigator>
  );
}

function LearnStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Learn" component={LearnScreen} options={{ title: 'Healing Guide' }} />
    </Stack.Navigator>
  );
}

function PortfolioStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Portfolio" component={PortfolioScreen} options={{ title: 'Portfolio' }} />
      <Stack.Screen name="TattooDetail" component={TattooDetailScreen} options={{ title: 'Tattoo Detail' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.tabBar,
          borderTopColor: COLORS.tabBarBorder,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.tabBarActive,
        tabBarInactiveTintColor: COLORS.tabBarInactive,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            HomeTab: 'home',
            TattoosTab: 'layers',
            CareTab: 'clipboard',
            LearnTab: 'book-open',
            PortfolioTab: 'image',
          };
          return <Feather name={icons[route.name] || 'circle'} size={size - 2} color={color} />;
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="TattoosTab" component={MyTattoosStack} options={{ tabBarLabel: 'My Tattoos' }} />
      <Tab.Screen name="CareTab" component={CareLogStack} options={{ tabBarLabel: 'Care Log' }} />
      <Tab.Screen name="LearnTab" component={LearnStack} options={{ tabBarLabel: 'Learn' }} />
      <Tab.Screen name="PortfolioTab" component={PortfolioStack} options={{ tabBarLabel: 'Portfolio' }} />
    </Tab.Navigator>
  );
}
