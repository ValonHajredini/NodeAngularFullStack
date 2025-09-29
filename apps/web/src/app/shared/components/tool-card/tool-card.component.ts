import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { TooltipModule } from 'primeng/tooltip';
import { Tool } from '@nodeangularfullstack/shared';

/**
 * Color variants for tool status
 */
export type ToolCardColorVariant = 'active' | 'inactive';

/**
 * Size variants for the tool card
 */
export type ToolCardSize = 'sm' | 'md' | 'lg';

/**
 * Configuration interface for tool card component
 */
export interface ToolCardConfig {
  showSelection?: boolean;
  showActions?: boolean;
  compact?: boolean;
  size?: ToolCardSize;
}

/**
 * Tool Card Component
 *
 * A compact, modern card component for displaying tool information with:
 * - Clean, space-efficient design with 40% less vertical space
 * - Quick status toggle with visual feedback
 * - Selection checkbox for bulk operations
 * - Action buttons for view/configure
 * - Loading states and animations
 * - Full accessibility support
 *
 * @example
 * ```html
 * <app-tool-card
 *   [tool]="tool"
 *   [selected]="false"
 *   [updating]="false"
 *   [showSelection]="true"
 *   [showActions]="true"
 *   (toggleStatus)="onToggleStatus($event)"
 *   (toggleSelection)="onToggleSelection($event)"
 *   (viewDetails)="onViewDetails($event)"
 *   (configure)="onConfigure($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-tool-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    BadgeModule,
    CheckboxModule,
    ChipModule,
    ProgressSpinnerModule,
    ToggleButtonModule,
    TooltipModule,
  ],
  template: `
    <div
      [class]="cardClasses()"
      [attr.aria-label]="ariaLabel()"
      [attr.tabindex]="0"
      [attr.role]="'article'"
      (click)="handleCardClick($event)"
      (keydown)="handleKeydown($event)"
    >
      <!-- Status Badge - Top Right Corner -->
      <p-badge
        [value]="statusText()"
        [severity]="statusSeverity()"
        class="tool-card-status-badge-corner"
      />

      <!-- Header Row: Icon and Title -->
      <div class="tool-card-header">
        <!-- Tool Icon -->
        <div class="tool-card-icon">
          <i [class]="toolIcon()" [style.color]="iconColor()"></i>
        </div>

        <!-- Tool Title -->
        <h3 class="tool-card-title">{{ tool().name }}</h3>
      </div>

      <!-- Tool Key Chip -->
      <div class="tool-card-key">
        <p-chip [label]="tool().key" icon="pi pi-tag" styleClass="tool-key-chip" />
      </div>

      <!-- Dates Row -->
      <div class="tool-card-middle">
        <div class="tool-card-dates">
          <span class="metadata-item">
            <i class="pi pi-calendar text-xs"></i>
            <span>{{ tool().createdAt | date: 'MMM d' }}</span>
          </span>
          <span class="metadata-item">
            <i class="pi pi-clock text-xs"></i>
            <span>{{ tool().updatedAt | date: 'MMM d' }}</span>
          </span>
        </div>
      </div>

      <!-- Action Buttons Footer -->
      <div class="tool-card-footer">
        <!-- Status Toggle Button (smaller) -->
        <p-toggleButton
          [ngModel]="tool().active"
          (ngModelChange)="onToggleStatus($event)"
          (click)="$event.stopPropagation()"
          [disabled]="updating()"
          onLabel="On"
          offLabel="Off"
          onIcon="pi pi-check"
          offIcon="pi pi-times"
          class="status-toggle-button-small"
        />

        @if (showActions()) {
          <p-button
            icon="pi pi-eye"
            [text]="true"
            [rounded]="true"
            size="small"
            severity="secondary"
            pTooltip="View details"
            (onClick)="onViewDetails(); $event.stopPropagation()"
            [disabled]="updating()"
          />
          <p-button
            icon="pi pi-cog"
            [text]="true"
            [rounded]="true"
            size="small"
            severity="secondary"
            pTooltip="Configure"
            (onClick)="onConfigure(); $event.stopPropagation()"
            [disabled]="updating()"
          />
          <p-button
            icon="pi pi-trash"
            [text]="true"
            [rounded]="true"
            size="small"
            severity="danger"
            pTooltip="Delete tool"
            (onClick)="onDelete(); $event.stopPropagation()"
            [disabled]="updating()"
          />
        }
      </div>

      <!-- Loading Indicator -->
      @if (updating()) {
        <div class="tool-card-loading">
          <p-progressSpinner styleClass="w-4 h-4" strokeWidth="6" animationDuration="1s" />
        </div>
      }
    </div>
  `,
  styles: [
    `
      .tool-card {
        position: relative;
        background: var(--color-surface);
        border: 1px solid var(--color-border-light);
        border-radius: 12px;
        padding: 1rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        min-height: 140px;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        box-shadow: var(--shadow-base);
        width: 100%;

        &:hover:not(.updating) {
          border-color: var(--color-primary-500);
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        &.selected {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        &.updating {
          opacity: 0.7;
          pointer-events: none;
        }

        &:focus-visible {
          outline: 2px solid var(--color-primary-500);
          outline-offset: 2px;
        }
      }

      .tool-card-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .tool-card-checkbox {
        flex-shrink: 0;
      }

      .tool-card-icon {
        flex-shrink: 0;
        width: 2.5rem;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-gray-50);
        border: 1px solid var(--color-border-light);
        border-radius: 8px;
        box-shadow: var(--shadow-sm);

        i {
          font-size: 1.125rem;
        }
      }

      .tool-card-title {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-text-primary);
        line-height: 1.3;
        word-wrap: break-word;
        overflow-wrap: break-word;
        flex: 1;
      }

      .tool-card-status-badge-corner {
        position: absolute;
        top: 0.4rem;
        right: 0.4rem;
        z-index: 10;
      }

      .tool-card-key {
        margin-bottom: 0.75rem;

        ::ng-deep .tool-key-chip {
          height: 1.5rem;
          background: var(--color-gray-100);
          border: 1px solid var(--color-border-light);

          .p-chip-text {
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--color-text-secondary);
          }

          .p-chip-icon {
            color: var(--color-text-muted);
            font-size: 0.675rem;
          }
        }
      }

      .tool-card-metadata {
        display: flex;
        gap: 1.5rem;
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--color-border-light);
      }

      .metadata-item {
        display: flex;
        align-items: center;
        gap: 0.375rem;

        i {
          color: var(--color-text-muted);
        }
      }

      .tool-card-middle {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        margin-top: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .tool-card-dates {
        display: flex;
        gap: 1rem;
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }

      .tool-card-footer {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        margin-top: auto;
        padding-top: 0.75rem;
        border-top: 1px solid var(--color-border-light);
      }

      .tool-card-loading {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: var(--color-surface);
        border-radius: 50%;
        padding: 0.5rem;
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--color-border-light);
      }

      /* Status badge styling */
      ::ng-deep .tool-card-status-badge-corner {
        .p-badge {
          font-size: 0.6875rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .p-badge-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
        }

        .p-badge-secondary {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          color: #ffffff;
          box-shadow: 0 2px 4px rgba(107, 114, 128, 0.3);
        }
      }

      /* Checkbox styling */
      ::ng-deep .tool-card-checkbox {
        .p-checkbox-box {
          width: 1.125rem;
          height: 1.125rem;
          border-radius: 4px;
          border: 2px solid var(--color-border);
          transition: all 0.2s ease;

          &:hover {
            border-color: var(--color-primary-500);
          }
        }

        .p-checkbox-icon {
          font-size: 0.75rem;
          color: var(--color-text-inverse);
        }

        &.p-checkbox-checked .p-checkbox-box {
          background: var(--color-primary-600);
          border-color: var(--color-primary-600);
          box-shadow: 0 1px 2px rgba(59, 130, 246, 0.3);
        }
      }

      /* Toggle button styling */
      ::ng-deep .status-toggle-button {
        .p-togglebutton {
          border-radius: 6px;
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 500;
          border: 1px solid var(--color-border);
          transition: all 0.2s ease;
          min-width: 70px;
          height: 32px;

          &:not(.p-disabled):hover {
            border-color: var(--color-primary-500);
            transform: translateY(-1px);
            box-shadow: var(--shadow-sm);
          }

          &:not(.p-disabled):focus {
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
            outline: none;
          }

          .p-button-label {
            font-size: 0.75rem;
            font-weight: 500;
          }

          .p-button-icon {
            font-size: 0.75rem;
          }
        }

        /* Enabled state */
        .p-togglebutton.p-togglebutton-checked {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-color: #10b981;
          color: #ffffff;
          box-shadow: 0 1px 2px rgba(16, 185, 129, 0.3);
        }

        /* Disabled state */
        .p-togglebutton:not(.p-togglebutton-checked) {
          background: var(--color-gray-50);
          border-color: var(--color-border-light);
          color: var(--color-text-secondary);
        }
      }

      /* Small toggle button styling for footer */
      ::ng-deep .status-toggle-button-small {
        .p-togglebutton {
          border-radius: 6px;
          padding: 0.1rem !important;
          font-size: 0.5rem !important;
          font-weight: 500;
          border: 1px solid var(--color-border);
          transition: all 0.2s ease;
          width: 2rem !important;
          min-width: 2rem !important;
          max-width: 2rem;
          height: 2rem !important;
          max-height: 2rem;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;

          &:not(.p-disabled):hover {
            border-color: var(--color-primary-500);
            transform: translateY(-1px);
            box-shadow: var(--shadow-sm);
          }

          &:not(.p-disabled):focus {
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
            outline: none;
          }

          .p-button-label {
            font-size: 0.5rem !important;
            font-weight: 500;
            line-height: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin: 0;
            padding: 0;
          }

          .p-button-icon {
            font-size: 0.5rem !important;
            line-height: 1;
            margin: 0;
          }

          /* Ensure proper spacing between icon and label */
          .p-button-icon + .p-button-label {
            margin-left: 0.15rem;
          }
        }

        /* Enabled state */
        .p-togglebutton.p-togglebutton-checked {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-color: #10b981;
          color: #ffffff;
          box-shadow: 0 1px 2px rgba(16, 185, 129, 0.3);
        }

        /* Disabled state */
        .p-togglebutton:not(.p-togglebutton-checked) {
          background: var(--color-gray-50);
          border-color: var(--color-border-light);
          color: var(--color-text-secondary);
        }
      }

      /* Code path button styling */
      ::ng-deep .code-path-button {
        .p-button {
          width: 2rem;
          height: 2rem;
          border-radius: 4px;
          border: 1px solid var(--color-border-light);
          background: var(--color-gray-50);
          color: var(--color-text-secondary);
          transition: all 0.2s ease;

          &:hover {
            background: var(--color-gray-100);
            border-color: var(--color-border);
            color: var(--color-text-primary);
            transform: translateY(-1px);
            box-shadow: var(--shadow-sm);
          }

          .p-button-icon {
            font-size: 0.75rem;
          }
        }
      }

      /* Action buttons styling - now in footer */
      ::ng-deep .tool-card-footer {
        .p-button {
          width: 2rem;
          height: 2rem;
          border-radius: 6px;
          border: 1px solid var(--color-border-light);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          transition: all 0.2s ease;

          &:hover {
            background: var(--color-gray-50);
            border-color: var(--color-primary-500);
            color: var(--color-primary-500);
            transform: translateY(-1px);
            box-shadow: var(--shadow-sm);
          }

          .p-button-icon {
            font-size: 0.75rem;
          }
        }

        /* Special styling for delete button */
        .p-button.p-button-danger:hover {
          border-color: var(--color-error-500);
          color: var(--color-error-500);
        }
      }

      /* Responsive adjustments */
      @media (max-width: 640px) {
        .tool-card {
          padding: 1rem;
          gap: 0.5rem;
          min-height: 110px;
        }

        .tool-card-header {
          margin-bottom: 0.5rem;
          gap: 0.5rem;
        }

        .tool-card-status-badge-corner {
          top: 0.75rem;
          right: 0.75rem;
        }

        .tool-card-icon {
          width: 2rem;
          height: 2rem;

          i {
            font-size: 1rem;
          }
        }

        .tool-card-title {
          font-size: 0.875rem;
        }

        .tool-card-key {
          margin-bottom: 0.5rem;
        }

        .tool-card-middle {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          gap: 0.5rem;
        }

        .tool-card-dates {
          font-size: 0.6875rem;
          gap: 0.75rem;
        }

        .tool-card-footer {
          padding-top: 0.5rem;
          gap: 0.375rem;
        }

        .tool-card-footer .p-button {
          width: 1.75rem;
          height: 1.75rem;
        }

        /* Small toggle button responsive */
        .status-toggle-button-small .p-togglebutton {
          width: 1.75rem !important;
          min-width: 1.75rem !important;
          max-width: 1.75rem;
          height: 1.75rem !important;
          max-height: 1.75rem;
          padding: 0.1rem !important;

          .p-button-label {
            font-size: 0.45rem !important;
            line-height: 1;
          }

          .p-button-icon {
            font-size: 0.45rem !important;
            line-height: 1;
          }

          .p-button-icon + .p-button-label {
            margin-left: 0.1rem;
          }
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .tool-card {
          transition: none;
        }

        .toggle-label {
          transition: none;
        }
      }

      /* High contrast mode */
      @media (prefers-contrast: high) {
        .tool-card {
          border-width: 2px;
        }

        .tool-card-icon {
          border: 1px solid var(--surface-border);
        }
      }
    `,
  ],
})
export class ToolCardComponent {
  // Input signals
  readonly tool = input.required<Tool>();
  readonly selected = input<boolean>(false);
  readonly updating = input<boolean>(false);
  readonly showSelection = input<boolean>(true);
  readonly showActions = input<boolean>(true);
  readonly size = input<ToolCardSize>('md');

  // Output signals
  readonly toggleStatus = output<boolean>();
  readonly toggleSelection = output<boolean>();
  readonly viewDetails = output<Tool>();
  readonly configure = output<Tool>();
  readonly delete = output<Tool>();
  readonly cardClick = output<Tool>();

  // Computed properties
  readonly statusText = computed(() => (this.tool().active ? 'Active' : 'Inactive'));

  readonly statusSeverity = computed(() => (this.tool().active ? 'success' : 'secondary'));

  readonly toolIcon = computed(() => {
    const tool = this.tool();
    if (tool.icon) return tool.icon;

    // Default icon mapping based on tool key
    const iconMap: Record<string, string> = {
      'short-link': 'pi pi-link',
      'url-shortener': 'pi pi-link',
      'file-manager': 'pi pi-folder',
      'text-editor': 'pi pi-file-edit',
      calculator: 'pi pi-calculator',
      'password-generator': 'pi pi-key',
      'qr-code': 'pi pi-qrcode',
      'image-editor': 'pi pi-image',
      'color-picker': 'pi pi-palette',
      'json-formatter': 'pi pi-code',
      'base64-encoder': 'pi pi-lock',
      'regex-tester': 'pi pi-search',
      calendar: 'pi pi-calendar',
      map: 'pi pi-map',
      mark: 'pi pi-bookmark',
      'my-todo-app': 'pi pi-list',
      calc: 'pi pi-calculator',
    };

    return iconMap[tool.key] || 'pi pi-wrench';
  });

  readonly iconColor = computed(() => {
    const tool = this.tool();
    if (!tool.active) return 'var(--surface-400)';

    // Color mapping based on category or key
    const colorMap: Record<string, string> = {
      productivity: 'var(--blue-600)',
      utility: 'var(--green-600)',
      communication: 'var(--purple-600)',
      data: 'var(--orange-600)',
    };

    return colorMap[tool.category || 'utility'] || 'var(--primary-600)';
  });

  readonly cardClasses = computed(() => {
    const classes = ['tool-card'];
    if (this.selected()) classes.push('selected');
    if (this.updating()) classes.push('updating');
    return classes.join(' ');
  });

  readonly ariaLabel = computed(() => {
    const tool = this.tool();
    return `${tool.name} tool, ${tool.active ? 'active' : 'inactive'}, ${tool.description}`;
  });

  /**
   * Handle status toggle
   */
  onToggleStatus(active: boolean): void {
    this.toggleStatus.emit(active);
  }

  /**
   * Handle selection toggle
   */
  onToggleSelection(selected: boolean): void {
    this.toggleSelection.emit(selected);
  }

  /**
   * Handle view details action
   */
  onViewDetails(): void {
    this.viewDetails.emit(this.tool());
  }

  /**
   * Handle configure action
   */
  onConfigure(): void {
    this.configure.emit(this.tool());
  }

  /**
   * Handle delete action
   */
  onDelete(): void {
    this.delete.emit(this.tool());
  }

  /**
   * Handle card click (for details view)
   */
  handleCardClick(event: Event): void {
    // Don't trigger on interactive elements
    const target = event.target as HTMLElement;
    if (target.closest('p-checkbox') || target.closest('p-button')) {
      return;
    }
    this.cardClick.emit(this.tool());
  }

  /**
   * Handle keyboard navigation
   */
  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.cardClick.emit(this.tool());
    }
  }
}
