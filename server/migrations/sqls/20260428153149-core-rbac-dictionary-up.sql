BEGIN;

-- ───── ROLES TABLE ──────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───── PERMISSIONS TABLE ──────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- ───── ROLE-PERMISSION JUNCTION ──────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  CONSTRAINT pk_role_permission PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ───── SYSTEM ROLE DELETION GUARD (FR-016) ──────────────────────────────
CREATE OR REPLACE FUNCTION prevent_system_role_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_system = TRUE THEN
    RAISE EXCEPTION 'Cannot delete system-defined role: %', OLD.name;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_system_role_deletion
BEFORE DELETE ON roles
FOR EACH ROW EXECUTE FUNCTION prevent_system_role_deletion();

-- ───── SEED: SYSTEM ROLES (FR-007) ──────────────────────────────
INSERT INTO roles (name, description, is_system) VALUES
  ('user', 'Default role for all registered users', TRUE),
  ('moderator', 'Can handle reports and moderate content', TRUE),
  ('admin', 'Can manage content, reports, and users', TRUE),
  ('super_admin', 'Full system access including role management', TRUE),
  ('banned', 'Restricted access - cannot login or interact', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ───── SEED: PERMISSIONS (FR-008) ──────────────────────────────
INSERT INTO permissions (name, description, resource, action) VALUES
  ('posts.delete.own', 'Delete own posts', 'posts', 'delete'),
  ('posts.delete.any', 'Delete any post', 'posts', 'delete'),
  ('comments.delete.own', 'Delete own comments', 'comments', 'delete'),
  ('comments.delete.any', 'Delete any comment', 'comments', 'delete'),
  ('reports.manage', 'View and handle reports', 'reports', 'manage'),
  ('users.read', 'View user profiles', 'users', 'read'),
  ('users.ban', 'Ban/unban users', 'users', 'ban'),
  ('users.manage', 'Edit user profiles', 'users', 'manage'),
  ('roles.manage', 'Create, edit, delete roles', 'roles', 'manage'),
  ('roles.assign', 'Assign/revoke roles from users', 'roles', 'assign')
ON CONFLICT (name) DO NOTHING;

-- ───── SEED: ROLE-PERMISSION MAPPINGS (FR-009) ──────────────────────────────

-- user: posts.delete.own, comments.delete.own
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.name = 'user' AND p.name IN ('posts.delete.own', 'comments.delete.own')
ON CONFLICT DO NOTHING;

-- moderator: user perms + posts.delete.any, comments.delete.any, reports.manage, users.read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.name = 'moderator'
  AND p.name IN ('posts.delete.own', 'posts.delete.any', 'comments.delete.own', 'comments.delete.any', 'reports.manage', 'users.read')
ON CONFLICT DO NOTHING;

-- admin: moderator perms + users.ban, users.manage
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.name IN ('posts.delete.own', 'posts.delete.any', 'comments.delete.own', 'comments.delete.any', 'reports.manage', 'users.read', 'users.ban', 'users.manage')
ON CONFLICT DO NOTHING;

-- super_admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

COMMIT;
