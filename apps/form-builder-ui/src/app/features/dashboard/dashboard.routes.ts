import { Routes } from '@angular/router';
import {unsavedChangesGuard} from '@core/guards/unsaved-changes.guard';
// import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

/**
 * Dashboard routes configuration.
 * Main routes for dashboard (form builder).
 */
export const dashboardRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./forms-list/forms-list.component').then((m) => m.FormsListComponent),
  },
  {
    path: 'list',
    loadComponent: () =>
      import('./forms-list/forms-list.component').then((m) => m.FormsListComponent),
  },
  {
    path: ':id/analytics',
    loadComponent: () =>
      import('./form-analytics/form-analytics.component').then((m) => m.FormAnalyticsComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./form-builder.component').then((m) => m.FormBuilderComponent),
    canDeactivate: [unsavedChangesGuard],
  },
];

