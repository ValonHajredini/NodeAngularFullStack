import jwt from 'jsonwebtoken';
import { config } from './config.utils';
import { tenantConfig } from '../config/tenant.config';
import { TenantContext } from './tenant.utils';

/**
 * JWT token payload interface for access tokens.
 */
export interface JwtPayload {
  /** User ID (UUID) */
  userId: string;
  /** User email address */
  email: string;
  /** User role for authorization */
  role: string;
  /** Optional tenant ID for multi-tenancy */
  tenantId?: string;
  /** Token type identifier */
  type: 'access';
  /** Tenant context for multi-tenant tokens */
  tenant?: {
    id: string;
    slug: string;
    plan: 'free' | 'starter' | 'professional' | 'enterprise';
    features: string[];
    limits: {
      maxUsers: number;
      maxStorage: number;
      maxApiCalls: number;
    };
    status: 'active' | 'suspended' | 'inactive';
  };
}

/**
 * JWT refresh token payload interface.
 */
export interface RefreshTokenPayload {
  /** User ID (UUID) */
  userId: string;
  /** Session ID for token rotation */
  sessionId: string;
  /** Token type identifier */
  type: 'refresh';
}

/**
 * JWT token pair returned after authentication.
 */
export interface TokenPair {
  /** Short-lived access token */
  accessToken: string;
  /** Long-lived refresh token */
  refreshToken: string;
}

/**
 * JWT utilities for token generation, verification, and management.
 * Handles both access and refresh tokens with proper security practices.
 */
export class JwtUtils {
  /**
   * Generates an access token with user information and optional tenant context.
   * @param payload - User information to encode in the token
   * @param tenantContext - Optional tenant context for multi-tenancy
   * @returns Signed JWT access token
   * @throws {Error} When token generation fails
   * @example
   * const accessToken = JwtUtils.generateAccessToken({
   *   userId: 'uuid-here',
   *   email: 'user@example.com',
   *   role: 'user'
   * }, tenantContext);
   */
  static generateAccessToken(
    payload: Omit<JwtPayload, 'type' | 'tenant'>,
    tenantContext?: TenantContext & {
      limits?: { maxUsers: number; maxStorage: number; maxApiCalls: number };
    }
  ): string {
    try {
      const tokenPayload: JwtPayload = {
        ...payload,
        type: 'access',
      };

      // Include tenant context if multi-tenancy is enabled and tenant context is provided
      if (tenantConfig.tokenIsolation && tenantContext) {
        tokenPayload.tenant = {
          id: tenantContext.id,
          slug: tenantContext.slug,
          plan: tenantContext.plan || 'free',
          features: tenantContext.features || [],
          limits: {
            maxUsers: tenantContext.limits?.maxUsers || 5,
            maxStorage: tenantContext.limits?.maxStorage || 1000,
            maxApiCalls: tenantContext.limits?.maxApiCalls || 10000,
          },
          status: (tenantContext.status || 'active') as
            | 'active'
            | 'inactive'
            | 'suspended',
        };
      }

      return jwt.sign(
        tokenPayload,
        config.JWT_SECRET as string,
        {
          expiresIn: config.JWT_ACCESS_EXPIRES_IN,
          issuer: 'nodeangularfullstack-api',
          audience: 'nodeangularfullstack-client',
        } as jwt.SignOptions
      );
    } catch (error) {
      throw new Error(
        `Access token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generates a refresh token for session management.
   * @param payload - Session information to encode in the token
   * @returns Signed JWT refresh token
   * @throws {Error} When token generation fails
   * @example
   * const refreshToken = JwtUtils.generateRefreshToken({
   *   userId: 'uuid-here',
   *   sessionId: 'session-uuid',
   *   type: 'refresh'
   * });
   */
  static generateRefreshToken(
    payload: Omit<RefreshTokenPayload, 'type'>
  ): string {
    try {
      const tokenPayload: RefreshTokenPayload = {
        ...payload,
        type: 'refresh',
      };

      return jwt.sign(
        tokenPayload,
        config.JWT_REFRESH_SECRET as string,
        {
          expiresIn: config.JWT_REFRESH_EXPIRES_IN,
          issuer: 'nodeangularfullstack-api',
          audience: 'nodeangularfullstack-client',
        } as jwt.SignOptions
      );
    } catch (error) {
      throw new Error(
        `Refresh token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generates both access and refresh tokens with optional tenant context.
   * @param userPayload - User information for access token
   * @param sessionId - Session ID for refresh token
   * @param tenantContext - Optional tenant context for multi-tenancy
   * @returns Token pair containing both tokens
   * @throws {Error} When token generation fails
   * @example
   * const tokens = JwtUtils.generateTokenPair(
   *   { userId: 'uuid', email: 'user@example.com', role: 'user' },
   *   'session-uuid',
   *   tenantContext
   * );
   */
  static generateTokenPair(
    userPayload: Omit<JwtPayload, 'type' | 'tenant'>,
    sessionId: string,
    tenantContext?: TenantContext & {
      limits?: { maxUsers: number; maxStorage: number; maxApiCalls: number };
    }
  ): TokenPair {
    const accessToken = this.generateAccessToken(userPayload, tenantContext);
    const refreshToken = this.generateRefreshToken({
      userId: userPayload.userId,
      sessionId,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verifies and decodes an access token.
   * @param token - JWT access token to verify
   * @returns Decoded token payload
   * @throws {Error} When token verification fails
   * @example
   * try {
   *   const payload = JwtUtils.verifyAccessToken(token);
   *   console.log('User ID:', payload.userId);
   * } catch (error) {
   *   console.error('Invalid token:', error.message);
   * }
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Token must be a non-empty string');
      }

      const decoded = jwt.verify(token, config.JWT_SECRET as string, {
        issuer: 'nodeangularfullstack-api',
        audience: 'nodeangularfullstack-client',
      }) as JwtPayload;

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // Validate tenant status if present in token
      if (decoded.tenant && decoded.tenant.status !== 'active') {
        throw new Error('Tenant account is suspended or inactive');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`Access token verification failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Verifies and decodes a refresh token.
   * @param token - JWT refresh token to verify
   * @returns Decoded token payload
   * @throws {Error} When token verification fails
   * @example
   * try {
   *   const payload = JwtUtils.verifyRefreshToken(token);
   *   console.log('Session ID:', payload.sessionId);
   * } catch (error) {
   *   console.error('Invalid refresh token:', error.message);
   * }
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Token must be a non-empty string');
      }

      const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET as string, {
        issuer: 'nodeangularfullstack-api',
        audience: 'nodeangularfullstack-client',
      }) as RefreshTokenPayload;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`Refresh token verification failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Extracts token from Authorization header.
   * @param authHeader - Authorization header value
   * @returns Extracted token without Bearer prefix
   * @throws {Error} When header format is invalid
   * @example
   * const token = JwtUtils.extractTokenFromHeader('Bearer eyJhbGciOiJIUzI1NiIs...');
   */
  static extractTokenFromHeader(authHeader: string | undefined): string {
    if (!authHeader || typeof authHeader !== 'string') {
      throw new Error('Authorization header is required');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new Error('Authorization header must be in format: Bearer <token>');
    }

    const token = parts[1];
    if (!token) {
      throw new Error('Token is required in Authorization header');
    }

    return token;
  }

  /**
   * Decodes a JWT token without verification (for debugging).
   * @param token - JWT token to decode
   * @returns Decoded token payload
   * @throws {Error} When token format is invalid
   * @example
   * const payload = JwtUtils.decodeToken(token);
   * console.log('Token expires at:', new Date(payload.exp * 1000));
   */
  static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error(
        `Token decode failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Checks if a token is expired without verification.
   * @param token - JWT token to check
   * @returns True if token is expired
   * @example
   * if (JwtUtils.isTokenExpired(token)) {
   *   console.log('Token has expired');
   * }
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token) as any;
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }

  /**
   * Gets token expiration time as Date object.
   * @param token - JWT token to analyze
   * @returns Expiration date or null if invalid
   * @example
   * const expiry = JwtUtils.getTokenExpiration(token);
   * if (expiry) {
   *   console.log('Token expires at:', expiry.toISOString());
   * }
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token) as any;
      if (!decoded || !decoded.exp) {
        return null;
      }

      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }
}
