BEGIN;

-- ───── REVERSE ORDER: JUNCTION → DICTIONARY ──────────────────────────────
DROP TRIGGER IF EXISTS trg_prevent_system_role_deletion ON roles;
DROP FUNCTION IF EXISTS prevent_system_role_deletion;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

COMMIT;
