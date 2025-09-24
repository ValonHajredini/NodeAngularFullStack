import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WelcomeFeature, WelcomeColorVariant } from './welcome-page.interface';

/**
 * Feature Showcase Card Component
 *
 * A reusable card component for displaying feature information with:
 * - Theme-aware design that adapts to light/dark modes
 * - Icon with colored background
 * - Title and description
 * - Optional click navigation (router or href)
 * - Hover effects and transitions
 * - Accessibility features
 * - Multiple color variants
 *
 * @example
 * ```html
 * <app-feature-showcase-card
 *   [feature]="{
 *     title: 'Secure Authentication',
 *     description: 'JWT-based authentication with password reset',
 *     icon: 'pi pi-lock',
 *     iconColor: 'primary'
 *   }"
 * />
 * ```
 */
@Component({
  selector: 'app-feature-showcase-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="cardClasses()"
      [attr.role]="feature().href || feature().routerLink ? 'button' : 'article'"
      [attr.tabindex]="feature().href || feature().routerLink ? '0' : undefined"
      [attr.aria-label]="'Feature: ' + feature().title"
      (click)="handleClick()"
      (keydown.enter)="handleClick()"
      (keydown.space)="handleClick()"
    >
      <!-- Icon Container -->
      <div [class]="iconContainerClasses()">
        <i [class]="feature().icon + ' feature-icon'" [attr.aria-hidden]="true"></i>
      </div>

      <!-- Content -->
      <div class="feature-content">
        <h3 class="feature-title">{{ feature().title }}</h3>
        <p class="feature-description">{{ feature().description }}</p>
      </div>

      <!-- Optional Link Icon -->
      @if (feature().href || feature().routerLink) {
        <div class="feature-link-icon">
          <i class="pi pi-arrow-right" [attr.aria-hidden]="true"></i>
        </div>
      }
    </div>
  `,
  styles: [
    `
      /* Base Card Styles */
      .feature-card {
        background-color: var(--color-surface);
        border: var(--border-width-1) solid var(--color-border-light);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-6);
        box-shadow: var(--shadow-md);
        transition:
          var(--transition-colors),
          box-shadow var(--transition-duration-200) var(--transition-timing-in-out),
          transform var(--transition-duration-200) var(--transition-timing-in-out);
        cursor: default;
        position: relative;
        overflow: hidden;
      }

      .feature-card.clickable {
        cursor: pointer;
      }

      .feature-card.clickable:hover {
        box-shadow: var(--shadow-lg);
        transform: translateY(-2px);
      }

      .feature-card.clickable:focus {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
      }

      /* Icon Container */
      .feature-icon-container {
        width: 3rem;
        height: 3rem;
        border-radius: var(--border-radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: var(--spacing-4);
        transition: var(--transition-colors);
      }

      .feature-icon {
        font-size: 1.5rem;
        transition: var(--transition-colors);
      }

      /* Content */
      .feature-content {
        flex-grow: 1;
      }

      .feature-title {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin-bottom: var(--spacing-2);
        line-height: var(--line-height-tight);
      }

      .feature-description {
        color: var(--color-text-secondary);
        line-height: var(--line-height-relaxed);
        margin: 0;
      }

      /* Link Icon */
      .feature-link-icon {
        position: absolute;
        top: var(--spacing-4);
        right: var(--spacing-4);
        color: var(--color-text-muted);
        font-size: 0.875rem;
        opacity: 0;
        transition: opacity var(--transition-duration-200) var(--transition-timing-in-out);
      }

      .feature-card.clickable:hover .feature-link-icon {
        opacity: 1;
      }

      /* Color Variants */
      .icon-primary {
        background-color: var(--color-primary-100);
        color: var(--color-primary-600);
      }

      .icon-secondary {
        background-color: var(--color-gray-100);
        color: var(--color-gray-600);
      }

      .icon-success {
        background-color: var(--color-success-100);
        color: var(--color-success-600);
      }

      .icon-warning {
        background-color: var(--color-warning-100);
        color: var(--color-warning-600);
      }

      .icon-danger {
        background-color: var(--color-error-100);
        color: var(--color-error-600);
      }

      .icon-info {
        background-color: var(--color-info-100);
        color: var(--color-info-600);
      }

      .icon-purple {
        background-color: rgba(147, 51, 234, 0.1);
        color: #7c3aed;
      }

      .icon-gray {
        background-color: var(--color-gray-100);
        color: var(--color-gray-500);
      }

      /* Dark theme adjustments */
      [data-theme='dark'] .icon-primary {
        background-color: var(--color-primary-900);
        color: var(--color-primary-400);
      }

      [data-theme='dark'] .icon-secondary {
        background-color: var(--color-gray-800);
        color: var(--color-gray-400);
      }

      [data-theme='dark'] .icon-success {
        background-color: var(--color-success-900);
        color: var(--color-success-400);
      }

      [data-theme='dark'] .icon-warning {
        background-color: var(--color-warning-900);
        color: var(--color-warning-400);
      }

      [data-theme='dark'] .icon-danger {
        background-color: var(--color-error-900);
        color: var(--color-error-400);
      }

      [data-theme='dark'] .icon-info {
        background-color: var(--color-info-900);
        color: var(--color-info-400);
      }

      [data-theme='dark'] .icon-purple {
        background-color: rgba(147, 51, 234, 0.2);
        color: #a78bfa;
      }

      [data-theme='dark'] .icon-gray {
        background-color: var(--color-gray-800);
        color: var(--color-gray-400);
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .feature-card {
          padding: var(--spacing-5);
        }

        .feature-icon-container {
          width: 2.5rem;
          height: 2.5rem;
        }

        .feature-icon {
          font-size: 1.25rem;
        }

        .feature-title {
          font-size: var(--font-size-lg);
        }
      }
    `,
  ],
})
export class FeatureShowcaseCardComponent {
  /**
   * Feature configuration object
   */
  feature = input.required<WelcomeFeature>();

  /**
   * Computed CSS classes for the card
   */
  cardClasses = computed(() => {
    const feature = this.feature();
    const classes = ['feature-card'];

    if (feature.href || feature.routerLink) {
      classes.push('clickable');
    }

    return classes.join(' ');
  });

  /**
   * Computed CSS classes for the icon container
   */
  iconContainerClasses = computed(() => {
    const feature = this.feature();
    const classes = ['feature-icon-container'];

    // Add color variant class
    classes.push(`icon-${feature.iconColor}`);

    return classes.join(' ');
  });

  /**
   * Handle click events for navigation
   */
  handleClick(): void {
    const feature = this.feature();

    if (feature.href) {
      window.open(feature.href, '_blank', 'noopener,noreferrer');
    }
    // Router navigation is handled by RouterLink directive
  }
}
