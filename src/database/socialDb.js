/**
 * socialDb.js  —  Phase 3 / 4 / 5 social layer
 *
 * Tables owned here:
 *   users, tattoo_posts, post_reactions, post_comments,
 *   follow_relationships, user_badges, notifications, tattoo_milestones
 *
 * Exports (alphabetical):
 *   BADGE_META, BADGE_TYPES
 *   addComment, addPost, addReaction
 *   checkAndSaveMilestone
 *   createNotification
 *   deleteComment, deletePost
 *   earnBadge
 *   followUser, unfollowUser, isFollowing
 *   getEarnedBadges (alias: getUserBadges)
 *   getLocalPostsByUser
 *   getLocalUser, saveLocalUser
 *   getCurrentUser
 *   getNotifications, markNotificationRead, markAllNotificationsRead
 *   getUncelebratedMilestones, markMilestoneCelebrated
 *   initSocialDB
 *   removeReaction
 */
import { getDatabase } from './database';

// ─── Badge constants ─────────────────────────────────────────────────────────

export const BADGE_TYPES = {
  FIRST_TATTOO:   'first_tattoo',
  WEEK_WARRIOR:   'week_warrior',
  STREAK_7:       'streak_7',
  STREAK_30:      'streak_30',
  COLLECTOR:      'collector',
  STYLE_PASSPORT: 'style_passport',
};

export const BADGE_META = {
  [BADGE_TYPES.FIRST_TATTOO]:   { icon: '💉', label: 'First Ink',       desc: 'Added your first tattoo' },
  [BADGE_TYPES.WEEK_WARRIOR]:   { icon: '🗓️', label: 'Week Warrior',    desc: 'Logged care for 7 consecutive days' },
  [BADGE_TYPES.STREAK_7]:       { icon: '🔥', label: '7-Day Streak',    desc: 'Maintained a 7-day care streak' },
  [BADGE_TYPES.STREAK_30]:      { icon: '⚡', label: '30-Day Streak',   desc: 'Maintained a 30-day care streak' },
  [BADGE_TYPES.COLLECTOR]:      { icon: '🏆', label: 'Collector',       desc: 'Added 5 or more tattoos' },
  [BADGE_TYPES.STYLE_PASSPORT]: { icon: '🗺️', label: 'Style Passport',  desc: 'Collected 3 different tattoo styles' },
};

// ─── Schema init ──────────────────────────────────────────────────────────────

export async function initSocialDB() {
  const db = await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id   TEXT PRIMARY KEY,
      username          TEXT,
      display_name      TEXT,
      bio               TEXT,
      avatar_uri        TEXT,
      care_streak       INTEGER DEFAULT 0,
      total_care_logs   INTEGER DEFAULT 0,
      badges_earned     INTEGER DEFAULT 0,
      follower_count    INTEGER DEFAULT 0,
      following_count   INTEGER DEFAULT 0,
      is_local_user     INTEGER DEFAULT 0,
      created_at        TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tattoo_posts (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      tattoo_id   INTEGER,
      caption     TEXT,
      photo_uris  TEXT,
      healing_day INTEGER,
      visibility  TEXT DEFAULT 'public',
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS post_reactions (
      id         TEXT PRIMARY KEY,
      post_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      emoji      TEXT NOT NULL DEFAULT '❤️',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS post_comments (
      id          TEXT PRIMARY KEY,
      post_id     TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      parent_id   TEXT,
      body        TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS follow_relationships (
      follower_id  TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at   TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (follower_id, following_id)
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      badge_type TEXT NOT NULL,
      earned_at  TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, badge_type)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      type       TEXT NOT NULL,
      actor_id   TEXT,
      ref_id     TEXT,
      body       TEXT,
      is_read    INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tattoo_milestones (
      id           TEXT PRIMARY KEY,
      tattoo_id    INTEGER NOT NULL,
      day          INTEGER NOT NULL,
      celebrated   INTEGER DEFAULT 0,
      triggered_at TEXT DEFAULT (datetime('now')),
      UNIQUE(tattoo_id, day)
    );
  `);
}

// ─── Local user (single-device profile) ──────────────────────────────────────

export async function getLocalUser() {
  try {
    const db = await getDatabase();
    await initSocialDB();
    return await db.getFirstAsync('SELECT * FROM users WHERE is_local_user = 1 LIMIT 1');
  } catch (e) {
    console.error('getLocalUser:', e);
    return null;
  }
}

// alias used by UserProfileScreen
export const getCurrentUser = getLocalUser;

export async function saveLocalUser(data) {
  try {
    const db = await getDatabase();
    await initSocialDB();
    const id = data.id || `local_${Date.now()}`;
    await db.runAsync(
      `INSERT INTO users
         (id, username, display_name, bio, avatar_uri,
          care_streak, total_care_logs, badges_earned,
          follower_count, following_count, is_local_user)
       VALUES (?,?,?,?,?,?,?,?,?,?,1)
       ON CONFLICT(id) DO UPDATE SET
         username = excluded.username,
         display_name = excluded.display_name,
         bio = excluded.bio,
         avatar_uri = excluded.avatar_uri,
         care_streak = excluded.care_streak,
         total_care_logs = excluded.total_care_logs,
         badges_earned = excluded.badges_earned,
         follower_count = excluded.follower_count,
         following_count = excluded.following_count`,
      [
        id,
        data.username || null,
        data.display_name || null,
        data.bio || null,
        data.avatar_uri || null,
        data.care_streak || 0,
        data.total_care_logs || 0,
        data.badges_earned || 0,
        data.follower_count || 0,
        data.following_count || 0,
      ]
    );
    return { ...data, id };
  } catch (e) {
    console.error('saveLocalUser:', e);
    return data;
  }
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function getLocalPostsByUser(userId) {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync(
      `SELECT p.*, t.name AS tattoo_name, t.style, t.body_part
       FROM tattoo_posts p
       LEFT JOIN tattoos t ON p.tattoo_id = t.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
      [userId]
    );
    return (rows || []).map((r) => ({
      ...r,
      photo_uris: r.photo_uris
        ? (typeof r.photo_uris === 'string' ? JSON.parse(r.photo_uris) : r.photo_uris)
        : [],
    }));
  } catch (e) {
    console.error('getLocalPostsByUser:', e);
    return [];
  }
}

export async function addPost({ userId, tattooId, caption, photoUris, healingDay, visibility = 'public' }) {
  try {
    const db = await getDatabase();
    const id = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await db.runAsync(
      `INSERT INTO tattoo_posts (id, user_id, tattoo_id, caption, photo_uris, healing_day, visibility)
       VALUES (?,?,?,?,?,?,?)`,
      [id, userId, tattooId || null, caption || null,
       JSON.stringify(photoUris || []), healingDay || null, visibility]
    );
    return id;
  } catch (e) {
    console.error('addPost:', e);
    return null;
  }
}

export async function deletePost(postId) {
  try {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM tattoo_posts WHERE id = ?', [postId]);
  } catch (e) {
    console.error('deletePost:', e);
  }
}

// ─── Reactions ────────────────────────────────────────────────────────────────

export async function addReaction(postId, userId, emoji = '❤️') {
  try {
    const db = await getDatabase();
    const id = `rxn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await db.runAsync(
      `INSERT OR REPLACE INTO post_reactions (id, post_id, user_id, emoji) VALUES (?,?,?,?)`,
      [id, postId, userId, emoji]
    );
  } catch (e) {
    console.error('addReaction:', e);
  }
}

export async function removeReaction(postId, userId) {
  try {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?',
      [postId, userId]
    );
  } catch (e) {
    console.error('removeReaction:', e);
  }
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function addComment({ postId, userId, body, parentId = null }) {
  try {
    const db = await getDatabase();
    const id = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await db.runAsync(
      `INSERT INTO post_comments (id, post_id, user_id, parent_id, body) VALUES (?,?,?,?,?)`,
      [id, postId, userId, parentId, body]
    );
    return id;
  } catch (e) {
    console.error('addComment:', e);
    return null;
  }
}

export async function deleteComment(commentId) {
  try {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM post_comments WHERE id = ?', [commentId]);
  } catch (e) {
    console.error('deleteComment:', e);
  }
}

// ─── Follows ─────────────────────────────────────────────────────────────────

export async function followUser(followerId, followingId) {
  try {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR IGNORE INTO follow_relationships (follower_id, following_id) VALUES (?,?)`,
      [followerId, followingId]
    );
    await db.runAsync(
      'UPDATE users SET following_count = following_count + 1 WHERE id = ?',
      [followerId]
    );
    await db.runAsync(
      'UPDATE users SET follower_count = follower_count + 1 WHERE id = ?',
      [followingId]
    );
  } catch (e) {
    console.error('followUser:', e);
  }
}

export async function unfollowUser(followerId, followingId) {
  try {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM follow_relationships WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );
    await db.runAsync(
      'UPDATE users SET following_count = MAX(0, following_count - 1) WHERE id = ?',
      [followerId]
    );
    await db.runAsync(
      'UPDATE users SET follower_count = MAX(0, follower_count - 1) WHERE id = ?',
      [followingId]
    );
  } catch (e) {
    console.error('unfollowUser:', e);
  }
}

export async function isFollowing(followerId, followingId) {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      'SELECT 1 FROM follow_relationships WHERE follower_id = ? AND following_id = ? LIMIT 1',
      [followerId, followingId]
    );
    return !!row;
  } catch (e) {
    return false;
  }
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export async function earnBadge(userId, badgeType) {
  try {
    const db = await getDatabase();
    const id = `badge_${userId}_${badgeType}`;
    await db.runAsync(
      `INSERT OR IGNORE INTO user_badges (id, user_id, badge_type) VALUES (?,?,?)`,
      [id, userId, badgeType]
    );
    // bump counter if actually inserted (changes > 0)
    const changes = await db.getFirstAsync('SELECT changes() AS c');
    if (changes?.c > 0) {
      await db.runAsync(
        'UPDATE users SET badges_earned = badges_earned + 1 WHERE id = ?',
        [userId]
      );
    }
    return changes?.c > 0;
  } catch (e) {
    console.error('earnBadge:', e);
    return false;
  }
}

export async function getUserBadges(userId) {
  try {
    const db = await getDatabase();
    // if no userId, fetch for local user
    let uid = userId;
    if (!uid) {
      const u = await getLocalUser();
      uid = u?.id;
    }
    if (!uid) return [];
    return await db.getAllAsync(
      'SELECT * FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC',
      [uid]
    ) || [];
  } catch (e) {
    console.error('getUserBadges:', e);
    return [];
  }
}

// alias used by BadgeCabinetScreen
export const getEarnedBadges = getUserBadges;

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification({ userId, type, actorId, refId, body }) {
  try {
    const db = await getDatabase();
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await db.runAsync(
      `INSERT INTO notifications (id, user_id, type, actor_id, ref_id, body)
       VALUES (?,?,?,?,?,?)`,
      [id, userId, type, actorId || null, refId || null, body || null]
    );
    return id;
  } catch (e) {
    console.error('createNotification:', e);
    return null;
  }
}

export async function getNotifications(userId, limit = 50) {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    ) || [];
  } catch (e) {
    console.error('getNotifications:', e);
    return [];
  }
}

export async function markNotificationRead(notificationId) {
  try {
    const db = await getDatabase();
    await db.runAsync('UPDATE notifications SET is_read = 1 WHERE id = ?', [notificationId]);
  } catch (e) {
    console.error('markNotificationRead:', e);
  }
}

export async function markAllNotificationsRead(userId) {
  try {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [userId]
    );
  } catch (e) {
    console.error('markAllNotificationsRead:', e);
  }
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function checkAndSaveMilestone(tattooId, dayNumber) {
  try {
    const MILESTONE_DAYS = [3, 7, 14, 30];
    if (!MILESTONE_DAYS.includes(dayNumber)) return false;
    const db = await getDatabase();
    const id = `milestone_${tattooId}_${dayNumber}`;
    await db.runAsync(
      `INSERT OR IGNORE INTO tattoo_milestones (id, tattoo_id, day) VALUES (?,?,?)`,
      [id, tattooId, dayNumber]
    );
    const changes = await db.getFirstAsync('SELECT changes() AS c');
    return (changes?.c || 0) > 0;
  } catch (e) {
    console.error('checkAndSaveMilestone:', e);
    return false;
  }
}

export async function getUncelebratedMilestones(tattooId) {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      'SELECT * FROM tattoo_milestones WHERE tattoo_id = ? AND celebrated = 0 ORDER BY day ASC',
      [tattooId]
    ) || [];
  } catch (e) {
    console.error('getUncelebratedMilestones:', e);
    return [];
  }
}

export async function markMilestoneCelebrated(milestoneId) {
  try {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE tattoo_milestones SET celebrated = 1 WHERE id = ?',
      [milestoneId]
    );
  } catch (e) {
    console.error('markMilestoneCelebrated:', e);
  }
}
