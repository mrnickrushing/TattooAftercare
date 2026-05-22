/**
 * localUser.js — Manages the local user profile in AsyncStorage.
 * This is used for local-first social features before server auth is added.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@tattoo_local_user';

const DEFAULT_USER = {
  id: null, // generated on first save
  username: '',
  display_name: '',
  bio: '',
  avatar_uri: null,
  follower_count: 0,
  following_count: 0,
  tattoo_count: 0,
  created_at: null,
};

export async function getLocalUser() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveLocalUser(user) {
  try {
    const toSave = {
      ...DEFAULT_USER,
      ...user,
      id: user.id || `local-${Date.now()}`,
      created_at: user.created_at || new Date().toISOString(),
    };
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(toSave));
    return toSave;
  } catch (e) {
    console.warn('saveLocalUser error:', e);
    return null;
  }
}

export async function ensureLocalUser() {
  const existing = await getLocalUser();
  if (existing?.id) return existing;
  return await saveLocalUser({ ...DEFAULT_USER, username: 'me' });
}

export async function clearLocalUser() {
  await AsyncStorage.removeItem(USER_KEY);
}
