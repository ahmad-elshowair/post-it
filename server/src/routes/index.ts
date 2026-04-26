import { Router } from 'express';
import {
  globalLimiter,
  loginLimiter,
  registerLimiter,
  refreshLimiter,
} from '../middlewares/rateLimiter.js';
import authentication from './apis/auth.routes.js';
import bookmarks from './apis/bookmarks.routes.js';
import comments from './apis/comments.routes.js';
import follows from './apis/follow.routes.js';
import posts from './apis/posts.routes.js';
import uploadRouter from './apis/upload.routes.js';
import users from './apis/users.routes.js';
const routes: Router = Router();

// Strict limiter on credential endpoints (brute-force protection)
routes.use('/auth/login', loginLimiter);
routes.use('/auth/register', registerLimiter);

// Dedicated refresh limiter keyed by cookie hash
routes.use('/auth/refresh-token', refreshLimiter);

// Global limiter for everything
routes.use(globalLimiter);

// Route groups (logout and is-authenticated fall under global limiter only)
routes.use('/auth', authentication);
routes.use('/users', users);
routes.use('/posts', posts);
routes.use('/bookmarks', bookmarks);
routes.use('/comments', comments);
routes.use('/follows', follows);
routes.use('/upload', uploadRouter);

export default routes;
