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
      title: 'Tools Management',
      description: 'Manage system-wide tools and their availability',
    },
  },
];

export default adminRoutes;
