import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { environment } from '@env/environment';

/**
 * Service for handling SSO navigation to external Angular applications.
 *
 * Provides methods to securely navigate users to other applications
 * in the ecosystem while passing authentication tokens via URL.
 */
@Injectable({
  providedIn: 'root',
})
export class SsoNavigationService {
  private readonly authService = inject(AuthService);

  /**
   * Configuration for external application URLs.
   * In production, these should come from environment config.
   */
  private readonly appUrls = {
    formBuilder: environment.formBuilderUrl || 'http://localhost:4201',
    // Add other app URLs as needed
  };

  /**
   * Opens the Form Builder application with SSO authentication.
   *
   * @param route - Optional route path within form-builder-ui (default: '/app/dashboard')
   * @param openInNewTab - Whether to open in new tab (default: true)
   * @returns Promise that resolves when navigation is complete
   *
   * @example
   * // Open form builder dashboard in new tab
   * ssoNavigationService.openFormBuilder();
   *
   * @example
   * // Navigate to specific form in same window
   * ssoNavigationService.openFormBuilder('/forms/123', false);
   */
  async openFormBuilder(
    route: string = '/app/dashboard',
    openInNewTab: boolean = true,
  ): Promise<void> {
    return this.navigateWithSso(this.appUrls.formBuilder, route, openInNewTab);
  }

  /**
   * Generic method to navigate to any external app with SSO token.
   *
   * @param baseUrl - Base URL of the target application
   * @param route - Route path within the target app
   * @param openInNewTab - Whether to open in new tab
   * @returns Promise that resolves when navigation is complete
   *
   * @example
   * // Navigate to custom app
   * ssoNavigationService.navigateWithSso(
   *   'http://localhost:4202',
   *   '/workflows',
   *   true
   * );
   */
  async navigateWithSso(
    baseUrl: string,
    route: string = '/',
    openInNewTab: boolean = true,
  ): Promise<void> {
    // Get current user's access token
    const token = this.authService.getAccessToken();

    if (!token) {
      console.error('SSO navigation failed: User is not authenticated');
      throw new Error('User must be authenticated to use SSO navigation');
    }

    // Validate token is not expired
    if (this.authService.isTokenExpired()) {
      console.warn('Access token is expired, attempting refresh...');
      try {
        // Try to refresh token first
        await this.authService.refreshAccessToken().toPromise();
        const newToken = this.authService.getAccessToken();
        if (!newToken) {
          throw new Error('Token refresh failed');
        }
        // Use the refreshed token
        this.performNavigation(baseUrl, route, newToken, openInNewTab);
      } catch (error) {
        console.error('Failed to refresh token:', error);
        throw new Error('Cannot navigate: token is expired and refresh failed');
      }
    } else {
      // Token is valid, proceed with navigation
      this.performNavigation(baseUrl, route, token, openInNewTab);
    }
  }

  /**
   * Performs the actual navigation using SSO callback pattern.
   * Redirects to /auth/sso-callback which processes the token and redirects to final destination.
   * This prevents tokens from being visible in the final URL.
   *
   * @param baseUrl - Base URL of the target application
   * @param route - Route path within the target app (will be passed as redirectTo parameter)
   * @param token - JWT access token to pass
   * @param openInNewTab - Whether to open in new tab
   * @private
   */
  private performNavigation(
    baseUrl: string,
    route: string,
    token: string,
    openInNewTab: boolean,
  ): void {
    // Ensure route starts with /
    const normalizedRoute = route.startsWith('/') ? route : `/${route}`;

    // Build SSO callback URL with token and redirectTo parameters
    // The callback page will process authentication and redirect to the final destination
    const url = `${baseUrl}/auth/sso-callback?token=${encodeURIComponent(token)}&redirectTo=${encodeURIComponent(normalizedRoute)}`;

    if (openInNewTab) {
      // Open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // Navigate in same window
      window.location.href = url;
    }

    console.log(
      `SSO navigation to ${baseUrl}/auth/sso-callback (will redirect to ${normalizedRoute})`,
    );
  }

  /**
   * Creates an SSO navigation link using callback pattern.
   * Returns URL to /auth/sso-callback which will process token and redirect to final destination.
   *
   * @param baseUrl - Base URL of the target application
   * @param route - Route path within the target app (will be passed as redirectTo parameter)
   * @returns Full URL with SSO callback pattern, or null if user is not authenticated
   *
   * @example
   * // In component
   * formBuilderUrl = this.ssoNavigationService.createSsoLink(
   *   'http://localhost:4201',
   *   '/dashboard'
   * );
   *
   * // In template
   * <a [href]="formBuilderUrl" target="_blank">Open Form Builder</a>
   */
  createSsoLink(baseUrl: string, route: string = '/'): string | null {
    const token = this.authService.getAccessToken();

    if (!token || this.authService.isTokenExpired()) {
      return null;
    }

    const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
    return `${baseUrl}/auth/sso-callback?token=${encodeURIComponent(token)}&redirectTo=${encodeURIComponent(normalizedRoute)}`;
  }

  /**
   * Gets the configured URL for a specific application.
   *
   * @param appName - Name of the application ('formBuilder', etc.)
   * @returns The configured URL or null if not found
   */
  getAppUrl(appName: keyof typeof this.appUrls): string | null {
    return this.appUrls[appName] || null;
  }
}
