import { body, param } from 'express-validator';

/**
 * Maximum allowed URL length to prevent abuse and database constraints.
 */
export const MAX_URL_LENGTH = 2048;

/**
 * Allowed URL schemes for security.
 * Only HTTP and HTTPS protocols are permitted.
 */
export const ALLOWED_SCHEMES = ['http:', 'https:'];

/**
 * Dangerous URL schemes that should be blocked for security.
 * These schemes can execute code or access local resources.
 */
export const DANGEROUS_SCHEMES = [
  'javascript:',
  'data:',
  'file:',
  'ftp:',
  'blob:',
  'chrome:',
  'chrome-extension:',
  'moz-extension:',
  'resource:',
  'about:',
  'ms-appx:',
  'ms-appx-web:',
  'vbscript:',
  'jar:',
  'view-source:',
  'content:',
  'livescript:',
];

/**
 * Validates URL format and scheme safety.
 * @param url - URL string to validate
 * @returns boolean indicating if URL is valid and safe
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url.trim());

    // Check if scheme is allowed
    if (!ALLOWED_SCHEMES.includes(parsedUrl.protocol)) {
      return false;
    }

    // Check for dangerous schemes
    if (
      DANGEROUS_SCHEMES.some((scheme) => url.toLowerCase().startsWith(scheme))
    ) {
      return false;
    }

    // Check URL length
    if (url.length > MAX_URL_LENGTH) {
      return false;
    }

    // Ensure hostname exists and is not empty
    if (!parsedUrl.hostname || parsedUrl.hostname.trim() === '') {
      return false;
    }

    // Block localhost and local network addresses in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsedUrl.hostname.toLowerCase();

      // Block localhost variants
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1'
      ) {
        return false;
      }

      // Block local network ranges (basic check)
      if (
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('172.17.') ||
        hostname.startsWith('172.18.') ||
        hostname.startsWith('172.19.') ||
        hostname.startsWith('172.20.') ||
        hostname.startsWith('172.21.') ||
        hostname.startsWith('172.22.') ||
        hostname.startsWith('172.23.') ||
        hostname.startsWith('172.24.') ||
        hostname.startsWith('172.25.') ||
        hostname.startsWith('172.26.') ||
        hostname.startsWith('172.27.') ||
        hostname.startsWith('172.28.') ||
        hostname.startsWith('172.29.') ||
        hostname.startsWith('172.30.') ||
        hostname.startsWith('172.31.')
      ) {
        return false;
      }
    }

    return true;
  } catch (error) {
    // Invalid URL format
    return false;
  }
}

/**
 * Sanitizes URL by trimming whitespace and ensuring proper format.
 * @param url - URL string to sanitize
 * @returns sanitized URL string
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();

  // Add protocol if missing (default to https)
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * Express validator for URL field in request body.
 * Validates URL format, scheme safety, and length constraints.
 */
export const urlValidator = [
  body('originalUrl')
    .trim()
    .notEmpty()
    .withMessage('URL is required')
    .isLength({ min: 10, max: MAX_URL_LENGTH })
    .withMessage(`URL must be between 10 and ${MAX_URL_LENGTH} characters`)
    .custom((url: string) => {
      const sanitized = sanitizeUrl(url);

      if (!isValidUrl(sanitized)) {
        throw new Error('Invalid URL format or unsafe scheme detected');
      }

      return true;
    })
    .customSanitizer((url: string) => {
      // Sanitize the URL for storage
      return sanitizeUrl(url);
    }),
];

/**
 * Express validator for short code parameter.
 * Validates code format and length.
 */
export const shortCodeValidator = [
  param('code')
    .trim()
    .isLength({ min: 6, max: 8 })
    .withMessage('Short code must be between 6 and 8 characters')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Short code must contain only alphanumeric characters')
    .custom((code: string) => {
      // Additional validation to ensure no confusing characters
      const confusingChars = /[0oO1lI]/;
      if (confusingChars.test(code)) {
        throw new Error('Short code contains potentially confusing characters');
      }
      return true;
    }),
];

/**
 * Express validator for optional expiration date.
 * Validates that expiration is in the future if provided.
 */
export const expirationValidator = [
  body('expiresAt')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('Expiration date must be in ISO 8601 format')
    .custom((dateString: string) => {
      const expirationDate = new Date(dateString);
      const now = new Date();

      if (expirationDate <= now) {
        throw new Error('Expiration date must be in the future');
      }

      // Limit expiration to reasonable timeframe (e.g., 10 years)
      const maxExpiration = new Date();
      maxExpiration.setFullYear(maxExpiration.getFullYear() + 10);

      if (expirationDate > maxExpiration) {
        throw new Error(
          'Expiration date cannot be more than 10 years in the future'
        );
      }

      return true;
    })
    .toDate(), // Convert to Date object
];

/**
 * Combined validator for creating short links.
 * Includes URL, optional expiration validation.
 */
export const createShortLinkValidator = [
  ...urlValidator,
  ...expirationValidator,
];

/**
 * Validator for resolving short links by code.
 */
export const resolveShortLinkValidator = [...shortCodeValidator];

/**
 * Additional security check for URL content.
 * Performs basic checks for suspicious patterns.
 * @param url - URL to check
 * @returns boolean indicating if URL passes security checks
 */
export function performSecurityCheck(url: string): boolean {
  const lowerUrl = url.toLowerCase();

  // Check for suspicious patterns
  const suspiciousPatterns = [
    'eval(',
    'onclick=',
    'onload=',
    'onerror=',
    'onmouseover=',
    'onfocus=',
    'javascript:',
    'data:text/html',
    'data:image/svg+xml',
    '<script',
    '</script>',
    'document.cookie',
    'document.write',
    'window.location',
    'document.location',
  ];

  return !suspiciousPatterns.some((pattern) => lowerUrl.includes(pattern));
}

/**
 * Domain-based validation (optional feature for future enhancement).
 * Can be used to implement domain allowlists/blocklists.
 * @param hostname - Domain hostname to validate
 * @returns boolean indicating if domain is allowed
 */
export function isDomainAllowed(hostname: string): boolean {
  // This can be enhanced with actual allowlist/blocklist logic
  // For now, just basic validation

  // Block common spam/malicious domains (basic examples)
  const blockedDomains = [
    'bit.ly', // Recursive shortening prevention
    'tinyurl.com',
    'short.link',
    'ow.ly',
    'goo.gl',
    't.co',
  ];

  const lowerHostname = hostname.toLowerCase();

  // Don't allow shortening other URL shorteners (prevents recursion)
  return !blockedDomains.some((blocked) => lowerHostname.includes(blocked));
}

/**
 * Rate limiting helper for URL validation.
 * Tracks validation attempts per IP/user to prevent abuse.
 */
export class UrlValidationRateLimit {
  private static attempts: Map<string, { count: number; lastAttempt: Date }> =
    new Map();
  private static readonly MAX_ATTEMPTS = 10;
  private static readonly WINDOW_MS = 60000; // 1 minute

  /**
   * Checks if validation attempts are within rate limits.
   * @param identifier - IP address or user ID
   * @returns boolean indicating if validation is allowed
   */
  static isAllowed(identifier: string): boolean {
    const now = new Date();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Reset if window expired
    if (now.getTime() - record.lastAttempt.getTime() > this.WINDOW_MS) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Check rate limit
    if (record.count >= this.MAX_ATTEMPTS) {
      return false;
    }

    // Increment count
    record.count++;
    record.lastAttempt = now;
    return true;
  }

  /**
   * Clears old entries to prevent memory leaks.
   */
  static cleanup(): void {
    const now = new Date();
    const cutoff = now.getTime() - this.WINDOW_MS * 2; // Keep extra window for safety

    for (const [key, record] of this.attempts.entries()) {
      if (record.lastAttempt.getTime() < cutoff) {
        this.attempts.delete(key);
      }
    }
  }
}
