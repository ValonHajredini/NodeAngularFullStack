/**
 * CSS Validation Utility
 * Validates CSS code for security issues and malicious patterns
 * Part of defense-in-depth XSS protection strategy
 */

/**
 * CSS validation result with errors and warnings
 */
export interface CSSValidationResult {
  /** True if CSS is valid and safe to use */
  isValid: boolean;
  /** Critical errors that prevent CSS from being used */
  errors: string[];
  /** Non-critical warnings about potentially problematic CSS */
  warnings: string[];
}

/**
 * Validates CSS code for security issues
 * Checks for XSS attack vectors and potentially dangerous patterns
 *
 * Security Checks:
 * 1. javascript: URLs - CRITICAL XSS vector
 * 2. CSS expression() - IE-specific XSS vector
 * 3. url() with javascript: - XSS via background images
 * 4. @import rules - Can load malicious external CSS
 * 5. data: URLs with scripts - XSS via base64 encoding
 *
 * @param css - CSS code string to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = validateCSS('background: url("javascript:alert(1)")');
 * if (!result.isValid) {
 *   console.error(result.errors); // ['JavaScript URLs in url() are not allowed']
 * }
 * ```
 */
export function validateCSS(css: string): CSSValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!css || css.trim() === '') {
    return { isValid: true, errors, warnings };
  }

  // CRITICAL: Check for javascript: URLs (XSS vector)
  if (/javascript\s*:/i.test(css)) {
    errors.push('JavaScript URLs are not allowed in CSS');
  }

  // CRITICAL: Check for CSS expression() - IE-specific XSS
  if (/expression\s*\(/i.test(css)) {
    errors.push('CSS expression() is not allowed (IE-specific XSS vector)');
  }

  // CRITICAL: Check for url() with javascript:
  if (/url\s*\(\s*['""]?\s*javascript\s*:/i.test(css)) {
    errors.push('JavaScript URLs in url() are not allowed');
  }

  // CRITICAL: Check for data: URLs with potential scripts
  // Match data URLs that might contain javascript or HTML
  if (/url\s*\(\s*['""]?\s*data:[^,]*(?:javascript|<script)/i.test(css)) {
    errors.push('Data URLs with scripts are not allowed');
  }

  // WARNING: Check for @import (can load external malicious CSS)
  if (/@import/i.test(css)) {
    warnings.push('@import rules may not work in sandboxed environment and can be security risks');
  }

  // WARNING: Check for behavior: URLs (IE-specific, deprecated)
  if (/behavior\s*:/i.test(css)) {
    warnings.push('behavior: property is deprecated and may not work');
  }

  // WARNING: Check for -moz-binding (Firefox-specific XSS vector, deprecated)
  if (/-moz-binding/i.test(css)) {
    warnings.push('-moz-binding is deprecated and blocked for security');
  }

  // WARNING: Check for vbscript: URLs
  if (/vbscript\s*:/i.test(css)) {
    errors.push('VBScript URLs are not allowed');
  }

  // WARNING: Check for potential eval-like patterns
  if (/calc\s*\([^)]*(?:eval|expression|javascript)/i.test(css)) {
    errors.push('Potentially dangerous content in calc() function');
  }

  // WARNING: Extremely long CSS (potential DoS)
  if (css.length > 5000) {
    warnings.push('CSS exceeds recommended 5000 character limit');
  }

  // WARNING: Check for @ rules that could be problematic
  const dangerousAtRules = /@(?:font-face|namespace|document|supports)/i;
  if (dangerousAtRules.test(css)) {
    warnings.push('Some @-rules may not work correctly in sandboxed environment');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Strips potentially dangerous CSS patterns
 * Use with caution - sanitization should be primary defense
 *
 * @param css - CSS code string
 * @returns CSS with dangerous patterns removed
 */
export function stripDangerousCSS(css: string): string {
  if (!css) return '';

  let cleaned = css;

  // Remove javascript: URLs
  cleaned = cleaned.replace(/javascript\s*:[^;]*/gi, '');

  // Remove expression()
  cleaned = cleaned.replace(/expression\s*\([^)]*\)/gi, '');

  // Remove vbscript: URLs
  cleaned = cleaned.replace(/vbscript\s*:[^;]*/gi, '');

  // Remove -moz-binding
  cleaned = cleaned.replace(/-moz-binding\s*:[^;]*;?/gi, '');

  // Remove behavior:
  cleaned = cleaned.replace(/behavior\s*:[^;]*;?/gi, '');

  return cleaned;
}

/**
 * Checks if CSS contains any dangerous patterns
 * Fast pre-check before full validation
 *
 * @param css - CSS code string
 * @returns True if dangerous patterns detected
 */
export function containsDangerousCSS(css: string): boolean {
  const dangerousPatterns = [
    /javascript\s*:/i,
    /expression\s*\(/i,
    /vbscript\s*:/i,
    /-moz-binding/i,
    /behavior\s*:/i,
  ];

  return dangerousPatterns.some(pattern => pattern.test(css));
}
