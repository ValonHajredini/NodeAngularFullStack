import { Router } from 'express';
import { toolsController } from '../controllers/tools.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

/**
 * Public tools routes configuration.
 * Defines endpoints for tools listing accessible to all authenticated users.
 * Regular users can view available tools but cannot manage them.
 */
const router = Router();

/**
 * Apply authentication middleware to all routes.
 * Only authenticated users can access tools listing.
 */
router.use(AuthMiddleware.authenticate);

/**
 * @route GET /api/v1/tools
 * @description Retrieve all active tools available to the user
 * @access Authenticated users
 * @response 200 - Active tools list
 * @response 401 - Authentication required
 * @response 500 - Internal server error
 */
router.get('/', toolsController.getActiveTools);

export default router;
