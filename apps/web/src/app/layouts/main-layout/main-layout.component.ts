import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService, User } from '../../core/auth/auth.service';
import { ThemeToggleComponent } from '../../shared/components';
import { UserDropdownMenuComponent } from '../../shared/components/user-dropdown-menu/user-dropdown-menu.component';

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
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    ThemeToggleComponent,
    UserDropdownMenuComponent,
  ],
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
                <a routerLink="/app/dashboard" class="flex items-center">
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
              <app-user-dropdown-menu />
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
                <!-- Theme Toggle for Mobile -->
                <div class="px-4 py-2">
                  <app-theme-toggle [showAllOptions]="true" />
                </div>

                <!-- User Dropdown for Mobile -->
                <div class="px-4 py-2">
                  <app-user-dropdown-menu />
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
        position: sticky;
        top: 0;
        z-index: 100;
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
  protected readonly currentRoute = signal('');

  /**
   * Navigation items configuration.
   * Items are filtered based on user roles and authentication status.
   */
  protected readonly navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      route: '/app/dashboard',
      icon: 'pi pi-home',
    },
    {
      label: 'Projects',
      route: '/app/projects',
      icon: 'pi pi-folder',
    },
    {
      label: 'Tasks',
      route: '/app/tasks',
      icon: 'pi pi-check-square',
    },
    {
      label: 'Team',
      route: '/app/team',
      icon: 'pi pi-users',
    },
    {
      label: 'Reports',
      route: '/app/reports',
      icon: 'pi pi-chart-bar',
      roles: ['admin', 'user'],
    },
    {
      label: 'Documentation',
      route: '/app/documentation',
      icon: 'pi pi-book',
    },
    {
      label: 'Tools',
      route: '/app/tools',
      icon: 'pi pi-wrench',
    },
    {
      label: 'Admin Tools',
      route: '/app/admin/tools',
      icon: 'pi pi-cog',
      roles: ['admin'],
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
      });

    // Set initial route
    this.currentRoute.set(this.router.url);
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
   * Toggles the mobile menu visibility.
   */
  public toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  /**
   * Closes the mobile menu.
   */
  public closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
