import { body, param } from 'express-validator';

/**
 * Valid token scopes for API token permissions.
 */
const VALID_SCOPES = ['read', 'write'];

/**
 * Validation rules for creating a new API token.
 * Validates token name, scopes, and optional expiration date.
 */
export const createTokenValidator = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Token name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
    .withMessage(
      'Token name can only contain letters, numbers, spaces, hyphens, underscores, and periods'
    )
    .escape(),

  body('scopes')
    .isArray({ min: 1 })
    .withMessage('Scopes must be a non-empty array')
    .custom((scopes) => {
      if (!Array.isArray(scopes)) {
        throw new Error('Scopes must be an array');
      }

      const invalidScopes = scopes.filter(
        (scope) => !VALID_SCOPES.includes(scope)
      );
      if (invalidScopes.length > 0) {
        throw new Error(
          `Invalid scopes: ${invalidScopes.join(', ')}. Valid scopes are: ${VALID_SCOPES.join(', ')}`
        );
      }

      // Check for duplicates
      const uniqueScopes = [...new Set(scopes)];
      if (uniqueScopes.length !== scopes.length) {
        throw new Error('Duplicate scopes are not allowed');
      }

      return true;
    }),

  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiration date must be in ISO 8601 format')
    .custom((value) => {
      const expirationDate = new Date(value);
      const now = new Date();

      if (expirationDate <= now) {
        throw new Error('Expiration date must be in the future');
      }

      // Limit maximum expiration to 10 years from now for security
      const maxExpiration = new Date();
      maxExpiration.setFullYear(maxExpiration.getFullYear() + 10);

      if (expirationDate > maxExpiration) {
        throw new Error(
          'Expiration date cannot be more than 10 years in the future'
        );
      }

      return true;
    }),
];

/**
 * Validation rules for updating an existing API token.
 * Validates optional fields for token updates.
 */
export const updateTokenValidator = [
  param('id').isUUID(4).withMessage('Token ID must be a valid UUID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Token name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
    .withMessage(
      'Token name can only contain letters, numbers, spaces, hyphens, underscores, and periods'
    )
    .escape(),

  body('scopes')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Scopes must be a non-empty array')
    .custom((scopes) => {
      if (!Array.isArray(scopes)) {
        throw new Error('Scopes must be an array');
      }

      const invalidScopes = scopes.filter(
        (scope) => !VALID_SCOPES.includes(scope)
      );
      if (invalidScopes.length > 0) {
        throw new Error(
          `Invalid scopes: ${invalidScopes.join(', ')}. Valid scopes are: ${VALID_SCOPES.join(', ')}`
        );
      }

      // Check for duplicates
      const uniqueScopes = [...new Set(scopes)];
      if (uniqueScopes.length !== scopes.length) {
        throw new Error('Duplicate scopes are not allowed');
      }

      return true;
    }),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
];

/**
 * Validation rules for token ID parameters.
 * Validates UUID format for token identification.
 */
export const tokenIdValidator = [
  param('id').isUUID(4).withMessage('Token ID must be a valid UUID'),
];

/**
 * Validation rules for getting token information.
 * Same as tokenIdValidator but with clearer naming.
 */
export const getTokenValidator = tokenIdValidator;

/**
 * Validation rules for deleting a token.
 * Same as tokenIdValidator but with clearer naming.
 */
export const deleteTokenValidator = tokenIdValidator;
