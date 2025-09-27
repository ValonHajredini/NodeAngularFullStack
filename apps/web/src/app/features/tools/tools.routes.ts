import { Routes } from '@angular/router';
import { slugToolGuard } from '../../core/guards/tool.guard';

/**
 * Tools routes configuration.
 * Provides dynamic routing for tools based on their slug.
 * Routes are protected by tool guard to ensure tool is enabled.
 */
export const toolsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/tools-list/tools-list.component').then((m) => m.ToolsListComponent),
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
