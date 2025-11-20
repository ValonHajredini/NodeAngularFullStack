import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ToolRegistryController } from '../controllers/tool-registry.controller';
import { ToolRegistryService } from '../services/tool-registry.service';
import { ToolRegistryRepository } from '../repositories/tool-registry.repository';
import { AuthMiddleware } from '../middleware/auth.middleware';
import {
  validateRegistration,
  validateUpdate,
} from '../validators/tool-registry.validator';

/**
 * Tool Registry Routes
 *
 * Provides REST API endpoints for managing tools in the registry.
 * All routes require JWT authentication and are rate-limited.
 *
 * Security Features:
 * - JWT Authentication: All endpoints require valid bearer token
 * - Rate Limiting: 100 requests per minute per IP address
 * - Input Validation: Service-layer validation (middleware in Story 30.2.3)
 *
 * Dependency Injection Pattern:
 * Routes file initializes the full dependency chain:
 * Repository → Service → Controller
 *
 * This ensures proper separation of concerns and testability.
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
 * // Import in server.ts
 * import { toolRegistryRoutes } from './routes/tool-registry.routes.js';
 * app.use('/api/tools', toolRegistryRoutes);
 */

// Initialize dependency chain
// Repository → Service → Controller
const repository = new ToolRegistryRepository();
const service = new ToolRegistryService(repository);
const controller = new ToolRegistryController(service);

// Create router instance
const router = Router();

/**
 * Rate Limiting Configuration
 *
 * Protects tool registry endpoints from DoS attacks by limiting
 * the number of requests from authenticated users.
 *
 * Configuration:
 * - Window: 1 minute (60,000 ms)
 * - Max Requests: 100 per window per user
 * - Response: 429 Too Many Requests with retry-after header
 *
 * Security Note:
 * Rate limiting is applied at the route level (after authentication)
 * to prevent resource exhaustion from repeated authenticated requests.
 */
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const RATE_LIMIT_WINDOW_MS = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Maximum requests per window

const toolRegistryLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests to tool registry. Please try again later.',
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Skip rate limiting for successful OPTIONS requests (CORS preflight)
  skip: (req) => req.method === 'OPTIONS',
});

// Apply rate limiting to all tool registry routes
router.use(toolRegistryLimiter);

/**
 * @route GET /api/tools/registry
 * @description List all registered tools ordered by creation date
 * @access Protected - Requires JWT authentication
 * @returns {Object} JSON response with all tools
 * @example
 * GET /api/tools/registry
 * Authorization: Bearer <jwt-token>
 */
router.get('/registry', AuthMiddleware.authenticate, controller.getAllTools);

/**
 * @route GET /api/tools/registry/:id
 * @description Get specific tool by its unique tool ID
 * @access Protected - Requires JWT authentication
 * @param {string} id - Tool ID (e.g., "form-builder")
 * @returns {Object} JSON response with tool data
 * @example
 * GET /api/tools/registry/form-builder
 * Authorization: Bearer <jwt-token>
 */
router.get('/registry/:id', AuthMiddleware.authenticate, controller.getTool);

/**
 * @route POST /api/tools/register
 * @description Register a new tool in the registry
 * @access Protected - Requires JWT authentication
 * @middleware validateRegistration - Input validation (Story 30.2.3)
 * @body {Object} Tool registration data
 * @returns {Object} JSON response with registered tool data
 * @example
 * POST /api/tools/register
 * Authorization: Bearer <jwt-token>
 * Content-Type: application/json
 * {
 *   "tool_id": "my-tool",
 *   "name": "My Tool",
 *   "version": "1.0.0",
 *   "route": "/tools/my-tool",
 *   "api_base": "/api/tools/my-tool",
 *   "manifest_json": { ... }
 * }
 */
router.post(
  '/register',
  AuthMiddleware.authenticate,
  validateRegistration,
  controller.registerTool
);

/**
 * @route PUT /api/tools/registry/:id
 * @description Update an existing tool registration
 * @access Protected - Requires JWT authentication
 * @middleware validateUpdate - Input validation (Story 30.2.3)
 * @param {string} id - Tool ID
 * @body {Object} Partial tool data to update
 * @returns {Object} JSON response with updated tool data
 * @example
 * PUT /api/tools/registry/form-builder
 * Authorization: Bearer <jwt-token>
 * Content-Type: application/json
 * {
 *   "name": "Updated Tool Name",
 *   "version": "2.0.0"
 * }
 */
router.put(
  '/registry/:id',
  AuthMiddleware.authenticate,
  validateUpdate,
  controller.updateTool
);

/**
 * @route DELETE /api/tools/registry/:id
 * @description Delete a tool registration from the registry
 * @access Protected - Requires JWT authentication
 * @param {string} id - Tool ID
 * @returns {Object} JSON response confirming deletion
 * @example
 * DELETE /api/tools/registry/old-tool
 * Authorization: Bearer <jwt-token>
 */
router.delete(
  '/registry/:id',
  AuthMiddleware.authenticate,
  controller.deleteTool
);

/**
 * @route GET /api/tools/search
 * @description Search tools by name or description
 * @access Protected - Requires JWT authentication
 * @query {string} q - Search query (minimum 2 characters)
 * @returns {Object} JSON response with matching tools
 * @example
 * GET /api/tools/search?q=form
 * Authorization: Bearer <jwt-token>
 */
router.get('/search', AuthMiddleware.authenticate, controller.searchTools);

// Export router with descriptive name
export { router as toolRegistryRoutes };
