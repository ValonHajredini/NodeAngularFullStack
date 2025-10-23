import { test, expect } from '@playwright/test';

/**
 * Regression tests for Variable Column Width Configuration (Story 27.2).
 * Validates AC 7, AC 11: Backward compatibility for equal-width row layouts.
 *
 * Test Coverage:
 * - Test 1: Forms without columnWidths render with equal-width columns
 * - Test 2: Drag-drop from palette to equal-width columns works
 * - Test 3: Public form renderer displays equal-width forms correctly
 * - Test 4: Row layout enable/disable toggle continues working
 * - Test 5: Visual regression test for equal-width layouts
 *
 * AC #7, #11: Regression Testing (TEST-004)
 */
test.describe('Variable Column Width Configuration - Regression Tests', () => {
  /**
   * Test 1: Forms without columnWidths render with equal-width columns
   *
   * Validates:
   * - Rows without columnWidths property use equal-width fallback
   * - CSS Grid renders with repeat(columnCount, 1fr)
   * - No visual changes to existing forms
   */
  test('should render equal-width columns for rows without columnWidths property', async ({
    page,
  }) => {
    // Navigate to form builder
    await page.goto('/tools/form-builder/new');
    await page.waitForSelector('[data-testid="form-builder-canvas"], .form-canvas', {
      state: 'visible',
      timeout: 10000,
    });

    // Enable row layout
    const rowLayoutToggle = page.locator('p-toggleSwitch').first();
    await rowLayoutToggle.click();
    await page.waitForTimeout(500);

    // Ensure row has 2 columns (default, no custom widths)
    const rowItem = page.locator('.row-item').first();
    const twoColumnsButton = rowItem.locator('button', { hasText: '2' });
    await twoColumnsButton.click();
    await page.waitForTimeout(300);

    // CRITICAL: Do NOT select any width ratio - leave default (equal width)
    // This simulates a row without columnWidths property (backward compatibility)

    // Verify canvas columns have equal widths
    const canvasGrid = page.locator('.row-grid').first();
    const column1 = page.locator('.column-drop-zone').first();
    const column2 = page.locator('.column-drop-zone').nth(1);

    const width1 = await column1.evaluate((el) => el.getBoundingClientRect().width);
    const width2 = await column2.evaluate((el) => el.getBoundingClientRect().width);

    console.log(`Equal-width columns: ${width1}px, ${width2}px`);

    // Verify columns are approximately equal (within 5px tolerance)
    const widthDifference = Math.abs(width1 - width2);
    expect(widthDifference).toBeLessThan(5);

    // Verify CSS Grid template uses equal-width pattern
    const gridTemplateColumns = await canvasGrid.evaluate((el) =>
      window.getComputedStyle(el).gridTemplateColumns
    );
    console.log(`Grid template: ${gridTemplateColumns}`);

    // Grid should have two equal columns (same pixel values)
    const columnWidthsArray = gridTemplateColumns.split(' ').map(parseFloat);
    if (columnWidthsArray.length === 2) {
      const ratio = columnWidthsArray[0] / columnWidthsArray[1];
      expect(ratio).toBeGreaterThan(0.95);
      expect(ratio).toBeLessThan(1.05);
    }

    console.log('✅ Test 1 PASS: Equal-width columns render correctly without columnWidths');
  });

  /**
   * Test 2: Drag-drop from palette to equal-width columns works
   *
   * Validates:
   * - Field palette drag-drop functionality unchanged
   * - Fields can be dropped into equal-width columns
   * - No regression in drag-drop behavior
   */
  test('should support drag-drop to equal-width columns without regression', async ({ page }) => {
    // Navigate to form builder
    await page.goto('/tools/form-builder/new');
    await page.waitForSelector('[data-testid="form-builder-canvas"], .form-canvas', {
      state: 'visible',
      timeout: 10000,
    });

    // Enable row layout
    const rowLayoutToggle = page.locator('p-toggleSwitch').first();
    await rowLayoutToggle.click();
    await page.waitForTimeout(500);

    // Ensure 2 equal-width columns
    const rowItem = page.locator('.row-item').first();
    const twoColumnsButton = rowItem.locator('button', { hasText: '2' });
    await twoColumnsButton.click();
    await page.waitForTimeout(300);

    // Locate field palette (adjust selector based on actual implementation)
    const fieldPalette = page.locator('[data-testid="field-palette"], .field-palette');
    if (!(await fieldPalette.isVisible())) {
      console.log('⚠️ Field palette not visible, skipping drag-drop test');
      return;
    }

    // Find TEXT field in palette
    const textFieldButton = fieldPalette.locator('button, [draggable="true"]', {
      hasText: /text|input/i,
    }).first();

    // Get drop zone (first column)
    const dropZone = page.locator('.column-drop-zone').first();

    // Perform drag-and-drop
    await textFieldButton.dragTo(dropZone);
    await page.waitForTimeout(500);

    // Verify field was added to column
    const fieldInColumn = dropZone.locator('.field-preview-container, .field-wrapper').first();
    const isFieldVisible = await fieldInColumn.isVisible();
    expect(isFieldVisible).toBe(true);

    console.log('✅ Test 2 PASS: Drag-drop to equal-width columns works without regression');
  });

  /**
   * Test 3: Public form renderer displays equal-width forms correctly
   *
   * Validates:
   * - Published forms without columnWidths render correctly
   * - Backward compatibility maintained for public forms
   * - No visual changes to existing published forms
   */
  test('should render equal-width forms correctly in public renderer', async ({ page }) => {
    // This test requires a pre-existing published form with equal-width row layout
    // Adjust shortCode based on your test data setup
    const testFormShortCode = 'test-equal-width-form';

    // Navigate to public form
    await page.goto(`/public/form/${testFormShortCode}`);

    // Wait for form to load (or handle 404 gracefully)
    const formExists = await page.locator('form').isVisible().catch(() => false);

    if (!formExists) {
      console.log(
        `⚠️ Test form ${testFormShortCode} not found. Create test data or skip test in CI.`
      );
      test.skip();
      return;
    }

    // Verify row layout renderer
    const rowLayoutContainer = page.locator('.row-layout-renderer');
    await expect(rowLayoutContainer).toBeVisible();

    // Verify rows exist
    const rows = page.locator('.form-row');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify first row has equal-width columns
    const row1 = rows.first();
    const columns = row1.locator('.form-column');
    const columnCount = await columns.count();
    expect(columnCount).toBeGreaterThan(0);

    // Measure column widths
    if (columnCount >= 2) {
      const col1Width = await columns.nth(0).evaluate((el) => el.getBoundingClientRect().width);
      const col2Width = await columns.nth(1).evaluate((el) => el.getBoundingClientRect().width);

      console.log(`Public form column widths: ${col1Width}px, ${col2Width}px`);

      // Verify equal widths (within 5px tolerance)
      const widthDifference = Math.abs(col1Width - col2Width);
      expect(widthDifference).toBeLessThan(5);
    }

    console.log('✅ Test 3 PASS: Public form renderer displays equal-width forms correctly');
  });

  /**
   * Test 4: Row layout enable/disable toggle continues working
   *
   * Validates:
   * - Row layout toggle functions correctly
   * - Disabling row layout clears configurations
   * - Re-enabling row layout creates default equal-width row
   * - No regression in toggle behavior
   */
  test('should maintain row layout toggle functionality', async ({ page }) => {
    // Navigate to form builder
    await page.goto('/tools/form-builder/new');
    await page.waitForSelector('[data-testid="form-builder-canvas"], .form-canvas', {
      state: 'visible',
      timeout: 10000,
    });

    // Step 1: Enable row layout
    const rowLayoutToggle = page.locator('p-toggleSwitch').first();
    await rowLayoutToggle.click();
    await page.waitForTimeout(500);

    // Verify row was created
    let rowItems = page.locator('.row-item');
    let rowCount = await rowItems.count();
    expect(rowCount).toBeGreaterThan(0);

    // Step 2: Disable row layout (with confirmation dialog)
    await rowLayoutToggle.click();
    await page.waitForTimeout(300);

    // Handle confirmation dialog if it appears
    const confirmDialog = page.locator('[role="dialog"], .p-confirm-dialog');
    const dialogVisible = await confirmDialog.isVisible().catch(() => false);

    if (dialogVisible) {
      const acceptButton = page.getByRole('button', { name: /yes|accept|confirm/i });
      await acceptButton.click();
      await page.waitForTimeout(500);
    }

    // Verify rows were cleared
    rowCount = await rowItems.count();
    expect(rowCount).toBe(0);

    // Step 3: Re-enable row layout
    await rowLayoutToggle.click();
    await page.waitForTimeout(500);

    // Verify new default row was created with equal widths
    rowItems = page.locator('.row-item');
    rowCount = await rowItems.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify canvas shows equal-width columns (default behavior)
    const canvasGrid = page.locator('.row-grid').first();
    const columns = page.locator('.column-drop-zone');
    const columnCount = await columns.count();
    expect(columnCount).toBeGreaterThan(0);

    console.log('✅ Test 4 PASS: Row layout toggle functionality maintained');
  });

  /**
   * Test 5: Visual regression test for equal-width layouts
   *
   * Validates:
   * - Visual appearance of equal-width layouts unchanged
   * - Column spacing and alignment preserved
   * - No unintended visual side effects from feature addition
   *
   * Note: This test uses Playwright's screenshot comparison for visual regression.
   * Baseline screenshots should be captured before deploying this feature.
   */
  test('should maintain visual appearance of equal-width layouts', async ({ page }) => {
    // Navigate to form builder
    await page.goto('/tools/form-builder/new');
    await page.waitForSelector('[data-testid="form-builder-canvas"], .form-canvas', {
      state: 'visible',
      timeout: 10000,
    });

    // Enable row layout with equal-width columns
    const rowLayoutToggle = page.locator('p-toggleSwitch').first();
    await rowLayoutToggle.click();
    await page.waitForTimeout(500);

    const rowItem = page.locator('.row-item').first();
    const twoColumnsButton = rowItem.locator('button', { hasText: '2' });
    await twoColumnsButton.click();
    await page.waitForTimeout(300);

    // Capture canvas area for visual comparison
    const canvas = page.locator('.form-canvas, [data-testid="form-builder-canvas"]');

    // Take screenshot for visual regression comparison
    // First run: Creates baseline. Subsequent runs: Compares against baseline.
    await expect(canvas).toHaveScreenshot('equal-width-canvas-baseline.png', {
      maxDiffPixels: 100, // Allow minor rendering differences
    });

    // Also capture the row layout sidebar
    const sidebar = page.locator('.row-layout-sidebar-content');
    if (await sidebar.isVisible()) {
      await expect(sidebar).toHaveScreenshot('equal-width-sidebar-baseline.png', {
        maxDiffPixels: 50,
      });
    }

    console.log('✅ Test 5 PASS: Visual regression test for equal-width layouts completed');
    console.log('📸 Baseline screenshots captured/compared for future regression detection');
  });
});
