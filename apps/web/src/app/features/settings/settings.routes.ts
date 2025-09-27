import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '@core/guards/auth.guard';

/**
 * Settings feature routes with URL-based navigation.
 * Each settings tab has its own route for better UX and bookmarking.
 */
export const settingsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./settings.component').then((m) => m.SettingsComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'general',
        loadComponent: () =>
          import('./components/general-settings/general-settings.component').then(
            (m) => m.GeneralSettingsComponent,
          ),
        data: {
          title: 'General Settings',
          description: 'Basic preferences and account information',
        },
      },
      {
        path: 'security',
        loadComponent: () =>
          import('./components/security-settings/security-settings.component').then(
            (m) => m.SecuritySettingsComponent,
          ),
        data: {
          title: 'Security Settings',
          description: 'Password and authentication settings',
        },
      },
      {
        path: 'api-tokens',
        loadComponent: () =>
          import('./components/api-tokens-settings/api-tokens-settings.component').then(
            (m) => m.ApiTokensSettingsComponent,
          ),
        data: {
          title: 'API Tokens',
          description: 'Manage API access tokens and authentication',
        },
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./components/notifications-settings/notifications-settings.component').then(
            (m) => m.NotificationsSettingsComponent,
          ),
        data: {
          title: 'Notifications',
          description: 'Email, push, and in-app notification preferences',
        },
      },
      {
        path: 'appearance',
        loadComponent: () =>
          import('./components/appearance-settings/appearance-settings.component').then(
            (m) => m.AppearanceSettingsComponent,
          ),
        data: {
          title: 'Appearance',
          description: 'Theme, layout, and display preferences',
        },
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./components/privacy-settings/privacy-settings.component').then(
            (m) => m.PrivacySettingsComponent,
          ),
        data: {
          title: 'Privacy Settings',
          description: 'Data collection and profile visibility settings',
        },
      },
      {
        path: 'advanced',
        loadComponent: () =>
          import('./components/advanced-settings/advanced-settings.component').then(
            (m) => m.AdvancedSettingsComponent,
          ),
        data: {
          title: 'Advanced Settings',
          description: 'Data export, account deletion, and advanced options',
        },
      },
      {
        path: 'administration',
        loadComponent: () =>
          import('../admin/pages/tools-settings/tools-settings.page').then(
            (m) => m.ToolsSettingsPage,
          ),
        canActivate: [roleGuard(['admin'])],
        data: {
          title: 'Administration',
          description: 'Tools management and system settings',
        },
      },
      {
        path: '',
        redirectTo: 'general',
        pathMatch: 'full',
      },
    ],
  },
];

export default settingsRoutes;
