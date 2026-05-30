import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as socialApi from '../api/socialApi';
import { initSocialDB } from '../database/socialDb';
import { migrateBadgeUniqueness } from '../database/badgeMigration';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading');

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    try {
      await initSocialDB();
      await migrateBadgeUniqueness();
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const profile = await socialApi.getMyProfile();
        setUser(profile);
        setAuthStatus('authenticated');
        return;
      }
      // Check if user has previously chosen to use the app as a guest
      const guestMode = await AsyncStorage.getItem('guest_mode');
      setAuthStatus(guestMode ? 'guest' : 'needs_auth');
    } catch {
      setAuthStatus('needs_auth');
    }
  };

  const login = useCallback(async (email, password) => {
    const data = await socialApi.loginUser({ email, password });
    setUser(data.user);
    setAuthStatus('authenticated');
    return data.user;
  }, []);

  const register = useCallback(async (username, email, password, displayName) => {
    const data = await socialApi.registerUser({ username, email, password, display_name: displayName });
    setUser(data.user);
    setAuthStatus('authenticated');
    return data.user;
  }, []);

  const loginWithApple = useCallback(async (credential) => {
    const data = await socialApi.loginWithApple(credential);
    setUser(data.user);
    setAuthStatus('authenticated');
    return data.user;
  }, []);

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem('guest_mode', '1');
    setAuthStatus('guest');
  }, []);

  const logout = useCallback(async () => {
    await socialApi.logoutUser();
    await AsyncStorage.removeItem('guest_mode');
    setUser(null);
    setAuthStatus('needs_auth');
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const updated = await socialApi.updateMyProfile(updates);
    setUser(updated);
    return updated;
  }, []);

  const isAuthenticated = authStatus === 'authenticated';
  const isGuest = authStatus === 'guest';
  const isLoading = authStatus === 'loading';

  return (
    <AuthContext.Provider value={{
      user,
      authStatus,
      isAuthenticated,
      isGuest,
      isLoading,
      login,
      register,
      loginWithApple,
      continueAsGuest,
      logout,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
