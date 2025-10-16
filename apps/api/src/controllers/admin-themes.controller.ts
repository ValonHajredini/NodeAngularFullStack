import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { themesService } from '../services/themes.service';
import { AsyncHandler } from '../utils/async-handler.utils';

/**
 * Admin themes controller handling HTTP requests for admin-only theme management.
 * Provides simplified API with enhanced validation for admin users.
 */
export class AdminThemesController {
  /**
   * Gets all themes including custom themes (admin only).
   * @route GET /api/v1/admin/themes
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with array of all themes
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Admin access required
   */
  getThemes = AsyncHandler(
    async (
      _req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      // Admin can see all themes including inactive ones
      const themes = await themesService.findAll(false); // false = include inactive

      res.status(200).json({
        success: true,
        message: 'Themes retrieved successfully',
        data: themes,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * Gets a single theme by ID (admin only).
   * @route GET /api/v1/admin/themes/:id
   * @param req - Express request object with theme ID parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with theme data
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Admin access required
   * @throws {ApiError} 404 - Theme not found
   */
  getThemeById = AsyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      // Check validation results first
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
   * Creates a new custom theme (admin only).
   * Accepts simplified format and transforms to full theme structure.
   * @route POST /api/v1/admin/themes
   * @param req - Express request object with simplified theme data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with created theme data
   * @throws {ApiError} 400 - Invalid input data, accessibility violation, or security issue
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Admin access required
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

      // Transform simplified admin format to full theme structure
      const {
        name,
        description,
        primaryColor,
        secondaryColor,
        backgroundColor,
        fontHeading,
        fontBody,
        thumbnailUrl,
      } = req.body;

      const themeData = {
        name,
        description,
        thumbnailUrl,
        isCustom: true, // Admin-created themes are always custom
        creatorId: userId, // Required for custom themes
        themeDefinition: {
          // Required for custom themes - store the simplified admin format
          primaryColor,
          secondaryColor,
          backgroundColor,
          fontHeading,
          fontBody,
        },
        themeConfig: {
          desktop: {
            primaryColor,
            secondaryColor,
            backgroundColor,
            textColorPrimary: primaryColor, // Use primary color for text
            textColorSecondary: secondaryColor,
            fontFamilyHeading: fontHeading,
            fontFamilyBody: fontBody,
            fieldBorderRadius: '8px', // Default values
            fieldSpacing: '16px',
            containerBackground: backgroundColor,
            containerOpacity: 0.95,
            containerPosition: 'center' as const,
          },
          mobile: {
            primaryColor,
            secondaryColor,
            backgroundColor,
            fontFamilyHeading: fontHeading,
            fontFamilyBody: fontBody,
            fieldSpacing: '12px', // Tighter spacing for mobile
          },
        },
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
   * Updates an existing theme (admin only).
   * Accepts simplified format and merges with existing theme structure.
   * @route PUT /api/v1/admin/themes/:id
   * @param req - Express request object with theme update data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with updated theme data
   * @throws {ApiError} 400 - Invalid input data, accessibility violation, or security issue
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Admin access required
   * @throws {ApiError} 404 - Theme not found
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

      // Get existing theme to merge updates
      const existingTheme = await themesService.findById(id);
      if (!existingTheme) {
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

      // Transform simplified admin format to full theme structure
      const {
        name,
        description,
        primaryColor,
        secondaryColor,
        backgroundColor,
        fontHeading,
        fontBody,
        thumbnailUrl,
      } = req.body;

      // Build update data by merging new values with existing theme config
      const updateData: any = {};

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;

      // Update theme config and theme definition if any color/style properties are provided
      if (
        primaryColor ||
        secondaryColor ||
        backgroundColor ||
        fontHeading ||
        fontBody
      ) {
        const existingConfig = existingTheme.themeConfig || {
          desktop: {},
          mobile: {},
        };
        const existingDefinition = existingTheme.themeDefinition || {};

        updateData.themeConfig = {
          desktop: {
            ...existingConfig.desktop,
            ...(primaryColor && {
              primaryColor,
              textColorPrimary: primaryColor,
            }),
            ...(secondaryColor && {
              secondaryColor,
              textColorSecondary: secondaryColor,
            }),
            ...(backgroundColor && {
              backgroundColor,
              containerBackground: backgroundColor,
            }),
            ...(fontHeading && { fontFamilyHeading: fontHeading }),
            ...(fontBody && { fontFamilyBody: fontBody }),
          },
          mobile: {
            ...existingConfig.mobile,
            ...(primaryColor && { primaryColor }),
            ...(secondaryColor && { secondaryColor }),
            ...(backgroundColor && { backgroundColor }),
            ...(fontHeading && { fontFamilyHeading: fontHeading }),
            ...(fontBody && { fontFamilyBody: fontBody }),
          },
        };

        // Update theme definition (simplified admin format)
        updateData.themeDefinition = {
          ...existingDefinition,
          ...(primaryColor && { primaryColor }),
          ...(secondaryColor && { secondaryColor }),
          ...(backgroundColor && { backgroundColor }),
          ...(fontHeading && { fontHeading }),
          ...(fontBody && { fontBody }),
        };
      }

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

        if (
          error.message.includes(
            'duplicate key value violates unique constraint'
          ) ||
          error.message.includes('unique_form_themes_name')
        ) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Theme name already exists',
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
   * Soft deletes a theme (admin only).
   * @route DELETE /api/v1/admin/themes/:id
   * @param req - Express request object with theme ID parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with deletion confirmation
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Admin access required
   * @throws {ApiError} 404 - Theme not found
   */
  deleteTheme = AsyncHandler(
    async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
      // Check validation results first
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
}

// Export singleton instance
export const adminThemesController = new AdminThemesController();
