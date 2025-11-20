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
 * Tool Management Card Component
 *
 * A card component for displaying and managing Tool entities in the admin tools settings page.
 * This is separate from ToolCardComponent which handles ToolRegistryRecord entities.
 *
 * @example
 * ```html
 * <app-tool-management-card
 *   [tool]="tool"
 *   [selected]="false"
 *   [updating]="false"
 *   [showSelection]="true"
 *   [showActions]="true"
 *   (toggleStatus)="onToggleStatus($event)"
 *   (toggleSelection)="onToggleSelection($event)"
 *   (viewDetails)="onViewDetails($event)"
 *   (configure)="onConfigure($event)"
 *   (delete)="onDelete($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-tool-management-card',
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
  styleUrl: './tool-management-card.component.scss',
})
export class ToolManagementCardComponent {
  // Input signals
  readonly tool = input.required<Tool>();
  readonly selected = input<boolean>(false);
  readonly updating = input<boolean>(false);
  readonly showSelection = input<boolean>(true);
  readonly showActions = input<boolean>(true);

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
