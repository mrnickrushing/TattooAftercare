const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /notifications
router.get('/', requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * 30;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 30 OFFSET $2`,
      [req.user.id, offset]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /notifications/read-all
router.post('/read-all', requireAuth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE',
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
