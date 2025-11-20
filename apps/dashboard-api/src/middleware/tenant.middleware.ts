import { Request, Response, NextFunction } from 'express';
import { tenantRepository, Tenant } from '../repositories/tenant.repository';
import {
  isMultiTenancyEnabled,
  validateTenantContext,
  TenantContext,
} from '../utils/tenant.utils';
import { databaseService } from '../services/database.service';

// Extend the Express Request interface globally
declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
      tenantContext?: TenantContext;
      user?: any;
    }
  }
}

/**
 * Extended request interface with tenant context.
 */
export interface TenantRequest extends Request {
  tenant?: Tenant;
  tenantContext?: TenantContext;
}

/**
 * Tenant middleware for injecting tenant context into requests.
 * Handles both multi-tenant and single-tenant modes seamlessly.
 */
export class TenantMiddleware {
  /**
   * Extracts tenant context from request and validates access.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  static async extractTenantContext(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Skip tenant processing in single-tenant mode
      if (!isMultiTenancyEnabled()) {
        return next();
      }

      const tenantSlug = TenantMiddleware.extractTenantSlug(req);

      if (!tenantSlug) {
        res.status(400).json({
          error: {
            code: 'TENANT_REQUIRED',
            message: 'Tenant identifier is required in multi-tenant mode',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Find tenant by slug
      const tenant = await tenantRepository.findBySlug(tenantSlug);

      if (!tenant) {
        res.status(404).json({
          error: {
            code: 'TENANT_NOT_FOUND',
            message: 'Tenant not found or inactive',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Check tenant status
      if (tenant.status !== 'active' || !tenant.isActive) {
        res.status(403).json({
          error: {
            code: 'TENANT_INACTIVE',
            message: 'Tenant account is inactive or suspended',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Create tenant context
      const tenantContext: TenantContext = {
        id: tenant.id,
        slug: tenant.slug,
        features: Object.keys(tenant.settings.features).filter(
          (key) => tenant.settings.features[key]
        ),
        limits: tenant.settings.limits,
        plan: tenant.plan,
        status: tenant.status,
      };

      // Validate tenant context
      validateTenantContext(tenantContext);

      // Attach to request
      req.tenant = tenant;
      req.tenantContext = tenantContext;

      // Set database session context for RLS
      await TenantMiddleware.setDatabaseTenantContext(tenantContext.id);

      next();
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'TENANT_CONTEXT_ERROR',
          message: `Failed to process tenant context: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
  }

  /**
   * Validates that the user belongs to the current tenant context.
   * @param req - Express request object with user and tenant context
   * @param res - Express response object
   * @param next - Express next function
   */
  static async validateUserTenantAccess(
    req: TenantRequest & { user?: any },
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Skip validation in single-tenant mode
      if (!isMultiTenancyEnabled()) {
        return next();
      }

      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'USER_REQUIRED',
            message: 'User authentication required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (!req.tenantContext) {
        res.status(400).json({
          error: {
            code: 'TENANT_CONTEXT_REQUIRED',
            message: 'Tenant context is required',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Check if user belongs to the current tenant
      if (req.user.tenantId !== req.tenantContext.id) {
        res.status(403).json({
          error: {
            code: 'TENANT_ACCESS_DENIED',
            message: 'User does not belong to this tenant',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({
        error: {
          code: 'TENANT_VALIDATION_ERROR',
          message: `Tenant access validation failed: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
  }

  /**
   * Validates that the current tenant has access to a specific feature.
   * @param featureName - Name of the feature to check
   * @returns Middleware function
   */
  static requireTenantFeature(featureName: string) {
    return (req: TenantRequest, res: Response, next: NextFunction): void => {
      try {
        // Allow all features in single-tenant mode
        if (!isMultiTenancyEnabled()) {
          return next();
        }

        if (!req.tenantContext) {
          res.status(400).json({
            error: {
              code: 'TENANT_CONTEXT_REQUIRED',
              message: 'Tenant context is required',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        const hasFeature =
          req.tenantContext.features?.includes(featureName) || false;

        if (!hasFeature) {
          res.status(403).json({
            error: {
              code: 'FEATURE_NOT_AVAILABLE',
              message: `Feature '${featureName}' is not available for this tenant plan`,
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        next();
      } catch (error: any) {
        res.status(500).json({
          error: {
            code: 'FEATURE_VALIDATION_ERROR',
            message: `Feature validation failed: ${error.message}`,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    };
  }

  /**
   * Validates tenant usage limits before allowing operations.
   * @param limitType - Type of limit to check ('users', 'storage', 'api_calls')
   * @param currentUsage - Current usage count (optional, will be calculated if not provided)
   * @returns Middleware function
   */
  static checkTenantLimit(
    limitType: 'users' | 'storage' | 'api_calls',
    currentUsage?: number
  ) {
    return async (
      req: TenantRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Skip limit checks in single-tenant mode
        if (!isMultiTenancyEnabled()) {
          return next();
        }

        if (!req.tenantContext) {
          res.status(400).json({
            error: {
              code: 'TENANT_CONTEXT_REQUIRED',
              message: 'Tenant context is required',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        // Get current usage if not provided
        let usage = currentUsage;
        if (usage === undefined) {
          usage = await TenantMiddleware.getCurrentUsage(
            req.tenantContext.id,
            limitType
          );
        }

        // Get tenant limits
        const limits = await tenantRepository.getLimits(req.tenantContext.id);
        let limit: number;

        switch (limitType) {
          case 'users':
            limit = limits.maxUsers;
            break;
          case 'storage':
            limit = limits.maxStorage;
            break;
          case 'api_calls':
            limit = limits.maxApiCalls;
            break;
          default:
            return next();
        }

        if (usage >= limit) {
          res.status(429).json({
            error: {
              code: 'TENANT_LIMIT_EXCEEDED',
              message: `Tenant ${limitType} limit exceeded (${usage}/${limit})`,
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        next();
      } catch (error: any) {
        res.status(500).json({
          error: {
            code: 'LIMIT_CHECK_ERROR',
            message: `Limit validation failed: ${error.message}`,
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    };
  }

  /**
   * Logs tenant operations for audit purposes.
   * @param operation - Operation being performed
   * @returns Middleware function
   */
  static auditTenantOperation(operation: string) {
    return (
      req: TenantRequest & { user?: any },
      _res: Response,
      next: NextFunction
    ): void => {
      try {
        // Skip audit logging in single-tenant mode for performance
        if (!isMultiTenancyEnabled()) {
          return next();
        }

        if (req.tenantContext && req.user) {
          // Log operation asynchronously to avoid blocking request
          setImmediate(() => {
            TenantMiddleware.logOperation(
              operation,
              req.tenantContext!,
              req.user.id,
              req.ip,
              req.get('User-Agent')
            );
          });
        }

        next();
      } catch (error: any) {
        // Don't fail the request if audit logging fails
        console.error('Audit logging failed:', error.message);
        next();
      }
    };
  }

  /**
   * Cleans up tenant context after request processing.
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  static async cleanupTenantContext(
    req: TenantRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Clear database session context
      if (isMultiTenancyEnabled() && req.tenantContext) {
        await TenantMiddleware.clearDatabaseTenantContext();
      }

      next();
    } catch (error: any) {
      // Don't fail the request if cleanup fails
      console.error('Tenant context cleanup failed:', error.message);
      next();
    }
  }

  /**
   * Extracts tenant slug from request headers, subdomain, or path.
   * @param req - Express request object
   * @returns Tenant slug or null if not found
   */
  private static extractTenantSlug(req: Request): string | null {
    // Method 1: Check X-Tenant-Slug header
    const headerSlug = req.get('X-Tenant-Slug');
    if (headerSlug) {
      return headerSlug;
    }

    // Method 2: Check subdomain (e.g., acme.api.example.com)
    const host = req.get('Host');
    if (host) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'api' && subdomain !== 'www') {
        return subdomain;
      }
    }

    // Method 3: Check URL path parameter (e.g., /api/v1/t/acme/...)
    const pathMatch = req.path.match(/^\/api\/v\d+\/t\/([^\/]+)/);
    if (pathMatch) {
      return pathMatch[1];
    }

    // Method 4: Check query parameter
    const querySlug = req.query.tenant_slug as string;
    if (querySlug) {
      return querySlug;
    }

    return null;
  }

  /**
   * Sets tenant context in database session for RLS.
   * @param tenantId - Tenant UUID
   */
  private static async setDatabaseTenantContext(
    tenantId: string
  ): Promise<void> {
    try {
      const pool = databaseService.getPool();
      await pool.query(`SELECT set_tenant_context($1)`, [tenantId]);
    } catch (error: any) {
      console.error('Failed to set database tenant context:', error.message);
    }
  }

  /**
   * Clears tenant context from database session.
   */
  private static async clearDatabaseTenantContext(): Promise<void> {
    try {
      const pool = databaseService.getPool();
      await pool.query(`SELECT clear_tenant_context()`);
    } catch (error: any) {
      console.error('Failed to clear database tenant context:', error.message);
    }
  }

  /**
   * Gets current usage for a specific limit type.
   * @param tenantId - Tenant UUID
   * @param limitType - Type of limit to check
   * @returns Current usage count
   */
  private static async getCurrentUsage(
    tenantId: string,
    limitType: 'users' | 'storage' | 'api_calls'
  ): Promise<number> {
    const pool = databaseService.getPool();

    switch (limitType) {
      case 'users':
        const userResult = await pool.query(
          'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND is_active = true',
          [tenantId]
        );
        return parseInt(userResult.rows[0].count, 10);

      case 'storage':
        // TODO: Implement storage usage calculation
        return 0;

      case 'api_calls':
        // TODO: Implement API call counting (could use Redis for real-time tracking)
        return 0;

      default:
        return 0;
    }
  }

  /**
   * Logs tenant operations for audit purposes.
   * @param operation - Operation name
   * @param tenantContext - Tenant context
   * @param userId - User ID performing the operation
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   */
  private static async logOperation(
    operation: string,
    tenantContext: TenantContext,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const pool = databaseService.getPool();
      await pool.query(`SELECT log_tenant_access($1, $2, $3, $4, $5, $6, $7)`, [
        tenantContext.id,
        userId,
        operation,
        'api_request',
        null, // resource_id
        ipAddress || null,
        userAgent || null,
      ]);
    } catch (error: any) {
      console.error('Failed to log tenant operation:', error.message);
    }
  }
}

// Export commonly used middleware functions
export const extractTenantContext = TenantMiddleware.extractTenantContext;
export const validateUserTenantAccess =
  TenantMiddleware.validateUserTenantAccess;
export const requireTenantFeature = TenantMiddleware.requireTenantFeature;
export const checkTenantLimit = TenantMiddleware.checkTenantLimit;
export const auditTenantOperation = TenantMiddleware.auditTenantOperation;
export const cleanupTenantContext = TenantMiddleware.cleanupTenantContext;
