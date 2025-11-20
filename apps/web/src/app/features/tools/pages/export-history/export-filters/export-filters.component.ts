import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';

/**
 * Filter option interface for dropdown selections.
 */
interface FilterOption {
  label: string;
  value: string;
}

/**
 * Export Filters Component (Epic 33.2.3, Task 7)
 *
 * Presentational component for filtering export jobs list.
 * Provides UI controls for status, tool type, and date range filtering.
 *
 * **Design Pattern: Presentational Component**
 * - No business logic or API calls
 * - Pure data binding and event emission
 * - Receives current filter state via @Input()
 * - Emits filter changes via @Output()
 * - OnPush change detection for optimal performance
 *
 * **Filter Controls:**
 * - Status filter: Multi-select dropdown (pending, in_progress, completed, failed, cancelled)
 * - Tool type filter: Single-select dropdown (form-builder, survey, calculator, etc.)
 * - Date range filter: Calendar picker for start and end dates
 * - Clear all filters button
 *
 * @example
 * ```html
 * <app-export-filters
 *   [statusFilter]="statusFilter()"
 *   [toolTypeFilter]="toolTypeFilter()"
 *   [startDate]="startDate()"
 *   [endDate]="endDate()"
 *   (filterChange)="onFilterChange($event)"
 *   (clearFilters)="onClearFilters()"
 * />
 * ```
 */
@Component({
  selector: 'app-export-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    MultiSelectModule,
    DatePickerModule,
    ButtonModule,
  ],
  templateUrl: './export-filters.component.html',
  styleUrls: ['./export-filters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportFiltersComponent {
  /**
   * Current status filter value (comma-separated list).
   * Example: 'completed,failed'
   */
  @Input() set statusFilter(value: string | null) {
    if (value) {
      this.selectedStatuses.set(value.split(',').map((s) => s.trim()));
    } else {
      this.selectedStatuses.set([]);
    }
  }

  /**
   * Current tool type filter value.
   * Example: 'form-builder'
   */
  @Input() set toolTypeFilter(value: string | null) {
    this.selectedToolType.set(value);
  }

  /**
   * Current start date filter value (ISO 8601 string).
   */
  @Input() set startDate(value: string | null) {
    this.selectedStartDate.set(value ? new Date(value) : null);
  }

  /**
   * Current end date filter value (ISO 8601 string).
   */
  @Input() set endDate(value: string | null) {
    this.selectedEndDate.set(value ? new Date(value) : null);
  }

  /**
   * Emitted when any filter value changes.
   * Parent container handles API call with updated filters.
   */
  @Output() filterChange = new EventEmitter<{
    status?: string | null;
    toolType?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }>();

  /**
   * Emitted when user clicks "Clear All Filters" button.
   * Parent container resets all filter state.
   */
  @Output() clearFilters = new EventEmitter<void>();

  // ===== Local State Signals =====

  /**
   * Selected status values for multi-select.
   * Array of status strings.
   */
  selectedStatuses = signal<string[]>([]);

  /**
   * Selected tool type value for dropdown.
   */
  selectedToolType = signal<string | null>(null);

  /**
   * Selected start date for calendar.
   */
  selectedStartDate = signal<Date | null>(null);

  /**
   * Selected end date for calendar.
   */
  selectedEndDate = signal<Date | null>(null);

  // ===== Filter Options =====

  /**
   * Available status options for multi-select.
   */
  statusOptions: FilterOption[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Failed', value: 'failed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  /**
   * Available tool type options for dropdown.
   * TODO: These should ideally come from the backend API to stay in sync with tool registry.
   */
  toolTypeOptions: FilterOption[] = [
    { label: 'All Tool Types', value: '' },
    { label: 'Form Builder', value: 'form-builder' },
    { label: 'Survey Tool', value: 'survey' },
    { label: 'Calculator', value: 'calculator' },
    { label: 'Chart Generator', value: 'chart-generator' },
    { label: 'Data Table', value: 'data-table' },
  ];

  /**
   * Handle status multi-select change.
   * Converts array to comma-separated string and emits filterChange.
   *
   * @param statuses - Selected status values array
   */
  onStatusChange(statuses: string[]): void {
    const statusFilter = statuses.length > 0 ? statuses.join(',') : null;
    this.filterChange.emit({ status: statusFilter });
  }

  /**
   * Handle tool type dropdown change.
   * Emits filterChange with selected tool type or null if cleared.
   *
   * @param toolType - Selected tool type value
   */
  onToolTypeChange(toolType: string | null): void {
    const filter = toolType && toolType.trim().length > 0 ? toolType : null;
    this.filterChange.emit({ toolType: filter });
  }

  /**
   * Handle start date calendar change.
   * Converts Date to ISO 8601 string and emits filterChange.
   *
   * @param date - Selected start date
   */
  onStartDateChange(date: Date | null): void {
    const startDate = date ? date.toISOString() : null;
    this.filterChange.emit({ startDate });
  }

  /**
   * Handle end date calendar change.
   * Converts Date to ISO 8601 string and emits filterChange.
   *
   * @param date - Selected end date
   */
  onEndDateChange(date: Date | null): void {
    const endDate = date ? date.toISOString() : null;
    this.filterChange.emit({ endDate });
  }

  /**
   * Handle "Clear All Filters" button click.
   * Resets all local state and emits clearFilters event.
   */
  onClearAllClick(): void {
    this.selectedStatuses.set([]);
    this.selectedToolType.set(null);
    this.selectedStartDate.set(null);
    this.selectedEndDate.set(null);
    this.clearFilters.emit();
  }

  /**
   * Check if any filters are currently active.
   * Used to conditionally show "Clear All" button.
   *
   * @returns True if any filter has a non-empty value
   */
  hasActiveFilters(): boolean {
    return (
      this.selectedStatuses().length > 0 ||
      this.selectedToolType() !== null ||
      this.selectedStartDate() !== null ||
      this.selectedEndDate() !== null
    );
  }
}
