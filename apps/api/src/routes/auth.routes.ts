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
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Refresh access token using a valid refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *           example:
 *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token refresh successful
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
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logout user by invalidating refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token to invalidate
 *           example:
 *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 */
router.post(
  '/logout',
  ValidationMiddleware.validateContentType(['application/json']),
  authController.logout
);

/**
 * @swagger
 * /api/v1/auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     description: Logout user from all devices by invalidating all refresh tokens
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout from all devices successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out from all devices successfully"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.get('/profile', AuthMiddleware.authenticate, authController.getProfile);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   patch:
 *     summary: Update user profile
 *     description: Update authenticated user's profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateRequest'
 *           example:
 *             firstName: "Jane"
 *             lastName: "Smith"
 *             email: "jane.smith@example.com"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/auth/password-reset:
 *   post:
 *     summary: Request password reset
 *     description: Request password reset email (always returns success for security)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordResetRequest'
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: Password reset email sent (always returns success for security)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset email sent if account exists"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
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
 * @swagger
 * /api/v1/auth/password-reset/confirm:
 *   post:
 *     summary: Confirm password reset
 *     description: Confirm password reset with token and set new password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordResetConfirm'
 *           example:
 *             token: "abc123def456"
 *             newPassword: "NewSecurePassword123!"
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset successful"
 *       400:
 *         description: Invalid token or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/v1/auth/password-reset/validate/{token}:
 *   get:
 *     summary: Validate password reset token
 *     description: Validate password reset token without using it
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token to validate
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/password-reset/validate/:token',
  // RateLimitMiddleware.generalAuthRateLimit(), // Temporarily disabled due to IPv6 issue
  authController.validatePasswordResetToken
);

/**
 * @swagger
 * /api/v1/auth/test-credentials:
 *   get:
 *     summary: Get test credentials
 *     description: Get test user credentials for development environment
 *     tags: [Authentication, Development]
 *     responses:
 *       200:
 *         description: Test credentials for development testing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 testUsers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: string
 *                         format: email
 *                       password:
 *                         type: string
 *                       role:
 *                         type: string
 *                         enum: [admin, user, readonly]
 *       404:
 *         description: Not available in production mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/test-credentials',
  // RateLimitMiddleware.generalAuthRateLimit(), // Temporarily disabled due to IPv6 issue
  authController.getTestCredentials
);

/**
 * @swagger
 * /api/v1/auth/dev/unlock-account:
 *   post:
 *     summary: Unlock a user account (Development only)
 *     description: Unlocks a user account that has been locked due to failed login attempts. Only available in development mode.
 *     tags: [Authentication, Development]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the account to unlock
 *           example:
 *             email: "admin@example.com"
 *     responses:
 *       200:
 *         description: Account unlocked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Account unlocked successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     wasLocked:
 *                       type: boolean
 *                     previousAttempts:
 *                       type: number
 *       404:
 *         description: Not available in production mode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/dev/unlock-account',
  ValidationMiddleware.validateContentType(['application/json']),
  authController.unlockAccount
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get token information
 *     description: Get user information from access token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information from token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserProfile'
 *                 tokenInfo:
 *                   type: object
 *                   properties:
 *                     issuedAt:
 *                       type: string
 *                       format: date-time
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', AuthMiddleware.authenticate, authController.me);

// Apply authentication event logging to all auth routes
router.use(AuthMiddleware.logAuthEvents);

export default router;
