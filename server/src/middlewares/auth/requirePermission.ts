import { NextFunction, Response } from 'express';
import RoleModel from '../../models/role.js';
import permissionCache from '../../services/permissionCache.js';
import { ICustomRequest } from '../../interfaces/ICustomRequest.js';

/**
 * Create middleware that gates a route on a specific permission.
 * Must be used AFTER authorizeUser (req.user must be populated).
 * @param permissionName - the permission to require (e.g. 'roles.manage')
 * @throws {401} if no authenticated user on the request
 * @throws {403} if user lacks the required permission or is banned
 */
const requirePermission = (permissionName: string) => {
  return async (req: ICustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'Authentication Required', error: 'Missing user context' });
        return;
      }

      const userId = req.user.id;

      const cached = await permissionCache.get(userId);
      if (cached !== null) {
        if (cached.length === 0) {
          res.status(403).json({ message: 'Forbidden', error: 'Insufficient permissions' });
          return;
        }

        if (!cached.includes(permissionName)) {
          res.status(403).json({ message: 'Forbidden', error: 'Insufficient permissions' });
          return;
        }

        next();
        return;
      }

      const roleModel = new RoleModel();
      const permissions = await roleModel.getUserPermissions(userId);

      await permissionCache.set(userId, permissions);

      if (permissions.length === 0) {
        res.status(403).json({ message: 'Forbidden', error: 'Insufficient permissions' });
        return;
      }

      if (!permissions.includes(permissionName)) {
        res.status(403).json({ message: 'Forbidden', error: 'Insufficient permissions' });
        return;
      }

      next();
    } catch (error) {
      console.error('[REQUIRE PERMISSION] error:', error);
      res.status(500).json({ message: 'Internal Server Error', error: 'Permission check failed' });
    }
  };
};

export default requirePermission;
