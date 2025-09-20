import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { User } from '../auth/auth.service';

/**
 * Authentication guard that protects routes requiring user authentication.
 * Redirects to login page if user is not authenticated.
 *
 * @param route - The activated route snapshot
 * @param state - The router state snapshot
 * @returns True if authenticated, false with redirect if not
 *
 * @example
 * // In route configuration
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [authGuard]
 * }
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Store the attempted URL for redirecting after login
  router.navigate(['/welcome'], {
    queryParams: { returnUrl: state.url }
  });

  return false;
};

/**
 * Role-based guard factory that creates guards for specific roles.
 * Protects routes requiring specific user roles.
 *
 * @param allowedRoles - Array of roles that can access the route
 * @returns CanActivateFn that checks both authentication and authorization
 *
 * @example
 * // In route configuration
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [roleGuard(['admin'])]
 * }
 */
export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // First check if user is authenticated
    if (!authService.isAuthenticated()) {
      router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    // Check if user has required role
    const user = authService.user();
    if (!user || !allowedRoles.includes(user.role)) {
      // Redirect to dashboard with unauthorized message
      router.navigate(['/app/dashboard'], {
        queryParams: { unauthorized: 'true' }
      });
      return false;
    }

    return true;
  };
}

/**
 * Admin-only guard for administrative routes.
 * Convenience function for admin role checking.
 */
export const adminGuard: CanActivateFn = roleGuard(['admin']);

/**
 * User and admin guard for routes accessible to regular users and admins.
 * Excludes readonly users from access.
 */
export const userGuard: CanActivateFn = roleGuard(['user', 'admin']);