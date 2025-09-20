import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { ValidationUtils } from '../utils/validation.utils';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';
// import { RateLimitMiddleware } from '../middleware/rate-limit.middleware'; // Temporarily disabled due to IPv6 issue
import { AccountLockoutMiddleware } from '../middleware/account-lockout.middleware';

/**
 * Authentication routes for user registration, login, and profile management.
 * Handles all authentication-related HTTP endpoints with proper validation.
 */
const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Register a new user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *           example:
 *             email: "user@example.com"
 *             password: "SecurePass123!"
 *             firstName: "John"
 *             lastName: "Doe"
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/register',
  ValidationUtils.registerValidation(),
  ValidationMiddleware.handleValidationErrors,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateContentType(['application/json']),
  ValidationMiddleware.validateBodySize(1024 * 10), // 10KB limit for registration
  authController.register
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *           example:
 *             email: "user@example.com"
 *             password: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/login',
  // RateLimitMiddleware.loginRateLimit(), // Temporarily disabled due to IPv6 issue
  AccountLockoutMiddleware.checkAccountLockout,
  ValidationUtils.loginValidation(),
  ValidationMiddleware.handleValidationErrors,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateContentType(['application/json']),
  authController.login
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 * @body {string} refreshToken - Valid JWT refresh token
 * @returns {object} 200 - Token refresh successful with new tokens
 * @returns {object} 400 - Validation error
 * @returns {object} 401 - Invalid or expired refresh token
 * @example
 * POST /api/v1/auth/refresh
 * {
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
router.post(
  '/refresh',
  // RateLimitMiddleware.refreshTokenRateLimit(), // Temporarily disabled due to IPv6 issue
  ValidationUtils.refreshTokenValidation(),
  ValidationMiddleware.handleValidationErrors,
  ValidationMiddleware.validateContentType(['application/json']),
  authController.refresh
);

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user by invalidating refresh token
 * @access Public
 * @body {string} [refreshToken] - Refresh token to invalidate
 * @returns {object} 200 - Logout successful
 * @example
 * POST /api/v1/auth/logout
 * {
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
router.post(
  '/logout',
  ValidationMiddleware.validateContentType(['application/json']),
  authController.logout
);

/**
 * @route POST /api/v1/auth/logout-all
 * @desc Logout user from all devices
 * @access Protected
 * @headers {string} Authorization - Bearer access token
 * @returns {object} 200 - Logout from all devices successful
 * @returns {object} 401 - Authentication required
 * @example
 * POST /api/v1/auth/logout-all
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
router.post(
  '/logout-all',
  AuthMiddleware.authenticate,
  authController.logoutAll
);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Get user profile
 *     description: Get authenticated user's profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/profile',
  AuthMiddleware.authenticate,
  authController.getProfile
);

/**
 * @route PATCH /api/v1/auth/profile
 * @desc Update authenticated user's profile
 * @access Protected
 * @headers {string} Authorization - Bearer access token
 * @body {string} [firstName] - Updated first name
 * @body {string} [lastName] - Updated last name
 * @body {string} [email] - Updated email address
 * @returns {object} 200 - Profile updated successfully
 * @returns {object} 400 - Validation error
 * @returns {object} 401 - Authentication required
 * @returns {object} 409 - Email already exists
 * @example
 * PATCH /api/v1/auth/profile
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * {
 *   "firstName": "Jane",
 *   "lastName": "Smith"
 * }
 */
router.patch(
  '/profile',
  AuthMiddleware.authenticate,
  ValidationUtils.profileUpdateValidation(),
  ValidationMiddleware.handleValidationErrors,
  ValidationMiddleware.sanitizeInput,
  ValidationMiddleware.validateContentType(['application/json']),
  authController.updateProfile
);

/**
 * @route POST /api/v1/auth/password-reset
 * @desc Request password reset
 * @access Public
 * @body {string} email - User email address
 * @returns {object} 200 - Password reset email sent (always returns success for security)
 * @returns {object} 400 - Validation error
 * @example
 * POST /api/v1/auth/password-reset
 * {
 *   "email": "user@example.com"
 * }
 */
router.post(
  '/password-reset',
  // RateLimitMiddleware.passwordResetRateLimit(), // Temporarily disabled due to IPv6 issue
  ValidationUtils.passwordResetRequestValidation(),
  ValidationMiddleware.handleValidationErrors,
  ValidationMiddleware.validateContentType(['application/json']),
  authController.requestPasswordReset
);

/**
 * @route POST /api/v1/auth/password-reset/confirm
 * @desc Confirm password reset with token and set new password
 * @access Public
 * @body {string} token - Password reset token
 * @body {string} newPassword - New password meeting security requirements
 * @returns {object} 200 - Password reset successful
 * @returns {object} 400 - Invalid token or validation error
 * @example
 * POST /api/v1/auth/password-reset/confirm
 * {
 *   "token": "abc123def456",
 *   "newPassword": "NewSecurePassword123!"
 * }
 */
router.post(
  '/password-reset/confirm',
  // RateLimitMiddleware.passwordResetRateLimit(), // Temporarily disabled due to IPv6 issue
  ValidationUtils.passwordResetConfirmValidation(),
  ValidationMiddleware.handleValidationErrors,
  ValidationMiddleware.validateContentType(['application/json']),
  authController.confirmPasswordReset
);

/**
 * @route GET /api/v1/auth/password-reset/validate/:token
 * @desc Validate password reset token without using it
 * @access Public
 * @param {string} token - Password reset token to validate
 * @returns {object} 200 - Token is valid with expiration info
 * @returns {object} 400 - Invalid or expired token
 * @example
 * GET /api/v1/auth/password-reset/validate/abc123def456
 */
router.get(
  '/password-reset/validate/:token',
  // RateLimitMiddleware.generalAuthRateLimit(), // Temporarily disabled due to IPv6 issue
  authController.validatePasswordResetToken
);

/**
 * @route GET /api/v1/auth/test-credentials
 * @desc Get test user credentials for development environment
 * @access Public (Development only)
 * @returns {object} 200 - Test credentials for development testing
 * @returns {object} 404 - Not available in production mode
 * @example
 * GET /api/v1/auth/test-credentials
 */
router.get(
  '/test-credentials',
  // RateLimitMiddleware.generalAuthRateLimit(), // Temporarily disabled due to IPv6 issue
  authController.getTestCredentials
);

/**
 * @route GET /api/v1/auth/me
 * @desc Get user information from access token
 * @access Protected
 * @headers {string} Authorization - Bearer access token
 * @returns {object} 200 - User information from token
 * @returns {object} 401 - Authentication required
 * @example
 * GET /api/v1/auth/me
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
router.get(
  '/me',
  AuthMiddleware.authenticate,
  authController.me
);

// Apply authentication event logging to all auth routes
router.use(AuthMiddleware.logAuthEvents);

export default router;