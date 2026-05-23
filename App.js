import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { initDB } from './src/database/db';
import { requestPermissions } from './src/utils/notifications';
import { AppProvider } from './src/context/AppContext';
import { AuthProvider } from './src/context/AuthContext';
import { SocialProvider } from './src/context/SocialContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { COLORS } from './src/constants/theme';
import { REVENUECAT_API_KEY_IOS, REVENUECAT_API_KEY_ANDROID } from './src/config';

function initRevenueCat() {
  try {
    const Purchases = require('react-native-purchases').default;
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
    if (!apiKey.startsWith('YOUR_')) {
      Purchases.configure({ apiKey });
    }
  } catch {
    // RevenueCat not installed or keys not set — skip
  }
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      console.log('App bootstrap starting on', Platform.OS);
      try {
        await initDB();
        if (Platform.OS !== 'web') {
          await requestPermissions();
        }
        initRevenueCat();
        console.log('App bootstrap finished');
      } catch (e) {
        console.warn('Bootstrap error:', e);
      } finally {
        setReady(true);
      }
    }
    bootstrap();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocialProvider>
          <AppProvider>
            <NavigationContainer
              theme={{
                dark: true,
                colors: {
                  primary: COLORS.accent,
                  background: COLORS.background,
                  card: COLORS.surface,
                  text: COLORS.textPrimary,
                  border: COLORS.border,
                  notification: COLORS.accent,
                },
              }}
            >
              <StatusBar style="light" />
              <ErrorBoundary>
                <AppNavigator />
              </ErrorBoundary>
            </NavigationContainer>
          </AppProvider>
        </SocialProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
