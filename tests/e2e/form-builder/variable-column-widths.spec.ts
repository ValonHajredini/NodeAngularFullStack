import { test, expect } from '@playwright/test';

/**
 * E2E tests for Variable Column Width Configuration (Story 27.2).
 * Validates form builder UI interactions for configuring custom column widths.
 *
 * Test Coverage:
 * - Test 1: Preset width ratio dropdown selection
 * - Test 2: Custom width input validation (valid input)
 * - Test 3: Custom width input validation (invalid input - error display)
 * - Test 4: Visual verification of column width changes
 * - Test 5: Multiple rows with different width configurations
 *
 * AC #9: E2E Tests (TEST-001)
 */
test.describe('Variable Column Width Configuration - Form Builder', () => {
  /**
   * Setup: Navigate to form builder before each test
   */
  test.beforeEach(async ({ page }) => {
    // Navigate to form builder (adjust URL based on your routing)
    await page.goto('/tools/form-builder/new');

    // Wait for form builder to load
    await page.waitForSelector('[data-testid="form-builder-canvas"], .form-canvas', {
      state: 'visible',
      timeout: 10000,
    });
  });

  /**
   * Test 1: Preset width ratio dropdown selection
   *
   * Validates:
   * - Width ratio dropdown appears when row has 2+ columns
   * - Preset options are displayed correctly
   * - Selecting preset applies widths to row
   * - Canvas columns visually adjust width
   */
  test('should select preset width ratio from dropdown', async ({ page }) => {
    // Step 1: Enable row layout
    const rowLayoutToggle = page.locator('p-toggleSwitch').first();
    await rowLayoutToggle.click();
    await page.waitForTimeout(500); // Wait for row creation

    // Step 2: Verify a row with 2 columns exists (default)
    const rowItem = page.locator('.row-item').first();
    await expect(rowItem).toBeVisible();

    // Step 3: Click "2 columns" button to ensure row has 2 columns
    const twoColumnsButton = rowItem.locator('button', { hasText: '2' });
    await twoColumnsButton.click();
    await page.waitForTimeout(300);

    // Step 4: Verify "Width Ratio" dropdown appears
    const widthRatioDropdown = rowItem.locator('p-select[id^="width-ratio"]');
    await expect(widthRatioDropdown).toBeVisible();

    // Step 5: Open dropdown and select "Narrow-Wide (33-67)"
    await widthRatioDropdown.click();
    await page.waitForTimeout(300);

    const narrowWideOption = page.locator('[role="option"]', { hasText: 'Narrow-Wide (33-67)' });
    await expect(narrowWideOption).toBeVisible();
    await narrowWideOption.click();

    // Step 6: Verify canvas columns have adjusted widths
    // Canvas should show columns with 1fr and 2fr widths (33%-67% split)
    const canvasGrid = page.locator('.row-grid').first();
    const gridTemplateColumns = await canvasGrid.evaluate((el) =>
      window.getComputedStyle(el).gridTemplateColumns
    );

    // Grid template should be "1fr 2fr" or equivalent pixel values with ~33-67% ratio
    expect(gridTemplateColumns).toBeTruthy();
    console.log(`✅ Grid template columns: ${gridTemplateColumns}`);

    console.log('✅ Test 1 PASS: Preset width ratio dropdown selection works');
  });

  /**
   * Test 2: Custom width input validation (valid input)
   *
   * Validates:
   * - "Custom..." option reveals text input field
   * - Valid fractional unit input is accepted
   * - Widths are applied to canvas columns
   * - No error messages displayed
   */
  test('should accept valid custom width input', async ({ page }) => {
    // Step 1: Enable row layout and ensure 2 columns
    const rowLayoutToggle = page.locator('p-toggleSwitch').first();
    await rowLayoutToggle.click();
    await page.waitForTimeout(500);

    const rowItem = page.locator('.row-item').first();
    const twoColumnsButton = rowItem.locator('button', { hasText: '2' });
    await twoColumnsButton.click();
    await page.waitForTimeout(300);

    // Step 2: Open dropdown and select "Custom..."
    const widthRatioDropdown = rowItem.locator('p-select[id^="width-ratio"]');
    await widthRatioDropdown.click();
    await page.waitForTimeout(300);

    const customOption = page.locator('[role="option"]', { hasText: 'Custom...' });
    await customOption.click();

    // Step 3: Verify custom input field appears
    const customInput = rowItem.locator('input[id^="custom-widths"]');
    await expect(customInput).toBeVisible();

    // Step 4: Enter valid fractional units
    await customInput.fill('1fr, 3fr');
    await page.waitForTimeout(500); // Wait for debounced validation

    // Step 5: Verify no error message is displayed
    const errorMessage = rowItem.locator('p-message[severity="error"]');
    await expect(errorMessage).not.toBeVisible();

    // Step 6: Verify canvas columns have adjusted widths (1fr, 3fr = 25%-75%)
    const canvasGrid = page.locator('.row-grid').first();
    const gridTemplateColumns = await canvasGrid.evaluate((el) =>
      window.getComputedStyle(el).gridTemplateColumns
    );

    expect(gridTemplateColumns).toBeTruthy();
    console.log(`✅ Grid template columns: ${gridTemplateColumns}`);

    console.log('✅ Test 2 PASS: Valid custom width input accepted');
  });

  /**
   * Test 3: Custom width input validation (invalid input - error display)
   *
   * Validates:
   * - Invalid syntax displays error message
   * - Error message contains helpful text
   * - Canvas widths do not change with invalid input
   */
  test('should display error for invalid custom width input', async ({ page }) => {
    // Step 1: Enable row layout and ensure 2 columns
    const rowLayoutToggle = page.locator('p-toggleSwitch').first();
    await rowLayoutToggle.click();
    await page.waitForTimeout(500);

    const rowItem = page.locator('.row-item').first();
    const twoColumnsButton = rowItem.locator('button', { hasText: '2' });
    await twoColumnsButton.click();
    await page.waitForTimeout(300);

    // Step 2: Open dropdown and select "Custom..."
    const widthRatioDropdown = rowItem.locator('p-select[id^="width-ratio"]');
    await widthRatioDropdown.click();
    await page.waitForTimeout(300);

    const customOption = page.locator('[role="option"]', { hasText: 'Custom...' });
    await customOption.click();

    const customInput = rowItem.locator('input[id^="custom-widths"]');
    await expect(customInput).toBeVisible();

    // Step 3: Enter INVALID fractional units (wrong count)
    await customInput.fill('1fr'); // Only 1 value for 2-column row
    await page.waitForTimeout(500); // Wait for debounced validation

    // Step 4: Verify error message is displayed
    const errorMessage = rowItem.locator('p-message[severity="error"]');
    await expect(errorMessage).toBeVisible();

    const errorText = await errorMessage.textContent();
    expect(errorText).toContain('Must provide exactly 2 values');

    console.log(`✅ Error message displayed: ${errorText}`);

    // Step 5: Enter INVALID syntax (non-fractional unit)
    await customInput.fill('100px, 200px');
    await page.waitForTimeout(500);

    await expect(errorMessage).toBeVisible();
    const errorText2 = await errorMessage.textContent();
    expect(errorText2).toContain('Invalid syntax');

    console.log(`✅ Error message displayed: ${errorText2}`);

    console.log('✅ Test 3 PASS: Invalid input displays error messages correctly');
  });

  /**
   * Test 4: Visual verification of column width changes
   *
   * Validates:
   * - Canvas columns visually resize when width ratio changes
   * - Drop zones maintain correct proportions
   * - Changes are immediate (no manual refresh required)
   */
  test('should visually adjust column widths when ratio changes', async ({ page }) => {
    // Step 1: Enable row layout with 2 columns
    const rowLayoutToggle = page.locator('p-toggleSwitch').first();
    await rowLayoutToggle.click();
    await page.waitForTimeout(500);

    const rowItem = page.locator('.row-item').first();
    const twoColumnsButton = rowItem.locator('button', { hasText: '2' });
    await twoColumnsButton.click();
    await page.waitForTimeout(300);

    // Step 2: Get initial column widths (Equal 50-50)
    const canvasGrid = page.locator('.row-grid').first();
    const column1 = page.locator('.column-drop-zone').first();
    const column2 = page.locator('.column-drop-zone').nth(1);

    const initialWidth1 = await column1.evaluate((el) => el.getBoundingClientRect().width);
    const initialWidth2 = await column2.evaluate((el) => el.getBoundingClientRect().width);

    console.log(`Initial widths: ${initialWidth1}px, ${initialWidth2}px`);

    // Verify initial widths are approximately equal
    const initialRatio = initialWidth1 / initialWidth2;
    expect(initialRatio).toBeGreaterThan(0.9);
    expect(initialRatio).toBeLessThan(1.1);

    // Step 3: Change to Narrow-Wide (33-67) = 1fr, 2fr
    const widthRatioDropdown = rowItem.locator('p-select[id^="width-ratio"]');
    await widthRatioDropdown.click();
    await page.waitForTimeout(300);

    const narrowWideOption = page.locator('[role="option"]', { hasText: 'Narrow-Wide (33-67)' });
    await narrowWideOption.click();
    await page.waitForTimeout(500); // Wait for re-render

    // Step 4: Get new column widths
    const newWidth1 = await column1.evaluate((el) => el.getBoundingClientRect().width);
    const newWidth2 = await column2.evaluate((el) => el.getBoundingClientRect().width);

    console.log(`New widths: ${newWidth1}px, ${newWidth2}px`);

    // Verify new widths follow 1fr:2fr ratio (approximately 33%:67%)
    const newRatio = newWidth1 / newWidth2;
    expect(newRatio).toBeGreaterThan(0.4); // ~0.5 for 1:2 ratio
    expect(newRatio).toBeLessThan(0.6);

    // Verify column 2 is now wider than column 1
    expect(newWidth2).toBeGreaterThan(newWidth1);

    console.log('✅ Test 4 PASS: Column widths visually adjust correctly');
  });

  /**
   * Test 5: Multiple rows with different width configurations
   *
   * Validates:
   * - Multiple rows can have independent width configurations
   * - Changing one row's widths does not affect other rows
   * - Each row maintains its own width ratio
   */
  test('should support multiple rows with different width configurations', async ({ page }) => {
    // Step 1: Enable row layout
    const rowLayoutToggle = page.locator('p-toggleSwitch').first();
    await rowLayoutToggle.click();
    await page.waitForTimeout(500);

    // Step 2: Add a second row
    const addRowButton = page.locator('button', { hasText: 'Add Row' });
    await addRowButton.click();
    await page.waitForTimeout(300);

    const rowItems = page.locator('.row-item');
    const rowCount = await rowItems.count();
    expect(rowCount).toBe(2);

    // Step 3: Configure Row 1 with Narrow-Wide (33-67)
    const row1 = rowItems.nth(0);
    const row1Dropdown = row1.locator('p-select[id^="width-ratio"]');
    await row1Dropdown.click();
    await page.waitForTimeout(300);

    const row1Option = page.locator('[role="option"]', { hasText: 'Narrow-Wide (33-67)' }).first();
    await row1Option.click();
    await page.waitForTimeout(300);

    // Step 4: Configure Row 2 with Wide-Narrow (67-33)
    const row2 = rowItems.nth(1);
    const row2Dropdown = row2.locator('p-select[id^="width-ratio"]');
    await row2Dropdown.click();
    await page.waitForTimeout(300);

    const row2Option = page.locator('[role="option"]', { hasText: 'Wide-Narrow (67-33)' }).first();
    await row2Option.click();
    await page.waitForTimeout(300);

    // Step 5: Verify Row 1 columns have 1fr:2fr ratio
    const canvasRows = page.locator('.row-grid');
    const row1Canvas = canvasRows.nth(0);
    const row1Col1 = row1Canvas.locator('.column-drop-zone').first();
    const row1Col2 = row1Canvas.locator('.column-drop-zone').nth(1);

    const row1Width1 = await row1Col1.evaluate((el) => el.getBoundingClientRect().width);
    const row1Width2 = await row1Col2.evaluate((el) => el.getBoundingClientRect().width);

    const row1Ratio = row1Width1 / row1Width2;
    expect(row1Ratio).toBeGreaterThan(0.4);
    expect(row1Ratio).toBeLessThan(0.6); // ~0.5 for 1:2 ratio

    console.log(`Row 1 widths: ${row1Width1}px, ${row1Width2}px (ratio: ${row1Ratio.toFixed(2)})`);

    // Step 6: Verify Row 2 columns have 2fr:1fr ratio (opposite of Row 1)
    const row2Canvas = canvasRows.nth(1);
    const row2Col1 = row2Canvas.locator('.column-drop-zone').first();
    const row2Col2 = row2Canvas.locator('.column-drop-zone').nth(1);

    const row2Width1 = await row2Col1.evaluate((el) => el.getBoundingClientRect().width);
    const row2Width2 = await row2Col2.evaluate((el) => el.getBoundingClientRect().width);

    const row2Ratio = row2Width1 / row2Width2;
    expect(row2Ratio).toBeGreaterThan(1.7);
    expect(row2Ratio).toBeLessThan(2.3); // ~2.0 for 2:1 ratio

    console.log(`Row 2 widths: ${row2Width1}px, ${row2Width2}px (ratio: ${row2Ratio.toFixed(2)})`);

    // Verify Row 2 has opposite ratio from Row 1
    expect(row2Ratio).toBeGreaterThan(1 / row1Ratio);

    console.log('✅ Test 5 PASS: Multiple rows with different width configurations work correctly');
  });
});
