import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeng/themes/lara';
import { ConfirmationService } from 'primeng/api';
import { authInterceptor } from './core/auth/auth.interceptor';
import { tenantInterceptor } from './core/interceptors/tenant.interceptor';
import { NGX_MONACO_EDITOR_CONFIG } from 'ngx-monaco-editor-v2';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, tenantInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          darkModeSelector: '.dark',
        },
      },
    }),
    ConfirmationService,
    {
      provide: NGX_MONACO_EDITOR_CONFIG,
      useValue: {
        baseUrl: '/assets/monaco-editor/min',
        defaultOptions: {
          theme: 'vs-light',
          language: 'html',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          minimap: { enabled: false },
          wordWrap: 'on',
        },
      },
    },
  ],
};
