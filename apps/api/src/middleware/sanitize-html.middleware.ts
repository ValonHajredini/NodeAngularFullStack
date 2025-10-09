/**
 * HTML Sanitization Middleware
 * Server-side HTML sanitization for custom background fields in forms
 * Part of defense-in-depth XSS protection strategy
 */

import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes custom background HTML in form schema fields
 * Implements server-side sanitization as defense-in-depth measure
 * Even though client sanitizes, server must re-sanitize to prevent bypass
 *
 * Security Policy:
 * - Only whitelisted HTML tags allowed (div, span, p, h1-h3, style)
 * - Only whitelisted attributes allowed (class, id, style)
 * - All event handlers removed (onclick, onerror, onload, etc.)
 * - Dangerous tags removed (script, iframe, object, embed, link, base)
 * - Data attributes blocked
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function sanitizeFormHTML(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const schema = req.body?.schema;
    if (!schema) {
      return next();
    }

    // Track if sanitization occurred for audit logging
    let sanitizedFieldCount = 0;
    let dangerousContentFound = false;

    if (Array.isArray(schema.fields)) {
      // Iterate through all fields and sanitize custom background HTML
      schema.fields = schema.fields.map((field: any) => {
        // Only process BACKGROUND_CUSTOM fields
        if (field.type !== 'background-custom' || !field.metadata?.html) {
          return field;
        }

        // Check for dangerous content before sanitization
        const originalHTML = field.metadata.html;
        if (containsDangerousPatterns(originalHTML)) {
          dangerousContentFound = true;
          console.warn('⚠️  Dangerous HTML detected in form submission', {
            fieldId: field.id,
            userId: (req as any).user?.id,
            patterns: detectDangerousPatterns(originalHTML),
          });
        }

        const sanitizedHTML = sanitizeHtmlContent(field.metadata.html);

        // Check if content was modified (indicates malicious content was removed)
        if (sanitizedHTML !== originalHTML) {
          sanitizedFieldCount++;
          console.info('🧼 Sanitized custom background HTML', {
            fieldId: field.id,
            userId: (req as any).user?.id,
            originalLength: originalHTML.length,
            sanitizedLength: sanitizedHTML.length,
          });
        }

        // Validate CSS if present (just warn, don't block)
        if (field.metadata.css) {
          const cssValidation = validateCSS(field.metadata.css);
          if (!cssValidation.isValid) {
            console.warn('⚠️  Invalid CSS in form submission', {
              fieldId: field.id,
              userId: (req as any).user?.id,
              errors: cssValidation.errors,
            });
          }
        }

        // Return field with sanitized HTML
        return {
          ...field,
          metadata: {
            ...field.metadata,
            html: sanitizedHTML,
          },
        };
      });
    }

    // Sanitize background settings stored in schema settings
    if (schema.settings?.background) {
      const background = schema.settings.background;
      if (background.customHtml) {
        const originalHTML = background.customHtml;

        if (containsDangerousPatterns(originalHTML)) {
          dangerousContentFound = true;
          console.warn('⚠️  Dangerous HTML detected in background settings', {
            userId: (req as any).user?.id,
            patterns: detectDangerousPatterns(originalHTML),
          });
        }

        const sanitizedHTML = sanitizeHtmlContent(originalHTML);

        if (sanitizedHTML !== originalHTML) {
          console.info('🧼 Sanitized custom background HTML (form settings)', {
            userId: (req as any).user?.id,
            originalLength: originalHTML.length,
            sanitizedLength: sanitizedHTML.length,
          });
        }

        schema.settings.background.customHtml = sanitizedHTML;
      }

      if (background.customCss) {
        const cssValidation = validateCSS(background.customCss);
        if (!cssValidation.isValid) {
          console.warn('⚠️  Invalid CSS in background settings', {
            userId: (req as any).user?.id,
            errors: cssValidation.errors,
          });
        }
      }
    }

    // Log summary if any sanitization occurred
    if (sanitizedFieldCount > 0 || dangerousContentFound) {
      console.warn('🔒 Form HTML sanitization summary', {
        userId: (req as any).user?.id,
        formId: req.body.id,
        sanitizedFields: sanitizedFieldCount,
        dangerousContentFound,
        endpoint: req.path,
        method: req.method,
      });
    }

    next();
  } catch (error) {
    console.error('❌ Error in HTML sanitization middleware:', error);
    // Don't block request on sanitization error - just log and continue
    // This is safer than rejecting legitimate requests
    next();
  }
}

/**
 * Checks if HTML contains potentially dangerous patterns
 * @param html - HTML string to check
 * @returns True if dangerous patterns detected
 */
function containsDangerousPatterns(html: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
    /<svg[^>]*onload/i,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(html));
}

/**
 * Detects specific dangerous patterns for logging
 * @param html - HTML string to analyze
 * @returns Array of detected pattern names
 */
function detectDangerousPatterns(html: string): string[] {
  const patterns: Array<{ name: string; regex: RegExp }> = [
    { name: 'script tags', regex: /<script/i },
    { name: 'javascript: URLs', regex: /javascript:/i },
    { name: 'event handlers', regex: /on\w+\s*=/i },
    { name: 'iframe tags', regex: /<iframe/i },
    { name: 'object tags', regex: /<object/i },
    { name: 'embed tags', regex: /<embed/i },
    { name: 'eval() calls', regex: /eval\(/i },
    { name: 'CSS expression()', regex: /expression\(/i },
  ];

  return patterns.filter((p) => p.regex.test(html)).map((p) => p.name);
}

/**
 * Sanitizes HTML content using DOMPurify with a strict whitelist.
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string
 */
function sanitizeHtmlContent(html: string): string {
  return DOMPurify.sanitize(html, {
    // Whitelist: Only these tags are allowed
    ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'style'],

    // Whitelist: Only these attributes are allowed
    ALLOWED_ATTR: ['class', 'id', 'style'],

    // Blacklist: Explicitly forbidden tags (redundant but clear)
    FORBID_TAGS: [
      'script',
      'iframe',
      'object',
      'embed',
      'link',
      'base',
      'meta',
      'form',
      'input',
      'button',
      'a',
      'img',
      'video',
      'audio',
      'svg',
    ],

    // Blacklist: All event handler attributes
    FORBID_ATTR: [
      // Mouse events
      'onclick',
      'ondblclick',
      'onmousedown',
      'onmouseup',
      'onmouseover',
      'onmouseout',
      'onmousemove',
      'onmouseenter',
      'onmouseleave',
      // Keyboard events
      'onkeydown',
      'onkeyup',
      'onkeypress',
      // Form events
      'onfocus',
      'onblur',
      'onchange',
      'oninput',
      'onsubmit',
      'onreset',
      // Load events
      'onload',
      'onerror',
      'onabort',
      // Touch events
      'ontouchstart',
      'ontouchend',
      'ontouchmove',
      'ontouchcancel',
      // Pointer events
      'onpointerdown',
      'onpointerup',
      'onpointermove',
      'onpointercancel',
      // Drag events
      'ondrag',
      'ondrop',
      'ondragstart',
      'ondragend',
      'ondragover',
      // Other events
      'onscroll',
      'onwheel',
      'onanimationstart',
      'onanimationend',
      'onanimationiteration',
      'ontransitionend',
      // Dangerous attributes
      'formaction',
      'action',
      'href',
      'src',
      'data',
      'poster',
    ],

    // Security settings
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    FORCE_BODY: false,
    SANITIZE_DOM: true,
    WHOLE_DOCUMENT: false,
    IN_PLACE: false,
  });
}

/**
 * Basic CSS validation for security issues
 * @param css - CSS string to validate
 * @returns Validation result
 */
function validateCSS(css: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!css || css.trim() === '') {
    return { isValid: true, errors };
  }

  // Check for javascript: URLs
  if (/javascript\s*:/i.test(css)) {
    errors.push('JavaScript URLs are not allowed in CSS');
  }

  // Check for CSS expression()
  if (/expression\s*\(/i.test(css)) {
    errors.push('CSS expression() is not allowed');
  }

  // Check for url() with javascript:
  if (/url\s*\(\s*['""]?\s*javascript\s*:/i.test(css)) {
    errors.push('JavaScript URLs in url() are not allowed');
  }

  // Check for vbscript: URLs
  if (/vbscript\s*:/i.test(css)) {
    errors.push('VBScript URLs are not allowed');
  }

  // Check length limit
  if (css.length > 5000) {
    errors.push('CSS exceeds 5000 character limit');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
