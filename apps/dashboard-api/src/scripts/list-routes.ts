#!/usr/bin/env node
/**
 * List all API routes
 * Similar to Laravel's `php artisan route:list`
 *
 * Usage:
 *   npm run routes              - Display all routes in table format
 *   npm run routes -- --json    - Display routes as JSON
 *   npm run routes -- --method=GET - Filter by HTTP method
 *   npm run routes -- --path=tools - Filter by path pattern
 */

import dotenv from 'dotenv';
import express from 'express';
import { createRouteList } from '../utils/route-list';

// Load environment variables
dotenv.config();

// Import routes
import healthRoutes from '../routes/health.routes';
import authRoutes from '../routes/auth.routes';
import { usersRoutes } from '../routes/users.routes';
import tokensRoutes from '../routes/tokens.routes';
import shortLinksRoutes from '../routes/short-links.routes';
import { formsRoutes } from '../routes/forms.routes';
import { publicFormsRoutes } from '../routes/public-forms.routes';
import drawingProjectsRoutes from '../routes/drawing-projects.routes';
import toolsRoutes from '../routes/tools.routes';
import publicToolsRoutes from '../routes/public-tools.routes';

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const flags = {
      json: args.includes('--json'),
      method: args.find((arg) => arg.startsWith('--method='))?.split('=')[1],
      path: args.find((arg) => arg.startsWith('--path='))?.split('=')[1],
    };

    // Create minimal Express app with routes (no middleware)
    const app = express();

    // Register routes (matching server.ts route registration)
    app.use('/api', healthRoutes);
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/users', usersRoutes);
    app.use('/api/v1/tokens', tokensRoutes);
    app.use('/api/v1/tools/short-links', shortLinksRoutes);
    app.use('/api/v1/forms', formsRoutes);
    app.use('/api/v1/public/forms', publicFormsRoutes);
    app.use('/api/v1/drawing-projects', drawingProjectsRoutes);
    app.use('/api/v1/admin/tools', toolsRoutes);
    app.use('/api/v1/tools', publicToolsRoutes);

    // Create route list utility
    const routeList = createRouteList(app);

    // Apply filters if provided
    let routes = routeList.extract();

    // Debug: Show extraction issue
    const router = (app as any)._router;
    if (router && routes.length === 0) {
      console.log('\n🐛 Debug: No routes extracted. Checking first layer...');
      const firstLayer = router.stack[0];
      if (firstLayer) {
        console.log(
          `  - path property: "${firstLayer.path}" (type: ${typeof firstLayer.path})`
        );
        console.log(`  - Has handle: ${firstLayer.handle ? 'yes' : 'no'}`);
        console.log(
          `  - Has handle.stack: ${firstLayer.handle?.stack ? 'yes' : 'no'}`
        );
        if (firstLayer.handle?.stack) {
          const nestedRoute = firstLayer.handle.stack.find((l: any) => l.route);
          if (nestedRoute) {
            console.log(`  - Nested route found: ${nestedRoute.route.path}`);
            console.log(
              `  - Route methods: ${Object.keys(nestedRoute.route.methods)}`
            );
          }
        }
      }
    }

    if (flags.method) {
      routes = routeList.filterByMethod(flags.method);
      console.log(`\nFiltering by method: ${flags.method.toUpperCase()}`);
    }

    if (flags.path) {
      routes = routeList.filterByPath(flags.path);
      console.log(`\nFiltering by path: ${flags.path}`);
    }

    // Display routes
    if (flags.json) {
      console.log(JSON.stringify(routes, null, 2));
    } else {
      // Manually create filtered display
      if (flags.method || flags.path) {
        console.log('\n' + '='.repeat(120));
        console.log('FILTERED ROUTES');
        console.log('='.repeat(120));

        routes.forEach((route) => {
          console.log(
            `${route.method.padEnd(8)} | ${route.path.padEnd(50)} | ${route.middleware.join(', ').padEnd(30)} | ${route.handler}`
          );
        });

        console.log('='.repeat(120));
        console.log(`Total routes: ${routes.length}\n`);
      } else {
        routeList.display();
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error listing routes:', error);
    process.exit(1);
  }
}

main();
