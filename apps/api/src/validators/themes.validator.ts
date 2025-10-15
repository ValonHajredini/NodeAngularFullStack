import { body, param } from 'express-validator';

/**
 * Hex color validation regex pattern.
 * Matches 6-digit hex color codes (e.g., #FF5733).
 */
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * URL validation regex pattern.
 * Matches HTTP/HTTPS URLs.
 */
const URL_REGEX = /^https?:\/\/.+/;

/**
 * Validation rules for creating a new theme.
 * Validates all required fields and theme configuration structure.
 */
export const validateCreateTheme = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Name must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage(
      'Name can only contain letters, numbers, spaces, hyphens, and underscores'
    )
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .escape(),

  body('thumbnailUrl')
    .isLength({ min: 1, max: 500 })
    .withMessage('Thumbnail URL must be between 1 and 500 characters')
    .matches(URL_REGEX)
    .withMessage('Thumbnail URL must be a valid HTTP/HTTPS URL'),

  body('themeConfig')
    .isObject()
    .withMessage('Theme configuration must be an object')
    .custom((value) => {
      if (value == null || typeof value !== 'object') {
        throw new Error('Theme configuration is required');
      }
      return true;
    }),

  body('themeConfig.desktop')
    .isObject()
    .withMessage('Desktop theme configuration is required')
    .custom((value) => {
      if (value == null || typeof value !== 'object') {
        throw new Error('Desktop theme configuration must be an object');
      }
      return true;
    }),

  body('themeConfig.mobile')
    .optional()
    .isObject()
    .withMessage('Mobile theme configuration must be an object'),

  // Validate desktop theme properties
  body('themeConfig.desktop.primaryColor')
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Primary color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.desktop.secondaryColor')
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Secondary color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.desktop.backgroundColor')
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Background color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.desktop.textColorPrimary')
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Primary text color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.desktop.textColorSecondary')
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Secondary text color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.desktop.fontFamilyHeading')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage(
      'Font family for headings must be between 1 and 100 characters'
    ),

  body('themeConfig.desktop.fontFamilyBody')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Font family for body must be between 1 and 100 characters'),

  body('themeConfig.desktop.fieldBorderRadius')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Field border radius must be between 1 and 50 characters'),

  body('themeConfig.desktop.fieldSpacing')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Field spacing must be between 1 and 50 characters'),

  body('themeConfig.desktop.containerBackground')
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Container background must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.desktop.containerOpacity')
    .isFloat({ min: 0, max: 1 })
    .withMessage('Container opacity must be a number between 0.0 and 1.0'),

  body('themeConfig.desktop.containerPosition')
    .isIn(['center', 'top', 'left', 'full-width'])
    .withMessage(
      'Container position must be one of: center, top, left, full-width'
    ),

  body('themeConfig.desktop.backgroundImageUrl')
    .optional()
    .matches(URL_REGEX)
    .withMessage('Background image URL must be a valid HTTP/HTTPS URL'),

  body('themeConfig.desktop.backgroundImagePosition')
    .optional()
    .isIn(['cover', 'contain', 'repeat'])
    .withMessage(
      'Background image position must be one of: cover, contain, repeat'
    ),

  // Validate mobile theme properties (optional)
  body('themeConfig.mobile.primaryColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile primary color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.secondaryColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile secondary color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.backgroundColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile background color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.textColorPrimary')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile primary text color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.textColorSecondary')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile secondary text color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.fontFamilyHeading')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage(
      'Mobile font family for headings must be between 1 and 100 characters'
    ),

  body('themeConfig.mobile.fontFamilyBody')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage(
      'Mobile font family for body must be between 1 and 100 characters'
    ),

  body('themeConfig.mobile.fieldBorderRadius')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage(
      'Mobile field border radius must be between 1 and 50 characters'
    ),

  body('themeConfig.mobile.fieldSpacing')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Mobile field spacing must be between 1 and 50 characters'),

  body('themeConfig.mobile.containerBackground')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile container background must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.containerOpacity')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage(
      'Mobile container opacity must be a number between 0.0 and 1.0'
    ),

  body('themeConfig.mobile.containerPosition')
    .optional()
    .isIn(['center', 'top', 'left', 'full-width'])
    .withMessage(
      'Mobile container position must be one of: center, top, left, full-width'
    ),

  body('themeConfig.mobile.backgroundImageUrl')
    .optional()
    .matches(URL_REGEX)
    .withMessage('Mobile background image URL must be a valid HTTP/HTTPS URL'),

  body('themeConfig.mobile.backgroundImagePosition')
    .optional()
    .isIn(['cover', 'contain', 'repeat'])
    .withMessage(
      'Mobile background image position must be one of: cover, contain, repeat'
    ),
];

/**
 * Validation rules for updating an existing theme.
 * All fields are optional but must be valid if provided.
 */
export const validateUpdateTheme = [
  param('id').isUUID().withMessage('Theme ID must be a valid UUID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Name must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage(
      'Name can only contain letters, numbers, spaces, hyphens, and underscores'
    )
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .escape(),

  body('thumbnailUrl')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Thumbnail URL must be between 1 and 500 characters')
    .matches(URL_REGEX)
    .withMessage('Thumbnail URL must be a valid HTTP/HTTPS URL'),

  body('themeConfig')
    .optional()
    .isObject()
    .withMessage('Theme configuration must be an object'),

  body('themeConfig.desktop')
    .optional()
    .isObject()
    .withMessage('Desktop theme configuration must be an object'),

  body('themeConfig.mobile')
    .optional()
    .isObject()
    .withMessage('Mobile theme configuration must be an object'),

  // Validate desktop theme properties (optional for updates)
  body('themeConfig.desktop.primaryColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Primary color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.desktop.secondaryColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Secondary color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.desktop.backgroundColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Background color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.desktop.textColorPrimary')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Primary text color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.desktop.textColorSecondary')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Secondary text color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.desktop.fontFamilyHeading')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage(
      'Font family for headings must be between 1 and 100 characters'
    ),

  body('themeConfig.desktop.fontFamilyBody')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Font family for body must be between 1 and 100 characters'),

  body('themeConfig.desktop.fieldBorderRadius')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Field border radius must be between 1 and 50 characters'),

  body('themeConfig.desktop.fieldSpacing')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Field spacing must be between 1 and 50 characters'),

  body('themeConfig.desktop.containerBackground')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Container background must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.desktop.containerOpacity')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Container opacity must be a number between 0.0 and 1.0'),

  body('themeConfig.desktop.containerPosition')
    .optional()
    .isIn(['center', 'top', 'left', 'full-width'])
    .withMessage(
      'Container position must be one of: center, top, left, full-width'
    ),

  body('themeConfig.desktop.backgroundImageUrl')
    .optional()
    .matches(URL_REGEX)
    .withMessage('Background image URL must be a valid HTTP/HTTPS URL'),

  body('themeConfig.desktop.backgroundImagePosition')
    .optional()
    .isIn(['cover', 'contain', 'repeat'])
    .withMessage(
      'Background image position must be one of: cover, contain, repeat'
    ),

  // Validate mobile theme properties (optional)
  body('themeConfig.mobile.primaryColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile primary color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.secondaryColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile secondary color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.backgroundColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile background color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.textColorPrimary')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile primary text color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.textColorSecondary')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile secondary text color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.fontFamilyHeading')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage(
      'Mobile font family for headings must be between 1 and 100 characters'
    ),

  body('themeConfig.mobile.fontFamilyBody')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage(
      'Mobile font family for body must be between 1 and 100 characters'
    ),

  body('themeConfig.mobile.fieldBorderRadius')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage(
      'Mobile field border radius must be between 1 and 50 characters'
    ),

  body('themeConfig.mobile.fieldSpacing')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Mobile field spacing must be between 1 and 50 characters'),

  body('themeConfig.mobile.containerBackground')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile container background must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.containerOpacity')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage(
      'Mobile container opacity must be a number between 0.0 and 1.0'
    ),

  body('themeConfig.mobile.containerPosition')
    .optional()
    .isIn(['center', 'top', 'left', 'full-width'])
    .withMessage(
      'Mobile container position must be one of: center, top, left, full-width'
    ),

  body('themeConfig.mobile.backgroundImageUrl')
    .optional()
    .matches(URL_REGEX)
    .withMessage('Mobile background image URL must be a valid HTTP/HTTPS URL'),

  body('themeConfig.mobile.backgroundImagePosition')
    .optional()
    .isIn(['cover', 'contain', 'repeat'])
    .withMessage(
      'Mobile background image position must be one of: cover, contain, repeat'
    ),

  // Custom validator to ensure at least one field is provided
  body().custom((_value, { req }) => {
    const allowedFields = [
      'name',
      'description',
      'thumbnailUrl',
      'themeConfig',
    ];
    const providedFields = Object.keys(req.body).filter((key) =>
      allowedFields.includes(key)
    );

    if (providedFields.length === 0) {
      throw new Error('At least one field must be provided for update');
    }

    return true;
  }),
];

/**
 * Validation rules for theme ID parameter.
 */
export const validateThemeId = [
  param('id').isUUID().withMessage('Theme ID must be a valid UUID'),
];

/**
 * Validation rules for theme configuration structure.
 * Used for validating JSONB theme configuration.
 */
export const validateThemeConfig = [
  body('themeConfig')
    .isObject()
    .withMessage('Theme configuration must be an object')
    .custom((value) => {
      if (value == null || typeof value !== 'object') {
        throw new Error('Theme configuration is required');
      }
      return true;
    }),

  body('themeConfig.desktop')
    .isObject()
    .withMessage('Desktop theme configuration is required')
    .custom((value) => {
      if (value == null || typeof value !== 'object') {
        throw new Error('Desktop theme configuration must be an object');
      }
      return true;
    }),

  body('themeConfig.mobile')
    .optional()
    .isObject()
    .withMessage('Mobile theme configuration must be an object'),
];
