import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Color variants for the action card icon background
 */
export type ActionCardColorVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';

/**
 * Size variants for the action card
 */
export type ActionCardSize = 'sm' | 'md' | 'lg';

/**
 * Configuration interface for action card data
 */
export interface ActionCardData {
  title: string;
  description: string;
  icon: string;
  iconColor: ActionCardColorVariant;
  routerLink?: string;
  disabled?: boolean;
  size?: ActionCardSize;
  ariaLabel?: string;
}

/**
 * ActionCard Component
 *
 * A reusable card component for displaying actionable items with:
 * - Theme-aware design supporting light/dark modes
 * - Responsive design with touch-friendly interactions
 * - Accessibility features including ARIA labels and keyboard navigation
 * - Multiple color variants and size options
 * - Router integration for navigation
 * - Event emission for custom click handling
 *
 * @example
 * ```html
 * <!-- Navigation card -->
 * <app-action-card
 *   [title]="'New Project'"
 *   [description]="'Start a new project with your team.'"
 *   [icon]="'pi pi-plus'"
 *   [iconColor]="'primary'"
 *   [routerLink]="'/projects/new'"
 *   [size]="'md'"
 * />
 *
 * <!-- Custom action card -->
 * <app-action-card
 *   [title]="'Custom Action'"
 *   [description]="'Trigger a custom action.'"
 *   [icon]="'pi pi-cog'"
 *   [iconColor]="'success'"
 *   (cardClick)="handleCustomAction()"
 * />
 * ```
 */
@Component({
  selector: 'app-action-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div
      [class]="cardClasses()"
      [attr.aria-label]="effectiveAriaLabel()"
      [attr.tabindex]="isDisabled() ? -1 : 0"
      [attr.role]="routerLink() ? 'link' : 'button'"
      (click)="handleClick($event)"
      (keydown)="handleKeydown($event)"
    >
      <!-- Router Link Version -->
      @if (routerLink() && !isDisabled()) {
        <a
          [routerLink]="routerLink()"
          class="action-card-link"
          [attr.aria-label]="effectiveAriaLabel()"
          tabindex="-1"
        >
          <div class="action-card-content">
            <!-- Icon Section -->
            <div [class]="iconContainerClasses()">
              <span [class]="iconWrapperClasses()">
                <i [class]="iconClasses()"></i>
              </span>
            </div>

            <!-- Content Section -->
            <div [class]="contentSectionClasses()">
              <h3 [class]="titleClasses()">
                {{ title() }}
              </h3>
              <p [class]="descriptionClasses()">
                {{ description() }}
              </p>
            </div>
          </div>
        </a>
      }

      <!-- Button Version (No Router Link) -->
      @if (!routerLink()) {
        <div class="action-card-content">
          <!-- Icon Section -->
          <div [class]="iconContainerClasses()">
            <span [class]="iconWrapperClasses()">
              <i [class]="iconClasses()"></i>
            </span>
          </div>

          <!-- Content Section -->
          <div [class]="contentSectionClasses()">
            <h3 [class]="titleClasses()">
              {{ title() }}
            </h3>
            <p [class]="descriptionClasses()">
              {{ description() }}
            </p>
          </div>
        </div>
      }

      <!-- Disabled Overlay -->
      @if (isDisabled()) {
        <div class="action-card-disabled-overlay"></div>
      }
    </div>
  `,
  styles: [
    `
      .action-card {
        position: relative;
        display: block;
        width: 100%;
        background-color: var(--color-surface);
        border: var(--border-width-1) solid var(--color-border);
        border-radius: var(--border-radius-lg);
        box-shadow: var(--shadow-sm);
        transition:
          var(--transition-colors),
          box-shadow var(--transition-duration-200) var(--transition-timing-in-out);
        cursor: pointer;
        overflow: hidden;

        &:hover:not(.disabled) {
          border-color: var(--color-border-dark);
          box-shadow: var(--shadow-md);
          transform: translateY(-1px);
        }

        &:focus-visible {
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 2px;
        }

        &.disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Size variants */
        &.size-sm {
          --card-padding: var(--spacing-4);
          --icon-size: var(--spacing-8);
          --icon-padding: var(--spacing-2);
        }

        &.size-md {
          --card-padding: var(--spacing-6);
          --icon-size: var(--spacing-12);
          --icon-padding: var(--spacing-3);
        }

        &.size-lg {
          --card-padding: var(--spacing-8);
          --icon-size: var(--spacing-16);
          --icon-padding: var(--spacing-4);
        }
      }

      .action-card-link {
        display: block;
        text-decoration: none;
        color: inherit;
        height: 100%;
        width: 100%;

        &:focus {
          outline: none;
        }
      }

      .action-card-content {
        padding: var(--card-padding);
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .icon-container {
        margin-bottom: var(--spacing-4);
      }

      .icon-wrapper {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--icon-size);
        height: var(--icon-size);
        border-radius: var(--border-radius-lg);
        transition: var(--transition-colors);

        /* Color variants */
        &.primary {
          background-color: var(--color-primary-600);
          color: var(--color-text-inverse);

          .action-card:hover:not(.disabled) & {
            background-color: var(--color-primary-700);
          }
        }

        &.success {
          background-color: var(--color-success-600);
          color: var(--color-text-inverse);

          .action-card:hover:not(.disabled) & {
            background-color: var(--color-success-700);
          }
        }

        &.warning {
          background-color: var(--color-warning-600);
          color: var(--color-text-inverse);

          .action-card:hover:not(.disabled) & {
            background-color: var(--color-warning-700);
          }
        }

        &.danger {
          background-color: var(--color-error-600);
          color: var(--color-text-inverse);

          .action-card:hover:not(.disabled) & {
            background-color: var(--color-error-700);
          }
        }

        &.info {
          background-color: var(--color-info-600);
          color: var(--color-text-inverse);

          .action-card:hover:not(.disabled) & {
            background-color: var(--color-info-700);
          }
        }
      }

      .icon {
        font-size: var(--font-size-lg);
      }

      .content-section {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .title {
        margin: 0;
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        line-height: var(--line-height-tight);
        color: var(--color-text-primary);
        transition: var(--transition-colors);

        .action-card:hover:not(.disabled) & {
          color: var(--color-text-primary);
        }

        /* Size variants */
        .action-card.size-sm & {
          font-size: var(--font-size-base);
        }

        .action-card.size-lg & {
          font-size: var(--font-size-xl);
        }
      }

      .description {
        margin: var(--spacing-2) 0 0 0;
        font-size: var(--font-size-sm);
        line-height: var(--line-height-relaxed);
        color: var(--color-text-secondary);
        flex: 1;

        /* Size variants */
        .action-card.size-sm & {
          font-size: var(--font-size-xs);
          margin-top: var(--spacing-1);
        }

        .action-card.size-lg & {
          font-size: var(--font-size-base);
          margin-top: var(--spacing-3);
        }
      }

      .action-card-disabled-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--color-surface);
        opacity: 0.7;
        pointer-events: none;
      }

      /* Responsive design */
      @media (max-width: 640px) {
        .action-card {
          &.size-md {
            --card-padding: var(--spacing-4);
            --icon-size: var(--spacing-10);
          }

          &.size-lg {
            --card-padding: var(--spacing-6);
            --icon-size: var(--spacing-12);
          }
        }

        .title {
          font-size: var(--font-size-base);

          .action-card.size-lg & {
            font-size: var(--font-size-lg);
          }
        }
      }

      /* Focus and active states */
      .action-card:active:not(.disabled) {
        transform: translateY(0);
        box-shadow: var(--shadow-sm);
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .action-card {
          border-width: var(--border-width-2);
        }

        .icon-wrapper {
          border: var(--border-width-1) solid transparent;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .action-card {
          transition: none;
        }

        .icon-wrapper {
          transition: none;
        }

        .title {
          transition: none;
        }
      }
    `,
  ],
})
export class ActionCardComponent {
  // Input signals
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly icon = input.required<string>();
  readonly iconColor = input<ActionCardColorVariant>('primary');
  readonly routerLink = input<string | undefined>(undefined);
  readonly disabled = input<boolean>(false);
  readonly size = input<ActionCardSize>('md');
  readonly ariaLabel = input<string | undefined>(undefined);

  // Output signals
  readonly cardClick = output<void>();

  // Computed properties
  readonly isDisabled = computed(() => this.disabled());

  readonly effectiveAriaLabel = computed(() => {
    return this.ariaLabel() || `${this.title()}: ${this.description()}`;
  });

  readonly cardClasses = computed(() => {
    return ['action-card', `size-${this.size()}`, this.isDisabled() ? 'disabled' : '']
      .filter(Boolean)
      .join(' ');
  });

  readonly iconContainerClasses = computed(() => 'icon-container');

  readonly iconWrapperClasses = computed(() => {
    return ['icon-wrapper', this.iconColor()].join(' ');
  });

  readonly iconClasses = computed(() => {
    return ['icon', this.icon()].join(' ');
  });

  readonly contentSectionClasses = computed(() => 'content-section');

  readonly titleClasses = computed(() => 'title');

  readonly descriptionClasses = computed(() => 'description');

  /**
   * Handles click events on the card
   */
  handleClick(event: Event): void {
    if (this.isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // If no router link is provided, emit custom click event
    if (!this.routerLink()) {
      event.preventDefault();
      this.cardClick.emit();
    }
  }

  /**
   * Handles keyboard navigation
   */
  handleKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) {
      return;
    }

    // Handle Enter and Space key presses
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleClick(event);
    }
  }
}
