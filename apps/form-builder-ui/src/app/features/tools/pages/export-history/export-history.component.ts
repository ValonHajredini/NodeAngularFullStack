import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@core/auth/auth.service';
import {
  ExportJobService,
  ExportJobWithTool,
  ListExportJobsOptions,
} from '@features/tools/services/export-job.service';
import { ExportHistoryTableComponent } from './export-history-table/export-history-table.component';
import { ExportFiltersComponent } from './export-filters/export-filters.component';
import { ExportPaginationComponent } from './export-pagination/export-pagination.component';

/**
 * Export History Component (Epic 33.2.3)
 *
 * Container component for displaying export job history with pagination,
 * filtering, and sorting capabilities. Manages state using Angular signals
 * and coordinates child components (table, filters, pagination).
 *
 * **Features:**
 * - Paginated list of export jobs with tool metadata
 * - Filter by status, tool type, and date range
 * - Sort by creation date, completion date, download count, or package size
 * - Re-download existing packages
 * - Re-export expired packages
 * - Delete export jobs (admin only)
 *
 * **State Management:**
 * - Uses Angular signals for reactive state updates
 * - Computed signals for derived state (isAdmin, hasJobs, etc.)
 * - Signal-based approach eliminates need for manual change detection
 *
 * **Permissions:**
 * - Regular users: See only their own export jobs
 * - Admin users: See all export jobs across all users
 *
 * @example
 * ```typescript
 * // Route configuration
 * {
 *   path: 'export-history',
 *   component: ExportHistoryComponent,
 *   canActivate: [AuthGuard]
 * }
 * ```
 */
@Component({
  selector: 'app-export-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ProgressSpinnerModule,
    ToastModule,
    ExportHistoryTableComponent,
    ExportFiltersComponent,
    ExportPaginationComponent,
  ],
  providers: [MessageService],
  templateUrl: './export-history.component.html',
  styleUrls: ['./export-history.component.scss'],
})
export class ExportHistoryComponent implements OnInit {
  private readonly exportJobService = inject(ExportJobService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  // ===== State Signals =====

  /**
   * List of export jobs with tool metadata.
   * Updated when data is loaded or filters change.
   */
  jobs = signal<ExportJobWithTool[]>([]);

  /**
   * Loading state indicator.
   * True while fetching data from the API.
   */
  loading = signal<boolean>(false);

  /**
   * Error message if data fetch fails.
   * Null when no error has occurred.
   */
  error = signal<string | null>(null);

  /**
   * Total count of export jobs matching current filters.
   * Used for pagination metadata.
   */
  totalCount = signal<number>(0);

  /**
   * Current page number (1-indexed).
   * Controlled by pagination component.
   */
  currentPage = signal<number>(1);

  /**
   * Number of items per page.
   * Default: 20 items.
   */
  pageSize = signal<number>(20);

  // ===== Filter Signals =====

  /**
   * Status filter (comma-separated list).
   * Example: 'completed,failed' to show only completed or failed jobs.
   * Null means show all statuses.
   */
  statusFilter = signal<string | null>(null);

  /**
   * Tool type filter.
   * Example: 'form-builder' to show only form builder exports.
   * Null means show all tool types.
   */
  toolTypeFilter = signal<string | null>(null);

  /**
   * Start date filter (ISO 8601 format).
   * Jobs created on or after this date will be shown.
   * Null means no start date filter.
   */
  startDate = signal<string | null>(null);

  /**
   * End date filter (ISO 8601 format).
   * Jobs created on or before this date will be shown.
   * Null means no end date filter.
   */
  endDate = signal<string | null>(null);

  // ===== Sort Signals =====

  /**
   * Sort field name.
   * Determines which column to sort by.
   * Default: 'created_at' (most recent first).
   */
  sortBy = signal<'created_at' | 'completed_at' | 'download_count' | 'package_size_bytes'>(
    'created_at',
  );

  /**
   * Sort order (ascending or descending).
   * Default: 'desc' (descending, newest first).
   */
  sortOrder = signal<'asc' | 'desc'>('desc');

  // ===== Computed Signals =====

  /**
   * Check if current user is an admin.
   * Admin users can see all export jobs and delete jobs.
   */
  isAdmin = computed(() => {
    const user = this.authService.user();
    return user?.role === 'admin';
  });

  /**
   * Check if there are any jobs to display.
   * Used for showing empty state vs. table.
   */
  hasJobs = computed(() => this.jobs().length > 0);

  /**
   * Total number of pages based on total count and page size.
   * Used for rendering pagination controls.
   */
  totalPages = computed(() => {
    const total = this.totalCount();
    const size = this.pageSize();
    return Math.ceil(total / size);
  });

  /**
   * Check if there are active filters applied.
   * Used for showing "Clear Filters" button.
   */
  hasActiveFilters = computed(() => {
    return (
      this.statusFilter() !== null ||
      this.toolTypeFilter() !== null ||
      this.startDate() !== null ||
      this.endDate() !== null
    );
  });

  /**
   * Angular lifecycle hook: Component initialization.
   * Loads initial export history data on component mount.
   */
  ngOnInit(): void {
    console.log('[ExportHistoryComponent] Initializing export history view');
    this.loadExportHistory();
  }

  /**
   * Load export history from API with current filters, sorting, and pagination.
   * Updates jobs signal on success or error signal on failure.
   *
   * @private
   */
  private loadExportHistory(): void {
    this.loading.set(true);
    this.error.set(null);

    const options: ListExportJobsOptions = {
      limit: this.pageSize(),
      offset: (this.currentPage() - 1) * this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
      statusFilter: this.statusFilter() || undefined,
      toolTypeFilter: this.toolTypeFilter() || undefined,
      startDate: this.startDate() || undefined,
      endDate: this.endDate() || undefined,
    };

    console.log('[ExportHistoryComponent] Loading export history with options:', options);

    this.exportJobService.listExportJobs(options).subscribe({
      next: (response) => {
        console.log('[ExportHistoryComponent] Loaded export history:', response);
        this.jobs.set(response.jobs);
        this.totalCount.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[ExportHistoryComponent] Failed to load export history:', err);
        this.error.set(err.message || 'Failed to load export history');
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Failed',
          detail: err.message || 'Failed to load export history',
          life: 5000,
        });
      },
    });
  }

  /**
   * Handle page change from pagination component.
   * Updates current page and reloads data.
   *
   * @param page - New page number (1-indexed)
   */
  onPageChange(page: number): void {
    console.log(`[ExportHistoryComponent] Page changed to: ${page}`);
    this.currentPage.set(page);
    this.loadExportHistory();
  }

  /**
   * Handle page size change from pagination component.
   * Resets to page 1 and reloads data.
   *
   * @param size - New page size
   */
  onPageSizeChange(size: number): void {
    console.log(`[ExportHistoryComponent] Page size changed to: ${size}`);
    this.pageSize.set(size);
    this.currentPage.set(1); // Reset to first page
    this.loadExportHistory();
  }

  /**
   * Handle filter change from filters component.
   * Resets to page 1 and reloads data.
   *
   * @param filters - Updated filter values
   */
  onFilterChange(filters: {
    status?: string | null;
    toolType?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }): void {
    console.log('[ExportHistoryComponent] Filters changed:', filters);
    if (filters.status !== undefined) this.statusFilter.set(filters.status);
    if (filters.toolType !== undefined) this.toolTypeFilter.set(filters.toolType);
    if (filters.startDate !== undefined) this.startDate.set(filters.startDate);
    if (filters.endDate !== undefined) this.endDate.set(filters.endDate);
    this.currentPage.set(1); // Reset to first page
    this.loadExportHistory();
  }

  /**
   * Handle sort change from table component.
   * Updates sort field and order, then reloads data.
   *
   * @param sort - Sort configuration
   */
  onSortChange(sort: {
    sortBy: 'created_at' | 'completed_at' | 'download_count' | 'package_size_bytes';
    sortOrder: 'asc' | 'desc';
  }): void {
    console.log('[ExportHistoryComponent] Sort changed:', sort);
    this.sortBy.set(sort.sortBy);
    this.sortOrder.set(sort.sortOrder);
    this.loadExportHistory();
  }

  /**
   * Clear all active filters and reload data.
   * Resets to page 1 with default sorting.
   */
  onClearFilters(): void {
    console.log('[ExportHistoryComponent] Clearing all filters');
    this.statusFilter.set(null);
    this.toolTypeFilter.set(null);
    this.startDate.set(null);
    this.endDate.set(null);
    this.currentPage.set(1);
    this.loadExportHistory();
  }

  /**
   * Refresh export history data.
   * Maintains current page and filters.
   */
  onRefresh(): void {
    console.log('[ExportHistoryComponent] Refreshing export history');
    this.loadExportHistory();
  }

  /**
   * Handle re-download action from table row.
   * Triggers package download via ExportJobService.
   *
   * @param job - Export job to re-download
   */
  onRedownload(job: ExportJobWithTool): void {
    console.log(`[ExportHistoryComponent] Re-downloading export job: ${job.jobId}`);
    this.exportJobService.downloadPackage(job.jobId).subscribe({
      next: (blob) => {
        console.log(`[ExportHistoryComponent] Download started for job: ${job.jobId}`);
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${job.toolName}-export-${job.jobId}.tar.gz`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.messageService.add({
          severity: 'success',
          summary: 'Download Started',
          detail: `Downloading ${job.toolName} export package`,
          life: 3000,
        });
      },
      error: (err) => {
        console.error(`[ExportHistoryComponent] Download failed for job: ${job.jobId}`, err);
        this.messageService.add({
          severity: 'error',
          summary: 'Download Failed',
          detail: err.message || 'Failed to download export package',
          life: 5000,
        });
      },
    });
  }

  /**
   * Handle re-export action from table row.
   * Starts a new export job for the same tool.
   *
   * @param job - Export job to re-export
   */
  onReexport(job: ExportJobWithTool): void {
    console.log(`[ExportHistoryComponent] Re-exporting tool: ${job.toolId}`);
    this.exportJobService.startExport(job.toolId).subscribe({
      next: (newJob) => {
        console.log(`[ExportHistoryComponent] Re-export started with job ID: ${newJob.jobId}`);
        this.messageService.add({
          severity: 'success',
          summary: 'Export Started',
          detail: `Re-exporting ${job.toolName}. Check export progress for updates.`,
          life: 5000,
        });
        // Refresh list to show new job
        this.loadExportHistory();
      },
      error: (err) => {
        console.error(`[ExportHistoryComponent] Re-export failed for tool: ${job.toolId}`, err);
        this.messageService.add({
          severity: 'error',
          summary: 'Export Failed',
          detail: err.message || 'Failed to start re-export',
          life: 5000,
        });
      },
    });
  }

  /**
   * Handle delete action from table row (admin only).
   * Soft-deletes the export job and refreshes the list.
   *
   * @param job - Export job to delete
   */
  onDelete(job: ExportJobWithTool): void {
    if (!this.isAdmin()) {
      console.warn('[ExportHistoryComponent] Delete attempted by non-admin user');
      this.messageService.add({
        severity: 'warn',
        summary: 'Permission Denied',
        detail: 'Only administrators can delete export jobs',
        life: 3000,
      });
      return;
    }

    console.log(`[ExportHistoryComponent] Deleting export job: ${job.jobId}`);
    this.exportJobService.deleteExportJob(job.jobId).subscribe({
      next: () => {
        console.log(`[ExportHistoryComponent] Successfully deleted job: ${job.jobId}`);
        this.messageService.add({
          severity: 'success',
          summary: 'Job Deleted',
          detail: `Export job for ${job.toolName} has been deleted`,
          life: 3000,
        });
        // Refresh list to remove deleted job
        this.loadExportHistory();
      },
      error: (err) => {
        console.error(`[ExportHistoryComponent] Delete failed for job: ${job.jobId}`, err);
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail: err.message || 'Failed to delete export job',
          life: 5000,
        });
      },
    });
  }
}
