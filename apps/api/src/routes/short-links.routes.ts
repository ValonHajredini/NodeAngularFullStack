import { Router } from 'express';
import { shortLinksController } from '../controllers/short-links.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import {
  createShortLinkValidator,
  resolveShortLinkValidator,
} from '../validators/url.validators';
import rateLimit from 'express-rate-limit';

/**
 * Short links routes configuration.
 * Defines all endpoints for URL shortening operations with proper validation and middleware.
 * Routes require authentication and include rate limiting for abuse prevention.
 */
const router = Router();

/**
 * Rate limiting configuration for short link creation.
 * Prevents abuse by limiting the number of short links created per user.
 */
const createShortLinkRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit to 50 short links per 15 minutes per IP
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many short links created. Please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Rate limiting configuration for short link resolution.
 * Prevents abuse while allowing reasonable usage for legitimate users.
 */
const resolveShortLinkRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit to 100 resolutions per minute per IP
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many resolution requests. Please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting configuration for URL preview.
 * More restrictive since preview doesn't require authentication.
 */
const previewUrlRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit to 20 previews per minute per IP
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many preview requests. Please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route POST /api/v1/tools/short-links
 * @description Create a new short link
 * @access Authenticated users only
 * @body CreateShortLinkRequest - Short link creation data
 * @rateLimit 50 requests per 15 minutes per IP
 * @response 201 - Created short link data with full URL
 * @response 400 - Invalid input data or URL validation failed
 * @response 401 - Authentication required
 * @response 403 - Tool disabled or access denied
 * @response 429 - Rate limit exceeded
 * @response 500 - Internal server error
 * @example
 * POST /api/v1/tools/short-links
 * Authorization: Bearer <user-token>
 * Content-Type: application/json
 *
 * {
 *   "originalUrl": "https://example.com/very/long/url",
 *   "expiresAt": "2025-12-31T23:59:59.000Z"
 * }
 */
router.post(
  '/',
  createShortLinkRateLimit,
  AuthMiddleware.authenticate,
  createShortLinkValidator,
  shortLinksController.createShortLink
);

/**
 * @route GET /api/tools/short-links/:code
 * @description Resolve a short code to get original URL information
 * @access Public (no authentication required)
 * @param code - Short code to resolve (6-8 alphanumeric characters)
 * @rateLimit 100 requests per minute per IP
 * @response 200 - Resolved short link data and original URL
 * @response 400 - Invalid short code format
 * @response 404 - Short link not found
 * @response 410 - Short link has expired
 * @response 429 - Rate limit exceeded
 * @response 500 - Internal server error
 * @example
 * GET /api/tools/short-links/abc123
 */
router.get(
  '/:code',
  resolveShortLinkRateLimit,
  resolveShortLinkValidator,
  shortLinksController.resolveShortLink
);

/**
 * @route GET /api/tools/short-links
 * @description Retrieve short links created by the authenticated user
 * @access Authenticated users only
 * @query limit - Maximum number of results (default: 20, max: 100)
 * @query offset - Number of results to skip (default: 0)
 * @response 200 - User's short links list
 * @response 401 - Authentication required
 * @response 500 - Internal server error
 * @example
 * GET /api/tools/short-links?limit=10&offset=0
 * Authorization: Bearer <user-token>
 */
router.get(
  '/',
  AuthMiddleware.authenticate,
  shortLinksController.getUserShortLinks
);

/**
 * @route POST /api/v1/tools/short-links/preview
 * @description Preview URL information without creating a short link
 * @access Public (no authentication required)
 * @body { url: string } - URL to preview
 * @rateLimit 20 requests per minute per IP
 * @response 200 - URL preview information
 * @response 400 - Invalid URL
 * @response 429 - Rate limit exceeded
 * @response 500 - Internal server error
 * @example
 * POST /api/v1/tools/short-links/preview
 * Content-Type: application/json
 *
 * {
 *   "url": "https://example.com"
 * }
 */
router.post('/preview', previewUrlRateLimit, shortLinksController.previewUrl);

export default router;
