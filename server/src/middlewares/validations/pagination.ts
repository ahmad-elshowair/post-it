import { query } from 'express-validator';

export const paginationValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be an integer between 1 and 50')
    .toInt(),

  query('cursor').optional().isString().withMessage('Cursor must be a string'),

  query('direction')
    .optional()
    .isIn(['next', 'previous'])
    .withMessage("Direction must be 'next' or 'previous'"),
];
