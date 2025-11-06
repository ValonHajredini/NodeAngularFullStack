import { body, ValidationChain } from 'express-validator';

/**
 * Test Tool Validation Middleware
 *
 * Express-validator middleware for validating Test Tool requests.
 */

/**
 * Validation rules for creating Test Tool record.
 */
export const validateTestToolCreate: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Test Tool name is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Test Tool name must be between 3 and 255 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('createdBy')
    .notEmpty()
    .withMessage('Created by user ID is required')
    .isUUID()
    .withMessage('Created by must be a valid UUID'),
];

/**
 * Validation rules for updating Test Tool record.
 */
export const validateTestToolUpdate: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Test Tool name cannot be empty')
    .isLength({ min: 3, max: 255 })
    .withMessage('Test Tool name must be between 3 and 255 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
];
