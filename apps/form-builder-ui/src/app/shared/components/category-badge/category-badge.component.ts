/**
 * Category Badge Component
 *
 * Reusable badge component for displaying template category labels with icons.
 * Used across analytics views and template selection wizard.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.8: Product, Appointment, and Restaurant Analytics Components (Frontend)
 *
 * @since 2025-01-27
 */

import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Category display configuration mapping categories to labels, icons, and colors.
 */
const CATEGORY_CONFIG: Record<
  TemplateCategory,
  { label: string; icon: string; colorClass: string; bgClass: string }
> = {
  polls: {
    label: 'Poll',
    icon: 'pi pi-chart-bar',
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-100',
  },
  quiz: {
    label: 'Quiz',
    icon: 'pi pi-question-circle',
    colorClass: 'text-purple-700',
    bgClass: 'bg-purple-100',
  },
  ecommerce: {
    label: 'E-Commerce',
    icon: 'pi pi-shopping-cart',
    colorClass: 'text-green-700',
    bgClass: 'bg-green-100',
  },
  services: {
    label: 'Services',
    icon: 'pi pi-calendar',
    colorClass: 'text-orange-700',
    bgClass: 'bg-orange-100',
  },
  data_collection: {
    label: 'Data Collection',
    icon: 'pi pi-database',
    colorClass: 'text-indigo-700',
    bgClass: 'bg-indigo-100',
  },
  events: {
    label: 'Events',
    icon: 'pi pi-ticket',
    colorClass: 'text-pink-700',
    bgClass: 'bg-pink-100',
  },
};

/**
 * Reusable badge component for displaying category labels.
 *
 * **Features:**
 * - Consistent styling across application
 * - Category-specific icons and colors
 * - Support for optional sizes (small, medium, large)
 * - Accessibility-compliant with aria-label
 * - Responsive design
 *
 * **Category Mapping:**
 * - polls → Blue badge with chart-bar icon
 * - quiz → Purple badge with question-circle icon
 * - ecommerce → Green badge with shopping-cart icon
 * - services → Orange badge with calendar icon
 * - data_collection → Indigo badge with database icon
 * - events → Pink badge with ticket icon
 *
 * @example Basic Usage
 * ```html
 * <app-category-badge [category]="'polls'" />
 * ```
 *
 * @example With Size
 * ```html
 * <app-category-badge [category]="'ecommerce'" [size]="'large'" />
 * ```
 *
 * @example In List
 * ```html
 * @for (form of forms(); track form.id) {
 *   <div class="form-card">
 *     <app-category-badge [category]="form.category" />
 *     <h3>{{ form.title }}</h3>
 *   </div>
 * }
 * ```
 */
@Component({
  selector: 'app-category-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <span
      class="category-badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all duration-200"
      [class]="badgeClasses()"
      [attr.aria-label]="ariaLabel()"
      role="status"
    >
      <i [class]="config().icon" aria-hidden="true"></i>
      <span>{{ config().label }}</span>
    </span>
  `,
  styles: [
    `
      .category-badge {
        border: 1px solid transparent;
        white-space: nowrap;
      }

      .category-badge:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      /* Size variations */
      .badge-small {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
      }

      .badge-small i {
        font-size: 0.75rem;
      }

      .badge-medium {
        font-size: 0.875rem;
        padding: 0.375rem 0.75rem;
      }

      .badge-medium i {
        font-size: 0.875rem;
      }

      .badge-large {
        font-size: 1rem;
        padding: 0.5rem 1rem;
      }

      .badge-large i {
        font-size: 1rem;
      }
    `,
  ],
})
export class CategoryBadgeComponent {
  /** Template category to display */
  category = input.required<TemplateCategory>();

  /** Optional size variant (default: medium) */
  size = input<'small' | 'medium' | 'large'>('medium');

  /**
   * Get category configuration (label, icon, colors).
   */
  config = computed(() => CATEGORY_CONFIG[this.category()]);

  /**
   * Compute badge CSS classes based on category and size.
   */
  badgeClasses = computed(() => {
    const config = this.config();
    const sizeClass = `badge-${this.size()}`;
    return `${config.colorClass} ${config.bgClass} ${sizeClass}`;
  });

  /**
   * Generate accessible aria-label for badge.
   */
  ariaLabel = computed(() => `Category: ${this.config().label}`);
}
