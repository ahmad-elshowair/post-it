import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { IPaginatedResult } from '../interfaces/IPagination.js';
import { TFriend, TUnknownUser, TUser } from '../types/users.js';
import { createPaginationResult, getCursorPaginationOptions } from '../utilities/pagination.js';
import { sendResponse } from '../utilities/response.js';
import { user_model } from './factory.js';

/**
 * Retrieve a paginated list of all users.
 * @route GET /api/users
 * @returns 200 with the paginated list of users
 */
export const getUsers = async (req: Request, res: Response, _next: NextFunction) => {
  const paginationOptions = getCursorPaginationOptions(req);
  const { users } = await user_model.indexWithPagination(
    paginationOptions.limit,
    paginationOptions.cursor!,
    paginationOptions.direction,
  );

  const result = createPaginationResult(users, paginationOptions, 'user_id');

  return sendResponse.success<IPaginatedResult<TUser>>(res, result, 200);
};

/**
 * Retrieve a specific user by their username.
 * @route GET /api/users/username/:user_name
 * @returns 200 with the requested user, or 400/404 on error
 */
const getUserByUsername = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR!', 400, error.array());
    }
    const { user_name } = req.params;
    const user = await user_model.getUserByUsername(user_name);
    return sendResponse.success<TUser>(res, user, 200);
  } catch (error) {
    console.error('[USER CONTROLLER] getUserByUsername error: ', error);
    next(error);
  }
};

/**
 * Retrieve a specific user by their ID.
 * @route GET /api/users/:user_id
 * @returns 200 with the requested user, or 400/404 on error
 */
const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR!', 400, error.array());
    }
    const { user_id } = req.params;
    const user = await user_model.getUserById(user_id);
    return sendResponse.success<TUser>(res, user, 200);
  } catch (error) {
    console.error('[USER CONTROLLER] getUserById error: ', error);
    next(error);
  }
};

/**
 * Update the profile information for a specific user.
 * @route PUT /api/users/update/:user_id
 * @returns 200 with the updated user profile, or 401/403 on error
 */
const update = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR!', 400, error.array());
    }
    const { user_id } = req.params;
    const userData = req.body;

    const logged_in_user_id = req.user?.id;
    if (!logged_in_user_id) {
      return sendResponse.error(res, 'UNAUTHENTICATED', 401);
    }

    if (logged_in_user_id !== user_id) {
      return sendResponse.error(res, 'You are not authorized to update this user', 403);
    }
    const updated_user = await user_model.update(user_id, userData);
    return sendResponse.success<TUser>(res, updated_user, 200);
  } catch (error) {
    console.error('[USER CONTROLLER] update error: ', error);
    next(error);
  }
};

/**
 * Delete a user by their ID.
 * @route DELETE /api/users/delete/:user_id
 * @returns 200 on successful deletion, or 401/403 on error
 */
const deleteUser = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR!', 400, error.array());
    }
    const { user_id } = req.params;
    const logged_in_user_id = req.user?.id;

    if (!logged_in_user_id) {
      return sendResponse.error(res, 'UNAUTHENTICATED', 401);
    }

    if (logged_in_user_id !== user_id) {
      return sendResponse.error(res, 'You are not authorized to delete this user', 403);
    }
    const deleted_user = await user_model.delete(user_id);
    return sendResponse.success<{ message: string }>(res, deleted_user);
  } catch (error) {
    console.error('[USER CONTROLLER] delete error: ', error);
    next(error);
  }
};

/**
 * Retrieve a list of unknown users (users not currently followed).
 * @route GET /api/users/unknowns
 * @returns 200 with a list of unknown users
 */
const getUnknownUsers = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  const user_id = req.user?.id;

  if (!user_id) {
    return sendResponse.error(res, 'User ID is required', 400);
  }
  try {
    const unknowns = await user_model.getUnknowns(user_id);
    return sendResponse.success<TUnknownUser[]>(res, unknowns);
  } catch (error) {
    console.error('[USER CONTROLLER] getUnknownUsers error: ', error);
    next(error);
  }
};

/**
 * Retrieve a paginated list of a user's friends (mutual followers).
 * @route GET /api/users/friends/:user_id
 * @returns 200 with a paginated list of friends
 */
const getFriends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR!', 400, error.array());
    }
    const user_id = req.params.user_id;
    const isOnline = req.query.is_online === 'true';

    const paginationOptions = getCursorPaginationOptions(req);
    const { users } = await user_model.getFriends(
      user_id,
      isOnline,
      paginationOptions.limit,
      paginationOptions.cursor,
      paginationOptions.direction,
    );
    const result = createPaginationResult(users, paginationOptions, 'user_id');
    return sendResponse.success<IPaginatedResult<TFriend>>(res, result);
  } catch (error) {
    console.error('[USER CONTROLLER] getFriends error: ', error);
    next(error);
  }
};

export default {
  getUsers,
  update,
  getUserById,
  getUserByUsername,
  deleteUser,
  getUnknownUsers,
  getFriends,
};
