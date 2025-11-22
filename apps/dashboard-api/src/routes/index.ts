/**
 * Routes index file
 * Centralized export point for all route modules
 */

import authRoutes from './auth.routes';
import healthRoutes from './health.routes';
import tokenRoutes from './tokens.routes';
import toolsRoutes from './tools.routes';
import publicToolsRoutes from './public-tools.routes';
export { usersRoutes } from './users.routes';

// Re-export default imports as named exports for consistency
export { authRoutes, healthRoutes, tokenRoutes, toolsRoutes, publicToolsRoutes };
