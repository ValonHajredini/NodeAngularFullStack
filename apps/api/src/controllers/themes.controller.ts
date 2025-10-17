import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { themesService } from '../services/themes.service';
import { AsyncHandler } from '../utils/async-handler.utils';

/**
 * Themes controller handling HTTP requests for theme management operations.
 * Manages CRUD operations for themes with proper authentication and authorization.
 */
export class ThemesController {
  /**
   * @swagger
   * /api/themes:
   *   get:
   *     summary: List all active themes
   *     description: Retrieves all active themes sorted by usage count. Public endpoint, no authentication required.
   *     tags:
   *       - Themes
   *     responses:
   *       200:
   *         description: Successfully retrieved themes
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
   *                   example: Themes retrieved successfully
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Theme'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  getThemes = AsyncHandler(
    async (
      _req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const themes = await themesService.findAll(true);

      res.status(200).json({
        success: true,
        message: 'Themes retrieved successfully',
        data: themes,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * @swagger
   * /api/themes/{id}:
   *   get:
   *     summary: Get theme by ID
   *     description: Retrieves a single theme by its UUID. Public endpoint, no authentication required.
   *     tags:
   *       - Themes
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Theme UUID
   *     responses:
   *       200:
   *         description: Successfully retrieved theme
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
   *                   example: Theme retrieved successfully
   *                 data:
   *                   $ref: '#/components/schemas/Theme'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       404:
   *         description: Theme not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  getThemeById = AsyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = req.params;

      const theme = await themesService.findById(id);

      if (!theme) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Theme not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Theme retrieved successfully',
        data: theme,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * @swagger
   * /api/themes:
   *   post:
   *     summary: Create a new theme
   *     description: Creates a new custom theme. Requires authentication. Any authenticated user can create themes.
   *     tags:
   *       - Themes
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - themeConfig
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 50
   *                 example: My Custom Theme
   *               description:
   *                 type: string
   *                 maxLength: 200
   *                 example: A beautiful custom theme for my forms
   *               thumbnailUrl:
   *                 type: string
   *                 format: uri
   *                 example: https://example.com/thumbnail.png
   *               themeConfig:
   *                 type: object
   *                 properties:
   *                   primaryColor:
   *                     type: string
   *                     pattern: ^#[0-9A-Fa-f]{6}$
   *                     example: "#3B82F6"
   *                   secondaryColor:
   *                     type: string
   *                     pattern: ^#[0-9A-Fa-f]{6}$
   *                     example: "#10B981"
   *                   backgroundColor:
   *                     type: string
   *                     example: "#FFFFFF"
   *                   backgroundType:
   *                     type: string
   *                     enum: [solid, linear, radial]
   *                     example: linear
   *                   gradientAngle:
   *                     type: integer
   *                     minimum: 0
   *                     maximum: 360
   *                     example: 135
   *                   headingFont:
   *                     type: string
   *                     example: Montserrat
   *                   bodyFont:
   *                     type: string
   *                     example: Open Sans
   *                   borderRadius:
   *                     type: integer
   *                     minimum: 0
   *                     maximum: 32
   *                     example: 8
   *                   fieldPadding:
   *                     type: integer
   *                     minimum: 8
   *                     maximum: 24
   *                     example: 12
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
   *                   example: Theme created successfully
   *                 data:
   *                   $ref: '#/components/schemas/Theme'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Invalid input data
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
  createTheme = AsyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
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

      const userId = (req.user as any)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const themeData = {
        name: req.body.name,
        description: req.body.description,
        thumbnailUrl: req.body.thumbnailUrl,
        themeConfig: req.body.themeConfig,
        createdBy: userId,
      };

      const theme = await themesService.create(themeData);

      res.status(201).json({
        success: true,
        message: 'Theme created successfully',
        data: theme,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * @swagger
   * /api/themes/{id}:
   *   put:
   *     summary: Update an existing theme
   *     description: Updates a theme. Requires authentication. Users can only update their own themes. Admins can update any theme.
   *     tags:
   *       - Themes
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Theme UUID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 50
   *                 example: Updated Theme Name
   *               description:
   *                 type: string
   *                 maxLength: 200
   *                 example: Updated description
   *               themeConfig:
   *                 type: object
   *                 properties:
   *                   primaryColor:
   *                     type: string
   *                     pattern: ^#[0-9A-Fa-f]{6}$
   *                     example: "#FF5733"
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
   *                   example: Theme updated successfully
   *                 data:
   *                   $ref: '#/components/schemas/Theme'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Invalid input data
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
   *         description: Forbidden - You can only edit your own themes
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
  updateTheme = AsyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
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

      const { id } = req.params;
      const userId = (req.user as any)?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updateData = {
        name: req.body.name,
        description: req.body.description,
        thumbnailUrl: req.body.thumbnailUrl,
        themeConfig: req.body.themeConfig,
      };

      try {
        const theme = await themesService.update(id, updateData);

        res.status(200).json({
          success: true,
          message: 'Theme updated successfully',
          data: theme,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        if (error.message.includes('Theme not found')) {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Theme not found',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        throw error;
      }
    }
  );

  /**
   * @swagger
   * /api/themes/{id}:
   *   delete:
   *     summary: Delete a theme
   *     description: Soft deletes a theme. Requires authentication. Users can only delete their own themes. Admins can delete any theme.
   *     tags:
   *       - Themes
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Theme UUID
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
   *                   example: Theme deleted successfully
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
   *         description: Forbidden - You can only delete your own themes
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
  deleteTheme = AsyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = req.params;

      const deleted = await themesService.softDelete(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Theme not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Theme deleted successfully',
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * Tracks theme application by incrementing usage count.
   * @route POST /api/themes/:id/apply
   * @param req - Express request object with theme ID parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with updated usage count
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 404 - Theme not found
   * @example
   * POST /api/themes/theme-uuid/apply
   * Authorization: Bearer <token>
   */
  applyTheme = AsyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = req.params;

      try {
        const theme = await themesService.incrementUsage(id);

        res.status(200).json({
          success: true,
          message: 'Theme application tracked successfully',
          data: {
            usageCount: theme.usageCount,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        if (error.message.includes('Theme not found')) {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Theme not found',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        throw error;
      }
    }
  );

  /**
   * Gets theme usage statistics including forms using this theme.
   * @route GET /api/themes/:id/usage
   * @param req - Express request object with theme ID parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with theme usage statistics
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 404 - Theme not found
   * @example
   * GET /api/themes/theme-uuid/usage
   * Authorization: Bearer <token>
   */
  getThemeUsage = AsyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const { id } = req.params;

      try {
        const usage = await themesService.getThemeUsage(id);

        res.status(200).json({
          success: true,
          message: 'Theme usage retrieved successfully',
          data: usage,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        if (error.message.includes('Theme not found')) {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Theme not found',
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        throw error;
      }
    }
  );
}

// Export singleton instance
export const themesController = new ThemesController();
