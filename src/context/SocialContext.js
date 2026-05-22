import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import * as socialApi from '../api/socialApi';
import * as socialDb from '../database/socialDb';
import { useAuth } from './AuthContext';

const SocialContext = createContext(null);

export function SocialProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  const [feed, setFeed] = useState([]);          // friends feed posts
  const [explore, setExplore] = useState([]);     // public explore posts
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ─── FEED ──────────────────────────────────────────────────────────────

  const loadFeed = useCallback(async (reset = false) => {
    if (!isAuthenticated) return;
    setFeedLoading(true);
    try {
      const page = reset ? 1 : feedPage;
      const data = await socialApi.getFeed(page);
      const posts = data.posts || [];
      // Cache each post locally
      for (const p of posts) await socialDb.savePostLocal(p);
      if (reset) {
        setFeed(posts);
        setFeedPage(2);
      } else {
        setFeed((prev) => [...prev, ...posts]);
        setFeedPage(page + 1);
      }
      setHasMoreFeed(posts.length > 0);
    } catch {
      // Fallback to local cache
      const cached = await socialDb.getLocalPosts();
      setFeed(cached);
    } finally {
      setFeedLoading(false);
    }
  }, [isAuthenticated, feedPage]);

  const loadExplore = useCallback(async (tag = null) => {
    try {
      const data = await socialApi.getExploreFeed(1, tag);
      setExplore(data.posts || []);
    } catch {
      // offline: show public cached posts
      const cached = await socialDb.getLocalPosts(30);
      setExplore(cached.filter((p) => p.visibility === 'public'));
    }
  }, []);

  // ─── CREATE POST ───────────────────────────────────────────────────────

  const createPost = useCallback(async (postData) => {
    const tempId = `local_${Date.now()}`;
    const optimistic = {
      ...postData,
      id: tempId,
      user_id: user?.id,
      reaction_count: 0,
      comment_count: 0,
      is_synced: 0,
      created_at: new Date().toISOString(),
    };
    // Optimistic UI — show immediately
    setFeed((prev) => [optimistic, ...prev]);
    await socialDb.savePostLocal(optimistic);

    try {
      const serverPost = await socialApi.createPost(postData);
      await socialDb.deleteLocalPost(tempId);
      await socialDb.savePostLocal({ ...serverPost, is_synced: 1 });
      setFeed((prev) => prev.map((p) => p.id === tempId ? { ...serverPost, is_synced: 1 } : p));
      return serverPost;
    } catch {
      // Keep local draft — will sync later
      return optimistic;
    }
  }, [user?.id]);

  const deletePost = useCallback(async (postId) => {
    setFeed((prev) => prev.filter((p) => p.id !== postId));
    await socialDb.deleteLocalPost(postId);
    try { await socialApi.deletePost(postId); } catch { /* ignore */ }
  }, []);

  // ─── REACTIONS ─────────────────────────────────────────────────────────

  const toggleReaction = useCallback(async (postId, reactionType) => {
    if (!isAuthenticated || !user) return;
    const existing = await socialDb.getMyReaction(postId, user.id);
    if (existing) {
      await socialDb.removeReactionLocal(postId, user.id);
      setFeed((prev) => prev.map((p) =>
        p.id === postId ? { ...p, reaction_count: Math.max(0, p.reaction_count - 1), my_reaction: null } : p
      ));
      try { await socialApi.removeReaction(postId); } catch { /* ignore */ }
    } else {
      const reaction = { id: `r_${Date.now()}`, post_id: postId, user_id: user.id, reaction_type: reactionType };
      await socialDb.upsertReactionLocal(reaction);
      setFeed((prev) => prev.map((p) =>
        p.id === postId ? { ...p, reaction_count: p.reaction_count + 1, my_reaction: reactionType } : p
      ));
      try { await socialApi.reactToPost(postId, reactionType); } catch { /* ignore */ }
    }
  }, [isAuthenticated, user]);

  // ─── FOLLOW ────────────────────────────────────────────────────────────

  const followUser = useCallback(async (targetUserId) => {
    if (!isAuthenticated || !user) return;
    const follow = { id: `f_${Date.now()}`, follower_id: user.id, following_id: targetUserId, status: 'accepted' };
    await socialDb.upsertFollowLocal(follow);
    try { await socialApi.followUser(targetUserId); } catch { /* ignore */ }
  }, [isAuthenticated, user]);

  const unfollowUser = useCallback(async (targetUserId) => {
    if (!isAuthenticated || !user) return;
    await socialDb.removeFollowLocal(user.id, targetUserId);
    try { await socialApi.unfollowUser(targetUserId); } catch { /* ignore */ }
  }, [isAuthenticated, user]);

  const checkIsFollowing = useCallback(async (targetUserId) => {
    if (!user) return false;
    return socialDb.isFollowing(user.id, targetUserId);
  }, [user]);

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await socialApi.getNotifications();
      const notifs = data.notifications || [];
      for (const n of notifs) await socialDb.saveNotification(n);
      setNotifications(notifs);
      const count = notifs.filter((n) => !n.is_read).length;
      setUnreadCount(count);
    } catch {
      const cached = await socialDb.getNotifications();
      setNotifications(cached);
      const count = cached.filter((n) => !n.is_read).length;
      setUnreadCount(count);
    }
  }, [isAuthenticated]);

  const markAllRead = useCallback(async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    await socialDb.markAllNotificationsRead();
    try { await socialApi.markNotificationsRead(); } catch { /* ignore */ }
  }, []);

  return (
    <SocialContext.Provider value={{
      feed, explore,
      feedLoading, hasMoreFeed,
      loadFeed, loadExplore,
      createPost, deletePost,
      toggleReaction,
      followUser, unfollowUser, checkIsFollowing,
      notifications, unreadCount,
      loadNotifications, markAllRead,
    }}>
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used inside SocialProvider');
  return ctx;
}
