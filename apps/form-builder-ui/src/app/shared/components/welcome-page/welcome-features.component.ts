import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatureShowcaseCardComponent } from './feature-showcase-card.component';
import { WelcomeFeature } from './welcome-page.interface';

/**
 * Welcome Features Section Configuration
 */
export interface WelcomeFeaturesConfig {
  title: string;
  description: string;
  features: WelcomeFeature[];
  columns?: 2 | 3 | 4;
  showAsCards?: boolean;
  centerContent?: boolean;
}

/**
 * Welcome Features Component
 *
 * A reusable features section component with:
 * - Theme-aware styling for light/dark modes
 * - Configurable grid layout (2, 3, or 4 columns)
 * - Feature cards with icons, titles, and descriptions
 * - Responsive design that adapts to screen sizes
 * - Click handling for feature navigation
 * - Accessibility features
 * - Smooth animations
 *
 * @example
 * ```html
 * <app-welcome-features
 *   [config]="{
 *     title: 'Features',
 *     description: 'Everything you need for modern development',
 *     features: [
 *       {
 *         title: 'Fast Performance',
 *         description: 'Lightning-fast load times',
 *         icon: 'pi pi-bolt',
 *         iconColor: 'success'
 *       }
 *     ],
 *     columns: 3
 *   }"
 * />
 * ```
 */
@Component({
  selector: 'app-welcome-features',
  standalone: true,
  imports: [CommonModule, FeatureShowcaseCardComponent],
  template: `
    <section class="features-section" [attr.aria-labelledby]="sectionId">
      <div class="features-container">
        <!-- Section Header -->
        <div class="features-header" [class.center-content]="config().centerContent !== false">
          <h2 [id]="sectionId" class="features-title">
            {{ config().title }}
          </h2>
          @if (config().description) {
            <p class="features-description">
              {{ config().description }}
            </p>
          }
        </div>

        <!-- Features Grid -->
        <div
          class="features-grid"
          [class]="gridClasses()"
          role="list"
          [attr.aria-label]="'Features grid with ' + config().features.length + ' items'"
        >
          @for (feature of config().features; track feature.title; let index = $index) {
            <div role="listitem" class="feature-item" [style.animation-delay]="index * 100 + 'ms'">
              <app-feature-showcase-card [feature]="feature" (click)="onFeatureClick(feature)" />
            </div>
          }
        </div>

        <!-- Empty State -->
        @if (config().features.length === 0) {
          <div class="features-empty" role="status">
            <div class="empty-icon">
              <i class="pi pi-info-circle" aria-hidden="true"></i>
            </div>
            <p class="empty-message">No features to display</p>
          </div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      /* Section Container */
      .features-section {
        padding: var(--spacing-section-lg) 0;
        background-color: var(--color-background);
        transition: var(--transition-colors);
      }

      .features-container {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 var(--spacing-4);
      }

      /* Section Header */
      .features-header {
        margin-bottom: var(--spacing-12);
      }

      .features-header.center-content {
        text-align: center;
      }

      .features-title {
        font-size: clamp(2rem, 4vw, 3rem);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
        line-height: var(--line-height-tight);
        margin-bottom: var(--spacing-4);
      }

      .features-description {
        font-size: var(--font-size-xl);
        color: var(--color-text-secondary);
        line-height: var(--line-height-relaxed);
        margin: 0;
        max-width: 48rem;
      }

      .center-content .features-description {
        margin-left: auto;
        margin-right: auto;
      }

      /* Features Grid */
      .features-grid {
        display: grid;
        gap: var(--spacing-8);
        align-items: stretch;
      }

      .features-grid.columns-2 {
        grid-template-columns: repeat(2, 1fr);
      }

      .features-grid.columns-3 {
        grid-template-columns: repeat(3, 1fr);
      }

      .features-grid.columns-4 {
        grid-template-columns: repeat(4, 1fr);
      }

      /* Feature Item Animation */
      .feature-item {
        opacity: 0;
        transform: translateY(30px);
        animation: fadeInUp 0.8s ease-out forwards;
      }

      @keyframes fadeInUp {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Empty State */
      .features-empty {
        text-align: center;
        padding: var(--spacing-16) var(--spacing-8);
        color: var(--color-text-muted);
      }

      .empty-icon {
        font-size: 3rem;
        margin-bottom: var(--spacing-4);
        opacity: 0.6;
      }

      .empty-message {
        font-size: var(--font-size-lg);
        margin: 0;
      }

      /* Responsive Design */

      /* Large screens (4 columns max) */
      @media (max-width: 1200px) {
        .features-grid.columns-4 {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      /* Medium screens */
      @media (max-width: 968px) {
        .features-container {
          padding: 0 var(--spacing-6);
        }

        .features-grid.columns-3,
        .features-grid.columns-4 {
          grid-template-columns: repeat(2, 1fr);
        }

        .features-header {
          margin-bottom: var(--spacing-10);
        }
      }

      /* Small screens */
      @media (max-width: 640px) {
        .features-section {
          padding: var(--spacing-section-md) 0;
        }

        .features-container {
          padding: 0 var(--spacing-4);
        }

        .features-grid {
          grid-template-columns: 1fr;
          gap: var(--spacing-6);
        }

        .features-header {
          margin-bottom: var(--spacing-8);
        }

        .features-title {
          margin-bottom: var(--spacing-3);
        }

        .features-description {
          font-size: var(--font-size-lg);
        }
      }

      /* Very small screens */
      @media (max-width: 480px) {
        .features-container {
          padding: 0 var(--spacing-3);
        }

        .features-grid {
          gap: var(--spacing-5);
        }

        .features-empty {
          padding: var(--spacing-12) var(--spacing-4);
        }
      }

      /* Accessibility */

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .feature-item {
          animation: none;
          opacity: 1;
          transform: none;
        }
      }

      /* High contrast mode */
      @media (prefers-contrast: high) {
        .features-title {
          text-decoration: underline;
          text-decoration-thickness: 2px;
          text-underline-offset: 4px;
        }
      }

      /* Focus management */
      .feature-item:focus-within {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 4px;
        border-radius: var(--border-radius-lg);
      }

      /* Dark theme specific adjustments */
      [data-theme='dark'] .features-section {
        background-color: var(--color-background);
      }

      [data-theme='dark'] .empty-icon {
        opacity: 0.4;
      }

      /* Print styles */
      @media print {
        .features-section {
          background: transparent;
          color: black;
        }

        .feature-item {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .features-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-6);
        }
      }
    `,
  ],
})
export class WelcomeFeaturesComponent {
  /**
   * Features section configuration
   */
  config = input.required<WelcomeFeaturesConfig>();

  /**
   * Feature click event emitter
   */
  featureClicked = output<WelcomeFeature>();

  /**
   * Unique section ID for accessibility
   */
  sectionId = `features-${Math.random().toString(36).substr(2, 9)}`;

  /**
   * Computed CSS classes for the grid
   */
  gridClasses(): string {
    const columns = this.config().columns || 3;
    return `columns-${columns}`;
  }

  /**
   * Handle feature click events
   */
  onFeatureClick(feature: WelcomeFeature): void {
    this.featureClicked.emit(feature);
  }
}
