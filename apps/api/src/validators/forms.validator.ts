import { body, param } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { FormStatus } from '@nodeangularfullstack/shared';

/**
 * Validation rules for creating a new form.
 * Validates title, description, and schema structure.
 */
export const createFormValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters')
    .escape(), // XSS protection

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters')
    .escape(), // XSS protection

  body('status')
    .optional()
    .isIn([FormStatus.DRAFT, FormStatus.PUBLISHED])
    .withMessage('Status must be either draft or published'),

  body('schema')
    .optional()
    .isObject()
    .withMessage('Schema must be a valid object'),

  body('schema.fields')
    .optional()
    .isArray()
    .withMessage('Schema fields must be an array'),
];

/**
 * Validation rules for updating a form.
 * All fields are optional for update.
 */
export const updateFormValidator = [
  param('id').isUUID().withMessage('Invalid form ID format'),

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty if provided')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters')
    .escape(), // XSS protection

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters')
    .escape(), // XSS protection

  body('status')
    .optional()
    .isIn([FormStatus.DRAFT, FormStatus.PUBLISHED])
    .withMessage('Status must be either draft or published'),

  body('schema')
    .optional()
    .isObject()
    .withMessage('Schema must be a valid object'),

  body('schema.fields')
    .optional()
    .isArray()
    .withMessage('Schema fields must be an array'),
];

/**
 * Validation rules for form ID parameter.
 */
export const formIdValidator = [
  param('id').isUUID().withMessage('Invalid form ID'),
];

/**
 * Custom middleware to validate form schema structure.
 * Checks for duplicate field names and validates regex patterns.
 */
export const validateFormSchema = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const schema = req.body.schema;

  if (!schema || !schema.fields) {
    next();
    return;
  }

  const errors: string[] = [];

  // Check for duplicate field names
  const fieldNames = new Set<string>();
  const duplicates = new Set<string>();

  schema.fields.forEach(
    (field: {
      fieldName?: string;
      label?: string;
      validation?: { pattern?: string };
    }) => {
      if (!field.fieldName) {
        errors.push('All fields must have a fieldName property');
        return;
      }

      if (fieldNames.has(field.fieldName)) {
        duplicates.add(field.fieldName);
      } else {
        fieldNames.add(field.fieldName);
      }

      // Validate regex patterns if present
      if (field.validation?.pattern) {
        try {
          new RegExp(field.validation.pattern);
        } catch (error) {
          errors.push(
            `Invalid regex pattern for field ${field.fieldName}: ${field.validation.pattern}`
          );
        }
      }

      // Validate field label (XSS protection)
      if (field.label) {
        const xssPatterns = [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
        ];

        const label = field.label; // Type narrowing
        const hasXSS = xssPatterns.some((pattern) => pattern.test(label));
        if (hasXSS) {
          errors.push(
            `Field label contains potentially malicious content: ${field.fieldName}`
          );
        }
      }
    }
  );

  // Report duplicate field names
  if (duplicates.size > 0) {
    duplicates.forEach((name) => {
      errors.push(`Duplicate field name found: ${name}`);
    });
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'SCHEMA_VALIDATION_ERROR',
        message: 'Schema validation failed',
        details: errors,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * XSS protection middleware for form inputs.
 * Additional layer of protection against XSS attacks in title, description, and field labels.
 */
export const xssProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  const checkForXSS = (value: string): boolean => {
    return xssPatterns.some((pattern) => pattern.test(value));
  };

  const validateObject = (
    obj: Record<string, unknown>,
    path: string = ''
  ): void => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string' && checkForXSS(value)) {
        throw new Error(
          `Potential XSS attack detected in field: ${currentPath}`
        );
      } else if (typeof value === 'object' && value !== null) {
        validateObject(value as Record<string, unknown>, currentPath);
      }
    }
  };

  try {
    if (req.body && typeof req.body === 'object') {
      validateObject(req.body as Record<string, unknown>);
    }
    next();
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Security validation failed';
    res.status(400).json({
      success: false,
      error: {
        code: 'SECURITY_ERROR',
        message: errorMessage,
      },
      timestamp: new Date().toISOString(),
    });
  }
};
