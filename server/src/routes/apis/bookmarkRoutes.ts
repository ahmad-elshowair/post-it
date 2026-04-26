import { Router } from 'express';
import bookmarkController from '../../controllers/bookmarkController.js';
import authorize_user from '../../middlewares/auth.js';
import { contentCreationLimiter } from '../../middlewares/rateLimiter.js';
import { validateBookmarkAction } from '../../middlewares/validations/bookmarks.js';

// ───── BOOKMARK ROUTES ──────────────────────────────
const bookmarkRoute: Router = Router();

bookmarkRoute.post(
  '/:post_id',
  authorize_user,
  contentCreationLimiter,
  validateBookmarkAction,
  bookmarkController.toggle,
);

export default bookmarkRoute;
