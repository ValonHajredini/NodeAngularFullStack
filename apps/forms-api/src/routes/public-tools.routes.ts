import { Router } from 'express';
import { publicToolsController } from '../controllers/public-tools.controller';

/**
 * Public tools routes configuration.
 * Provides public endpoints for checking tool availability status.
 * No authentication required - used by frontend for feature gating.
 */
const router = Router();

/**
 * @route GET /api/v1/tools
 * @description Retrieve public tool status information for feature gating
 * @access Public (no authentication required)
 * @headers Cache-Control - Cache policy
 * @response 200 - Tool status list (enabled tools only)
 * @response 500 - Internal server error
 */
router.get('/', publicToolsController.getPublicTools);

/**
 * @route GET /api/v1/tools/slug/:slug
 * @description Get tool information by slug for dynamic routing
 * @access Public (no authentication required)
 * @param slug - Tool slug (URL-friendly identifier)
 * @response 200 - Tool information
 * @response 404 - Tool not found or disabled
 * @response 500 - Internal server error
 */
router.get('/slug/:slug', publicToolsController.getPublicToolBySlug);

/**
 * @route GET /api/v1/tools/:key
 * @description Check if a specific tool is enabled
 * @access Public (no authentication required)
 * @param key - Tool key (kebab-case)
 * @response 200 - Tool status information
 * @response 404 - Tool not found or disabled
 * @response 500 - Internal server error
 */
router.get('/:key', publicToolsController.getPublicToolStatus);

export default router;
