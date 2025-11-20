import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth-helpers';
import { mockToolActive } from '../fixtures/tool-fixtures';

/**
 * Epic 32.2 - Task 2: Tools List to Tool Detail Navigation
 *
 * Tests complete user flow from tools list to tool detail page:
 * - Clicking tool card navigates correctly
 * - URL updates with toolId
 * - ToolGuard validates tool existence
 * - Browser back/forward navigation works
 * - Direct URL access works
 * - Invalid toolId redirects to 404
 */
test.describe('Epic 32.2: Tool Navigation', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should navigate from tools list to tool detail by clicking card', async () => {
    // Navigate to tools list
    await page.goto('/app/tools');
    await page.waitForLoadState('networkidle');

    // Verify tools list loaded
    await expect(page.locator('h1, h2')).toContainText(/Tools|Tool Registry/i);

    // Click on a tool card (looking for various possible selectors)
    const toolCard = page.locator(
      `[data-testid="tool-card"]:has-text("${mockToolActive.name}"), ` +
      `.tool-card:has-text("${mockToolActive.name}"), ` +
      `p-card:has-text("${mockToolActive.name}")`
    ).first();

    await toolCard.waitFor({ state: 'visible', timeout: 5000 });
    await toolCard.click();

    // Verify navigation to tool detail
    await expect(page).toHaveURL(/\/app\/tools\/detail\//, { timeout: 5000 });

    // Verify tool detail page content
    await expect(page.locator('h1')).toContainText(mockToolActive.name, { timeout: 3000 });
  });

  test('should update URL with correct toolId parameter', async () => {
    await page.goto(`/app/tools/detail/${mockToolActive.tool_id}`);
    await page.waitForLoadState('networkidle');

    // Verify URL contains toolId
    expect(page.url()).toContain(`/app/tools/detail/${mockToolActive.tool_id}`);

    // Verify page loaded successfully
    await expect(page.locator('h1')).toContainText(mockToolActive.name);
  });

  test('should allow browser back button to return to tools list', async () => {
    // Navigate to tools list
    await page.goto('/app/tools');
    await page.waitForLoadState('networkidle');

    // Navigate to tool detail
    await page.goto(`/app/tools/detail/${mockToolActive.tool_id}`);
    await page.waitForLoadState('networkidle');

    // Click browser back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Verify returned to tools list
    await expect(page).toHaveURL(/\/app\/tools\/?$/);
    await expect(page.locator('h1, h2')).toContainText(/Tools|Tool Registry/i);
  });

  test('should allow browser forward button to return to tool detail', async () => {
    // Navigate tools list -> detail -> back -> forward
    await page.goto('/app/tools');
    await page.waitForLoadState('networkidle');

    await page.goto(`/app/tools/detail/${mockToolActive.tool_id}`);
    await page.waitForLoadState('networkidle');

    await page.goBack();
    await page.waitForLoadState('networkidle');

    await page.goForward();
    await page.waitForLoadState('networkidle');

    // Verify returned to tool detail
    await expect(page).toHaveURL(/\/app\/tools\/detail\//);
    await expect(page.locator('h1')).toContainText(mockToolActive.name);
  });

  test('should support direct URL navigation to tool detail page', async () => {
    // Direct navigation via URL
    await page.goto(`/app/tools/detail/${mockToolActive.tool_id}`);
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    await expect(page).toHaveURL(`/app/tools/detail/${mockToolActive.tool_id}`);
    await expect(page.locator('h1')).toContainText(mockToolActive.name);

    // Verify tab interface visible
    await expect(page.locator('[role="tablist"], .p-tabview-nav')).toBeVisible();
  });

  test('should redirect to 404 for invalid toolId', async () => {
    // Navigate to non-existent tool
    await page.goto('/app/tools/detail/non-existent-tool-999');

    // Wait for navigation (should redirect to 404 or show error)
    await page.waitForLoadState('networkidle');

    // Check for 404 page OR error message on tool detail page
    const is404Page = await page.locator('h1:has-text("404"), h1:has-text("Not Found")').isVisible().catch(() => false);
    const hasErrorMessage = await page.locator('.p-message-error, [severity="error"]').isVisible().catch(() => false);

    expect(is404Page || hasErrorMessage).toBeTruthy();
  });

  test('should not show console errors during navigation flow', async () => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Perform complete navigation flow
    await page.goto('/app/tools');
    await page.waitForLoadState('networkidle');

    await page.goto(`/app/tools/detail/${mockToolActive.tool_id}`);
    await page.waitForLoadState('networkidle');

    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Filter out expected/known errors (if any)
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes('DevTools') && !err.includes('favicon')
    );

    expect(criticalErrors.length).toBe(0);
  });
});
