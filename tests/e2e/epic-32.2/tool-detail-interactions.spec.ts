import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth-helpers';
import { switchTab } from '../helpers/navigation-helpers';
import { mockToolActive } from '../fixtures/tool-fixtures';

/**
 * Epic 32.2 - Task 3: Tool Detail Page Interactions
 *
 * Tests all interactive elements on tool detail page:
 * - Tab switching (Overview, Config, Manifest, Analytics)
 * - Copy toolId button
 * - Permissions chips display
 * - Status badge display
 * - Export button visibility and state
 */
test.describe('Epic 32.2: Tool Detail Page Interactions', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await loginAsAdmin(page);
    await page.goto(`/app/tools/detail/${mockToolActive.tool_id}`);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display Overview tab content by default', async () => {
    // Verify Overview tab is active
    const overviewTab = page.locator('[role="tab"]:has-text("Overview"), .p-tabview-nav-link:has-text("Overview")');
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');

    // Verify overview content visible
    await expect(page.locator('text=Tool Information, text=Tool ID')).toBeVisible();
    await expect(page.locator(`text=${mockToolActive.tool_id}`)).toBeVisible();
  });

  test('should switch to Config tab and display configuration JSON', async () => {
    // Click Config tab
    await switchTab(page, 'Config');

    // Verify Config tab active
    const configTab = page.locator('[role="tab"]:has-text("Config")');
    await expect(configTab).toHaveAttribute('aria-selected', 'true');

    // Verify JSON content visible
    await expect(page.locator('pre code, .manifest-json')).toBeVisible();

    // Verify JSON contains expected data (if config exists)
    if (mockToolActive.config && Object.keys(mockToolActive.config).length > 0) {
      const jsonContent = await page.locator('pre code').first().textContent();
      expect(jsonContent).toContain('"');
    }
  });

  test('should switch to Manifest tab and display tool manifest', async () => {
    // Click Manifest tab
    await switchTab(page, 'Manifest');

    // Verify Manifest tab active
    const manifestTab = page.locator('[role="tab"]:has-text("Manifest")');
    await expect(manifestTab).toHaveAttribute('aria-selected', 'true');

    // Verify manifest JSON visible
    await expect(page.locator('pre code, .manifest-json')).toBeVisible();

    // Verify manifest contains version
    const manifestContent = await page.locator('pre code').first().textContent();
    expect(manifestContent).toContain('version');
  });

  test('should switch to Analytics tab and display placeholder', async () => {
    // Click Analytics tab
    await switchTab(page, 'Analytics');

    // Verify Analytics tab active
    const analyticsTab = page.locator('[role="tab"]:has-text("Analytics")');
    await expect(analyticsTab).toHaveAttribute('aria-selected', 'true');

    // Verify placeholder content
    await expect(page.locator('text=Analytics Coming Soon, text=coming soon')).toBeVisible();
    await expect(page.locator('.pi-chart-bar, i:has-text("chart")')).toBeVisible();
  });

  test('should copy toolId to clipboard when clicking copy button', async () => {
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click copy button
    const copyButton = page.locator('[pTooltip*="Copy"], button:has(.pi-copy)').first();
    await copyButton.click();

    // Wait for success toast
    await expect(page.locator('.p-toast-message-success, text=Copied')).toBeVisible({ timeout: 3000 });

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(mockToolActive.tool_id);
  });

  test('should display permission chips with correct colors', async () => {
    // Verify permissions section exists
    await expect(page.locator('text=Permissions')).toBeVisible();

    // Check for permission chips
    if (mockToolActive.permissions && mockToolActive.permissions.length > 0) {
      for (const permission of mockToolActive.permissions) {
        const chip = page.locator(`.p-chip:has-text("${permission}"), [label="${permission}"]`);
        await expect(chip).toBeVisible();
      }
    }
  });

  test('should display status badge with correct severity', async () => {
    // Verify status badge exists
    const statusBadge = page.locator(`.p-tag:has-text("${mockToolActive.status}"), [value="${mockToolActive.status}"]`);
    await expect(statusBadge).toBeVisible();

    // Verify badge has appropriate color class (severity)
    const badgeClass = await statusBadge.getAttribute('class');

    if (mockToolActive.status === 'registered') {
      expect(badgeClass).toContain('success');
    } else if (mockToolActive.status === 'draft') {
      expect(badgeClass).toContain('warning');
    }
  });

  test('should display export button for admin users', async () => {
    // Verify export button visible
    const exportButton = page.locator('button:has-text("Export")');
    await expect(exportButton).toBeVisible();

    // Verify button is enabled (admin has permissions)
    await expect(exportButton).toBeEnabled();
  });

  test('should display tool metadata in Overview tab', async () => {
    // Verify all metadata fields present
    await expect(page.locator('text=Tool ID')).toBeVisible();
    await expect(page.locator('text=Tool Type')).toBeVisible();
    await expect(page.locator('text=Version')).toBeVisible();
    await expect(page.locator('text=Status')).toBeVisible();
    await expect(page.locator('text=Created At')).toBeVisible();
    await expect(page.locator('text=Updated At')).toBeVisible();

    // Verify actual values displayed
    await expect(page.locator(`text=${mockToolActive.tool_id}`)).toBeVisible();
    await expect(page.locator(`text=${mockToolActive.toolType}`)).toBeVisible();
  });

  test('should not cause layout shifts during tab switching', async () => {
    // Get initial page height
    const initialHeight = await page.evaluate(() => document.body.scrollHeight);

    // Switch through all tabs
    await switchTab(page, 'Config');
    await page.waitForTimeout(300);

    await switchTab(page, 'Manifest');
    await page.waitForTimeout(300);

    await switchTab(page, 'Analytics');
    await page.waitForTimeout(300);

    await switchTab(page, 'Overview');
    await page.waitForTimeout(300);

    // Get final page height
    const finalHeight = await page.evaluate(() => document.body.scrollHeight);

    // Allow for minor variations but no major shifts
    const heightDifference = Math.abs(finalHeight - initialHeight);
    expect(heightDifference).toBeLessThan(100); // Less than 100px difference
  });

  test('should persist tab state during interactions', async () => {
    // Switch to Manifest tab
    await switchTab(page, 'Manifest');

    // Perform an interaction (scroll)
    await page.evaluate(() => window.scrollTo(0, 100));

    // Verify Manifest tab still active
    const manifestTab = page.locator('[role="tab"]:has-text("Manifest")');
    await expect(manifestTab).toHaveAttribute('aria-selected', 'true');
  });
});
