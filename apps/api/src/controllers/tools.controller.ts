import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { toolsService } from '../services/tools.service';
import { componentGenerationService } from '../services/component-generation.service';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Tools controller handling HTTP requests for tools management operations.
 * Manages tools registry with proper authentication and authorization (super admin only).
 */
export class ToolsController {
  /**
   * Retrieves all tools in the registry.
   * @route GET /api/admin/tools
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with tools list and ETag header
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Super admin access required
   * @throws {ApiError} 500 - Internal server error
   * @example
   * GET /api/admin/tools
   * Authorization: Bearer <admin-token>
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "tools": [
   *       {
   *         "id": "uuid",
   *         "key": "short-link",
   *         "name": "Short Link Generator",
   *         "description": "Generate shortened URLs...",
   *         "active": true,
   *         "createdAt": "2025-09-26T...",
   *         "updatedAt": "2025-09-26T..."
   *       }
   *     ]
   *   }
   * }
   */
  getTools = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
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

      // Check for If-None-Match header for cache validation
      const ifNoneMatch = req.headers['if-none-match'];
      const currentETag = toolsService.getCurrentETag();

      if (ifNoneMatch && currentETag && ifNoneMatch === currentETag) {
        res.status(304).end(); // Not Modified
        return;
      }

      // Get tools from service
      const result = await toolsService.getTools();

      // Set ETag header for caching
      res.set('ETag', result.etag);
      res.set('Cache-Control', 'private, max-age=300'); // 5 minutes

      res.status(200).json({
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error retrieving tools:', error);
      next({
        status: 500,
        message: 'Failed to retrieve tools',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Retrieves only active tools.
   * @route GET /api/admin/tools/active
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with active tools list
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Super admin access required
   * @throws {ApiError} 500 - Internal server error
   * @example
   * GET /api/admin/tools/active
   * Authorization: Bearer <admin-token>
   */
  getActiveTools = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await toolsService.getActiveTools();

      res.status(200).json({
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error retrieving active tools:', error);
      next({
        status: 500,
        message: 'Failed to retrieve active tools',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Retrieves a specific tool by its slug.
   * @route GET /api/admin/tools/slug/:slug
   * @param req - Express request object with tool slug parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with tool data
   * @throws {ApiError} 400 - Invalid tool slug
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Super admin access required
   * @throws {ApiError} 404 - Tool not found
   * @throws {ApiError} 500 - Internal server error
   * @example
   * GET /api/admin/tools/slug/short-link-generator
   * Authorization: Bearer <admin-token>
   */
  getToolBySlug = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tool slug',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { slug } = req.params;
      const tool = await toolsService.getToolBySlug(slug);

      if (!tool) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: `Tool with slug '${slug}' not found`,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { tool },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error retrieving tool by slug:', error);
      next({
        status: 500,
        message: 'Failed to retrieve tool',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Validates if a tool key is available for use.
   * @route GET /api/admin/tools/validate-key/:key
   * @param req - Express request object with tool key parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with validation result
   * @throws {ApiError} 400 - Invalid tool key format
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Super admin access required
   * @throws {ApiError} 500 - Internal server error
   * @example
   * GET /api/admin/tools/validate-key/new-tool-key
   * Authorization: Bearer <admin-token>
   *
   * Response:
   * {
   *   "success": true,
   *   "available": true,
   *   "message": "Tool key is available"
   * }
   */
  validateToolKey = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tool key format',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { key } = req.params;
      const existingTool = await toolsService.getToolByKey(key);
      const isAvailable = !existingTool;

      res.status(200).json({
        success: true,
        available: isAvailable,
        message: isAvailable
          ? 'Tool key is available'
          : 'Tool key is already taken',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error validating tool key:', error);
      next({
        status: 500,
        message: 'Failed to validate tool key',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Retrieves a specific tool by its key.
   * @route GET /api/admin/tools/:key
   * @param req - Express request object with tool key parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with tool data
   * @throws {ApiError} 400 - Invalid tool key
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Super admin access required
   * @throws {ApiError} 404 - Tool not found
   * @throws {ApiError} 500 - Internal server error
   * @example
   * GET /api/admin/tools/short-link
   * Authorization: Bearer <admin-token>
   */
  getToolByKey = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tool key',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { key } = req.params;
      const tool = await toolsService.getToolByKey(key);

      if (!tool) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: `Tool with key '${key}' not found`,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { tool },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error retrieving tool by key:', error);
      next({
        status: 500,
        message: 'Failed to retrieve tool',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Updates a tool's status (enable/disable).
   * @route PATCH /api/admin/tools/:key
   * @param req - Express request object with tool key and status update
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with updated tool data
   * @throws {ApiError} 400 - Invalid input data
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Super admin access required
   * @throws {ApiError} 404 - Tool not found
   * @throws {ApiError} 500 - Internal server error
   * @example
   * PATCH /api/admin/tools/short-link
   * Authorization: Bearer <admin-token>
   * {
   *   "active": false
   * }
   */
  updateToolStatus = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
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

      const { key } = req.params;
      const { active } = req.body;

      // Validate that active is a boolean
      if (typeof active !== 'boolean') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Active status must be a boolean value',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await toolsService.updateToolStatus(key, { active });

      res.status(200).json({
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating tool status:', error);

      // Handle specific error cases
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next({
        status: 500,
        message: 'Failed to update tool status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Creates a new tool in the registry.
   * @route POST /api/admin/tools
   * @param req - Express request object with tool creation data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with created tool data
   * @throws {ApiError} 400 - Invalid input data
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Super admin access required
   * @throws {ApiError} 409 - Tool key already exists
   * @throws {ApiError} 500 - Internal server error
   * @example
   * POST /api/admin/tools
   * Authorization: Bearer <admin-token>
   * {
   *   "key": "new-tool",
   *   "name": "New Tool",
   *   "description": "A new tool for the system",
   *   "active": true
   * }
   */
  createTool = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
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

      const result = await toolsService.createTool(req.body);

      // Generate component scaffolding in development mode
      if (result.success && componentGenerationService.isScaffoldingEnabled()) {
        try {
          const tool = result.data.tool;
          const componentResult =
            await componentGenerationService.generateComponent({
              toolKey: tool.key,
              toolName: tool.name,
              slug: tool.slug,
              description: tool.description,
              icon: 'pi pi-wrench',
              category: 'utility',
            });

          if (componentResult.success) {
            console.log(
              `Component scaffolding generated for tool '${tool.key}':`,
              componentResult.filesCreated
            );
          } else {
            console.warn(
              `Component scaffolding failed for tool '${tool.key}':`,
              componentResult.errors
            );
          }
        } catch (error) {
          console.error(
            `Component scaffolding error for tool '${req.body.key}':`,
            error
          );
          // Don't fail the tool creation if scaffolding fails
        }
      }

      res.status(201).json({
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating tool:', error);

      // Handle specific error cases
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'TOOL_EXISTS',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error instanceof Error && error.message.includes('kebab-case')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_KEY_FORMAT',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next({
        status: 500,
        message: 'Failed to create tool',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Deletes a tool from the registry.
   * @route DELETE /api/admin/tools/:key
   * @param req - Express request object with tool key parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response confirming deletion
   * @throws {ApiError} 400 - Invalid tool key
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Super admin access required
   * @throws {ApiError} 404 - Tool not found
   * @throws {ApiError} 500 - Internal server error
   * @example
   * DELETE /api/admin/tools/obsolete-tool
   * Authorization: Bearer <admin-token>
   */
  deleteTool = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid tool key',
            details: errors.array(),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { key } = req.params;
      await toolsService.deleteTool(key);

      res.status(200).json({
        success: true,
        message: `Tool '${key}' deleted successfully`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deleting tool:', error);

      // Handle specific error cases
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      next({
        status: 500,
        message: 'Failed to delete tool',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

// Export singleton instance
export const toolsController = new ToolsController();
