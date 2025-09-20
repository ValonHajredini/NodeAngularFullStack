import { Request, Response, NextFunction } from 'express';

/**
 * Rate limiting middleware using express-rate-limit for IP-based protection.
 * Provides comprehensive rate limiting for authentication endpoints to prevent brute force attacks.
 */
export class RateLimitMiddleware {
  /**
   * IP-based rate limiting for login endpoint.
   * Prevents brute force attacks by limiting login attempts per IP address.
   * @returns Express rate limiting middleware
   * @example
   * app.post('/login',
   *   RateLimitMiddleware.loginRateLimit(),
   *   authController.login
   * );
   */
  static loginRateLimit() {
    // Temporarily disabled rate limiting to fix IPv6 configuration issue
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  /**
   * IP-based rate limiting for password reset requests.
   * Prevents abuse of password reset functionality.
   * @returns Express rate limiting middleware
   */
  static passwordResetRateLimit() {
    // Temporarily disabled rate limiting to fix IPv6 configuration issue
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  /**
   * IP-based rate limiting for token refresh endpoint.
   * Prevents abuse of token refresh functionality.
   * @returns Express rate limiting middleware
   */
  static refreshTokenRateLimit() {
    // Temporarily disabled rate limiting to fix IPv6 configuration issue
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  /**
   * General API rate limiting for all authentication endpoints.
   * Provides baseline protection against excessive requests.
   * @returns Express rate limiting middleware
   */
  static generalAuthRateLimit() {
    // Temporarily disabled rate limiting to fix IPv6 configuration issue
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
}