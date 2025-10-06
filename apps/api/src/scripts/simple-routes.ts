#!/usr/bin/env node
/**
 * Simple route listing script
 * Lists all defined routes with their HTTP methods
 */

console.log('\n' + '='.repeat(120));
console.log('API ROUTES');
console.log('='.repeat(120));
console.log(
  'Method'.padEnd(10) + ' | ' + 'Path'.padEnd(60) + ' | ' + 'Description'
);
console.log('='.repeat(120));

const routes = [
  // Health Routes
  {
    method: 'GET',
    path: '/api/health',
    description: 'Comprehensive health check',
  },
  {
    method: 'GET',
    path: '/api/health/readiness',
    description: 'Kubernetes readiness probe',
  },
  {
    method: 'GET',
    path: '/api/health/liveness',
    description: 'Kubernetes liveness probe',
  },

  // Auth Routes
  {
    method: 'POST',
    path: '/api/v1/auth/register',
    description: 'Register a new user',
  },
  { method: 'POST', path: '/api/v1/auth/login', description: 'User login' },
  {
    method: 'POST',
    path: '/api/v1/auth/refresh',
    description: 'Refresh access token',
  },
  { method: 'POST', path: '/api/v1/auth/logout', description: 'Logout user' },
  {
    method: 'POST',
    path: '/api/v1/auth/logout-all',
    description: 'Logout from all devices',
  },
  {
    method: 'GET',
    path: '/api/v1/auth/profile',
    description: 'Get user profile',
  },
  {
    method: 'PATCH',
    path: '/api/v1/auth/profile',
    description: 'Update user profile',
  },
  {
    method: 'POST',
    path: '/api/v1/auth/password-reset',
    description: 'Request password reset',
  },
  {
    method: 'POST',
    path: '/api/v1/auth/password-reset/confirm',
    description: 'Confirm password reset',
  },
  {
    method: 'GET',
    path: '/api/v1/auth/password-reset/validate/:token',
    description: 'Validate password reset token',
  },
  {
    method: 'GET',
    path: '/api/v1/auth/test-credentials',
    description: 'Get test credentials (dev only)',
  },
  {
    method: 'GET',
    path: '/api/v1/auth/me',
    description: 'Get token information',
  },

  // User Routes
  {
    method: 'GET',
    path: '/api/v1/users',
    description: 'Get paginated list of users (admin)',
  },
  {
    method: 'POST',
    path: '/api/v1/users',
    description: 'Create a new user (admin)',
  },
  { method: 'GET', path: '/api/v1/users/:id', description: 'Get user by ID' },
  {
    method: 'PUT',
    path: '/api/v1/users/:id',
    description: 'Update user (full replacement)',
  },
  {
    method: 'PATCH',
    path: '/api/v1/users/:id',
    description: 'Partially update user',
  },
  {
    method: 'DELETE',
    path: '/api/v1/users/:id',
    description: 'Delete user (soft delete)',
  },
  {
    method: 'POST',
    path: '/api/v1/users/avatar',
    description: 'Upload user avatar',
  },
  {
    method: 'DELETE',
    path: '/api/v1/users/avatar',
    description: 'Delete user avatar',
  },

  // API Token Routes
  {
    method: 'GET',
    path: '/api/v1/tokens',
    description: 'List user API tokens',
  },
  {
    method: 'POST',
    path: '/api/v1/tokens',
    description: 'Create a new API token',
  },
  {
    method: 'GET',
    path: '/api/v1/tokens/:id',
    description: 'Get API token information',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tokens/:id',
    description: 'Update API token metadata',
  },
  {
    method: 'DELETE',
    path: '/api/v1/tokens/:id',
    description: 'Revoke API token',
  },
  {
    method: 'GET',
    path: '/api/v1/tokens/:id/usage',
    description: 'Get token usage history',
  },
  {
    method: 'GET',
    path: '/api/v1/tokens/:id/usage/stats',
    description: 'Get token usage statistics',
  },
  {
    method: 'GET',
    path: '/api/v1/tokens/:id/usage/timeseries',
    description: 'Get token usage time-series data',
  },

  // Short Links Routes
  {
    method: 'POST',
    path: '/api/v1/tools/short-links',
    description: 'Create a new short link',
  },
  {
    method: 'GET',
    path: '/api/v1/tools/short-links',
    description: 'Get user short links',
  },
  {
    method: 'GET',
    path: '/api/v1/tools/short-links/check-availability/:customName',
    description: 'Check custom name availability',
  },
  {
    method: 'GET',
    path: '/api/v1/tools/short-links/:code',
    description: 'Resolve short link',
  },
  {
    method: 'POST',
    path: '/api/v1/tools/short-links/preview',
    description: 'Preview URL',
  },

  // Forms Routes
  { method: 'POST', path: '/api/v1/forms', description: 'Create a new form' },
  { method: 'GET', path: '/api/v1/forms', description: 'Get all forms' },
  { method: 'GET', path: '/api/v1/forms/:id', description: 'Get form by ID' },
  { method: 'PUT', path: '/api/v1/forms/:id', description: 'Update form' },
  { method: 'DELETE', path: '/api/v1/forms/:id', description: 'Delete form' },
  {
    method: 'POST',
    path: '/api/v1/forms/:id/publish',
    description: 'Publish form',
  },
  {
    method: 'GET',
    path: '/api/v1/forms/:id/submissions',
    description: 'Get form submissions',
  },
  {
    method: 'GET',
    path: '/api/v1/forms/:id/analytics',
    description: 'Get form analytics',
  },

  // Public Forms Routes
  {
    method: 'GET',
    path: '/api/v1/public/forms/render/:token',
    description: 'Get form schema for public rendering',
  },
  {
    method: 'POST',
    path: '/api/v1/public/forms/submit/:token',
    description: 'Submit form data',
  },

  // Drawing Projects Routes
  {
    method: 'POST',
    path: '/api/v1/drawing-projects',
    description: 'Create drawing project',
  },
  {
    method: 'GET',
    path: '/api/v1/drawing-projects',
    description: 'List user drawing projects',
  },
  {
    method: 'GET',
    path: '/api/v1/drawing-projects/:id',
    description: 'Get drawing project by ID',
  },
  {
    method: 'PUT',
    path: '/api/v1/drawing-projects/:id',
    description: 'Update drawing project',
  },
  {
    method: 'DELETE',
    path: '/api/v1/drawing-projects/:id',
    description: 'Delete drawing project',
  },
  {
    method: 'POST',
    path: '/api/v1/drawing-projects/:id/fork',
    description: 'Fork drawing project',
  },

  // Admin Tools Routes
  {
    method: 'GET',
    path: '/api/v1/admin/tools',
    description: 'Get all tools (super admin)',
  },
  {
    method: 'POST',
    path: '/api/v1/admin/tools',
    description: 'Create a new tool (super admin)',
  },
  {
    method: 'GET',
    path: '/api/v1/admin/tools/:key',
    description: 'Get tool by key',
  },
  {
    method: 'PATCH',
    path: '/api/v1/admin/tools/:key',
    description: 'Update tool status',
  },
  {
    method: 'DELETE',
    path: '/api/v1/admin/tools/:key',
    description: 'Delete tool',
  },
  {
    method: 'GET',
    path: '/api/v1/admin/tools/:key/configs',
    description: 'Get tool configurations',
  },
  {
    method: 'GET',
    path: '/api/v1/admin/tools/:key/configs/active',
    description: 'Get active config',
  },
  {
    method: 'POST',
    path: '/api/v1/admin/tools/:key/configs',
    description: 'Create tool config',
  },
  {
    method: 'PUT',
    path: '/api/v1/admin/tools/:key/configs/:id',
    description: 'Update tool config',
  },
  {
    method: 'POST',
    path: '/api/v1/admin/tools/:key/configs/:id/activate',
    description: 'Activate tool config',
  },
  {
    method: 'DELETE',
    path: '/api/v1/admin/tools/:key/configs/:id',
    description: 'Delete tool config',
  },

  // Public Tools Routes
  {
    method: 'GET',
    path: '/api/v1/tools',
    description: 'Get public tools list',
  },
  {
    method: 'GET',
    path: '/api/v1/tools/:key',
    description: 'Get tool status by key',
  },
  {
    method: 'GET',
    path: '/api/v1/tools/slug/:slug',
    description: 'Get tool by slug',
  },
];

// Group routes by prefix
const grouped: Record<string, typeof routes> = {};
routes.forEach((route) => {
  let group = 'Other';
  if (route.path.includes('/auth')) group = 'Authentication';
  else if (route.path.includes('/users')) group = 'Users';
  else if (route.path.includes('/tokens')) group = 'API Tokens';
  else if (route.path.includes('/short-links')) group = 'Short Links';
  else if (route.path.includes('/forms') && !route.path.includes('/public'))
    group = 'Forms';
  else if (route.path.includes('/public/forms')) group = 'Public Forms';
  else if (route.path.includes('/drawing-projects')) group = 'Drawing Projects';
  else if (route.path.includes('/admin/tools')) group = 'Admin Tools';
  else if (route.path.includes('/tools') && !route.path.includes('/admin'))
    group = 'Public Tools';
  else if (route.path.includes('/health')) group = 'Health';

  if (!grouped[group]) grouped[group] = [];
  grouped[group].push(route);
});

// Print grouped routes
const methodColors: Record<string, string> = {
  GET: '\x1b[32m', // Green
  POST: '\x1b[36m', // Cyan
  PUT: '\x1b[33m', // Yellow
  PATCH: '\x1b[35m', // Magenta
  DELETE: '\x1b[31m', // Red
};
const reset = '\x1b[0m';

Object.keys(grouped)
  .sort()
  .forEach((group) => {
    console.log(`\n${group}:`);
    grouped[group].forEach((route) => {
      const color = methodColors[route.method] || '';
      const method = color + route.method.padEnd(10) + reset;
      const path = route.path.padEnd(60);
      console.log(`${method} | ${path} | ${route.description}`);
    });
  });

console.log('\n' + '='.repeat(120));
console.log(`Total routes: ${routes.length}\n`);
