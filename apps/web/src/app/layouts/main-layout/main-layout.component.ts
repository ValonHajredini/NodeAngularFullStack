import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService, User } from '../../core/auth/auth.service';
import { ThemeToggleComponent } from '../../shared/components';

/**
 * Interface for navigation menu items.
 */
export interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  roles?: string[];
  external?: boolean;
  children?: NavigationItem[];
}

/**
 * Main layout component with adaptive navigation.
 * Provides responsive navigation bar with role-based menu items,
 * user dropdown, and mobile-friendly hamburger menu.
 */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, ThemeToggleComponent],
  template: `
    <div class="min-h-screen main-container">
      <!-- Navigation Header -->
      <nav class="nav-header">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <!-- Logo and Primary Navigation -->
            <div class="flex">
              <!-- Logo -->
              <div class="flex-shrink-0 flex items-center">
                <a routerLink="/dashboard" class="flex items-center">
                  <div class="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                    <i class="pi pi-home text-white text-lg"></i>
                  </div>
                  <span class="ml-2 text-xl font-bold nav-text-primary hidden sm:block">
                    MyApp
                  </span>
                </a>
              </div>

              <!-- Primary Navigation (Desktop) -->
              <div class="hidden md:ml-6 md:flex md:space-x-8">
                @for (item of getVisibleNavigationItems(); track item.route) {
                  <a
                    [routerLink]="item.route"
                    class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200"
                    [class.border-primary-500]="isActiveRoute(item.route)"
                    [class.nav-text-active]="isActiveRoute(item.route)"
                    [class.border-transparent]="!isActiveRoute(item.route)"
                    [class.nav-text-inactive]="!isActiveRoute(item.route)"
                    [class.nav-text-hover]="!isActiveRoute(item.route)"
                    [class.nav-border-hover]="!isActiveRoute(item.route)"
                  >
                    <i [class]="item.icon" class="mr-2"></i>
                    {{ item.label }}
                  </a>
                }
              </div>
            </div>

            <!-- Secondary Navigation (Desktop) -->
            <div class="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              <!-- Theme Toggle -->
              <app-theme-toggle />

              <!-- Notifications (placeholder for future) -->
              <button type="button" class="nav-button rounded-full p-1 transition-colors">
                <span class="sr-only">View notifications</span>
                <i class="pi pi-bell text-lg"></i>
              </button>

              <!-- User Menu Dropdown -->
              <div class="ml-3 relative">
                <button
                  type="button"
                  (click)="toggleUserMenu()"
                  class="nav-button rounded-full flex text-sm transition-colors"
                  [attr.aria-expanded]="userMenuOpen()"
                  aria-haspopup="true"
                >
                  <span class="sr-only">Open user menu</span>
                  @if (user()) {
                    <div
                      class="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center"
                    >
                      <span class="text-sm font-medium text-white">
                        {{ getUserInitials() }}
                      </span>
                    </div>
                  }
                </button>

                <!-- User Dropdown Menu -->
                @if (userMenuOpen()) {
                  <div
                    class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 dropdown-menu ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-fade-in"
                  >
                    <!-- User Info -->
                    @if (user()) {
                      <div class="px-4 py-3 dropdown-divider">
                        <p class="text-sm font-medium dropdown-text-primary">
                          {{ user()!.firstName }} {{ user()!.lastName }}
                        </p>
                        <p class="text-sm dropdown-text-secondary">{{ user()!.email }}</p>
                        <span
                          class="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium"
                          [class.bg-blue-100]="user()!.role === 'admin'"
                          [class.text-blue-800]="user()!.role === 'admin'"
                          [class.bg-green-100]="user()!.role === 'user'"
                          [class.text-green-800]="user()!.role === 'user'"
                          [class.bg-gray-100]="user()!.role === 'readonly'"
                          [class.text-gray-800]="user()!.role === 'readonly'"
                        >
                          {{ getRoleDisplayName(user()!.role) }}
                        </span>
                      </div>
                    }

                    <!-- Menu Items -->
                    @for (item of userMenuItems; track item.label) {
                      @if (item.separator) {
                        <div class="dropdown-divider my-1"></div>
                      } @else {
                        <a
                          [routerLink]="item.route"
                          (click)="handleUserMenuClick(item)"
                          class="dropdown-item"
                        >
                          <i [class]="item.icon" class="mr-2 dropdown-icon"></i>
                          {{ item.label }}
                        </a>
                      }
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Mobile Menu Button -->
            <div class="md:hidden flex items-center">
              <button
                type="button"
                (click)="toggleMobileMenu()"
                class="mobile-menu-button"
                [attr.aria-expanded]="mobileMenuOpen()"
              >
                <span class="sr-only">Open main menu</span>
                @if (!mobileMenuOpen()) {
                  <i class="pi pi-bars text-lg"></i>
                } @else {
                  <i class="pi pi-times text-lg"></i>
                }
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Menu Panel -->
        @if (mobileMenuOpen()) {
          <div class="md:hidden mobile-menu-panel animate-slide-down">
            <div class="pt-2 pb-3 space-y-1">
              @for (item of getVisibleNavigationItems(); track item.route) {
                <a
                  [routerLink]="item.route"
                  (click)="closeMobileMenu()"
                  class="mobile-menu-item"
                  [class.mobile-menu-item-active]="isActiveRoute(item.route)"
                  [class.mobile-menu-item-inactive]="!isActiveRoute(item.route)"
                >
                  <i [class]="item.icon" class="mr-3"></i>
                  {{ item.label }}
                </a>
              }
            </div>

            <!-- Mobile User Section -->
            @if (user()) {
              <div class="pt-4 pb-3 mobile-user-section">
                <div class="flex items-center px-4">
                  <div class="flex-shrink-0">
                    <div
                      class="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center"
                    >
                      <span class="text-sm font-medium text-white">
                        {{ getUserInitials() }}
                      </span>
                    </div>
                  </div>
                  <div class="ml-3">
                    <div class="text-base font-medium mobile-text-primary">
                      {{ user()!.firstName }} {{ user()!.lastName }}
                    </div>
                    <div class="text-sm mobile-text-secondary">{{ user()!.email }}</div>
                  </div>
                </div>
                <div class="mt-3 space-y-1">
                  <!-- Theme Toggle for Mobile -->
                  <div class="px-4 py-2">
                    <app-theme-toggle [showAllOptions]="true" />
                  </div>

                  @for (item of userMenuItems; track item.label) {
                    @if (!item.separator) {
                      <a
                        [routerLink]="item.route"
                        (click)="handleUserMenuClick(item)"
                        class="mobile-user-menu-item"
                      >
                        <i [class]="item.icon" class="mr-3"></i>
                        {{ item.label }}
                      </a>
                    }
                  }
                </div>
              </div>
            }
          </div>
        }
      </nav>

      <!-- Main Content Area -->
      <main class="flex-1">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      /* Main container with theme-aware background */
      .main-container {
        background-color: var(--color-background);
        color: var(--color-text-primary);
        transition: var(--transition-colors);
      }

      /* Navigation header */
      .nav-header {
        background-color: var(--color-surface);
        box-shadow: var(--shadow-lg);
        border-bottom: var(--border-width-1) solid var(--color-border);
      }

      /* Navigation text colors */
      .nav-text-primary {
        color: var(--color-text-primary);
      }

      .nav-text-active {
        color: var(--color-text-primary);
      }

      .nav-text-inactive {
        color: var(--color-text-secondary);
      }

      .nav-text-hover:hover {
        color: var(--color-text-primary);
      }

      .nav-border-hover:hover {
        border-color: var(--color-border-dark);
      }

      /* Navigation button */
      .nav-button {
        background-color: var(--color-surface);
        color: var(--color-text-secondary);
      }

      .nav-button:hover {
        color: var(--color-text-primary);
      }

      .nav-button:focus {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
      }

      /* Dropdown menu */
      .dropdown-menu {
        background-color: var(--color-surface);
        border: var(--border-width-1) solid var(--color-border);
      }

      .dropdown-divider {
        border-bottom: var(--border-width-1) solid var(--color-border-light);
      }

      .dropdown-text-primary {
        color: var(--color-text-primary);
      }

      .dropdown-text-secondary {
        color: var(--color-text-secondary);
      }

      .dropdown-item {
        display: block;
        padding: var(--spacing-2) var(--spacing-4);
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        transition: var(--transition-colors);
        cursor: pointer;
      }

      .dropdown-item:hover {
        background-color: var(--color-gray-100);
        color: var(--color-text-primary);
      }

      .dropdown-icon {
        color: var(--color-text-muted);
      }

      /* Mobile menu */
      .mobile-menu-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-2);
        border-radius: var(--border-radius-md);
        color: var(--color-text-secondary);
        transition: var(--transition-colors);
      }

      .mobile-menu-button:hover {
        color: var(--color-text-primary);
        background-color: var(--color-gray-100);
      }

      .mobile-menu-button:focus {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: -2px;
      }

      .mobile-menu-panel {
        border-top: var(--border-width-1) solid var(--color-border);
        background-color: var(--color-surface);
      }

      .mobile-menu-item {
        display: block;
        padding-left: var(--spacing-3);
        padding-right: var(--spacing-4);
        padding-top: var(--spacing-2);
        padding-bottom: var(--spacing-2);
        border-left-width: var(--border-width-4);
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        transition: var(--transition-colors);
      }

      .mobile-menu-item-active {
        background-color: var(--color-primary-50);
        border-color: var(--color-primary-500);
        color: var(--color-primary-700);
      }

      .mobile-menu-item-inactive {
        border-color: transparent;
        color: var(--color-text-secondary);
      }

      .mobile-menu-item-inactive:hover {
        color: var(--color-text-primary);
        background-color: var(--color-gray-50);
        border-color: var(--color-border);
      }

      .mobile-user-section {
        border-top: var(--border-width-1) solid var(--color-border);
      }

      .mobile-text-primary {
        color: var(--color-text-primary);
      }

      .mobile-text-secondary {
        color: var(--color-text-secondary);
      }

      .mobile-user-menu-item {
        display: block;
        padding: var(--spacing-2) var(--spacing-4);
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
        transition: var(--transition-colors);
      }

      .mobile-user-menu-item:hover {
        color: var(--color-text-primary);
        background-color: var(--color-gray-100);
      }

      /* Animations */
      .animate-fade-in {
        animation: fadeIn 0.2s ease-out;
      }

      .animate-slide-down {
        animation: slideDown 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-100%);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Ensure dropdown appears above other content */
      .z-50 {
        z-index: 50;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly user = this.authService.user;
  protected readonly mobileMenuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
  protected readonly currentRoute = signal('');

  /**
   * Navigation items configuration.
   * Items are filtered based on user roles and authentication status.
   */
  protected readonly navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'pi pi-home',
    },
    {
      label: 'Projects',
      route: '/projects',
      icon: 'pi pi-folder',
    },
    {
      label: 'Tasks',
      route: '/tasks',
      icon: 'pi pi-check-square',
    },
    {
      label: 'Team',
      route: '/team',
      icon: 'pi pi-users',
    },
    {
      label: 'Reports',
      route: '/reports',
      icon: 'pi pi-chart-bar',
      roles: ['admin', 'user'],
    },
    {
      label: 'Admin',
      route: '/admin',
      icon: 'pi pi-cog',
      roles: ['admin'],
    },
  ];

  /**
   * User menu dropdown items.
   */
  protected readonly userMenuItems = [
    {
      label: 'Your Profile',
      route: '/profile',
      icon: 'pi pi-user',
    },
    {
      label: 'Settings',
      route: '/settings',
      icon: 'pi pi-cog',
    },
    {
      label: 'Help & Support',
      route: '/support',
      icon: 'pi pi-question-circle',
    },
    {
      separator: true,
    },
    {
      label: 'Sign Out',
      route: '/logout',
      icon: 'pi pi-sign-out',
      action: 'logout',
    },
  ];

  ngOnInit(): void {
    // Track current route for navigation highlighting
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.urlAfterRedirects);
        // Close mobile menu on navigation
        this.mobileMenuOpen.set(false);
        this.userMenuOpen.set(false);
      });

    // Set initial route
    this.currentRoute.set(this.router.url);

    // Close menus when clicking outside
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        this.userMenuOpen.set(false);
      }
    });
  }

  /**
   * Gets navigation items visible to the current user based on their role.
   */
  public getVisibleNavigationItems(): NavigationItem[] {
    const currentUser = this.user();
    if (!currentUser) return [];

    return this.navigationItems.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(currentUser.role);
    });
  }

  /**
   * Checks if the given route is currently active.
   */
  public isActiveRoute(route: string): boolean {
    const current = this.currentRoute();
    return current === route || current.startsWith(route + '/');
  }

  /**
   * Gets user initials for avatar display.
   */
  public getUserInitials(): string {
    const currentUser = this.user();
    if (!currentUser) return '';
    return `${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}`.toUpperCase();
  }

  /**
   * Gets display name for user role.
   */
  public getRoleDisplayName(role: string): string {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'user':
        return 'User';
      case 'readonly':
        return 'Read Only';
      default:
        return role;
    }
  }

  /**
   * Toggles the mobile menu visibility.
   */
  public toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
    if (this.mobileMenuOpen()) {
      this.userMenuOpen.set(false);
    }
  }

  /**
   * Closes the mobile menu.
   */
  public closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  /**
   * Toggles the user menu dropdown visibility.
   */
  public toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
    if (this.userMenuOpen()) {
      this.mobileMenuOpen.set(false);
    }
  }

  /**
   * Handles user menu item clicks.
   */
  public handleUserMenuClick(item: any): void {
    this.userMenuOpen.set(false);
    this.mobileMenuOpen.set(false);

    if (item.action === 'logout') {
      this.authService.logout().subscribe({
        next: () => {
          // Navigation handled by AuthService
        },
        error: (error) => {
          console.error('Logout failed:', error);
          // Force navigation to login even if server logout fails
          this.router.navigate(['/auth/login']);
        },
      });
    }
  }
}
