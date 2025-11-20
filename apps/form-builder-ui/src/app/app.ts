import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { AuthService } from './core/auth/auth.service';
// REMOVED: ToolsService not needed in form-builder-ui (tools management is in dashboard-api)
// import { ToolsService } from './core/services/tools.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmDialog],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class App implements OnInit {
  readonly title = signal('web');
  currentUrl = '';

  // REMOVED: ToolsService not needed - form-builder-ui only handles forms
  // private readonly toolsService = inject(ToolsService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  constructor() {
    this.currentUrl = this.router.url;
  }

  ngOnInit(): void {
    // Fetch fresh user profile data from API when app loads
    // This ensures user data (name, avatar, role, etc.) is always up-to-date
    if (this.authService.isAuthenticated()) {
      console.log('[App] Fetching fresh user profile on app initialization...');
      this.authService.loadUserProfile().subscribe({
        next: (user) => {
          console.log('[App] User profile loaded successfully:', user.firstName, user.lastName);
        },
        error: (error) => {
          console.error('[App] Failed to load user profile on initialization:', error);
          // Error handling is done in AuthService (clears auth on 401)
        },
      });
    }
  }

  // REMOVED: Tools cache initialization - not needed in form-builder-ui
  // The form-builder-ui is focused on form building, not tools management
  // Tools API (/api/v1/tools) is served by dashboard-api for the main dashboard app
}
