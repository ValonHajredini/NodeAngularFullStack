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
 * Safe CSS background validation regex.
 * Allows hex colors, rgb/rgba, hsl/hsla, and safe gradients.
 * Blocks javascript:, @import, and other potentially malicious CSS.
 */
const SAFE_CSS_BACKGROUND_REGEX =
  /^(#[0-9A-Fa-f]{6}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[01]?\.?\d*\s*\)|hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)|hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[01]?\.?\d*\s*\)|linear-gradient\([^)]+\)|radial-gradient\([^)]+\))$/;

/**
 * Google Fonts validation regex.
 * Matches Google Fonts API format and common web-safe fonts.
 */
const SAFE_FONT_REGEX = /^[a-zA-Z0-9\s,'-]+$/;

/**
 * Maximum theme definition size in bytes (50KB as per story requirements).
 */
const MAX_THEME_SIZE_BYTES = 50 * 1024;

/**
 * Calculates the color contrast ratio between two hex colors.
 * @param color1 - First hex color (#RRGGBB)
 * @param color2 - Second hex color (#RRGGBB)
 * @returns Contrast ratio (1-21)
 */
function calculateContrastRatio(color1: string, color2: string): number {
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  // Calculate relative luminance
  const getLuminance = (rgb: { r: number; g: number; b: number }) => {
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Validates CSS for security concerns.
 * Blocks javascript:, @import, and other potentially malicious CSS.
 * @param value - CSS value to validate
 * @returns True if safe, throws error if unsafe
 */
function validateCSSSecurity(value: string): boolean {
  const dangerousPatterns = [
    /javascript:/i,
    /@import/i,
    /expression\(/i,
    /url\(\s*javascript:/i,
    /vbscript:/i,
    /data:text\/html/i,
    /<script/i,
    /on\w+\s*=/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(value)) {
      throw new Error(`Potentially malicious CSS detected: ${pattern.source}`);
    }
  }

  return true;
}

/**
 * Validates theme size limit (50KB).
 * @param value - Theme configuration object
 * @returns True if within limit, throws error if too large
 */
function validateThemeSize(value: any): boolean {
  const jsonString = JSON.stringify(value);
  const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');

  if (sizeInBytes > MAX_THEME_SIZE_BYTES) {
    throw new Error(
      `Theme size (${sizeInBytes} bytes) exceeds maximum allowed size (${MAX_THEME_SIZE_BYTES} bytes)`
    );
  }

  return true;
}

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

  body('themeConfig.desktop.backgroundColor').custom((value) => {
    if (HEX_COLOR_REGEX.test(value)) {
      return true; // Valid hex color
    }
    if (SAFE_CSS_BACKGROUND_REGEX.test(value)) {
      validateCSSSecurity(value);
      return true; // Valid CSS gradient/color
    }
    throw new Error(
      'Background color must be a valid hex color or safe CSS gradient/rgba'
    );
  }),

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

  body('themeConfig.desktop.labelColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage('Label color must be a valid hex color code (e.g., #FF5733)'),

  body('themeConfig.desktop.inputBackgroundColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Input background color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.desktop.inputTextColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Input text color must be a valid hex color code (e.g., #FF5733)'
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

  body('themeConfig.desktop.containerBackground').custom((value) => {
    if (HEX_COLOR_REGEX.test(value)) {
      return true; // Valid hex color
    }
    if (SAFE_CSS_BACKGROUND_REGEX.test(value)) {
      validateCSSSecurity(value);
      return true; // Valid CSS gradient/color
    }
    throw new Error(
      'Container background must be a valid hex color or safe CSS gradient/rgba'
    );
  }),

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
    .custom((value) => {
      if (HEX_COLOR_REGEX.test(value)) {
        return true; // Valid hex color
      }
      if (SAFE_CSS_BACKGROUND_REGEX.test(value)) {
        validateCSSSecurity(value);
        return true; // Valid CSS gradient/color
      }
      throw new Error(
        'Mobile background color must be a valid hex color or safe CSS gradient/rgba'
      );
    }),

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

  body('themeConfig.mobile.labelColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile label color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.inputBackgroundColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile input background color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.inputTextColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile input text color must be a valid hex color code (e.g., #FF5733)'
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
    .custom((value) => {
      if (HEX_COLOR_REGEX.test(value)) {
        return true; // Valid hex color
      }
      if (SAFE_CSS_BACKGROUND_REGEX.test(value)) {
        validateCSSSecurity(value);
        return true; // Valid CSS gradient/color
      }
      throw new Error(
        'Mobile container background must be a valid hex color or safe CSS gradient/rgba'
      );
    }),

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
    .custom((value) => {
      if (HEX_COLOR_REGEX.test(value)) {
        return true; // Valid hex color
      }
      if (SAFE_CSS_BACKGROUND_REGEX.test(value)) {
        validateCSSSecurity(value);
        return true; // Valid CSS gradient/color
      }
      throw new Error(
        'Background color must be a valid hex color or safe CSS gradient/rgba'
      );
    }),

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

  body('themeConfig.desktop.labelColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage('Label color must be a valid hex color code (e.g., #FF5733)'),

  body('themeConfig.desktop.inputBackgroundColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Input background color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.desktop.inputTextColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Input text color must be a valid hex color code (e.g., #FF5733)'
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
    .custom((value) => {
      if (HEX_COLOR_REGEX.test(value)) {
        return true; // Valid hex color
      }
      if (SAFE_CSS_BACKGROUND_REGEX.test(value)) {
        validateCSSSecurity(value);
        return true; // Valid CSS gradient/color
      }
      throw new Error(
        'Container background must be a valid hex color or safe CSS gradient/rgba'
      );
    }),

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
    .custom((value) => {
      if (HEX_COLOR_REGEX.test(value)) {
        return true; // Valid hex color
      }
      if (SAFE_CSS_BACKGROUND_REGEX.test(value)) {
        validateCSSSecurity(value);
        return true; // Valid CSS gradient/color
      }
      throw new Error(
        'Mobile background color must be a valid hex color or safe CSS gradient/rgba'
      );
    }),

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

  body('themeConfig.mobile.labelColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile label color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.inputBackgroundColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile input background color must be a valid hex color code (e.g., #FF5733)'
    ),

  body('themeConfig.mobile.inputTextColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Mobile input text color must be a valid hex color code (e.g., #FF5733)'
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
    .custom((value) => {
      if (HEX_COLOR_REGEX.test(value)) {
        return true; // Valid hex color
      }
      if (SAFE_CSS_BACKGROUND_REGEX.test(value)) {
        validateCSSSecurity(value);
        return true; // Valid CSS gradient/color
      }
      throw new Error(
        'Mobile container background must be a valid hex color or safe CSS gradient/rgba'
      );
    }),

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

/**
 * Enhanced validation rules for creating admin themes.
 * Includes accessibility checks, CSS safety validation, and size limits.
 */
export const validateCreateAdminTheme = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Theme name must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage(
      'Theme name can only contain letters, numbers, spaces, hyphens, and underscores'
    )
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .escape(),

  body('primaryColor')
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Primary color must be a valid 6-digit hex color (e.g., #1A73E8)'
    ),

  body('secondaryColor')
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Secondary color must be a valid 6-digit hex color (e.g., #34A853)'
    ),

  body('backgroundColor').custom((value) => {
    if (HEX_COLOR_REGEX.test(value)) {
      return true; // Valid hex color
    }
    if (SAFE_CSS_BACKGROUND_REGEX.test(value)) {
      validateCSSSecurity(value);
      return true; // Valid CSS gradient/color
    }
    throw new Error(
      'Background must be a valid hex color or safe CSS gradient'
    );
  }),

  body('fontHeading')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Font heading must be between 1 and 100 characters')
    .matches(SAFE_FONT_REGEX)
    .withMessage('Font heading contains invalid characters'),

  body('fontBody')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Font body must be between 1 and 100 characters')
    .matches(SAFE_FONT_REGEX)
    .withMessage('Font body contains invalid characters'),

  body('thumbnailUrl')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Thumbnail URL must not exceed 500 characters')
    .matches(URL_REGEX)
    .withMessage('Thumbnail URL must be a valid HTTP/HTTPS URL'),

  // Accessibility validation - contrast ratio check
  body().custom((_value, { req }) => {
    const { primaryColor, backgroundColor } = req.body;

    // Only check contrast if both are hex colors
    if (
      primaryColor &&
      backgroundColor &&
      HEX_COLOR_REGEX.test(primaryColor) &&
      HEX_COLOR_REGEX.test(backgroundColor)
    ) {
      const contrastRatio = calculateContrastRatio(
        primaryColor,
        backgroundColor
      );

      // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
      if (contrastRatio < 3.0) {
        throw new Error(
          `Color contrast ratio (${contrastRatio.toFixed(2)}:1) is too low. Minimum 3:1 required for accessibility.`
        );
      }
    }

    return true;
  }),

  // Theme size validation
  body().custom((_value, { req }) => {
    validateThemeSize(req.body);
    return true;
  }),
];

/**
 * Enhanced validation rules for updating admin themes.
 * All fields are optional but include enhanced security and accessibility checks.
 */
export const validateUpdateAdminTheme = [
  param('id').isUUID().withMessage('Theme ID must be a valid UUID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Theme name must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage(
      'Theme name can only contain letters, numbers, spaces, hyphens, and underscores'
    )
    .escape(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .escape(),

  body('primaryColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Primary color must be a valid 6-digit hex color (e.g., #1A73E8)'
    ),

  body('secondaryColor')
    .optional()
    .matches(HEX_COLOR_REGEX)
    .withMessage(
      'Secondary color must be a valid 6-digit hex color (e.g., #34A853)'
    ),

  body('backgroundColor')
    .optional()
    .custom((value) => {
      if (HEX_COLOR_REGEX.test(value)) {
        return true; // Valid hex color
      }
      if (SAFE_CSS_BACKGROUND_REGEX.test(value)) {
        validateCSSSecurity(value);
        return true; // Valid CSS gradient/color
      }
      throw new Error(
        'Background must be a valid hex color or safe CSS gradient'
      );
    }),

  body('fontHeading')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Font heading must be between 1 and 100 characters')
    .matches(SAFE_FONT_REGEX)
    .withMessage('Font heading contains invalid characters'),

  body('fontBody')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Font body must be between 1 and 100 characters')
    .matches(SAFE_FONT_REGEX)
    .withMessage('Font body contains invalid characters'),

  body('thumbnailUrl')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Thumbnail URL must not exceed 500 characters')
    .matches(URL_REGEX)
    .withMessage('Thumbnail URL must be a valid HTTP/HTTPS URL'),

  // Accessibility validation for updates
  body().custom((_value, { req }) => {
    const { primaryColor, backgroundColor } = req.body;

    // Only check contrast if both colors are provided in the update
    if (
      primaryColor &&
      backgroundColor &&
      HEX_COLOR_REGEX.test(primaryColor) &&
      HEX_COLOR_REGEX.test(backgroundColor)
    ) {
      const contrastRatio = calculateContrastRatio(
        primaryColor,
        backgroundColor
      );

      if (contrastRatio < 3.0) {
        throw new Error(
          `Color contrast ratio (${contrastRatio.toFixed(2)}:1) is too low. Minimum 3:1 required for accessibility.`
        );
      }
    }

    return true;
  }),

  // Theme size validation
  body().custom((_value, { req }) => {
    validateThemeSize(req.body);
    return true;
  }),

  // Ensure at least one field is provided for update
  body().custom((_value, { req }) => {
    const allowedFields = [
      'name',
      'description',
      'primaryColor',
      'secondaryColor',
      'backgroundColor',
      'fontHeading',
      'fontBody',
      'thumbnailUrl',
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
