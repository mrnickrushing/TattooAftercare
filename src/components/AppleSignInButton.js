import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

// expo-apple-authentication is iOS-only. We try to load it dynamically so the
// app still builds on Android / web without the native module being present.
let AppleAuthentication;
try {
  AppleAuthentication = require('expo-apple-authentication');
} catch {
  AppleAuthentication = null;
}

export default function AppleSignInButton({ navigation }) {
  const { loginWithApple } = useAuth();

  // Only show on iOS and only when the module is available
  if (Platform.OS !== 'ios' || !AppleAuthentication) return null;

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      await loginWithApple(credential);
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign In Failed', e?.message || 'Something went wrong.');
      }
    }
  };

  return (
    <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={handleAppleSignIn}>
      <Feather name="apple" size={18} color={COLORS.textPrimary} style={styles.icon} />
      <Text style={styles.text}>Continue with Apple</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  icon: { marginRight: 10 },
  text: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
