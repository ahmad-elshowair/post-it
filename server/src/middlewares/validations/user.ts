import { body, param, query } from 'express-validator';
import { validateUUID } from './common.js';
import { paginationValidator } from './pagination.js';

export const validateGetUsers = paginationValidator;

export const validateUpdateUser = [
  ...validateUUID('user_id', 'User ID'),

  body('user_name')
    .optional()
    .isString()
    .withMessage('Username must be a string')
    .isLength({
      min: 3,
      max: 30,
    })
    .withMessage('Username must be between 3 and 30 characters long')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be alphanumeric with underscores and hyphens only'),

  body('first_name')
    .optional()
    .isString()
    .withMessage('First name must be a string')
    .isLength({ min: 3, max: 50 })
    .withMessage('First name must be between 3 and 50 characters long'),

  body('last_name')
    .optional()
    .isString()
    .withMessage('Last name must be a string')
    .isLength({ min: 3, max: 50 })
    .withMessage('Last name must be between 3 and 50 characters long'),

  body('email').optional().isEmail().withMessage('Email must be a valid email address'),

  body('bio')
    .optional()
    .trim()
    .escape()
    .isString()
    .withMessage('Bio must be a string')
    .isLength({ max: 500 })
    .withMessage('Bio must be between 0 and 500 characters long'),

  body('marital_status')
    .optional()
    .isIn(['single', 'married', 'divorced', 'widowed', ''])
    .withMessage('Invalid marital status'),
];

export const validateDeleteUser = validateUUID('user_id', 'User ID');

export const validateGetUserById = validateUUID('user_id', 'User ID');

export const validateGetUserByUsername = [
  param('user_name')
    .notEmpty()
    .withMessage('User name is required')
    .isString()
    .withMessage('User name must be a string')
    .isLength({ min: 3, max: 30 })
    .withMessage('User name must be between 3 and 30 characters long')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('User name must be alphanumeric with underscores and hyphens only'),
];

export const validateGetFriends = [
  ...validateUUID('user_id', 'User ID'),

  query('is_online')
    .optional()
    .custom((value) => {
      if (value === 'true' || value === 'false' || value === '1' || value === '0') {
        return true;
      }
      throw new Error('is_online must be a boolean value');
    }),
];
