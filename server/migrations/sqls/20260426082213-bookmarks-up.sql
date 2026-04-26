BEGIN;

-- ───── BOOKMARKS TABLE ──────────────────────────────
CREATE TABLE bookmarks (
  bookmark_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bookmarks_user_post_unique UNIQUE (user_id, post_id)
);

-- ───── PERFORMANCE INDEXES ──────────────────────────────
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_post_id ON bookmarks(post_id);
CREATE INDEX idx_bookmarks_user_created ON bookmarks(user_id, created_at DESC);

COMMIT;
