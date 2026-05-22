/**
 * socialApi.js — REST client for the Railway backend social endpoints.
 *
 * All calls use the base URL from config. If the server is unreachable,
 * the app falls back to local SQLite data gracefully.
 *
 * BASE URL: set SOCIAL_API_BASE in src/config.js
 * e.g. export const SOCIAL_API_BASE = 'https://your-app.up.railway.app';
 */
import { SOCIAL_API_BASE } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getAuthToken() {
  return await AsyncStorage.getItem('auth_token');
}

async function request(method, path, body, requiresAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (requiresAuth) {
    const token = await getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${SOCIAL_API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── AUTH ──────────────────────────────────────────────────────────────────

export async function registerUser({ username, email, password, display_name }) {
  const data = await request('POST', '/auth/register', { username, email, password, display_name }, false);
  if (data.token) await AsyncStorage.setItem('auth_token', data.token);
  if (data.user?.id) await AsyncStorage.setItem('user_id', data.user.id);
  return data;
}

export async function loginUser({ email, password }) {
  const data = await request('POST', '/auth/login', { email, password }, false);
  if (data.token) await AsyncStorage.setItem('auth_token', data.token);
  if (data.user?.id) await AsyncStorage.setItem('user_id', data.user.id);
  return data;
}

export async function logoutUser() {
  await AsyncStorage.multiRemove(['auth_token', 'user_id']);
}

export async function getMyProfile() {
  return request('GET', '/users/me');
}

export async function updateMyProfile(data) {
  return request('PATCH', '/users/me', data);
}

// ─── USERS / SEARCH ────────────────────────────────────────────────────────

export async function searchUsers(query) {
  return request('GET', `/users/search?q=${encodeURIComponent(query)}`);
}

export async function getUserProfile(userId) {
  return request('GET', `/users/${userId}`);
}

export async function getUserPosts(userId, page = 1) {
  return request('GET', `/users/${userId}/posts?page=${page}`);
}

// ─── FOLLOWS ───────────────────────────────────────────────────────────────

export async function followUser(userId) {
  return request('POST', `/users/${userId}/follow`);
}

export async function unfollowUser(userId) {
  return request('DELETE', `/users/${userId}/follow`);
}

export async function getFollowers(userId, page = 1) {
  return request('GET', `/users/${userId}/followers?page=${page}`);
}

export async function getFollowing(userId, page = 1) {
  return request('GET', `/users/${userId}/following?page=${page}`);
}

// ─── FEED ──────────────────────────────────────────────────────────────────

export async function getFeed(page = 1) {
  return request('GET', `/feed?page=${page}`);
}

export async function getExploreFeed(page = 1, tag = null) {
  const q = tag ? `&tag=${encodeURIComponent(tag)}` : '';
  return request('GET', `/explore?page=${page}${q}`);
}

// ─── POSTS ─────────────────────────────────────────────────────────────────

export async function createPost({ tattoo_id, caption, photo_uris, style_tags, healing_day, visibility }) {
  return request('POST', '/posts', { tattoo_id, caption, photo_uris, style_tags, healing_day, visibility });
}

export async function updatePost(postId, { caption, style_tags, visibility }) {
  return request('PATCH', `/posts/${postId}`, { caption, style_tags, visibility });
}

export async function deletePost(postId) {
  return request('DELETE', `/posts/${postId}`);
}

export async function getPost(postId) {
  return request('GET', `/posts/${postId}`);
}

// ─── REACTIONS ─────────────────────────────────────────────────────────────

export async function reactToPost(postId, reactionType) {
  return request('POST', `/posts/${postId}/react`, { reaction_type: reactionType });
}

export async function removeReaction(postId) {
  return request('DELETE', `/posts/${postId}/react`);
}

// ─── COMMENTS ──────────────────────────────────────────────────────────────

export async function getComments(postId, page = 1) {
  return request('GET', `/posts/${postId}/comments?page=${page}`);
}

export async function addComment(postId, body, parentCommentId = null) {
  return request('POST', `/posts/${postId}/comments`, { body, parent_comment_id: parentCommentId });
}

export async function deleteComment(commentId) {
  return request('DELETE', `/comments/${commentId}`);
}

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────

export async function getNotifications(page = 1) {
  return request('GET', `/notifications?page=${page}`);
}

export async function markNotificationsRead() {
  return request('POST', '/notifications/read-all');
}
