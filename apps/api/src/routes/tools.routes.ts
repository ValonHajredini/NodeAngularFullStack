import { Router } from 'express';
import { toolsController } from '../controllers/tools.controller';
import { toolConfigsController } from '../controllers/tool-configs.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import {
  auditToolCreate,
  auditToolUpdate,
  auditToolDelete,
} from '../middleware/audit.middleware';
import {
  toolKeyValidator,
  createToolValidator,
  updateToolStatusValidator,
  sanitizeToolInput,
  xssProtection,
} from '../validators/tools.validator';
import {
  validateGetConfigs,
  validateGetActiveConfig,
  validateCreateConfig,
  validateUpdateConfig,
  validateActivateConfig,
  validateDeleteConfig,
} from '../validators/tool-config.validator';

/**
 * Tools routes configuration.
 * Defines all endpoints for tools management with proper validation and middleware.
 * All routes require super admin authentication.
 */
const router = Router();

/**
 * Apply authentication middleware to all routes.
 * Only authenticated super admin users can access tools management.
 */
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireSuperAdmin);

/**
 * Apply XSS protection to all routes.
 */
router.use(xssProtection);

/**
 * @route GET /api/admin/tools
 * @description Retrieve all tools in the registry
 * @access Super Admin only
 * @headers ETag - Cache validation
 * @headers Cache-Control - Cache policy
 * @response 200 - Tools list with ETag header
 * @response 304 - Not Modified (cached response)
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 500 - Internal server error
 */
router.get('/', toolsController.getTools);

/**
 * @route GET /api/admin/tools/active
 * @description Retrieve only active tools
 * @access Super Admin only
 * @response 200 - Active tools list
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 500 - Internal server error
 */
router.get('/active', toolsController.getActiveTools);

/**
 * @route GET /api/admin/tools/validate-key/:key
 * @description Validate if a tool key is available
 * @access Super Admin only
 * @param key - Tool key to validate (kebab-case)
 * @response 200 - Key validation result
 * @response 400 - Invalid tool key format
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 500 - Internal server error
 */
router.get(
  '/validate-key/:key',
  toolKeyValidator,
  toolsController.validateToolKey
);

/**
 * @route GET /api/admin/tools/check-component/:slug
 * @description Check if a component exists for the given slug
 * @access Super Admin only
 * @param slug - Component slug to check (kebab-case)
 * @response 200 - Component existence check with metadata
 * @response 400 - Invalid slug format
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 500 - Internal server error
 */
router.get('/check-component/:slug', toolsController.checkComponent);

/**
 * @route GET /api/admin/tools/slug/:slug
 * @description Retrieve a specific tool by slug
 * @access Super Admin only
 * @param slug - Tool slug (URL-friendly identifier)
 * @response 200 - Tool data
 * @response 400 - Invalid tool slug
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 404 - Tool not found
 * @response 500 - Internal server error
 */
router.get('/slug/:slug', toolsController.getToolBySlug);

// ========================================
// Tool Configuration Routes (must be before /:key route)
// ========================================

/**
 * @route GET /api/admin/tools/:toolKey/configs
 * @description Retrieve all configurations for a specific tool
 * @access Super Admin only
 * @param toolKey - Tool key (kebab-case)
 * @response 200 - List of configurations with active config
 * @response 400 - Invalid tool key
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 404 - Tool not found
 * @response 500 - Internal server error
 */
router.get(
  '/:toolKey/configs',
  validateGetConfigs(),
  toolConfigsController.getConfigs
);

/**
 * @route GET /api/admin/tools/:toolKey/configs/active
 * @description Retrieve the active configuration for a specific tool
 * @access Super Admin only
 * @param toolKey - Tool key (kebab-case)
 * @response 200 - Active configuration
 * @response 400 - Invalid tool key
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 404 - Tool or config not found
 * @response 500 - Internal server error
 */
router.get(
  '/:toolKey/configs/active',
  validateGetActiveConfig(),
  toolConfigsController.getActiveConfig
);

/**
 * @route POST /api/admin/tools/:toolKey/configs
 * @description Create a new configuration for a tool
 * @access Super Admin only
 * @param toolKey - Tool key (kebab-case)
 * @body CreateToolConfigRequest - Configuration data
 * @response 201 - Created configuration
 * @response 400 - Invalid input data or version already exists
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 404 - Tool not found
 * @response 500 - Internal server error
 */
router.post(
  '/:toolKey/configs',
  validateCreateConfig(),
  toolConfigsController.createConfig
);

/**
 * @route PUT /api/admin/tools/:toolKey/configs/:configId
 * @description Update an existing tool configuration
 * @access Super Admin only
 * @param toolKey - Tool key (kebab-case)
 * @param configId - Configuration ID (UUID)
 * @body UpdateToolConfigRequest - Configuration update data
 * @response 200 - Updated configuration
 * @response 400 - Invalid input data or version already exists
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 404 - Tool or config not found
 * @response 500 - Internal server error
 */
router.put(
  '/:toolKey/configs/:configId',
  validateUpdateConfig(),
  toolConfigsController.updateConfig
);

/**
 * @route PUT /api/admin/tools/:toolKey/configs/:configId/activate
 * @description Set a configuration as active
 * @access Super Admin only
 * @param toolKey - Tool key (kebab-case)
 * @param configId - Configuration ID (UUID)
 * @response 200 - Activated configuration
 * @response 400 - Invalid tool key or config ID
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 404 - Tool or config not found
 * @response 500 - Internal server error
 */
router.put(
  '/:toolKey/configs/:configId/activate',
  validateActivateConfig(),
  toolConfigsController.activateConfig
);

/**
 * @route DELETE /api/admin/tools/:toolKey/configs/:configId
 * @description Delete a tool configuration
 * @access Super Admin only
 * @param toolKey - Tool key (kebab-case)
 * @param configId - Configuration ID (UUID)
 * @response 200 - Deletion confirmation
 * @response 400 - Invalid tool key, config ID, or cannot delete active config
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 404 - Tool or config not found
 * @response 500 - Internal server error
 */
router.delete(
  '/:toolKey/configs/:configId',
  validateDeleteConfig(),
  toolConfigsController.deleteConfig
);

/**
 * @route GET /api/admin/tools/:key
 * @description Retrieve a specific tool by key
 * @access Super Admin only
 * @param key - Tool key (kebab-case)
 * @response 200 - Tool data
 * @response 400 - Invalid tool key
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 404 - Tool not found
 * @response 500 - Internal server error
 */
router.get('/:key', toolKeyValidator, toolsController.getToolByKey);

/**
 * @route POST /api/admin/tools
 * @description Create a new tool
 * @access Super Admin only
 * @body CreateToolRequest - Tool creation data
 * @response 201 - Created tool data
 * @response 400 - Invalid input data
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 409 - Tool key already exists
 * @response 500 - Internal server error
 */
router.post(
  '/',
  sanitizeToolInput,
  createToolValidator,
  auditToolCreate,
  toolsController.createTool
);

/**
 * @route PATCH /api/admin/tools/:key
 * @description Update tool status (enable/disable)
 * @access Super Admin only
 * @param key - Tool key (kebab-case)
 * @body UpdateToolStatusRequest - Status update data
 * @response 200 - Updated tool data
 * @response 400 - Invalid input data
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 404 - Tool not found
 * @response 500 - Internal server error
 */
router.patch(
  '/:key',
  toolKeyValidator,
  sanitizeToolInput,
  updateToolStatusValidator,
  auditToolUpdate,
  toolsController.updateToolStatus
);

/**
 * @route POST /api/admin/tools/:key/generate-component
 * @description Generate component files for a tool
 * @access Super Admin only
 * @param key - Tool key (kebab-case)
 * @body ComponentGenerationRequest - Component generation configuration
 * @response 201 - Component generation results
 * @response 400 - Invalid input data or generation failed
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 404 - Tool not found
 * @response 500 - Internal server error
 */
// Temporarily disabled - generateComponent method removed
// router.post(
//   '/:key/generate-component',
//   toolKeyValidator,
//   sanitizeToolInput,
//   toolsController.generateComponent
// );

/**
 * @route DELETE /api/admin/tools/:key
 * @description Delete a tool from the registry
 * @access Super Admin only
 * @param key - Tool key (kebab-case)
 * @response 200 - Deletion confirmation
 * @response 400 - Invalid tool key
 * @response 401 - Authentication required
 * @response 403 - Super admin access required
 * @response 404 - Tool not found
 * @response 500 - Internal server error
 */
router.delete(
  '/:key',
  toolKeyValidator,
  auditToolDelete,
  toolsController.deleteTool
);

export default router;
