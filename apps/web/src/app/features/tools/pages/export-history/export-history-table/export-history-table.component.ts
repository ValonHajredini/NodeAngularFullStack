import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ExportJobWithTool } from '@features/tools/services/export-job.service';

/**
 * Status severity mapping for PrimeNG Tag component.
 * Maps export job statuses to visual severity levels.
 */
type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/**
 * Export History Table Component (Epic 33.2.3, Task 5)
 *
 * Presentational component for displaying export jobs in a sortable table.
 * Receives data from parent container and emits user actions upward.
 *
 * **Design Pattern: Presentational Component**
 * - No business logic or API calls
 * - Pure data display and event emission
 * - Receives all data via @Input()
 * - Emits all actions via @Output()
 * - OnPush change detection for optimal performance
 *
 * **Features:**
 * - Sortable columns (Created, Completed, Downloads, Size)
 * - Status badges with color coding
 * - Conditional action buttons based on job status
 * - Admin-only delete button
 * - Responsive table layout
 * - Empty state handling
 *
 * @example
 * ```html
 * <app-export-history-table
 *   [jobs]="jobs()"
 *   [isAdmin]="isAdmin()"
 *   [sortBy]="sortBy()"
 *   [sortOrder]="sortOrder()"
 *   (sortChange)="onSortChange($event)"
 *   (download)="onRedownload($event)"
 *   (reexport)="onReexport($event)"
 *   (delete)="onDelete($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-export-history-table',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TagModule, TooltipModule],
  templateUrl: './export-history-table.component.html',
  styleUrls: ['./export-history-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportHistoryTableComponent {
  /**
   * List of export jobs with tool metadata to display.
   * Passed from parent container component.
   */
  @Input({ required: true }) jobs: ExportJobWithTool[] = [];

  /**
   * Whether current user is an admin.
   * Controls visibility of delete button.
   */
  @Input({ required: true }) isAdmin = false;

  /**
   * Current sort field name.
   * Used to highlight the sorted column.
   */
  @Input({ required: true }) sortBy:
    | 'created_at'
    | 'completed_at'
    | 'download_count'
    | 'package_size_bytes' = 'created_at';

  /**
   * Current sort order.
   * Used to show sort direction icon.
   */
  @Input({ required: true }) sortOrder: 'asc' | 'desc' = 'desc';

  /**
   * Emitted when user clicks a column header to change sorting.
   * Parent container handles API call with new sort parameters.
   */
  @Output() sortChange = new EventEmitter<{
    sortBy: 'created_at' | 'completed_at' | 'download_count' | 'package_size_bytes';
    sortOrder: 'asc' | 'desc';
  }>();

  /**
   * Emitted when user clicks download button.
   * Parent container handles package download logic.
   */
  @Output() download = new EventEmitter<ExportJobWithTool>();

  /**
   * Emitted when user clicks re-export button.
   * Parent container starts new export job for the same tool.
   */
  @Output() reexport = new EventEmitter<ExportJobWithTool>();

  /**
   * Emitted when user clicks delete button (admin only).
   * Parent container handles soft delete via API.
   */
  @Output() delete = new EventEmitter<ExportJobWithTool>();

  /**
   * Handle column header click for sorting.
   * Toggles sort order if clicking same column, otherwise sorts ascending.
   *
   * @param field - Column field name to sort by
   */
  onSort(field: 'created_at' | 'completed_at' | 'download_count' | 'package_size_bytes'): void {
    let newOrder: 'asc' | 'desc';

    if (this.sortBy === field) {
      // Same column: toggle order
      newOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // New column: default to descending (most recent/highest first)
      newOrder = 'desc';
    }

    this.sortChange.emit({
      sortBy: field,
      sortOrder: newOrder,
    });
  }

  /**
   * Get sort icon class for column header.
   * Shows up/down arrow based on current sort state.
   *
   * @param field - Column field name
   * @returns PrimeIcons class name for sort indicator
   */
  getSortIcon(
    field: 'created_at' | 'completed_at' | 'download_count' | 'package_size_bytes',
  ): string {
    if (this.sortBy !== field) {
      return 'pi pi-sort-alt'; // Unsorted
    }
    return this.sortOrder === 'asc' ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down';
  }

  /**
   * Get status badge severity for PrimeNG Tag component.
   * Maps export job status to visual severity level.
   *
   * @param status - Export job status
   * @returns Tag severity level for styling
   */
  getStatusSeverity(status: string): TagSeverity {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'pending':
        return 'warn';
      case 'failed':
        return 'danger';
      case 'cancelled':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  /**
   * Get status label for display.
   * Formats snake_case status to human-readable title case.
   *
   * @param status - Export job status
   * @returns Formatted status label
   */
  getStatusLabel(status: string): string {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Check if download button should be shown for job.
   * Download available when job completed and package exists.
   *
   * @param job - Export job to check
   * @returns True if download button should be shown
   */
  canDownload(job: ExportJobWithTool): boolean {
    return job.status === 'completed' && !!job.packagePath;
  }

  /**
   * Check if re-export button should be shown for job.
   * Re-export needed when job completed but package expired/deleted.
   *
   * @param job - Export job to check
   * @returns True if re-export button should be shown
   */
  canReexport(job: ExportJobWithTool): boolean {
    return job.status === 'completed' && !job.packagePath;
  }

  /**
   * Format package size for display.
   * Converts bytes to human-readable format (KB, MB, GB).
   *
   * @param bytes - Package size in bytes
   * @returns Formatted size string or '-' if null
   */
  formatSize(bytes: number | null): string {
    if (bytes === null || bytes === undefined) {
      return '-';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Format download count for display.
   * Shows count or 'Never' if zero/null.
   *
   * @param count - Download count
   * @returns Formatted download count string
   */
  formatDownloadCount(count: number | undefined): string {
    return count ? count.toString() : 'Never';
  }

  /**
   * Format date for display with fallback.
   * Returns formatted date or '-' if null/undefined.
   *
   * @param date - Date to format (ISO string or Date object)
   * @returns Formatted date string or '-'
   */
  formatDate(date: string | Date | null | undefined): string {
    if (!date) {
      return '-';
    }
    return new Date(date).toLocaleString();
  }

  /**
   * Handle download button click.
   * Emits download event to parent container.
   *
   * @param job - Export job to download
   */
  onDownloadClick(job: ExportJobWithTool): void {
    this.download.emit(job);
  }

  /**
   * Handle re-export button click.
   * Emits reexport event to parent container.
   *
   * @param job - Export job to re-export
   */
  onReexportClick(job: ExportJobWithTool): void {
    this.reexport.emit(job);
  }

  /**
   * Handle delete button click.
   * Emits delete event to parent container.
   *
   * @param job - Export job to delete
   */
  onDeleteClick(job: ExportJobWithTool): void {
    this.delete.emit(job);
  }

  /**
   * Check if package has expired.
   * Compares expiration date with current date.
   *
   * @param expiresAt - Package expiration date
   * @returns True if package has expired
   */
  isExpired(expiresAt: string | Date | null | undefined): boolean {
    if (!expiresAt) {
      return false;
    }
    return new Date(expiresAt) < new Date();
  }
}
