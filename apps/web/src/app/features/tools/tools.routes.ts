import { Routes } from '@angular/router';
import { slugToolGuard, toolIdGuard } from '../../core/guards/tool.guard';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

/**
 * Tools routes configuration.
 * Provides dynamic routing for tools based on their slug or toolId.
 * Routes are protected by tool guard to ensure tool is enabled.
 */
export const toolsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/tools-list/tools-list.component').then((m) => m.ToolsListComponent),
  },
  {
    path: 'detail/:toolId',
    loadComponent: () =>
      import('./pages/tool-detail/tool-detail.component').then((m) => m.ToolDetailComponent),
    canActivate: [toolIdGuard],
    data: {
      title: 'Tool Detail',
    },
  },
  {
    path: 'form-builder/list',
    loadComponent: () =>
      import('./components/form-builder/forms-list/forms-list.component').then(
        (m) => m.FormsListComponent,
      ),
  },
  {
    path: 'form-builder/:id/analytics',
    loadComponent: () =>
      import('./components/form-builder/form-analytics/form-analytics.component').then(
        (m) => m.FormAnalyticsComponent,
      ),
    canActivate: [slugToolGuard],
    data: {
      checkToolBySlug: false,
      toolId: 'form-builder',
    },
  },
  {
    path: 'form-builder/:id',
    loadComponent: () =>
      import('./components/form-builder/form-builder.component').then(
        (m) => m.FormBuilderComponent,
      ),
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'form-builder',
    redirectTo: 'form-builder/list',
    pathMatch: 'full',
  },
  {
    path: 'export-history',
    loadComponent: () =>
      import('./pages/export-history/export-history.component').then(
        (m) => m.ExportHistoryComponent,
      ),
    data: {
      title: 'Export History',
      description: 'View and manage export jobs',
    },
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./components/tool-container/tool-container.component').then(
        (m) => m.ToolContainerComponent,
      ),
    canActivate: [slugToolGuard],
    data: {
      // This allows the tool guard to know which tool to check
      checkToolBySlug: true,
    },
  },
  {
    path: '**',
    redirectTo: '',
  },
];
