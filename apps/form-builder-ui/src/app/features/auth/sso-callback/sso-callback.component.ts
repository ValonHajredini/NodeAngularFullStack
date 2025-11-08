import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '@env/environment';

/**
 * SSO Callback Component - Intermediate page for processing SSO authentication.
 *
 * This component:
 * 1. Receives the SSO token from URL query parameter
 * 2. Validates and processes the token
 * 3. Redirects to the intended destination WITHOUT token in URL
 *
 * This prevents security issues with tokens being visible in the browser URL bar.
 */
@Component({
  selector: 'app-sso-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Authenticating...</h2>
        <p class="text-gray-600">{{ statusMessage }}</p>

        @if (errorMessage) {
          <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-md max-w-md mx-auto">
            <p class="text-red-800 text-sm">{{ errorMessage }}</p>
            <button
              (click)="redirectToLogin()"
              class="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Return to Login
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100vh;
    }
  `]
})
export class SsoCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  statusMessage = 'Processing authentication...';
  errorMessage = '';

  ngOnInit(): void {
    this.processAuthentication();
  }

  private processAuthentication(): void {
    // Get token from URL query parameter
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.errorMessage = 'No authentication token provided';
      console.error('SSO callback: No token in URL');
      setTimeout(() => this.redirectToLogin(), 2000);
      return;
    }

    try {
      // Validate token structure and expiration
      const isValid = this.validateJwtToken(token);

      if (!isValid) {
        this.errorMessage = 'Invalid or expired authentication token';
        console.error('SSO callback: Token validation failed');
        setTimeout(() => this.redirectToLogin(), 2000);
        return;
      }

      // Extract user data from token payload
      const payload = this.decodeJwtPayload(token);

      // Store tenant context if available (for multi-tenancy)
      if (payload.tenant) {
        localStorage.setItem('tenant_context', JSON.stringify(payload.tenant));
      }

      // Update auth service with user data and token
      this.authService.setSsoAuthData({
        user: {
          id: payload.userId,
          email: payload.email,
          firstName: payload.firstName || '',
          lastName: payload.lastName || '',
          role: payload.role as 'admin' | 'user' | 'readonly',
          tenantId: payload.tenantId || payload.tenant?.id,
          avatarUrl: payload.avatarUrl,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        accessToken: token,
        refreshToken: '' // Will need to fetch refresh token separately if needed
      });

      this.statusMessage = 'Authentication successful! Redirecting...';

      // Get the intended destination from query params or default to dashboard
      const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') || '/app/dashboard';

      // Redirect to destination WITHOUT token in URL (clean URL)
      setTimeout(() => {
        this.router.navigate([redirectTo], {
          replaceUrl: true // Replace history entry to prevent back button showing token
        });
      }, 500); // Small delay to show success message

    } catch (error) {
      this.errorMessage = 'Authentication processing failed';
      console.error('SSO callback: Authentication error:', error);
      setTimeout(() => this.redirectToLogin(), 2000);
    }
  }

  /**
   * Validates JWT token structure and expiration.
   */
  private validateJwtToken(token: string): boolean {
    try {
      // Check token format (should have 3 parts separated by dots)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      // Decode and parse payload
      const payload = JSON.parse(atob(parts[1]));

      // Check if token has required fields
      if (!payload.userId || !payload.email || !payload.exp) {
        return false;
      }

      // Check expiration (with 30 second buffer)
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const buffer = 30000; // 30 seconds buffer

      if (currentTime >= expirationTime - buffer) {
        console.warn('Token is expired or about to expire');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  /**
   * Decodes JWT token payload.
   */
  private decodeJwtPayload(token: string): any {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  }

  /**
   * Redirects to main app login page.
   */
  redirectToLogin(): void {
    window.location.href = `${environment.mainAppUrl}/auth/login`;
  }
}
