import { Component, ChangeDetectionStrategy, input, output, signal, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

export type StatusFilterValue = 'all' | 'active' | 'inactive';

export interface BulkAction {
  label: string;
  icon: string;
  severity: 'success' | 'danger' | 'info' | 'warning';
  disabled?: boolean;
}

/**
 * Reusable search and filter component with status filters and bulk actions.
 * Can be used across different pages for consistent search/filter UI.
 */
@Component({
  selector: 'app-search-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule],
  templateUrl: './search-filter.component.html',
  styleUrl: './search-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchFilterComponent {
  // Inputs
  searchPlaceholder = input<string>('Search by name, key, or description...');
  showStatusFilter = input<boolean>(true);
  showRefreshButton = input<boolean>(true);
  showBulkActions = input<boolean>(false);
  enableBulkActions = input<BulkAction[]>([]);
  disableBulkActions = input<BulkAction[]>([]);
  selectedCount = input<number>(0);

  // Two-way binding signals
  searchQuery = model<string>('');
  statusFilter = model<StatusFilterValue>('all');

  // Outputs
  refresh = output<void>();
  bulkActionClick = output<'enable' | 'disable'>();
  clearSelection = output<void>();

  /**
   * Clears all search and filter criteria.
   */
  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('all');
  }

  /**
   * Handles refresh button click.
   */
  onRefresh(): void {
    this.refresh.emit();
  }

  /**
   * Handles status filter button changes.
   */
  onStatusFilterChange(filter: StatusFilterValue, event: any): void {
    if (event.checked) {
      this.statusFilter.set(filter);
    } else {
      // If unchecking, default to 'all'
      this.statusFilter.set('all');
    }
  }

  /**
   * Handles bulk enable action.
   */
  onBulkEnable(): void {
    this.bulkActionClick.emit('enable');
  }

  /**
   * Handles bulk disable action.
   */
  onBulkDisable(): void {
    this.bulkActionClick.emit('disable');
  }

  /**
   * Handles clear selection action.
   */
  onClearSelection(): void {
    this.clearSelection.emit();
  }

  /**
   * Checks if any bulk action is available.
   */
  hasBulkActions(): boolean {
    return this.enableBulkActions().length > 0 || this.disableBulkActions().length > 0;
  }
}
