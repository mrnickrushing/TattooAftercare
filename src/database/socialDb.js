/**
 * socialDb.js — Local SQLite tables for social features.
 * These mirror the server-side data and act as an offline cache.
 */
import * as SQLite from 'expo-sqlite';

let db = null;

async function getDB() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('tattoo_aftercare.db');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
  return db;
}

/**
 * Run once at app start alongside initDB().
 * Uses IF NOT EXISTS so it's safe to call repeatedly.
 */
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
      created_at TEXT
    );

    -- ─── POSTS (Ink Journal) ─────────────────────────────────
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tattoo_id INTEGER,
      caption TEXT,
      photo_uris TEXT,           -- JSON array string
      style_tags TEXT,           -- JSON array string e.g. ["fineline","blackwork"]
      healing_day INTEGER,
      visibility TEXT DEFAULT 'friends',   -- 'public' | 'friends' | 'private'
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
      parent_comment_id TEXT,    -- NULL = top-level, TEXT = reply
      reaction_count INTEGER DEFAULT 0,
      is_synced INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── REACTIONS ───────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS post_reactions (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction_type TEXT NOT NULL,  -- 'fire' | 'love' | 'ink' | 'wow'
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id)
    );

    -- ─── FOLLOWS ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS follows (
      id TEXT PRIMARY KEY,
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      status TEXT DEFAULT 'accepted',  -- 'pending' | 'accepted'
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
      is_following INTEGER DEFAULT 0,
      cached_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── NOTIFICATIONS ───────────────────────────────────────
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,  -- 'follow' | 'comment' | 'reaction' | 'mention' | 'milestone'
      actor_id TEXT,
      actor_username TEXT,
      actor_avatar TEXT,
      entity_id TEXT,      -- post_id, comment_id, etc.
      body TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ─── HEALING MILESTONES ──────────────────────────────────
    CREATE TABLE IF NOT EXISTS healing_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tattoo_id INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      milestone_type TEXT NOT NULL,  -- 'day3' | 'day7' | 'day14' | 'day30' | 'healed'
      celebrated INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(tattoo_id, milestone_type)
    );

    -- ─── BADGES ──────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      badge_type TEXT NOT NULL,  -- '30_day_healer' | 'iron_skin' | 'ink_collector' | etc.
      earned_at TEXT DEFAULT (datetime('now')),
      UNIQUE(badge_type)
    );
  `);
}

// ─── POSTS ─────────────────────────────────────────────────────────────────

export async function savePostLocal(post) {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO posts
     (id, user_id, tattoo_id, caption, photo_uris, style_tags, healing_day, visibility,
      reaction_count, comment_count, is_synced, created_at, updated_at)
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
  return rows.map(deserializePost);
}

export async function getLocalPostsByUser(userId, limit = 30) {
  const database = await getDB();
  const rows = await database.getAllAsync(
    'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit]
  );
  return rows.map(deserializePost);
}

export async function deleteLocalPost(id) {
  const database = await getDB();
  await database.runAsync('DELETE FROM posts WHERE id = ?', [id]);
}

function deserializePost(row) {
  return {
    ...row,
    photo_uris: safeJSON(row.photo_uris, []),
    style_tags: safeJSON(row.style_tags, []),
  };
}

// ─── COMMENTS ──────────────────────────────────────────────────────────────

export async function saveCommentLocal(comment) {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO post_comments
     (id, post_id, user_id, username, avatar_uri, body, parent_comment_id, reaction_count, is_synced, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      comment.id, comment.post_id, comment.user_id,
      comment.username || null, comment.avatar_uri || null,
      comment.body, comment.parent_comment_id || null,
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
  );
}

export async function deleteCommentLocal(id) {
  const database = await getDB();
  await database.runAsync('DELETE FROM post_comments WHERE id = ?', [id]);
}

// ─── REACTIONS ─────────────────────────────────────────────────────────────

export async function upsertReactionLocal(reaction) {
  const database = await getDB();
  await database.runAsync(
    'INSERT OR REPLACE INTO post_reactions (id, post_id, user_id, reaction_type) VALUES (?,?,?,?)',
    [reaction.id, reaction.post_id, reaction.user_id, reaction.reaction_type]
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

// ─── FOLLOWS ───────────────────────────────────────────────────────────────

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
    'SELECT id FROM follows WHERE follower_id = ? AND following_id = ? AND status = "accepted"',
    [followerId, followingId]
  );
  return !!row;
}

// ─── USERS CACHE ───────────────────────────────────────────────────────────

export async function cacheUser(user) {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO users_cache
     (id, username, display_name, bio, avatar_uri, tattoo_count, follower_count, following_count, is_following)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      user.id, user.username, user.display_name || null,
      user.bio || null, user.avatar_uri || null,
      user.tattoo_count || 0, user.follower_count || 0,
      user.following_count || 0, user.is_following ? 1 : 0,
    ]
  );
}

export async function getCachedUser(id) {
  const database = await getDB();
  return await database.getFirstAsync('SELECT * FROM users_cache WHERE id = ?', [id]);
}

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────

export async function saveNotification(n) {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO notifications
     (id, type, actor_id, actor_username, actor_avatar, entity_id, body, is_read, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      n.id, n.type, n.actor_id || null, n.actor_username || null,
      n.actor_avatar || null, n.entity_id || null,
      n.body || null, n.is_read ? 1 : 0,
      n.created_at || new Date().toISOString(),
    ]
  );
}

export async function getNotifications(limit = 30) {
  const database = await getDB();
  return await database.getAllAsync(
    'SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
}

export async function markAllNotificationsRead() {
  const database = await getDB();
  await database.runAsync('UPDATE notifications SET is_read = 1');
}

export async function getUnreadNotificationCount() {
  const database = await getDB();
  const row = await database.getFirstAsync(
    'SELECT COUNT(*) as cnt FROM notifications WHERE is_read = 0'
  );
  return row?.cnt || 0;
}

// ─── MILESTONES ────────────────────────────────────────────────────────────

export async function checkAndSaveMilestone(tattooId, dayNumber) {
  const milestones = [
    { type: 'day3', day: 3 },
    { type: 'day7', day: 7 },
    { type: 'day14', day: 14 },
    { type: 'day30', day: 30 },
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
  );
}

export async function markMilestoneCelebrated(id) {
  const database = await getDB();
  await database.runAsync('UPDATE healing_milestones SET celebrated = 1 WHERE id = ?', [id]);
}

// ─── BADGES ────────────────────────────────────────────────────────────────

export const BADGE_TYPES = {
  DAY_HEALER_30: '30_day_healer',
  IRON_SKIN: 'iron_skin',       // 14-day streak
  INK_COLLECTOR: 'ink_collector', // 5+ tattoos
  STYLE_PASSPORT: 'style_passport', // 3+ different styles
  FRESH_INK: 'fresh_ink',       // first tattoo added
  DEDICATED: 'dedicated',       // 7-day streak
};

export const BADGE_META = {
  [BADGE_TYPES.FRESH_INK]:     { label: 'Fresh Ink',       icon: '💉', desc: 'Added your first tattoo' },
  [BADGE_TYPES.DEDICATED]:     { label: 'Dedicated',       icon: '🔥', desc: '7-day care streak' },
  [BADGE_TYPES.IRON_SKIN]:     { label: 'Iron Skin',       icon: '⚡', desc: '14-day care streak' },
  [BADGE_TYPES.DAY_HEALER_30]: { label: '30-Day Healer',   icon: '🏆', desc: 'Completed full healing cycle' },
  [BADGE_TYPES.INK_COLLECTOR]: { label: 'Ink Collector',   icon: '🎨', desc: 'Tracking 5+ tattoos' },
  [BADGE_TYPES.STYLE_PASSPORT]:{ label: 'Style Passport',  icon: '✈️', desc: '3+ different styles' },
};

export async function earnBadge(badgeType) {
  const database = await getDB();
  try {
    await database.runAsync(
      'INSERT INTO user_badges (badge_type) VALUES (?)',
      [badgeType]
    );
    return true; // newly earned
  } catch {
    return false; // already had it (UNIQUE constraint)
  }
}

export async function getUserBadges() {
  const database = await getDB();
  return await database.getAllAsync('SELECT * FROM user_badges ORDER BY earned_at DESC');
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function safeJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
