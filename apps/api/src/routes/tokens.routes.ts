import { Router } from 'express';
import { tokenController } from '../controllers/token.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import {
  createTokenValidator,
  updateTokenValidator,
  getTokenValidator,
  deleteTokenValidator,
} from '../validators/token.validators';

/**
 * API token routes for token management operations.
 * Handles all API token-related HTTP endpoints with proper authentication and validation.
 * All endpoints require JWT authentication.
 */
const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiTokenRequest:
 *       type: object
 *       required:
 *         - name
 *         - scopes
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: User-friendly name for the API token
 *           example: "Production API Access"
 *         scopes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [read, write]
 *           minItems: 1
 *           description: Array of permissions for the token
 *           example: ["read", "write"]
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Optional expiration date (defaults to 1 year)
 *           example: "2025-12-31T23:59:59.999Z"
 *
 *     ApiTokenResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: The plaintext API token (only shown once on creation)
 *           example: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123456"
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the token
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         name:
 *           type: string
 *           description: User-friendly name for the token
 *           example: "Production API Access"
 *         scopes:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of permissions for the token
 *           example: ["read", "write"]
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Token expiration timestamp
 *           example: "2025-12-31T23:59:59.999Z"
 *
 *     ApiTokenInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the token
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         name:
 *           type: string
 *           description: User-friendly name for the token
 *           example: "Production API Access"
 *         scopes:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of permissions for the token
 *           example: ["read", "write"]
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Token expiration timestamp
 *           example: "2025-12-31T23:59:59.999Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Token creation timestamp
 *           example: "2024-01-15T10:30:00.000Z"
 *         lastUsedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Last time token was used for authentication
 *           example: "2024-01-20T14:45:30.000Z"
 *         isActive:
 *           type: boolean
 *           description: Whether the token is active
 *           example: true
 *
 *     ApiTokenUpdateRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: Updated user-friendly name for the token
 *           example: "Updated Token Name"
 *         scopes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [read, write]
 *           minItems: 1
 *           description: Updated array of permissions for the token
 *           example: ["read"]
 *         isActive:
 *           type: boolean
 *           description: Updated active status for the token
 *           example: false
 *
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/v1/tokens:
 *   post:
 *     summary: Create a new API token
 *     description: Creates a new API token for the authenticated user
 *     tags: [API Tokens]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiTokenRequest'
 *     responses:
 *       201:
 *         description: Token created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ApiTokenResponse'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Token name already exists for user
 */
router.post(
  '/',
  AuthMiddleware.authenticate,
  createTokenValidator,
  tokenController.createToken
);

/**
 * @swagger
 * /api/v1/tokens:
 *   get:
 *     summary: List user's API tokens
 *     description: Returns all API tokens for the authenticated user (without token values)
 *     tags: [API Tokens]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Tokens retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApiTokenInfo'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       example: 5
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required
 */
router.get('/', AuthMiddleware.authenticate, tokenController.listTokens);

/**
 * @swagger
 * /api/v1/tokens/{id}:
 *   get:
 *     summary: Get API token information
 *     description: Returns information about a specific API token (without token value)
 *     tags: [API Tokens]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Token ID
 *     responses:
 *       200:
 *         description: Token information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ApiTokenInfo'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid token ID format
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Token not found or access denied
 */
router.get(
  '/:id',
  AuthMiddleware.authenticate,
  getTokenValidator,
  tokenController.getToken
);

/**
 * @swagger
 * /api/v1/tokens/{id}:
 *   patch:
 *     summary: Update API token metadata
 *     description: Updates an API token's name, scopes, or active status
 *     tags: [API Tokens]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Token ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiTokenUpdateRequest'
 *     responses:
 *       200:
 *         description: Token updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ApiTokenInfo'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input data or token ID format
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Token not found or access denied
 *       409:
 *         description: Token name already exists for user
 */
router.patch(
  '/:id',
  AuthMiddleware.authenticate,
  updateTokenValidator,
  tokenController.updateToken
);

/**
 * @swagger
 * /api/v1/tokens/{id}:
 *   delete:
 *     summary: Revoke API token
 *     description: Permanently revokes an API token by deleting it
 *     tags: [API Tokens]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Token ID
 *     responses:
 *       200:
 *         description: Token revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Token revoked successfully"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid token ID format
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Token not found or access denied
 */
router.delete(
  '/:id',
  AuthMiddleware.authenticate,
  deleteTokenValidator,
  tokenController.deleteToken
);

/**
 * @swagger
 * /api/v1/tokens/{id}/usage:
 *   get:
 *     summary: Get token usage history
 *     description: Returns paginated usage history for a specific API token
 *     tags: [API Tokens]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Token ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of records per page
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering usage records
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering usage records
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Comma-separated HTTP status codes to filter by
 *         example: "200,201,400"
 *       - in: query
 *         name: endpoint
 *         schema:
 *           type: string
 *         description: Filter by endpoint (partial match)
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [GET, POST, PUT, DELETE, PATCH]
 *         description: Filter by HTTP method
 *     responses:
 *       200:
 *         description: Usage history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     usage:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           endpoint:
 *                             type: string
 *                             example: "/api/v1/users"
 *                           method:
 *                             type: string
 *                             example: "GET"
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           responseStatus:
 *                             type: integer
 *                             example: 200
 *                           processingTime:
 *                             type: integer
 *                             example: 125
 *                           ipAddress:
 *                             type: string
 *                             example: "192.168.1.100"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Token not found or access denied
 */
router.get(
  '/:id/usage',
  AuthMiddleware.authenticate,
  getTokenValidator,
  tokenController.getTokenUsage
);

/**
 * @swagger
 * /api/v1/tokens/{id}/usage/stats:
 *   get:
 *     summary: Get token usage statistics
 *     description: Returns usage statistics for a specific API token
 *     tags: [API Tokens]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Token ID
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for statistics calculation
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for statistics calculation
 *     responses:
 *       200:
 *         description: Usage statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: integer
 *                       example: 1250
 *                     successfulRequests:
 *                       type: integer
 *                       example: 1180
 *                     failedRequests:
 *                       type: integer
 *                       example: 70
 *                     averageResponseTime:
 *                       type: number
 *                       example: 145.5
 *                     topEndpoints:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           endpoint:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     requestsByStatus:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: integer
 *                           count:
 *                             type: integer
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Token not found or access denied
 */
router.get(
  '/:id/usage/stats',
  AuthMiddleware.authenticate,
  getTokenValidator,
  tokenController.getTokenUsageStats
);

/**
 * @swagger
 * /api/v1/tokens/{id}/usage/timeseries:
 *   get:
 *     summary: Get token usage time-series data
 *     description: Returns time-series usage data for analytics and charts
 *     tags: [API Tokens]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Token ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [hour, day]
 *           default: day
 *         description: Aggregation period for time series
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for time series
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for time series
 *     responses:
 *       200:
 *         description: Time-series data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: string
 *                       enum: [hour, day]
 *                       example: day
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                             format: date-time
 *                           requests:
 *                             type: integer
 *                           averageResponseTime:
 *                             type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Token not found or access denied
 */
router.get(
  '/:id/usage/timeseries',
  AuthMiddleware.authenticate,
  getTokenValidator,
  tokenController.getTokenUsageTimeSeries
);

export default router;
