/**
 * exploreDb.js
 * SQLite helpers for Explore feed, artist profiles, and leaderboard queries.
 * All writes go through socialDb for posts/follows — this file is read-focused.
 */
import { getDatabase } from './database';

/**
 * Get public posts filtered by optional style and/or body_part tag.
 * Paginates with limit/offset.
 */
export async function getExplorePosts({ style, bodyPart, limit = 30, offset = 0 } = {}) {
  try {
    const db = await getDatabase();
    let query = `
      SELECT p.*, u.username, u.avatar_uri, u.display_name,
             t.name AS tattoo_name, t.style, t.body_part, t.artist_name
      FROM tattoo_posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN tattoos t ON p.tattoo_id = t.id
      WHERE p.visibility = 'public'
    `;
    const args = [];
    if (style) { query += ' AND t.style = ?'; args.push(style); }
    if (bodyPart) { query += ' AND t.body_part = ?'; args.push(bodyPart); }
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);
    const result = await db.getAllAsync(query, args);
    return result || [];
  } catch (e) {
    console.error('getExplorePosts:', e);
    return [];
  }
}

/**
 * Get a deduplicated list of all artist names that users have tagged,
 * sorted alphabetically. Used for the artist search/autocomplete.
 */
export async function getAllArtistNames() {
  try {
    const db = await getDatabase();
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
 * Get all tattoos and public posts tagged with a given artist name.
 * Used to populate the ArtistProfileScreen.
 */
export async function getArtistData(artistName) {
  try {
    const db = await getDatabase();
    const tattoos = await db.getAllAsync(
      `SELECT t.*, u.username, u.display_name
       FROM tattoos t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.artist_name = ?
       ORDER BY t.date_tattooed DESC`,
      [artistName]
    );
    const posts = await db.getAllAsync(
      `SELECT p.*, u.username, u.avatar_uri, t.name AS tattoo_name, t.style, t.body_part
       FROM tattoo_posts p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN tattoos t ON p.tattoo_id = t.id
       WHERE t.artist_name = ? AND p.visibility = 'public'
       ORDER BY p.created_at DESC`,
      [artistName]
    );
    const styleBreakdown = (tattoos || []).reduce((acc, t) => {
      if (t.style) acc[t.style] = (acc[t.style] || 0) + 1;
      return acc;
    }, {});
    return {
      artistName,
      tattoos: tattoos || [],
      posts: posts || [],
      styleBreakdown,
      totalWorks: (tattoos || []).length,
    };
  } catch (e) {
    console.error('getArtistData:', e);
    return { artistName, tattoos: [], posts: [], styleBreakdown: {}, totalWorks: 0 };
  }
}

/**
 * Get leaderboard data for all users the current user follows.
 * Ranks by care streak (descending).
 */
export async function getFriendsLeaderboard(currentUserId) {
  try {
    const db = await getDatabase();
    // Get all followed user IDs
    const follows = await db.getAllAsync(
      'SELECT following_id FROM follow_relationships WHERE follower_id = ?',
      [currentUserId]
    );
    const followedIds = (follows || []).map((f) => f.following_id);
    // Include self
    const ids = [currentUserId, ...followedIds];
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const users = await db.getAllAsync(
      `SELECT u.id, u.username, u.display_name, u.avatar_uri,
              u.care_streak, u.total_care_logs, u.badges_earned,
              (SELECT COUNT(*) FROM tattoos WHERE user_id = u.id) AS tattoo_count
       FROM users u
       WHERE u.id IN (${placeholders})
       ORDER BY u.care_streak DESC`,
      ids
    );
    return (users || []).map((u, i) => ({ ...u, rank: i + 1, isCurrentUser: u.id === currentUserId }));
  } catch (e) {
    console.error('getFriendsLeaderboard:', e);
    return [];
  }
}

/**
 * Get style distribution for the current user (for Style Passport).
 */
export async function getUserStylePassport(userId) {
  try {
    const db = await getDatabase();
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
