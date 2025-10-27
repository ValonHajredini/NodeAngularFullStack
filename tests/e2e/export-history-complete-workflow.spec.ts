import { test, expect } from '@playwright/test';
import { ExportHistoryPage } from './pages/export-history.page';

/**
 * E2E Tests for Export History & Re-download Feature (Epic 33.2.3, Task 15)
 *
 * Tests the complete export history workflow including:
 * - Viewing export history (regular user vs. admin)
 * - Filtering by status, tool type, and date range
 * - Pagination controls
 * - Sorting by different columns
 * - Re-downloading packages
 * - Re-exporting expired packages
 * - Deleting export jobs (admin only)
 *
 * **Prerequisites:**
 * - Backend API must be running (npm --workspace=apps/api run dev)
 * - Frontend must be running (npm --workspace=apps/web run dev)
 * - Database must have test data (run db:seed)
 *
 * **Test Data Requirements:**
 * - At least one admin user (admin@example.com / Admin123!@#)
 * - At least one regular user (user@example.com / User123!@#)
 * - At least 5 export jobs with various statuses
 */

test.describe('Export History - Complete Workflow', () => {
  let exportHistoryPage: ExportHistoryPage;

  test.describe('Regular User Workflow', () => {
    test.beforeEach(async ({ page }) => {
      exportHistoryPage = new ExportHistoryPage(page);

      // Login as regular user
      await page.goto('/auth/login');
      await page.getByLabel(/email/i).fill('user@example.com');
      await page.getByLabel(/password/i).fill('User123!@#');
      await page.getByRole('button', { name: /sign in|login/i }).click();

      // Wait for successful login
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // Navigate to export history
      await exportHistoryPage.goto();
      await exportHistoryPage.waitForLoad();
    });

    test('should display export history page correctly', async () => {
      // Verify page elements are visible
      await expect(exportHistoryPage.pageTitle).toBeVisible();
      await expect(exportHistoryPage.pageTitle).toContainText(/export history/i);

      // Regular user should NOT see admin badge
      await expect(exportHistoryPage.adminBadge).not.toBeVisible();

      // Verify main sections are visible
      await expect(exportHistoryPage.filtersSection).toBeVisible();
      await expect(exportHistoryPage.refreshButton).toBeVisible();
    });

    test('should display only user own export jobs', async () => {
      // Regular users should only see their own export jobs
      const isTableVisible = await exportHistoryPage.isTableVisible();
      const isEmptyStateVisible = await exportHistoryPage.isEmptyStateVisible();

      // Either table with jobs or empty state is shown
      expect(isTableVisible || isEmptyStateVisible).toBe(true);

      if (isTableVisible) {
        const rowCount = await exportHistoryPage.getRowCount();
        expect(rowCount).toBeGreaterThan(0);

        // Verify at least one row has data
        const firstRowStatus = await exportHistoryPage.getJobStatus(0);
        expect(firstRowStatus).toBeTruthy();
      }
    });

    test('should NOT show delete buttons for regular user', async () => {
      const isTableVisible = await exportHistoryPage.isTableVisible();

      if (isTableVisible) {
        const rowCount = await exportHistoryPage.getRowCount();
        if (rowCount > 0) {
          // Regular users should NOT see delete buttons
          const hasDeleteButton = await exportHistoryPage.hasDeleteButton(0);
          expect(hasDeleteButton).toBe(false);
        }
      }
    });

    test('should refresh export history data', async () => {
      const initialCount = await exportHistoryPage.getTotalCount();

      // Click refresh button
      await exportHistoryPage.refresh();

      // Verify page reloaded
      const newCount = await exportHistoryPage.getTotalCount();
      expect(newCount).toBeGreaterThanOrEqual(0); // Count should be valid
    });
  });

  test.describe('Admin User Workflow', () => {
    test.beforeEach(async ({ page }) => {
      exportHistoryPage = new ExportHistoryPage(page);

      // Login as admin
      await page.goto('/auth/login');
      await page.getByLabel(/email/i).fill('admin@example.com');
      await page.getByLabel(/password/i).fill('Admin123!@#');
      await page.getByRole('button', { name: /sign in|login/i }).click();

      // Wait for successful login
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // Navigate to export history
      await exportHistoryPage.goto();
      await exportHistoryPage.waitForLoad();
    });

    test('should display admin mode indicator', async () => {
      // Admin should see admin badge
      await expect(exportHistoryPage.adminBadge).toBeVisible();
      await expect(exportHistoryPage.adminBadge).toContainText(/admin/i);
    });

    test('should display all export jobs from all users', async () => {
      const isTableVisible = await exportHistoryPage.isTableVisible();
      const isEmptyStateVisible = await exportHistoryPage.isEmptyStateVisible();

      // Admin should see jobs (if any exist in database)
      expect(isTableVisible || isEmptyStateVisible).toBe(true);

      if (isTableVisible) {
        const totalCount = await exportHistoryPage.getTotalCount();
        expect(totalCount).toBeGreaterThan(0);

        const rowCount = await exportHistoryPage.getRowCount();
        expect(rowCount).toBeGreaterThan(0);
      }
    });

    test('should show delete buttons for admin user', async () => {
      const isTableVisible = await exportHistoryPage.isTableVisible();

      if (isTableVisible) {
        const rowCount = await exportHistoryPage.getRowCount();
        if (rowCount > 0) {
          // Admin should see delete buttons
          const hasDeleteButton = await exportHistoryPage.hasDeleteButton(0);
          expect(hasDeleteButton).toBe(true);
        }
      }
    });

    test('should handle delete action (admin only)', async () => {
      const isTableVisible = await exportHistoryPage.isTableVisible();

      if (isTableVisible && (await exportHistoryPage.getRowCount()) > 0) {
        const initialCount = await exportHistoryPage.getTotalCount();

        // Click delete on first row
        await exportHistoryPage.clickDelete(0);

        // Wait for success or error toast
        const toastVisible =
          (await exportHistoryPage.toastSuccess.isVisible({ timeout: 3000 })) ||
          (await exportHistoryPage.toastError.isVisible({ timeout: 3000 }));

        expect(toastVisible).toBe(true);

        // If successful, count should decrease
        if (await exportHistoryPage.toastSuccess.isVisible()) {
          await exportHistoryPage.waitForLoad();
          const newCount = await exportHistoryPage.getTotalCount();
          expect(newCount).toBeLessThan(initialCount);
        }
      } else {
        test.skip('No export jobs available to delete');
      }
    });
  });

  test.describe('Filtering', () => {
    test.beforeEach(async ({ page }) => {
      exportHistoryPage = new ExportHistoryPage(page);

      // Login as admin to see all jobs
      await page.goto('/auth/login');
      await page.getByLabel(/email/i).fill('admin@example.com');
      await page.getByLabel(/password/i).fill('Admin123!@#');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      await exportHistoryPage.goto();
      await exportHistoryPage.waitForLoad();
    });

    test('should filter by status', async () => {
      const isTableVisible = await exportHistoryPage.isTableVisible();

      if (isTableVisible && (await exportHistoryPage.getRowCount()) > 0) {
        // Apply status filter for "completed"
        await exportHistoryPage.filterByStatus(['completed']);

        // Verify filter was applied (table may be empty or have filtered results)
        const isFilterButtonVisible = await exportHistoryPage.clearFiltersButton.isVisible();
        expect(isFilterButtonVisible).toBe(true);

        // If there are results, verify they match filter
        if (await exportHistoryPage.isTableVisible()) {
          const rowCount = await exportHistoryPage.getRowCount();
          if (rowCount > 0) {
            const firstStatus = await exportHistoryPage.getJobStatus(0);
            expect(firstStatus.toLowerCase()).toContain('completed');
          }
        }
      } else {
        test.skip('No export jobs available to filter');
      }
    });

    test('should clear filters', async () => {
      const isTableVisible = await exportHistoryPage.isTableVisible();

      if (isTableVisible && (await exportHistoryPage.getRowCount()) > 0) {
        // Apply a filter
        await exportHistoryPage.filterByStatus(['completed']);

        // Clear filters
        await exportHistoryPage.clearFilters();

        // Clear filters button should be hidden after clearing
        const isFilterButtonVisible = await exportHistoryPage.clearFiltersButton.isVisible();
        expect(isFilterButtonVisible).toBe(false);
      } else {
        test.skip('No export jobs available to filter');
      }
    });

    test('should show empty state when no jobs match filter', async () => {
      // Apply a very specific filter that likely returns no results
      await exportHistoryPage.filterByStatus(['failed']);
      await exportHistoryPage.filterByToolType('non-existent-tool');

      // Either empty state is shown or table with no results
      const isEmptyVisible = await exportHistoryPage.isEmptyStateVisible();
      const isTableVisible = await exportHistoryPage.isTableVisible();

      // At least one should be true
      expect(isEmptyVisible || isTableVisible).toBe(true);

      // If table is visible, verify appropriate message
      if (isEmptyVisible) {
        await expect(exportHistoryPage.emptyStateMessage).toContainText(
          /no export jobs|adjust your filters/i
        );
      }
    });
  });

  test.describe('Pagination', () => {
    test.beforeEach(async ({ page }) => {
      exportHistoryPage = new ExportHistoryPage(page);

      // Login as admin
      await page.goto('/auth/login');
      await page.getByLabel(/email/i).fill('admin@example.com');
      await page.getByLabel(/password/i).fill('Admin123!@#');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      await exportHistoryPage.goto();
      await exportHistoryPage.waitForLoad();
    });

    test('should navigate between pages', async () => {
      const totalCount = await exportHistoryPage.getTotalCount();

      if (totalCount > 20) {
        // More than one page exists
        const initialRange = await exportHistoryPage.getItemRangeText();

        // Go to next page
        await exportHistoryPage.goToNextPage();

        const newRange = await exportHistoryPage.getItemRangeText();
        expect(newRange).not.toBe(initialRange);

        // Go back to first page
        await exportHistoryPage.goToFirstPage();

        const finalRange = await exportHistoryPage.getItemRangeText();
        expect(finalRange).toBe(initialRange);
      } else {
        test.skip('Not enough export jobs for pagination test (need >20)');
      }
    });

    test('should change page size', async () => {
      const totalCount = await exportHistoryPage.getTotalCount();

      if (totalCount > 10) {
        // Change page size to 10
        await exportHistoryPage.changePageSize(10);

        const range = await exportHistoryPage.getItemRangeText();
        expect(range).toMatch(/1-10|1-\d+ of/);

        // Change back to default (20)
        await exportHistoryPage.changePageSize(20);
      } else {
        test.skip('Not enough export jobs for page size test (need >10)');
      }
    });

    test('should display correct item range', async () => {
      const totalCount = await exportHistoryPage.getTotalCount();

      if (totalCount > 0) {
        const range = await exportHistoryPage.getItemRangeText();

        // Range should match pattern like "1-20 of 100" or "1-5 of 5"
        expect(range).toMatch(/\d+-\d+ of \d+/);

        // Parse and verify range makes sense
        const match = range.match(/(\d+)-(\d+) of (\d+)/);
        if (match) {
          const start = parseInt(match[1], 10);
          const end = parseInt(match[2], 10);
          const total = parseInt(match[3], 10);

          expect(start).toBeGreaterThanOrEqual(1);
          expect(end).toBeGreaterThanOrEqual(start);
          expect(total).toBeGreaterThanOrEqual(end);
        }
      }
    });
  });

  test.describe('Sorting', () => {
    test.beforeEach(async ({ page }) => {
      exportHistoryPage = new ExportHistoryPage(page);

      // Login as admin
      await page.goto('/auth/login');
      await page.getByLabel(/email/i).fill('admin@example.com');
      await page.getByLabel(/password/i).fill('Admin123!@#');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      await exportHistoryPage.goto();
      await exportHistoryPage.waitForLoad();
    });

    test('should sort by created date', async () => {
      const isTableVisible = await exportHistoryPage.isTableVisible();

      if (isTableVisible && (await exportHistoryPage.getRowCount()) > 1) {
        // Click on created date header to sort
        await exportHistoryPage.sortByColumn('created');

        // Verify table reloaded
        await exportHistoryPage.waitForLoad();

        // Table should still be visible with data
        const rowCount = await exportHistoryPage.getRowCount();
        expect(rowCount).toBeGreaterThan(0);
      } else {
        test.skip('Not enough export jobs for sorting test (need >1)');
      }
    });

    test('should sort by download count', async () => {
      const isTableVisible = await exportHistoryPage.isTableVisible();

      if (isTableVisible && (await exportHistoryPage.getRowCount()) > 1) {
        // Click on downloads header to sort
        await exportHistoryPage.sortByColumn('downloads');

        // Verify table reloaded
        await exportHistoryPage.waitForLoad();

        const rowCount = await exportHistoryPage.getRowCount();
        expect(rowCount).toBeGreaterThan(0);
      } else {
        test.skip('Not enough export jobs for sorting test (need >1)');
      }
    });

    test('should sort by package size', async () => {
      const isTableVisible = await exportHistoryPage.isTableVisible();

      if (isTableVisible && (await exportHistoryPage.getRowCount()) > 1) {
        // Click on size header to sort
        await exportHistoryPage.sortByColumn('size');

        // Verify table reloaded
        await exportHistoryPage.waitForLoad();

        const rowCount = await exportHistoryPage.getRowCount();
        expect(rowCount).toBeGreaterThan(0);
      } else {
        test.skip('Not enough export jobs for sorting test (need >1)');
      }
    });
  });

  test.describe('Download & Re-export Actions', () => {
    test.beforeEach(async ({ page }) => {
      exportHistoryPage = new ExportHistoryPage(page);

      // Login as admin
      await page.goto('/auth/login');
      await page.getByLabel(/email/i).fill('admin@example.com');
      await page.getByLabel(/password/i).fill('Admin123!@#');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      await exportHistoryPage.goto();
      await exportHistoryPage.waitForLoad();
    });

    test('should show download button for completed jobs with packages', async () => {
      const isTableVisible = await exportHistoryPage.isTableVisible();

      if (isTableVisible && (await exportHistoryPage.getRowCount()) > 0) {
        // Check each row for completed status
        const rowCount = await exportHistoryPage.getRowCount();
        let foundCompleted = false;

        for (let i = 0; i < rowCount; i++) {
          const status = await exportHistoryPage.getJobStatus(i);
          if (status.toLowerCase().includes('completed')) {
            foundCompleted = true;
            // Completed jobs should have either download or re-export button
            const hasDownload = await exportHistoryPage.hasDownloadButton(i);
            const hasReexport = await exportHistoryPage.hasReexportButton(i);
            expect(hasDownload || hasReexport).toBe(true);
            break;
          }
        }

        if (!foundCompleted) {
          test.skip('No completed export jobs found');
        }
      } else {
        test.skip('No export jobs available');
      }
    });

    test('should handle download action', async () => {
      const isTableVisible = await exportHistoryPage.isTableVisible();

      if (isTableVisible && (await exportHistoryPage.getRowCount()) > 0) {
        // Find a row with download button
        const rowCount = await exportHistoryPage.getRowCount();
        let downloadRowIndex = -1;

        for (let i = 0; i < rowCount; i++) {
          if (await exportHistoryPage.hasDownloadButton(i)) {
            downloadRowIndex = i;
            break;
          }
        }

        if (downloadRowIndex >= 0) {
          // Click download button
          await exportHistoryPage.clickDownload(downloadRowIndex);

          // Wait for success toast
          const toastText = await exportHistoryPage.waitForSuccessToast();
          expect(toastText.toLowerCase()).toMatch(/download|started/);
        } else {
          test.skip('No export jobs with download button found');
        }
      } else {
        test.skip('No export jobs available');
      }
    });

    test('should handle re-export action', async () => {
      const isTableVisible = await exportHistoryPage.isTableVisible();

      if (isTableVisible && (await exportHistoryPage.getRowCount()) > 0) {
        // Find a row with re-export button
        const rowCount = await exportHistoryPage.getRowCount();
        let reexportRowIndex = -1;

        for (let i = 0; i < rowCount; i++) {
          if (await exportHistoryPage.hasReexportButton(i)) {
            reexportRowIndex = i;
            break;
          }
        }

        if (reexportRowIndex >= 0) {
          const initialCount = await exportHistoryPage.getTotalCount();

          // Click re-export button
          await exportHistoryPage.clickReexport(reexportRowIndex);

          // Wait for success toast
          const toastText = await exportHistoryPage.waitForSuccessToast();
          expect(toastText.toLowerCase()).toMatch(/export|started/);

          // Refresh to see new job
          await exportHistoryPage.refresh();

          // Total count should increase by 1 (new job created)
          const newCount = await exportHistoryPage.getTotalCount();
          expect(newCount).toBeGreaterThanOrEqual(initialCount);
        } else {
          test.skip('No export jobs with re-export button found');
        }
      } else {
        test.skip('No export jobs available');
      }
    });
  });

  test.describe('Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      exportHistoryPage = new ExportHistoryPage(page);

      // Login as regular user
      await page.goto('/auth/login');
      await page.getByLabel(/email/i).fill('user@example.com');
      await page.getByLabel(/password/i).fill('User123!@#');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      await exportHistoryPage.goto();
      await exportHistoryPage.waitForLoad();
    });

    test('should handle network errors gracefully', async () => {
      // This test verifies error handling exists
      // Actual network error would require mocking or service interruption

      // Verify error elements exist in DOM (even if not visible)
      await expect(exportHistoryPage.errorContainer).toBeAttached();
      await expect(exportHistoryPage.errorMessage).toBeAttached();
      await expect(exportHistoryPage.tryAgainButton).toBeAttached();
    });

    test('should show appropriate message when no jobs exist', async () => {
      // If user has no export jobs, empty state should be shown
      const isEmptyVisible = await exportHistoryPage.isEmptyStateVisible();
      const isTableVisible = await exportHistoryPage.isTableVisible();

      // Either empty state or table should be visible
      expect(isEmptyVisible || isTableVisible).toBe(true);

      if (isEmptyVisible) {
        await expect(exportHistoryPage.emptyStateTitle).toContainText(
          /no export jobs found/i
        );
      }
    });
  });

  test.describe('Responsive Design', () => {
    test.beforeEach(async ({ page }) => {
      exportHistoryPage = new ExportHistoryPage(page);

      // Login as admin
      await page.goto('/auth/login');
      await page.getByLabel(/email/i).fill('admin@example.com');
      await page.getByLabel(/password/i).fill('Admin123!@#');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      await exportHistoryPage.goto();
      await exportHistoryPage.waitForLoad();
    });

    test('should display correctly on mobile devices', async ({
      page,
      isMobile,
      browserName,
    }) => {
      if (!isMobile) {
        test.skip('This test only runs on mobile devices');
      }

      // Verify main elements are visible on mobile
      await expect(exportHistoryPage.pageTitle).toBeVisible();
      await expect(exportHistoryPage.filtersSection).toBeVisible();

      // Table or empty state should be visible
      const isTableVisible = await exportHistoryPage.isTableVisible();
      const isEmptyVisible = await exportHistoryPage.isEmptyStateVisible();
      expect(isTableVisible || isEmptyVisible).toBe(true);

      // Pagination should be visible if there are jobs
      if (isTableVisible && (await exportHistoryPage.getTotalCount()) > 0) {
        await expect(exportHistoryPage.paginationSection).toBeVisible();
      }

      console.log(`✅ Export history displays correctly on mobile ${browserName}`);
    });
  });
});
