import { body, param } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import {
  FormStatus,
  FormFieldType,
  isInputField,
} from '@nodeangularfullstack/shared';
import { validateRegexPattern } from '../utils/safe-regex.util';

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

  body('themeId')
    .optional()
    .isUUID()
    .withMessage('Theme ID must be a valid UUID'),

  body('schema')
    .optional()
    .isObject()
    .withMessage('Schema must be a valid object'),

  body('schema.fields')
    .optional()
    .isArray()
    .withMessage('Schema fields must be an array'),

  body('schema.themeId')
    .optional()
    .isUUID()
    .withMessage('Theme ID must be a valid UUID'),
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

  body('themeId')
    .optional()
    .isUUID()
    .withMessage('Theme ID must be a valid UUID'),

  body('schema')
    .optional()
    .isObject()
    .withMessage('Schema must be a valid object'),

  body('schema.fields')
    .optional()
    .isArray()
    .withMessage('Schema fields must be an array'),

  body('schema.themeId')
    .optional()
    .isUUID()
    .withMessage('Theme ID must be a valid UUID'),
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

  if (!schema?.fields) {
    next();
    return;
  }

  const errors: string[] = [];

  // All valid field types from shared enum
  const allValidFieldTypes = Object.values(FormFieldType);

  // Check for duplicate field names (only for input fields)
  const fieldNames = new Set<string>();
  const duplicates = new Set<string>();

  schema.fields.forEach(
    (field: {
      type?: string;
      fieldName?: string;
      label?: string;
      parentGroupId?: string;
      validation?: {
        pattern?: string;
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
        errorMessage?: string;
      };
      metadata?: {
        groupTitle?: string;
        groupBorderStyle?: string;
        groupCollapsible?: boolean;
        groupBackgroundColor?: string;
        imageUrl?: string;
        imagePosition?: string;
        imageOpacity?: number;
        imageAlignment?: string;
        imageBlur?: number;
        html?: string; // Custom background HTML (will be sanitized)
        css?: string; // Custom background CSS (will be validated)
      };
    }) => {
      // Validate field type
      if (!field.type) {
        errors.push('All fields must have a type property');
        return;
      }

      if (!allValidFieldTypes.includes(field.type as FormFieldType)) {
        errors.push(`Invalid field type: ${field.type}`);
        return;
      }

      const fieldType = field.type as FormFieldType;

      // Validate fieldName requirement based on field category
      if (!field.fieldName) {
        // Display elements (heading, divider, group) may not need fieldName for submission
        // but we still require it for identification purposes
        errors.push('All fields must have a fieldName property');
        return;
      }

      // Check for duplicate field names (only matters for input fields)
      if (isInputField(fieldType)) {
        if (fieldNames.has(field.fieldName)) {
          duplicates.add(field.fieldName);
        } else {
          fieldNames.add(field.fieldName);
        }
      }

      // Validate regex patterns with ReDoS protection
      if (field.validation?.pattern) {
        const patternValidation = validateRegexPattern(
          field.validation.pattern
        );
        if (!patternValidation.valid) {
          errors.push(
            `Invalid regex pattern for field ${field.fieldName}: ${patternValidation.errors.join(', ')}`
          );
        }
      }

      // Validate other validation properties
      if (field.validation) {
        // Validate minLength (must be non-negative integer)
        if (field.validation.minLength !== undefined) {
          const minLength = field.validation.minLength as number;
          if (
            typeof minLength !== 'number' ||
            minLength < 0 ||
            !Number.isInteger(minLength)
          ) {
            errors.push(
              `Invalid minLength for field ${field.fieldName}: must be a non-negative integer`
            );
          }
        }

        // Validate maxLength (must be positive integer, greater than minLength if both present)
        if (field.validation.maxLength !== undefined) {
          const maxLength = field.validation.maxLength as number;
          if (
            typeof maxLength !== 'number' ||
            maxLength <= 0 ||
            !Number.isInteger(maxLength)
          ) {
            errors.push(
              `Invalid maxLength for field ${field.fieldName}: must be a positive integer`
            );
          } else if (
            field.validation.minLength !== undefined &&
            maxLength < (field.validation.minLength as number)
          ) {
            errors.push(
              `Invalid validation for field ${field.fieldName}: maxLength must be greater than or equal to minLength`
            );
          }
        }

        // Validate min (must be a number)
        if (field.validation.min !== undefined) {
          const min = field.validation.min as number;
          if (typeof min !== 'number') {
            errors.push(
              `Invalid min for field ${field.fieldName}: must be a number`
            );
          }
        }

        // Validate max (must be a number, greater than min if both present)
        if (field.validation.max !== undefined) {
          const max = field.validation.max as number;
          if (typeof max !== 'number') {
            errors.push(
              `Invalid max for field ${field.fieldName}: must be a number`
            );
          } else if (
            field.validation.min !== undefined &&
            max < (field.validation.min as number)
          ) {
            errors.push(
              `Invalid validation for field ${field.fieldName}: max must be greater than or equal to min`
            );
          }
        }

        // Validate errorMessage (must be string with max 500 characters)
        if (field.validation.errorMessage !== undefined) {
          const errorMessage = field.validation.errorMessage as string;
          if (typeof errorMessage !== 'string') {
            errors.push(
              `Invalid errorMessage for field ${field.fieldName}: must be a string`
            );
          } else if (errorMessage.length > 500) {
            errors.push(
              `Invalid errorMessage for field ${field.fieldName}: must not exceed 500 characters`
            );
          }
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

      // Validate parentGroupId if present
      if (field.parentGroupId) {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(field.parentGroupId)) {
          errors.push(
            `Invalid parentGroupId for field ${field.fieldName}: must be a valid UUID`
          );
        }
      }

      // Validate group-specific metadata for GROUP field type
      if (field.type === 'group' && field.metadata) {
        // Validate groupTitle
        if (
          field.metadata.groupTitle &&
          field.metadata.groupTitle.length > 100
        ) {
          errors.push(
            `Group title for field ${field.fieldName} exceeds 100 characters`
          );
        }

        // Validate groupBorderStyle
        if (field.metadata.groupBorderStyle) {
          const validBorderStyles = ['solid', 'dashed', 'none'];
          if (!validBorderStyles.includes(field.metadata.groupBorderStyle)) {
            errors.push(
              `Invalid groupBorderStyle for field ${field.fieldName}: must be solid, dashed, or none`
            );
          }
        }

        // Validate groupCollapsible
        if (
          field.metadata.groupCollapsible !== undefined &&
          typeof field.metadata.groupCollapsible !== 'boolean'
        ) {
          errors.push(
            `Invalid groupCollapsible for field ${field.fieldName}: must be a boolean`
          );
        }

        // Validate groupBackgroundColor (hex format)
        if (field.metadata.groupBackgroundColor) {
          const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
          if (!hexColorRegex.test(field.metadata.groupBackgroundColor)) {
            errors.push(
              `Invalid groupBackgroundColor for field ${field.fieldName}: must be a valid hex color`
            );
          }
        }
      }

      // Validate background-image specific metadata
      if (field.type === 'background-image' && field.metadata) {
        // Validate imageUrl (must be HTTP/HTTPS URL or data URL)
        if (field.metadata.imageUrl) {
          const urlRegex = /^(https?:\/\/|data:image\/)/;
          if (!urlRegex.test(field.metadata.imageUrl)) {
            errors.push(
              `Invalid imageUrl for field ${field.fieldName}: must be a valid HTTP/HTTPS URL or data URL`
            );
          }
        }

        // Validate imagePosition
        if (field.metadata.imagePosition) {
          const validPositions = ['cover', 'contain', 'repeat'];
          if (!validPositions.includes(field.metadata.imagePosition)) {
            errors.push(
              `Invalid imagePosition for field ${field.fieldName}: must be cover, contain, or repeat`
            );
          }
        }

        // Validate imageOpacity (0-100)
        if (field.metadata.imageOpacity !== undefined) {
          if (
            typeof field.metadata.imageOpacity !== 'number' ||
            field.metadata.imageOpacity < 0 ||
            field.metadata.imageOpacity > 100
          ) {
            errors.push(
              `Invalid imageOpacity for field ${field.fieldName}: must be a number between 0 and 100`
            );
          }
        }

        // Validate imageAlignment
        if (field.metadata.imageAlignment) {
          const validAlignments = ['top', 'center', 'bottom'];
          if (!validAlignments.includes(field.metadata.imageAlignment)) {
            errors.push(
              `Invalid imageAlignment for field ${field.fieldName}: must be top, center, or bottom`
            );
          }
        }
      }

      // Validate background-custom specific metadata (SECURITY CRITICAL)
      if (field.type === 'background-custom' && field.metadata) {
        // Validate HTML length (max 10000 characters)
        if (field.metadata.html) {
          if (typeof field.metadata.html !== 'string') {
            errors.push(
              `Invalid html for field ${field.fieldName}: must be a string`
            );
          } else if (field.metadata.html.length > 10000) {
            errors.push(
              `Invalid html for field ${field.fieldName}: must not exceed 10000 characters`
            );
          }
          // Note: HTML sanitization is handled by sanitizeFormHTML middleware
          // Validation here is just for length and type
        }

        // Validate CSS (max 5000 characters, check for dangerous patterns)
        if (field.metadata.css) {
          if (typeof field.metadata.css !== 'string') {
            errors.push(
              `Invalid css for field ${field.fieldName}: must be a string`
            );
          } else if (field.metadata.css.length > 5000) {
            errors.push(
              `Invalid css for field ${field.fieldName}: must not exceed 5000 characters`
            );
          } else {
            // Check for dangerous patterns in CSS
            const dangerousPatterns = [
              /javascript\s*:/i,
              /expression\s*\(/i,
              /vbscript\s*:/i,
              /-moz-binding/i,
              /behavior\s*:/i,
            ];

            dangerousPatterns.forEach((pattern) => {
              if (field.metadata?.css && pattern.test(field.metadata.css)) {
                errors.push(
                  `Invalid css for field ${field.fieldName}: contains dangerous patterns (${pattern.source})`
                );
              }
            });
          }
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
 * Custom middleware to validate step form configuration.
 * Validates step count, uniqueness, order, and field-step references.
 */
export const validateStepFormConfiguration = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const schema = req.body.schema;

  // Skip validation if no schema or stepForm config
  if (!schema?.settings?.stepForm) {
    next();
    return;
  }

  const stepFormConfig = schema.settings.stepForm;
  const errors: string[] = [];

  // Only validate if step form is enabled
  if (stepFormConfig.enabled === false) {
    next();
    return;
  }

  // Validate stepForm.enabled is boolean
  if (typeof stepFormConfig.enabled !== 'boolean') {
    errors.push('stepForm.enabled must be a boolean');
  }

  // Validate steps array exists
  if (!stepFormConfig.steps || !Array.isArray(stepFormConfig.steps)) {
    errors.push('stepForm.steps must be an array');
    res.status(400).json({
      success: false,
      error: {
        code: 'STEP_VALIDATION_ERROR',
        message: 'Step form validation failed',
        details: errors,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const steps = stepFormConfig.steps;

  // Validate step count (2-10 steps when enabled)
  if (stepFormConfig.enabled && (steps.length < 2 || steps.length > 10)) {
    errors.push(
      `Step count must be between 2 and 10 when enabled. Found: ${steps.length} steps`
    );
  }

  // Track step IDs and order indices for uniqueness validation
  const stepIds = new Set<string>();
  const orderIndices = new Set<number>();
  const duplicateIds = new Set<string>();
  const duplicateOrders = new Set<number>();

  // UUID v4 regex pattern
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  steps.forEach(
    (
      step: {
        id?: string;
        title?: string;
        description?: string;
        order?: number;
      },
      index: number
    ) => {
      // Validate step ID
      if (!step.id) {
        errors.push(`Step at index ${index} is missing required 'id' property`);
      } else {
        // Check UUID v4 format
        if (!uuidRegex.test(step.id)) {
          errors.push(
            `Step '${step.id}' has invalid UUID v4 format at index ${index}`
          );
        }

        // Check for duplicate step IDs
        if (stepIds.has(step.id)) {
          duplicateIds.add(step.id);
        } else {
          stepIds.add(step.id);
        }
      }

      // Validate step title
      if (!step.title) {
        errors.push(
          `Step '${step.id || index}' is missing required 'title' property`
        );
      } else if (typeof step.title !== 'string') {
        errors.push(`Step '${step.id || index}' title must be a string`);
      } else if (step.title.trim().length === 0) {
        errors.push(`Step '${step.id || index}' title cannot be empty`);
      } else if (step.title.length < 1 || step.title.length > 100) {
        errors.push(
          `Step '${step.id || index}' title must be between 1 and 100 characters. Found: ${step.title.length} characters`
        );
      }

      // Validate optional description
      if (step.description !== undefined) {
        if (typeof step.description !== 'string') {
          errors.push(
            `Step '${step.id || index}' description must be a string`
          );
        } else if (step.description.length > 500) {
          errors.push(
            `Step '${step.id || index}' description must not exceed 500 characters. Found: ${step.description.length} characters`
          );
        }
      }

      // Validate step order
      if (step.order === undefined) {
        errors.push(
          `Step '${step.id || index}' is missing required 'order' property`
        );
      } else if (typeof step.order !== 'number') {
        errors.push(`Step '${step.id || index}' order must be a number`);
      } else if (!Number.isInteger(step.order)) {
        errors.push(`Step '${step.id || index}' order must be an integer`);
      } else if (step.order < 0) {
        errors.push(
          `Step '${step.id || index}' order must be non-negative (0-based)`
        );
      } else {
        // Check for duplicate order indices
        if (orderIndices.has(step.order)) {
          duplicateOrders.add(step.order);
        } else {
          orderIndices.add(step.order);
        }
      }
    }
  );

  // Report duplicate step IDs
  if (duplicateIds.size > 0) {
    duplicateIds.forEach((id) => {
      errors.push(`Duplicate step ID found: ${id}`);
    });
  }

  // Report duplicate order indices
  if (duplicateOrders.size > 0) {
    duplicateOrders.forEach((order) => {
      errors.push(`Duplicate step order index found: ${order}`);
    });
  }

  // Validate step order is sequential (0, 1, 2, ...)
  if (stepFormConfig.enabled && errors.length === 0) {
    const sortedOrders = Array.from(orderIndices).sort((a, b) => a - b);
    const expectedOrders = Array.from({ length: steps.length }, (_, i) => i);

    const isSequential =
      sortedOrders.length === expectedOrders.length &&
      sortedOrders.every((order, i) => order === expectedOrders[i]);

    if (!isSequential) {
      errors.push(
        `Step order indices must be sequential starting from 0. Expected: [${expectedOrders.join(', ')}], Found: [${sortedOrders.join(', ')}]`
      );
    }
  }

  // Validate field position.stepId references (if fields exist)
  if (schema.fields && Array.isArray(schema.fields) && stepIds.size > 0) {
    schema.fields.forEach(
      (
        field: {
          id?: string;
          fieldName?: string;
          position?: { stepId?: string };
        },
        index: number
      ) => {
        if (field.position?.stepId) {
          if (!stepIds.has(field.position.stepId)) {
            errors.push(
              `Field '${field.fieldName || field.id || index}' references non-existent step ID: ${field.position.stepId}`
            );
          }
        }
      }
    );
  }

  // Return errors if any found
  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'STEP_VALIDATION_ERROR',
        message: 'Step form validation failed',
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
