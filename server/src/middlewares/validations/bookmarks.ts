import { param } from 'express-validator';

export const validateBookmarkAction = [
  param('post_id')
    .notEmpty()
    .withMessage('Post ID is required')
    .isUUID()
    .withMessage('Post ID must be a valid UUID'),
];
