import { PoolClient, QueryResult } from 'pg';
import pool from '../database/pool.js';
import { TPermission, TRole, TRoleWithPermissions, TUserRole } from '../types/role.js';

class RoleModel {
  /**
   * List all roles with their permissions.
   * @returns all roles including their permission sets
   */
  async index(): Promise<TRoleWithPermissions[]> {
    const connection: PoolClient = await pool.connect();
    try {
      const rolesResult: QueryResult<TRole> = await connection.query(
        'SELECT role_id, name, description, is_system, created_at, updated_at FROM roles ORDER BY name ASC',
      );

      if (rolesResult.rowCount === 0) {
        return [];
      }

      const permsResult: QueryResult<{ role_id: string } & TPermission> = await connection.query(
        `SELECT rp.role_id, p.permission_id, p.name, p.description, p.resource, p.action, p.created_at
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.permission_id`,
      );

      const permsByRole = new Map<string, TPermission[]>();
      for (const row of permsResult.rows) {
        const { role_id, ...perm } = row;
        const list = permsByRole.get(role_id) ?? [];
        list.push(perm);
        permsByRole.set(role_id, list);
      }

      return rolesResult.rows.map((role) => ({
        ...role,
        permissions: permsByRole.get(role.role_id) ?? [],
      }));
    } catch (error) {
      throw new Error(`Failed to list roles: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Get a single role by ID.
   * @param roleId - the role UUID
   * @returns the role with its permissions
   * @throws {Error} if role not found
   */
  async getById(roleId: string): Promise<TRoleWithPermissions> {
    const connection: PoolClient = await pool.connect();
    try {
      const roleResult: QueryResult<TRole> = await connection.query(
        'SELECT role_id, name, description, is_system, created_at, updated_at FROM roles WHERE role_id = $1',
        [roleId],
      );

      if (roleResult.rowCount === 0) {
        throw new Error('Role not found');
      }

      const permsResult: QueryResult<TPermission> = await connection.query(
        `SELECT p.permission_id, p.name, p.description, p.resource, p.action, p.created_at
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.permission_id
         WHERE rp.role_id = $1`,
        [roleId],
      );

      return { ...roleResult.rows[0], permissions: permsResult.rows };
    } catch (error) {
      throw new Error(`Failed to get role: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Get a role by its name.
   * @param name - the unique role name
   * @returns the role record or null
   */
  async getByName(name: string): Promise<TRole | null> {
    const connection: PoolClient = await pool.connect();
    try {
      const result: QueryResult<TRole> = await connection.query(
        'SELECT role_id, name, description, is_system, created_at, updated_at FROM roles WHERE name = $1',
        [name],
      );
      return result.rowCount === 0 ? null : result.rows[0];
    } catch (error) {
      throw new Error(`Failed to get role by name: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Create a custom role and assign permissions in a single transaction.
   * @param name - unique role name
   * @param description - human-readable description
   * @param permissionIds - permission UUIDs to assign
   * @returns the created role with permissions
   * @throws {Error} on duplicate name or if any permission is invalid
   */
  async create(
    name: string,
    description: string,
    permissionIds: string[],
  ): Promise<TRoleWithPermissions> {
    const connection: PoolClient = await pool.connect();
    try {
      await connection.query('BEGIN');

      const insertResult: QueryResult<TRole> = await connection.query(
        `INSERT INTO roles (name, description)
         VALUES ($1, $2)
         RETURNING role_id, name, description, is_system, created_at, updated_at`,
        [name, description],
      );

      const role = insertResult.rows[0];

      if (permissionIds.length > 0) {
        const values = permissionIds.map((_, i) => `($1, $${i + 2})`).join(', ');
        await connection.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`,
          [role.role_id, ...permissionIds],
        );
      }

      await connection.query('COMMIT');

      const permsResult: QueryResult<TPermission> = await connection.query(
        `SELECT p.permission_id, p.name, p.description, p.resource, p.action, p.created_at
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.permission_id
         WHERE rp.role_id = $1`,
        [role.role_id],
      );

      return { ...role, permissions: permsResult.rows };
    } catch (error) {
      await connection.query('ROLLBACK');
      throw new Error(`Failed to create role: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Update a custom role's description and permission set.
   * @param roleId - the role to update
   * @param description - new description
   * @param permissionIds - replacement permission set
   * @returns the updated role with permissions
   * @throws {Error} if role not found or is a system role
   */
  async update(
    roleId: string,
    description: string,
    permissionIds: string[],
  ): Promise<TRoleWithPermissions> {
    const connection: PoolClient = await pool.connect();
    try {
      await connection.query('BEGIN');

      const updateResult: QueryResult<TRole> = await connection.query(
        `UPDATE roles SET description = $1, updated_at = NOW()
         WHERE role_id = $2
         RETURNING role_id, name, description, is_system, created_at, updated_at`,
        [description, roleId],
      );

      if (updateResult.rowCount === 0) {
        throw new Error('Role not found');
      }

      await connection.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

      if (permissionIds.length > 0) {
        const values = permissionIds.map((_, i) => `($1, $${i + 2})`).join(', ');
        await connection.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`,
          [roleId, ...permissionIds],
        );
      }

      await connection.query('COMMIT');

      const permsResult: QueryResult<TPermission> = await connection.query(
        `SELECT p.permission_id, p.name, p.description, p.resource, p.action, p.created_at
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.permission_id
         WHERE rp.role_id = $1`,
        [roleId],
      );

      return { ...updateResult.rows[0], permissions: permsResult.rows };
    } catch (error) {
      await connection.query('ROLLBACK');
      throw new Error(`Failed to update role: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete a custom role. System roles are rejected at the DB trigger level.
   * CASCADE removes all user assignments and permission mappings automatically.
   * @param roleId - the role to delete
   * @returns confirmation message
   * @throws {Error} if role not found or is a system role
   */
  async delete(roleId: string): Promise<{ message: string }> {
    const connection: PoolClient = await pool.connect();
    try {
      await connection.query('BEGIN');

      const result: QueryResult = await connection.query(
        'DELETE FROM roles WHERE role_id = $1 RETURNING role_id',
        [roleId],
      );

      if (result.rowCount === 0) {
        throw new Error('Role not found');
      }

      await connection.query('COMMIT');
      return { message: 'Role deleted successfully' };
    } catch (error) {
      await connection.query('ROLLBACK');
      throw new Error(`Failed to delete role: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * List all available permissions.
   * @returns all permission records
   */
  async getAllPermissions(): Promise<TPermission[]> {
    const connection: PoolClient = await pool.connect();
    try {
      const result: QueryResult<TPermission> = await connection.query(
        'SELECT permission_id, name, description, resource, action, created_at FROM permissions ORDER BY resource, action',
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get permissions: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Get all roles assigned to a user.
   * @param userId - the user UUID
   * @returns role records assigned to the user
   */
  async getUserRoles(userId: string): Promise<TRole[]> {
    const connection: PoolClient = await pool.connect();
    try {
      const result: QueryResult<TRole> = await connection.query(
        `SELECT r.role_id, r.name, r.description, r.is_system, r.created_at, r.updated_at
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.role_id
         WHERE ur.user_id = $1`,
        [userId],
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to get user roles: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Resolve a user's effective permission set (union of all role permissions).
   * Returns empty set if user has the 'banned' role (deny-first per FR-024).
   * @param userId - the user UUID
   * @returns unique permission names
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const connection: PoolClient = await pool.connect();
    try {
      const bannedResult: QueryResult = await connection.query(
        `SELECT 1 FROM user_roles ur
         JOIN roles r ON ur.role_id = r.role_id
         WHERE ur.user_id = $1 AND r.name = 'banned'`,
        [userId],
      );

      if (bannedResult.rowCount !== 0 && bannedResult.rowCount !== null) {
        return [];
      }

      const result: QueryResult<{ name: string }> = await connection.query(
        `SELECT DISTINCT p.name
         FROM user_roles ur
         JOIN role_permissions rp ON ur.role_id = rp.role_id
         JOIN permissions p ON rp.permission_id = p.permission_id
         WHERE ur.user_id = $1`,
        [userId],
      );

      return result.rows.map((r) => r.name);
    } catch (error) {
      throw new Error(`Failed to get user permissions: ${(error as Error).message}`, {
        cause: error,
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Assign a role to a user.
   * @param userId - the target user
   * @param roleId - the role to assign
   * @param assignedBy - the super admin performing the assignment
   * @returns the created user-role assignment
   * @throws {Error} on duplicate assignment
   */
  async assignRole(userId: string, roleId: string, assignedBy: string): Promise<TUserRole> {
    const connection: PoolClient = await pool.connect();
    try {
      await connection.query('BEGIN');

      const result: QueryResult<TUserRole> = await connection.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)
         RETURNING user_id, role_id, assigned_by, assigned_at`,
        [userId, roleId, assignedBy],
      );

      await connection.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await connection.query('ROLLBACK');
      throw new Error(`Failed to assign role: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Revoke a role from a user.
   * @param userId - the target user
   * @param roleId - the role to revoke
   * @returns confirmation message
   * @throws {Error} if assignment not found
   */
  async revokeRole(userId: string, roleId: string): Promise<{ message: string }> {
    const connection: PoolClient = await pool.connect();
    try {
      await connection.query('BEGIN');

      const result: QueryResult = await connection.query(
        'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING user_id',
        [userId, roleId],
      );

      if (result.rowCount === 0) {
        throw new Error('Role assignment not found');
      }

      await connection.query('COMMIT');
      return { message: 'Role revoked successfully' };
    } catch (error) {
      await connection.query('ROLLBACK');
      throw new Error(`Failed to revoke role: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Check if a user has a specific role by name.
   * @param userId - the user UUID
   * @param roleName - the role name to check
   * @returns whether the user has the role
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const connection: PoolClient = await pool.connect();
    try {
      const result: QueryResult = await connection.query(
        `SELECT 1 FROM user_roles ur
         JOIN roles r ON ur.role_id = r.role_id
         WHERE ur.user_id = $1 AND r.name = $2`,
        [userId, roleName],
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new Error(`Failed to check role: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Check if a user has a specific permission (via any of their roles).
   * Respects deny-first semantics: banned users always return false.
   * @param userId - the user UUID
   * @param permissionName - the permission name in resource.action format
   * @returns whether the user has the permission
   */
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const connection: PoolClient = await pool.connect();
    try {
      const bannedResult: QueryResult = await connection.query(
        `SELECT 1 FROM user_roles ur
         JOIN roles r ON ur.role_id = r.role_id
         WHERE ur.user_id = $1 AND r.name = 'banned'`,
        [userId],
      );

      if ((bannedResult.rowCount ?? 0) > 0) {
        return false;
      }

      const result: QueryResult = await connection.query(
        `SELECT 1
         FROM user_roles ur
         JOIN role_permissions rp ON ur.role_id = rp.role_id
         JOIN permissions p ON rp.permission_id = p.permission_id
         WHERE ur.user_id = $1 AND p.name = $2`,
        [userId, permissionName],
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new Error(`Failed to check permission: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }
}

export default RoleModel;
