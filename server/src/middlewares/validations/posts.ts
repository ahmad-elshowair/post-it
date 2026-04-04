import { body } from "express-validator";
import { validateUUID } from "./common.js";

export const createPostValidator = [
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 500 })
    .withMessage("Description must be less than 500 characters"),

  body("image").optional().isString().withMessage("Image must be string URL"),
];

export const updatePostValidator = [
  ...validateUUID("post_id", "Post ID"),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must be less than 500 characters"),

  body("image").optional().isString().withMessage("Image must be string URL"),
];

export const userPostsValidator = [...validateUUID("user_id", "User ID")];

export const deletePostValidator = validateUUID("post_id", "Post ID");
export const getPostByIdValidator = validateUUID("post_id", "Post ID");
export const getPostsValidator = validateUUID("post_id", "Post ID");
