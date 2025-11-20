import { Response, NextFunction } from 'express';
import { ToolRegistryService } from '../services/tool-registry.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { AsyncHandler } from '../utils/async-handler.utils';

/**
 * HTTP status codes used throughout the controller
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
} as const;

/**
 * Handles HTTP requests for tool registry operations.
 * All endpoints require JWT authentication.
 * Provides CRUD operations and search for tool management.
 *
 * Endpoints:
 * - GET    /api/tools/registry       - List all registered tools
 * - GET    /api/tools/registry/:id   - Get tool by ID
 * - POST   /api/tools/register       - Register new tool
 * - PUT    /api/tools/registry/:id   - Update tool
 * - DELETE /api/tools/registry/:id   - Delete tool
 * - GET    /api/tools/search?q=query - Search tools by name or description
 *
 * @example
 * const repository = new ToolRegistryRepository(pool);
 * const service = new ToolRegistryService(repository);
 * const controller = new ToolRegistryController(service);
 *
 * router.get('/registry', authMiddleware, controller.getAllTools);
 */
export class ToolRegistryController {
  /**
   * Creates an instance of ToolRegistryController.
   * @param service - Tool registry service for business logic
   */
  constructor(private service: ToolRegistryService) {}

  /**
   * Lists all registered tools ordered by creation date (newest first).
   *
   * @route GET /api/tools/registry
   * @access Protected - Requires JWT authentication
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @returns JSON response with all tools
   * @throws {Error} 401 - User not authenticated (handled by authMiddleware)
   * @throws {Error} 500 - Internal server error
   *
   * @example
   * GET /api/tools/registry
   * Authorization: Bearer <jwt-token>
   *
   * Response:
   * {
   *   "message": "Tools retrieved successfully",
   *   "data": [
   *     {
   *       "id": "uuid",
   *       "tool_id": "form-builder",
   *       "name": "Form Builder",
   *       "version": "1.0.0",
   *       ...
   *     }
   *   ]
   * }
   */
  getAllTools = AsyncHandler(
    async (
      _req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const tools = await this.service.getAllTools();

        res.status(HTTP_STATUS.OK).json({
          message: 'Tools retrieved successfully',
          data: tools,
        });
      } catch (error: unknown) {
        // Unexpected errors go to error middleware
        next(error);
      }
    }
  );

  /**
   * Retrieves a specific tool by its unique tool ID.
   *
   * @route GET /api/tools/registry/:id
   * @access Protected - Requires JWT authentication
   * @param req - Express request object with tool ID in params
   * @param res - Express response object
   * @param next - Express next function
   * @returns JSON response with tool data
   * @throws {Error} 401 - User not authenticated (handled by authMiddleware)
   * @throws {Error} 404 - Tool not found
   * @throws {Error} 500 - Internal server error
   *
   * @example
   * GET /api/tools/registry/form-builder
   * Authorization: Bearer <jwt-token>
   *
   * Response:
   * {
   *   "message": "Tool retrieved successfully",
   *   "data": {
   *     "id": "uuid",
   *     "tool_id": "form-builder",
   *     "name": "Form Builder",
   *     "version": "1.0.0",
   *     ...
   *   }
   * }
   */
  getTool = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { id } = req.params;
        const tool = await this.service.getTool(id);

        res.status(HTTP_STATUS.OK).json({
          message: 'Tool retrieved successfully',
          data: tool,
        });
      } catch (error: unknown) {
        // Check if error is "not found"
        if (error instanceof Error && error.message.includes('not found')) {
          res.status(HTTP_STATUS.NOT_FOUND).json({
            error: error.message,
          });
        } else {
          next(error);
        }
      }
    }
  );

  /**
   * Registers a new tool in the registry.
   * Validates tool data and ensures unique tool ID.
   *
   * @route POST /api/tools/register
   * @access Protected - Requires JWT authentication
   * @param req - Express request object with tool registration data
   * @param res - Express response object
   * @param next - Express next function
   * @returns JSON response with registered tool data
   * @throws {Error} 400 - Invalid input data or business rule violation
   * @throws {Error} 401 - User not authenticated (handled by authMiddleware)
   * @throws {Error} 500 - Internal server error
   *
   * @example
   * POST /api/tools/register
   * Authorization: Bearer <jwt-token>
   * Content-Type: application/json
   *
   * Request Body:
   * {
   *   "tool_id": "my-tool",
   *   "name": "My Tool",
   *   "version": "1.0.0",
   *   "route": "/tools/my-tool",
   *   "api_base": "/api/tools/my-tool",
   *   "manifest_json": {
   *     "routes": { "primary": "/tools/my-tool" },
   *     "endpoints": { "base": "/api/tools/my-tool", "paths": [] }
   *   }
   * }
   *
   * Response:
   * {
   *   "message": "Tool registered successfully",
   *   "data": { ...registered tool... }
   * }
   */
  registerTool = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        // Extract authenticated user ID
        const userId = req.user?.id;

        if (userId === undefined) {
          res.status(HTTP_STATUS.UNAUTHORIZED).json({
            error: 'Authentication required',
          });
          return;
        }

        // Transform camelCase field names to snake_case for service layer
        // Validators use camelCase, service expects snake_case
        const input: any = {
          tool_id: req.body.toolId,
          name: req.body.name,
          version: req.body.version,
          route: req.body.route,
          api_base: req.body.apiBase,
          manifest_json: req.body.manifestJson,
          created_by: userId,
        };

        // Add optional fields only if provided
        if (req.body.description !== undefined) {
          input.description = req.body.description;
        }
        if (req.body.icon !== undefined) {
          input.icon = req.body.icon;
        }
        if (req.body.permissions !== undefined) {
          input.permissions = req.body.permissions;
        }
        if (req.body.status !== undefined) {
          input.status = req.body.status;
        }
        if (req.body.isExported !== undefined) {
          input.is_exported = req.body.isExported;
        }

        // Register tool via service
        const tool = await this.service.registerTool(input);

        res.status(HTTP_STATUS.CREATED).json({
          message: 'Tool registered successfully',
          data: tool,
        });
      } catch (error: unknown) {
        // Check for validation errors and business rule violations
        if (
          error instanceof Error &&
          (error.message.includes('already exists') ||
            error.message.includes('must be') ||
            error.message.includes('is invalid') ||
            error.message.includes('Invalid'))
        ) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({
            error: error.message,
          });
        } else {
          next(error);
        }
      }
    }
  );

  /**
   * Updates an existing tool registration.
   * Only provided fields will be updated.
   *
   * @route PUT /api/tools/registry/:id
   * @access Protected - Requires JWT authentication
   * @param req - Express request object with tool ID and update data
   * @param res - Express response object
   * @param next - Express next function
   * @returns JSON response with updated tool data
   * @throws {Error} 400 - Invalid input data or business rule violation
   * @throws {Error} 401 - User not authenticated (handled by authMiddleware)
   * @throws {Error} 404 - Tool not found
   * @throws {Error} 500 - Internal server error
   *
   * @example
   * PUT /api/tools/registry/form-builder
   * Authorization: Bearer <jwt-token>
   * Content-Type: application/json
   *
   * Request Body:
   * {
   *   "name": "Updated Tool Name",
   *   "version": "2.0.0"
   * }
   *
   * Response:
   * {
   *   "message": "Tool updated successfully",
   *   "data": { ...updated tool... }
   * }
   */
  updateTool = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (userId === undefined) {
          res.status(HTTP_STATUS.UNAUTHORIZED).json({
            error: 'Authentication required',
          });
          return;
        }

        // Transform camelCase field names to snake_case for service layer
        // Validators use camelCase, service expects snake_case
        const input: any = {};

        // Add fields only if provided (partial update support)
        if (req.body.name !== undefined) {
          input.name = req.body.name;
        }
        if (req.body.description !== undefined) {
          input.description = req.body.description;
        }
        if (req.body.version !== undefined) {
          input.version = req.body.version;
        }
        if (req.body.icon !== undefined) {
          input.icon = req.body.icon;
        }
        if (req.body.route !== undefined) {
          input.route = req.body.route;
        }
        if (req.body.apiBase !== undefined) {
          input.api_base = req.body.apiBase;
        }
        if (req.body.permissions !== undefined) {
          input.permissions = req.body.permissions;
        }
        if (req.body.status !== undefined) {
          input.status = req.body.status;
        }
        if (req.body.isExported !== undefined) {
          input.is_exported = req.body.isExported;
        }
        if (req.body.exportedAt !== undefined) {
          input.exported_at = req.body.exportedAt;
        }
        if (req.body.serviceUrl !== undefined) {
          input.service_url = req.body.serviceUrl;
        }
        if (req.body.databaseName !== undefined) {
          input.database_name = req.body.databaseName;
        }
        if (req.body.manifestJson !== undefined) {
          input.manifest_json = req.body.manifestJson;
        }

        // Update tool via service
        const tool = await this.service.updateTool(id, input);

        res.status(HTTP_STATUS.OK).json({
          message: 'Tool updated successfully',
          data: tool,
        });
      } catch (error: unknown) {
        // Check error type
        if (error instanceof Error && error.message.includes('not found')) {
          res.status(HTTP_STATUS.NOT_FOUND).json({
            error: error.message,
          });
        } else if (
          error instanceof Error &&
          (error.message.includes('Invalid') ||
            error.message.includes('transition'))
        ) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({
            error: error.message,
          });
        } else {
          next(error);
        }
      }
    }
  );

  /**
   * Deletes a tool registration from the registry.
   * Prevents deletion of exported tools.
   *
   * @route DELETE /api/tools/registry/:id
   * @access Protected - Requires JWT authentication
   * @param req - Express request object with tool ID
   * @param res - Express response object
   * @param next - Express next function
   * @returns JSON response confirming deletion
   * @throws {Error} 400 - Business rule violation (e.g., tool is exported)
   * @throws {Error} 401 - User not authenticated (handled by authMiddleware)
   * @throws {Error} 404 - Tool not found
   * @throws {Error} 500 - Internal server error
   *
   * @example
   * DELETE /api/tools/registry/old-tool
   * Authorization: Bearer <jwt-token>
   *
   * Response:
   * {
   *   "message": "Tool deleted successfully"
   * }
   */
  deleteTool = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { id } = req.params;

        // Delete tool via service
        await this.service.deleteTool(id);

        res.status(HTTP_STATUS.OK).json({
          message: 'Tool deleted successfully',
        });
      } catch (error: unknown) {
        // Check error type
        if (error instanceof Error && error.message.includes('not found')) {
          res.status(HTTP_STATUS.NOT_FOUND).json({
            error: error.message,
          });
        } else if (
          error instanceof Error &&
          error.message.includes('Cannot delete')
        ) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({
            error: error.message,
          });
        } else {
          next(error);
        }
      }
    }
  );

  /**
   * Searches tools by name or description using case-insensitive pattern matching.
   * Query must be at least 2 characters long.
   *
   * @route GET /api/tools/search?q=query
   * @access Protected - Requires JWT authentication
   * @param req - Express request object with search query parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns JSON response with matching tools
   * @throws {Error} 400 - Invalid query (too short)
   * @throws {Error} 401 - User not authenticated (handled by authMiddleware)
   * @throws {Error} 500 - Internal server error
   *
   * @example
   * GET /api/tools/search?q=form
   * Authorization: Bearer <jwt-token>
   *
   * Response:
   * {
   *   "message": "Search completed successfully",
   *   "data": [
   *     {
   *       "id": "uuid",
   *       "tool_id": "form-builder",
   *       "name": "Form Builder",
   *       ...
   *     }
   *   ],
   *   "query": "form"
   * }
   */
  searchTools = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const query = req.query.q as string;

        // Search tools via service
        const tools = await this.service.searchTools(query);

        res.status(HTTP_STATUS.OK).json({
          message: 'Search completed successfully',
          data: tools,
          query: query,
        });
      } catch (error: unknown) {
        // Check for validation errors
        if (
          error instanceof Error &&
          (error.message.includes('at least') ||
            error.message.includes('characters'))
        ) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({
            error: error.message,
          });
        } else {
          next(error);
        }
      }
    }
  );
}
