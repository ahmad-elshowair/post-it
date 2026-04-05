import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import CommentModel from '../models/comments.js';
import { IComment } from '../types/comments.js';
import { sendResponse } from '../utilities/response.js';

const comment_model = new CommentModel();

const createComment = async (req: ICustomRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'Validation Error', 400, errors.array());
    }
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'User Authentication Required', 401);
    }

    const { post_id, content, parent_comment_id } = req.body;

    const comment: IComment = {
      user_id,
      post_id,
      content,
      parent_comment_id: parent_comment_id || null,
    };
    const createdComment = await comment_model.create(comment);
    return sendResponse.success<IComment>(res, createdComment, 201);
  } catch (error) {
    console.error('[CommentController]: createComment error: ', error);
    return sendResponse.error(
      res,
      'An error occurred while creating the comment',
      500,
      (error as Error).message,
    );
  }
};

const updateComment = async (req: ICustomRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'Validation Error', 400, errors.array());
    }

    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'User authentication required', 401);
    }

    const commentId = req.params.comment_id;
    const { content } = req.body;

    try {
      const updatedComment = await comment_model.update(commentId, content, user_id);
      return sendResponse.success<IComment>(res, updatedComment, 200);
    } catch (error) {
      if ((error as Error).message.includes('comment not found')) {
        return sendResponse.error(
          res,
          "Comment not found or you don't have permission to update it",
          404,
          (error as Error).message,
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('[CommentController]: updateComment error: ', error);
    return sendResponse.error(
      res,
      'An error occurred while updating the comment',
      500,
      (error as Error).message,
    );
  }
};

const deleteComment = async (req: ICustomRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'Validation Error', 400, errors.array());
    }

    const user_id = req.user?.id;

    if (!user_id) {
      return sendResponse.error(res, 'User authentication required', 401);
    }

    const commentId = req.params.comment_id;

    try {
      const deletedComment = await comment_model.delete(commentId, user_id);
      return sendResponse.success(res, deletedComment.message);
    } catch (error) {
      if ((error as Error).message.includes('comment not found')) {
        return sendResponse.error(
          res,
          "Comment not found or you don't have permission to delete it",
          404,
          (error as Error).message,
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('[CommentController]: deleteComment error: ', error);
    return sendResponse.error(
      res,
      'An error occurred while deleting the comment',
      500,
      (error as Error).message,
    );
  }
};

const getCommentsByPostId = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'Validation Error', 400, errors.array());
    }
    const post_id = req.params.post_id;

    if (!post_id) {
      return sendResponse.error(res, 'Post ID is required', 400);
    }

    const comments = await comment_model.getCommentsByPostId(post_id);

    // ORGANIZE COMMENTS INTO HIERARCHICAL STRUCTURES.
    const topLevelComments = comments.filter((comment) => !comment.parent_comment_id);
    const commentsReplies = comments.filter((comment) => comment.parent_comment_id);
    return sendResponse.success<{
      comments: IComment[];
      replies: IComment[];
    }>(
      res,
      {
        comments: topLevelComments,
        replies: commentsReplies,
      },
      200,
    );
  } catch (error) {
    console.error('[CommentController]: getCommentsByPostId error: ', error);
    return sendResponse.error(
      res,
      'An error occurred while fetching the comments',
      500,
      (error as Error).message,
    );
  }
};

const getRepliesByCommentId = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, 'Validation Error', 400, errors.array());
    }

    const comment_id = req.params.comment_id;

    if (!comment_id) {
      return sendResponse.error(res, 'Comment ID is required', 400);
    }

    const replies = await comment_model.getRepliesByCommentId(comment_id);
    return sendResponse.success<IComment[]>(res, replies, 200);
  } catch (error) {
    console.error('[CommentController]: getRepliesByCommentId error: ', error);
    return sendResponse.error(
      res,
      'An error occurred while fetching the replies',
      500,
      (error as Error).message,
    );
  }
};

export default {
  createComment,
  deleteComment,
  getCommentsByPostId,
  getRepliesByCommentId,
  updateComment,
};
