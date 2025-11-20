import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { environment } from '@env/environment';

/**
 * SSO Authentication Guard for handling token-based authentication from external apps.
 *
 * This guard:
 * 1. Checks if user is already authenticated locally
 * 2. If not, reads JWT token from URL query parameter
 * 3. Validates token by decoding and checking expiration
 * 4. Stores token in localStorage and updates auth service
 * 5. Redirects to clean URL (without token in URL)
 *
 * @param route - The activated route snapshot containing query parameters
 * @returns True if authenticated, false with redirect if not
 *
 * @example
 * // In route configuration
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [ssoAuthGuard]
 * }
 *
 * // Navigation from apps/web:
 * window.open('http://localhost:4201/dashboard?token=eyJhbGc...', '_blank');
 */
export const ssoAuthGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If user is already authenticated locally, allow access
  if (authService.isAuthenticated()) {
    return true;
  }

  // Check for SSO token in URL query parameters
  const token = route.queryParamMap.get('token');

  if (!token) {
    // No token provided, redirect to main app login
    console.warn('SSO token missing, redirecting to main app login');
    window.location.href = `${environment.mainAppUrl}/auth/login`;
    return false;
  }

  try {
    // Validate token structure and expiration
    const isValid = validateJwtToken(token);

    if (!isValid) {
      console.error('SSO token validation failed: invalid or expired token');
      // Redirect to main app login
      window.location.href = `${environment.mainAppUrl}/auth/login`;
      return false;
    }

    // Extract user data from token payload
    const payload = decodeJwtPayload(token);

    // Store tenant context if available (for multi-tenancy)
    if (payload.tenant) {
      localStorage.setItem('tenant_context', JSON.stringify(payload.tenant));
    }

    // Update auth service with user data and token
    // The authService will handle storing tokens with proper keys from environment config
    authService.setSsoAuthData({
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

    // Redirect to clean URL (remove token from URL for security)
    const urlWithoutToken = route.url.map(segment => segment.path).join('/');
    router.navigate([urlWithoutToken || '/'], {
      // Preserve other query params except token
      queryParams: Object.fromEntries(
        Array.from(route.queryParamMap.keys)
          .filter(key => key !== 'token')
          .map(key => [key, route.queryParamMap.get(key)])
      ),
      replaceUrl: true // Replace history to remove token from browser history
    });

    return true;
  } catch (error) {
    console.error('SSO authentication failed:', error);
    // Redirect to main app login
    window.location.href = `${environment.mainAppUrl}/auth/login`;
    return false;
  }
};

/**
 * Validates JWT token structure and expiration.
 * @param token - JWT token string
 * @returns True if token is valid and not expired
 */
function validateJwtToken(token: string): boolean {
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
 * @param token - JWT token string
 * @returns Decoded payload object
 */
function decodeJwtPayload(token: string): any {
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  return payload;
}
