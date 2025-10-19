import { Router } from 'express';
import multer from 'multer';
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
 * Multer configuration for theme thumbnail uploads.
 * Handles multipart/form-data file uploads with validation.
 */
const thumbnailUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit (smaller than avatars)
    files: 1, // Single file only
  },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    // Accept only image files
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only jpg, png, and webp files are allowed.'
        )
      );
    }
  },
});

/**
 * @swagger
 * /api/themes/upload-thumbnail:
 *   post:
 *     summary: Upload theme thumbnail
 *     description: Upload a thumbnail image for a theme to DigitalOcean Spaces
 *     tags: [Themes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [thumbnail]
 *             properties:
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *                 description: Thumbnail image file (JPEG, PNG, or WebP, max 2MB)
 *     responses:
 *       200:
 *         description: Thumbnail uploaded successfully
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
 *                   example: "Thumbnail uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     thumbnailUrl:
 *                       type: string
 *                       format: uri
 *                       example: "https://bucket.region.digitaloceanspaces.com/1234567890-abcd1234.jpg"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid file or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/upload-thumbnail',
  AuthMiddleware.authenticate,
  thumbnailUpload.single('thumbnail'),
  themesController.uploadThumbnail
);

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
 *     description: Create a new theme. Requires authentication. Any authenticated user can create themes.
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
 */
router.post(
  '/',
  AuthMiddleware.authenticate,
  validateCreateTheme,
  themesController.createTheme
);

/**
 * @swagger
 * /api/themes/{id}:
 *   put:
 *     summary: Update existing theme
 *     description: Update an existing theme. Requires authentication. Users can only update their own themes. Admins can update any theme.
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
 *         description: Forbidden if user is not theme owner or admin
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
  AuthMiddleware.requireThemeOwnerOrAdmin,
  validateThemeId,
  validateUpdateTheme,
  themesController.updateTheme
);

/**
 * @swagger
 * /api/themes/{id}:
 *   delete:
 *     summary: Delete theme (soft delete)
 *     description: Soft delete a theme by setting is_active to false. Requires authentication. Users can only delete their own themes. Admins can delete any theme.
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
 *         description: Forbidden if user is not theme owner or admin
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
  AuthMiddleware.requireThemeOwnerOrAdmin,
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
