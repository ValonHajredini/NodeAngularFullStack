import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Section container variants for different visual styles
 */
export type SectionContainerVariant = 'default' | 'elevated' | 'bordered' | 'glass';

/**
 * Section container size variants
 */
export type SectionContainerSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Configuration interface for section container
 */
export interface SectionContainerConfig {
  title?: string;
  subtitle?: string;
  variant?: SectionContainerVariant;
  size?: SectionContainerSize;
  fullWidth?: boolean;
  noPadding?: boolean;
  ariaLabel?: string;
}

/**
 * SectionContainer Component
 *
 * A reusable container component for dashboard sections with:
 * - Theme-aware background that adapts to light/dark modes
 * - Multiple visual variants (default, elevated, bordered, glass)
 * - Optional title and subtitle
 * - Responsive design with size variants
 * - Content projection for flexible layouts
 * - Accessibility features including ARIA labels
 * - Proper spacing and padding management
 *
 * @example
 * ```html
 * <!-- Basic section container -->
 * <app-section-container
 *   [title]="'Quick Actions'"
 *   [variant]="'elevated'"
 *   [size]="'lg'"
 * >
 *   <div class="grid grid-cols-2 gap-4">
 *     <!-- Content goes here -->
 *   </div>
 * </app-section-container>
 *
 * <!-- Container without title -->
 * <app-section-container [variant]="'glass'">
 *   <!-- Custom content -->
 * </app-section-container>
 * ```
 */
@Component({
  selector: 'app-section-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section [class]="containerClasses()" [attr.aria-label]="effectiveAriaLabel()" role="region">
      <!-- Header Section -->
      @if (title() || subtitle()) {
        <header [class]="headerClasses()">
          @if (title()) {
            <h2 [class]="titleClasses()">
              {{ title() }}
            </h2>
          }
          @if (subtitle()) {
            <p [class]="subtitleClasses()">
              {{ subtitle() }}
            </p>
          }
        </header>
      }

      <!-- Content Section -->
      <div [class]="contentClasses()">
        <ng-content></ng-content>
      </div>
    </section>
  `,
  styles: [
    `
      .section-container {
        position: relative;
        width: 100%;
        border-radius: var(--border-radius-xl);
        transition:
          var(--transition-colors),
          box-shadow var(--transition-duration-200) var(--transition-timing-in-out);

        /* Size variants */
        &.size-sm {
          --container-padding: var(--spacing-4);
          --header-spacing: var(--spacing-3);
        }

        &.size-md {
          --container-padding: var(--spacing-5);
          --header-spacing: var(--spacing-4);
        }

        &.size-lg {
          --container-padding: var(--spacing-6);
          --header-spacing: var(--spacing-5);
        }

        &.size-xl {
          --container-padding: var(--spacing-8);
          --header-spacing: var(--spacing-6);
        }

        &.full-width {
          width: 100%;
        }

        &.no-padding {
          --container-padding: 0;
        }
      }

      /* Variant: Default - Clean background with subtle border */
      .section-container.variant-default {
        background-color: var(--color-surface);
        border: var(--border-width-1) solid var(--color-border);
        box-shadow: var(--shadow-sm);

        &:hover {
          border-color: var(--color-border-dark);
        }
      }

      /* Variant: Elevated - Prominent shadow for emphasis */
      .section-container.variant-elevated {
        background-color: var(--color-surface);
        border: var(--border-width-1) solid var(--color-border-light);
        box-shadow: var(--shadow-lg);

        &:hover {
          box-shadow: var(--shadow-xl);
        }
      }

      /* Variant: Bordered - Emphasis on border styling */
      .section-container.variant-bordered {
        background-color: var(--color-surface);
        border: var(--border-width-2) solid var(--color-border);
        box-shadow: none;

        &:hover {
          border-color: var(--color-primary-300);
        }
      }

      /* Variant: Glass - Semi-transparent with backdrop blur effect */
      .section-container.variant-glass {
        background-color: rgba(255, 255, 255, 0.8);
        border: var(--border-width-1) solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(12px);
        box-shadow: var(--shadow-md);

        /* Fallback for browsers without backdrop-filter support */
        @supports not (backdrop-filter: blur(12px)) {
          background-color: var(--color-surface);
        }
      }

      .header {
        padding: var(--container-padding) var(--container-padding) 0 var(--container-padding);
        margin-bottom: var(--header-spacing);

        .section-container.no-padding & {
          padding: 0 0 var(--header-spacing) 0;
        }
      }

      .title {
        margin: 0;
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        line-height: var(--line-height-tight);
        color: var(--color-text-primary);

        /* Size adjustments */
        .section-container.size-sm & {
          font-size: var(--font-size-base);
        }

        .section-container.size-lg & {
          font-size: var(--font-size-xl);
        }

        .section-container.size-xl & {
          font-size: var(--font-size-2xl);
        }
      }

      .subtitle {
        margin: var(--spacing-1) 0 0 0;
        font-size: var(--font-size-sm);
        line-height: var(--line-height-normal);
        color: var(--color-text-secondary);

        .section-container.size-sm & {
          font-size: var(--font-size-xs);
        }

        .section-container.size-lg & {
          font-size: var(--font-size-base);
        }

        .section-container.size-xl & {
          font-size: var(--font-size-lg);
        }
      }

      .content {
        padding: var(--container-padding);

        .section-container.no-padding & {
          padding: 0;
        }

        /* If there's a header, remove top padding */
        .header + & {
          padding-top: 0;
        }
      }

      /* Responsive design */
      @media (max-width: 640px) {
        .section-container {
          &.size-md {
            --container-padding: var(--spacing-4);
            --header-spacing: var(--spacing-3);
          }

          &.size-lg {
            --container-padding: var(--spacing-5);
            --header-spacing: var(--spacing-4);
          }

          &.size-xl {
            --container-padding: var(--spacing-6);
            --header-spacing: var(--spacing-5);
          }
        }

        .title {
          font-size: var(--font-size-base);

          .section-container.size-lg & {
            font-size: var(--font-size-lg);
          }

          .section-container.size-xl & {
            font-size: var(--font-size-xl);
          }
        }
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .section-container {
          border-width: var(--border-width-2);
        }

        .section-container.variant-glass {
          background-color: var(--color-surface);
          backdrop-filter: none;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .section-container {
          transition: none;
        }
      }

      /* Focus management for accessibility */
      .section-container:focus-within {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 2px;
      }
    `,
  ],
})
export class SectionContainerComponent {
  // Input signals
  readonly title = input<string | undefined>(undefined);
  readonly subtitle = input<string | undefined>(undefined);
  readonly variant = input<SectionContainerVariant>('default');
  readonly size = input<SectionContainerSize>('md');
  readonly fullWidth = input<boolean>(true);
  readonly noPadding = input<boolean>(false);
  readonly ariaLabel = input<string | undefined>(undefined);

  // Computed properties
  readonly effectiveAriaLabel = computed(() => {
    return this.ariaLabel() || this.title() || 'Section container';
  });

  readonly containerClasses = computed(() => {
    return [
      'section-container',
      `variant-${this.variant()}`,
      `size-${this.size()}`,
      this.fullWidth() ? 'full-width' : '',
      this.noPadding() ? 'no-padding' : '',
    ]
      .filter(Boolean)
      .join(' ');
  });

  readonly headerClasses = computed(() => 'header');

  readonly titleClasses = computed(() => 'title');

  readonly subtitleClasses = computed(() => 'subtitle');

  readonly contentClasses = computed(() => 'content');
}
