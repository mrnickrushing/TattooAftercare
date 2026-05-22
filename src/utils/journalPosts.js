import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'journal_posts';

export async function getAllJournalPosts() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getJournalPostsForTattoo(tattoo_id) {
  const all = await getAllJournalPosts();
  return all.filter((p) => p.tattoo_id === tattoo_id);
}

export async function createJournalPost({ tattoo_id, caption, photo_uris, day_number, visibility, artist_tag }) {
  const posts = await getAllJournalPosts();
  const newPost = {
    id: uuidv4(),
    tattoo_id,
    caption: caption || '',
    photo_uris: photo_uris || [],
    day_number: day_number || 0,
    visibility: visibility || 'friends',
    artist_tag: artist_tag || null,
    created_at: new Date().toISOString(),
  };
  posts.unshift(newPost);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  return newPost;
}

export async function updateJournalPost(id, updates) {
  const posts = await getAllJournalPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  posts[idx] = { ...posts[idx], ...updates };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  return posts[idx];
}

export async function deleteJournalPost(id) {
  const posts = await getAllJournalPosts();
  const filtered = posts.filter((p) => p.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
