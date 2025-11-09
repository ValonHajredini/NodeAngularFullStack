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
    path: 'templates',
    loadComponent: () =>
      import('./pages/template-management/template-management.page').then(
        (m) => m.TemplateManagementPage,
      ),
    canActivate: [authGuard, roleGuard(['admin'])],
    data: {
      title: 'Template Management',
      description: 'Manage form templates for all users',
    },
  },
];

export default adminRoutes;
