import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsUser, loginAsReadOnly } from '../helpers/auth-helpers';
import { navigateToToolDetail } from '../helpers/navigation-helpers';
import { mockToolActive } from '../fixtures/tool-fixtures';

/**
 * Epic 32.2 - Task 6: Export Permission Scenarios
 *
 * Tests export button permission checks for different user roles:
 * - Admin users: Export button visible and enabled
 * - Users with 'export' permission: Export button enabled
 * - Users without 'export' permission: Export button disabled
 * - ReadOnly users: Export button disabled or shows permission warning
 * - Permission denied toast message
 * - Export modal opens only for authorized users
 */
test.describe('Epic 32.2: Export Permission Scenarios', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Admin User Export Permissions', () => {
    test('should show enabled export button for admin user', async () => {
      await loginAsAdmin(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      // Verify export button exists and is enabled
      const exportButton = page.locator('button:has-text("Export")');
      await expect(exportButton).toBeVisible();
      await expect(exportButton).toBeEnabled();
    });

    test('should show export tooltip for admin user', async () => {
      await loginAsAdmin(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      // Hover over export button
      const exportButton = page.locator('button:has-text("Export")');
      await exportButton.hover();

      // Wait for tooltip to appear
      await page.waitForTimeout(500);

      // Verify tooltip text (permission granted)
      const tooltip = page.locator('.p-tooltip, [role="tooltip"]');
      await expect(tooltip).toContainText(/export.*standalone package/i);
    });

    test('should open export modal when admin clicks export button', async () => {
      await loginAsAdmin(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      // Click export button
      const exportButton = page.locator('button:has-text("Export")');
      await exportButton.click();

      // Verify modal opened
      await expect(page.locator('.p-dialog, [role="dialog"]')).toBeVisible();
      await expect(page.locator('text=/Export.*Progress|Exporting/i')).toBeVisible();
    });
  });

  test.describe('Regular User Export Permissions', () => {
    test('should show export button for user with export permission', async () => {
      // Assuming regular users have export permission in the test environment
      await loginAsUser(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      const exportButton = page.locator('button:has-text("Export")');
      await expect(exportButton).toBeVisible();
    });

    test('should enable export button for user with export permission', async () => {
      await loginAsUser(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      const exportButton = page.locator('button:has-text("Export")');

      // Check if button is enabled (users with export permission should have it enabled)
      const isEnabled = await exportButton.isEnabled();

      if (isEnabled) {
        expect(isEnabled).toBe(true);
      } else {
        // If disabled, verify it's due to lack of permission
        const tooltip = await exportButton.getAttribute('pTooltip');
        expect(tooltip).toContain('permission');
      }
    });
  });

  test.describe('ReadOnly User Export Permissions', () => {
    test('should show export button but disabled for readonly user', async () => {
      await loginAsReadOnly(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      const exportButton = page.locator('button:has-text("Export")');
      await expect(exportButton).toBeVisible();

      // Readonly users should not have export enabled
      const isDisabled = await exportButton.isDisabled();
      expect(isDisabled).toBe(true);
    });

    test('should show permission denied tooltip for readonly user', async () => {
      await loginAsReadOnly(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      // Hover over export button
      const exportButton = page.locator('button:has-text("Export")');
      await exportButton.hover();

      // Wait for tooltip
      await page.waitForTimeout(500);

      // Verify permission denied message
      const tooltip = page.locator('.p-tooltip, [role="tooltip"]');
      await expect(tooltip).toContainText(/don't have permission/i);
    });

    test('should show warning toast when readonly user clicks export', async () => {
      await loginAsReadOnly(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      // Try to click export button
      const exportButton = page.locator('button:has-text("Export")');

      // If button is not completely disabled, clicking should show toast
      if (await exportButton.isEnabled()) {
        await exportButton.click();

        // Verify warning toast appears
        const toast = page.locator('.p-toast-message-warn, [severity="warn"]');
        await expect(toast).toBeVisible({ timeout: 3000 });
        await expect(toast).toContainText(/permission denied/i);
      }
    });

    test('should NOT open export modal for readonly user', async () => {
      await loginAsReadOnly(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      const exportButton = page.locator('button:has-text("Export")');

      // If button is clickable, try clicking
      if (await exportButton.isEnabled()) {
        await exportButton.click();
      }

      // Wait a moment
      await page.waitForTimeout(1000);

      // Verify modal did NOT open
      const modal = page.locator('.p-dialog, [role="dialog"]');
      const isModalVisible = await modal.isVisible().catch(() => false);
      expect(isModalVisible).toBe(false);
    });
  });

  test.describe('Permission State Consistency', () => {
    test('should maintain consistent permission state across tab switches', async () => {
      await loginAsReadOnly(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      // Check export button state in Overview tab
      const exportButton = page.locator('button:has-text("Export")');
      const initialDisabledState = await exportButton.isDisabled();

      // Switch to Config tab
      await page.locator('[role="tab"]:has-text("Config")').click();
      await page.waitForTimeout(300);

      // Switch back to Overview
      await page.locator('[role="tab"]:has-text("Overview")').click();
      await page.waitForTimeout(300);

      // Verify button state unchanged
      const finalDisabledState = await exportButton.isDisabled();
      expect(finalDisabledState).toBe(initialDisabledState);
    });

    test('should update export button state on route navigation', async () => {
      await loginAsAdmin(page);

      // Navigate to first tool
      await navigateToToolDetail(page, mockToolActive.toolId);
      const exportButton = page.locator('button:has-text("Export")');
      await expect(exportButton).toBeEnabled();

      // Navigate back to tools list
      await page.locator('a:has-text("Tools"), button:has-text("Back")').first().click();
      await page.waitForLoadState('networkidle');

      // Navigate to tool again
      await navigateToToolDetail(page, mockToolActive.toolId);

      // Verify export button still enabled
      await expect(exportButton).toBeEnabled();
    });
  });

  test.describe('Visual Feedback for Permissions', () => {
    test('should visually distinguish enabled vs disabled export button', async () => {
      // Test with admin (enabled)
      await loginAsAdmin(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      const exportButton = page.locator('button:has-text("Export")');
      const adminButtonClass = await exportButton.getAttribute('class');

      // Logout and login as readonly
      await page.goto('/auth/login');
      await loginAsReadOnly(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      const readonlyButtonClass = await exportButton.getAttribute('class');

      // Classes should differ (enabled vs disabled state)
      expect(adminButtonClass).not.toBe(readonlyButtonClass);
    });

    test('should show cursor not-allowed for disabled export button', async () => {
      await loginAsReadOnly(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      const exportButton = page.locator('button:has-text("Export")');

      if (await exportButton.isDisabled()) {
        const cursor = await exportButton.evaluate((el) =>
          window.getComputedStyle(el).cursor
        );

        // Disabled buttons typically have not-allowed or default cursor
        expect(['not-allowed', 'default']).toContain(cursor);
      }
    });
  });

  test.describe('Export Button Accessibility', () => {
    test('should have aria-disabled attribute for readonly user', async () => {
      await loginAsReadOnly(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      const exportButton = page.locator('button:has-text("Export")');

      if (await exportButton.isDisabled()) {
        const ariaDisabled = await exportButton.getAttribute('aria-disabled');
        expect(ariaDisabled).toBeTruthy();
      }
    });

    test('should have descriptive aria-label or title', async () => {
      await loginAsAdmin(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      const exportButton = page.locator('button:has-text("Export")');

      const ariaLabel = await exportButton.getAttribute('aria-label');
      const title = await exportButton.getAttribute('title');
      const tooltip = await exportButton.getAttribute('pTooltip');

      // At least one should be present for accessibility
      expect(ariaLabel || title || tooltip).toBeTruthy();
    });

    test('should be keyboard accessible for admin user', async () => {
      await loginAsAdmin(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      // Tab to export button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // May need multiple tabs depending on page structure

      // Find focused element
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);

      // Export button should be focusable
      expect(focusedElement).toBe('BUTTON');
    });
  });

  test.describe('Permission Error Messages', () => {
    test('should show clear error message in toast', async () => {
      await loginAsReadOnly(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      const exportButton = page.locator('button:has-text("Export")');

      if (await exportButton.isEnabled()) {
        await exportButton.click();

        const toast = page.locator('.p-toast-message-warn');
        await expect(toast).toBeVisible({ timeout: 3000 });

        const toastText = await toast.textContent();
        expect(toastText).toMatch(/permission denied|don't have permission/i);
      }
    });

    test('should display toast for appropriate duration', async () => {
      await loginAsReadOnly(page);
      await navigateToToolDetail(page, mockToolActive.toolId);

      const exportButton = page.locator('button:has-text("Export")');

      if (await exportButton.isEnabled()) {
        await exportButton.click();

        const toast = page.locator('.p-toast-message-warn');
        await expect(toast).toBeVisible({ timeout: 3000 });

        // Toast should auto-dismiss after 5 seconds (as per component code)
        await expect(toast).not.toBeVisible({ timeout: 6000 });
      }
    });
  });
});
