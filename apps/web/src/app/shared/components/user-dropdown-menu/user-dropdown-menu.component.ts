import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { TenantContextService } from '../../../core/services/tenant-context.service';

/**
 * Interface for user menu items.
 */
export interface UserMenuItem {
  label?: string;
  route?: string;
  icon?: string;
  action?: string;
  separator?: boolean;
  themeValue?: 'light' | 'dark' | 'system';
}

/**
 * User Dropdown Menu Component
 *
 * A reusable user dropdown menu component extracted from MainLayoutComponent.
 * Provides user avatar, user info display, and menu items for profile, settings, and logout.
 *
 * Features:
 * - Theme-aware styling with CSS variables
 * - User avatar image with initials fallback
 * - Role badge display
 * - Menu items with icons
 * - Logout functionality
 * - Responsive design
 * - Click-outside-to-close functionality
 * - Image error handling with graceful degradation
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
          <div class="h-8 w-8 rounded-full overflow-hidden">
            @if (user()!.avatarUrl && !imageLoadError()) {
              <img
                [src]="user()!.avatarUrl"
                [alt]="user()!.firstName + ' ' + user()!.lastName + ' avatar'"
                class="h-full w-full object-cover"
                (error)="onImageError()"
                (load)="onImageLoad()"
              />
            } @else {
              <div
                class="h-full w-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center"
              >
                <span class="text-sm font-medium text-white">
                  {{ getUserInitials() }}
                </span>
              </div>
            }
          </div>
        }
      </button>

      <!-- User Dropdown Menu -->
      @if (userMenuOpen()) {
        <div
          class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 dropdown-menu ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999] animate-fade-in"
        >
          <!-- User Info -->
          @if (user()) {
            <div class="px-4 py-3 dropdown-divider">
              <p class="text-sm font-medium dropdown-text-primary">
                {{ user()!.firstName }} {{ user()!.lastName }}
              </p>
              <p class="text-sm dropdown-text-secondary">{{ user()!.email }}</p>
              <div class="flex items-center gap-2 mt-1">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
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
              @if (currentTenant()) {
                <p class="text-xs dropdown-text-secondary mt-2 flex items-center gap-1">
                  <i class="pi pi-building text-xs"></i>
                  {{ currentTenant()!.name }}
                </p>
              }
            </div>
          }

          <!-- Menu Items -->
          @for (item of userMenuItems; track item.separator ? 'separator' : item.label) {
            @if (item.separator) {
              <div class="dropdown-divider my-1"></div>
            } @else {
              <a
                [routerLink]="item.route || null"
                (click)="handleUserMenuClick(item)"
                class="dropdown-item"
                [class.theme-item-active]="item.themeValue && currentTheme() === item.themeValue"
              >
                <i [class]="item.icon!" class="mr-2 dropdown-icon"></i>
                {{ item.label! }}
                @if (item.themeValue && currentTheme() === item.themeValue) {
                  <i class="pi pi-check ml-auto text-primary-600"></i>
                }
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
        display: flex;
        align-items: center;
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

      .theme-item-active {
        background-color: var(--color-primary-50);
        color: var(--color-primary-700);
      }

      .dropdown-icon {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-muted);
        font-size: 1rem;
        width: 1.25rem;
        height: 1.25rem;
        flex-shrink: 0;
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
      .z-\\[9999\\] {
        z-index: 9999;
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
  private readonly themeService = inject(ThemeService);
  private readonly tenantService = inject(TenantContextService);

  protected readonly user = this.authService.user;
  protected readonly userMenuOpen = signal(false);
  protected readonly imageLoadError = signal(false);
  protected readonly currentTheme = this.themeService.currentTheme;
  protected readonly currentTenant = this.tenantService.currentTenant;

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
      route: '/app/settings',
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
      label: 'Light Mode',
      icon: 'pi pi-sun',
      action: 'theme',
      themeValue: 'light',
    },
    {
      label: 'Dark Mode',
      icon: 'pi pi-moon',
      action: 'theme',
      themeValue: 'dark',
    },
    {
      label: 'System Default',
      icon: 'pi pi-desktop',
      action: 'theme',
      themeValue: 'system',
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
    this.clickOutsideHandler = (event: Event): void => {
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

    const firstName = currentUser.firstName?.trim();
    const lastName = currentUser.lastName?.trim();

    if (!firstName || firstName === '' || !lastName || lastName === '') return '';

    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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
   * Handles image load errors and falls back to initials.
   */
  public onImageError(): void {
    this.imageLoadError.set(true);
  }

  /**
   * Handles successful image load and resets error state.
   */
  public onImageLoad(): void {
    this.imageLoadError.set(false);
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
          // eslint-disable-next-line no-console
          console.error('Logout failed:', error);
          // Force navigation to login even if server logout fails
          void this.router.navigate(['/auth/login']);
        },
      });
    } else if (item.action === 'theme' && item.themeValue) {
      this.themeService.setTheme(item.themeValue);
    }
  }
}
