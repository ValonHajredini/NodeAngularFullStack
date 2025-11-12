import { Request, Response, NextFunction, RequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { config } from '../utils/config.utils';

/**
 * Security middleware configuration for production deployment.
 * Implements comprehensive security headers and protections.
 */

/**
 * Rate limiting configuration for API endpoints.
 * Implements different limits for different endpoint types.
 */
export const createRateLimiters = (): {
  apiLimiter: RateLimitRequestHandler;
  authLimiter: RateLimitRequestHandler;
  uploadSpeedLimiter: RequestHandler;
} => {
  // General API rate limiter - 100 requests per minute
  const apiLimiter = rateLimit({
    windowMs: parseInt(config.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    max: parseInt(config.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(
        (parseInt(config.RATE_LIMIT_WINDOW_MS) || 60000) / 1000
      ),
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for health checks
    skip: (req: Request) => req.path.includes('/health'),
    // Custom key generator for better tracking
    keyGenerator: (req: Request) => {
      return req.ip || req.connection.remoteAddress || 'unknown';
    },
  });

  // Strict rate limiter for authentication endpoints - 5 attempts per 15 minutes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: 900, // 15 minutes
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  });

  // Speed limiter for file uploads - progressively slower after 5 requests
  const uploadSpeedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 5,
    delayMs: 500,
    maxDelayMs: 20000,
  });

  return {
    apiLimiter,
    authLimiter,
    uploadSpeedLimiter,
  };
};

/**
 * Helmet configuration for security headers.
 * Configures comprehensive security headers for production.
 */
export const createHelmetConfig = () => {
  const frontendUrl = config.FRONTEND_URL || 'https://localhost:4200';
  const corsOrigins = config.CORS_ORIGINS?.split(',') || [frontendUrl];

  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'", ...corsOrigins],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // X-Frame-Options
    frameguard: {
      action: 'deny',
    },

    // X-Content-Type-Options
    noSniff: true,

    // X-XSS-Protection
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    // Note: Permissions Policy configuration would go here if supported by this version of Helmet

    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // May interfere with some APIs

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: {
      policy: 'same-origin-allow-popups',
    },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },

    // Hide X-Powered-By header
    hidePoweredBy: true,
  });
};

/**
 * CORS configuration for production deployment.
 * Implements strict CORS policies for production security.
 */
export const createCorsConfig = () => {
  const corsOrigins = config.CORS_ORIGINS?.split(',') || [];

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development, allow localhost
      if (config.NODE_ENV === 'development' && origin.includes('localhost')) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Tenant-ID',
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Rate-Limit-Limit',
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Reset',
    ],
    maxAge: 86400, // 24 hours
  };
};

/**
 * Trust proxy configuration for Digital Ocean App Platform.
 * Properly handles X-Forwarded-* headers from load balancers.
 */
export const configureTrustProxy = (app: any) => {
  // Trust first proxy (Digital Ocean load balancer)
  app.set('trust proxy', 1);

  // Custom middleware to ensure proper IP detection
  app.use((req: Request, _res: Response, next: NextFunction) => {
    // Get real IP from various headers
    const realIp =
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress ||
      req.ip;

    // Set IP for rate limiting and logging (using Object.defineProperty to avoid read-only error)
    const ipToSet = Array.isArray(realIp) ? realIp[0] : (realIp as string);
    Object.defineProperty(req, 'ip', {
      value: ipToSet,
      writable: true,
      enumerable: true,
      configurable: true,
    });

    next();
  });
};

/**
 * Security response headers middleware.
 * Adds additional custom security headers.
 */
export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Server identification
  res.removeHeader('X-Powered-By');
  res.setHeader('Server', 'NodeAngularFullStack');

  // API version header
  res.setHeader('X-API-Version', '1.0.0');

  // Security headers for API responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Cache control for API responses
  if (req.path.includes('/api/')) {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};

/**
 * Request size limitation middleware.
 * Prevents large request attacks.
 */
export const requestSizeLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (req.headers['content-length']) {
    const contentLength = parseInt(req.headers['content-length'], 10);
    if (contentLength > maxSize) {
      res.status(413).json({
        error: 'Request entity too large',
        maxSize: '10MB',
      });
      return;
    }
  }

  next();
};

/**
 * Production security middleware setup function.
 * Combines all security middlewares for production deployment.
 */
export const setupProductionSecurity = (app: any) => {
  // Configure trust proxy for Digital Ocean
  configureTrustProxy(app);

  // Request size limits
  app.use(requestSizeLimiter);

  // Helmet security headers
  app.use(createHelmetConfig());

  // Custom security headers
  app.use(securityHeaders);

  console.log('🔒 Production security middleware configured');
};

/**
 * Development security middleware setup function.
 * Relaxed security for development environment.
 */
export const setupDevelopmentSecurity = (app: any) => {
  // Basic helmet configuration for development
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Custom security headers
  app.use(securityHeaders);

  console.log('🔓 Development security middleware configured');
};
