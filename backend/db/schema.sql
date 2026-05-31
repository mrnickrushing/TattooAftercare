CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  display_name  VARCHAR(100),
  bio           TEXT,
  avatar_url    TEXT,
  apple_sub     VARCHAR(255) UNIQUE,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tattoo_id   VARCHAR(255),
  caption     TEXT,
  photo_uris  JSONB        DEFAULT '[]',
  style_tags  JSONB        DEFAULT '[]',
  healing_day INTEGER,
  visibility  VARCHAR(20)  DEFAULT 'public',
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS reactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id       UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reaction_type VARCHAR(50) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id           UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  body              TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  data       JSONB       DEFAULT '{}',
  read       BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id      ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at   ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower    ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following   ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post      ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post       ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user  ON notifications(user_id, read, created_at DESC);
