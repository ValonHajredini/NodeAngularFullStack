import { body, param, ValidationChain } from 'express-validator';

/**
 * Valid display modes for tool configurations.
 */
const VALID_DISPLAY_MODES = [
  'standard',
  'full-width',
  'compact',
  'modal',
  'embedded',
];

/**
 * Validates tool key parameter in URL.
 */
export const validateToolKey = (): ValidationChain[] => [
  param('toolKey')
    .trim()
    .notEmpty()
    .withMessage('Tool key is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Tool key must be between 2 and 255 characters')
    .matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .withMessage('Tool key must be in kebab-case format'),
];

/**
 * Validates configuration ID parameter in URL.
 */
export const validateConfigId = (): ValidationChain[] => [
  param('configId')
    .trim()
    .notEmpty()
    .withMessage('Configuration ID is required')
    .isUUID(4)
    .withMessage('Configuration ID must be a valid UUID'),
];

/**
 * Validates semantic version format (e.g., "1.0.0", "2.1.3").
 */
const validateVersion = () =>
  body('version')
    .trim()
    .notEmpty()
    .withMessage('Version is required')
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage(
      'Version must be in semantic versioning format (e.g., "1.0.0")'
    )
    .isLength({ max: 20 })
    .withMessage('Version must not exceed 20 characters');

/**
 * Validates display mode.
 */
const validateDisplayMode = () =>
  body('displayMode')
    .trim()
    .notEmpty()
    .withMessage('Display mode is required')
    .isIn(VALID_DISPLAY_MODES)
    .withMessage(
      `Display mode must be one of: ${VALID_DISPLAY_MODES.join(', ')}`
    );

/**
 * Validates layout settings object.
 */
const validateLayoutSettings = () =>
  body('layoutSettings')
    .optional()
    .isObject()
    .withMessage('Layout settings must be an object')
    .custom((value) => {
      // Validate specific layout settings if provided
      if (value.maxWidth !== undefined && typeof value.maxWidth !== 'string') {
        throw new Error('maxWidth must be a string');
      }
      if (value.padding !== undefined && typeof value.padding !== 'string') {
        throw new Error('padding must be a string');
      }
      if (value.margin !== undefined && typeof value.margin !== 'string') {
        throw new Error('margin must be a string');
      }
      if (
        value.backgroundColor !== undefined &&
        typeof value.backgroundColor !== 'string'
      ) {
        throw new Error('backgroundColor must be a string');
      }
      if (
        value.borderRadius !== undefined &&
        typeof value.borderRadius !== 'string'
      ) {
        throw new Error('borderRadius must be a string');
      }
      if (
        value.customClasses !== undefined &&
        !Array.isArray(value.customClasses)
      ) {
        throw new Error('customClasses must be an array');
      }
      return true;
    });

/**
 * Validates isActive flag.
 */
const validateIsActive = () =>
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value');

/**
 * Validation rules for creating a new tool configuration.
 */
export const validateCreateConfig = (): ValidationChain[] => [
  ...validateToolKey(),
  validateVersion(),
  validateDisplayMode(),
  validateLayoutSettings(),
  validateIsActive(),
];

/**
 * Validation rules for updating a tool configuration.
 */
export const validateUpdateConfig = (): ValidationChain[] => [
  ...validateToolKey(),
  ...validateConfigId(),
  body('version')
    .optional()
    .trim()
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage(
      'Version must be in semantic versioning format (e.g., "1.0.0")'
    )
    .isLength({ max: 20 })
    .withMessage('Version must not exceed 20 characters'),
  body('displayMode')
    .optional()
    .trim()
    .isIn(VALID_DISPLAY_MODES)
    .withMessage(
      `Display mode must be one of: ${VALID_DISPLAY_MODES.join(', ')}`
    ),
  validateLayoutSettings(),
  validateIsActive(),
  body().custom((value) => {
    // Ensure at least one field is provided for update
    const hasAtLeastOneField =
      value.version !== undefined ||
      value.displayMode !== undefined ||
      value.layoutSettings !== undefined ||
      value.isActive !== undefined;

    if (!hasAtLeastOneField) {
      throw new Error('At least one field must be provided for update');
    }
    return true;
  }),
];

/**
 * Validation rules for activating a configuration.
 */
export const validateActivateConfig = (): ValidationChain[] => [
  ...validateToolKey(),
  ...validateConfigId(),
];

/**
 * Validation rules for deleting a configuration.
 */
export const validateDeleteConfig = (): ValidationChain[] => [
  ...validateToolKey(),
  ...validateConfigId(),
];

/**
 * Validation rules for getting configurations by tool key.
 */
export const validateGetConfigs = (): ValidationChain[] => [
  ...validateToolKey(),
];

/**
 * Validation rules for getting active configuration by tool key.
 */
export const validateGetActiveConfig = (): ValidationChain[] => [
  ...validateToolKey(),
];
