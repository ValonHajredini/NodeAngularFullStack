import { body, ValidationChain } from 'express-validator';
import { PasswordUtils } from './password.utils';

/**
 * Validation utilities for authentication endpoints.
 * Uses express-validator for robust input validation and sanitization.
 */
export class ValidationUtils {
  /**
   * Validation rules for user registration.
   * @returns Array of validation chains for registration endpoint
   * @example
   * app.post('/register', ValidationUtils.registerValidation(), registerController);
   */
  static registerValidation(): ValidationChain[] {
    return [
      body('email')
        .trim()
        .isEmail()
        .withMessage('Must be a valid email address')
        .normalizeEmail({
          gmail_lowercase: true,
          gmail_remove_dots: false,
          gmail_remove_subaddress: false,
        })
        .isLength({ max: 255 })
        .withMessage('Email must be less than 255 characters')
        .custom((value) => {
          // Additional email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new Error('Invalid email format');
          }
          return true;
        }),

      body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .custom((value) => {
          const validation = PasswordUtils.validatePassword(value);
          if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
          }
          return true;
        }),

      body('firstName')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('First name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

      body('lastName')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Last name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

      body('tenantId')
        .optional()
        .isUUID()
        .withMessage('Tenant ID must be a valid UUID'),
    ];
  }

  /**
   * Validation rules for user login.
   * @returns Array of validation chains for login endpoint
   * @example
   * app.post('/login', ValidationUtils.loginValidation(), loginController);
   */
  static loginValidation(): ValidationChain[] {
    return [
      body('email')
        .isEmail()
        .withMessage('Must be a valid email address')
        .normalizeEmail({
          gmail_lowercase: true,
          gmail_remove_dots: false,
          gmail_remove_subaddress: false,
        }),

      body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 1, max: 128 })
        .withMessage('Password must be less than 128 characters'),
    ];
  }

  /**
   * Validation rules for token refresh.
   * @returns Array of validation chains for refresh token endpoint
   * @example
   * app.post('/refresh', ValidationUtils.refreshTokenValidation(), refreshController);
   */
  static refreshTokenValidation(): ValidationChain[] {
    return [
      body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token is required')
        .isString()
        .withMessage('Refresh token must be a string'),
    ];
  }

  /**
   * Validation rules for password reset request.
   * @returns Array of validation chains for password reset request endpoint
   * @example
   * app.post('/password-reset', ValidationUtils.passwordResetRequestValidation(), resetController);
   */
  static passwordResetRequestValidation(): ValidationChain[] {
    return [
      body('email')
        .isEmail()
        .withMessage('Must be a valid email address')
        .normalizeEmail({
          gmail_lowercase: true,
          gmail_remove_dots: false,
          gmail_remove_subaddress: false,
        }),
    ];
  }

  /**
   * Validation rules for password reset confirmation.
   * @returns Array of validation chains for password reset confirmation endpoint
   * @example
   * app.post('/password-reset/confirm', ValidationUtils.passwordResetConfirmValidation(), confirmController);
   */
  static passwordResetConfirmValidation(): ValidationChain[] {
    return [
      body('token')
        .notEmpty()
        .withMessage('Reset token is required')
        .isLength({ min: 1, max: 255 })
        .withMessage('Reset token must be less than 255 characters'),

      body('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .custom((value) => {
          const validation = PasswordUtils.validatePassword(value);
          if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
          }
          return true;
        }),
    ];
  }

  /**
   * Validation rules for profile updates.
   * @returns Array of validation chains for profile update endpoint
   * @example
   * app.patch('/profile', ValidationUtils.profileUpdateValidation(), updateProfileController);
   */
  static profileUpdateValidation(): ValidationChain[] {
    return [
      body('firstName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('First name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

      body('lastName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Last name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

      body('email')
        .optional()
        .isEmail()
        .withMessage('Must be a valid email address')
        .normalizeEmail({
          gmail_lowercase: true,
          gmail_remove_dots: false,
          gmail_remove_subaddress: false,
        })
        .isLength({ max: 255 })
        .withMessage('Email must be less than 255 characters'),
    ];
  }

  /**
   * Validation rules for password change.
   * @returns Array of validation chains for password change endpoint
   * @example
   * app.post('/change-password', ValidationUtils.passwordChangeValidation(), changePasswordController);
   */
  static passwordChangeValidation(): ValidationChain[] {
    return [
      body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required')
        .isLength({ min: 1, max: 128 })
        .withMessage('Current password must be less than 128 characters'),

      body('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('New password must be between 8 and 128 characters')
        .custom((value, { req }) => {
          if (value === req.body.currentPassword) {
            throw new Error('New password must be different from current password');
          }

          const validation = PasswordUtils.validatePassword(value);
          if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
          }
          return true;
        }),

      body('confirmPassword')
        .custom((value, { req }) => {
          if (value !== req.body.newPassword) {
            throw new Error('Password confirmation does not match new password');
          }
          return true;
        }),
    ];
  }

  /**
   * General email validation utility.
   * @param email - Email to validate
   * @returns Validation result with errors
   * @example
   * const result = ValidationUtils.validateEmail('user@example.com');
   * if (!result.isValid) {
   *   console.log(result.errors);
   * }
   */
  static validateEmail(email: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!email || typeof email !== 'string') {
      errors.push('Email is required');
      return { isValid: false, errors };
    }

    const trimmedEmail = email.trim();

    if (trimmedEmail.length === 0) {
      errors.push('Email cannot be empty');
    }

    if (trimmedEmail.length > 255) {
      errors.push('Email must be less than 255 characters');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      errors.push('Invalid email format');
    }

    // Check for common email issues
    if (trimmedEmail.includes('..')) {
      errors.push('Email cannot contain consecutive dots');
    }

    if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
      errors.push('Email cannot start or end with a dot');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * General UUID validation utility.
   * @param uuid - UUID to validate
   * @returns True if valid UUID format
   * @example
   * if (ValidationUtils.isValidUUID(userId)) {
   *   // Process valid UUID
   * }
   */
  static isValidUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') {
      return false;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Sanitizes user input by removing dangerous characters.
   * @param input - Input to sanitize
   * @returns Sanitized string
   * @example
   * const cleanInput = ValidationUtils.sanitizeInput(userInput);
   */
  static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .slice(0, 1000); // Limit length to prevent DoS
  }

  /**
   * Validates and sanitizes a name field.
   * @param name - Name to validate
   * @param fieldName - Field name for error messages
   * @returns Validation result with sanitized value
   * @example
   * const result = ValidationUtils.validateName(firstName, 'first name');
   */
  static validateName(name: string, fieldName: string): {
    isValid: boolean;
    errors: string[];
    sanitizedValue: string;
  } {
    const errors: string[] = [];
    let sanitizedValue = '';

    if (!name || typeof name !== 'string') {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors, sanitizedValue };
    }

    sanitizedValue = name.trim();

    if (sanitizedValue.length === 0) {
      errors.push(`${fieldName} cannot be empty`);
    }

    if (sanitizedValue.length > 100) {
      errors.push(`${fieldName} must be less than 100 characters`);
    }

    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(sanitizedValue)) {
      errors.push(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`);
    }

    return { isValid: errors.length === 0, errors, sanitizedValue };
  }
}