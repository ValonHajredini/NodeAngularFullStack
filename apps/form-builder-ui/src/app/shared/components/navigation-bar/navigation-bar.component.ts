import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { UserDropdownMenuComponent } from '../user-dropdown-menu/user-dropdown-menu.component';

/**
 * Navigation Bar Component
 *
 * A reusable navigation bar component for authenticated users.
 * Includes brand name, dashboard navigation, theme toggle, and user dropdown.
 *
 * Features:
 * - Brand name/logo display
 * - Dashboard navigation button
 * - Theme toggle integration
 * - User dropdown menu
 * - Responsive design
 * - Theme-aware styling
 * - Accessibility support
 *
 * @example
 * ```html
 * <app-navigation-bar [brandName]="'MyApp'" />
 * ```
 */
@Component({
  selector: 'app-navigation-bar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    ThemeToggleComponent,
    UserDropdownMenuComponent,
  ],
  template: `
    <nav class="navigation-bar" role="navigation" [attr.aria-label]="'Main navigation'">
      <div class="nav-container">
        <!-- Brand Section -->
        <div class="nav-brand">
          <h1 class="brand-title">{{ brandName() || 'Welcome' }}</h1>
        </div>

        <!-- Navigation Links -->
        <div class="nav-links">
          <p-button
            routerLink="/app/dashboard"
            [text]="true"
            severity="secondary"
            class="nav-link"
            [attr.aria-label]="'Go to Dashboard'"
          >
            <div class="nav-link-content">
              <i class="pi pi-home" aria-hidden="true"></i>
              <span class="nav-link-text">Dashboard</span>
            </div>
          </p-button>
          <p-button
            routerLink="/app/documentation"
            [text]="true"
            severity="secondary"
            class="nav-link"
            [attr.aria-label]="'Go to Documentation'"
          >
            <div class="nav-link-content">
              <i class="pi pi-book" aria-hidden="true"></i>
              <span class="nav-link-text">Documentation</span>
            </div>
          </p-button>
        </div>

        <!-- Actions Section -->
        <div class="nav-actions">
          <app-theme-toggle />
          <div class="nav-divider" aria-hidden="true"></div>
          <app-user-dropdown-menu />
        </div>
      </div>
    </nav>
  `,
  styles: [
    `
      .navigation-bar {
        background-color: var(--color-surface);
        border-bottom: var(--border-width-1) solid var(--color-border-light);
        box-shadow: var(--shadow-sm);
        position: sticky;
        top: 0;
        z-index: 50;
        transition: var(--transition-colors);
      }

      .nav-container {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 var(--spacing-4);
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 4rem;
        gap: var(--spacing-4);
      }

      /* Brand Section */
      .nav-brand {
        flex-shrink: 0;
      }

      .brand-title {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
        margin: 0;
        transition: var(--transition-colors);
      }

      /* Navigation Links */
      .nav-links {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        flex: 1;
        justify-content: flex-start;
        padding-left: var(--spacing-6);
      }

      :host ::ng-deep .nav-link {
        border: none !important;
        background: transparent !important;
        padding: var(--spacing-2) var(--spacing-4) !important;
        border-radius: var(--border-radius-lg) !important;
        transition: var(--transition-colors) !important;
        margin-right: var(--spacing-2) !important;
      }

      :host ::ng-deep .nav-link:hover {
        background: var(--color-surface-hover) !important;
      }

      :host ::ng-deep .nav-link:focus {
        outline: 2px solid var(--color-focus-ring) !important;
        outline-offset: 2px !important;
      }

      .nav-link-content {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        color: var(--color-text-primary);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }

      .nav-link-content i {
        font-size: var(--font-size-base);
        color: var(--color-text-muted);
      }

      .nav-link-text {
        transition: var(--transition-colors);
      }

      :host ::ng-deep .nav-link:hover .nav-link-content i,
      :host ::ng-deep .nav-link:hover .nav-link-text {
        color: var(--color-primary-600);
      }

      /* Actions Section */
      .nav-actions {
        display: flex;
        align-items: center;
        gap: var(--spacing-4);
        flex-shrink: 0;
      }

      .nav-divider {
        width: var(--border-width-1);
        height: 2rem;
        background-color: var(--color-border-light);
        transition: var(--transition-colors);
      }

      /* Dark theme adjustments */
      [data-theme='dark'] .navigation-bar {
        background-color: var(--color-gray-800);
        border-bottom-color: var(--color-border);
      }

      [data-theme='dark'] :host ::ng-deep .nav-link:hover .nav-link-content i,
      [data-theme='dark'] :host ::ng-deep .nav-link:hover .nav-link-text {
        color: var(--color-primary-400);
      }

      /* Responsive Design */
      @media (max-width: 1024px) {
        .nav-container {
          padding: 0 var(--spacing-3);
          gap: var(--spacing-3);
        }

        .nav-links {
          padding-left: var(--spacing-4);
        }
      }

      @media (max-width: 768px) {
        .nav-container {
          padding: 0 var(--spacing-3);
          gap: var(--spacing-2);
        }

        .nav-links {
          padding-left: var(--spacing-2);
        }

        .brand-title {
          font-size: var(--font-size-lg);
        }

        .nav-actions {
          gap: var(--spacing-3);
        }
      }

      @media (max-width: 640px) {
        .nav-container {
          height: 3.5rem;
        }

        .brand-title {
          font-size: var(--font-size-base);
        }

        .nav-link-text {
          display: none;
        }

        .nav-actions {
          gap: var(--spacing-2);
        }

        .nav-divider {
          display: none;
        }
      }

      @media (max-width: 480px) {
        .nav-links {
          display: none;
        }

        .nav-container {
          padding: 0 var(--spacing-2);
        }
      }

      /* Accessibility */
      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
        }
      }

      /* High contrast mode */
      @media (prefers-contrast: high) {
        .navigation-bar {
          border-bottom-width: 2px;
        }

        .nav-divider {
          background-color: var(--color-text-primary);
        }

        :host ::ng-deep .nav-link {
          border: 1px solid var(--color-border) !important;
        }
      }

      /* Focus visible improvements */
      .brand-title:focus {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
        border-radius: var(--border-radius-sm);
      }

      /* Print styles */
      @media print {
        .navigation-bar {
          background: white;
          border-bottom: 1px solid black;
          box-shadow: none;
        }

        .nav-actions {
          display: none;
        }

        .brand-title {
          color: black;
        }
      }
    `,
  ],
})
export class NavigationBarComponent {
  /**
   * Brand name to display in the navigation
   */
  brandName = input<string>();
}
