BEGIN;

-- ───── USER-ROLES JUNCTION (FR-004) ──────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_user_role PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_assigner FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- ───── DATA MIGRATION: ASSIGN 'user' ROLE TO ALL EXISTING USERS (FR-010) ──────────────────────────────
INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM users u
CROSS JOIN roles r
WHERE r.name = 'user'
ON CONFLICT DO NOTHING;

-- ───── DATA MIGRATION: MAP is_admin=TRUE → 'admin' ROLE (FR-010) ──────────────────────────────
INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM users u
CROSS JOIN roles r
WHERE u.is_admin = TRUE AND r.name = 'admin'
ON CONFLICT DO NOTHING;

COMMIT;
