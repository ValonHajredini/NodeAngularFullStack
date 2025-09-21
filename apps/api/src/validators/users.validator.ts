import { body, param, query } from 'express-validator';
import { usersService } from '../services/users.service';

/**
 * Password validation regex requiring:
 * - At least 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special character
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

/**
 * Validation rules for creating a new user.
 * Validates email uniqueness, password strength, and required fields.
 */
export const createUserValidator = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .custom(async (email, { req }) => {
      const tenantId = req.user?.tenantId;
      const exists = await usersService.emailExists(email, tenantId);
      if (exists) {
        throw new Error('Email already exists');
      }
      return true;
    }),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(PASSWORD_REGEX)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, apostrophes, and periods')
    .escape(),

  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, apostrophes, and periods')
    .escape(),

  body('role')
    .optional()
    .isIn(['admin', 'user', 'readonly'])
    .withMessage('Role must be one of: admin, user, readonly'),

  body('tenantId')
    .optional()
    .isUUID()
    .withMessage('Tenant ID must be a valid UUID')
];

/**
 * Validation rules for updating a user (PUT - full replacement).
 * All fields except password are required for full replacement.
 */
export const updateUserValidator = [
  param('id')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),

  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .custom(async (email, { req }) => {
      const userId = req.params?.id;
      const tenantId = req.user?.tenantId;

      if (userId) {
        const existingUser = await usersService.getUserByEmail(email, tenantId);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Email already exists');
        }
      }
      return true;
    }),

  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, apostrophes, and periods')
    .escape(),

  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, apostrophes, and periods')
    .escape(),

  body('role')
    .isIn(['admin', 'user', 'readonly'])
    .withMessage('Role must be one of: admin, user, readonly'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  body('emailVerified')
    .optional()
    .isBoolean()
    .withMessage('emailVerified must be a boolean value')
];

/**
 * Validation rules for partially updating a user (PATCH).
 * All fields are optional but at least one must be provided.
 */
export const patchUserValidator = [
  param('id')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .custom(async (email, { req }) => {
      const userId = req.params?.id;
      const tenantId = req.user?.tenantId;

      if (userId && email) {
        const existingUser = await usersService.getUserByEmail(email, tenantId);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Email already exists');
        }
      }
      return true;
    }),

  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, apostrophes, and periods')
    .escape(),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, apostrophes, and periods')
    .escape(),

  body('role')
    .optional()
    .isIn(['admin', 'user', 'readonly'])
    .withMessage('Role must be one of: admin, user, readonly'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),

  body('emailVerified')
    .optional()
    .isBoolean()
    .withMessage('emailVerified must be a boolean value'),

  // Custom validator to ensure at least one field is provided
  body()
    .custom((_value, { req }) => {
      const allowedFields = ['email', 'firstName', 'lastName', 'role', 'isActive', 'emailVerified'];
      const providedFields = Object.keys(req.body).filter(key => allowedFields.includes(key));

      if (providedFields.length === 0) {
        throw new Error('At least one field must be provided for update');
      }

      return true;
    })
];

/**
 * Validation rules for user ID parameter.
 */
export const userIdValidator = [
  param('id')
    .isUUID()
    .withMessage('User ID must be a valid UUID')
];

/**
 * Validation rules for user list query parameters.
 * Validates pagination, search, and filter parameters.
 */
export const getUsersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s@._-]+$/)
    .withMessage('Search term contains invalid characters')
    .escape(),

  query('role')
    .optional()
    .isIn(['admin', 'user', 'readonly'])
    .withMessage('Role filter must be one of: admin, user, readonly'),

  query('status')
    .optional()
    .isIn(['active', 'inactive', 'all'])
    .withMessage('Status filter must be one of: active, inactive, all')
];

/**
 * Validation rules for password update.
 */
export const updatePasswordValidator = [
  param('id')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(PASSWORD_REGEX)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('currentPassword')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Current password is required for password changes')
];

/**
 * Sanitization middleware to remove sensitive fields from request body.
 * Prevents users from setting internal fields directly.
 */
export const sanitizeUserInput = (req: any, _res: any, next: any) => {
  // Remove sensitive/internal fields that users shouldn't be able to set
  const sensitiveFields = ['id', 'passwordHash', 'createdAt', 'updatedAt', 'lastLogin'];

  sensitiveFields.forEach(field => {
    delete req.body[field];
  });

  // Ensure tenantId comes from authenticated user, not request body
  if (req.user?.tenantId) {
    req.body.tenantId = req.user.tenantId;
  }

  next();
};

/**
 * XSS protection middleware for user input.
 * Additional layer of protection against XSS attacks.
 */
export const xssProtection = (req: any, res: any, next: any) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi
  ];

  const checkForXSS = (value: string): boolean => {
    return xssPatterns.some(pattern => pattern.test(value));
  };

  const validateObject = (obj: any): void => {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && checkForXSS(value)) {
        throw new Error(`Potential XSS attack detected in field: ${key}`);
      } else if (typeof value === 'object' && value !== null) {
        validateObject(value);
      }
    }
  };

  try {
    if (req.body) {
      validateObject(req.body);
    }
    next();
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'SECURITY_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
};