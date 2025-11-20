import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Color variants for the statistics card
 */
export type StatsCardColorVariant = 'success' | 'danger' | 'info' | 'warning' | 'primary';

/**
 * Size variants for the statistics card
 */
export type StatsCardSize = 'sm' | 'md' | 'lg';

/**
 * Configuration interface for statistics card data (tools-settings style)
 */
export interface StatsCardConfig {
  label: string;
  value: number | string;
  icon: string;
  colorVariant: StatsCardColorVariant;
  borderColor?: string;
  iconColor?: string;
}

/**
 * Legacy interface for dashboard compatibility
 */
export interface StatsCardData {
  title: string;
  value: number | string;
  icon: string;
  iconColor: StatsCardColorVariant | string;
  ariaLabel?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
}

/**
 * StatsCard Component
 *
 * A reusable card component for displaying statistics with:
 * - Configurable color themes and icons
 * - Responsive design with consistent styling
 * - Left border accent matching the theme
 * - Signal-based reactive properties
 * - Accessibility features
 * - Matches the tools-settings page design
 *
 * @example
 * ```html
 * <!-- Success variant -->
 * <app-stats-card
 *   [label]="'Active Tools'"
 *   [value]="6"
 *   [icon]="'pi pi-check-circle'"
 *   [colorVariant]="'success'"
 * />
 *
 * <!-- With custom colors -->
 * <app-stats-card
 *   [label]="'Total Users'"
 *   [value]="1250"
 *   [icon]="'pi pi-users'"
 *   [colorVariant]="'info'"
 *   [borderColor]="'#3b82f6'"
 *   [iconColor]="'#3b82f6'"
 * />
 * ```
 */
@Component({
  selector: 'app-stats-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="bg-white p-4 rounded-lg shadow border-l-4" [ngStyle]="borderStyles()">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <i [class]="iconClasses()" [ngStyle]="iconStyles()"></i>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-gray-500">{{ displayText() }}</p>
          <p class="text-lg font-semibold text-gray-900">{{ value() }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class StatsCardComponent {
  /**
   * The label text displayed in the card (tools-settings style)
   */
  readonly label = input<string>();

  /**
   * The title text displayed in the card (dashboard style)
   */
  readonly title = input<string>();

  /**
   * The value/number displayed in the card
   */
  readonly value = input.required<number | string>();

  /**
   * The PrimeIcons class for the icon
   */
  readonly icon = input.required<string>();

  /**
   * The color variant theme for the card (tools-settings style)
   */
  readonly colorVariant = input<StatsCardColorVariant>();

  /**
   * Optional custom border color (overrides theme color)
   */
  readonly borderColor = input<string>();

  /**
   * Optional custom icon color (overrides theme color)
   */
  readonly iconColor = input<StatsCardColorVariant | string>();

  /**
   * The size variant for the card
   */
  readonly size = input<StatsCardSize>('md');

  /**
   * Trend data for dashboard compatibility
   */
  readonly trend = input<StatsCardData['trend'] | undefined>(undefined);

  /**
   * Accessibility label
   */
  readonly ariaLabel = input<string>();

  /**
   * Computed icon classes combining the icon and base classes
   */
  readonly iconClasses = computed(() => {
    return `${this.icon()} text-xl`;
  });

  /**
   * Computed border styles based on color variant or custom color
   */
  readonly borderStyles = computed(() => {
    const customColor = this.borderColor();
    if (customColor) {
      return { 'border-left-color': customColor };
    }

    const colorVariant = this.colorVariant();
    if (colorVariant) {
      const variantColors: Record<StatsCardColorVariant, string> = {
        success: '#10b981', // green-500
        danger: '#ef4444', // red-500
        info: '#3b82f6', // blue-500
        warning: '#f59e0b', // amber-500
        primary: '#6366f1', // indigo-500
      };

      return { 'border-left-color': variantColors[colorVariant] };
    }

    return { 'border-left-color': '#6366f1' }; // default primary color
  });

  /**
   * Computed display text (label or title)
   */
  readonly displayText = computed(() => {
    return this.label() || this.title() || '';
  });

  /**
   * Computed icon styles based on color variant or custom color
   */
  readonly iconStyles = computed(() => {
    const customColor = this.iconColor();
    if (customColor) {
      // Handle both string colors and color variants
      if (typeof customColor === 'string' && customColor.startsWith('#')) {
        return { color: customColor };
      }

      const variantColors: Record<StatsCardColorVariant, string> = {
        success: '#10b981', // green-500
        danger: '#ef4444', // red-500
        info: '#3b82f6', // blue-500
        warning: '#f59e0b', // amber-500
        primary: '#6366f1', // indigo-500
      };

      return { color: variantColors[customColor as StatsCardColorVariant] || customColor };
    }

    const colorVariant = this.colorVariant();
    if (colorVariant) {
      const variantColors: Record<StatsCardColorVariant, string> = {
        success: '#10b981', // green-500
        danger: '#ef4444', // red-500
        info: '#3b82f6', // blue-500
        warning: '#f59e0b', // amber-500
        primary: '#6366f1', // indigo-500
      };

      return { color: variantColors[colorVariant] };
    }

    return { color: '#6366f1' }; // default primary color
  });
}
