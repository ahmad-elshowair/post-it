import { Router } from 'express';
import bookmarksController from '../../controllers/bookmarks.controller.js';
import authorize_user from '../../middlewares/auth.js';
import { contentCreationLimiter } from '../../middlewares/rateLimiter.js';
import { paginationValidator } from '../../middlewares/validations/pagination.js';
import { validateBookmarkAction } from '../../middlewares/validations/bookmarks.js';

// ───── BOOKMARK ROUTES ──────────────────────────────
const bookmarkRoute: Router = Router();

bookmarkRoute.get('/', authorize_user, paginationValidator, bookmarksController.getBookmarks);

bookmarkRoute.get(
  '/is-bookmarked/:post_id',
  authorize_user,
  validateBookmarkAction,
  bookmarksController.checkBookmark,
);

bookmarkRoute.post(
  '/:post_id',
  authorize_user,
  contentCreationLimiter,
  validateBookmarkAction,
  bookmarksController.toggle,
);

export default bookmarkRoute;
