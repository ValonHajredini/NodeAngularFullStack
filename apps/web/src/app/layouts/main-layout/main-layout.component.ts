import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService, User } from '../../core/auth/auth.service';

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
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Navigation Header -->
      <nav class="bg-white shadow-lg border-b border-gray-200">
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
                  <span class="ml-2 text-xl font-bold text-gray-900 hidden sm:block">
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
                    [class.text-gray-900]="isActiveRoute(item.route)"
                    [class.border-transparent]="!isActiveRoute(item.route)"
                    [class.text-gray-500]="!isActiveRoute(item.route)"
                    [class.hover:text-gray-700]="!isActiveRoute(item.route)"
                    [class.hover:border-gray-300]="!isActiveRoute(item.route)">
                    <i [class]="item.icon" class="mr-2"></i>
                    {{ item.label }}
                  </a>
                }
              </div>
            </div>

            <!-- Secondary Navigation (Desktop) -->
            <div class="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              <!-- Notifications (placeholder for future) -->
              <button
                type="button"
                class="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">
                <span class="sr-only">View notifications</span>
                <i class="pi pi-bell text-lg"></i>
              </button>

              <!-- User Menu Dropdown -->
              <div class="ml-3 relative">
                <button
                  type="button"
                  (click)="toggleUserMenu()"
                  class="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  [attr.aria-expanded]="userMenuOpen()"
                  aria-haspopup="true">
                  <span class="sr-only">Open user menu</span>
                  @if (user()) {
                    <div class="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                      <span class="text-sm font-medium text-white">
                        {{ getUserInitials() }}
                      </span>
                    </div>
                  }
                </button>

                <!-- User Dropdown Menu -->
                @if (userMenuOpen()) {
                  <div class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-fade-in">
                    <!-- User Info -->
                    @if (user()) {
                      <div class="px-4 py-3 border-b border-gray-100">
                        <p class="text-sm font-medium text-gray-900">{{ user()!.firstName }} {{ user()!.lastName }}</p>
                        <p class="text-sm text-gray-500">{{ user()!.email }}</p>
                        <span class="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium"
                              [class.bg-blue-100]="user()!.role === 'admin'"
                              [class.text-blue-800]="user()!.role === 'admin'"
                              [class.bg-green-100]="user()!.role === 'user'"
                              [class.text-green-800]="user()!.role === 'user'"
                              [class.bg-gray-100]="user()!.role === 'readonly'"
                              [class.text-gray-800]="user()!.role === 'readonly'">
                          {{ getRoleDisplayName(user()!.role) }}
                        </span>
                      </div>
                    }

                    <!-- Menu Items -->
                    @for (item of userMenuItems; track item.label) {
                      @if (item.separator) {
                        <div class="border-t border-gray-100 my-1"></div>
                      } @else {
                        <a
                          [routerLink]="item.route"
                          (click)="handleUserMenuClick(item)"
                          class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
                          <i [class]="item.icon" class="mr-2 text-gray-400"></i>
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
                class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors"
                [attr.aria-expanded]="mobileMenuOpen()">
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
          <div class="md:hidden border-t border-gray-200 bg-white animate-slide-down">
            <div class="pt-2 pb-3 space-y-1">
              @for (item of getVisibleNavigationItems(); track item.route) {
                <a
                  [routerLink]="item.route"
                  (click)="closeMobileMenu()"
                  class="block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors"
                  [class.bg-primary-50]="isActiveRoute(item.route)"
                  [class.border-primary-500]="isActiveRoute(item.route)"
                  [class.text-primary-700]="isActiveRoute(item.route)"
                  [class.border-transparent]="!isActiveRoute(item.route)"
                  [class.text-gray-600]="!isActiveRoute(item.route)"
                  [class.hover:text-gray-800]="!isActiveRoute(item.route)"
                  [class.hover:bg-gray-50]="!isActiveRoute(item.route)"
                  [class.hover:border-gray-300]="!isActiveRoute(item.route)">
                  <i [class]="item.icon" class="mr-3"></i>
                  {{ item.label }}
                </a>
              }
            </div>

            <!-- Mobile User Section -->
            @if (user()) {
              <div class="pt-4 pb-3 border-t border-gray-200">
                <div class="flex items-center px-4">
                  <div class="flex-shrink-0">
                    <div class="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                      <span class="text-sm font-medium text-white">
                        {{ getUserInitials() }}
                      </span>
                    </div>
                  </div>
                  <div class="ml-3">
                    <div class="text-base font-medium text-gray-800">{{ user()!.firstName }} {{ user()!.lastName }}</div>
                    <div class="text-sm text-gray-500">{{ user()!.email }}</div>
                  </div>
                </div>
                <div class="mt-3 space-y-1">
                  @for (item of userMenuItems; track item.label) {
                    @if (!item.separator) {
                      <a
                        [routerLink]="item.route"
                        (click)="handleUserMenuClick(item)"
                        class="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors">
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
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.2s ease-out;
    }

    .animate-slide-down {
      animation: slideDown 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-100%); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Ensure dropdown appears above other content */
    .z-50 {
      z-index: 50;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
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
      icon: 'pi pi-home'
    },
    {
      label: 'Projects',
      route: '/projects',
      icon: 'pi pi-folder'
    },
    {
      label: 'Tasks',
      route: '/tasks',
      icon: 'pi pi-check-square'
    },
    {
      label: 'Team',
      route: '/team',
      icon: 'pi pi-users'
    },
    {
      label: 'Reports',
      route: '/reports',
      icon: 'pi pi-chart-bar',
      roles: ['admin', 'user']
    },
    {
      label: 'Admin',
      route: '/admin',
      icon: 'pi pi-cog',
      roles: ['admin']
    }
  ];

  /**
   * User menu dropdown items.
   */
  protected readonly userMenuItems = [
    {
      label: 'Your Profile',
      route: '/profile',
      icon: 'pi pi-user'
    },
    {
      label: 'Settings',
      route: '/settings',
      icon: 'pi pi-cog'
    },
    {
      label: 'Help & Support',
      route: '/support',
      icon: 'pi pi-question-circle'
    },
    {
      separator: true
    },
    {
      label: 'Sign Out',
      route: '/logout',
      icon: 'pi pi-sign-out',
      action: 'logout'
    }
  ];

  ngOnInit(): void {
    // Track current route for navigation highlighting
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
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

    return this.navigationItems.filter(item => {
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
      case 'admin': return 'Administrator';
      case 'user': return 'User';
      case 'readonly': return 'Read Only';
      default: return role;
    }
  }

  /**
   * Toggles the mobile menu visibility.
   */
  public toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
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
    this.userMenuOpen.update(open => !open);
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
        }
      });
    }
  }
}