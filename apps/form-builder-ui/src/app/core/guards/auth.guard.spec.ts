import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { authGuard, roleGuard, adminGuard, userGuard } from './auth.guard';
import { AuthService, User } from '@core/auth/auth.service';

/**
 * Test suite for authentication and authorization guards.
 * Tests authentication, role-based access control, and return URL handling.
 */
describe('Auth Guards', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let route: ActivatedRouteSnapshot;
  let state: RouterStateSnapshot;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-15')
  };

  const mockAdminUser: User = {
    ...mockUser,
    role: 'admin'
  };

  const mockReadonlyUser: User = {
    ...mockUser,
    role: 'readonly'
  };

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated'], {
      user: signal(mockUser)
    });
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Mock route and state
    route = new ActivatedRouteSnapshot();
    state = {
      url: '/dashboard',
      root: route
    } as RouterStateSnapshot;
  });

  describe('authGuard', () => {
    it('should allow access when user is authenticated', () => {
      authService.isAuthenticated.and.returnValue(true);

      const result = TestBed.runInInjectionContext(() =>
        authGuard(route, state)
      );

      expect(result).toBeTruthy();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to login when user is not authenticated', () => {
      authService.isAuthenticated.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        authGuard(route, state)
      );

      expect(result).toBeFalsy();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/dashboard' }
      });
    });

    it('should preserve return URL in query parameters', () => {
      authService.isAuthenticated.and.returnValue(false);
      state.url = '/admin/users';

      const result = TestBed.runInInjectionContext(() =>
        authGuard(route, state)
      );

      expect(result).toBeFalsy();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/admin/users' }
      });
    });
  });

  describe('roleGuard', () => {
    it('should allow access when user has required role', () => {
      authService.isAuthenticated.and.returnValue(true);
      (authService.user as any).set(mockAdminUser);

      const adminOnlyGuard = TestBed.runInInjectionContext(() =>
        roleGuard(['admin'])
      );
      const result = TestBed.runInInjectionContext(() =>
        adminOnlyGuard(route, state)
      );

      expect(result).toBeTruthy();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks required role', () => {
      authService.isAuthenticated.and.returnValue(true);
      (authService.user as any).set(mockUser); // user role

      const adminOnlyGuard = TestBed.runInInjectionContext(() =>
        roleGuard(['admin'])
      );
      const result = TestBed.runInInjectionContext(() =>
        adminOnlyGuard(route, state)
      );

      expect(result).toBeFalsy();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], {
        queryParams: { unauthorized: 'true' }
      });
    });

    it('should redirect to login when user is not authenticated', () => {
      authService.isAuthenticated.and.returnValue(false);

      const adminOnlyGuard = TestBed.runInInjectionContext(() =>
        roleGuard(['admin'])
      );
      const result = TestBed.runInInjectionContext(() =>
        adminOnlyGuard(route, state)
      );

      expect(result).toBeFalsy();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
        queryParams: { returnUrl: '/dashboard' }
      });
    });

    it('should handle multiple allowed roles', () => {
      authService.isAuthenticated.and.returnValue(true);

      // Test user role
      (authService.user as any).set(mockUser);
      const multiRoleGuard = TestBed.runInInjectionContext(() =>
        roleGuard(['user', 'admin'])
      );
      let result = TestBed.runInInjectionContext(() =>
        multiRoleGuard(route, state)
      );
      expect(result).toBeTruthy();

      // Test admin role
      (authService.user as any).set(mockAdminUser);
      result = TestBed.runInInjectionContext(() =>
        multiRoleGuard(route, state)
      );
      expect(result).toBeTruthy();

      // Test readonly role (should be denied)
      (authService.user as any).set(mockReadonlyUser);
      result = TestBed.runInInjectionContext(() =>
        multiRoleGuard(route, state)
      );
      expect(result).toBeFalsy();
    });

    it('should handle null user gracefully', () => {
      authService.isAuthenticated.and.returnValue(true);
      (authService.user as any).set(null);

      const adminOnlyGuard = TestBed.runInInjectionContext(() =>
        roleGuard(['admin'])
      );
      const result = TestBed.runInInjectionContext(() =>
        adminOnlyGuard(route, state)
      );

      expect(result).toBeFalsy();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], {
        queryParams: { unauthorized: 'true' }
      });
    });
  });

  describe('adminGuard', () => {
    it('should allow access for admin users', () => {
      authService.isAuthenticated.and.returnValue(true);
      (authService.user as any).set(mockAdminUser);

      const result = TestBed.runInInjectionContext(() =>
        adminGuard(route, state)
      );

      expect(result).toBeTruthy();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should deny access for non-admin users', () => {
      authService.isAuthenticated.and.returnValue(true);
      (authService.user as any).set(mockUser);

      const result = TestBed.runInInjectionContext(() =>
        adminGuard(route, state)
      );

      expect(result).toBeFalsy();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], {
        queryParams: { unauthorized: 'true' }
      });
    });

    it('should deny access for readonly users', () => {
      authService.isAuthenticated.and.returnValue(true);
      (authService.user as any).set(mockReadonlyUser);

      const result = TestBed.runInInjectionContext(() =>
        adminGuard(route, state)
      );

      expect(result).toBeFalsy();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], {
        queryParams: { unauthorized: 'true' }
      });
    });
  });

  describe('userGuard', () => {
    it('should allow access for user role', () => {
      authService.isAuthenticated.and.returnValue(true);
      (authService.user as any).set(mockUser);

      const result = TestBed.runInInjectionContext(() =>
        userGuard(route, state)
      );

      expect(result).toBeTruthy();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should allow access for admin role', () => {
      authService.isAuthenticated.and.returnValue(true);
      (authService.user as any).set(mockAdminUser);

      const result = TestBed.runInInjectionContext(() =>
        userGuard(route, state)
      );

      expect(result).toBeTruthy();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should deny access for readonly users', () => {
      authService.isAuthenticated.and.returnValue(true);
      (authService.user as any).set(mockReadonlyUser);

      const result = TestBed.runInInjectionContext(() =>
        userGuard(route, state)
      );

      expect(result).toBeFalsy();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], {
        queryParams: { unauthorized: 'true' }
      });
    });
  });
});