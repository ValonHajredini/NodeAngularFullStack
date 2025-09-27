import { body, param } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import xss from 'xss';
import { toolsService } from '../services/tools.service';

/**
 * Kebab-case validation regex requiring:
 * - Lowercase letters and numbers only
 * - Hyphens to separate words
 * - No leading or trailing hyphens
 * - No consecutive hyphens
 */
const KEBAB_CASE_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Validation rules for tool key parameter.
 * Validates that key is in proper kebab-case format.
 */
export const toolKeyValidator = [
  param('key')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Tool key must be between 2 and 50 characters')
    .matches(KEBAB_CASE_REGEX)
    .withMessage('Tool key must be in kebab-case format (e.g., "short-link")')
    .custom((key) => {
      // Additional validation for reserved words
      const reserved = ['admin', 'api', 'health', 'auth', 'docs'];
      if (reserved.includes(key)) {
        throw new Error(`Tool key '${key}' is reserved and cannot be used`);
      }
      return true;
    }),
];

/**
 * Validation rules for creating a new tool.
 * Validates key uniqueness, name, description, and optional active status.
 */
export const createToolValidator = [
  body('key')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Tool key must be between 2 and 50 characters')
    .matches(KEBAB_CASE_REGEX)
    .withMessage('Tool key must be in kebab-case format (e.g., "short-link")')
    .custom(async (key) => {
      // Check if tool key already exists
      const existingTool = await toolsService.getToolByKey(key);
      if (existingTool) {
        throw new Error(`Tool with key '${key}' already exists`);
      }

      // Additional validation for reserved words
      const reserved = ['admin', 'api', 'health', 'auth', 'docs'];
      if (reserved.includes(key)) {
        throw new Error(`Tool key '${key}' is reserved and cannot be used`);
      }

      return true;
    }),

  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Tool name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-'\.()&]+$/)
    .withMessage(
      'Tool name can only contain letters, numbers, spaces, hyphens, apostrophes, periods, parentheses, and ampersands'
    ),

  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Tool description must be between 10 and 500 characters')
    .matches(/^[a-zA-Z0-9\s\-'\.()&,;:!?\n]+$/)
    .withMessage(
      'Tool description can only contain letters, numbers, spaces, and common punctuation'
    ),

  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean value'),
];

/**
 * Validation rules for updating tool status.
 * Validates that active field is a boolean.
 */
export const updateToolStatusValidator = [
  body('active')
    .exists()
    .withMessage('Active status is required')
    .isBoolean()
    .withMessage('Active status must be a boolean value'),
];

/**
 * Validation rules for updating tool information.
 * Validates optional name, description, and active fields.
 */
export const updateToolValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Tool name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-'\.()&]+$/)
    .withMessage(
      'Tool name can only contain letters, numbers, spaces, hyphens, apostrophes, periods, parentheses, and ampersands'
    ),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Tool description must be between 10 and 500 characters')
    .matches(/^[a-zA-Z0-9\s\-'\.()&,;:!?\n]+$/)
    .withMessage(
      'Tool description can only contain letters, numbers, spaces, and common punctuation'
    ),

  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean value'),

  // Custom validation to ensure at least one field is provided
  body().custom((body) => {
    if (!body.name && !body.description && body.active === undefined) {
      throw new Error(
        'At least one field (name, description, or active) must be provided'
      );
    }
    return true;
  }),
];

/**
 * Middleware to sanitize tool input and prevent XSS attacks.
 * Sanitizes name and description fields while preserving safe formatting.
 */
export const sanitizeToolInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (req.body.name) {
      req.body.name = xss(req.body.name, {
        whiteList: {}, // No HTML tags allowed
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script'],
      });
    }

    if (req.body.description) {
      req.body.description = xss(req.body.description, {
        whiteList: {}, // No HTML tags allowed
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script'],
      });
    }

    if (req.body.key) {
      req.body.key = xss(req.body.key, {
        whiteList: {}, // No HTML tags allowed
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script'],
      });
    }

    next();
  } catch (error) {
    console.error('Error sanitizing tool input:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'SANITIZATION_ERROR',
        message: 'Invalid characters detected in input',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Enhanced XSS protection middleware for tools endpoints.
 * Provides additional security beyond basic sanitization.
 */
export const xssProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Set XSS protection headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // Check for potentially malicious patterns in request body
  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  ];

  const requestBodyString = JSON.stringify(req.body);

  for (const pattern of maliciousPatterns) {
    if (pattern.test(requestBodyString)) {
      console.warn('Potential XSS attack detected in tools request:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        pattern: pattern.source,
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'SECURITY_VIOLATION',
          message: 'Request contains potentially malicious content',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  next();
};
