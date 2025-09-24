import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WelcomeCTAButton, WelcomeColorVariant, WelcomeButtonSize } from './welcome-page.interface';

/**
 * Welcome CTA Button Component
 *
 * A reusable button component for call-to-action buttons with:
 * - Theme-aware styling for light/dark modes
 * - Multiple color variants and sizes
 * - Support for router navigation, external links, and click events
 * - Loading states and disabled states
 * - Icon support
 * - Accessibility features
 * - Responsive design
 *
 * @example
 * ```html
 * <app-welcome-cta-button
 *   [config]="{
 *     label: 'Get Started',
 *     variant: 'primary',
 *     size: 'lg',
 *     routerLink: '/register'
 *   }"
 * />
 * ```
 */
@Component({
  selector: 'app-welcome-cta-button',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (config().href && !config().routerLink) {
      <!-- External Link -->
      <a
        [href]="config().href!"
        [target]="config().target || '_blank'"
        rel="noopener noreferrer"
        [class]="buttonClasses()"
        [attr.aria-label]="config().ariaLabel || config().label"
        [attr.disabled]="config().disabled || loading()"
      >
        @if (config().icon) {
          <i [class]="config().icon!" class="button-icon" [attr.aria-hidden]="true"></i>
        }
        @if (loading()) {
          <i class="pi pi-spin pi-spinner button-icon" [attr.aria-hidden]="true"></i>
        }
        {{ config().label }}
      </a>
    } @else if (config().routerLink) {
      <!-- Router Link -->
      <a
        [routerLink]="config().routerLink!"
        [class]="buttonClasses()"
        [attr.aria-label]="config().ariaLabel || config().label"
        [attr.disabled]="config().disabled || loading()"
      >
        @if (config().icon) {
          <i [class]="config().icon!" class="button-icon" [attr.aria-hidden]="true"></i>
        }
        @if (loading()) {
          <i class="pi pi-spin pi-spinner button-icon" [attr.aria-hidden]="true"></i>
        }
        {{ config().label }}
      </a>
    } @else {
      <!-- Action Button -->
      <button
        type="button"
        [class]="buttonClasses()"
        [attr.aria-label]="config().ariaLabel || config().label"
        [disabled]="config().disabled || loading()"
        (click)="handleClick()"
      >
        @if (config().icon && !loading()) {
          <i [class]="config().icon!" class="button-icon" [attr.aria-hidden]="true"></i>
        }
        @if (loading()) {
          <i class="pi pi-spin pi-spinner button-icon" [attr.aria-hidden]="true"></i>
        }
        {{ config().label }}
      </button>
    }
  `,
  styles: [
    `
      /* Base Button Styles */
      .welcome-cta-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-2);
        font-family: var(--font-family-sans);
        font-weight: var(--font-weight-medium);
        text-decoration: none;
        border-radius: var(--border-radius-lg);
        border: var(--border-width-1) solid transparent;
        cursor: pointer;
        transition:
          var(--transition-colors),
          box-shadow var(--transition-duration-200) var(--transition-timing-in-out),
          transform var(--transition-duration-150) var(--transition-timing-in-out);
        position: relative;
        overflow: hidden;
        white-space: nowrap;
        text-align: center;
      }

      .welcome-cta-button:focus {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
      }

      .welcome-cta-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
      }

      .welcome-cta-button:not(:disabled):hover {
        transform: translateY(-1px);
      }

      .welcome-cta-button:not(:disabled):active {
        transform: translateY(0);
      }

      /* Button Sizes */
      .size-sm {
        padding: var(--spacing-2) var(--spacing-4);
        font-size: var(--font-size-sm);
        min-height: 2.25rem;
      }

      .size-md {
        padding: var(--spacing-3) var(--spacing-6);
        font-size: var(--font-size-base);
        min-height: 2.75rem;
      }

      .size-lg {
        padding: var(--spacing-4) var(--spacing-8);
        font-size: var(--font-size-lg);
        min-height: 3.25rem;
      }

      /* Button Icon */
      .button-icon {
        flex-shrink: 0;
      }

      /* Color Variants */

      /* Primary Variant */
      .variant-primary {
        background-color: var(--color-primary-600);
        color: var(--color-text-inverse);
        border-color: var(--color-primary-600);
        box-shadow: var(--shadow-sm);
      }

      .variant-primary:not(:disabled):hover {
        background-color: var(--color-primary-700);
        border-color: var(--color-primary-700);
        box-shadow: var(--shadow-md);
      }

      .variant-primary:not(:disabled):active {
        background-color: var(--color-primary-800);
        border-color: var(--color-primary-800);
      }

      /* Secondary Variant */
      .variant-secondary {
        background-color: var(--color-surface);
        color: var(--color-text-primary);
        border-color: var(--color-border);
        box-shadow: var(--shadow-sm);
      }

      .variant-secondary:not(:disabled):hover {
        background-color: var(--color-background);
        border-color: var(--color-border-dark);
        box-shadow: var(--shadow-md);
      }

      .variant-secondary:not(:disabled):active {
        background-color: var(--color-gray-100);
        border-color: var(--color-gray-400);
      }

      /* Success Variant */
      .variant-success {
        background-color: var(--color-success-600);
        color: var(--color-text-inverse);
        border-color: var(--color-success-600);
        box-shadow: var(--shadow-sm);
      }

      .variant-success:not(:disabled):hover {
        background-color: var(--color-success-700);
        border-color: var(--color-success-700);
        box-shadow: var(--shadow-md);
      }

      .variant-success:not(:disabled):active {
        background-color: var(--color-success-800);
        border-color: var(--color-success-800);
      }

      /* Warning Variant */
      .variant-warning {
        background-color: var(--color-warning-500);
        color: var(--color-warning-900);
        border-color: var(--color-warning-500);
        box-shadow: var(--shadow-sm);
      }

      .variant-warning:not(:disabled):hover {
        background-color: var(--color-warning-600);
        border-color: var(--color-warning-600);
        box-shadow: var(--shadow-md);
      }

      .variant-warning:not(:disabled):active {
        background-color: var(--color-warning-700);
        border-color: var(--color-warning-700);
      }

      /* Danger Variant */
      .variant-danger {
        background-color: var(--color-error-600);
        color: var(--color-text-inverse);
        border-color: var(--color-error-600);
        box-shadow: var(--shadow-sm);
      }

      .variant-danger:not(:disabled):hover {
        background-color: var(--color-error-700);
        border-color: var(--color-error-700);
        box-shadow: var(--shadow-md);
      }

      .variant-danger:not(:disabled):active {
        background-color: var(--color-error-800);
        border-color: var(--color-error-800);
      }

      /* Info Variant */
      .variant-info {
        background-color: var(--color-info-600);
        color: var(--color-text-inverse);
        border-color: var(--color-info-600);
        box-shadow: var(--shadow-sm);
      }

      .variant-info:not(:disabled):hover {
        background-color: var(--color-info-700);
        border-color: var(--color-info-700);
        box-shadow: var(--shadow-md);
      }

      .variant-info:not(:disabled):active {
        background-color: var(--color-info-800);
        border-color: var(--color-info-800);
      }

      /* Purple Variant */
      .variant-purple {
        background-color: #7c3aed;
        color: var(--color-text-inverse);
        border-color: #7c3aed;
        box-shadow: var(--shadow-sm);
      }

      .variant-purple:not(:disabled):hover {
        background-color: #6d28d9;
        border-color: #6d28d9;
        box-shadow: var(--shadow-md);
      }

      .variant-purple:not(:disabled):active {
        background-color: #5b21b6;
        border-color: #5b21b6;
      }

      /* Gray Variant */
      .variant-gray {
        background-color: var(--color-gray-600);
        color: var(--color-text-inverse);
        border-color: var(--color-gray-600);
        box-shadow: var(--shadow-sm);
      }

      .variant-gray:not(:disabled):hover {
        background-color: var(--color-gray-700);
        border-color: var(--color-gray-700);
        box-shadow: var(--shadow-md);
      }

      .variant-gray:not(:disabled):active {
        background-color: var(--color-gray-800);
        border-color: var(--color-gray-800);
      }

      /* Dark theme adjustments */
      [data-theme='dark'] .variant-secondary {
        background-color: var(--color-gray-700);
        border-color: var(--color-gray-600);
      }

      [data-theme='dark'] .variant-secondary:not(:disabled):hover {
        background-color: var(--color-gray-600);
        border-color: var(--color-gray-500);
      }

      [data-theme='dark'] .variant-secondary:not(:disabled):active {
        background-color: var(--color-gray-800);
        border-color: var(--color-gray-700);
      }

      [data-theme='dark'] .variant-purple {
        background-color: #8b5cf6;
      }

      [data-theme='dark'] .variant-purple:not(:disabled):hover {
        background-color: #7c3aed;
      }

      [data-theme='dark'] .variant-purple:not(:disabled):active {
        background-color: #6d28d9;
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .size-lg {
          padding: var(--spacing-3) var(--spacing-6);
          font-size: var(--font-size-base);
          min-height: 2.75rem;
        }

        .size-md {
          padding: var(--spacing-2_5) var(--spacing-5);
          font-size: var(--font-size-sm);
          min-height: 2.5rem;
        }

        .welcome-cta-button {
          min-width: 140px;
        }
      }

      /* Touch devices */
      @media (pointer: coarse) {
        .welcome-cta-button {
          min-height: 44px; /* iOS touch target recommendation */
        }
      }
    `,
  ],
})
export class WelcomeCTAButtonComponent {
  /**
   * Button configuration
   */
  config = input.required<WelcomeCTAButton>();

  /**
   * Loading state
   */
  loading = input(false);

  /**
   * Click event emitter
   */
  clicked = output<WelcomeCTAButton>();

  /**
   * Computed CSS classes for the button
   */
  buttonClasses = computed(() => {
    const config = this.config();
    const classes = ['welcome-cta-button'];

    // Add variant class
    classes.push(`variant-${config.variant}`);

    // Add size class
    const size = config.size || 'md';
    classes.push(`size-${size}`);

    return classes.join(' ');
  });

  /**
   * Handle click events
   */
  handleClick(): void {
    const config = this.config();

    if (!config.disabled && !this.loading()) {
      // Emit click event
      this.clicked.emit(config);

      // Execute action if provided
      if (config.action) {
        config.action();
      }
    }
  }
}
