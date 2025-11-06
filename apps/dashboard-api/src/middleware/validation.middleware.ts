import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';

/**
 * Validation middleware for handling express-validator results.
 * Provides centralized validation error handling and formatting.
 */
export class ValidationMiddleware {
  /**
   * Handles validation errors from express-validator.
   * Returns formatted validation errors or continues to next middleware.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @returns Formatted validation errors or continues execution
   * @example
   * app.post('/register',
   *   ValidationUtils.registerValidation(),
   *   ValidationMiddleware.handleValidationErrors,
   *   authController.register
   * );
   */
  static handleValidationErrors = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const formattedErrors = ValidationMiddleware.formatValidationErrors(errors.array());

      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data provided',
        details: formattedErrors,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };

  /**
   * Formats validation errors into a consistent structure.
   * @param errors - Array of validation errors from express-validator
   * @returns Formatted error array
   * @private
   */
  private static formatValidationErrors(errors: ValidationError[]): Array<{
    field: string;
    message: string;
    value?: any;
  }> {
    return errors.map((error) => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));
  }

  /**
   * Custom validation middleware for additional business logic validation.
   * @param validationFunction - Custom validation function
   * @returns Middleware function
   * @example
   * const validateUserAge = (req: Request) => {
   *   if (req.body.age && req.body.age < 18) {
   *     throw new Error('User must be at least 18 years old');
   *   }
   * };
   *
   * app.post('/register',
   *   ValidationMiddleware.customValidation(validateUserAge),
   *   authController.register
   * );
   */
  static customValidation = (
    validationFunction: (req: Request) => void | Promise<void>
  ) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await validationFunction(req);
        next();
      } catch (error: any) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.message || 'Custom validation failed',
          timestamp: new Date().toISOString(),
        });
      }
    };
  };

  /**
   * Middleware to sanitize request body data.
   * Removes potentially dangerous content and normalizes data.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @example
   * app.post('/api/v1/users',
   *   ValidationMiddleware.sanitizeInput,
   *   createUserController
   * );
   */
  static sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === 'object') {
      req.body = ValidationMiddleware.deepSanitize(req.body);
    }
    next();
  };

  /**
   * Recursively sanitizes object properties.
   * @param obj - Object to sanitize
   * @returns Sanitized object
   * @private
   */
  private static deepSanitize(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return obj
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .slice(0, 10000); // Limit length to prevent DoS
    }

    if (typeof obj === 'object' && !Array.isArray(obj)) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key names
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 100);
        if (sanitizedKey) {
          sanitized[sanitizedKey] = ValidationMiddleware.deepSanitize(value);
        }
      }
      return sanitized;
    }

    if (Array.isArray(obj)) {
      return obj.slice(0, 1000).map(item => ValidationMiddleware.deepSanitize(item));
    }

    return obj;
  };

  /**
   * Middleware to validate request content type.
   * @param allowedTypes - Array of allowed content types
   * @returns Middleware function
   * @example
   * app.post('/api/v1/upload',
   *   ValidationMiddleware.validateContentType(['multipart/form-data']),
   *   uploadController
   * );
   */
  static validateContentType = (allowedTypes: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const contentType = req.get('Content-Type') || '';

      const isAllowed = allowedTypes.some(type =>
        contentType.toLowerCase().includes(type.toLowerCase())
      );

      if (!isAllowed) {
        res.status(415).json({
          error: 'Unsupported Media Type',
          message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware to validate request body size.
   * @param maxSize - Maximum allowed body size in bytes
   * @returns Middleware function
   * @example
   * app.post('/api/v1/data',
   *   ValidationMiddleware.validateBodySize(1024 * 1024), // 1MB limit
   *   dataController
   * );
   */
  static validateBodySize = (maxSize: number) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const contentLength = parseInt(req.get('Content-Length') || '0', 10);

      if (contentLength > maxSize) {
        res.status(413).json({
          error: 'Payload Too Large',
          message: `Request body must be smaller than ${maxSize} bytes`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware to validate request rate limiting per user.
   * @param maxRequests - Maximum requests per time window
   * @param windowMs - Time window in milliseconds
   * @returns Middleware function
   * @example
   * app.post('/api/v1/auth/login',
   *   ValidationMiddleware.rateLimitPerUser(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
   *   authController.login
   * );
   */
  static rateLimitPerUser = (maxRequests: number, windowMs: number) => {
    const userAttempts = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction): void => {
      const identifier = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();

      // Clean up expired entries
      for (const [key, value] of userAttempts.entries()) {
        if (now > value.resetTime) {
          userAttempts.delete(key);
        }
      }

      // Check current user attempts
      const userAttempt = userAttempts.get(identifier);

      if (!userAttempt || now > userAttempt.resetTime) {
        // First attempt or window expired
        userAttempts.set(identifier, {
          count: 1,
          resetTime: now + windowMs,
        });
        next();
        return;
      }

      if (userAttempt.count >= maxRequests) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((userAttempt.resetTime - now) / 1000),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Increment attempt count
      userAttempt.count++;
      next();
    };
  };

  /**
   * Middleware to validate required headers.
   * @param requiredHeaders - Array of required header names
   * @returns Middleware function
   * @example
   * app.post('/api/v1/webhooks',
   *   ValidationMiddleware.validateRequiredHeaders(['X-Signature', 'X-Timestamp']),
   *   webhookController
   * );
   */
  static validateRequiredHeaders = (requiredHeaders: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const missingHeaders: string[] = [];

      for (const header of requiredHeaders) {
        if (!req.get(header)) {
          missingHeaders.push(header);
        }
      }

      if (missingHeaders.length > 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: `Missing required headers: ${missingHeaders.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware to validate UUID parameters.
   * @param paramNames - Array of parameter names that should be UUIDs
   * @returns Middleware function
   * @example
   * app.get('/api/v1/users/:userId/posts/:postId',
   *   ValidationMiddleware.validateUUIDParams(['userId', 'postId']),
   *   getPostController
   * );
   */
  static validateUUIDParams = (paramNames: string[]) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    return (req: Request, res: Response, next: NextFunction): void => {
      const invalidParams: string[] = [];

      for (const paramName of paramNames) {
        const paramValue = req.params[paramName];
        if (paramValue && !uuidRegex.test(paramValue)) {
          invalidParams.push(paramName);
        }
      }

      if (invalidParams.length > 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: `Invalid UUID format for parameters: ${invalidParams.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    };
  };
}