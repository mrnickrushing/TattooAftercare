import React, { useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

let AppleAuthentication;
try {
  AppleAuthentication = require('expo-apple-authentication');
} catch {
  AppleAuthentication = null;
}

export default function AppleSignInButton() {
  const { loginWithApple } = useAuth();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !AppleAuthentication) return;
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  if (!available) return null;

  const handlePress = async () => {
    let credential;

    // Step 1: Get credential from Apple
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
    } catch (e) {
      if (e.code === 'ERR_REQUEST_CANCELED') return;
      // ERR_APPLE_AUTHENTICATION_CREDENTIAL / native error — entitlement issue
      console.warn('[AppleAuth] signInAsync failed:', e.code, e.message);
      Alert.alert(
        'Apple Sign In Failed',
        `Step 1 (Apple) failed.\nCode: ${e.code ?? 'unknown'}\n${e.message ?? ''}`.trim(),
      );
      return;
    }

    // Step 2: Send credential to backend
    try {
      await loginWithApple(credential);
    } catch (e) {
      console.warn('[AppleAuth] backend loginWithApple failed:', e.message);
      Alert.alert(
        'Apple Sign In Failed',
        `Step 2 (server) failed.\n${e.message ?? 'Unknown error'}`.trim(),
      );
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
      cornerRadius={14}
      style={{ width: '100%', height: 50 }}
      onPress={handlePress}
    />
  );
}
