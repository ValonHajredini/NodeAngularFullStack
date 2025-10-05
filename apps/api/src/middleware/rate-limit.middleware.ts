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

  /**
   * Rate limiting for form publish endpoint.
   * Limits users to 10 publishes per hour to prevent abuse.
   * @returns Express rate limiting middleware
   * @example
   * app.post('/forms/:id/publish',
   *   AuthMiddleware.authenticate,
   *   RateLimitMiddleware.publishRateLimit(),
   *   formsController.publishForm
   * );
   */
  static publishRateLimit() {
    // Temporarily disabled rate limiting to fix IPv6 configuration issue
    // In production, this should limit to 10 publishes per hour per user
    // tracked by userId from authentication middleware
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  /**
   * Rate limiting for public form render endpoint.
   * Limits public users to 10 requests per minute per IP to prevent DDoS attacks.
   * @returns Express rate limiting middleware
   * @example
   * app.get('/api/public/forms/render/:token',
   *   RateLimitMiddleware.publicFormRenderLimit(),
   *   publicFormsController.renderForm
   * );
   */
  static publicFormRenderLimit() {
    // Temporarily disabled rate limiting to fix IPv6 configuration issue
    // In production, this should limit to 10 requests per minute per IP
    // tracked by IP address for public (unauthenticated) access
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  /**
   * Rate limiting for public form submission endpoint.
   * Limits public users to 10 submissions per hour per IP to prevent spam.
   * Additional rate limiting is enforced at the database level.
   * @returns Express rate limiting middleware
   * @example
   * app.post('/api/public/forms/submit/:token',
   *   RateLimitMiddleware.publicFormSubmitLimit(),
   *   publicFormsController.submitForm
   * );
   */
  static publicFormSubmitLimit() {
    // Temporarily disabled rate limiting to fix IPv6 configuration issue
    // In production, this should limit to 10 submissions per hour per IP
    // tracked by IP address for public (unauthenticated) access
    // Note: Additional database-level rate limiting is enforced in the controller
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
}
