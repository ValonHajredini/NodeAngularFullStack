import { Routes } from '@angular/router';
import { authGuard, userGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Debug route for testing
  {
    path: 'debug',
    loadComponent: () => import('./test-debug.component').then((m) => m.TestDebugComponent),
  },
  {
    path: 'auth-debug',
    loadComponent: () => import('./auth-debug.component').then((m) => m.AuthDebugComponent),
  },

  // Public landing page
  {
    path: 'welcome',
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },

  // Public form preview (no authentication required)
  {
    path: 'forms/preview/:previewId',
    loadComponent: () =>
      import('./features/public/form-renderer/form-renderer.component').then(
        (m) => m.FormRendererComponent,
      ),
  },

  // Public form renderer (no authentication required)
  {
    path: 'forms/render/:token',
    loadComponent: () =>
      import('./features/public/form-renderer/form-renderer.component').then(
        (m) => m.FormRendererComponent,
      ),
  },

  // Public form renderer via short code (no authentication required)
  {
    path: 'public/form/:shortCode',
    loadComponent: () =>
      import('./features/public/form-renderer/form-renderer.component').then(
        (m) => m.FormRendererComponent,
      ),
  },

  // Authentication routes (no layout)
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'auth/password-reset',
    loadComponent: () =>
      import('./features/auth/password-reset/password-reset-request.component').then(
        (m) => m.PasswordResetRequestComponent,
      ),
  },
  {
    path: 'auth/password-reset-confirm/:token',
    loadComponent: () =>
      import('./features/auth/password-reset/password-reset-confirm.component').then(
        (m) => m.PasswordResetConfirmComponent,
      ),
  },

  // Protected routes with main layout
  {
    path: 'app',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.dashboardRoutes),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.settingsRoutes),
      },
      {
        path: 'tools',
        loadChildren: () => import('./features/tools/tools.routes').then((m) => m.toolsRoutes),
      },
      {
        path: 'documentation',
        loadComponent: () =>
          import('./features/documentation/documentation.component').then(
            (m) => m.DocumentationComponent,
          ),
      },
      {
        path: 'admin',
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
        canActivate: [authGuard, roleGuard(['admin'])],
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/welcome',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/welcome',
  },
];
