import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '@core/guards/auth.guard';

/**
 * Admin feature routes for super admin functionality.
 * All routes require authentication and admin role.
 */
export const adminRoutes: Routes = [
  {
    path: '',
    redirectTo: 'tools',
    pathMatch: 'full',
  },
  {
    path: 'tools',
    loadComponent: () =>
      import('./pages/tools-settings/tools-settings.page').then((m) => m.ToolsSettingsPage),
    canActivate: [authGuard, roleGuard(['admin'])],
    data: {
      title: 'Tools Management!!',
      description: 'Manage system-wide tools and their availability',
    },
  },
  {
    path: 'tools/create',
    loadComponent: () =>
      import('./tools/create-tool-wizard/create-tool-wizard.component').then(
        (m) => m.CreateToolWizardComponent,
      ),
    canActivate: [authGuard, roleGuard(['admin'])],
    data: {
      title: 'Create New Tool',
      description: 'Register a new tool using the guided wizard',
    },
  },
  {
    path: 'themes',
    loadComponent: () =>
      import('./pages/theme-management/theme-management.component').then(
        (m) => m.ThemeManagementComponent,
      ),
    canActivate: [authGuard, roleGuard(['admin'])],
    data: {
      title: 'Theme Management',
      description: 'Manage form themes, export configurations, and import designs',
    },
  },
  {
    path: 'themes/designer',
    loadComponent: () =>
      import('./pages/theme-designer/theme-designer.component').then(
        (m) => m.ThemeDesignerComponent,
      ),
    canActivate: [authGuard, roleGuard(['admin'])],
    data: {
      title: 'Theme Designer',
      description: 'Create and customize form themes with real-time preview',
    },
  },
];

export default adminRoutes;
