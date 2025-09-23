import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Color variants for the stats card icon
 */
export type StatsCardColorVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'gray';

/**
 * Size variants for the stats card
 */
export type StatsCardSize = 'sm' | 'md' | 'lg';

/**
 * Configuration interface for stats card data
 */
export interface StatsCardData {
  title: string;
  value: string | number;
  icon: string;
  iconColor: StatsCardColorVariant;
  size?: StatsCardSize;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  ariaLabel?: string;
}

/**
 * StatsCard Component
 *
 * A reusable card component for displaying statistical information with:
 * - Dark theme-optimized design that adapts to light/dark modes
 * - Icon with colored background
 * - Large value display with title
 * - Optional trend indicators
 * - Multiple color variants and size options
 * - Accessibility features including ARIA labels
 * - Responsive design for mobile and desktop
 *
 * @example
 * ```html
 * <!-- Basic stats card -->
 * <app-stats-card
 *   [title]="'Active Projects'"
 *   [value]="12"
 *   [icon]="'pi pi-folder'"
 *   [iconColor]="'primary'"
 * />
 *
 * <!-- Stats card with trend -->
 * <app-stats-card
 *   [title]="'Revenue'"
 *   [value]="'$45,231'"
 *   [icon]="'pi pi-dollar'"
 *   [iconColor]="'success'"
 *   [trend]="{ value: 12, isPositive: true, label: 'vs last month' }"
 * />
 * ```
 */
@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="cardClasses()" [attr.aria-label]="effectiveAriaLabel()" role="article">
      <!-- Card Content -->
      <div class="stats-card-content">
        <!-- Icon Section -->
        <div class="icon-container">
          <div [class]="iconWrapperClasses()">
            <i [class]="iconClasses()"></i>
          </div>
        </div>

        <!-- Stats Section -->
        <div class="stats-section">
          <!-- Value -->
          <div [class]="valueClasses()">
            {{ value() }}
          </div>

          <!-- Title -->
          <div [class]="titleClasses()">
            {{ title() }}
          </div>

          <!-- Optional Description -->
          @if (description()) {
            <div [class]="descriptionClasses()">
              {{ description() }}
            </div>
          }

          <!-- Optional Trend -->
          @if (trend()) {
            <div [class]="trendClasses()">
              <i [class]="trendIconClasses()"></i>
              <span class="trend-value">{{ trend()!.value }}%</span>
              @if (trend()!.label) {
                <span class="trend-label">{{ trend()!.label }}</span>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .stats-card {
        position: relative;
        background: var(--color-surface);
        border: var(--border-width-1) solid var(--color-border);
        border-radius: var(--border-radius-xl);
        box-shadow: var(--shadow-sm);
        transition:
          var(--transition-colors),
          box-shadow var(--transition-duration-200) var(--transition-timing-in-out);
        overflow: hidden;

        &:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--color-border-dark);
        }

        /* Size variants */
        &.size-sm {
          --card-padding: var(--spacing-4);
          --icon-size: var(--spacing-8);
          --value-font-size: var(--font-size-xl);
        }

        &.size-md {
          --card-padding: var(--spacing-5);
          --icon-size: var(--spacing-10);
          --value-font-size: var(--font-size-2xl);
        }

        &.size-lg {
          --card-padding: var(--spacing-6);
          --icon-size: var(--spacing-12);
          --value-font-size: var(--font-size-3xl);
        }
      }

      .stats-card-content {
        padding: var(--card-padding);
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-4);
      }

      .icon-container {
        flex-shrink: 0;
      }

      .icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--icon-size);
        height: var(--icon-size);
        border-radius: var(--border-radius-lg);
        transition: var(--transition-colors);

        /* Color variants */
        &.primary {
          background-color: rgba(59, 130, 246, 0.1);
          color: var(--color-primary-600);
        }

        &.success {
          background-color: rgba(34, 197, 94, 0.1);
          color: var(--color-success-600);
        }

        &.warning {
          background-color: rgba(245, 158, 11, 0.1);
          color: var(--color-warning-600);
        }

        &.danger {
          background-color: rgba(239, 68, 68, 0.1);
          color: var(--color-error-600);
        }

        &.info {
          background-color: rgba(6, 182, 212, 0.1);
          color: var(--color-info-600);
        }

        &.purple {
          background-color: rgba(147, 51, 234, 0.1);
          color: #7c3aed;
        }

        &.gray {
          background-color: rgba(107, 114, 128, 0.1);
          color: var(--color-gray-600);
        }
      }

      .icon {
        font-size: calc(var(--icon-size) * 0.5);
      }

      .stats-section {
        flex: 1;
        min-width: 0;
      }

      .value {
        font-size: var(--value-font-size);
        font-weight: var(--font-weight-bold);
        line-height: var(--line-height-tight);
        color: var(--color-text-primary);
        margin-bottom: var(--spacing-1);
      }

      .title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        line-height: var(--line-height-normal);
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-1);
      }

      .description {
        font-size: var(--font-size-xs);
        line-height: var(--line-height-normal);
        color: var(--color-text-muted);
        margin-bottom: var(--spacing-2);
      }

      .trend {
        display: flex;
        align-items: center;
        gap: var(--spacing-1);
        font-size: var(--font-size-xs);
        margin-top: var(--spacing-2);

        &.positive {
          color: var(--color-success-600);
        }

        &.negative {
          color: var(--color-error-600);
        }

        .trend-icon {
          font-size: var(--font-size-xs);
        }

        .trend-value {
          font-weight: var(--font-weight-medium);
        }

        .trend-label {
          color: var(--color-text-muted);
        }
      }

      /* Responsive design */
      @media (max-width: 640px) {
        .stats-card {
          &.size-md {
            --card-padding: var(--spacing-4);
            --icon-size: var(--spacing-8);
            --value-font-size: var(--font-size-xl);
          }

          &.size-lg {
            --card-padding: var(--spacing-5);
            --icon-size: var(--spacing-10);
            --value-font-size: var(--font-size-2xl);
          }
        }

        .stats-card-content {
          gap: var(--spacing-3);
        }
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .stats-card {
          border-width: var(--border-width-2);
        }

        .icon-wrapper {
          border: var(--border-width-1) solid currentColor;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .stats-card {
          transition: none;
        }

        .icon-wrapper {
          transition: none;
        }
      }
    `,
  ],
})
export class StatsCardComponent {
  // Input signals
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input.required<string>();
  readonly iconColor = input<StatsCardColorVariant>('primary');
  readonly size = input<StatsCardSize>('md');
  readonly description = input<string | undefined>(undefined);
  readonly trend = input<StatsCardData['trend'] | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined);

  // Computed properties
  readonly effectiveAriaLabel = computed(() => {
    const baseLabel = this.ariaLabel() || `${this.title()}: ${this.value()}`;
    const trendData = this.trend();

    if (trendData) {
      const trendText = trendData.isPositive ? 'increased' : 'decreased';
      return `${baseLabel}, ${trendText} by ${trendData.value}%${trendData.label ? ` ${trendData.label}` : ''}`;
    }

    return baseLabel;
  });

  readonly cardClasses = computed(() => {
    return ['stats-card', `size-${this.size()}`].join(' ');
  });

  readonly iconWrapperClasses = computed(() => {
    return ['icon-wrapper', this.iconColor()].join(' ');
  });

  readonly iconClasses = computed(() => {
    return ['icon', this.icon()].join(' ');
  });

  readonly valueClasses = computed(() => 'value');

  readonly titleClasses = computed(() => 'title');

  readonly descriptionClasses = computed(() => 'description');

  readonly trendClasses = computed(() => {
    const trendData = this.trend();
    if (!trendData) return 'trend';

    return ['trend', trendData.isPositive ? 'positive' : 'negative'].join(' ');
  });

  readonly trendIconClasses = computed(() => {
    const trendData = this.trend();
    if (!trendData) return 'trend-icon pi pi-arrow-up';

    return ['trend-icon', trendData.isPositive ? 'pi pi-arrow-up' : 'pi pi-arrow-down'].join(' ');
  });
}
