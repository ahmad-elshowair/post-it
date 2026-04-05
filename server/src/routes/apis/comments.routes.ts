import { Router } from 'express';
import { contentCreationLimiter } from '../../middlewares/rateLimiter.js';
import commentController from '../../controllers/comments.controller.js';
import authorize_user from '../../middlewares/auth.js';
import {
  createCommentValidator,
  deleteCommentValidator,
  getRepliesByCommentIdValidator,
  updateCommentValidator,
} from '../../middlewares/validations/comments.js';

const router = Router();

// ───── CONTENT CREATION & MODIFICATION ROUTES (RATE LIMITED) ────────────────────────

router.post(
  '/create',
  authorize_user,
  contentCreationLimiter,
  createCommentValidator,
  commentController.createComment,
);

router.put(
  '/update/:comment_id',
  authorize_user,
  contentCreationLimiter,
  updateCommentValidator,
  commentController.updateComment,
);

router.delete(
  '/delete/:comment_id',
  authorize_user,
  contentCreationLimiter,
  deleteCommentValidator,
  commentController.deleteComment,
);

// ───── CONTENT RETRIEVAL ROUTES ──────────────────────────────

router.get(
  '/:comment_id/replies',
  authorize_user,
  getRepliesByCommentIdValidator,
  commentController.getRepliesByCommentId,
);

export default router;
