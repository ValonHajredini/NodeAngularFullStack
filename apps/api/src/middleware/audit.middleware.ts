import { Request, Response, NextFunction } from 'express';
import { auditService, AuditLogEntry } from '../services/audit.service';

/**
 * Enhanced request interface with user data.
 */
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
  };
}

/**
 * Audit middleware for automatic logging of user operations.
 * Tracks successful operations for security and debugging purposes.
 */
export class AuditMiddleware {
  /**
   * Creates audit logging middleware for specific resource operations.
   * @param action - Action being performed (CREATE, UPDATE, DELETE, etc.)
   * @param resourceType - Type of resource being modified
   * @param options - Additional configuration options
   * @returns Express middleware function
   * @example
   * router.post('/users',
   *   authenticate,
   *   auditMiddleware('CREATE', 'users'),
   *   usersController.createUser
   * );
   */
  static auditOperation(
    action: string,
    resourceType: string,
    options: {
      extractResourceId?: (req: AuthRequest) => string | undefined;
      extractChanges?: (req: AuthRequest, res: Response) => any;
      skipCondition?: (req: AuthRequest, res: Response) => boolean;
    } = {}
  ) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      const {
        extractResourceId = (req: AuthRequest) => req.params.id,
        extractChanges = (req: AuthRequest) => req.body,
        skipCondition = () => false
      } = options;

      // Store original response methods
      const originalSend = res.send;
      const originalJson = res.json;
      const originalStatus = res.status;

      let statusCode = 200;
      // @ts-ignore: Variable is used conditionally for audit logging
      let _responseData: any = null;

      // Override res.status to capture status code
      res.status = function(code: number) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      // Override res.send to capture response
      res.send = function(body: any) {
        _responseData = body;
        return originalSend.call(this, body);
      };

      // Override res.json to capture response
      res.json = function(body: any) {
        _responseData = body;
        return originalJson.call(this, body);
      };

      // Hook into response finish event
      res.on('finish', async () => {
        try {
          // Only log successful operations (2xx status codes)
          if (statusCode >= 200 && statusCode < 300) {
            // Check if we should skip logging
            if (skipCondition(req, res)) {
              return;
            }

            const resourceId = extractResourceId(req);
            const changes = extractChanges(req, res);

            const auditEntry: AuditLogEntry = {
              userId: req.user?.id,
              tenantId: req.user?.tenantId,
              action,
              resourceType,
              resourceId,
              changes,
              ipAddress: AuditMiddleware.extractClientIp(req),
              userAgent: req.get('User-Agent')
            };

            // Log audit entry (don't await to avoid blocking response)
            auditService.log(auditEntry).catch(error => {
              console.error('Failed to log audit entry:', error);
            });
          }
        } catch (error) {
          console.error('Error in audit middleware:', error);
        }
      });

      next();
    };
  }

  /**
   * Audit middleware specifically for user CRUD operations.
   * Pre-configured for user resource type with appropriate field extraction.
   */
  static auditUserOperation(action: string) {
    return AuditMiddleware.auditOperation(action, 'users', {
      extractResourceId: (req: Request) => {
        // For creation, extract ID from response data
        if (action === 'CREATE') {
          return undefined; // Will be set by extractChanges if available
        }
        return req.params.id;
      },
      extractChanges: (req: AuthRequest, _res: Response) => {
        const changes: any = {};

        // For CREATE operations, include the created user data
        if (action === 'CREATE') {
          const body = req.body;
          changes.email = body.email;
          changes.firstName = body.firstName;
          changes.lastName = body.lastName;
          changes.role = body.role;
        }

        // For UPDATE/PATCH operations, include the changes
        if (action === 'UPDATE' || action === 'PATCH') {
          const body = req.body;
          if (body.email) changes.email = body.email;
          if (body.firstName) changes.firstName = body.firstName;
          if (body.lastName) changes.lastName = body.lastName;
          if (body.role) changes.role = body.role;
          if (body.isActive !== undefined) changes.isActive = body.isActive;
          if (body.emailVerified !== undefined) changes.emailVerified = body.emailVerified;
        }

        // For DELETE operations, just log the action
        if (action === 'DELETE') {
          changes.deleted = true;
        }

        return changes;
      }
    });
  }

  /**
   * Middleware for bulk operations that affect multiple resources.
   * @param action - Action being performed
   * @param resourceType - Type of resource
   * @param extractAffectedIds - Function to extract IDs of affected resources
   * @returns Express middleware function
   */
  static auditBulkOperation(
    action: string,
    resourceType: string,
    extractAffectedIds: (req: Request, res: Response) => string[]
  ) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      const originalJson = res.json;
      const originalStatus = res.status;

      let statusCode = 200;

      res.status = function(code: number) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      res.send = function(body: any) {
        return originalSend.call(this, body);
      };

      res.json = function(body: any) {
        return originalJson.call(this, body);
      };

      res.on('finish', async () => {
        try {
          if (statusCode >= 200 && statusCode < 300) {
            const affectedIds = extractAffectedIds(req, res);

            for (const resourceId of affectedIds) {
              const auditEntry: AuditLogEntry = {
                userId: req.user?.id,
                tenantId: req.user?.tenantId,
                action,
                resourceType,
                resourceId,
                changes: { bulk: true, totalAffected: affectedIds.length },
                ipAddress: AuditMiddleware.extractClientIp(req),
                userAgent: req.get('User-Agent')
              };

              auditService.log(auditEntry).catch(error => {
                console.error('Failed to log bulk audit entry:', error);
              });
            }
          }
        } catch (error) {
          console.error('Error in bulk audit middleware:', error);
        }
      });

      next();
    };
  }

  /**
   * Middleware for authentication events (login, logout, etc.).
   * @param action - Authentication action (LOGIN, LOGOUT, etc.)
   * @returns Express middleware function
   */
  static auditAuthOperation(action: string) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      const originalJson = res.json;
      const originalStatus = res.status;

      let statusCode = 200;
      // @ts-ignore: Variable is used conditionally for audit logging
      let _responseData: any = null;

      res.status = function(code: number) {
        statusCode = code;
        return originalStatus.call(this, code);
      };

      res.send = function(body: any) {
        _responseData = body;
        return originalSend.call(this, body);
      };

      res.json = function(body: any) {
        _responseData = body;
        return originalJson.call(this, body);
      };

      res.on('finish', async () => {
        try {
          // Log both successful and failed authentication attempts
          const isSuccess = statusCode >= 200 && statusCode < 300;

          let userId: string | undefined;
          let changes: any = { success: isSuccess };

          // Extract user ID from different sources based on action
          if (action === 'LOGIN' && isSuccess && _responseData?.data?.user?.id) {
            userId = _responseData.data.user.id;
            changes.email = req.body.email;
          } else if (action === 'LOGOUT' && req.user?.id) {
            userId = req.user.id;
          } else if (action === 'REGISTER' && isSuccess && _responseData?.data?.user?.id) {
            userId = _responseData.data.user.id;
            changes.email = req.body.email;
          }

          // For failed attempts, include the attempted email
          if (!isSuccess && req.body?.email) {
            changes.attemptedEmail = req.body.email;
          }

          const auditEntry: AuditLogEntry = {
            userId,
            tenantId: req.user?.tenantId,
            action,
            resourceType: 'auth',
            changes,
            ipAddress: AuditMiddleware.extractClientIp(req),
            userAgent: req.get('User-Agent')
          };

          auditService.log(auditEntry).catch(error => {
            console.error('Failed to log auth audit entry:', error);
          });
        } catch (error) {
          console.error('Error in auth audit middleware:', error);
        }
      });

      next();
    };
  }

  /**
   * Extracts the real client IP address from the request.
   * Handles various proxy configurations and headers.
   * @param req - Express request object
   * @returns Client IP address
   */
  private static extractClientIp(req: Request): string | undefined {
    // Check various headers that proxies might set
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return forwarded.split(',')[0].trim();
    }

    const realIp = req.get('X-Real-IP');
    if (realIp) {
      return realIp;
    }

    const cfConnectingIp = req.get('CF-Connecting-IP');
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    // Fallback to connection remote address
    return req.connection?.remoteAddress || req.socket?.remoteAddress || undefined;
  }

  /**
   * Creates a middleware to skip audit logging based on custom conditions.
   * @param condition - Function that returns true to skip logging
   * @returns Express middleware function
   */
  static skipAuditIf(condition: (req: Request, res: Response) => boolean) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (condition(req, res)) {
        // Mark request to skip audit logging
        (req as any)._skipAudit = true;
      }
      next();
    };
  }
}

// Convenience exports for common audit operations
export const auditUserCreate = AuditMiddleware.auditUserOperation('CREATE');
export const auditUserUpdate = AuditMiddleware.auditUserOperation('UPDATE');
export const auditUserPatch = AuditMiddleware.auditUserOperation('PATCH');
export const auditUserDelete = AuditMiddleware.auditUserOperation('DELETE');

export const auditLogin = AuditMiddleware.auditAuthOperation('LOGIN');
export const auditLogout = AuditMiddleware.auditAuthOperation('LOGOUT');
export const auditRegister = AuditMiddleware.auditAuthOperation('REGISTER');