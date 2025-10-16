import { Router } from 'express';
import { adminThemesController } from '../controllers/admin-themes.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import {
  validateCreateAdminTheme,
  validateUpdateAdminTheme,
  validateThemeId,
} from '../validators/themes.validator';

/**
 * Admin-only theme routes configuration.
 * Defines CRUD endpoints for theme management restricted to admin users only.
 * Follows the existing /api/v1/admin pattern for consistency.
 */
const router = Router();

/**
 * @swagger
 * /api/v1/admin/themes:
 *   get:
 *     summary: List all themes (admin only)
 *     description: Get all themes including custom themes sorted by usage count in descending order
 *     tags: [Admin - Themes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all themes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Themes retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FormTheme'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  adminThemesController.getThemes
);

/**
 * @swagger
 * /api/v1/admin/themes/{id}:
 *   get:
 *     summary: Get theme by ID (admin only)
 *     description: Get a single theme by its ID including custom theme details
 *     tags: [Admin - Themes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Theme ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Theme retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Theme retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/FormTheme'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Theme not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  validateThemeId,
  adminThemesController.getThemeById
);

/**
 * @swagger
 * /api/v1/admin/themes:
 *   post:
 *     summary: Create new custom theme (admin only)
 *     description: Create a new custom theme with enhanced validation including accessibility checks, CSS safety, and size limits
 *     tags: [Admin - Themes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, primaryColor, secondaryColor, backgroundColor, fontHeading, fontBody]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 description: Theme display name (unique)
 *                 example: "Custom Corporate Theme"
 *               primaryColor:
 *                 type: string
 *                 pattern: "^#[0-9A-Fa-f]{6}$"
 *                 description: Primary color (hex format, accessibility validated)
 *                 example: "#1a73e8"
 *               secondaryColor:
 *                 type: string
 *                 pattern: "^#[0-9A-Fa-f]{6}$"
 *                 description: Secondary color (hex format, accessibility validated)
 *                 example: "#34a853"
 *               backgroundColor:
 *                 type: string
 *                 description: Background (hex color or safe CSS gradient)
 *                 example: "linear-gradient(135deg, #f8f9fa 0%, #e8eaed 100%)"
 *               fontHeading:
 *                 type: string
 *                 description: Font family for headings (web-safe or Google Fonts)
 *                 example: "Roboto, sans-serif"
 *               fontBody:
 *                 type: string
 *                 description: Font family for body text (web-safe or Google Fonts)
 *                 example: "Open Sans, sans-serif"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional theme description
 *                 example: "Professional corporate theme with blue accents"
 *               thumbnailUrl:
 *                 type: string
 *                 format: uri
 *                 description: Theme thumbnail image URL
 *                 example: "https://spaces.example.com/theme-thumb.jpg"
 *           example:
 *             name: "Custom Corporate Theme"
 *             primaryColor: "#1a73e8"
 *             secondaryColor: "#34a853"
 *             backgroundColor: "linear-gradient(135deg, #f8f9fa 0%, #e8eaed 100%)"
 *             fontHeading: "Roboto, sans-serif"
 *             fontBody: "Open Sans, sans-serif"
 *             description: "Professional corporate theme with blue accents"
 *             thumbnailUrl: "https://spaces.example.com/theme-thumb.jpg"
 *     responses:
 *       201:
 *         description: Theme created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Theme created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/FormTheme'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error (accessibility, size limit, or malicious CSS)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  validateCreateAdminTheme,
  adminThemesController.createTheme
);

/**
 * @swagger
 * /api/v1/admin/themes/{id}:
 *   put:
 *     summary: Update existing theme (admin only)
 *     description: Update an existing theme with enhanced validation including accessibility checks, CSS safety, and size limits
 *     tags: [Admin - Themes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Theme ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 description: Theme display name (unique)
 *               primaryColor:
 *                 type: string
 *                 pattern: "^#[0-9A-Fa-f]{6}$"
 *                 description: Primary color (hex format, accessibility validated)
 *               secondaryColor:
 *                 type: string
 *                 pattern: "^#[0-9A-Fa-f]{6}$"
 *                 description: Secondary color (hex format, accessibility validated)
 *               backgroundColor:
 *                 type: string
 *                 description: Background (hex color or safe CSS gradient)
 *               fontHeading:
 *                 type: string
 *                 description: Font family for headings (web-safe or Google Fonts)
 *               fontBody:
 *                 type: string
 *                 description: Font family for body text (web-safe or Google Fonts)
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional theme description
 *               thumbnailUrl:
 *                 type: string
 *                 format: uri
 *                 description: Theme thumbnail image URL
 *           example:
 *             name: "Updated Corporate Theme"
 *             primaryColor: "#2196f3"
 *             description: "Updated professional theme"
 *     responses:
 *       200:
 *         description: Theme updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Theme updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/FormTheme'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error (accessibility, size limit, or malicious CSS)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Theme not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  validateThemeId,
  validateUpdateAdminTheme,
  adminThemesController.updateTheme
);

/**
 * @swagger
 * /api/v1/admin/themes/{id}:
 *   delete:
 *     summary: Delete theme (admin only)
 *     description: Soft delete a theme by setting is_active to false (admin only)
 *     tags: [Admin - Themes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Theme ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Theme deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Theme deleted successfully"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Theme not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  validateThemeId,
  adminThemesController.deleteTheme
);

export { router as adminThemesRoutes };
