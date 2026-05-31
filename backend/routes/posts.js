const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const postWithMeta = `
  SELECT p.*, u.username, u.display_name, u.avatar_url,
         COALESCE(r.counts, '{}') AS reactions,
         (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
         (SELECT reaction_type FROM reactions WHERE user_id = $ME AND post_id = p.id) AS my_reaction
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN LATERAL (
    SELECT jsonb_object_agg(reaction_type, cnt) AS counts
    FROM (SELECT reaction_type, COUNT(*) AS cnt FROM reactions WHERE post_id = p.id GROUP BY reaction_type) t
  ) r ON TRUE
`;

// POST /posts
router.post('/', requireAuth, async (req, res) => {
  const { tattoo_id, caption, photo_uris, style_tags, healing_day, visibility } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO posts (user_id, tattoo_id, caption, photo_uris, style_tags, healing_day, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [req.user.id, tattoo_id || null, caption || null,
       JSON.stringify(photo_uris || []), JSON.stringify(style_tags || []),
       healing_day || null, visibility || 'public']
    );
    const { rows: full } = await pool.query(
      postWithMeta.replace('$ME', `'${req.user.id}'`) + ' WHERE p.id = $1',
      [rows[0].id]
    );
    res.status(201).json(full[0]);
  } catch (e) {
    console.error('create post', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /posts/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      postWithMeta.replace('$ME', `'${req.user.id}'`) +
      ' WHERE p.id = $1 AND (p.visibility = \'public\' OR p.user_id = $2)',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Post not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /posts/:id
router.patch('/:id', requireAuth, async (req, res) => {
  const { caption, style_tags, visibility } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE posts SET
         caption    = COALESCE($1, caption),
         style_tags = COALESCE($2, style_tags),
         visibility = COALESCE($3, visibility),
         updated_at = NOW()
       WHERE id = $4 AND user_id = $5 RETURNING id`,
      [caption, style_tags ? JSON.stringify(style_tags) : null, visibility, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Post not found' });
    const { rows: full } = await pool.query(
      postWithMeta.replace('$ME', `'${req.user.id}'`) + ' WHERE p.id = $1',
      [rows[0].id]
    );
    res.json(full[0]);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /posts/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM posts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Post not found' });
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /posts/:id/react
router.post('/:id/react', requireAuth, async (req, res) => {
  const { reaction_type } = req.body;
  if (!reaction_type) return res.status(400).json({ message: 'reaction_type required' });
  try {
    await pool.query(
      `INSERT INTO reactions (user_id, post_id, reaction_type)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, post_id) DO UPDATE SET reaction_type = $3`,
      [req.user.id, req.params.id, reaction_type]
    );
    // notify post owner
    const { rows } = await pool.query('SELECT user_id FROM posts WHERE id = $1', [req.params.id]);
    if (rows[0] && rows[0].user_id !== req.user.id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, data) VALUES ($1,'reaction',$2)`,
        [rows[0].user_id, JSON.stringify({ post_id: req.params.id, reactor_id: req.user.id, reaction_type })]
      );
    }
    res.json({ reaction_type });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /posts/:id/react
router.delete('/:id/react', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM reactions WHERE user_id = $1 AND post_id = $2',
      [req.user.id, req.params.id]
    );
    res.json({ removed: true });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /posts/:id/comments
router.get('/:id/comments', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * 30;
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC LIMIT 30 OFFSET $2`,
      [req.params.id, offset]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /posts/:id/comments
router.post('/:id/comments', requireAuth, async (req, res) => {
  const { body, parent_comment_id } = req.body;
  if (!body?.trim()) return res.status(400).json({ message: 'body required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO comments (user_id, post_id, body, parent_comment_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, req.params.id, body.trim(), parent_comment_id || null]
    );
    const comment = rows[0];
    const { rows: u } = await pool.query(
      'SELECT username, display_name, avatar_url FROM users WHERE id = $1', [req.user.id]
    );
    // notify post owner
    const { rows: post } = await pool.query('SELECT user_id FROM posts WHERE id = $1', [req.params.id]);
    if (post[0] && post[0].user_id !== req.user.id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, data) VALUES ($1,'comment',$2)`,
        [post[0].user_id, JSON.stringify({ post_id: req.params.id, commenter_id: req.user.id })]
      );
    }
    res.status(201).json({ ...comment, ...u[0] });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /comments/:commentId  (mounted at router level via app)
router.delete('/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2',
      [req.params.commentId, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Comment not found' });
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
