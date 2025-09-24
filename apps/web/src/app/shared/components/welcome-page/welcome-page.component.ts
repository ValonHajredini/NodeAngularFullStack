import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WelcomeHeroComponent } from './welcome-hero.component';
import { WelcomeFeaturesComponent, WelcomeFeaturesConfig } from './welcome-features.component';
import { WelcomeApiDocsComponent } from './welcome-api-docs.component';
import {
  WelcomePageConfig,
  WelcomeThemeConfig,
  WelcomeCTAButton,
  WelcomeFeature,
} from './welcome-page.interface';

/**
 * Main Welcome Page Component
 *
 * A comprehensive, configurable welcome page component that orchestrates
 * multiple sub-components to create a complete landing page experience:
 *
 * Features:
 * - Fully theme-compliant with automatic light/dark mode support
 * - Modular architecture with reusable sub-components
 * - Responsive design that works on all screen sizes
 * - Accessibility features throughout
 * - Configurable via props for maximum flexibility
 * - Built-in loading and error states
 * - Event handling for user interactions
 * - SEO-friendly semantic HTML structure
 *
 * @example
 * ```html
 * <app-welcome-page
 *   [config]="welcomeConfig"
 *   [loading]="isLoading"
 *   (heroButtonClicked)="onHeroButtonClick($event)"
 *   (featureClicked)="onFeatureClick($event)"
 *   (apiDocsButtonClicked)="onApiDocsClick($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-welcome-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    WelcomeHeroComponent,
    WelcomeFeaturesComponent,
    WelcomeApiDocsComponent,
  ],
  template: `
    <main class="welcome-page" [class.loading]="loading()" role="main">
      <!-- Loading Overlay -->
      @if (loading()) {
        <div class="loading-overlay" role="status" aria-label="Loading welcome page">
          <div class="loading-spinner">
            <i class="pi pi-spin pi-spinner loading-icon" aria-hidden="true"></i>
            <span class="loading-text">Loading...</span>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (error() && !loading()) {
        <div class="error-container" role="alert">
          <div class="error-content">
            <i class="pi pi-exclamation-triangle error-icon" aria-hidden="true"></i>
            <h2 class="error-title">Unable to Load Welcome Page</h2>
            <p class="error-message">{{ error() }}</p>
            <button
              type="button"
              class="error-retry-btn"
              (click)="onRetryClick()"
              [attr.aria-label]="'Retry loading welcome page'"
            >
              <i class="pi pi-refresh" aria-hidden="true"></i>
              Try Again
            </button>
          </div>
        </div>
      }

      <!-- Main Content -->
      @if (!error() && !loading()) {
        <div class="welcome-content" [attr.data-theme-config]="themeConfigId()">
          <!-- Hero Section -->
          <app-welcome-hero
            [config]="config().hero"
            [brandName]="config().navigation?.brandName"
            (buttonClicked)="onHeroButtonClick($event)"
          />

          <!-- Features Section -->
          @if (config().features?.items && (config().features?.items?.length ?? 0) > 0) {
            <app-welcome-features
              [config]="featuresConfig()"
              (featureClicked)="onFeatureClick($event)"
            />
          }

          <!-- API Documentation Section -->
          @if (config().apiDocs) {
            <app-welcome-api-docs
              [config]="config().apiDocs!"
              (buttonClicked)="onApiDocsButtonClick($event)"
            />
          }

          <!-- Custom Sections -->
          @if (config().customSections) {
            @for (section of config().customSections!; track section.id) {
              <section
                [id]="section.id"
                class="custom-section"
                [attr.aria-label]="'Custom section: ' + section.id"
              >
                <!-- Custom section content would be projected here -->
                <!-- This is a placeholder for dynamic component loading -->
                <div class="custom-section-placeholder">
                  <p>Custom section: {{ section.id }}</p>
                </div>
              </section>
            }
          }

          <!-- Footer -->
          @if (config().footer) {
            <footer class="welcome-footer" role="contentinfo">
              <div class="footer-container">
                <div class="footer-content">
                  <p class="footer-copyright">{{ config().footer!.copyrightText }}</p>

                  @if (config().footer?.links && (config().footer?.links?.length ?? 0) > 0) {
                    <nav class="footer-links" [attr.aria-label]="'Footer navigation'">
                      @for (link of config().footer?.links ?? []; track link.label) {
                        @if (link.href) {
                          <a
                            [href]="link.href"
                            class="footer-link"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {{ link.label }}
                          </a>
                        } @else if (link.routerLink) {
                          <a [routerLink]="link.routerLink" class="footer-link">
                            {{ link.label }}
                          </a>
                        }
                      }
                    </nav>
                  }
                </div>
              </div>
            </footer>
          }
        </div>
      }
    </main>
  `,
  styles: [
    `
      /* Main Container */
      .welcome-page {
        min-height: 100vh;
        background-color: var(--color-background);
        color: var(--color-text-primary);
        transition: var(--transition-colors);
        position: relative;
      }

      .welcome-page.loading {
        overflow: hidden;
      }

      /* Loading State */
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--color-background);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-4);
      }

      .loading-icon {
        font-size: 2rem;
        color: var(--color-primary-600);
      }

      .loading-text {
        font-size: var(--font-size-lg);
        color: var(--color-text-secondary);
        font-weight: var(--font-weight-medium);
      }

      /* Error State */
      .error-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-8);
        background-color: var(--color-background);
      }

      .error-content {
        text-align: center;
        max-width: 32rem;
      }

      .error-icon {
        font-size: 3rem;
        color: var(--color-error-600);
        margin-bottom: var(--spacing-4);
      }

      .error-title {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
        margin-bottom: var(--spacing-3);
      }

      .error-message {
        font-size: var(--font-size-lg);
        color: var(--color-text-secondary);
        line-height: var(--line-height-relaxed);
        margin-bottom: var(--spacing-6);
      }

      .error-retry-btn {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-2);
        padding: var(--spacing-3) var(--spacing-6);
        background-color: var(--color-primary-600);
        color: var(--color-text-inverse);
        border: none;
        border-radius: var(--border-radius-lg);
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        transition: var(--transition-colors);
      }

      .error-retry-btn:hover {
        background-color: var(--color-primary-700);
      }

      .error-retry-btn:focus {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
      }

      /* Main Content */
      .welcome-content {
        position: relative;
        z-index: 1;
      }

      /* Custom Sections */
      .custom-section {
        padding: var(--spacing-section-md) 0;
        border-top: var(--border-width-1) solid var(--color-border-light);
        background-color: var(--color-surface);
      }

      .custom-section-placeholder {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 var(--spacing-4);
        text-align: center;
        color: var(--color-text-muted);
        font-style: italic;
      }

      /* Footer */
      .welcome-footer {
        background-color: var(--color-surface-elevated);
        color: var(--color-text-primary);
        border-top: var(--border-width-1) solid var(--color-border);
        transition: var(--transition-colors);
      }

      .footer-container {
        max-width: 1280px;
        margin: 0 auto;
        padding: var(--spacing-8) var(--spacing-4);
      }

      .footer-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-4);
        text-align: center;
      }

      .footer-copyright {
        color: var(--color-text-secondary);
        font-size: var(--font-size-sm);
        margin: 0;
      }

      .footer-links {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-6);
        justify-content: center;
      }

      .footer-link {
        color: var(--color-text-muted);
        text-decoration: none;
        font-size: var(--font-size-sm);
        transition: var(--transition-colors);
      }

      .footer-link:hover {
        color: var(--color-text-primary);
        text-decoration: underline;
      }

      .footer-link:focus {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
        border-radius: var(--border-radius-sm);
      }

      /* Dark theme adjustments */
      [data-theme='dark'] .custom-section {
        background-color: var(--color-surface-elevated);
      }

      [data-theme='dark'] .error-icon {
        color: var(--color-error-500);
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .error-container {
          padding: var(--spacing-4);
        }

        .error-content {
          max-width: 20rem;
        }

        .error-icon {
          font-size: 2.5rem;
        }

        .error-title {
          font-size: var(--font-size-xl);
        }

        .error-message {
          font-size: var(--font-size-base);
        }

        .footer-container {
          padding: var(--spacing-6) var(--spacing-4);
        }

        .footer-links {
          gap: var(--spacing-4);
        }
      }

      @media (max-width: 480px) {
        .loading-icon {
          font-size: 1.75rem;
        }

        .loading-text {
          font-size: var(--font-size-base);
        }

        .footer-content {
          gap: var(--spacing-3);
        }

        .footer-links {
          gap: var(--spacing-3);
        }
      }

      /* Accessibility */
      @media (prefers-reduced-motion: reduce) {
        .loading-icon {
          animation: none;
        }

        * {
          transition: none !important;
        }
      }

      @media (prefers-contrast: high) {
        .welcome-footer {
          border-top-width: 2px;
        }

        .custom-section {
          border-top-width: 2px;
        }

        .error-retry-btn {
          border: 2px solid currentColor;
        }
      }

      /* Print styles */
      @media print {
        .loading-overlay,
        .error-container {
          display: none;
        }

        .welcome-page {
          background: white;
          color: black;
        }

        .welcome-footer {
          background: transparent;
          color: black;
          border-top: 1px solid black;
        }
      }
    `,
  ],
})
export class WelcomePageComponent {
  /**
   * Welcome page configuration
   */
  config = input.required<WelcomePageConfig>();

  /**
   * Theme configuration (optional)
   */
  theme = input<WelcomeThemeConfig>();

  /**
   * Loading state
   */
  loading = input(false);

  /**
   * Error message
   */
  error = input<string | null>(null);

  /**
   * Additional CSS class
   */
  className = input<string>('');

  /**
   * Hero button click event
   */
  heroButtonClicked = output<WelcomeCTAButton>();

  /**
   * Feature click event
   */
  featureClicked = output<WelcomeFeature>();

  /**
   * API docs button click event
   */
  apiDocsButtonClicked = output<WelcomeCTAButton>();

  /**
   * Retry button click event
   */
  retryClicked = output<void>();

  /**
   * Generate unique theme configuration ID
   */
  themeConfigId(): string {
    const theme = this.theme();
    return theme ? `theme-${Math.random().toString(36).substr(2, 9)}` : 'default';
  }

  /**
   * Generate features configuration
   */
  featuresConfig(): WelcomeFeaturesConfig {
    const features = this.config().features;
    if (!features) {
      return {
        title: 'Features',
        description: '',
        features: [],
      };
    }

    return {
      title: features.title,
      description: features.description,
      features: features.items,
      columns: features.columns || 3,
      centerContent: true,
    };
  }

  /**
   * Handle hero button clicks
   */
  onHeroButtonClick(button: WelcomeCTAButton): void {
    this.heroButtonClicked.emit(button);
  }

  /**
   * Handle feature clicks
   */
  onFeatureClick(feature: WelcomeFeature): void {
    this.featureClicked.emit(feature);
  }

  /**
   * Handle API docs button clicks
   */
  onApiDocsButtonClick(button: WelcomeCTAButton): void {
    this.apiDocsButtonClicked.emit(button);
  }

  /**
   * Handle retry button click
   */
  onRetryClick(): void {
    this.retryClicked.emit();
  }
}
