import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * WCAG AA Accessibility tests for Form Analytics Charts.
 * Validates AC12: Accessibility compliance including:
 * - WCAG 2.1 Level AA compliance
 * - Color contrast requirements
 * - Screen reader support
 * - Keyboard navigation
 * - ARIA attributes
 */
test.describe('Form Analytics Charts - WCAG AA Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and authenticate as admin
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('Admin123!@#');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Wait for successful login and redirect
    await page.waitForURL('**/dashboard');

    // Navigate to analytics page with test form
    await page.goto('/app/tools/form-builder/test-form-with-submissions/analytics');

    // Wait for charts to load
    await page.waitForSelector('.charts-dashboard', { timeout: 10000 });
  });

  test('should pass automated WCAG AA accessibility scan', async ({ page }) => {
    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Verify no violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper color contrast for chart elements', async ({ page }) => {
    // Run axe scan specifically for color contrast
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.color'])
      .analyze();

    // Check for color contrast violations
    const colorContrastViolations = accessibilityScanResults.violations.filter(
      (violation) => violation.id === 'color-contrast'
    );

    expect(colorContrastViolations).toHaveLength(0);
  });

  test('should have proper ARIA labels on all interactive elements', async ({ page }) => {
    // Check that all buttons have accessible names
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const accessibleName = await button.getAttribute('aria-label') || await button.textContent();
      expect(accessibleName).toBeTruthy();
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Run axe scan for heading hierarchy
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.semantics'])
      .analyze();

    // Check for heading violations
    const headingViolations = accessibilityScanResults.violations.filter(
      (violation) => violation.id.includes('heading')
    );

    expect(headingViolations).toHaveLength(0);
  });

  test('should have proper focus indicators on interactive elements', async ({ page }) => {
    // Run axe scan for keyboard focus
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.keyboard'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should announce chart updates to screen readers', async ({ page }) => {
    // Check for aria-live region
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();

    // Verify content updates when data changes
    const initialContent = await liveRegion.textContent();
    expect(initialContent).toBeTruthy();
  });

  test('should have data table alternative for charts', async ({ page }) => {
    // Check for screen reader accessible table
    const srTable = page.locator('.sr-only table, [role="table"]').first();
    await expect(srTable).toBeAttached();

    // Verify table has proper structure
    const headers = await srTable.locator('th').count();
    expect(headers).toBeGreaterThan(0);
  });

  test('should allow toggling to visible data table view', async ({ page }) => {
    // Find the "Show Data Table" button
    const toggleButton = page.getByRole('button', { name: /show data table/i }).first();
    await expect(toggleButton).toBeVisible();

    // Click to show data table
    await toggleButton.click();

    // Verify data table is visible
    const dataTable = page.locator('p-table').first();
    await expect(dataTable).toBeVisible();

    // Verify accessibility of visible table
    const tableAccessibility = await new AxeBuilder({ page })
      .include('p-table')
      .analyze();

    expect(tableAccessibility.violations).toEqual([]);
  });

  test('should support keyboard navigation for chart/table toggle', async ({ page }) => {
    // Tab to the toggle button
    const toggleButton = page.getByRole('button', { name: /show data table/i }).first();

    // Focus the button using keyboard
    await toggleButton.focus();

    // Verify button has focus
    await expect(toggleButton).toBeFocused();

    // Press Enter to toggle
    await page.keyboard.press('Enter');

    // Wait for table to appear
    await page.waitForTimeout(300);

    // Verify data table is now visible
    const dataTable = page.locator('p-table').first();
    await expect(dataTable).toBeVisible();
  });

  test('should have proper landmark regions', async ({ page }) => {
    // Run axe scan for landmarks
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.structure'])
      .analyze();

    // Check for landmark violations
    const landmarkViolations = accessibilityScanResults.violations.filter(
      (violation) => violation.id.includes('region') || violation.id.includes('landmark')
    );

    expect(landmarkViolations).toHaveLength(0);
  });

  test('should have descriptive alt text for chart images', async ({ page }) => {
    // Check that chart containers have descriptive aria-labels
    const chartContainers = page.locator('[role="img"]');
    const count = await chartContainers.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const ariaLabel = await chartContainers.nth(i).getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel!.length).toBeGreaterThan(10); // Should be descriptive
      }
    }
  });

  test('should maintain accessibility when filtering data', async ({ page }) => {
    // Apply a filter to change chart data
    const filterInput = page.locator('[data-testid="table-filter-input"], input[placeholder*="Search"]');
    await filterInput.fill('test');
    await page.waitForTimeout(500);

    // Run accessibility scan after filter
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper table headers and scope attributes', async ({ page }) => {
    // Show data table view
    const toggleButton = page.getByRole('button', { name: /show data table/i }).first();
    await toggleButton.click();

    // Wait for table to render
    await page.waitForTimeout(300);

    // Check that table headers have proper scope attributes
    const headers = page.locator('p-table th[scope="col"]');
    const headerCount = await headers.count();

    expect(headerCount).toBeGreaterThan(0);
  });

  test('should pass accessibility scan on mobile viewport', async ({ page, isMobile }) => {
    if (isMobile) {
      // Run accessibility scan on mobile
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    } else {
      test.skip('This test only runs on mobile devices');
    }
  });

  test('should have no duplicate IDs', async ({ page }) => {
    // Run axe scan for duplicate IDs
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['duplicate-id'])
      .analyze();

    const duplicateIdViolations = accessibilityScanResults.violations.filter(
      (violation) => violation.id === 'duplicate-id'
    );

    expect(duplicateIdViolations).toHaveLength(0);
  });

  test('should have proper form labels if any forms exist', async ({ page }) => {
    // Run axe scan for form labels
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['label'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support high contrast mode', async ({ page, browserName }) => {
    // Skip for browsers that don't support forced colors
    if (browserName !== 'chromium') {
      test.skip('High contrast mode test only supported on Chromium');
    }

    // Enable high contrast mode
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });

    // Run accessibility scan in high contrast mode
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper page title and lang attribute', async ({ page }) => {
    // Check that page has lang attribute
    const html = page.locator('html');
    const lang = await html.getAttribute('lang');

    expect(lang).toBeTruthy();
    expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., "en" or "en-US"

    // Check that page has a title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should maintain accessibility standards across all chart types', async ({ page }) => {
    // Get all chart components
    const barCharts = await page.locator('app-bar-chart').count();
    const lineCharts = await page.locator('app-line-chart').count();
    const pieCharts = await page.locator('app-pie-chart').count();
    const statCards = await page.locator('app-stat-card').count();

    const totalCharts = barCharts + lineCharts + pieCharts + statCards;

    // Verify at least some charts are present
    expect(totalCharts).toBeGreaterThan(0);

    // Run comprehensive accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Report any violations with details
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility violations found:');
      accessibilityScanResults.violations.forEach((violation) => {
        console.log(`- ${violation.id}: ${violation.description}`);
        console.log(`  Impact: ${violation.impact}`);
        console.log(`  Help: ${violation.help}`);
      });
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

/**
 * Screen reader specific tests
 * These tests verify screen reader announcements and navigation
 */
test.describe('Form Analytics Charts - Screen Reader Support', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('Admin123!@#');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL('**/dashboard');

    // Navigate to analytics
    await page.goto('/app/tools/form-builder/test-form-with-submissions/analytics');
    await page.waitForSelector('.charts-dashboard', { timeout: 10000 });
  });

  test('should have screen reader accessible chart descriptions', async ({ page }) => {
    // Check for aria-label on chart regions
    const chartRegions = page.locator('[role="region"][aria-label*="Chart"]');
    const count = await chartRegions.count();

    expect(count).toBeGreaterThan(0);

    // Verify each region has a meaningful label
    for (let i = 0; i < count; i++) {
      const label = await chartRegions.nth(i).getAttribute('aria-label');
      expect(label).toBeTruthy();
      expect(label!.toLowerCase()).toContain('chart');
    }
  });

  test('should announce chart type to screen readers', async ({ page }) => {
    // Check for descriptive role="img" elements with chart descriptions
    const chartImages = page.locator('[role="img"]');
    const count = await chartImages.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const ariaLabel = await chartImages.nth(i).getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();

        // Should mention the chart type
        const hasChartType = /bar chart|line chart|pie chart/i.test(ariaLabel!);
        expect(hasChartType).toBe(true);
      }
    }
  });

  test('should provide data summary in aria-label', async ({ page }) => {
    // Get first chart with role="img"
    const firstChart = page.locator('[role="img"]').first();

    if (await firstChart.isVisible()) {
      const ariaLabel = await firstChart.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();

      // Should include key statistics in description
      const hasTotalOrCount = /total|count|responses/i.test(ariaLabel!);
      expect(hasTotalOrCount).toBe(true);
    }
  });
});
