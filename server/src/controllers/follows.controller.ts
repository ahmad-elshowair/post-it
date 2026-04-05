import { NextFunction, Response } from 'express';
import { validationResult } from 'express-validator';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { IPaginatedResult } from '../interfaces/IPagination.js';
import { TFollowers, TFollowings } from '../types/follow.js';
import { createPaginationResult, getCursorPaginationOptions } from '../utilities/pagination.js';
import { sendResponse } from '../utilities/response.js';
import { follow_model } from './factory.js';

/**
 * Follow a user identified by user_id_followed in the request body.
 * @route POST /api/follows/follow
 */
const followUser = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR!', 400, errors.array());
    }

    const user_id_following = req.user?.id;
    const user_id_followed = req.body.user_id_followed;

    if (!user_id_following) {
      return sendResponse.error(res, 'UNAUTHENTICATED!', 401, 'USER ID FOLLOWING IS REQUIRED!');
    }

    if (user_id_following === user_id_followed) {
      return sendResponse.error(
        res,
        'YOU CANNOT FOLLOW YOURSELF!',
        400,
        'YOU CANNOT FOLLOW YOURSELF!',
      );
    }
    const followAUser = await follow_model.follow(user_id_following, user_id_followed);
    return sendResponse.success<{ message: string }>(res, followAUser, 201);
  } catch (error) {
    console.error('[followController] followUser error :', error);
    next(error);
  }
};

/**
 * Unfollow a user identified by user_id_followed in the request body.
 * @route DELETE /api/follows/unfollow
 */
const unFollowUser = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR!', 400, error.array());
    }

    const user_id_following = req.user?.id;
    const user_id_followed = req.body.user_id_followed;

    if (!user_id_following) {
      return sendResponse.error(res, 'UNAUTHENTICATED!', 401, 'USER ID FOLLOWING IS REQUIRED!');
    }

    if (user_id_following === user_id_followed) {
      return sendResponse.error(
        res,
        'YOU CANNOT UNFOLLOW YOURSELF!',
        403,
        'YOU CANNOT UNFOLLOW YOURSELF!',
      );
    }
    const unFollowAUser = await follow_model.unFollow(user_id_following, user_id_followed);
    return sendResponse.success<{ message: string }>(res, unFollowAUser, 201);
  } catch (error) {
    console.error('[followController] unFollowUser error :', error);
    next(error);
  }
};

/**
 * Get number of followings of a user identified by user_id in the request user.
 * @route GET /api/follows/num-followings
 */
const getNumberOfFollowings = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'UNAUTHENTICATED!', 401, 'USER ID IS REQUIRED!');
    }
    // get the followings from the database
    const numFollowings = await follow_model.getNumberOfFollowings(user_id);
    return sendResponse.success<number>(res, numFollowings, 200);
  } catch (error) {
    console.error('[followController] getNumberOfFollowings error :', error);
    next(error);
  }
};

/**
 * Get number of followers of a user identified by user_id in the request user.
 * @route GET /api/follows/num-followers
 */
const getNumberOfFollowers = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  const user_id = req.user?.id;
  try {
    if (!user_id) {
      return sendResponse.error(res, 'UNAUTHENTICATED!', 401, 'USER ID IS REQUIRED!');
    }
    const numFollowers = await follow_model.getNumberOfFollowers(user_id);
    return sendResponse.success<number>(res, numFollowers, 200);
  } catch (error) {
    console.error('[followController] getNumberOfFollowers error :', error);
    next(error);
  }
};

/**
 * Get followings of a user identified by user_id in the request user.
 * @route GET /api/follows/followings
 */
const getFollowings = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'UNAUTHENTICATED!', 401, 'USER ID IS REQUIRED!');
    }

    const paginationOptions = getCursorPaginationOptions(req);

    const { followings } = await follow_model.getFollowings(
      user_id,
      paginationOptions.limit,
      paginationOptions.cursor,
      paginationOptions.direction,
    );

    const result = createPaginationResult(followings, paginationOptions, 'user_id');

    return sendResponse.success<IPaginatedResult<TFollowings>>(res, result, 200);
  } catch (error) {
    console.error('[followController] getFollowings error :', error);
    next(error);
  }
};

/**
 * Get followers of a user identified by user_id in the request user.
 * @route GET /api/follows/followers
 */
const getFollowers = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'UNAUTHENTICATED!', 401, 'USER ID IS REQUIRED!');
    }

    const paginationOptions = getCursorPaginationOptions(req);

    const { followers } = await follow_model.getFollowers(
      user_id,
      paginationOptions.limit,
      paginationOptions.cursor,
      paginationOptions.direction,
    );

    const result = createPaginationResult(followers, paginationOptions, 'user_id');
    return sendResponse.success<IPaginatedResult<TFollowers>>(res, result, 200);
  } catch (error) {
    console.error('[followController] getFollowers error :', error);
    next(error);
  }
};

/**
 * Check if a user is following another user identified by user_id in the request user.
 * @route GET /api/follows/is-followed/:followed_id
 */
const isFollowed = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR!', 400, error.array());
    }
    const following_id = req.user?.id;
    const followed_id = req.params.followed_id;
    if (!following_id) {
      return sendResponse.error(res, 'UNAUTHORIZED!', 401, 'USER ID FOLLOWING IS REQUIRED!');
    }
    const isFollowed = await follow_model.isFollowing(following_id, followed_id);
    return sendResponse.success<boolean>(res, isFollowed.is_following, 200);
  } catch (error) {
    console.error('[followController] isFollowed error :', error);
    next(error);
  }
};

export default {
  followUser,
  unFollowUser,
  getNumberOfFollowings,
  getNumberOfFollowers,
  getFollowings,
  getFollowers,
  isFollowed,
};
