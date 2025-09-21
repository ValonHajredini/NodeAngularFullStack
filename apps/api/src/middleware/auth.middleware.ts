import { Request, Response, NextFunction } from 'express';
import { JwtUtils } from '../utils/jwt.utils';
import { authService } from '../services/auth.service';
import { tenantRepository } from '../repositories/tenant.repository';
import { tenantConfig } from '../config/tenant.config';
import { TenantContext } from '../utils/tenant.utils';

/**
 * Extended request interface with tenant context.
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
  };
  tenant?: {
    id: string;
    slug: string;
    plan: string;
    features: string[];
    limits: Record<string, number>;
    status: string;
  };
  tenantContext?: TenantContext;
}

/**
 * Authentication middleware for protecting routes with JWT tokens.
 * Validates access tokens and attaches user and tenant information to the request.
 */
export class AuthMiddleware {
  /**
   * Middleware to authenticate JWT access tokens.
   * Extracts token from Authorization header, validates it, and attaches user to request.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @returns Continues to next middleware if authenticated, returns 401 if not
   * @example
   * app.get('/protected', AuthMiddleware.authenticate, (req: Request, res) => {
   *   res.json({ message: `Hello ${req.user.email}` });
   * });
   */
  static authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.get('Authorization');
      if (!authHeader) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authorization header is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let token: string;
      try {
        token = JwtUtils.extractTokenFromHeader(authHeader);
      } catch (error: any) {
        res.status(401).json({
          error: 'Unauthorized',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate token and get user information
      try {
        const user = await authService.validateAccessToken(token);

        // Decode token to check for tenant context
        const payload = JwtUtils.decodeToken(token);

        // Attach user information to request
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        };

        // Handle tenant context if present in token
        if (payload?.tenant && tenantConfig.tokenIsolation) {
          // Verify tenant still exists and is active
          const tenant = await tenantRepository.findById(payload.tenant.id);
          if (!tenant || !tenant.isActive) {
            res.status(401).json({
              error: 'Unauthorized',
              message: 'Tenant account is inactive or not found',
              timestamp: new Date().toISOString(),
            });
            return;
          }

          // Validate user still belongs to tenant
          if (user.tenantId && user.tenantId !== tenant.id) {
            res.status(403).json({
              error: 'Forbidden',
              message: 'User no longer belongs to this tenant',
              timestamp: new Date().toISOString(),
            });
            return;
          }

          // Attach tenant information to request
          req.tenant = {
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

          // Create tenant context for downstream middleware
          req.tenantContext = {
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

        next();
      } catch (error: any) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired access token',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    } catch (error: any) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication failed',
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Middleware to check if user has required role.
   * Must be used after authenticate middleware.
   * @param requiredRoles - Array of roles that are allowed access
   * @returns Middleware function
   * @example
   * app.delete('/admin/users/:id',
   *   AuthMiddleware.authenticate,
   *   AuthMiddleware.requireRole(['admin']),
   *   deleteUserController
   * );
   */
  static requireRole = (requiredRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!requiredRoles.includes((req.user as any).role)) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware to check if user is admin.
   * Must be used after authenticate middleware.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @example
   * app.get('/admin/dashboard',
   *   AuthMiddleware.authenticate,
   *   AuthMiddleware.requireAdmin,
   *   adminDashboardController
   * );
   */
  static requireAdmin = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void => {
    AuthMiddleware.requireRole(['admin'])(req, res, next);
  };

  /**
   * Middleware to ensure tenant isolation in multi-tenant mode.
   * Validates that user can only access their own tenant's data.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @example
   * app.get('/api/v1/tenant/users',
   *   AuthMiddleware.authenticate,
   *   AuthMiddleware.ensureTenantIsolation,
   *   getUsersController
   * );
   */
  static ensureTenantIsolation = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // For multi-tenant requests, ensure user has tenant ID
    const requestedTenantId =
      req.params.tenantId || req.body.tenantId || req.query.tenantId;

    if (requestedTenantId && (req.user as any).tenantId !== requestedTenantId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to tenant resources',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };

  /**
   * Optional authentication middleware.
   * Attaches user information if valid token is provided, but doesn't require it.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @example
   * app.get('/api/v1/posts',
   *   AuthMiddleware.optionalAuth,
   *   getPostsController // Can show different content based on auth status
   * );
   */
  static optionalAuth = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.get('Authorization');
      if (!authHeader) {
        next();
        return;
      }

      try {
        const token = JwtUtils.extractTokenFromHeader(authHeader);
        const user = await authService.validateAccessToken(token);

        // Decode token to check for tenant context
        const payload = JwtUtils.decodeToken(token);

        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        };

        // Handle tenant context if present in token (optional auth doesn't fail)
        if (payload?.tenant && tenantConfig.tokenIsolation) {
          try {
            const tenant = await tenantRepository.findById(payload.tenant.id);
            if (tenant && tenant.isActive && user.tenantId === tenant.id) {
              req.tenant = {
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

              req.tenantContext = {
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
          } catch (error) {
            // Silently ignore tenant context errors in optional auth
          }
        }
      } catch (error) {
        // Ignore authentication errors in optional auth
      }

      next();
    } catch (error: any) {
      next();
    }
  };

  /**
   * Middleware to check if user owns the resource.
   * Compares user ID from token with user ID in request parameters.
   * @param userIdParam - Name of the parameter containing user ID (default: 'userId')
   * @returns Middleware function
   * @example
   * app.get('/api/v1/users/:userId/profile',
   *   AuthMiddleware.authenticate,
   *   AuthMiddleware.requireOwnership('userId'),
   *   getUserProfileController
   * );
   */
  static requireOwnership = (userIdParam: string = 'userId') => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const resourceUserId = req.params[userIdParam];
      if (!resourceUserId) {
        res.status(400).json({
          error: 'Bad Request',
          message: `Missing ${userIdParam} parameter`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Allow access if user owns the resource or is admin
      if (
        (req.user as any).id !== resourceUserId &&
        (req.user as any).role !== 'admin'
      ) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied to resource',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware to validate API key for server-to-server communication.
   * Checks for X-API-Key header and validates against configured API keys.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @example
   * app.post('/api/v1/webhooks/payment',
   *   AuthMiddleware.validateApiKey,
   *   paymentWebhookController
   * );
   */
  static validateApiKey = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const apiKey = req.get('X-API-Key');
    if (!apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // In production, validate against configured API keys
    // For now, this is a placeholder implementation
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

    if (!validApiKeys.includes(apiKey)) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };

  /**
   * Middleware to log authentication events for security monitoring.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @example
   * app.use('/api/v1/auth', AuthMiddleware.logAuthEvents);
   */
  static logAuthEvents = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const startTime = Date.now();

    // Log the original end function
    const originalEnd = res.end.bind(res);
    res.end = function (
      chunk?: any,
      encoding?: BufferEncoding | (() => void),
      cb?: () => void
    ) {
      const duration = Date.now() - startTime;
      const clientInfo = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      };

      // Log authentication events
      if (req.path.includes('/auth/')) {
        console.log(`[AUTH EVENT] ${JSON.stringify(clientInfo)}`);
      }

      return originalEnd(chunk, encoding as BufferEncoding, cb);
    };

    next();
  };
}
