import safeRegex from 'safe-regex';

/**
 * Result of regex pattern validation for security and complexity checks
 */
export interface RegexValidationResult {
  /** Whether the regex pattern is safe to use */
  valid: boolean;
  /** Array of error messages describing validation failures */
  errors: string[];
}

/**
 * Validates regex pattern for ReDoS (Regular Expression Denial of Service) attacks.
 * Uses safe-regex library to detect potentially dangerous patterns.
 *
 * Security checks:
 * - Pattern syntax validation
 * - ReDoS vulnerability detection using safe-regex
 * - Length limits (max 500 characters)
 * - Nested quantifier complexity checks
 *
 * @param pattern - Regular expression pattern string to validate
 * @returns Validation result with valid flag and errors array
 *
 * @example
 * ```typescript
 * // Safe pattern
 * validateRegexPattern('^[a-zA-Z0-9]+$') // { valid: true, errors: [] }
 *
 * // ReDoS vulnerable pattern
 * validateRegexPattern('(a+)+') // { valid: false, errors: ['ReDoS vulnerability detected'] }
 * ```
 */
export function validateRegexPattern(pattern: string): RegexValidationResult {
  const errors: string[] = [];

  // Check if pattern is empty (allowed - means no pattern validation)
  if (!pattern || pattern.trim() === '') {
    return { valid: true, errors: [] };
  }

  // Check pattern length (max 500 characters to prevent abuse)
  if (pattern.length > 500) {
    errors.push('Regex pattern exceeds maximum length of 500 characters');
  }

  // Validate regex syntax by attempting to construct RegExp
  try {
    new RegExp(pattern);
  } catch (e: any) {
    errors.push(`Invalid regex syntax: ${e.message}`);
    return { valid: false, errors };
  }

  // Check for ReDoS vulnerabilities using safe-regex library
  // This detects exponential-time regex patterns that can cause DoS
  if (!safeRegex(pattern)) {
    errors.push(
      'Regex pattern may cause performance issues (ReDoS vulnerability detected)'
    );
  }

  // Check for excessive nested quantifiers (additional heuristic)
  // Patterns like (a*b*c*d*)+ can cause exponential backtracking
  const nestedQuantifiersMatch = pattern.match(/(\*|\+|\{[^}]+\}){2,}/g) || [];
  if (nestedQuantifiersMatch.length > 3) {
    errors.push(
      'Regex pattern has excessive nested quantifiers (complexity too high)'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
