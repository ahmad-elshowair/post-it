import { Router } from "express";
import followController from "../../controllers/follows.controller.js";
import authorize_user from "../../middlewares/auth.js";
import {
  validateFollowAction,
  validateIsFollowedAction,
} from "../../middlewares/validations/follow.js";

// create an instance of Router for follow

const followRouter = Router();

followRouter.post(
  "/follow",
  authorize_user,
  validateFollowAction,
  followController.followUser
);

followRouter.delete(
  "/unfollow",
  authorize_user,
  validateFollowAction,
  followController.unFollowUser
);

followRouter.get(
  "/num-followings",
  authorize_user,
  followController.getNumberOfFollowings
);

followRouter.get(
  "/num-followers",
  authorize_user,
  followController.getNumberOfFollowers
);

followRouter.get("/followings", authorize_user, followController.getFollowings);

followRouter.get("/followers", authorize_user, followController.getFollowers);

followRouter.get(
  "/is-followed/:followed_id",
  authorize_user,
  validateIsFollowedAction,
  followController.isFollowed
);

export default followRouter;
