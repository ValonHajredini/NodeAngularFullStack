import {
  usersRepository,
  User,
  CreateUserData,
} from '../repositories/users.repository';
import { sessionsRepository } from '../repositories/sessions.repository';
import {
  passwordResetRepository,
  PasswordResetRepository,
} from '../repositories/password-resets.repository';
import { emailService } from '../services/email.service';
import { tenantRepository } from '../repositories/tenant.repository';
import { PasswordUtils } from '../utils/password.utils';
import { JwtUtils, TokenPair } from '../utils/jwt.utils';
import { ValidationUtils } from '../utils/validation.utils';
import { config } from '../utils/config.utils';
import { tenantConfig } from '../config/tenant.config';
import { TenantContext } from '../utils/tenant.utils';

/**
 * Registration request interface.
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
}

/**
 * Login request interface.
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Authentication response interface.
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'passwordHash'>;
}

/**
 * User profile interface (without sensitive data).
 */
export interface UserProfile {
  id: string;
  tenantId?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  emailVerified: boolean;
}

/**
 * Authentication service handling business logic for user authentication.
 * Manages registration, login, token refresh, and profile operations.
 */
export class AuthService {
  /**
   * Registers a new user with email and password.
   * @param registerData - User registration information
   * @param clientInfo - Client IP and user agent for session tracking
   * @returns Promise containing authentication response with tokens
   * @throws {Error} When registration fails or email already exists
   * @example
   * const authResponse = await authService.register({
   *   email: 'user@example.com',
   *   password: 'SecurePass123!',
   *   firstName: 'John',
   *   lastName: 'Doe'
   * }, { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0...' });
   */
  async register(
    registerData: RegisterRequest,
    clientInfo: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResponse> {
    const { email, password, firstName, lastName, tenantId } = registerData;

    // Validate input data
    const emailValidation = ValidationUtils.validateEmail(email);
    if (!emailValidation.isValid) {
      throw new Error(`Invalid email: ${emailValidation.errors.join(', ')}`);
    }

    const passwordValidation = PasswordUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new Error(
        `Invalid password: ${passwordValidation.errors.join(', ')}`
      );
    }

    const firstNameValidation = ValidationUtils.validateName(
      firstName,
      'First name'
    );
    if (!firstNameValidation.isValid) {
      throw new Error(
        `Invalid first name: ${firstNameValidation.errors.join(', ')}`
      );
    }

    const lastNameValidation = ValidationUtils.validateName(
      lastName,
      'Last name'
    );
    if (!lastNameValidation.isValid) {
      throw new Error(
        `Invalid last name: ${lastNameValidation.errors.join(', ')}`
      );
    }

    // Check if email already exists
    const existingUser = await usersRepository.findByEmail(email, tenantId);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await PasswordUtils.hashPassword(password);

    // Create user
    const userData: CreateUserData = {
      email:
        emailValidation.errors.length === 0
          ? email
          : email.toLowerCase().trim(),
      passwordHash,
      firstName: firstNameValidation.sanitizedValue,
      lastName: lastNameValidation.sanitizedValue,
      tenantId,
      role: 'user',
    };

    const user = await usersRepository.create(userData);

    // Get tenant context if multi-tenancy is enabled
    let tenantContext: TenantContext | undefined;
    if (tenantConfig.tokenIsolation && user.tenantId) {
      const tenant = await tenantRepository.findById(user.tenantId);
      if (tenant) {
        tenantContext = {
          id: tenant.id,
          slug: tenant.slug,
          plan: tenant.plan,
          features: Object.keys(tenant.settings.features).filter(
            (key) => tenant.settings.features[key]
          ),
          limits: {
            maxUsers: tenant.maxUsers,
            maxStorage: tenant.settings.limits.maxStorage,
            maxApiCalls: tenant.settings.limits.maxApiCalls,
          },
          status: tenant.isActive ? 'active' : 'inactive',
        };
      }
    }

    // Generate tokens and create session
    const sessionId = crypto.randomUUID();
    const tokens = JwtUtils.generateTokenPair(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      sessionId,
      tenantContext as any
    );

    // Calculate refresh token expiration
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setTime(
      refreshExpiresAt.getTime() +
        this.parseExpirationTime(config.JWT_REFRESH_EXPIRES_IN as string)
    );

    // Create session
    await sessionsRepository.create({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      expiresAt: refreshExpiresAt,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    // Return response without password hash
    const { passwordHash: _, ...userProfile } = user;

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userProfile,
    };
  }

  /**
   * Authenticates a user with email and password.
   * @param loginData - User login credentials
   * @param clientInfo - Client IP and user agent for session tracking
   * @returns Promise containing authentication response with tokens
   * @throws {Error} When authentication fails
   * @example
   * const authResponse = await authService.login({
   *   email: 'user@example.com',
   *   password: 'SecurePass123!'
   * }, { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0...' });
   */
  async login(
    loginData: LoginRequest,
    clientInfo: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResponse> {
    const { email, password } = loginData;

    // Validate input
    const emailValidation = ValidationUtils.validateEmail(email);
    if (!emailValidation.isValid) {
      throw new Error('Invalid email or password');
    }

    if (!password || password.trim().length === 0) {
      throw new Error('Invalid email or password');
    }

    // Find user by email
    const user = await usersRepository.findByEmail(email.toLowerCase().trim());
    if (!user?.isActive) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await PasswordUtils.verifyPassword(
      password,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await usersRepository.updateLastLogin(user.id);

    // Get tenant context if multi-tenancy is enabled
    let tenantContext: TenantContext | undefined;
    if (tenantConfig.tokenIsolation && user.tenantId) {
      const tenant = await tenantRepository.findById(user.tenantId);
      if (tenant) {
        tenantContext = {
          id: tenant.id,
          slug: tenant.slug,
          plan: tenant.plan,
          features: Object.keys(tenant.settings.features).filter(
            (key) => tenant.settings.features[key]
          ),
          limits: {
            maxUsers: tenant.maxUsers,
            maxStorage: tenant.settings.limits.maxStorage,
            maxApiCalls: tenant.settings.limits.maxApiCalls,
          },
          status: tenant.isActive ? 'active' : 'inactive',
        };
      }
    }

    // Generate tokens and create session
    const sessionId = crypto.randomUUID();
    const tokens = JwtUtils.generateTokenPair(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      sessionId,
      tenantContext as any
    );

    // Calculate refresh token expiration
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setTime(
      refreshExpiresAt.getTime() +
        this.parseExpirationTime(config.JWT_REFRESH_EXPIRES_IN as string)
    );

    // Create session
    await sessionsRepository.create({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      expiresAt: refreshExpiresAt,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    // Return response without password hash
    const { passwordHash: _, ...userProfile } = user;
    userProfile.lastLogin = new Date(); // Update with current login time

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userProfile,
    };
  }

  /**
   * Refreshes access token using refresh token.
   * @param refreshToken - Valid refresh token
   * @returns Promise containing new token pair
   * @throws {Error} When refresh token is invalid or expired
   * @example
   * const newTokens = await authService.refreshToken('jwt-refresh-token');
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new Error('Refresh token is required');
    }

    // Verify and decode refresh token
    let tokenPayload;
    try {
      tokenPayload = JwtUtils.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }

    // Find session
    const session = await sessionsRepository.findByRefreshToken(refreshToken);
    if (!session) {
      throw new Error('Invalid refresh token');
    }

    // Check if session is expired
    if (session.expiresAt <= new Date()) {
      await sessionsRepository.delete(session.id);
      throw new Error('Refresh token expired');
    }

    // Find user
    const user = await usersRepository.findById(tokenPayload.userId);
    if (!user?.isActive) {
      await sessionsRepository.delete(session.id);
      throw new Error('User not found or inactive');
    }

    // Get tenant context if multi-tenancy is enabled
    let tenantContext: TenantContext | undefined;
    if (tenantConfig.tokenIsolation && user.tenantId) {
      const tenant = await tenantRepository.findById(user.tenantId);
      if (tenant) {
        tenantContext = {
          id: tenant.id,
          slug: tenant.slug,
          plan: tenant.plan,
          features: Object.keys(tenant.settings.features).filter(
            (key) => tenant.settings.features[key]
          ),
          limits: {
            maxUsers: tenant.maxUsers,
            maxStorage: tenant.settings.limits.maxStorage,
            maxApiCalls: tenant.settings.limits.maxApiCalls,
          },
          status: tenant.isActive ? 'active' : 'inactive',
        };
      }
    }

    // Generate new tokens
    const newSessionId = crypto.randomUUID();
    const newTokens = JwtUtils.generateTokenPair(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      newSessionId,
      tenantContext as any
    );

    // Calculate new refresh token expiration
    const newRefreshExpiresAt = new Date();
    newRefreshExpiresAt.setTime(
      newRefreshExpiresAt.getTime() +
        this.parseExpirationTime(config.JWT_REFRESH_EXPIRES_IN as string)
    );

    // Update session with new refresh token (token rotation)
    await sessionsRepository.updateRefreshToken(
      session.id,
      newTokens.refreshToken,
      newRefreshExpiresAt
    );

    return newTokens;
  }

  /**
   * Logs out a user by invalidating their refresh token.
   * @param refreshToken - Refresh token to invalidate
   * @returns Promise indicating success
   * @example
   * await authService.logout('jwt-refresh-token');
   */
  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken || typeof refreshToken !== 'string') {
      return; // Gracefully handle missing token
    }

    try {
      // Find and delete session
      const session = await sessionsRepository.findByRefreshToken(refreshToken);
      if (session) {
        await sessionsRepository.delete(session.id);
      }
    } catch (error) {
      // Log error but don't throw - logout should always succeed
      console.error('Logout error:', error);
    }
  }

  /**
   * Logs out a user from all devices.
   * @param userId - User ID to logout from all devices
   * @returns Promise containing number of sessions deleted
   * @example
   * const deletedSessions = await authService.logoutAll('user-uuid');
   */
  async logoutAll(userId: string): Promise<number> {
    if (!userId || !ValidationUtils.isValidUUID(userId)) {
      throw new Error('Valid user ID is required');
    }

    return await sessionsRepository.deleteAllByUserId(userId);
  }

  /**
   * Gets user profile by user ID.
   * @param userId - User ID to fetch profile for
   * @returns Promise containing user profile
   * @throws {Error} When user not found
   * @example
   * const profile = await authService.getProfile('user-uuid');
   */
  async getProfile(userId: string): Promise<UserProfile> {
    if (!userId || !ValidationUtils.isValidUUID(userId)) {
      throw new Error('Valid user ID is required');
    }

    const user = await usersRepository.findById(userId);
    if (!user?.isActive) {
      throw new Error('User not found');
    }

    // Return profile without password hash
    const { passwordHash: _, ...userProfile } = user;
    return userProfile;
  }

  /**
   * Updates user profile information.
   * @param userId - User ID to update
   * @param updateData - Profile data to update
   * @returns Promise containing updated user profile
   * @throws {Error} When update fails
   * @example
   * const updatedProfile = await authService.updateProfile('user-uuid', {
   *   firstName: 'Jane',
   *   lastName: 'Smith'
   * });
   */
  async updateProfile(
    userId: string,
    updateData: { firstName?: string; lastName?: string; email?: string }
  ): Promise<UserProfile> {
    if (!userId || !ValidationUtils.isValidUUID(userId)) {
      throw new Error('Valid user ID is required');
    }

    // Validate update data
    const validatedData: any = {};

    if (updateData.firstName !== undefined) {
      const firstNameValidation = ValidationUtils.validateName(
        updateData.firstName,
        'First name'
      );
      if (!firstNameValidation.isValid) {
        throw new Error(
          `Invalid first name: ${firstNameValidation.errors.join(', ')}`
        );
      }
      validatedData.firstName = firstNameValidation.sanitizedValue;
    }

    if (updateData.lastName !== undefined) {
      const lastNameValidation = ValidationUtils.validateName(
        updateData.lastName,
        'Last name'
      );
      if (!lastNameValidation.isValid) {
        throw new Error(
          `Invalid last name: ${lastNameValidation.errors.join(', ')}`
        );
      }
      validatedData.lastName = lastNameValidation.sanitizedValue;
    }

    if (updateData.email !== undefined) {
      const emailValidation = ValidationUtils.validateEmail(updateData.email);
      if (!emailValidation.isValid) {
        throw new Error(`Invalid email: ${emailValidation.errors.join(', ')}`);
      }
      validatedData.email = updateData.email.toLowerCase().trim();

      // Check if new email already exists
      const existingUser = await usersRepository.findByEmail(
        validatedData.email
      );
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Email already registered');
      }
    }

    if (Object.keys(validatedData).length === 0) {
      throw new Error('No valid fields to update');
    }

    // Update user
    const updatedUser = await usersRepository.update(userId, validatedData);

    // Return profile without password hash
    const { passwordHash: _, ...userProfile } = updatedUser;
    return userProfile;
  }

  /**
   * Validates an access token and returns user information.
   * @param accessToken - JWT access token to validate
   * @returns Promise containing user profile
   * @throws {Error} When token is invalid or user not found
   * @example
   * const user = await authService.validateAccessToken('jwt-access-token');
   */
  async validateAccessToken(accessToken: string): Promise<UserProfile> {
    // Verify token
    const tokenPayload = JwtUtils.verifyAccessToken(accessToken);

    // Get user profile
    const user = await usersRepository.findById(tokenPayload.userId);
    if (!user?.isActive) {
      throw new Error('User not found or inactive');
    }

    // Return profile without password hash
    const { passwordHash: _, ...userProfile } = user;
    return userProfile;
  }

  /**
   * Parses JWT expiration time string to milliseconds.
   * @param expirationString - Expiration string (e.g., '15m', '7d', '604800')
   * @returns Expiration time in milliseconds
   * @private
   */
  private parseExpirationTime(expirationString: string | number): number {
    // Handle numeric value (already in seconds)
    if (typeof expirationString === 'number') {
      return expirationString * 1000; // Convert seconds to milliseconds
    }

    // Handle string numeric value (seconds)
    if (/^\d+$/.test(expirationString)) {
      return parseInt(expirationString, 10) * 1000; // Convert seconds to milliseconds
    }

    // Handle time format strings (e.g., '7d', '15m')
    const regex = /^(\d+)([smhdw])$/;
    const match = expirationString.match(regex);

    if (!match) {
      throw new Error(
        `Invalid expiration format: ${expirationString}. Expected formats: '7d', '15m', '604800', or numeric value`
      );
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers = {
      s: 1000, // seconds
      m: 60 * 1000, // minutes
      h: 60 * 60 * 1000, // hours
      d: 24 * 60 * 60 * 1000, // days
      w: 7 * 24 * 60 * 60 * 1000, // weeks
    };

    return value * multipliers[unit as keyof typeof multipliers];
  }

  /**
   * Initiates a password reset request for a user.
   * @param email - User's email address
   * @returns Promise resolving when reset email is sent
   * @throws {Error} When password reset initiation fails
   * @example
   * await authService.requestPasswordReset('user@example.com');
   */
  async requestPasswordReset(email: string): Promise<void> {
    // Validate email format
    const emailValidation = ValidationUtils.validateEmail(email);
    if (!emailValidation.isValid) {
      throw new Error(`Invalid email: ${emailValidation.errors.join(', ')}`);
    }

    // Find user by email (normalize email first)
    const normalizedEmail = email.toLowerCase().trim();
    const user = await usersRepository.findByEmail(normalizedEmail);

    if (!user?.isActive) {
      // Don't reveal if email exists for security - always return success
      console.log(
        `Password reset requested for non-existent or inactive user: ${normalizedEmail}`
      );
      return;
    }

    try {
      // Clean up any existing reset tokens for this user
      await passwordResetRepository.deleteByUserId(user.id);

      // Generate secure reset token
      const resetToken = PasswordResetRepository.generateSecureToken(32);

      // Set expiration time (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + 60 * 60 * 1000); // 1 hour

      // Store reset token in database
      await passwordResetRepository.create({
        userId: user.id,
        token: resetToken,
        expiresAt,
      });

      // Generate reset link
      const resetLink = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;

      // Send password reset email
      await emailService.sendPasswordResetEmail(user.email, {
        userName: `${user.firstName} ${user.lastName}`,
        resetLink,
        resetToken,
        expirationTime: '1 hour',
      });

      console.log(`📧 Password reset email sent to: ${user.email}`);
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw new Error(
        `Failed to process password reset request: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Confirms a password reset and updates the user's password.
   * @param token - Password reset token
   * @param newPassword - New password
   * @returns Promise resolving when password is updated
   * @throws {Error} When password reset confirmation fails
   * @example
   * await authService.confirmPasswordReset('reset-token-123', 'NewPassword123!');
   */
  async confirmPasswordReset(
    token: string,
    newPassword: string
  ): Promise<void> {
    if (!token || typeof token !== 'string') {
      throw new Error('Reset token is required');
    }

    // Validate new password
    const passwordValidation = PasswordUtils.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(
        `Invalid password: ${passwordValidation.errors.join(', ')}`
      );
    }

    // Find reset token
    const resetRecord = await passwordResetRepository.findByToken(token);
    if (!resetRecord) {
      throw new Error('Invalid or expired reset token');
    }

    // Validate token is still valid
    if (!PasswordResetRepository.isTokenValid(resetRecord)) {
      await passwordResetRepository.delete(resetRecord.id);
      throw new Error('Reset token has expired or been used');
    }

    // Find user
    const user = await usersRepository.findById(resetRecord.userId);
    if (!user?.isActive) {
      await passwordResetRepository.delete(resetRecord.id);
      throw new Error('User not found or inactive');
    }

    try {
      // Hash new password
      const hashedPassword = await PasswordUtils.hashPassword(newPassword);

      // Update user's password
      await usersRepository.updatePassword(user.id, hashedPassword);

      // Mark reset token as used
      await passwordResetRepository.markAsUsed(resetRecord.id);

      // Invalidate all user sessions for security
      await sessionsRepository.deleteAllByUserId(user.id);

      console.log(`🔐 Password reset completed for user: ${user.email}`);
    } catch (error) {
      console.error('Password reset confirmation failed:', error);
      throw new Error(
        `Failed to reset password: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validates a password reset token without using it.
   * @param token - Password reset token to validate
   * @returns Promise resolving to validation result
   * @throws {Error} When token validation fails
   * @example
   * const isValid = await authService.validatePasswordResetToken('reset-token-123');
   */
  async validatePasswordResetToken(token: string): Promise<{
    valid: boolean;
    expiresAt?: Date;
    used?: boolean;
  }> {
    if (!token || typeof token !== 'string') {
      return { valid: false };
    }

    try {
      const resetRecord = await passwordResetRepository.findByToken(token);
      if (!resetRecord) {
        return { valid: false };
      }

      const isValid = PasswordResetRepository.isTokenValid(resetRecord);
      return {
        valid: isValid,
        expiresAt: resetRecord.expiresAt,
        used: resetRecord.used,
      };
    } catch (error) {
      console.error('Token validation failed:', error);
      return { valid: false };
    }
  }

  /**
   * Cleans up expired password reset tokens.
   * @returns Promise resolving to number of cleaned up tokens
   * @example
   * const cleanedCount = await authService.cleanupPasswordResetTokens();
   */
  async cleanupPasswordResetTokens(): Promise<number> {
    try {
      return await passwordResetRepository.cleanup();
    } catch (error) {
      console.error('Password reset cleanup failed:', error);
      throw new Error(
        `Failed to cleanup password reset tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
