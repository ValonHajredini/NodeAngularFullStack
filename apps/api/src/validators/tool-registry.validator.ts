import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Tool Registry Validation Middleware
 *
 * Provides express-validator middleware for validating tool registry requests.
 * Used by tool registry routes to ensure data integrity before reaching service layer.
 *
 * Validators:
 * - validateRegistration: Validates POST /api/tools/register requests
 * - validateUpdate: Validates PUT /api/tools/registry/:id requests
 */

/**
 * Handles validation errors from express-validator.
 * Returns formatted validation errors or continues to next middleware.
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
    return;
  }

  next();
}

/**
 * Validates tool registration request data.
 *
 * Checks:
 * - toolId: Required, kebab-case format
 * - name: Required, 3-255 characters
 * - version: Required, semver format (x.y.z)
 * - route: Required, starts with /tools/
 * - apiBase: Required, starts with /api/tools/
 * - permissions: Optional, array
 * - status: Optional, one of: alpha, beta, active, deprecated
 * - manifestJson: Required, object
 *
 * @type {ValidationChain[]}
 * @example
 * router.post('/register', authMiddleware, validateRegistration, controller.registerTool);
 */
export const validateRegistration = [
  body('toolId')
    .trim()
    .notEmpty()
    .withMessage('Tool ID is required')
    .matches(/^[a-z][a-z0-9-]*$/)
    .withMessage('Tool ID must be lowercase kebab-case'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tool name is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Tool name must be 3-255 characters'),

  body('version')
    .trim()
    .notEmpty()
    .withMessage('Version is required')
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage('Version must be semver format (e.g., 1.0.0)'),

  body('route')
    .trim()
    .notEmpty()
    .withMessage('Route is required')
    .matches(/^\/tools\/[a-z][a-z0-9-]*$/)
    .withMessage('Route must be /tools/{tool-id}'),

  body('apiBase')
    .trim()
    .notEmpty()
    .withMessage('API base is required')
    .matches(/^\/api\/tools\/[a-z][a-z0-9-]*$/)
    .withMessage('API base must be /api/tools/{tool-id}'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be 1-500 characters'),

  body('icon').optional().isString().withMessage('Icon must be a string'),

  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),

  body('status')
    .optional()
    .isIn(['alpha', 'beta', 'active', 'deprecated'])
    .withMessage('Invalid status'),

  body('manifestJson')
    .notEmpty()
    .withMessage('Tool manifest is required')
    .isObject()
    .withMessage('Manifest must be a JSON object'),

  handleValidationErrors,
];

/**
 * Validates tool update request data.
 *
 * All fields are optional for partial updates:
 * - name: Optional, 3-255 characters
 * - version: Optional, semver format (x.y.z)
 * - status: Optional, one of: alpha, beta, active, deprecated
 *
 * @type {ValidationChain[]}
 * @example
 * router.put('/registry/:id', authMiddleware, validateUpdate, controller.updateTool);
 */
export const validateUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Tool name must be 3-255 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be 1-500 characters'),

  body('version')
    .optional()
    .trim()
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage('Version must be semver format'),

  body('icon').optional().isString().withMessage('Icon must be a string'),

  body('status')
    .optional()
    .isIn(['alpha', 'beta', 'active', 'deprecated'])
    .withMessage('Invalid status'),

  handleValidationErrors,
];
