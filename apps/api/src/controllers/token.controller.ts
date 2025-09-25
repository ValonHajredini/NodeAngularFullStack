import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { apiTokenService } from '../services/api-token.service';
import { TokenUsageService } from '../services/token-usage.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { AsyncHandler } from '../utils/async-handler.utils';

/**
 * Token controller handling HTTP requests for API token management operations.
 * Manages CRUD operations for API tokens with proper authentication and authorization.
 */
export class TokenController {
  private tokenUsageService: TokenUsageService;

  constructor() {
    this.tokenUsageService = new TokenUsageService();
  }
  /**
   * Creates a new API token for the authenticated user.
   * @route POST /api/v1/tokens
   * @param req - Express request object with token creation data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with created token data including plaintext token
   * @throws {ApiError} 400 - Invalid input data
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 409 - Token name already exists for user
   * @example
   * POST /api/v1/tokens
   * Authorization: Bearer <jwt-token>
   * {
   *   "name": "Production API Token",
   *   "scopes": ["read", "write"]
   * }
   */
  createToken = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const tokenRequest = {
        name: req.body.name,
        scopes: req.body.scopes,
        expiresAt: req.body.expiresAt
          ? new Date(req.body.expiresAt)
          : undefined,
      };

      try {
        const tokenResponse = await apiTokenService.createToken(
          req.user!.id,
          tokenRequest,
          req.user!.tenantId
        );

        res.status(201).json({
          success: true,
          data: tokenResponse,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('already exists')) {
            res.status(409).json({
              success: false,
              error: {
                code: 'CONFLICT',
                message: error.message,
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }

          if (
            error.message.includes('not found') ||
            error.message.includes('Invalid')
          ) {
            res.status(400).json({
              success: false,
              error: {
                code: 'BAD_REQUEST',
                message: error.message,
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }

        next(error);
      }
    }
  );

  /**
   * Lists all API tokens for the authenticated user.
   * @route GET /api/v1/tokens
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with array of user's tokens (without token values)
   * @throws {ApiError} 401 - Authentication required
   * @example
   * GET /api/v1/tokens
   * Authorization: Bearer <jwt-token>
   */
  listTokens = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const tokens = await apiTokenService.listTokens(
          req.user!.id,
          req.user!.tenantId
        );

        res.status(200).json({
          success: true,
          data: tokens,
          meta: {
            total: tokens.length,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * Deletes (revokes) an API token by ID.
   * @route DELETE /api/v1/tokens/:id
   * @param req - Express request object with token ID parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response confirming token deletion
   * @throws {ApiError} 400 - Invalid token ID format
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 404 - Token not found or doesn't belong to user
   * @example
   * DELETE /api/v1/tokens/123e4567-e89b-12d3-a456-426614174000
   * Authorization: Bearer <jwt-token>
   */
  deleteToken = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid token ID format',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const tokenId = req.params.id;

      try {
        const deleted = await apiTokenService.deleteToken(
          tokenId,
          req.user!.id,
          req.user!.tenantId
        );

        if (!deleted) {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Token not found or access denied',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.status(200).json({
          success: true,
          data: {
            message: 'Token revoked successfully',
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * Updates an existing API token's metadata.
   * @route PATCH /api/v1/tokens/:id
   * @param req - Express request object with token ID and update data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with updated token data
   * @throws {ApiError} 400 - Invalid input data or token ID format
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 404 - Token not found or doesn't belong to user
   * @throws {ApiError} 409 - Token name already exists for user
   * @example
   * PATCH /api/v1/tokens/123e4567-e89b-12d3-a456-426614174000
   * Authorization: Bearer <jwt-token>
   * {
   *   "name": "Updated Token Name",
   *   "scopes": ["read"],
   *   "isActive": false
   * }
   */
  updateToken = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const tokenId = req.params.id;
      const updateData = {
        name: req.body.name,
        scopes: req.body.scopes,
        isActive: req.body.isActive,
      };

      // Remove undefined fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'At least one field must be provided for update',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      try {
        const updatedToken = await apiTokenService.updateToken(
          tokenId,
          req.user!.id,
          updateData,
          req.user!.tenantId
        );

        if (!updatedToken) {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Token not found or access denied',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.status(200).json({
          success: true,
          data: updatedToken,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('already exists')) {
            res.status(409).json({
              success: false,
              error: {
                code: 'CONFLICT',
                message: error.message,
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }

          if (
            error.message.includes('Invalid') ||
            error.message.includes('cannot be empty')
          ) {
            res.status(400).json({
              success: false,
              error: {
                code: 'BAD_REQUEST',
                message: error.message,
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }

        next(error);
      }
    }
  );

  /**
   * Gets information about a specific API token.
   * @route GET /api/v1/tokens/:id
   * @param req - Express request object with token ID parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with token information (without token value)
   * @throws {ApiError} 400 - Invalid token ID format
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 404 - Token not found or doesn't belong to user
   * @example
   * GET /api/v1/tokens/123e4567-e89b-12d3-a456-426614174000
   * Authorization: Bearer <jwt-token>
   */
  getToken = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid token ID format',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const tokenId = req.params.id;

      try {
        const tokens = await apiTokenService.listTokens(
          req.user!.id,
          req.user!.tenantId
        );

        const token = tokens.find((t) => t.id === tokenId);

        if (!token) {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Token not found or access denied',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        res.status(200).json({
          success: true,
          data: token,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * Gets usage history for a specific token.
   * @route GET /api/v1/tokens/:id/usage
   * @param req - Express request object with token ID
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with paginated usage data
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 404 - Token not found or access denied
   * @example
   * GET /api/v1/tokens/token-uuid/usage?page=1&limit=50&from=2024-01-01&to=2024-12-31
   * Authorization: Bearer <jwt-token>
   */
  getTokenUsage = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const tokenId = req.params.id;
        const userId = req.user!.id;
        const tenantContext = req.tenantContext;

        // Parse query parameters
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Cap at 100
        const from = req.query.from
          ? new Date(req.query.from as string)
          : undefined;
        const to = req.query.to ? new Date(req.query.to as string) : undefined;
        const status = req.query.status
          ? (req.query.status as string)
              .split(',')
              .map((s) => parseInt(s.trim()))
          : undefined;
        const endpoint = req.query.endpoint as string;
        const method = req.query.method as string;

        // Validate date parameters
        if (from && isNaN(from.getTime())) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DATE',
              message: 'Invalid from date parameter',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (to && isNaN(to.getTime())) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DATE',
              message: 'Invalid to date parameter',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const filters = {
          from,
          to,
          status,
          endpoint,
          method,
        };

        const usage = await this.tokenUsageService.getTokenUsage(
          tokenId,
          userId,
          filters,
          { page, limit },
          tenantContext
        );

        res.status(200).json({
          success: true,
          data: usage,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        if (
          error.message.includes('not found') ||
          error.message.includes('access denied')
        ) {
          res.status(404).json({
            success: false,
            error: {
              code: 'TOKEN_NOT_FOUND',
              message: 'Token not found or access denied',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        next(error);
      }
    }
  );

  /**
   * Gets usage statistics for a specific token.
   * @route GET /api/v1/tokens/:id/usage/stats
   * @param req - Express request object with token ID
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with usage statistics
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 404 - Token not found or access denied
   * @example
   * GET /api/v1/tokens/token-uuid/usage/stats?from=2024-01-01&to=2024-12-31
   * Authorization: Bearer <jwt-token>
   */
  getTokenUsageStats = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const tokenId = req.params.id;
        const userId = req.user!.id;
        const tenantContext = req.tenantContext;

        // Parse date range parameters
        const from = req.query.from
          ? new Date(req.query.from as string)
          : undefined;
        const to = req.query.to ? new Date(req.query.to as string) : undefined;

        // Validate date parameters
        if (from && isNaN(from.getTime())) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DATE',
              message: 'Invalid from date parameter',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (to && isNaN(to.getTime())) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DATE',
              message: 'Invalid to date parameter',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const dateRange = from && to ? { from, to } : undefined;

        const stats = await this.tokenUsageService.getTokenUsageStats(
          tokenId,
          userId,
          tenantContext,
          dateRange
        );

        res.status(200).json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        if (
          error.message.includes('not found') ||
          error.message.includes('access denied')
        ) {
          res.status(404).json({
            success: false,
            error: {
              code: 'TOKEN_NOT_FOUND',
              message: 'Token not found or access denied',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        next(error);
      }
    }
  );

  /**
   * Gets time-series usage data for a specific token.
   * @route GET /api/v1/tokens/:id/usage/timeseries
   * @param req - Express request object with token ID
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with time-series usage data
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 404 - Token not found or access denied
   * @example
   * GET /api/v1/tokens/token-uuid/usage/timeseries?period=day&from=2024-01-01&to=2024-12-31
   * Authorization: Bearer <jwt-token>
   */
  getTokenUsageTimeSeries = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const tokenId = req.params.id;
        const userId = req.user!.id;
        const tenantContext = req.tenantContext;

        // Parse parameters
        const period = (req.query.period as 'hour' | 'day') || 'day';
        const from = req.query.from
          ? new Date(req.query.from as string)
          : undefined;
        const to = req.query.to ? new Date(req.query.to as string) : undefined;

        // Validate period parameter
        if (!['hour', 'day'].includes(period)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PERIOD',
              message: 'Period must be either "hour" or "day"',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Validate date parameters
        if (from && isNaN(from.getTime())) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DATE',
              message: 'Invalid from date parameter',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (to && isNaN(to.getTime())) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DATE',
              message: 'Invalid to date parameter',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const dateRange = from && to ? { from, to } : undefined;

        const timeSeries = await this.tokenUsageService.getTokenUsageTimeSeries(
          tokenId,
          userId,
          period,
          tenantContext,
          dateRange
        );

        res.status(200).json({
          success: true,
          data: timeSeries,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        if (
          error.message.includes('not found') ||
          error.message.includes('access denied')
        ) {
          res.status(404).json({
            success: false,
            error: {
              code: 'TOKEN_NOT_FOUND',
              message: 'Token not found or access denied',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        next(error);
      }
    }
  );
}

// Export singleton instance
export const tokenController = new TokenController();
