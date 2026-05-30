/**
 * exploreDb.js
 * SQLite helpers for Explore feed, artist profiles, and leaderboard queries.
 * Read focused. Writes go through socialDb.
 */
import { getDB } from './db';

function normalizeStyle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/neo\s*traditional/g, 'neotrad')
    .replace(/new\s*school/g, 'newschool')
    .replace(/old\s*school/g, 'oldschool')
    .replace(/fine\s*line/g, 'fineline')
    .replace(/[^a-z0-9]/g, '');
}

const BODY_PART_MATCHES = {
  arm: ['arm', 'bicep', 'forearm', 'wrist'],
  forearm: ['forearm'],
  chest: ['chest'],
  back: ['back'],
  leg: ['leg', 'thigh', 'calf'],
  calf: ['calf'],
  ankle: ['ankle'],
  neck: ['neck'],
  hand: ['hand', 'wrist', 'finger'],
  finger: ['finger'],
  rib: ['rib', 'ribs'],
  shoulder: ['shoulder'],
  thigh: ['thigh'],
  foot: ['foot'],
  head: ['head', 'face'],
  sleeve: ['sleeve'],
};

/**
 * Get public posts filtered by optional style and body part.
 */
export async function getExplorePosts({ style, bodyPart, limit = 30, offset = 0 } = {}) {
  try {
    const db = await getDB();
    let query = `
      SELECT p.*,
             u.username, u.avatar_uri, u.display_name,
             t.name AS tattoo_name, t.style, t.placement AS body_part, t.artist_name
      FROM posts p
      LEFT JOIN users_cache u ON p.user_id = u.id
      LEFT JOIN tattoos t ON p.tattoo_id = t.id
      WHERE p.visibility = 'public'
    `;
    const args = [];

    if (style) {
      query += ` AND LOWER(REPLACE(REPLACE(REPLACE(COALESCE(t.style, ''), '-', ''), ' ', ''), '/', '')) = ?`;
      args.push(normalizeStyle(style));
    }

    if (bodyPart) {
      const matches = BODY_PART_MATCHES[bodyPart] || [bodyPart];
      query += ` AND (${matches.map(() => 'LOWER(COALESCE(t.placement, \'\')) LIKE ?').join(' OR ')})`;
      matches.forEach((part) => args.push(`%${part.toLowerCase()}%`));
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);
    return await db.getAllAsync(query, args) || [];
  } catch (e) {
    console.error('getExplorePosts:', e);
    return [];
  }
}

/**
 * Deduplicated list of all artist names tagged by users.
 */
export async function getAllArtistNames() {
  try {
    const db = await getDB();
    const result = await db.getAllAsync(
      `SELECT DISTINCT artist_name FROM tattoos
       WHERE artist_name IS NOT NULL AND artist_name != ''
       ORDER BY artist_name ASC`
    );
    return (result || []).map((r) => r.artist_name);
  } catch (e) {
    console.error('getAllArtistNames:', e);
    return [];
  }
}

/**
 * All tattoos and public posts tagged with a given artist name.
 */
export async function getArtistData(artistName) {
  try {
    const db = await getDB();
    const tattoos = await db.getAllAsync(
      `SELECT t.*, u.username, u.display_name
       FROM tattoos t
       LEFT JOIN users_cache u ON t.user_id = u.id
       WHERE t.artist_name = ?
       ORDER BY t.date_tattooed DESC`,
      [artistName]
    );
    const posts = await db.getAllAsync(
      `SELECT p.*, u.username, u.avatar_uri,
              t.name AS tattoo_name, t.style, t.placement AS body_part
       FROM posts p
       LEFT JOIN users_cache u ON p.user_id = u.id
       LEFT JOIN tattoos t ON p.tattoo_id = t.id
       WHERE t.artist_name = ? AND p.visibility = 'public'
       ORDER BY p.created_at DESC`,
      [artistName]
    );
    const styleBreakdown = (tattoos || []).reduce((acc, t) => {
      if (t.style) acc[t.style] = (acc[t.style] || 0) + 1;
      return acc;
    }, {});
    const instagramHandle = (tattoos || []).find((t) => t.artist_instagram)?.artist_instagram || null;
    return {
      artistName,
      tattoos: tattoos || [],
      posts: posts || [],
      styleBreakdown,
      totalWorks: (tattoos || []).length,
      instagramHandle,
    };
  } catch (e) {
    console.error('getArtistData:', e);
    return { artistName, tattoos: [], posts: [], styleBreakdown: {}, totalWorks: 0 };
  }
}

/**
 * Friends leaderboard ranked by care streak.
 */
export async function getFriendsLeaderboard(currentUserId) {
  try {
    const db = await getDB();
    const followRows = await db.getAllAsync(
      'SELECT following_id FROM follows WHERE follower_id = ? AND status = "accepted"',
      [currentUserId]
    );
    const followedIds = (followRows || []).map((f) => f.following_id);

    const self = await db.getFirstAsync('SELECT * FROM local_user LIMIT 1');
    const friends = followedIds.length > 0
      ? await db.getAllAsync(
          `SELECT * FROM users_cache WHERE id IN (${followedIds.map(() => '?').join(',')})`,
          followedIds
        )
      : [];

    const all = [
      ...(self ? [{ ...self, isCurrentUser: true }] : []),
      ...(friends || []).map((u) => ({ ...u, isCurrentUser: false })),
    ].sort((a, b) => (b.care_streak || 0) - (a.care_streak || 0));

    return all.map((u, i) => ({ ...u, rank: i + 1 }));
  } catch (e) {
    console.error('getFriendsLeaderboard:', e);
    return [];
  }
}

/**
 * Style distribution for the current user.
 */
export async function getUserStylePassport(userId) {
  try {
    const db = await getDB();
    const result = await db.getAllAsync(
      `SELECT style, COUNT(*) AS count FROM tattoos
       WHERE user_id = ? AND style IS NOT NULL AND style != ''
       GROUP BY style ORDER BY count DESC`,
      [userId]
    );
    return result || [];
  } catch (e) {
    console.error('getUserStylePassport:', e);
    return [];
  }
}

/**
 * Get trending posts by reaction count and recency.
 */
export async function getTrendingPosts({ limit = 8 } = {}) {
  try {
    const db = await getDB();
    const results = await db.getAllAsync(
      `SELECT p.*, u.username, u.avatar_uri, u.display_name,
              t.name AS tattoo_name, t.style, t.placement AS body_part, t.artist_name
       FROM posts p
       LEFT JOIN users_cache u ON p.user_id = u.id
       LEFT JOIN tattoos t ON p.tattoo_id = t.id
       WHERE p.visibility = 'public'
       ORDER BY COALESCE(p.reaction_count, 0) DESC, p.created_at DESC
       LIMIT ?`,
      [limit]
    );
    return results || [];
  } catch (e) {
    console.error('getTrendingPosts:', e);
    return [];
  }
}
