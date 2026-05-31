const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const pool = require('../db');

const router = express.Router();

const appleJwks = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys',
  cache: true,
  cacheMaxAge: 600000,
});

async function verifyAppleToken(identityToken) {
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded) throw new Error('Invalid identity token');
  const key = await appleJwks.getSigningKey(decoded.header.kid);
  return jwt.verify(identityToken, key.getPublicKey(), {
    algorithms: ['RS256'],
    audience: process.env.APPLE_BUNDLE_ID,
    issuer: 'https://appleid.apple.com',
  });
}

function makeToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
}

function publicUser(u) {
  const { password_hash, apple_sub, ...rest } = u;
  return rest;
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { username, email, password, display_name } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, display_name)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [username.toLowerCase(), email?.toLowerCase() || null, hash, display_name || username]
    );
    const user = rows[0];
    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ message: 'Username or email already taken' });
    }
    console.error('register error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (e) {
    console.error('login error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /auth/apple
router.post('/apple', async (req, res) => {
  const { identity_token, full_name, email } = req.body;
  if (!identity_token) {
    return res.status(400).json({ message: 'identity_token is required' });
  }
  try {
    const payload = await verifyAppleToken(identity_token);
    const appleSub = payload.sub;
    const appleEmail = payload.email || email || null;

    // Find existing user by apple_sub
    let { rows } = await pool.query(
      'SELECT * FROM users WHERE apple_sub = $1',
      [appleSub]
    );
    let user = rows[0];

    if (!user) {
      // Try to match by email if Apple provided one
      if (appleEmail) {
        const byEmail = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [appleEmail.toLowerCase()]
        );
        if (byEmail.rows[0]) {
          user = byEmail.rows[0];
          await pool.query('UPDATE users SET apple_sub = $1 WHERE id = $2', [appleSub, user.id]);
        }
      }
    }

    if (!user) {
      // Create new user
      const givenName = full_name?.givenName || '';
      const familyName = full_name?.familyName || '';
      const displayName = [givenName, familyName].filter(Boolean).join(' ') || 'Tattoo Fan';
      const baseUsername = (givenName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
      const username = `${baseUsername || 'user'}${Math.floor(Math.random() * 9000 + 1000)}`;

      const inserted = await pool.query(
        `INSERT INTO users (username, email, display_name, apple_sub)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [username, appleEmail?.toLowerCase() || null, displayName, appleSub]
      );
      user = inserted.rows[0];
    }

    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (e) {
    console.error('apple auth error', e.message);
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired Apple token' });
    }
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

module.exports = router;
