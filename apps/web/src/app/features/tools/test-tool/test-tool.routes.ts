import { Routes } from '@angular/router';
import { AuthGuard } from '../../../core/guards/auth.guard';
import { ToolGuard } from '../../../core/guards/tool.guard';

/**
 * Test Tool Routes
 *
 * Lazy-loaded route configuration for Test Tool feature.
 * Protected by AuthGuard and ToolGuard.
 */
export const TESTTOOL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./test-tool.component').then((m) => m.TestToolComponent),
    canActivate: [AuthGuard, ToolGuard],
    data: {
      title: 'Test Tool',
      toolId: 'test-tool',
    },
  },
];
