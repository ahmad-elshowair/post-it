import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { IPaginatedResult } from '../interfaces/IPagination.js';
import { IFeedPost } from '../interfaces/IPost.js';
import { Post } from '../types/post.js';
import { createPaginationResult, getCursorPaginationOptions } from '../utilities/pagination.js';
import { sendResponse } from '../utilities/response.js';
import { post_model } from './factory.js';

/**
 * Create a new post.
 * @route POST /api/posts/create
 * @returns 201 with the created post
 */
const create = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR', 400, errors.array());
    }

    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'AUTHENTICATION REQUIRED', 401);
    }

    const post: Post = {
      user_id,
      description: req.body.description,
      image: req.body.image,
    };
    const createPost = await post_model.create(post);
    return sendResponse.success<Post>(res, createPost, 201);
  } catch (error) {
    console.error('[postController]  create error :', error);
    next(error);
  }
};

/**
 * Update an existing post.
 * @route PUT /api/posts/update/:post_id
 * @returns 200 with the updated post, or 403/404 on error
 */
const update = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR', 400, errors.array());
    }

    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'AUTHENTICATION REQUIRED', 401);
    }
    const post_id = req.params.post_id;
    const post = req.body;

    try {
      const existingPost = await post_model.fetchPostById(post_id);
      if (existingPost.user_id !== user_id) {
        return sendResponse.error(res, 'YOU ARE NOT AUTHORIZED TO UPDATE THIS POST!', 403);
      }
      const updatedPost = await post_model.update(req.params.post_id, post);
      return sendResponse.success<Post>(res, updatedPost);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return sendResponse.error(res, 'POST NOT FOUND', 404);
      }
      throw error;
    }
  } catch (error) {
    console.error('[postController] update error :', error);

    next(error);
  }
};

/**
 * Retrieve a single post by ID.
 * @route GET /api/posts/:post_id
 * @returns 200 with the post object, or 404 if not found
 */
const getPostById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR', 400, errors.array());
    }
    const post_id = req.params.post_id;

    try {
      const post = await post_model.fetchPostById(post_id);
      return sendResponse.success<Post>(res, post);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return sendResponse.error(res, 'POST NOT FOUND', 404);
      }
      throw error;
    }
  } catch (error) {
    console.error('[postController] getPostById error :', error);
    next(error);
  }
};

/**
 * Retrieve a paginated list of all posts.
 * @route GET /api/posts/all
 * @returns 200 with a paginated result of posts
 */
const index = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR', 400, errors.array());
    }

    const paginationOptions = getCursorPaginationOptions(req);

    const { posts } = await post_model.index(
      paginationOptions.limit,
      paginationOptions.cursor,
      paginationOptions.direction,
    );

    const result = createPaginationResult(posts, paginationOptions, 'post_id');

    return sendResponse.success<IPaginatedResult<Post>>(res, result);
  } catch (error) {
    console.error('[postController] index error:', error);
    next(error);
  }
};

/**
 * Delete a post by ID.
 * @route DELETE /api/posts/delete/:post_id
 * @returns 200 on successful deletion, or 403/404 on error
 */
const deletePost = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR', 400, errors.array());
    }

    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'AUTHENTICATION REQUIRED', 401);
    }
    const post_id = req.params.post_id;
    try {
      const post = await post_model.fetchPostById(post_id);
      if (post.user_id !== user_id) {
        return sendResponse.error(res, 'YOU ARE NOT AUTHORIZED TO DELETE THIS POST!', 403);
      }
      const result = await post_model.delete(post_id);
      return sendResponse.success<{ message: string }>(res, result);
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return sendResponse.error(res, 'POST NOT FOUND', 404);
      }
      throw error;
    }
  } catch (error) {
    console.error('[postController] deletePost error:', error);
    next(error);
  }
};

/**
 * Retrieve a paginated list of posts for a specific user.
 * @route GET /api/posts/user/:user_id
 * @returns 200 with a paginated result of the user's posts
 */
const userPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR', 400, errors.array());
    }

    const user_id = req.params.user_id;
    const paginationOptions = getCursorPaginationOptions(req);

    const { posts } = await post_model.userPosts(
      user_id,
      paginationOptions.limit,
      paginationOptions.cursor,
      paginationOptions.direction,
    );

    const result = createPaginationResult(posts, paginationOptions, 'post_id');

    return sendResponse.success<IPaginatedResult<IFeedPost>>(res, result);
  } catch (error) {
    console.error('[postController] userPosts error:', error);
    next(error);
  }
};

/**
 * Retrieve a paginated feed of posts from the user and their followings.
 * @route GET /api/posts/feed
 * @returns 200 with a paginated result of feed posts
 */
const feed = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'VALIDATION ERROR', 400, errors.array());
    }

    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'AUTHENTICATION REQUIRED', 401);
    }

    const paginationOptions = getCursorPaginationOptions(req);

    const { posts } = await post_model.feed(
      user_id,
      paginationOptions.limit,
      paginationOptions.cursor,
      paginationOptions.direction,
    );

    const result = createPaginationResult(posts, paginationOptions, 'post_id');
    return sendResponse.success<IPaginatedResult<IFeedPost>>(res, result);
  } catch (error) {
    console.error('[postController] feed error:', error);
    next(error);
  }
};

export default {
  create,
  update,
  getPostById,
  index,
  deletePost,
  userPosts,
  feed,
};
