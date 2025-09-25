import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { NavigationBarComponent } from '../navigation-bar/navigation-bar.component';
import { WelcomeCTAButtonComponent } from './welcome-cta-button.component';
import { WelcomeHeroConfig, WelcomeCTAButton } from './welcome-page.interface';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Welcome Hero Component
 *
 * A reusable hero section component with:
 * - Theme-aware background and text colors
 * - Configurable title, subtitle, and description
 * - Primary and secondary call-to-action buttons
 * - Optional theme toggle
 * - Responsive design
 * - Gradient background support
 * - Accessibility features
 *
 * @example
 * ```html
 * <app-welcome-hero
 *   [config]="{
 *     title: 'Welcome to Our Platform',
 *     subtitle: 'Build amazing applications',
 *     description: 'Start your journey today...',
 *     primaryButton: { label: 'Get Started', variant: 'primary', routerLink: '/signup' },
 *     secondaryButton: { label: 'Learn More', variant: 'secondary', routerLink: '/about' }
 *   }"
 * />
 * ```
 */
@Component({
  selector: 'app-welcome-hero',
  standalone: true,
  imports: [CommonModule, ThemeToggleComponent, NavigationBarComponent, WelcomeCTAButtonComponent],
  template: `
    <div class="hero-container">
      <!-- Navigation Bar - Show different content based on authentication -->
      @if (config().showThemeToggle) {
        @if (isAuthenticated()) {
          <!-- Authenticated Navigation -->
          <app-navigation-bar [brandName]="brandName() || 'Welcome'" />
        } @else {
          <!-- Public Navigation -->
          <nav class="hero-nav">
            <div class="nav-content">
              <div class="nav-brand">
                <h1 class="brand-title">{{ brandName() || 'Welcome' }}</h1>
              </div>
              <div class="nav-actions">
                <app-theme-toggle />
              </div>
            </div>
          </nav>
        }
      }

      <!-- Hero Content -->
      <div class="hero-content">
        <div class="hero-inner">
          <div class="text-center">
            <!-- Main Title -->
            <h1 class="hero-title">
              {{ config().title }}
              @if (config().accentText) {
                <span class="hero-accent">{{ config().accentText }}</span>
              }
            </h1>

            <!-- Subtitle -->
            @if (config().subtitle) {
              <h2 class="hero-subtitle">{{ config().subtitle }}</h2>
            }

            <!-- Description -->
            @if (config().description) {
              <p class="hero-description">{{ config().description }}</p>
            }

            <!-- CTA Buttons - Only show when not authenticated -->
            @if (!isAuthenticated()) {
              <div class="hero-actions">
                @if (config().primaryButton) {
                  <app-welcome-cta-button
                    [config]="config().primaryButton!"
                    (clicked)="onButtonClick($event)"
                  />
                }
                @if (config().secondaryButton) {
                  <app-welcome-cta-button
                    [config]="config().secondaryButton!"
                    (clicked)="onButtonClick($event)"
                  />
                }
              </div>
            } @else {
              <!-- Welcome message for authenticated users -->
              <div class="hero-actions authenticated-welcome">
                <p class="welcome-message">
                  Welcome back, <strong>{{ authService.user()?.firstName || 'User' }}</strong
                  >!
                </p>
                <p class="welcome-subtitle">Ready to continue where you left off?</p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* Hero Container */
      .hero-container {
        position: relative;
        min-height: 80vh;
        background: var(--color-background);
        transition: var(--transition-colors);
      }

      .hero-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          135deg,
          var(--color-primary-50) 0%,
          var(--color-background) 50%,
          var(--color-info-50) 100%
        );
        opacity: 0.6;
        transition: var(--transition-colors);
        pointer-events: none;
      }

      /* Navigation Bar */
      .hero-nav {
        position: relative;
        z-index: 10;
        background-color: var(--color-surface);
        box-shadow: var(--shadow-sm);
        border-bottom: var(--border-width-1) solid var(--color-border-light);
      }

      .nav-content {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 var(--spacing-4);
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 4rem;
      }

      .nav-brand {
        flex-shrink: 0;
      }

      .brand-title {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
        margin: 0;
      }

      .nav-actions {
        display: flex;
        align-items: center;
        gap: var(--spacing-4);
      }

      /* Hero Content */
      .hero-content {
        position: relative;
        z-index: 5;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 70vh;
        padding: var(--spacing-20) var(--spacing-4) var(--spacing-16);
      }

      .hero-inner {
        max-width: 1280px;
        width: 100%;
      }

      .text-center {
        text-align: center;
      }

      /* Typography */
      .hero-title {
        font-size: clamp(2.5rem, 5vw, 4rem);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
        line-height: var(--line-height-tight);
        margin-bottom: var(--spacing-6);
        max-width: 60rem;
        margin-left: auto;
        margin-right: auto;
      }

      .hero-accent {
        color: var(--color-primary-600);
        display: inline-block;
        position: relative;
      }

      .hero-accent::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, var(--color-primary-500), var(--color-primary-700));
        transform: scaleX(0);
        animation: underlineExpand 1.5s ease-out 0.5s forwards;
      }

      @keyframes underlineExpand {
        to {
          transform: scaleX(1);
        }
      }

      .hero-subtitle {
        font-size: clamp(1.25rem, 3vw, 1.875rem);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
        line-height: var(--line-height-relaxed);
        margin-bottom: var(--spacing-4);
        max-width: 48rem;
        margin-left: auto;
        margin-right: auto;
      }

      .hero-description {
        font-size: var(--font-size-xl);
        color: var(--color-text-secondary);
        line-height: var(--line-height-relaxed);
        margin-bottom: var(--spacing-8);
        max-width: 42rem;
        margin-left: auto;
        margin-right: auto;
      }

      /* CTA Actions */
      .hero-actions {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-4);
        align-items: center;
      }

      @media (min-width: 640px) {
        .hero-actions {
          flex-direction: row;
          justify-content: center;
          gap: var(--spacing-6);
        }
      }

      /* Dark Theme Adjustments */
      [data-theme='dark'] .hero-container::before {
        background: linear-gradient(
          135deg,
          var(--color-primary-900) 0%,
          var(--color-background) 50%,
          var(--color-info-900) 100%
        );
        opacity: 0.4;
      }

      [data-theme='dark'] .hero-nav {
        background-color: var(--color-gray-800);
        border-bottom-color: var(--color-border);
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .hero-content {
          padding: var(--spacing-16) var(--spacing-4) var(--spacing-12);
        }

        .nav-content {
          padding: 0 var(--spacing-4);
        }

        .brand-title {
          font-size: var(--font-size-lg);
        }

        .hero-title {
          margin-bottom: var(--spacing-4);
        }

        .hero-subtitle {
          margin-bottom: var(--spacing-3);
        }

        .hero-description {
          font-size: var(--font-size-lg);
          margin-bottom: var(--spacing-6);
        }
      }

      @media (max-width: 480px) {
        .nav-content {
          padding: 0 var(--spacing-3);
          height: 3.5rem;
        }

        .brand-title {
          font-size: var(--font-size-base);
        }

        .hero-content {
          min-height: 60vh;
          padding: var(--spacing-12) var(--spacing-3) var(--spacing-8);
        }

        .hero-actions {
          gap: var(--spacing-3);
        }
      }

      /* Authenticated Welcome Styling */
      .authenticated-welcome {
        text-align: center;
        padding: var(--spacing-6) 0;
      }

      .welcome-message {
        font-size: var(--font-size-xl);
        color: var(--color-text-primary);
        margin-bottom: var(--spacing-2);
        font-weight: var(--font-weight-medium);
      }

      .welcome-message strong {
        color: var(--color-primary-600);
        font-weight: var(--font-weight-semibold);
      }

      .welcome-subtitle {
        font-size: var(--font-size-lg);
        color: var(--color-text-secondary);
        margin: 0;
      }

      /* Dark theme adjustments for welcome message */
      [data-theme='dark'] .welcome-message strong {
        color: var(--color-primary-400);
      }

      /* Accessibility */
      @media (prefers-reduced-motion: reduce) {
        .hero-accent::after {
          animation: none;
          transform: scaleX(1);
        }

        .hero-container::before {
          transition: none;
        }
      }

      /* High contrast mode */
      @media (prefers-contrast: high) {
        .hero-container::before {
          opacity: 0.2;
        }

        .hero-accent {
          text-decoration: underline;
          text-decoration-thickness: 2px;
        }
      }
    `,
  ],
})
export class WelcomeHeroComponent {
  /**
   * Inject AuthService for authentication state
   */
  readonly authService = inject(AuthService);

  /**
   * Hero configuration
   */
  config = input.required<WelcomeHeroConfig>();

  /**
   * Brand name for navigation (optional override)
   */
  brandName = input<string>();

  /**
   * Button click event emitter
   */
  buttonClicked = output<WelcomeCTAButton>();

  /**
   * Check if user is authenticated
   */
  readonly isAuthenticated = this.authService.isAuthenticated;

  /**
   * Handle button click events
   */
  onButtonClick(button: WelcomeCTAButton): void {
    this.buttonClicked.emit(button);
  }
}
