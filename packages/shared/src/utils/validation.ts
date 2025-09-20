/**
 * Common validation utilities used across the application.
 * Provides consistent validation logic for frontend and backend.
 */

/**
 * Validates an email address format.
 * @param email - Email address to validate
 * @returns True if email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength.
 * @param password - Password to validate
 * @returns Object containing validation result and error messages
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a UUID v4 format.
 * @param uuid - UUID string to validate
 * @returns True if UUID format is valid
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitizes user input by removing potentially dangerous characters and patterns.
 * Provides comprehensive XSS protection through multiple sanitization layers.
 * @param input - User input to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Remove HTML tags and brackets
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')

    // Remove dangerous protocols
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/about:/gi, '')

    // Remove event handlers
    .replace(/on\w+\s*=/gi, '')

    // Remove script-related patterns
    .replace(/script/gi, '')
    .replace(/eval\s*\(/gi, '')
    .replace(/expression\s*\(/gi, '')

    // Remove dangerous characters and entities
    .replace(/&[#x]?\w+;/g, '') // HTML entities
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Control characters

    // Remove dangerous CSS patterns
    .replace(/behavior\s*:/gi, '')
    .replace(/-moz-binding\s*:/gi, '')

    // Remove SQL injection patterns
    .replace(/union\s+select/gi, '')
    .replace(/drop\s+table/gi, '')
    .replace(/delete\s+from/gi, '')
    .replace(/insert\s+into/gi, '')

    .trim();
}

/**
 * Validates and sanitizes HTML content for safe display.
 * More restrictive than general input sanitization.
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML string with only safe tags and attributes
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // List of allowed tags (very restrictive)
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'b', 'i'];
  const tagPattern = new RegExp(`<(?!/?(?:${allowedTags.join('|')})\\b)[^>]*>`, 'gi');

  return html
    .replace(tagPattern, '') // Remove all tags except allowed ones
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/style\s*=\s*["'][^"']*["']/gi, '') // Remove inline styles
    .trim();
}

/**
 * Validates if a string is not empty after trimming.
 * @param value - String to validate
 * @returns True if string is not empty
 */
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}