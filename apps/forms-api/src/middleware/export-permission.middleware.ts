import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { createErrorResponse } from '../types/api-response.types';
import { Logger } from '../utils/logger.utils';

/**
 * Export Permission Middleware
 *
 * Verifies user has permission to perform export operations.
 * Allows admin users and users with 'export' permission.
 *
 * Permission Model:
 * - Admin users: Full access to all export operations
 * - Users with 'export' permission: Can export tools they have access to
 * - Other users: Denied (403 Forbidden)
 *
 * Story 33.1.3: Export Job Status Tracking (Task 7)
 *
 * @example
 * router.post('/tools/:toolId/export',
 *   AuthMiddleware.authenticate,
 *   ExportPermissionMiddleware.requireExportPermission,
 *   controller.startExport
 * );
 */
export class ExportPermissionMiddleware {
  private static readonly logger = new Logger('ExportPermissionMiddleware');

  /**
   * Middleware to check if user has export permission.
   *
   * Validates user role and permissions before allowing export operations.
   * Admin users bypass permission check.
   * Regular users must have 'export' permission in their user record.
   *
   * @param req - Express request with authenticated user
   * @param res - Express response
   * @param next - Express next function
   * @returns Continues to next middleware if authorized, returns 403 if not
   *
   * @throws {Error} 403 - User does not have export permission
   * @throws {Error} 401 - User not authenticated (should not reach here if auth middleware ran)
   *
   * @example
   * // User object structure (from JWT):
   * req.user = {
   *   userId: "user-123",
   *   email: "user@example.com",
   *   role: "user" | "admin" | "readonly",
   *   permissions: ["export", "manage_tools"] // Optional permissions array
   * }
   */
  static requireExportPermission = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Ensure user is authenticated (should be guaranteed by auth middleware)
      if (!req.user?.userId) {
        ExportPermissionMiddleware.logger.error(
          'Export permission check called without authenticated user'
        );

        res
          .status(401)
          .json(
            createErrorResponse(
              'Authentication required',
              'AUTHENTICATION_REQUIRED'
            )
          );
        return;
      }

      const { userId, role, permissions } = req.user;

      ExportPermissionMiddleware.logger.debug('Checking export permission', {
        userId,
        role,
        permissions,
      });

      // Admin users have full access (bypass permission check)
      if (role === 'admin') {
        ExportPermissionMiddleware.logger.debug(
          'Admin user granted export permission',
          { userId }
        );
        next();
        return;
      }

      // Check if user has 'export' permission
      // Permissions can be stored as:
      // 1. Array in JWT payload (req.user.permissions)
      // 2. Comma-separated string (req.user.permissions)
      // 3. Boolean flag (req.user.canExport)
      const hasExportPermission =
        // Check permissions array
        (Array.isArray(permissions) && permissions.includes('export')) ||
        // Check permissions string
        (typeof permissions === 'string' && permissions.includes('export')) ||
        // Check boolean flag (future enhancement)
        (req.user as any).canExport === true;

      if (hasExportPermission) {
        ExportPermissionMiddleware.logger.debug(
          'User granted export permission',
          { userId, permissions }
        );
        next();
        return;
      }

      // User does not have export permission
      ExportPermissionMiddleware.logger.warn('User denied export permission', {
        userId,
        role,
        permissions,
        requiredPermission: 'export',
      });

      res
        .status(403)
        .json(
          createErrorResponse(
            'User does not have export permission',
            'PERMISSION_DENIED'
          )
        );
    } catch (error: any) {
      ExportPermissionMiddleware.logger.error(
        'Error checking export permission',
        {
          error: error.message,
          stack: error.stack,
          userId: req.user?.userId,
        }
      );

      // Pass error to error middleware
      next(error);
    }
  };

  /**
   * Middleware to check if user can cancel a specific export job.
   *
   * Validates user is either:
   * 1. Admin user (can cancel any job)
   * 2. Job creator (can cancel own jobs)
   *
   * Note: This is a helper middleware, but the actual ownership check
   * is performed in the controller after retrieving the job record.
   * This middleware only pre-validates admin access.
   *
   * @param req - Express request with authenticated user
   * @param res - Express response
   * @param next - Express next function
   * @returns Continues to next middleware
   *
   * @example
   * router.post('/export-jobs/:jobId/cancel',
   *   AuthMiddleware.authenticate,
   *   ExportPermissionMiddleware.canCancelExport,
   *   controller.cancelExport
   * );
   */
  static canCancelExport = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Ensure user is authenticated
      if (!req.user?.userId) {
        res
          .status(401)
          .json(
            createErrorResponse(
              'Authentication required',
              'AUTHENTICATION_REQUIRED'
            )
          );
        return;
      }

      // Admin users can cancel any job (pre-validation)
      if (req.user.role === 'admin') {
        ExportPermissionMiddleware.logger.debug(
          'Admin user can cancel export job',
          { userId: req.user.userId, jobId: req.params.jobId }
        );
      }

      // Regular users: ownership check happens in controller
      // (after retrieving job record from database)
      next();
    } catch (error: any) {
      ExportPermissionMiddleware.logger.error(
        'Error checking cancel export permission',
        {
          error: error.message,
          stack: error.stack,
          userId: req.user?.userId,
        }
      );

      next(error);
    }
  };
}
