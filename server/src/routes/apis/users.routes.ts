import { Router } from "express";
import userController from "../../controllers/users.controller.js";
import authorizeUser from "../../middlewares/auth.js";
import { paginationValidator } from "../../middlewares/validations/pagination.js";
import {
  validateDeleteUser,
  validateGetFriends,
  validateGetUserByUsername,
  validateGetUsers,
  validateUpdateUser,
} from "../../middlewares/validations/user.js";
const userRoute: Router = Router();

userRoute.get("/unknowns", authorizeUser, userController.getUnknownUsers);
userRoute.get("/", authorizeUser, validateGetUsers, userController.getUsers);

userRoute.get(
  "/:user_name",
  authorizeUser,
  validateGetUserByUsername,
  userController.getUserByUsername
);

userRoute.put(
  "/update/:user_id",
  authorizeUser,
  validateUpdateUser,
  userController.update
);

userRoute.delete(
  "/delete/:user_id",
  authorizeUser,
  validateDeleteUser,
  userController.deleteUser
);

userRoute.get(
  "/friends/:user_id",
  authorizeUser,
  validateGetFriends,
  paginationValidator,
  userController.getFriends
);

export default userRoute;
