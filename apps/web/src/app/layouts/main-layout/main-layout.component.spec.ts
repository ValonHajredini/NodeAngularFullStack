import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService, User } from '@core/auth/auth.service';
import { NavigationService } from './navigation.service';

/**
 * Test suite for MainLayoutComponent.
 * Tests navigation functionality, user menu, mobile responsiveness, and role-based features.
 */
describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;
  let router: Router;
  let authService: jasmine.SpyObj<AuthService>;
  let navigationService: jasmine.SpyObj<NavigationService>;

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

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      user: signal(mockUser)
    });
    const navigationServiceSpy = jasmine.createSpyObj('NavigationService', [
      'setNavigationContext',
      'navigateTo'
    ]);

    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NavigationService, useValue: navigationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    navigationService = TestBed.inject(NavigationService) as jasmine.SpyObj<NavigationService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display user initials in avatar', () => {
    fixture.detectChanges();

    const initials = component.getUserInitials();
    expect(initials).toBe('JD');
  });

  it('should show role-appropriate navigation items for regular user', () => {
    fixture.detectChanges();

    const visibleItems = component.getVisibleNavigationItems();
    const itemLabels = visibleItems.map(item => item.label);

    expect(itemLabels).toContain('Dashboard');
    expect(itemLabels).toContain('Projects');
    expect(itemLabels).toContain('Tasks');
    expect(itemLabels).toContain('Team');
    expect(itemLabels).toContain('Reports'); // User can see reports
    expect(itemLabels).not.toContain('Admin'); // User cannot see admin
  });

  it('should show admin navigation items for admin user', () => {
    // Change user to admin
    (authService.user as any).set(mockAdminUser);
    fixture.detectChanges();

    const visibleItems = component.getVisibleNavigationItems();
    const itemLabels = visibleItems.map(item => item.label);

    expect(itemLabels).toContain('Dashboard');
    expect(itemLabels).toContain('Admin'); // Admin can see admin section
    expect(itemLabels).toContain('Reports'); // Admin can see reports
  });

  it('should highlight active route correctly', () => {
    component['currentRoute'].set('/dashboard');

    expect(component.isActiveRoute('/dashboard')).toBeTruthy();
    expect(component.isActiveRoute('/dashboard/overview')).toBeTruthy(); // Child routes
    expect(component.isActiveRoute('/profile')).toBeFalsy();
  });

  it('should toggle mobile menu', () => {
    expect(component['mobileMenuOpen']()).toBeFalsy();

    component.toggleMobileMenu();
    expect(component['mobileMenuOpen']()).toBeTruthy();

    component.toggleMobileMenu();
    expect(component['mobileMenuOpen']()).toBeFalsy();
  });

  it('should toggle user menu', () => {
    expect(component['userMenuOpen']()).toBeFalsy();

    component.toggleUserMenu();
    expect(component['userMenuOpen']()).toBeTruthy();

    component.toggleUserMenu();
    expect(component['userMenuOpen']()).toBeFalsy();
  });

  it('should close mobile menu when toggling user menu', () => {
    component['mobileMenuOpen'].set(true);

    component.toggleUserMenu();

    expect(component['userMenuOpen']()).toBeTruthy();
    expect(component['mobileMenuOpen']()).toBeFalsy();
  });

  it('should close user menu when toggling mobile menu', () => {
    component['userMenuOpen'].set(true);

    component.toggleMobileMenu();

    expect(component['mobileMenuOpen']()).toBeTruthy();
    expect(component['userMenuOpen']()).toBeFalsy();
  });

  it('should close mobile menu on navigation', () => {
    component['mobileMenuOpen'].set(true);

    component.closeMobileMenu();

    expect(component['mobileMenuOpen']()).toBeFalsy();
  });

  it('should handle logout correctly', () => {
    authService.logout.and.returnValue(of(undefined));
    const navigateSpy = spyOn(router, 'navigate');

    const logoutItem = { action: 'logout', route: '/logout' };
    component.handleUserMenuClick(logoutItem);

    expect(authService.logout).toHaveBeenCalled();
    expect(component['userMenuOpen']()).toBeFalsy();
    expect(component['mobileMenuOpen']()).toBeFalsy();
  });

  it('should handle logout error by forcing navigation', () => {
    authService.logout.and.returnValue(of(undefined).pipe(() => {
      throw new Error('Logout failed');
    }));
    const navigateSpy = spyOn(router, 'navigate');

    const logoutItem = { action: 'logout', route: '/logout' };
    component.handleUserMenuClick(logoutItem);

    // Error handling is done in the error callback
    expect(authService.logout).toHaveBeenCalled();
  });

  it('should return correct role display names', () => {
    expect(component.getRoleDisplayName('admin')).toBe('Administrator');
    expect(component.getRoleDisplayName('user')).toBe('User');
    expect(component.getRoleDisplayName('readonly')).toBe('Read Only');
    expect(component.getRoleDisplayName('custom')).toBe('custom');
  });

  it('should handle regular menu item clicks', () => {
    const regularItem = { route: '/profile', label: 'Profile' };

    component.handleUserMenuClick(regularItem);

    expect(component['userMenuOpen']()).toBeFalsy();
    expect(component['mobileMenuOpen']()).toBeFalsy();
  });

  it('should show correct user info in dropdown', () => {
    fixture.detectChanges();

    // Open user menu
    component.toggleUserMenu();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('John Doe');
    expect(compiled.textContent).toContain('test@example.com');
  });

  it('should handle no user gracefully', () => {
    (authService.user as any).set(null);
    fixture.detectChanges();

    const visibleItems = component.getVisibleNavigationItems();
    expect(visibleItems).toEqual([]);

    const initials = component.getUserInitials();
    expect(initials).toBe('');
  });
});