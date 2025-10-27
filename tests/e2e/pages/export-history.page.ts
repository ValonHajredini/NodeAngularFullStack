import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Export History Page (Epic 33.2.3)
 *
 * Encapsulates interactions with the export history list page, including:
 * - Viewing export job history
 * - Filtering by status, tool type, and date range
 * - Pagination controls
 * - Sorting by different columns
 * - Re-downloading packages
 * - Re-exporting expired packages
 * - Deleting export jobs (admin only)
 */
export class ExportHistoryPage {
  readonly page: Page;

  // Main container
  readonly container: Locator;
  readonly pageTitle: Locator;
  readonly pageSubtitle: Locator;
  readonly adminBadge: Locator;

  // Header actions
  readonly refreshButton: Locator;
  readonly clearFiltersButton: Locator;

  // Loading/Error states
  readonly loadingSpinner: Locator;
  readonly loadingText: Locator;
  readonly errorContainer: Locator;
  readonly errorMessage: Locator;
  readonly tryAgainButton: Locator;

  // Empty state
  readonly emptyState: Locator;
  readonly emptyStateIcon: Locator;
  readonly emptyStateTitle: Locator;
  readonly emptyStateMessage: Locator;

  // Filters section
  readonly filtersSection: Locator;
  readonly filtersTitle: Locator;
  readonly statusFilter: Locator;
  readonly toolTypeFilter: Locator;
  readonly startDateFilter: Locator;
  readonly endDateFilter: Locator;

  // Table section
  readonly tableSection: Locator;
  readonly totalCountText: Locator;
  readonly table: Locator;
  readonly tableHeaders: Locator;
  readonly tableRows: Locator;

  // Table column headers (for sorting)
  readonly createdAtHeader: Locator;
  readonly completedAtHeader: Locator;
  readonly downloadCountHeader: Locator;
  readonly packageSizeHeader: Locator;

  // Action buttons
  readonly downloadButtons: Locator;
  readonly reexportButtons: Locator;
  readonly deleteButtons: Locator;

  // Pagination section
  readonly paginationSection: Locator;
  readonly pageSizeDropdown: Locator;
  readonly itemRangeText: Locator;
  readonly firstPageButton: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly lastPageButton: Locator;
  readonly currentPageText: Locator;

  // Toast notifications
  readonly toast: Locator;
  readonly toastSuccess: Locator;
  readonly toastError: Locator;
  readonly toastWarning: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main container
    this.container = page.locator('.export-history-container');
    this.pageTitle = page.locator('.export-history-title');
    this.pageSubtitle = page.locator('.export-history-subtitle');
    this.adminBadge = page.locator('.admin-badge');

    // Header actions
    this.refreshButton = page.getByRole('button', { name: /refresh/i });
    this.clearFiltersButton = page.getByRole('button', { name: /clear filters/i });

    // Loading/Error states
    this.loadingSpinner = page.locator('p-progressSpinner');
    this.loadingText = page.locator('.loading-text');
    this.errorContainer = page.locator('.error-container');
    this.errorMessage = page.locator('.error-message');
    this.tryAgainButton = page.getByRole('button', { name: /try again/i });

    // Empty state
    this.emptyState = page.locator('.empty-state');
    this.emptyStateIcon = page.locator('.empty-icon');
    this.emptyStateTitle = page.locator('.empty-title');
    this.emptyStateMessage = page.locator('.empty-message');

    // Filters section
    this.filtersSection = page.locator('.filters-section');
    this.filtersTitle = page.locator('.filters-title');
    this.statusFilter = page.locator('p-multiSelect[formcontrolname="statusFilter"]');
    this.toolTypeFilter = page.locator('p-dropdown[formcontrolname="toolTypeFilter"]');
    this.startDateFilter = page.locator('p-calendar[formcontrolname="startDate"]');
    this.endDateFilter = page.locator('p-calendar[formcontrolname="endDate"]');

    // Table section
    this.tableSection = page.locator('.table-section');
    this.totalCountText = page.locator('.total-count');
    this.table = page.locator('p-table');
    this.tableHeaders = page.locator('th');
    this.tableRows = page.locator('tbody tr');

    // Table column headers
    this.createdAtHeader = page.locator('th', { hasText: /created/i });
    this.completedAtHeader = page.locator('th', { hasText: /completed/i });
    this.downloadCountHeader = page.locator('th', { hasText: /downloads/i });
    this.packageSizeHeader = page.locator('th', { hasText: /size/i });

    // Action buttons
    this.downloadButtons = page.getByRole('button', { name: /download/i });
    this.reexportButtons = page.getByRole('button', { name: /re-export/i });
    this.deleteButtons = page.getByRole('button', { name: /delete/i });

    // Pagination section
    this.paginationSection = page.locator('.pagination-section');
    this.pageSizeDropdown = page.locator('.page-size-dropdown p-dropdown');
    this.itemRangeText = page.locator('.item-range');
    this.firstPageButton = page.getByRole('button', { name: /first/i });
    this.previousPageButton = page.getByRole('button', { name: /previous/i });
    this.nextPageButton = page.getByRole('button', { name: /next/i });
    this.lastPageButton = page.getByRole('button', { name: /last/i });
    this.currentPageText = page.locator('.current-page-text');

    // Toast notifications
    this.toast = page.locator('p-toast');
    this.toastSuccess = page.locator('.p-toast-message-success');
    this.toastError = page.locator('.p-toast-message-error');
    this.toastWarning = page.locator('.p-toast-message-warn');
  }

  /**
   * Navigate to the export history page
   */
  async goto(): Promise<void> {
    await this.page.goto('/tools/export-history');
    await this.container.waitFor();
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoad(): Promise<void> {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
  }

  /**
   * Check if admin badge is visible
   */
  async isAdminMode(): Promise<boolean> {
    return await this.adminBadge.isVisible();
  }

  /**
   * Get the total count of export jobs
   */
  async getTotalCount(): Promise<number> {
    const text = await this.totalCountText.textContent();
    const match = text?.match(/of (\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get the number of rows in the table
   */
  async getRowCount(): Promise<number> {
    return await this.tableRows.count();
  }

  /**
   * Get job status badge text from a specific row
   */
  async getJobStatus(rowIndex: number): Promise<string> {
    const row = this.tableRows.nth(rowIndex);
    const statusBadge = row.locator('p-tag');
    return (await statusBadge.textContent()) || '';
  }

  /**
   * Get job tool name from a specific row
   */
  async getJobToolName(rowIndex: number): Promise<string> {
    const row = this.tableRows.nth(rowIndex);
    const toolNameCell = row.locator('td').nth(1); // Tool column
    return (await toolNameCell.textContent()) || '';
  }

  /**
   * Check if download button is visible for a specific row
   */
  async hasDownloadButton(rowIndex: number): Promise<boolean> {
    const row = this.tableRows.nth(rowIndex);
    const downloadBtn = row.getByRole('button', { name: /download/i });
    return await downloadBtn.isVisible();
  }

  /**
   * Check if re-export button is visible for a specific row
   */
  async hasReexportButton(rowIndex: number): Promise<boolean> {
    const row = this.tableRows.nth(rowIndex);
    const reexportBtn = row.getByRole('button', { name: /re-export/i });
    return await reexportBtn.isVisible();
  }

  /**
   * Check if delete button is visible for a specific row
   */
  async hasDeleteButton(rowIndex: number): Promise<boolean> {
    const row = this.tableRows.nth(rowIndex);
    const deleteBtn = row.getByRole('button', { name: /delete/i });
    return await deleteBtn.isVisible();
  }

  /**
   * Click download button for a specific row
   */
  async clickDownload(rowIndex: number): Promise<void> {
    const row = this.tableRows.nth(rowIndex);
    const downloadBtn = row.getByRole('button', { name: /download/i });
    await downloadBtn.click();
  }

  /**
   * Click re-export button for a specific row
   */
  async clickReexport(rowIndex: number): Promise<void> {
    const row = this.tableRows.nth(rowIndex);
    const reexportBtn = row.getByRole('button', { name: /re-export/i });
    await reexportBtn.click();
  }

  /**
   * Click delete button for a specific row
   */
  async clickDelete(rowIndex: number): Promise<void> {
    const row = this.tableRows.nth(rowIndex);
    const deleteBtn = row.getByRole('button', { name: /delete/i });
    await deleteBtn.click();
  }

  /**
   * Apply status filter
   */
  async filterByStatus(statuses: string[]): Promise<void> {
    await this.statusFilter.click();
    for (const status of statuses) {
      await this.page.getByRole('option', { name: new RegExp(status, 'i') }).click();
    }
    // Click outside to close dropdown
    await this.filtersTitle.click();
    await this.waitForLoad();
  }

  /**
   * Apply tool type filter
   */
  async filterByToolType(toolType: string): Promise<void> {
    await this.toolTypeFilter.click();
    await this.page.getByRole('option', { name: new RegExp(toolType, 'i') }).click();
    await this.waitForLoad();
  }

  /**
   * Clear all filters
   */
  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
    await this.waitForLoad();
  }

  /**
   * Refresh the export history list
   */
  async refresh(): Promise<void> {
    await this.refreshButton.click();
    await this.waitForLoad();
  }

  /**
   * Sort by a column
   */
  async sortByColumn(column: 'created' | 'completed' | 'downloads' | 'size'): Promise<void> {
    let header: Locator;
    switch (column) {
      case 'created':
        header = this.createdAtHeader;
        break;
      case 'completed':
        header = this.completedAtHeader;
        break;
      case 'downloads':
        header = this.downloadCountHeader;
        break;
      case 'size':
        header = this.packageSizeHeader;
        break;
    }
    await header.click();
    await this.waitForLoad();
  }

  /**
   * Navigate to next page
   */
  async goToNextPage(): Promise<void> {
    await this.nextPageButton.click();
    await this.waitForLoad();
  }

  /**
   * Navigate to previous page
   */
  async goToPreviousPage(): Promise<void> {
    await this.previousPageButton.click();
    await this.waitForLoad();
  }

  /**
   * Navigate to first page
   */
  async goToFirstPage(): Promise<void> {
    await this.firstPageButton.click();
    await this.waitForLoad();
  }

  /**
   * Navigate to last page
   */
  async goToLastPage(): Promise<void> {
    await this.lastPageButton.click();
    await this.waitForLoad();
  }

  /**
   * Change page size
   */
  async changePageSize(size: 10 | 20 | 50 | 100): Promise<void> {
    await this.pageSizeDropdown.click();
    await this.page.getByRole('option', { name: `${size} per page` }).click();
    await this.waitForLoad();
  }

  /**
   * Get current page range text (e.g., "1-20 of 100")
   */
  async getItemRangeText(): Promise<string> {
    return (await this.itemRangeText.textContent()) || '';
  }

  /**
   * Wait for success toast
   */
  async waitForSuccessToast(): Promise<string> {
    await this.toastSuccess.waitFor({ timeout: 5000 });
    return (await this.toastSuccess.textContent()) || '';
  }

  /**
   * Wait for error toast
   */
  async waitForErrorToast(): Promise<string> {
    await this.toastError.waitFor({ timeout: 5000 });
    return (await this.toastError.textContent()) || '';
  }

  /**
   * Wait for warning toast
   */
  async waitForWarningToast(): Promise<string> {
    await this.toastWarning.waitFor({ timeout: 5000 });
    return (await this.toastWarning.textContent()) || '';
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /**
   * Check if error state is visible
   */
  async isErrorStateVisible(): Promise<boolean> {
    return await this.errorContainer.isVisible();
  }

  /**
   * Check if table is visible
   */
  async isTableVisible(): Promise<boolean> {
    return await this.tableSection.isVisible();
  }
}
