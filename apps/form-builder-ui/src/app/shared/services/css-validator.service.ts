import { Injectable } from '@angular/core';
import { CSSValidationResult } from '@nodeangularfullstack/shared';

/**
 * Service for client-side CSS validation.
 * Validates custom CSS for potentially dangerous patterns before submission.
 * Server-side validation is the authoritative check - this provides early UX feedback.
 */
@Injectable({ providedIn: 'root' })
export class CssValidatorService {
  /**
   * Patterns that are potentially dangerous and may be blocked by server-side validation
   */
  private readonly DANGEROUS_PATTERNS = [
    'javascript:',
    'expression(',
    '@import',
    'url(http://', // Only allow https URLs
    '<script',
    'onerror=',
    'onload=',
    'data:text/html',
  ];

  /**
   * Validates CSS string for potentially dangerous patterns.
   * Returns warnings (not errors) - server-side validation is authoritative.
   *
   * @param css - Custom CSS string to validate
   * @returns Validation result with warnings array
   *
   * @example
   * ```typescript
   * const result = cssValidatorService.validateCSS('color: blue; padding: 10px;');
   * if (!result.valid) {
   *   console.log('Warnings:', result.warnings);
   * }
   * ```
   */
  validateCSS(css: string): CSSValidationResult {
    const warnings: string[] = [];

    if (!css || css.trim() === '') {
      return {
        valid: true,
        warnings: [],
        errors: [],
      };
    }

    // Check length
    if (css.length > 5000) {
      warnings.push('CSS exceeds 5000 character limit and will be rejected by server');
    }

    // Check for dangerous patterns
    const lowerCSS = css.toLowerCase();
    this.DANGEROUS_PATTERNS.forEach((pattern) => {
      if (lowerCSS.includes(pattern.toLowerCase())) {
        warnings.push(`Pattern '${pattern}' may be blocked by server validation`);
      }
    });

    return {
      valid: warnings.length === 0,
      warnings,
      errors: [],
    };
  }
}
