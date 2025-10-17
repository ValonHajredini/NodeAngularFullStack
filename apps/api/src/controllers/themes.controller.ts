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
   * Gets all active themes sorted by usage count.
   * @route GET /api/themes
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with array of themes
   * @throws {ApiError} 401 - Authentication required
   * @example
   * GET /api/themes
   * Authorization: Bearer <token>
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
   * Gets a single theme by ID.
   * @route GET /api/themes/:id
   * @param req - Express request object with theme ID parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with theme data
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 404 - Theme not found
   * @example
   * GET /api/themes/theme-uuid
   * Authorization: Bearer <token>
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
   * Creates a new theme.
   * Requires authentication. Any authenticated user can create themes.
   * @route POST /api/themes
   * @param req - Express request object with theme creation data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with created theme data
   * @throws {ApiError} 400 - Invalid input data
   * @throws {ApiError} 401 - Authentication required
   * @example
   * POST /api/themes
   * Authorization: Bearer <token>
   * {
   *   "name": "Custom Theme",
   *   "description": "Optional description",
   *   "thumbnailUrl": "https://...",
   *   "themeConfig": {
   *     "desktop": { ... },
   *     "mobile": { ... }
   *   }
   * }
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
   * Updates an existing theme.
   * Requires authentication. Users can only update their own themes. Admins can update any theme.
   * @route PUT /api/themes/:id
   * @param req - Express request object with theme update data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with updated theme data
   * @throws {ApiError} 400 - Invalid input data
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Forbidden if user is not theme owner or admin
   * @throws {ApiError} 404 - Theme not found
   * @example
   * PUT /api/themes/theme-uuid
   * Authorization: Bearer <token>
   * {
   *   "name": "Updated Theme Name",
   *   "description": "New description"
   * }
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
   * Soft deletes a theme.
   * Requires authentication. Users can only delete their own themes. Admins can delete any theme.
   * @route DELETE /api/themes/:id
   * @param req - Express request object with theme ID parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with deletion confirmation
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Forbidden if user is not theme owner or admin
   * @throws {ApiError} 404 - Theme not found
   * @example
   * DELETE /api/themes/theme-uuid
   * Authorization: Bearer <token>
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
