import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ToolRegistryRecord } from '@nodeangularfullstack/shared';

/**
 * Displays a single tool as a card with icon, name, description, version, and status.
 *
 * This component serves as the fundamental UI building block for the tool registry
 * dashboard, displaying tool metadata with proper styling, status indicators, and
 * interactive states.
 *
 * @example
 * ```html
 * <app-tool-card
 *   [tool]="tool"
 *   [interactive]="true"
 *   (toolClick)="onToolClick($event)"
 * ></app-tool-card>
 * ```
 *
 * @example Loading state
 * ```html
 * <app-tool-card [loading]="true"></app-tool-card>
 * ```
 *
 * @example Empty state
 * ```html
 * <app-tool-card [tool]="null"></app-tool-card>
 * ```
 */
@Component({
  selector: 'app-tool-card',
  standalone: true,
  imports: [CommonModule, CardModule, BadgeModule, ButtonModule, SkeletonModule, TooltipModule],
  templateUrl: './tool-card.component.html',
  styleUrl: './tool-card.component.scss',
})
export class ToolCardComponent {
  /**
   * Tool data to display. If null, shows empty state.
   */
  @Input() tool: ToolRegistryRecord | null = null;

  /**
   * Loading state. When true, displays skeleton placeholders.
   */
  @Input() loading: boolean = false;

  /**
   * Interactive mode. When true, card is clickable and has hover effects.
   */
  @Input() interactive: boolean = true;

  /**
   * Emitted when user clicks the card.
   * Not emitted when loading or interactive is false.
   */
  @Output() toolClick = new EventEmitter<ToolRegistryRecord>();

  /**
   * Emitted when user clicks an action button.
   */
  @Output() actionClick = new EventEmitter<{
    action: string;
    tool: ToolRegistryRecord;
  }>();

  /**
   * Maps tool status to PrimeNG badge severity.
   *
   * Status mapping:
   * - beta → warning (yellow) - Tool in testing phase
   * - active → success (green) - Fully functional tool
   * - deprecated → secondary (gray) - No longer maintained
   * - exported → info (blue) - When is_exported is true
   *
   * @param tool - Tool registry record
   * @returns PrimeNG severity ('success' | 'warning' | 'secondary' | 'info')
   */
  getStatusSeverity(tool?: ToolRegistryRecord | null): 'success' | 'warn' | 'secondary' | 'info' {
    if (!tool) return 'info';

    // Prioritize exported status
    if (tool.is_exported) {
      return 'info';
    }

    // Map ToolStatus enum to severity
    switch (tool.status) {
      case 'active':
        return 'success';
      case 'beta':
        return 'warn'; // PrimeNG uses 'warn' not 'warning'
      case 'deprecated':
        return 'secondary';
      default:
        return 'info';
    }
  }

  /**
   * Converts status to title case for display.
   *
   * @param tool - Tool registry record
   * @returns Title case status (e.g., "Active", "Beta", "Exported")
   */
  getStatusLabel(tool?: ToolRegistryRecord | null): string {
    if (!tool) return 'Unknown';

    // Show "Exported" if tool has been exported
    if (tool.is_exported) {
      return 'Exported';
    }

    // Convert ToolStatus enum to title case
    const status = tool.status || 'unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  /**
   * Gets background color for tool icon based on status.
   *
   * @param tool - Tool registry record
   * @returns CSS color value
   */
  getIconColor(tool?: ToolRegistryRecord | null): string {
    if (!tool) return '#6b7280';

    if (tool.is_exported) {
      return '#3b82f6'; // Blue
    }

    switch (tool.status) {
      case 'active':
        return '#22c55e'; // Green
      case 'beta':
        return '#f59e0b'; // Yellow
      case 'deprecated':
        return '#6b7280'; // Gray
      default:
        return '#6b7280'; // Default gray
    }
  }

  /**
   * Handles card click event.
   * Only emits if interactive and not loading.
   */
  onCardClick(): void {
    if (this.interactive && !this.loading && this.tool) {
      this.toolClick.emit(this.tool);
    }
  }

  /**
   * Handles keyboard events (Enter/Space) for accessibility.
   *
   * @param event - Keyboard event
   */
  onKeyDown(event: KeyboardEvent): void {
    if (this.interactive && !this.loading && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.onCardClick();
    }
  }

  /**
   * Handles action button click.
   *
   * @param action - Action type (e.g., 'export', 'edit', 'delete')
   * @param event - Click event (to stop propagation)
   */
  onActionButtonClick(action: string, event: MouseEvent): void {
    event.stopPropagation(); // Prevent card click
    if (this.tool) {
      this.actionClick.emit({ action, tool: this.tool });
    }
  }
}
