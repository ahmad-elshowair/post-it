import { Router } from 'express';
import { authLimiter, globalLimiter } from '../middlewares/rateLimiter.js';
import authentication from './apis/auth.routes.js';
import comments from './apis/comments.routes.js';
import follows from './apis/follow.routes.js';
import posts from './apis/posts.routes.js';
import uploadRouter from './apis/upload.routes.js';
import users from './apis/users.routes.js';
const routes: Router = Router();

// Apply strict rate limiting to authentication routes
routes.use('/auth', authLimiter, authentication);

// Apply global rate limiting to all other application routes
routes.use(globalLimiter);

routes.use('/users', users);
routes.use('/posts', posts);
routes.use('/follows', follows);
routes.use('/upload', uploadRouter);
routes.use('/comments', comments);

export default routes;
