/**
 * exploreDb.js
 * SQLite helpers for Explore feed, artist profiles, and leaderboard queries.
 * Read-focused — all writes go through socialDb.
 *
 * Uses main-canonical table names:
 *   posts, follows, users_cache, tattoos
 */
import { getDB } from './db';

/**
 * Get public posts filtered by optional style and/or body_part tag.
 */
export async function getExplorePosts({ style, bodyPart, limit = 30, offset = 0 } = {}) {
  try {
    const db = await getDB();
    let query = `
      SELECT p.*,
             u.username, u.avatar_uri, u.display_name,
             t.name AS tattoo_name, t.style, t.body_part, t.artist_name
      FROM posts p
      LEFT JOIN users_cache u ON p.user_id = u.id
      LEFT JOIN tattoos t ON p.tattoo_id = t.id
      WHERE p.visibility = 'public'
    `;
    const args = [];
    if (style)    { query += ' AND t.style = ?';      args.push(style); }
    if (bodyPart) { query += ' AND t.body_part = ?';  args.push(bodyPart); }
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
              t.name AS tattoo_name, t.style, t.body_part
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
    // Pick the instagram handle from the first tattoo that has one
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
 * Friends leaderboard ranked by care_streak.
 * Reads from users_cache (cached friend profiles) + local_user for self.
 */
export async function getFriendsLeaderboard(currentUserId) {
  try {
    const db = await getDB();
    // Get followed user IDs
    const followRows = await db.getAllAsync(
      'SELECT following_id FROM follows WHERE follower_id = ? AND status = "accepted"',
      [currentUserId]
    );
    const followedIds = (followRows || []).map((f) => f.following_id);

    // Build combined list: self (from local_user) + followed (from users_cache)
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
 * Style distribution for the current user (Style Passport).
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
