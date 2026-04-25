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

COMMIT;