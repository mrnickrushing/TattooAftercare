require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const migrate = require('./db/migrate');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Health check
app.get('/health', (_, res) => res.json({ ok: true }));

// Routes
app.use('/auth',          require('./routes/auth'));
app.use('/users',         require('./routes/users'));
app.use('/posts',         require('./routes/posts'));
app.use('/feed',          require('./routes/feed'));
app.use('/explore',       require('./routes/feed'));   // same router, different mount
app.use('/notifications', require('./routes/notifications'));

// DELETE /comments/:id — mounted here to match socialApi path
app.delete('/comments/:id', require('./middleware/auth'), async (req, res) => {
  const pool = require('./db');
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Comment not found' });
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// 404
app.use((_, res) => res.status(404).json({ message: 'Not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

migrate()
  .then(() => {
    app.listen(PORT, () => console.log(`API running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
