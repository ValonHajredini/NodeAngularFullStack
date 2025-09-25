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

export default router;
