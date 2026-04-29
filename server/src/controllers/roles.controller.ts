import { NextFunction, Response } from 'express';
import RoleModel from '../models/role.js';
import permissionCache from '../services/permissionCache.js';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { sendResponse } from '../utilities/response.js';

const roleModel = new RoleModel();

/**
 * List all roles with their permission sets.
 * @route GET /api/roles
 * @returns 200 with array of roles
 */
const listRoles = async (_req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await roleModel.index();
    return sendResponse.success(res, roles, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * List all available permissions.
 * @route GET /api/roles/permissions
 * @returns 200 with array of permissions
 */
const listPermissions = async (_req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const permissions = await roleModel.getAllPermissions();
    return sendResponse.success(res, permissions, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new custom role with selected permissions.
 * @route POST /api/roles
 * @returns 201 with the created role, 400 on validation failure
 */
const createRole = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, permissionIds } = req.body;

    if (!name || !description) {
      return sendResponse.error(res, 'name and description are required', 400);
    }

    if (!Array.isArray(permissionIds)) {
      return sendResponse.error(res, 'permissionIds must be an array', 400);
    }

    const role = await roleModel.create(name, description, permissionIds);
    return sendResponse.success(res, role, 201);
  } catch (error) {
    if (
      (error as Error).message.includes('duplicate key') ||
      (error as Error).message.includes('unique')
    ) {
      return sendResponse.error(res, 'A role with this name already exists', 409);
    }
    next(error);
  }
};

/**
 * Update a custom role's description and permissions.
 * @route PUT /api/roles/:id
 * @returns 200 with updated role, 404 if not found
 */
const updateRole = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { description, permissionIds } = req.body;

    if (!description) {
      return sendResponse.error(res, 'description is required', 400);
    }

    if (!Array.isArray(permissionIds)) {
      return sendResponse.error(res, 'permissionIds must be an array', 400);
    }

    const role = await roleModel.update(id, description, permissionIds);
    await permissionCache.invalidateAll();
    return sendResponse.success(res, role, 200);
  } catch (error) {
    if ((error as Error).message === 'Role not found') {
      return sendResponse.error(res, 'Role not found', 404);
    }
    next(error);
  }
};

/**
 * Delete a custom role. System roles are protected at the DB trigger level.
 * @route DELETE /api/roles/:id
 * @returns 200 with confirmation, 404 if not found
 */
const deleteRole = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await roleModel.delete(id);
    await permissionCache.invalidateAll();
    return sendResponse.success(res, { message: 'Role deleted successfully' }, 200);
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Role not found') {
      return sendResponse.error(res, 'Role not found', 404);
    }
    if (msg.includes('Cannot delete system-defined role')) {
      return sendResponse.error(res, msg, 403);
    }
    next(error);
  }
};

/**
 * Assign a role to a user.
 * @route POST /api/roles/:userId/assign
 * @returns 200 with the assignment record
 */
const assignRole = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;
    const assignedBy = req.user?.id;

    if (!roleId) {
      return sendResponse.error(res, 'roleId is required', 400);
    }

    const assignment = await roleModel.assignRole(userId, roleId, assignedBy!);
    await permissionCache.invalidate(userId);
    return sendResponse.success(res, assignment, 200);
  } catch (error) {
    if (
      (error as Error).message.includes('duplicate key') ||
      (error as Error).message.includes('unique')
    ) {
      return sendResponse.error(res, 'User already has this role', 409);
    }
    next(error);
  }
};

/**
 * Revoke a role from a user. Prevents self-lockout of last super_admin.
 * @route POST /api/roles/:userId/revoke
 * @returns 200 with confirmation
 */
const revokeRole = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;
    const revokedBy = req.user?.id;

    if (!roleId) {
      return sendResponse.error(res, 'roleId is required', 400);
    }

    if (userId === revokedBy) {
      const superAdminRole = await roleModel.getByName('super_admin');
      if (superAdminRole && roleId === superAdminRole.role_id) {
        const hasOtherSuperAdmin = await checkNotLastSuperAdmin(userId, revokedBy);
        if (!hasOtherSuperAdmin) {
          return sendResponse.error(res, 'Cannot remove your last super_admin role', 403);
        }
      }
    }

    const result = await roleModel.revokeRole(userId, roleId);
    await permissionCache.invalidate(userId);
    return sendResponse.success(res, result, 200);
  } catch (error) {
    if ((error as Error).message === 'Role assignment not found') {
      return sendResponse.error(res, 'Role assignment not found', 404);
    }
    next(error);
  }
};

/**
 * Verify user retains at least one super_admin role after revocation (FR-013).
 * @param targetUserId - the user being modified
 * @param actingUserId - the super admin performing the action
 * @returns true if safe to proceed (user keeps super_admin), false if lockout would occur
 */
const checkNotLastSuperAdmin = async (
  targetUserId: string,
  _actingUserId: string,
): Promise<boolean> => {
  const roles = await roleModel.getUserRoles(targetUserId);
  const superAdminCount = roles.filter((r) => r.name === 'super_admin').length;
  return superAdminCount > 1;
};

export default {
  listRoles,
  listPermissions,
  createRole,
  updateRole,
  deleteRole,
  assignRole,
  revokeRole,
};
