import { body } from "express-validator";
import { validateUUID } from "./common.js";

export const createCommentValidator = [
  body("post_id")
    .notEmpty()
    .withMessage("Post ID is required")
    .isUUID()
    .withMessage("Post ID must be a valid UUID"),
  body("content")
    .notEmpty()
    .withMessage("Comment Content is required")
    .isLength({ min: 1, max: 500 })
    .withMessage("Comment Content must be between 1 and 500 characters"),
  body("parent_comment_id")
    .optional()
    .isUUID()
    .withMessage("Parent Comment ID must be a valid UUID"),
];

export const updateCommentValidator = [
  ...validateUUID("comment_id", "Comment ID"),
  body("content")
    .notEmpty()
    .withMessage("Comment Content is required")
    .isLength({ min: 1, max: 500 })
    .withMessage("Comment Content must be between 1 and 500 characters"),
];

export const deleteCommentValidator = validateUUID("comment_id", "Comment ID");

export const getCommentsByPostIdValidator = validateUUID("post_id", "Post ID");

export const getRepliesByCommentIdValidator = validateUUID(
  "comment_id",
  "Comment ID"
);
