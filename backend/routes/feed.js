const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const postSelect = (userId) => `
  SELECT p.*, u.username, u.display_name, u.avatar_url,
         COALESCE(r.counts, '{}') AS reactions,
         (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
         (SELECT reaction_type FROM reactions WHERE user_id = '${userId}' AND post_id = p.id) AS my_reaction
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN LATERAL (
    SELECT jsonb_object_agg(reaction_type, cnt) AS counts
    FROM (SELECT reaction_type, COUNT(*) AS cnt FROM reactions WHERE post_id = p.id GROUP BY reaction_type) t
  ) r ON TRUE
`;

// GET /feed — posts from followed users + own posts
router.get('/', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * 20;
  try {
    const { rows } = await pool.query(
      postSelect(req.user.id) +
      `WHERE p.visibility = 'public'
         AND (p.user_id = $1 OR p.user_id IN (
               SELECT following_id FROM follows WHERE follower_id = $1
             ))
       ORDER BY p.created_at DESC LIMIT 20 OFFSET $2`,
      [req.user.id, offset]
    );
    res.json(rows);
  } catch (e) {
    console.error('feed error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /explore — all public posts, optional tag filter
router.get('/explore', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * 20;
  const tag = req.query.tag;
  try {
    const params = [offset];
    let tagClause = '';
    if (tag) {
      params.push(tag);
      tagClause = `AND p.style_tags @> $${params.length}::jsonb`;
    }
    const { rows } = await pool.query(
      postSelect(req.user.id) +
      `WHERE p.visibility = 'public' ${tagClause}
       ORDER BY p.created_at DESC LIMIT 20 OFFSET $1`,
      tag ? [offset, JSON.stringify([tag])] : [offset]
    );
    res.json(rows);
  } catch (e) {
    console.error('explore error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
