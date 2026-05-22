/**
 * socialDb.js — Local SQLite tables for social + gamification features.
 *
 * Schema (main-canonical table names):
 *   local_user, posts, post_comments, post_reactions,
 *   follows, users_cache, notifications, healing_milestones, user_badges
 *
 * Full export list:
 *   BADGE_TYPES, BADGE_META
 *   initSocialDB
 *   --- Local user ---
 *   getLocalUser, getCurrentUser (alias), saveLocalUser
 *   --- Posts ---
 *   savePostLocal, getLocalPosts, getLocalPostsByUser,
 *   addPost, deletePost / deleteLocalPost (alias)
 *   --- Comments ---
 *   saveCommentLocal, getCommentsForPost,
 *   addComment, deleteComment / deleteCommentLocal (alias)
 *   --- Reactions ---
 *   upsertReactionLocal, removeReactionLocal, getMyReaction,
 *   addReaction, removeReaction
 *   --- Follows ---
 *   upsertFollowLocal, removeFollowLocal, isFollowing,
 *   followUser, unfollowUser
 *   --- Users cache ---
 *   cacheUser, getCachedUser
 *   --- Notifications ---
 *   saveNotification, getNotifications, getUnreadNotificationCount,
 *   markAllNotificationsRead, createNotification, markNotificationRead
 *   --- Milestones ---
 *   checkAndSaveMilestone, getUncelebratedMilestones, markMilestoneCelebrated
 *   --- Badges ---
 *   earnBadge, getUserBadges, getEarnedBadges (alias)
 */
import * as SQLite from 'expo-sqlite';

let _db = null;

async function getDB() {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('tattoo_aftercare.db');
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await _db.execAsync('PRAGMA foreign_keys = ON;');
  return _db;
}

// ─── Badge constants ────────────────────────────────────────────────────────

export const BADGE_TYPES = {
  FRESH_INK:      'fresh_ink',
  DEDICATED:      'dedicated',
  IRON_SKIN:      'iron_skin',
  DAY_HEALER_30:  '30_day_healer',
  INK_COLLECTOR:  'ink_collector',
  STYLE_PASSPORT: 'style_passport',
};

export const BADGE_META = {
  [BADGE_TYPES.FRESH_INK]:      { icon: '💉', label: 'Fresh Ink',      desc: 'Added your first tattoo' },
  [BADGE_TYPES.DEDICATED]:      { icon: '🔥', label: 'Dedicated',      desc: '7-day care streak' },
  [BADGE_TYPES.IRON_SKIN]:      { icon: '⚡', label: 'Iron Skin',      desc: '14-day care streak' },
  [BADGE_TYPES.DAY_HEALER_30]:  { icon: '🏆', label: '30-Day Healer',  desc: 'Completed full healing cycle' },
  [BADGE_TYPES.INK_COLLECTOR]:  { icon: '🎨', label: 'Ink Collector',  desc: 'Tracking 5+ tattoos' },
  [BADGE_TYPES.STYLE_PASSPORT]: { icon: '✈️', label: 'Style Passport', desc: '3+ different styles' },
};

// ─── Schema init ─────────────────────────────────────────────────────────────

export async function initSocialDB() {
  const database = await getDB();
  await database.execAsync(`
    -- ─── AUTH ───────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS local_user (
      id TEXT PRIMARY KEY,
      username TEXT,
      display_name TEXT,
      bio TEXT,
      avatar_uri TEXT,
      tattoo_count INTEGER DEFAULT 0,
      follower_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      care_streak INTEGER DEFAULT 0,
      total_care_logs INTEGER DEFAULT 0,
      badges_earned INTEGER DEFAULT 0,
      created_at TEXT
    );

    -- ─── POSTS (Ink Journal) ─────────────────────────────────
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tattoo_id INTEGER,
      caption TEXT,
      photo_uris TEXT,
      style_tags TEXT,
      healing_day INTEGER,
      visibility TEXT DEFAULT 'friends',
      reaction_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      is_synced INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── COMMENTS ────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS post_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT,
      avatar_uri TEXT,
      body TEXT NOT NULL,
      parent_comment_id TEXT,
      reaction_count INTEGER DEFAULT 0,
      is_synced INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── REACTIONS ───────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS post_reactions (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction_type TEXT NOT NULL DEFAULT 'love',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id)
    );

    -- ─── FOLLOWS ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS follows (
      id TEXT PRIMARY KEY,
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      status TEXT DEFAULT 'accepted',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(follower_id, following_id)
    );

    -- ─── USERS CACHE ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users_cache (
      id TEXT PRIMARY KEY,
      username TEXT,
      display_name TEXT,
      bio TEXT,
      avatar_uri TEXT,
      tattoo_count INTEGER DEFAULT 0,
      follower_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      care_streak INTEGER DEFAULT 0,
      is_following INTEGER DEFAULT 0,
      cached_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── NOTIFICATIONS ───────────────────────────────────────
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      actor_id TEXT,
      actor_username TEXT,
      actor_avatar TEXT,
      entity_id TEXT,
      body TEXT,
      user_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── HEALING MILESTONES ──────────────────────────────────
    CREATE TABLE IF NOT EXISTS healing_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tattoo_id INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      milestone_type TEXT NOT NULL,
      celebrated INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(tattoo_id, milestone_type)
    );

    -- ─── BADGES ──────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_badges (
      id TEXT,
      user_id TEXT,
      badge_type TEXT NOT NULL,
      earned_at TEXT DEFAULT (datetime('now')),
      UNIQUE(badge_type)
    );
  `);
}

// ─── Local user ──────────────────────────────────────────────────────────────

export async function getLocalUser() {
  const database = await getDB();
  return await database.getFirstAsync('SELECT * FROM local_user LIMIT 1');
}

/** Alias used by UserProfileScreen and phase-5 screens */
export const getCurrentUser = getLocalUser;

export async function saveLocalUser(user) {
  const database = await getDB();
  const toSave = {
    id: user.id || `local-${Date.now()}`,
    username: user.username || '',
    display_name: user.display_name || null,
    bio: user.bio || null,
    avatar_uri: user.avatar_uri || null,
    tattoo_count: user.tattoo_count || 0,
    follower_count: user.follower_count || 0,
    following_count: user.following_count || 0,
    care_streak: user.care_streak || 0,
    total_care_logs: user.total_care_logs || 0,
    badges_earned: user.badges_earned || 0,
    created_at: user.created_at || new Date().toISOString(),
  };
  await database.runAsync(
    `INSERT INTO local_user
       (id, username, display_name, bio, avatar_uri,
        tattoo_count, follower_count, following_count,
        care_streak, total_care_logs, badges_earned, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       username = excluded.username,
       display_name = excluded.display_name,
       bio = excluded.bio,
       avatar_uri = excluded.avatar_uri,
       tattoo_count = excluded.tattoo_count,
       follower_count = excluded.follower_count,
       following_count = excluded.following_count,
       care_streak = excluded.care_streak,
       total_care_logs = excluded.total_care_logs,
       badges_earned = excluded.badges_earned`,
    [
      toSave.id, toSave.username, toSave.display_name, toSave.bio,
      toSave.avatar_uri, toSave.tattoo_count, toSave.follower_count,
      toSave.following_count, toSave.care_streak, toSave.total_care_logs,
      toSave.badges_earned, toSave.created_at,
    ]
  );
  return toSave;
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export async function savePostLocal(post) {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO posts
     (id, user_id, tattoo_id, caption, photo_uris, style_tags, healing_day,
      visibility, reaction_count, comment_count, is_synced, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      post.id, post.user_id, post.tattoo_id || null,
      post.caption || null,
      JSON.stringify(post.photo_uris || []),
      JSON.stringify(post.style_tags || []),
      post.healing_day || null, post.visibility || 'friends',
      post.reaction_count || 0, post.comment_count || 0,
      post.is_synced ? 1 : 0,
      post.created_at || new Date().toISOString(),
      post.updated_at || new Date().toISOString(),
    ]
  );
}

export async function getLocalPosts(limit = 30, offset = 0) {
  const database = await getDB();
  const rows = await database.getAllAsync(
    'SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return (rows || []).map(deserializePost);
}

export async function getLocalPostsByUser(userId, limit = 30) {
  const database = await getDB();
  const rows = await database.getAllAsync(
    'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit]
  );
  return (rows || []).map(deserializePost);
}

/** Phase-5 alias — adds a new post row */
export async function addPost({ userId, tattooId, caption, photoUris, healingDay, visibility = 'friends' }) {
  const id = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await savePostLocal({
    id, user_id: userId, tattoo_id: tattooId,
    caption, photo_uris: photoUris, healing_day: healingDay, visibility,
  });
  return id;
}

export async function deleteLocalPost(id) {
  const database = await getDB();
  await database.runAsync('DELETE FROM posts WHERE id = ?', [id]);
}

/** Alias for phase-5 screens */
export const deletePost = deleteLocalPost;

function deserializePost(row) {
  return {
    ...row,
    photo_uris: safeJSON(row.photo_uris, []),
    style_tags: safeJSON(row.style_tags, []),
  };
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function saveCommentLocal(comment) {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO post_comments
     (id, post_id, user_id, username, avatar_uri, body,
      parent_comment_id, reaction_count, is_synced, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      comment.id, comment.post_id, comment.user_id,
      comment.username || null, comment.avatar_uri || null,
      comment.body, comment.parent_comment_id || comment.parent_id || null,
      comment.reaction_count || 0, comment.is_synced ? 1 : 0,
      comment.created_at || new Date().toISOString(),
    ]
  );
}

export async function getCommentsForPost(postId) {
  const database = await getDB();
  return await database.getAllAsync(
    'SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC',
    [postId]
  ) || [];
}

/** Phase-5 alias — saves a new comment */
export async function addComment({ postId, userId, body, parentId = null }) {
  const id = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await saveCommentLocal({ id, post_id: postId, user_id: userId, body, parent_comment_id: parentId });
  return id;
}

export async function deleteCommentLocal(id) {
  const database = await getDB();
  await database.runAsync('DELETE FROM post_comments WHERE id = ?', [id]);
}

/** Alias */
export const deleteComment = deleteCommentLocal;

// ─── Reactions ───────────────────────────────────────────────────────────────

export async function upsertReactionLocal(reaction) {
  const database = await getDB();
  await database.runAsync(
    'INSERT OR REPLACE INTO post_reactions (id, post_id, user_id, reaction_type) VALUES (?,?,?,?)',
    [reaction.id, reaction.post_id, reaction.user_id, reaction.reaction_type || 'love']
  );
}

export async function removeReactionLocal(postId, userId) {
  const database = await getDB();
  await database.runAsync(
    'DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?',
    [postId, userId]
  );
}

export async function getMyReaction(postId, userId) {
  const database = await getDB();
  return await database.getFirstAsync(
    'SELECT * FROM post_reactions WHERE post_id = ? AND user_id = ?',
    [postId, userId]
  );
}

/** Phase-5 aliases */
export async function addReaction(postId, userId, emoji = 'love') {
  const id = `rxn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await upsertReactionLocal({ id, post_id: postId, user_id: userId, reaction_type: emoji });
}
export const removeReaction = removeReactionLocal;

// ─── Follows ─────────────────────────────────────────────────────────────────

export async function upsertFollowLocal(follow) {
  const database = await getDB();
  await database.runAsync(
    'INSERT OR REPLACE INTO follows (id, follower_id, following_id, status) VALUES (?,?,?,?)',
    [follow.id, follow.follower_id, follow.following_id, follow.status || 'accepted']
  );
}

export async function removeFollowLocal(followerId, followingId) {
  const database = await getDB();
  await database.runAsync(
    'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
    [followerId, followingId]
  );
}

export async function isFollowing(followerId, followingId) {
  const database = await getDB();
  const row = await database.getFirstAsync(
    'SELECT id FROM follows WHERE follower_id = ? AND following_id = ? AND status = "accepted" LIMIT 1',
    [followerId, followingId]
  );
  return !!row;
}

/** Phase-5 named helpers */
export async function followUser(followerId, followingId) {
  const id = `follow_${followerId}_${followingId}`;
  await upsertFollowLocal({ id, follower_id: followerId, following_id: followingId });
  // bump local_user counts if follower is local
  const database = await getDB();
  await database.runAsync(
    'UPDATE local_user SET following_count = following_count + 1 WHERE id = ?',
    [followerId]
  );
  await database.runAsync(
    'UPDATE users_cache SET follower_count = follower_count + 1 WHERE id = ?',
    [followingId]
  );
}

export async function unfollowUser(followerId, followingId) {
  await removeFollowLocal(followerId, followingId);
  const database = await getDB();
  await database.runAsync(
    'UPDATE local_user SET following_count = MAX(0, following_count - 1) WHERE id = ?',
    [followerId]
  );
  await database.runAsync(
    'UPDATE users_cache SET follower_count = MAX(0, follower_count - 1) WHERE id = ?',
    [followingId]
  );
}

// ─── Users cache ─────────────────────────────────────────────────────────────

export async function cacheUser(user) {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO users_cache
     (id, username, display_name, bio, avatar_uri,
      tattoo_count, follower_count, following_count, care_streak, is_following)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      user.id, user.username, user.display_name || null,
      user.bio || null, user.avatar_uri || null,
      user.tattoo_count || 0, user.follower_count || 0,
      user.following_count || 0, user.care_streak || 0,
      user.is_following ? 1 : 0,
    ]
  );
}

export async function getCachedUser(id) {
  const database = await getDB();
  return await database.getFirstAsync('SELECT * FROM users_cache WHERE id = ?', [id]);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function saveNotification(n) {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO notifications
     (id, type, actor_id, actor_username, actor_avatar,
      entity_id, body, user_id, is_read, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      n.id, n.type, n.actor_id || null, n.actor_username || null,
      n.actor_avatar || null, n.entity_id || null,
      n.body || null, n.user_id || null, n.is_read ? 1 : 0,
      n.created_at || new Date().toISOString(),
    ]
  );
}

export async function getNotifications(userIdOrLimit, limit = 30) {
  const database = await getDB();
  // Support both calling conventions:
  // getNotifications(limit)  — original main signature
  // getNotifications(userId, limit) — phase-5 signature
  if (typeof userIdOrLimit === 'number') {
    return await database.getAllAsync(
      'SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?',
      [userIdOrLimit]
    ) || [];
  }
  return await database.getAllAsync(
    'SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT ?',
    [userIdOrLimit, limit]
  ) || [];
}

export async function getUnreadNotificationCount() {
  const database = await getDB();
  const row = await database.getFirstAsync(
    'SELECT COUNT(*) as cnt FROM notifications WHERE is_read = 0'
  );
  return row?.cnt || 0;
}

export async function markAllNotificationsRead(userId) {
  const database = await getDB();
  if (userId) {
    await database.runAsync(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id IS NULL',
      [userId]
    );
  } else {
    await database.runAsync('UPDATE notifications SET is_read = 1');
  }
}

/** Phase-5 create helper */
export async function createNotification({ userId, type, actorId, refId, body }) {
  const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await saveNotification({
    id, type, actor_id: actorId, entity_id: refId,
    body, user_id: userId,
  });
  return id;
}

export async function markNotificationRead(notificationId) {
  const database = await getDB();
  await database.runAsync('UPDATE notifications SET is_read = 1 WHERE id = ?', [notificationId]);
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function checkAndSaveMilestone(tattooId, dayNumber) {
  const milestones = [
    { type: 'day3',   day: 3 },
    { type: 'day7',   day: 7 },
    { type: 'day14',  day: 14 },
    { type: 'day30',  day: 30 },
    { type: 'healed', day: 28 },
  ];
  const database = await getDB();
  const earned = [];
  for (const m of milestones) {
    if (dayNumber >= m.day) {
      const existing = await database.getFirstAsync(
        'SELECT id FROM healing_milestones WHERE tattoo_id = ? AND milestone_type = ?',
        [tattooId, m.type]
      );
      if (!existing) {
        await database.runAsync(
          'INSERT INTO healing_milestones (tattoo_id, day_number, milestone_type) VALUES (?,?,?)',
          [tattooId, dayNumber, m.type]
        );
        earned.push(m.type);
      }
    }
  }
  return earned;
}

export async function getUncelebratedMilestones(tattooId) {
  const database = await getDB();
  return await database.getAllAsync(
    'SELECT * FROM healing_milestones WHERE tattoo_id = ? AND celebrated = 0',
    [tattooId]
  ) || [];
}

export async function markMilestoneCelebrated(id) {
  const database = await getDB();
  await database.runAsync('UPDATE healing_milestones SET celebrated = 1 WHERE id = ?', [id]);
}

// ─── Badges ──────────────────────────────────────────────────────────────────

/**
 * earnBadge supports both call signatures:
 *   earnBadge(badgeType)           — original (local user, no userId)
 *   earnBadge(userId, badgeType)   — phase-5 (user-scoped)
 */
export async function earnBadge(userIdOrBadgeType, maybeBadgeType) {
  const database = await getDB();
  let badgeType, userId;
  if (maybeBadgeType === undefined) {
    badgeType = userIdOrBadgeType;
    userId = null;
  } else {
    userId = userIdOrBadgeType;
    badgeType = maybeBadgeType;
  }
  try {
    const id = userId ? `badge_${userId}_${badgeType}` : `badge_local_${badgeType}`;
    await database.runAsync(
      'INSERT INTO user_badges (id, user_id, badge_type) VALUES (?,?,?)',
      [id, userId, badgeType]
    );
    return true;
  } catch {
    return false; // UNIQUE constraint = already earned
  }
}

export async function getUserBadges(userId) {
  const database = await getDB();
  if (userId) {
    return await database.getAllAsync(
      'SELECT * FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC',
      [userId]
    ) || [];
  }
  return await database.getAllAsync(
    'SELECT * FROM user_badges ORDER BY earned_at DESC'
  ) || [];
}

/** Alias used by BadgeCabinetScreen */
export const getEarnedBadges = getUserBadges;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function safeJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
