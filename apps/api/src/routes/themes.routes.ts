import { Router } from 'express';
import { themesController } from '../controllers/themes.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import {
  validateCreateTheme,
  validateUpdateTheme,
  validateThemeId,
} from '../validators/themes.validator';

/**
 * Themes routes configuration.
 * Defines all CRUD endpoints for theme management with proper validation and middleware.
 */
const router = Router();

/**
 * @swagger
 * /api/themes:
 *   get:
 *     summary: List all active themes
 *     description: Get all active themes sorted by usage count in descending order
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of themes sorted by usage count
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
 */
router.get('/', AuthMiddleware.authenticate, themesController.getThemes);

/**
 * @swagger
 * /api/themes/{id}:
 *   get:
 *     summary: Get theme by ID
 *     description: Get a single theme by its ID
 *     tags: [Themes]
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
  validateThemeId,
  themesController.getThemeById
);

/**
 * @swagger
 * /api/themes:
 *   post:
 *     summary: Create new theme
 *     description: Create a new theme (admin only)
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, thumbnailUrl, themeConfig]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 description: Theme display name
 *                 example: "Modern Blue"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional theme description
 *                 example: "Clean modern theme with blue accents"
 *               thumbnailUrl:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *                 description: Thumbnail image URL
 *                 example: "https://spaces.example.com/theme-thumb.jpg"
 *               themeConfig:
 *                 type: object
 *                 required: [desktop]
 *                 properties:
 *                   desktop:
 *                     $ref: '#/components/schemas/ThemeProperties'
 *                   mobile:
 *                     allOf:
 *                       - $ref: '#/components/schemas/ThemeProperties'
 *                       - type: object
 *                         description: "All properties are optional for mobile"
 *           example:
 *             name: "Modern Blue"
 *             description: "Clean modern theme with blue accents"
 *             thumbnailUrl: "https://spaces.example.com/theme-thumb.jpg"
 *             themeConfig:
 *               desktop:
 *                 primaryColor: "#007bff"
 *                 secondaryColor: "#6c757d"
 *                 backgroundColor: "#ffffff"
 *                 textColorPrimary: "#212529"
 *                 textColorSecondary: "#6c757d"
 *                 fontFamilyHeading: "Roboto"
 *                 fontFamilyBody: "Open Sans"
 *                 fieldBorderRadius: "8px"
 *                 fieldSpacing: "16px"
 *                 containerBackground: "#f8f9fa"
 *                 containerOpacity: 0.95
 *                 containerPosition: "center"
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
 *         description: Validation error
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
  validateCreateTheme,
  themesController.createTheme
);

/**
 * @swagger
 * /api/themes/{id}:
 *   put:
 *     summary: Update existing theme
 *     description: Update an existing theme (admin only)
 *     tags: [Themes]
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
 *                 maxLength: 100
 *                 description: Theme display name
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Optional theme description
 *               thumbnailUrl:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *                 description: Thumbnail image URL
 *               themeConfig:
 *                 type: object
 *                 properties:
 *                   desktop:
 *                     $ref: '#/components/schemas/ThemeProperties'
 *                   mobile:
 *                     allOf:
 *                       - $ref: '#/components/schemas/ThemeProperties'
 *                       - type: object
 *                         description: "All properties are optional for mobile"
 *           example:
 *             name: "Updated Theme Name"
 *             description: "Updated description"
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
 *         description: Validation error
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
  validateUpdateTheme,
  themesController.updateTheme
);

/**
 * @swagger
 * /api/themes/{id}:
 *   delete:
 *     summary: Delete theme (soft delete)
 *     description: Soft delete a theme by setting is_active to false (admin only)
 *     tags: [Themes]
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
  themesController.deleteTheme
);

/**
 * @swagger
 * /api/themes/{id}/apply:
 *   post:
 *     summary: Track theme application
 *     description: Increment the usage count for a theme when it's applied
 *     tags: [Themes]
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
 *         description: Theme application tracked successfully
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
 *                   example: "Theme application tracked successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     usageCount:
 *                       type: integer
 *                       example: 1235
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required
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
router.post(
  '/:id/apply',
  AuthMiddleware.authenticate,
  validateThemeId,
  themesController.applyTheme
);

/**
 * @swagger
 * /api/themes/{id}/usage:
 *   get:
 *     summary: Get theme usage statistics
 *     description: Get detailed usage statistics for a theme including forms using it
 *     tags: [Themes]
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
 *         description: Theme usage statistics retrieved successfully
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
 *                   example: "Theme usage retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     formsCount:
 *                       type: integer
 *                       description: Total number of forms using this theme
 *                       example: 15
 *                     publishedFormsCount:
 *                       type: integer
 *                       description: Number of published forms using this theme
 *                       example: 12
 *                     lastUsed:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of the most recently modified form using this theme
 *                       example: "2025-10-15T14:30:00.000Z"
 *                     formsList:
 *                       type: array
 *                       description: List of forms using this theme
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                             example: "98765432-e89b-12d3-a456-426614174111"
 *                           title:
 *                             type: string
 *                             example: "Contact Form"
 *                           published:
 *                             type: boolean
 *                             example: true
 *                           lastModified:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-10-15T14:30:00.000Z"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required
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
  '/:id/usage',
  AuthMiddleware.authenticate,
  validateThemeId,
  themesController.getThemeUsage
);

export { router as themesRoutes };
