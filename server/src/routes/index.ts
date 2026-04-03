import { Router } from "express";
import { authLimiter, globalLimiter } from "../middlewares/rateLimiter";
import authentication from "./apis/auth.routes";
import comments from "./apis/comments.routes";
import follows from "./apis/follow.routes";
import posts from "./apis/posts.routes";
import uploadRouter from "./apis/upload.routes";
import users from "./apis/users.routes";
const routes: Router = Router();

// Apply strict rate limiting to authentication routes
routes.use("/auth", authLimiter, authentication);

// Apply global rate limiting to all other application routes
routes.use(globalLimiter);

routes.use("/users", users);
routes.use("/posts", posts);
routes.use("/follows", follows);
routes.use("/upload", uploadRouter);
routes.use("/comments", comments);

export default routes;
