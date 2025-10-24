import { body, param } from 'express-validator';

/**
 * Validation rules for short links endpoints
 */
export const generateLinkValidation = [
  body('originalUrl')
    .notEmpty()
    .withMessage('Original URL is required')
    .isURL({ require_protocol: true })
    .withMessage('Must be a valid URL with protocol (http:// or https://)'),

  body('resourceType')
    .optional()
    .isIn(['form', 'survey', 'svg', 'generic'])
    .withMessage('Resource type must be: form, survey, svg, or generic'),

  body('resourceId')
    .optional()
    .isUUID()
    .withMessage('Resource ID must be a valid UUID'),

  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be in ISO 8601 format'),

  body('token')
    .optional()
    .isString()
    .withMessage('Token must be a string'),
];

export const updateLinkValidation = [
  param('id')
    .isUUID()
    .withMessage('Link ID must be a valid UUID'),

  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be in ISO 8601 format'),

  body('token')
    .optional()
    .isString()
    .withMessage('Token must be a string'),
];

export const linkIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Link ID must be a valid UUID'),
];

export const shortCodeValidation = [
  param('shortCode')
    .notEmpty()
    .withMessage('Short code is required')
    .isAlphanumeric()
    .withMessage('Short code must contain only letters and numbers')
    .isLength({ min: 6, max: 10 })
    .withMessage('Short code must be between 6 and 10 characters'),
];
