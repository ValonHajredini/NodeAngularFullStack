import { Route } from '@angular/router';
import { authGuard } from '../../../core/guards/auth.guard';
import { toolGuard } from '../../../core/guards/tool.guard';

/**
 * Test Tool Routes
 *
 * Lazy-loaded route configuration for Test Tool tool.
 * Uses standalone component with lazy loading for optimal bundle size.
 *
 * **Guards:**
 * - authGuard: Ensures user is authenticated
 * - toolGuard: Validates tool permissions
 *
 * **Integration:**
 * Add these routes to your application routing:
 *
 * ```typescript
 * // In apps/web/src/app/app.routes.ts
 * import { testToolRoutes } from './features/tools/test-tool/test-tool.routes';
 *
 * export const routes: Routes = [
 *   // ... other routes
 *   ...testToolRoutes, // Add Test Tool routes
 * ];
 * ```
 *
 * **Route URL:** `/tools/test-tool`
 *
 * @module test-tool.routes
 */
export const testToolRoutes: Route[] = [
  {
    path: 'tools/test-tool',
    loadComponent: () => import('./test-tool.component').then((m) => m.TestToolComponent),
    canActivate: [authGuard, toolGuard],
    data: {
      /** Page title for browser tab */
      title: 'Test Tool',
      /** Tool identifier for permission checks */
      toolId: 'test-tool',
      /** Required permissions for access */
      permissions: ['user'],
      /** PrimeNG icon for navigation */
      icon: 'pi-box',
      /** Breadcrumb label */
      breadcrumb: 'Test Tool',
    },
  },
];
