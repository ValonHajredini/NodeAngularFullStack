/**
 * CSS Sanitizer Middleware
 * Validates and sanitizes custom CSS in form field metadata
 * Prevents XSS and CSS injection attacks
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Whitelisted CSS properties that are considered safe
 * Only these properties will be allowed in custom field styling
 */
const CSS_WHITELIST = [
  'color',
  'background',
  'background-color',
  'background-image',
  'background-position',
  'background-repeat',
  'background-size',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'border',
  'border-width',
  'border-style',
  'border-color',
  'border-radius',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'text-align',
  'text-decoration',
  'text-transform',
  'line-height',
  'letter-spacing',
  'width',
  'height',
  'max-width',
  'max-height',
  'min-width',
  'min-height',
  'display',
  'flex-direction',
  'flex-wrap',
  'justify-content',
  'align-items',
  'align-content',
  'grid-template-columns',
  'grid-template-rows',
  'grid-gap',
  'gap',
  'opacity',
  'box-shadow',
  'text-shadow',
];

/**
 * Blacklisted dangerous patterns that could lead to XSS or CSS injection
 * These patterns will cause validation to fail
 */
const CSS_BLACKLIST = [
  'javascript:',
  'expression(',
  '@import',
  'url(http://', // Only allow HTTPS or data URIs
  '<script',
  'onerror=',
  'onload=',
  'onclick=',
  'onmouseover=',
  'data:text/html',
  'behavior:',
  '-moz-binding',
];

/**
 * Interface for CSS validation result
 */
export interface CSSValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates custom CSS string for security and correctness
 *
 * @param css - The CSS string to validate
 * @returns Validation result with errors array
 *
 * @example
 * ```typescript
 * const result = validateCustomCSS('color: blue; padding: 10px;');
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateCustomCSS(css: string): CSSValidationResult {
  const errors: string[] = [];

  if (!css || css.trim() === '') {
    return { valid: true, errors: [] };
  }

  // Check length constraint
  if (css.length > 5000) {
    errors.push('CSS exceeds maximum length of 5000 characters');
  }

  // Check for blacklisted dangerous patterns (case-insensitive)
  const lowerCSS = css.toLowerCase();
  CSS_BLACKLIST.forEach((pattern) => {
    if (lowerCSS.includes(pattern.toLowerCase())) {
      errors.push(`Forbidden pattern detected: ${pattern}`);
    }
  });

  // Parse CSS and validate each property against whitelist
  // Simple regex-based parsing: match "property: value;" patterns
  const cssRules = css.split(';').filter((rule) => rule.trim());

  cssRules.forEach((rule) => {
    const colonIndex = rule.indexOf(':');
    if (colonIndex === -1) return; // Skip malformed rules

    const property = rule.substring(0, colonIndex).trim().toLowerCase();
    if (!property) return; // Skip empty properties

    // Check if property is whitelisted
    if (!CSS_WHITELIST.includes(property)) {
      errors.push(`CSS property '${property}' is not allowed`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Express middleware that validates custom CSS in form field metadata
 * Prevents malicious CSS from being saved to the database
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 *
 * @example
 * ```typescript
 * router.put('/forms/:id', cssSanitizerMiddleware, updateForm);
 * ```
 */
export const cssSanitizerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const formSchema = req.body.schema_json || req.body;

  // Validate custom CSS in all fields
  if (formSchema.fields && Array.isArray(formSchema.fields)) {
    for (const field of formSchema.fields) {
      const customStyle = field.metadata?.customStyle;

      if (customStyle && typeof customStyle === 'string') {
        const result = validateCustomCSS(customStyle);

        if (!result.valid) {
          res.status(400).json({
            error: 'Invalid custom CSS',
            details: result.errors,
            field: field.id || field.fieldName,
          });
          return;
        }
      }
    }
  }

  next();
};
