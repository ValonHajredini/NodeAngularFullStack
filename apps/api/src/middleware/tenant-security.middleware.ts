import { Request, Response, NextFunction } from 'express';
import { tenantConfig } from '../config/tenant.config';

/**
 * Security audit entry interface for cross-tenant access attempts.
 */
interface CrossTenantAuditEntry {
  userId?: string;
  requestedTenantId: string;
  actualTenantId: string;
  endpoint: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Tenant security middleware for preventing cross-tenant access and logging security violations.
 * Implements comprehensive tenant boundary enforcement with audit trails.
 */
export class TenantSecurityMiddleware {
  /**
   * Audits all tenant-aware requests for security monitoring.
   * Logs tenant access for security analysis and compliance.
   * @param req - Express request object with tenant context
   * @param res - Express response object
   * @param next - Express next function
   */
  static auditTenantAccess = (
    req: Request,
    _res: Response,
    next: NextFunction
  ): void => {
    try {
      // Skip audit logging in single-tenant mode for performance
      if (!tenantConfig.auditLogging || !tenantConfig.multiTenancyEnabled) {
        return next();
      }

      // Log all tenant-aware requests for security monitoring
      if (req.tenantContext && req.user) {
        const auditLog = {
          userId: req.user.id,
          tenantId: req.tenantContext.id,
          action: `${req.method} ${req.path}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date(),
        };

        // Async logging (don't block request)
        setImmediate(() => {
          TenantSecurityMiddleware.logTenantAccess(auditLog);
        });
      }

      next();
    } catch (error: any) {
      // Don't fail the request if audit logging fails
      console.error('Tenant access audit failed:', error.message);
      next();
    }
  };

  /**
   * Prevents cross-tenant access to resources.
   * Validates that the resource being accessed belongs to the authenticated user's tenant.
   * @param resourceTenantIdExtractor - Function to extract tenant ID from resource
   * @returns Middleware function for cross-tenant access prevention
   */
  static preventCrossTenantAccess = (
    resourceTenantIdExtractor: (req: Request) => string | Promise<string>
  ) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Skip cross-tenant validation in single-tenant mode
        if (
          !tenantConfig.crossAccessPrevention ||
          !tenantConfig.multiTenancyEnabled
        ) {
          return next();
        }

        if (!req.tenantContext) {
          res.status(403).json({
            error: 'Forbidden',
            message: 'Tenant context required for resource access',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Extract resource tenant ID
        const resourceTenantId = await resourceTenantIdExtractor(req);

        if (req.tenantContext.id !== resourceTenantId) {
          // Log security violation
          await TenantSecurityMiddleware.logCrossTenantAttempt({
            userId: req.user?.id,
            requestedTenantId: resourceTenantId,
            actualTenantId: req.tenantContext.id,
            endpoint: req.path,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date(),
          });

          res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied: Resource belongs to different tenant',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        next();
      } catch (error: any) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Cross-tenant access validation failed',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    };
  };

  /**
   * Validates resource ownership within tenant boundaries.
   * Ensures users can only access resources within their tenant that they own or have permission to access.
   * @param resourceOwnerIdExtractor - Function to extract resource owner ID
   * @returns Middleware function for resource ownership validation
   */
  static validateResourceOwnership = (
    resourceOwnerIdExtractor: (req: Request) => string | Promise<string>
  ) => {
    return async (
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

        // Extract resource owner ID
        const resourceOwnerId = await resourceOwnerIdExtractor(req);

        // Allow access if user owns the resource or is admin
        if (req.user.id !== resourceOwnerId && req.user.role !== 'admin') {
          // Log potential security violation
          if (tenantConfig.auditLogging) {
            setImmediate(() => {
              TenantSecurityMiddleware.logTenantAccess({
                userId: req.user!.id,
                tenantId: req.tenantContext?.id || 'unknown',
                action: `UNAUTHORIZED_ACCESS_ATTEMPT: ${req.method} ${req.path}`,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date(),
              });
            });
          }

          res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied: Insufficient permissions for resource',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        next();
      } catch (error: any) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Resource ownership validation failed',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    };
  };

  /**
   * Validates tenant status and prevents access to suspended tenants.
   * @param req - Express request object with tenant context
   * @param res - Express response object
   * @param next - Express next function
   */
  static validateTenantStatus = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      // Skip validation in single-tenant mode
      if (!tenantConfig.multiTenancyEnabled) {
        return next();
      }

      if (!req.tenantContext) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Tenant context is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check tenant status
      if (req.tenantContext.status !== 'active') {
        res.status(403).json({
          error: 'Forbidden',
          message: `Tenant account is ${req.tenantContext.status}`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next();
    } catch (error: any) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Tenant status validation failed',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  };

  /**
   * Rate limiting based on tenant limits and usage.
   * @param limitType - Type of limit to enforce ('api_calls', 'storage', etc.)
   * @returns Middleware function for tenant-based rate limiting
   */
  static enforceTenantLimits = (limitType: string) => {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Skip limit enforcement in single-tenant mode
        if (!tenantConfig.multiTenancyEnabled) {
          return next();
        }

        if (!req.tenantContext) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Tenant context is required',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Check if limit is defined for this tenant
        const limit = req.tenantContext.limits?.[limitType];
        if (limit === undefined) {
          return next(); // No limit defined, allow access
        }

        // TODO: Implement actual usage tracking
        // For now, we'll just validate that limits exist
        const currentUsage = 0; // This would be fetched from usage tracking system

        if (currentUsage >= limit) {
          res.status(429).json({
            error: 'Too Many Requests',
            message: `Tenant ${limitType} limit exceeded (${currentUsage}/${limit})`,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        next();
      } catch (error: any) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Tenant limit enforcement failed',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    };
  };

  /**
   * Logs tenant access for audit purposes.
   * @param auditData - Audit data to log
   */
  private static async logTenantAccess(auditData: any): Promise<void> {
    try {
      // TODO: Integrate with actual audit service
      // For now, we'll use console logging with structured data
      console.log(`[TENANT_ACCESS_AUDIT] ${JSON.stringify(auditData)}`);

      // In production, this would call AuditService.logTenantAccess(auditData)
      // await AuditService.logTenantAccess(auditData);
    } catch (error: any) {
      console.error('Failed to log tenant access:', error.message);
    }
  }

  /**
   * Logs cross-tenant access attempts for security monitoring.
   * @param auditData - Cross-tenant access attempt data
   */
  private static async logCrossTenantAttempt(
    auditData: CrossTenantAuditEntry
  ): Promise<void> {
    try {
      // Log security violation with high priority
      console.warn(
        `[SECURITY_VIOLATION] Cross-tenant access attempt: ${JSON.stringify(auditData)}`
      );

      // TODO: Integrate with security monitoring system
      // In production, this would:
      // 1. Send alert to security team
      // 2. Log to security incident management system
      // 3. Potentially trigger automated response (IP blocking, etc.)

      // For now, use console logging with structured data
      // await SecurityAuditService.logCrossTenantAttempt(auditData);
    } catch (error: any) {
      console.error(
        'Failed to log cross-tenant access attempt:',
        error.message
      );
    }
  }
}

// Export commonly used middleware functions
export const auditTenantAccess = TenantSecurityMiddleware.auditTenantAccess;
export const preventCrossTenantAccess =
  TenantSecurityMiddleware.preventCrossTenantAccess;
export const validateResourceOwnership =
  TenantSecurityMiddleware.validateResourceOwnership;
export const validateTenantStatus =
  TenantSecurityMiddleware.validateTenantStatus;
export const enforceTenantLimits = TenantSecurityMiddleware.enforceTenantLimits;
