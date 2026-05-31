const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

function publicUser(u) {
  const { password_hash, apple_sub, ...rest } = u;
  return rest;
}

// GET /users/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    res.json(publicUser(rows[0]));
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /users/me
router.patch('/me', requireAuth, async (req, res) => {
  const { display_name, bio, avatar_url, username } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET
        display_name = COALESCE($1, display_name),
        bio          = COALESCE($2, bio),
        avatar_url   = COALESCE($3, avatar_url),
        username     = COALESCE($4, username),
        updated_at   = NOW()
       WHERE id = $5 RETURNING *`,
      [display_name, bio, avatar_url, username?.toLowerCase(), req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    res.json(publicUser(rows[0]));
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Username already taken' });
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /users/search?q=
router.get('/search', requireAuth, async (req, res) => {
  const q = `%${(req.query.q || '').toLowerCase()}%`;
  try {
    const { rows } = await pool.query(
      `SELECT id, username, display_name, avatar_url, bio
       FROM users
       WHERE LOWER(username) LIKE $1 OR LOWER(display_name) LIKE $1
       LIMIT 20`,
      [q]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /users/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.created_at,
              (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS follower_count,
              (SELECT COUNT(*) FROM follows WHERE follower_id  = u.id) AS following_count,
              EXISTS (SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id) AS is_following
       FROM users u WHERE u.id = $1`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /users/:id/posts
router.get('/:id/posts', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  try {
    const { rows } = await pool.query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url,
              COALESCE(r.counts, '{}') AS reactions,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
              (SELECT reaction_type FROM reactions WHERE user_id = $2 AND post_id = p.id) AS my_reaction
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN LATERAL (
         SELECT jsonb_object_agg(reaction_type, cnt) AS counts
         FROM (SELECT reaction_type, COUNT(*) AS cnt FROM reactions WHERE post_id = p.id GROUP BY reaction_type) t
       ) r ON TRUE
       WHERE p.user_id = $1 AND (p.visibility = 'public' OR p.user_id = $2)
       ORDER BY p.created_at DESC
       LIMIT $3 OFFSET $4`,
      [req.params.id, req.user.id, limit, offset]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /users/:id/follow
router.post('/:id/follow', requireAuth, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ message: "Can't follow yourself" });
  }
  try {
    await pool.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id]
    );
    await pool.query(
      `INSERT INTO notifications (user_id, type, data) VALUES ($1, 'follow', $2)`,
      [req.params.id, JSON.stringify({ follower_id: req.user.id })]
    );
    res.json({ following: true });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /users/:id/follow
router.delete('/:id/follow', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, req.params.id]
    );
    res.json({ following: false });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /users/:id/followers
router.get('/:id/followers', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * 20;
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url,
              EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id) AS is_following
       FROM follows f JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = $1
       ORDER BY f.created_at DESC LIMIT 20 OFFSET $3`,
      [req.params.id, req.user.id, offset]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /users/:id/following
router.get('/:id/following', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * 20;
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url,
              EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id) AS is_following
       FROM follows f JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC LIMIT 20 OFFSET $3`,
      [req.params.id, req.user.id, offset]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
