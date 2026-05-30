import React, { useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

// expo-apple-authentication is iOS-only. Load dynamically so the app still
// builds on Android / web without the native module present.
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
    // isAvailableAsync returns false in Expo Go, simulators without the
    // entitlement, and any build where the Sign in with Apple capability
    // hasn't been provisioned — preventing the "Application not found" error.
    if (Platform.OS !== 'ios' || !AppleAuthentication) return;
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  if (!available) return null;

  const handlePress = async () => {
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

  // Apple guidelines require using their official button component.
  // It also correctly binds to the native entitlement — resolving the
  // "Application not found" error that custom TouchableOpacity buttons cause.
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
