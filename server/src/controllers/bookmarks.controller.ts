import { NextFunction, Response } from 'express';
import { validationResult } from 'express-validator';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { IPaginatedResult } from '../interfaces/IPagination.js';
import { TBookmark } from '../types/bookmark.js';
import { createPaginationResult, getCursorPaginationOptions } from '../utilities/pagination.js';
import { sendResponse } from '../utilities/response.js';
import { bookmark_model } from './factory.js';

/**
 * Toggle bookmark on/off for a post.
 * @route POST /api/bookmarks/:post_id
 * @returns 200 with bookmark record or unbookmark confirmation, 404 if post not found
 */
const toggle = async (req: ICustomRequest, res: Response, next: NextFunction) => {
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

    const result = await bookmark_model.toggle(user_id, post_id);

    if (result.action === 'unbookmarked') {
      return sendResponse.success<{ bookmark_id: string; action: 'unbookmarked' }>(
        res,
        result,
        200,
      );
    }

    return sendResponse.success<{ bookmark_id: string; action: 'bookmarked' }>(res, result, 200);
  } catch (error) {
    if ((error as Error).message === 'Post not found') {
      return sendResponse.error(res, 'Post not found', 404);
    }
    console.error('[bookmarksController] toggle error :', error);
    next(error);
  }
};

/**
 * Retrieve a paginated list of the authenticated user's bookmarks.
 * @route GET /api/bookmarks
 * @returns 200 with paginated bookmarks, or 401 if unauthenticated
 */
const getBookmarks = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR!', 400, errors.array());
    }

    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'UNAUTHENTICATED!', 401, 'USER ID IS REQUIRED!');
    }

    const options = getCursorPaginationOptions(req);
    options.originalLimit = Math.min(options.originalLimit, 50);
    options.limit = options.originalLimit + 1;

    const bookmarks = await bookmark_model.getUserBookmarks(
      user_id,
      options.limit,
      options.cursor,
      options.direction,
    );

    const result = createPaginationResult(bookmarks, options, 'bookmark_id');

    return sendResponse.success<IPaginatedResult<TBookmark>>(res, result, 200);
  } catch (error) {
    console.error('[bookmarksController] getBookmarks error :', error);
    next(error);
  }
};

export default {
  toggle,
  getBookmarks,
};
