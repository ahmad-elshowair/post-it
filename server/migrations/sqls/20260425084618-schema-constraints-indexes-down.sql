BEGIN;

-- ───── Drop Indexes ──────────────────────────────

DROP INDEX IF EXISTS idx_likes_user_id;
DROP INDEX IF EXISTS idx_likes_post_id;
DROP INDEX IF EXISTS idx_follows_followed;
DROP INDEX IF EXISTS idx_follows_following;
DROP INDEX IF EXISTS idx_posts_user_id;

-- ───── Drop Constraints ──────────────────────────────

ALTER TABLE follows DROP CONSTRAINT IF EXISTS chk_no_self_follow;
ALTER TABLE follows DROP CONSTRAINT IF EXISTS uq_follow;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS uq_like;

COMMIT;