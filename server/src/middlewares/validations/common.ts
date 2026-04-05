import { param } from 'express-validator';

export const validateUUID = (field: string, message: string) => [
  param(field)
    .notEmpty()
    .withMessage(`${message} is required`)
    .isUUID()
    .withMessage(`${message} must be valid UUID`),
];
