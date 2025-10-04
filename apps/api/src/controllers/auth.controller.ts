import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  authService,
  RegisterRequest,
  LoginRequest,
} from '../services/auth.service';
import { AccountLockoutMiddleware } from '../middleware/account-lockout.middleware';
import { SeedUtils } from '../utils/seed.utils';

/**
 * Helper function to extract client information from request.
 */
function getClientInfo(req: Request): {
  ipAddress: string | undefined;
  userAgent: string | undefined;
} {
  return {
    ipAddress: req.ip ?? req.connection.remoteAddress ?? undefined,
    userAgent: req.get('User-Agent') ?? undefined,
  };
}

/**
 * Authentication controller handling HTTP requests for authentication operations.
 * Manages user registration, login, token refresh, and logout functionality.
 */
export class AuthController {
  /**
   * Registers a new user with email and password.
   * @route POST /api/v1/auth/register
   * @param req - Express request object with registration data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with authentication tokens and user data
   * @example
   * POST /api/v1/auth/register
   * {
   *   "email": "user@example.com",
   *   "password": "SecurePass123!",
   *   "firstName": "John",
   *   "lastName": "Doe"
   * }
   */
  register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const registerData: RegisterRequest = {
        email: req.body.email,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        tenantId: req.body.tenantId,
      };

      const clientInfo = getClientInfo(req);
      const authResponse = await authService.register(registerData, clientInfo);

      res.status(201).json({
        message: 'User registered successfully',
        data: authResponse,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      // Handle specific errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Email already')) {
        res.status(409).json({
          error: 'Conflict',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (errorMessage.includes('Invalid')) {
        res.status(400).json({
          error: 'Bad Request',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  /**
   * Authenticates a user with email and password.
   * @route POST /api/v1/auth/login
   * @param req - Express request object with login credentials
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with authentication tokens and user data
   * @example
   * POST /api/v1/auth/login
   * {
   *   "email": "user@example.com",
   *   "password": "SecurePass123!"
   * }
   */
  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const loginData: LoginRequest = {
        email: req.body.email,
        password: req.body.password,
      };

      const clientInfo = getClientInfo(req);
      const authResponse = await authService.login(loginData, clientInfo);

      // Record successful login to clear any failed attempts
      AccountLockoutMiddleware.recordSuccessfulLogin(loginData.email);

      res.status(200).json({
        message: 'Login successful',
        data: authResponse,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      // Always return 401 for authentication failures for security
      if (error.message.includes('Invalid email or password')) {
        // Record failed login attempt
        if (req.body?.email) {
          AccountLockoutMiddleware.recordFailedAttempt(req.body.email);
        }

        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  /**
   * Refreshes access token using refresh token.
   * @route POST /api/v1/auth/refresh
   * @param req - Express request object with refresh token
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with new tokens
   * @example
   * POST /api/v1/auth/refresh
   * {
   *   "refreshToken": "jwt-refresh-token"
   * }
   */
  refresh = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);

      res.status(200).json({
        message: 'Token refreshed successfully',
        data: tokens,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      if (
        error.message.includes('Invalid') ||
        error.message.includes('expired')
      ) {
        res.status(401).json({
          error: 'Unauthorized',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  /**
   * Logs out a user by invalidating their refresh token.
   * @route POST /api/v1/auth/logout
   * @param req - Express request object with refresh token
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response confirming logout
   * @example
   * POST /api/v1/auth/logout
   * {
   *   "refreshToken": "jwt-refresh-token"
   * }
   */
  logout = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);

      res.status(200).json({
        message: 'Logged out successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * Logs out a user from all devices.
   * @route POST /api/v1/auth/logout-all
   * @param req - Express request object (requires authentication)
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response confirming logout from all devices
   * @example
   * POST /api/v1/auth/logout-all
   * Authorization: Bearer <access-token>
   */
  logoutAll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const deletedSessions = await authService.logoutAll((req.user as any).id);

      res.status(200).json({
        message: 'Logged out from all devices successfully',
        data: { sessionsDeleted: deletedSessions },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * Gets the authenticated user's profile.
   * @route GET /api/v1/auth/profile
   * @param req - Express request object (requires authentication)
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with user profile data
   * @example
   * GET /api/v1/auth/profile
   * Authorization: Bearer <access-token>
   */
  getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const profile = await authService.getProfile((req.user as any).id);

      res.status(200).json({
        message: 'Profile retrieved successfully',
        data: profile,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      if (error.message.includes('User not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  /**
   * Updates the authenticated user's profile.
   * @route PATCH /api/v1/auth/profile
   * @param req - Express request object with profile update data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with updated profile data
   * @example
   * PATCH /api/v1/auth/profile
   * Authorization: Bearer <access-token>
   * {
   *   "firstName": "Jane",
   *   "lastName": "Smith"
   * }
   */
  updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updateData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
      };

      const updatedProfile = await authService.updateProfile(
        (req.user as any).id,
        updateData
      );

      res.status(200).json({
        message: 'Profile updated successfully',
        data: updatedProfile,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      if (error.message.includes('Email already')) {
        res.status(409).json({
          error: 'Conflict',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (
        error.message.includes('Invalid') ||
        error.message.includes('No valid fields')
      ) {
        res.status(400).json({
          error: 'Bad Request',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  /**
   * Validates access token and returns user information.
   * @route GET /api/v1/auth/me
   * @param req - Express request object (requires authentication)
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with user information from token
   * @example
   * GET /api/v1/auth/me
   * Authorization: Bearer <access-token>
   */
  me = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Return user information from the authenticated request
      res.status(200).json({
        message: 'User information retrieved successfully',
        data: req.user,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * Initiates a password reset request.
   * @route POST /api/v1/auth/password-reset
   * @param req - Express request object with email in body
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response confirming reset email sent
   * @example
   * POST /api/v1/auth/password-reset
   * {
   *   "email": "user@example.com"
   * }
   */
  requestPasswordReset = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { email } = req.body;
      await authService.requestPasswordReset(email);

      // Always return success for security (don't reveal if email exists)
      res.status(200).json({
        message:
          'If the email address is associated with an account, a password reset link has been sent.',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * Confirms a password reset and updates the password.
   * @route POST /api/v1/auth/password-reset/confirm
   * @param req - Express request object with token and newPassword
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response confirming password update
   * @example
   * POST /api/v1/auth/password-reset/confirm
   * {
   *   "token": "reset-token-123",
   *   "newPassword": "NewPassword123!"
   * }
   */
  confirmPasswordReset = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { token, newPassword } = req.body;
      await authService.confirmPasswordReset(token, newPassword);

      res.status(200).json({
        message:
          'Password has been reset successfully. Please log in with your new password.',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      if (
        error.message.includes('Invalid') ||
        error.message.includes('expired') ||
        error.message.includes('used')
      ) {
        res.status(400).json({
          error: 'Bad Request',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next(error);
    }
  };

  /**
   * Validates a password reset token without using it.
   * @route GET /api/v1/auth/password-reset/validate/:token
   * @param req - Express request object with token in params
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with token validation result
   * @example
   * GET /api/v1/auth/password-reset/validate/reset-token-123
   */
  validatePasswordResetToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token } = req.params;

      if (!token) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Reset token is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const validation = await authService.validatePasswordResetToken(token);

      if (!validation.valid) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid or expired reset token',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        message: 'Reset token is valid',
        data: {
          valid: validation.valid,
          expiresAt: validation.expiresAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * Gets test user credentials for development environment only.
   * @route GET /api/v1/auth/test-credentials
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with test user credentials
   * @example
   * GET /api/v1/auth/test-credentials
   */
  getTestCredentials = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Only available in development environment
      if (process.env.NODE_ENV !== 'development') {
        res.status(404).json({
          error: 'Not Found',
          message: 'Test credentials are only available in development mode',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const credentials = SeedUtils.getTestCredentials();

      res.status(200).json({
        message: 'Test credentials retrieved successfully',
        data: {
          credentials,
          notice: 'These credentials are for development testing only',
          environment: process.env.NODE_ENV,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      next(error);
    }
  };
}

// Export singleton instance
export const authController = new AuthController();
