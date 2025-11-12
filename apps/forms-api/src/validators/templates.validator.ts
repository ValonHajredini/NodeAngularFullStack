import { body, param, query } from 'express-validator';
import { TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * UUID validation regex pattern.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * URL validation regex pattern for preview images.
 */
const URL_REGEX = /^https?:\/\/.+/;

/**
 * Maximum template schema size in bytes (100KB).
 */
const MAX_SCHEMA_SIZE_BYTES = 102400; // 100KB

/**
 * Template name validation rules.
 */
const nameValidation = body('name')
  .trim()
  .notEmpty()
  .withMessage('Template name is required')
  .isLength({ min: 1, max: 255 })
  .withMessage('Template name must be between 1 and 255 characters')
  .matches(/^[a-zA-Z0-9\s\-_()]+$/)
  .withMessage(
    'Template name can only contain alphanumeric characters, spaces, hyphens, underscores, and parentheses'
  );

/**
 * Template description validation rules.
 */
const descriptionValidation = body('description')
  .optional()
  .trim()
  .isLength({ max: 1000 })
  .withMessage('Description must not exceed 1000 characters');

/**
 * Template category validation rules.
 */
const categoryValidation = body('category')
  .notEmpty()
  .withMessage('Template category is required')
  .isIn(Object.values(TemplateCategory))
  .withMessage(
    `Category must be one of: ${Object.values(TemplateCategory).join(', ')}`
  );

/**
 * Template schema validation rules.
 * Validates that schema is a valid JSON object with required structure.
 */
const templateSchemaValidation = body('templateSchema')
  .notEmpty()
  .withMessage('Template schema is required')
  .isObject()
  .withMessage('Template schema must be a valid JSON object')
  .custom((schema) => {
    // Validate schema has required properties
    if (!schema.fields || !Array.isArray(schema.fields)) {
      throw new Error('Template schema must have a fields array');
    }

    if (schema.fields.length === 0) {
      throw new Error('Template schema must have at least one field');
    }

    if (!schema.settings || typeof schema.settings !== 'object') {
      throw new Error('Template schema must have settings object');
    }

    if (!schema.settings.layout) {
      throw new Error('Template schema settings must have layout configuration');
    }

    if (!schema.settings.submission) {
      throw new Error(
        'Template schema settings must have submission configuration'
      );
    }

    // Validate each field has required properties
    schema.fields.forEach((field: any, index: number) => {
      if (!field.id || typeof field.id !== 'string') {
        throw new Error(`Field at index ${index} must have an id`);
      }

      if (!field.type || typeof field.type !== 'string') {
        throw new Error(`Field at index ${index} must have a type`);
      }

      if (!field.fieldName || typeof field.fieldName !== 'string') {
        throw new Error(`Field at index ${index} must have a fieldName`);
      }

      if (!field.label || typeof field.label !== 'string') {
        throw new Error(`Field at index ${index} must have a label`);
      }
    });

    // Validate schema size (100KB limit)
    const schemaSize = JSON.stringify(schema).length;
    if (schemaSize > MAX_SCHEMA_SIZE_BYTES) {
      throw new Error(
        `Template schema exceeds 100KB limit. Current size: ${Math.round(schemaSize / 1024)}KB`
      );
    }

    return true;
  });

/**
 * Business logic config validation rules.
 * Validates that config matches template category.
 */
const businessLogicConfigValidation = body('businessLogicConfig')
  .optional()
  .isObject()
  .withMessage('Business logic config must be a valid JSON object')
  .custom((config) => {
    if (!config || !config.type) {
      throw new Error('Business logic config must have a type property');
    }

    const validTypes = [
      'inventory',
      'order',
      'appointment',
      'quiz',
      'poll',
    ] as const;
    if (!validTypes.includes(config.type)) {
      throw new Error(
        `Business logic config type must be one of: ${validTypes.join(', ')}`
      );
    }

    // Validate type-specific required fields
    switch (config.type) {
      case 'inventory':
        if (
          !config.stockField ||
          !config.variantField ||
          !config.quantityField ||
          !config.stockTable
        ) {
          throw new Error(
            'Inventory config must have stockField, variantField, quantityField, and stockTable'
          );
        }
        if (config.decrementOnSubmit === undefined) {
          throw new Error('Inventory config must specify decrementOnSubmit');
        }
        break;

      case 'quiz':
        if (!config.scoringRules || Object.keys(config.scoringRules).length === 0) {
          throw new Error(
            'Quiz config must have scoringRules with at least one question'
          );
        }
        if (
          config.passingScore !== undefined &&
          (config.passingScore < 0 || config.passingScore > 100)
        ) {
          throw new Error('Quiz config passingScore must be between 0 and 100');
        }
        break;

      case 'appointment':
        if (
          !config.timeSlotField ||
          !config.dateField ||
          !config.bookingsTable
        ) {
          throw new Error(
            'Appointment config must have timeSlotField, dateField, and bookingsTable'
          );
        }
        if (
          config.maxBookingsPerSlot === undefined ||
          config.maxBookingsPerSlot < 1
        ) {
          throw new Error(
            'Appointment config must have maxBookingsPerSlot >= 1'
          );
        }
        break;

      case 'poll':
        if (!config.voteField) {
          throw new Error('Poll config must have voteField');
        }
        if (config.preventDuplicates === undefined) {
          throw new Error('Poll config must specify preventDuplicates');
        }
        if (config.showResultsAfterVote === undefined) {
          throw new Error('Poll config must specify showResultsAfterVote');
        }
        const validTrackingMethods = ['session', 'user', 'ip'];
        if (!validTrackingMethods.includes(config.trackingMethod)) {
          throw new Error(
            `Poll config trackingMethod must be one of: ${validTrackingMethods.join(', ')}`
          );
        }
        break;

      case 'order':
        if (!config.itemFields || config.itemFields.length === 0) {
          throw new Error('Order config must have at least one itemField');
        }
        if (config.calculateTotal === undefined) {
          throw new Error('Order config must specify calculateTotal');
        }
        if (
          config.taxRate !== undefined &&
          (config.taxRate < 0 || config.taxRate > 1)
        ) {
          throw new Error(
            'Order config taxRate must be between 0 and 1 (e.g., 0.08 for 8%)'
          );
        }
        break;
    }

    return true;
  });

/**
 * Preview image URL validation rules.
 */
const previewImageUrlValidation = body('previewImageUrl')
  .optional()
  .trim()
  .matches(URL_REGEX)
  .withMessage('Preview image URL must be a valid HTTP/HTTPS URL');

/**
 * Template ID parameter validation rules.
 */
const templateIdValidation = param('id')
  .trim()
  .notEmpty()
  .withMessage('Template ID is required')
  .matches(UUID_REGEX)
  .withMessage('Template ID must be a valid UUID');

/**
 * Category query parameter validation rules.
 */
const categoryQueryValidation = query('category')
  .optional()
  .trim()
  .isIn(Object.values(TemplateCategory))
  .withMessage(
    `Category must be one of: ${Object.values(TemplateCategory).join(', ')}`
  );

/**
 * Pagination query parameter validation rules.
 */
const pageValidation = query('page')
  .optional()
  .isInt({ min: 1 })
  .withMessage('Page must be a positive integer')
  .toInt();

const limitValidation = query('limit')
  .optional()
  .isInt({ min: 1, max: 100 })
  .withMessage('Limit must be between 1 and 100')
  .toInt();

/**
 * Validator for creating a new template.
 * Validates: name, description, category, templateSchema, businessLogicConfig, previewImageUrl
 */
export const createTemplateValidator = [
  nameValidation,
  descriptionValidation,
  categoryValidation,
  templateSchemaValidation,
  businessLogicConfigValidation,
  previewImageUrlValidation,
];

/**
 * Validator for updating a template.
 * All fields are optional for partial updates.
 */
export const updateTemplateValidator = [
  templateIdValidation,
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Template name cannot be empty if provided')
    .isLength({ min: 1, max: 255 })
    .withMessage('Template name must be between 1 and 255 characters')
    .matches(/^[a-zA-Z0-9\s\-_()]+$/)
    .withMessage(
      'Template name can only contain alphanumeric characters, spaces, hyphens, underscores, and parentheses'
    ),
  descriptionValidation,
  body('category')
    .optional()
    .isIn(Object.values(TemplateCategory))
    .withMessage(
      `Category must be one of: ${Object.values(TemplateCategory).join(', ')}`
    ),
  body('templateSchema')
    .optional()
    .isObject()
    .withMessage('Template schema must be a valid JSON object')
    .custom((schema) => {
      // Same validation as create
      if (schema.fields !== undefined) {
        if (!Array.isArray(schema.fields)) {
          throw new Error('Template schema fields must be an array');
        }

        if (schema.fields.length === 0) {
          throw new Error('Template schema must have at least one field');
        }

        schema.fields.forEach((field: any, index: number) => {
          if (!field.id || typeof field.id !== 'string') {
            throw new Error(`Field at index ${index} must have an id`);
          }

          if (!field.type || typeof field.type !== 'string') {
            throw new Error(`Field at index ${index} must have a type`);
          }

          if (!field.fieldName || typeof field.fieldName !== 'string') {
            throw new Error(`Field at index ${index} must have a fieldName`);
          }

          if (!field.label || typeof field.label !== 'string') {
            throw new Error(`Field at index ${index} must have a label`);
          }
        });
      }

      if (schema.settings !== undefined) {
        if (typeof schema.settings !== 'object') {
          throw new Error('Template schema settings must be an object');
        }

        if (schema.settings.layout === undefined) {
          throw new Error(
            'Template schema settings must have layout configuration'
          );
        }

        if (schema.settings.submission === undefined) {
          throw new Error(
            'Template schema settings must have submission configuration'
          );
        }
      }

      // Validate schema size
      const schemaSize = JSON.stringify(schema).length;
      if (schemaSize > MAX_SCHEMA_SIZE_BYTES) {
        throw new Error(
          `Template schema exceeds 100KB limit. Current size: ${Math.round(schemaSize / 1024)}KB`
        );
      }

      return true;
    }),
  businessLogicConfigValidation,
  previewImageUrlValidation,
];

/**
 * Validator for getting a template by ID.
 */
export const getTemplateByIdValidator = [templateIdValidation];

/**
 * Validator for deleting a template.
 */
export const deleteTemplateValidator = [templateIdValidation];

/**
 * Validator for applying a template.
 */
export const applyTemplateValidator = [templateIdValidation];

/**
 * Validator for listing templates with filters.
 */
export const listTemplatesValidator = [
  categoryQueryValidation,
  pageValidation,
  limitValidation,
];
