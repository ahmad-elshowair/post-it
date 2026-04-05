import { NextFunction, Response } from 'express';
import { validationResult } from 'express-validator';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { Like } from '../types/like.js';
import { sendResponse } from '../utilities/response.js';
import { like_model } from './factory.js';

/**
 * Handle like/unlike action for a post.
 * @route POST /api/posts/like/:post_id
 * @returns 200 with string indicating the performed action, or 400/401 on error
 */
const handleLike = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR!', 400, errors.array());
    }
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'UNAUTHENTICATED!', 401, 'USER ID IS REQUIRED!');
    }
    const like: Like = {
      user_id,
      post_id: req.params.post_id,
    };
    const isLiked = await like_model.like(like);
    return sendResponse.success<{
      message: string;
      action: 'liked' | 'unliked';
    }>(res, isLiked, 200);
  } catch (error) {
    console.error('[likeController] handleLike error :', error);
    next(error);
  }
};

/**
 * Check if a user has liked a post.
 * @route GET /api/posts/is-liked/:post_id
 * @returns 200 with boolean indicating if liked, or 400/401 on error
 */
const checkIfLiked = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR!', 400, errors.array());
    }

    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'UNAUTHENTICATED!', 401, 'USER ID IS REQUIRED!');
    }

    const post_id = req.params.post_id;

    const result = await like_model.checkIfLiked(user_id, post_id);
    return sendResponse.success<{ isLiked: boolean }>(res, result, 200);
  } catch (error) {
    console.error('[likeController] checkIfLiked error :', error);
    next(error);
  }
};

export default {
  handleLike,
  checkIfLiked,
};
