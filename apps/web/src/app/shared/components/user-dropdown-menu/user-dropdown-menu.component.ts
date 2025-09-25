import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Interface for user menu items.
 */
export interface UserMenuItem {
  label?: string;
  route?: string;
  icon?: string;
  action?: string;
  separator?: boolean;
}

/**
 * User Dropdown Menu Component
 *
 * A reusable user dropdown menu component extracted from MainLayoutComponent.
 * Provides user avatar, user info display, and menu items for profile, settings, and logout.
 *
 * Features:
 * - Theme-aware styling with CSS variables
 * - User avatar with initials
 * - Role badge display
 * - Menu items with icons
 * - Logout functionality
 * - Responsive design
 * - Click-outside-to-close functionality
 *
 * @example
 * ```html
 * <app-user-dropdown-menu />
 * ```
 */
@Component({
  selector: 'app-user-dropdown-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
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
          @for (item of userMenuItems; track item.separator ? 'separator' : item.label) {
            @if (item.separator) {
              <div class="dropdown-divider my-1"></div>
            } @else {
              <a
                [routerLink]="item.route!"
                (click)="handleUserMenuClick(item)"
                class="dropdown-item"
              >
                <i [class]="item.icon!" class="mr-2 dropdown-icon"></i>
                {{ item.label! }}
              </a>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
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

      /* Animations */
      .animate-fade-in {
        animation: fadeIn 0.2s ease-out;
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

      /* Ensure dropdown appears above other content */
      .z-50 {
        z-index: 50;
      }

      /* Dark theme adjustments */
      [data-theme='dark'] .dropdown-item:hover {
        background-color: var(--color-gray-700);
      }

      [data-theme='dark'] .bg-blue-100 {
        background-color: var(--color-blue-900) !important;
      }

      [data-theme='dark'] .text-blue-800 {
        color: var(--color-blue-200) !important;
      }

      [data-theme='dark'] .bg-green-100 {
        background-color: var(--color-green-900) !important;
      }

      [data-theme='dark'] .text-green-800 {
        color: var(--color-green-200) !important;
      }

      [data-theme='dark'] .bg-gray-100 {
        background-color: var(--color-gray-700) !important;
      }

      [data-theme='dark'] .text-gray-800 {
        color: var(--color-gray-200) !important;
      }

      /* Accessibility */
      @media (prefers-reduced-motion: reduce) {
        .animate-fade-in {
          animation: none;
        }
      }
    `,
  ],
})
export class UserDropdownMenuComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly user = this.authService.user;
  protected readonly userMenuOpen = signal(false);

  private clickOutsideHandler: ((event: Event) => void) | null = null;

  /**
   * User menu dropdown items.
   */
  protected readonly userMenuItems: UserMenuItem[] = [
    {
      label: 'Your Profile',
      route: '/app/profile',
      icon: 'pi pi-user',
    },
    {
      label: 'Settings',
      route: '/settings',
      icon: 'pi pi-cog',
    },
    {
      label: 'Help & Support',
      route: '/app/support',
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
    // Close menu when clicking outside
    this.clickOutsideHandler = (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        this.userMenuOpen.set(false);
      }
    };
    document.addEventListener('click', this.clickOutsideHandler);
  }

  ngOnDestroy(): void {
    if (this.clickOutsideHandler) {
      document.removeEventListener('click', this.clickOutsideHandler);
    }
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
   * Toggles the user menu dropdown visibility.
   */
  public toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  /**
   * Handles user menu item clicks.
   */
  public handleUserMenuClick(item: UserMenuItem): void {
    this.userMenuOpen.set(false);

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
