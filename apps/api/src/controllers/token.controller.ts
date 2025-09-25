import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { apiTokenService } from '../services/api-token.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { AsyncHandler } from '../utils/async-handler.utils';

/**
 * Token controller handling HTTP requests for API token management operations.
 * Manages CRUD operations for API tokens with proper authentication and authorization.
 */
export class TokenController {
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
}

// Export singleton instance
export const tokenController = new TokenController();
