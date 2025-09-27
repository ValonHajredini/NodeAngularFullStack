import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { shortLinksService } from '../services/short-links.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { AsyncHandler } from '../utils/async-handler.utils';
import {
  CreateShortLinkRequest,
  ExpiredShortLinkError,
  NotFoundShortLinkError,
} from '@nodeangularfullstack/shared';

/**
 * Short links controller handling HTTP requests for URL shortening operations.
 * Manages short link creation and resolution with proper validation and error handling.
 */
export class ShortLinksController {
  /**
   * Creates a new short link.
   * @route POST /api/tools/short-links
   * @param req - Express request object with short link data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with created short link data
   * @throws {ApiError} 400 - Invalid request data or validation errors
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Tool access denied
   * @throws {ApiError} 500 - Internal server error
   * @example
   * POST /api/tools/short-links
   * Authorization: Bearer <user-token>
   * Content-Type: application/json
   *
   * Request:
   * {
   *   "originalUrl": "https://example.com/very/long/url",
   *   "expiresAt": "2025-12-31T23:59:59.000Z"
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "shortLink": {
   *       "id": "uuid",
   *       "code": "abc123",
   *       "originalUrl": "https://example.com/very/long/url",
   *       "expiresAt": "2025-12-31T23:59:59.000Z",
   *       "clickCount": 0,
   *       "createdAt": "2025-09-27T...",
   *       "updatedAt": "2025-09-27T..."
   *     },
   *     "shortUrl": "http://localhost:3000/s/abc123"
   *   }
   * }
   */
  createShortLink = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const userId = req.user?.id;
      const requestData: CreateShortLinkRequest = req.body;

      try {
        const response = await shortLinksService.createShortLink(
          requestData,
          userId
        );

        res.status(201).json({
          ...response,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error creating short link:', error);

        if (error instanceof Error) {
          // Handle specific business logic errors
          if (error.message.includes('disabled')) {
            res.status(403).json({
              success: false,
              error: {
                code: 'TOOL_DISABLED',
                message: error.message,
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }

          if (
            error.message.includes('Invalid URL') ||
            error.message.includes('unsafe scheme')
          ) {
            res.status(400).json({
              success: false,
              error: {
                code: 'INVALID_URL',
                message: error.message,
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }

          if (
            error.message.includes('dangerous content') ||
            error.message.includes('not allowed')
          ) {
            res.status(400).json({
              success: false,
              error: {
                code: 'URL_REJECTED',
                message: error.message,
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }

        // Generic server error
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create short link',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * Resolves a short code to get original URL information.
   * @route GET /api/tools/short-links/:code
   * @param req - Express request object with code parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with resolved short link data
   * @throws {ApiError} 400 - Invalid short code format
   * @throws {ApiError} 404 - Short link not found
   * @throws {ApiError} 410 - Short link has expired
   * @throws {ApiError} 500 - Internal server error
   * @example
   * GET /api/tools/short-links/abc123
   *
   * Response (success):
   * {
   *   "success": true,
   *   "data": {
   *     "shortLink": { ... },
   *     "originalUrl": "https://example.com/very/long/url"
   *   }
   * }
   *
   * Response (expired):
   * {
   *   "success": false,
   *   "code": "LINK_EXPIRED",
   *   "message": "Short link has expired",
   *   "details": {
   *     "code": "abc123",
   *     "expiredAt": "2025-09-26T..."
   *   }
   * }
   */
  resolveShortLink = AsyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid short code format',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { code } = req.params;

      try {
        const response = await shortLinksService.resolveShortLink(code);

        res.status(200).json({
          ...response,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Error resolving short link ${code}:`, error);

        // Handle specific error types
        if (error && typeof error === 'object' && 'code' in error) {
          const customError = error as
            | ExpiredShortLinkError
            | NotFoundShortLinkError;

          if (customError.code === 'LINK_EXPIRED') {
            res.status(410).json({
              ...customError,
              timestamp: new Date().toISOString(),
            });
            return;
          }

          if (customError.code === 'LINK_NOT_FOUND') {
            res.status(404).json({
              ...customError,
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }

        // Generic server error
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to resolve short link',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * Retrieves short links created by the authenticated user.
   * @route GET /api/tools/short-links
   * @param req - Express request object with optional query parameters
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with user's short links
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 500 - Internal server error
   * @example
   * GET /api/tools/short-links?limit=10&offset=0
   * Authorization: Bearer <user-token>
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "shortLinks": [...]
   *   }
   * }
   */
  getUserShortLinks = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Parse query parameters
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

      try {
        const shortLinks = await shortLinksService.getUserShortLinks(
          userId,
          limit,
          offset
        );

        res.status(200).json({
          success: true,
          data: {
            shortLinks,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error(
          `Error retrieving short links for user ${userId}:`,
          error
        );

        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve short links',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * Previews URL information without creating a short link.
   * @route POST /api/tools/short-links/preview
   * @param req - Express request object with URL to preview
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with URL preview information
   * @throws {ApiError} 400 - Invalid URL
   * @throws {ApiError} 500 - Internal server error
   * @example
   * POST /api/tools/short-links/preview
   * Content-Type: application/json
   *
   * Request:
   * {
   *   "url": "https://example.com"
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "valid": true,
   *     "sanitizedUrl": "https://example.com",
   *     "domain": "example.com",
   *     "isSecure": true
   *   }
   * }
   */
  previewUrl = AsyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'URL is required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      try {
        const preview = await shortLinksService.previewUrl(url);

        res.status(200).json({
          success: true,
          data: preview,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error previewing URL:', error);

        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to preview URL',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  /**
   * Public redirect endpoint that resolves short code and performs redirect.
   * @route GET /s/:code
   * @param req - Express request object with code parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP 302 redirect to original URL or error status
   * @throws {ApiError} 400 - Invalid short code format
   * @throws {ApiError} 404 - Short link not found
   * @throws {ApiError} 410 - Short link has expired
   * @throws {ApiError} 500 - Internal server error
   * @example
   * GET /s/abc123
   *
   * Response (success): 302 Redirect to original URL
   * Response (expired): 410 Gone with error page
   * Response (not found): 404 Not Found with error page
   */
  redirectToOriginalUrl = AsyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CODE',
            message: 'Invalid short code format',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { code } = req.params;

      try {
        const response = await shortLinksService.resolveShortLink(code);

        // Perform 302 redirect to the original URL
        res.redirect(302, response.data.originalUrl);
      } catch (error) {
        console.error(`Error redirecting short link ${code}:`, error);

        // Handle specific error types with appropriate HTTP status codes
        if (error && typeof error === 'object' && 'code' in error) {
          const customError = error as
            | ExpiredShortLinkError
            | NotFoundShortLinkError;

          if (customError.code === 'LINK_EXPIRED') {
            // 410 Gone for expired links
            res.status(410).json({
              success: false,
              error: {
                code: 'LINK_EXPIRED',
                message: 'This short link has expired',
                details: {
                  code,
                  expiredAt: (customError as ExpiredShortLinkError).details
                    .expiredAt,
                },
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }

          if (customError.code === 'LINK_NOT_FOUND') {
            // 404 Not Found for invalid codes
            res.status(404).json({
              success: false,
              error: {
                code: 'LINK_NOT_FOUND',
                message: 'Short link not found',
                details: { code },
              },
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }

        // Generic server error
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to process redirect',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}

// Export controller instance
export const shortLinksController = new ShortLinksController();
