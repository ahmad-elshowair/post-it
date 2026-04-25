BEGIN;

-- ───── Phase 1: Deduplicate Data ──────────────────────────────

-- Deduplicate likes (keep earliest created_at)
DELETE FROM likes a USING likes b
WHERE a.user_id = b.user_id 
  AND a.post_id = b.post_id 
  AND a.created_at > b.created_at;

-- Deduplicate follows (keep earliest created_on)
DELETE FROM follows a USING follows b
WHERE a.user_id_following = b.user_id_following 
  AND a.user_id_followed = b.user_id_followed 
  AND a.created_on > b.created_on;

-- Remove self-follows
DELETE FROM follows
WHERE user_id_following = user_id_followed;

-- ───── Phase 2: Constraints ──────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_like') THEN
        ALTER TABLE likes ADD CONSTRAINT uq_like UNIQUE (user_id, post_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_follow') THEN
        ALTER TABLE follows ADD CONSTRAINT uq_follow UNIQUE (user_id_following, user_id_followed);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_no_self_follow') THEN
        ALTER TABLE follows ADD CONSTRAINT chk_no_self_follow CHECK (user_id_following != user_id_followed);
    END IF;
END $$;

-- ───── Phase 3: Indexes ──────────────────────────────

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(user_id_following);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON follows(user_id_followed);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

COMMIT;