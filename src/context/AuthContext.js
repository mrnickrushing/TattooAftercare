import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as socialApi from '../api/socialApi';
import { initSocialDB } from '../database/socialDb';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // { id, username, display_name, avatar_uri, ... }
  const [authStatus, setAuthStatus] = useState('loading'); // 'loading' | 'guest' | 'authenticated'

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    try {
      await initSocialDB();
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) { setAuthStatus('guest'); return; }
      // Try to fetch profile to validate token
      const profile = await socialApi.getMyProfile();
      setUser(profile);
      setAuthStatus('authenticated');
    } catch {
      // Token expired or network error — fall back to guest
      setAuthStatus('guest');
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

  const logout = useCallback(async () => {
    await socialApi.logoutUser();
    setUser(null);
    setAuthStatus('guest');
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
