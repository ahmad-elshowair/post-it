import { body } from "express-validator";
import { validateUUID } from "./common.js";

export const validateFollowAction = [
  body("user_id_followed")
    .notEmpty()
    .withMessage("User ID followed is required")
    .isUUID()
    .withMessage("User ID followed must be valid UUID"),
];

export const validateIsFollowedAction = validateUUID(
  "followed_id",
  "Followed ID"
);
