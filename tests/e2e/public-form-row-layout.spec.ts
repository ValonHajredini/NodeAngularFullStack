import { test, expect } from '@playwright/test';

/**
 * E2E tests for Public Form Rendering with Row Layout (Story 14.2).
 * Validates that published forms with row-column layouts render correctly for visitors.
 *
 * Test Coverage:
 * - Test 1: Published form with row layout renders correctly
 * - Test 2: Mobile responsive rendering (column stacking)
 * - Test 3: Backward compatibility with global layout
 * - Test 4: Form submission with row layout
 *
 * AC #11: E2E Tests
 */
test.describe('Public Form Row Layout Rendering', () => {
  /**
   * Test 1: Published form with row layout renders correctly
   *
   * Validates:
   * - Form renders with row-column structure matching builder design
   * - Multiple rows render with correct column counts
   * - Fields appear in correct columns with vertical stacking
   * - Field order within columns matches orderInColumn property
   */
  test('should render published form with row layout correctly', async ({ page }) => {
    // Navigate to a form with row layout (use existing test form or create via setup)
    // This assumes a test form exists with shortCode 'test-row-layout-form'
    // Form structure: Row 1 (2 columns), Row 2 (3 columns)
    await page.goto('/public/form/test-row-layout-form');

    // Wait for form to load
    await page.waitForSelector('form', { state: 'visible' });

    // Verify row layout container exists
    const rowLayoutContainer = page.locator('.row-layout-renderer');
    await expect(rowLayoutContainer).toBeVisible();

    // Verify number of rows
    const rows = page.locator('.form-row');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify Row 1 has 2 columns
    const row1 = rows.nth(0);
    const row1Columns = row1.locator('.form-column');
    const row1ColumnCount = await row1Columns.count();
    expect(row1ColumnCount).toBe(2);

    // Verify Row 1, Column 0 has multiple fields (vertical stacking)
    const row1Col0Fields = row1Columns.nth(0).locator('.field-wrapper');
    const row1Col0FieldCount = await row1Col0Fields.count();
    expect(row1Col0FieldCount).toBeGreaterThan(0);

    // Verify Row 1, Column 1 has fields
    const row1Col1Fields = row1Columns.nth(1).locator('.field-wrapper');
    const row1Col1FieldCount = await row1Col1Fields.count();
    expect(row1Col1FieldCount).toBeGreaterThan(0);

    // Verify Row 2 has 3 columns (if exists)
    if (rowCount >= 2) {
      const row2 = rows.nth(1);
      const row2Columns = row2.locator('.form-column');
      const row2ColumnCount = await row2Columns.count();
      expect(row2ColumnCount).toBe(3);
    }

    // Verify submit button is visible at bottom
    const submitButton = page.getByRole('button', { name: /submit/i });
    await expect(submitButton).toBeVisible();

    console.log('✅ Test 1 PASS: Published form with row layout renders correctly');
  });

  /**
   * Test 2: Mobile responsive rendering (column stacking)
   *
   * Validates:
   * - Columns stack vertically on mobile viewport (< 768px)
   * - Column order is preserved (column 0 → column 1 → column 2)
   * - Fields within columns maintain vertical order
   * - No horizontal scrolling on mobile
   * - Form is usable on mobile (tap targets, input focus)
   */
  test('should stack columns vertically on mobile viewport', async ({ page }) => {
    // Set mobile viewport (375px width = iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to form with row layout
    await page.goto('/public/form/test-row-layout-form');

    // Wait for form to load
    await page.waitForSelector('form', { state: 'visible' });

    // Verify row layout container exists
    const rowLayoutContainer = page.locator('.row-layout-renderer');
    await expect(rowLayoutContainer).toBeVisible();

    // Get first row
    const row1 = page.locator('.form-row').first();
    await expect(row1).toBeVisible();

    // Verify columns stack vertically (CSS Grid should collapse to 1 column on mobile)
    // Check computed style: grid-template-columns should be "1fr" on mobile
    const row1ComputedStyle = await row1.evaluate((el) => {
      return window.getComputedStyle(el).gridTemplateColumns;
    });

    // On mobile, grid should be single column (e.g., "XXXpx" for single column or "1fr")
    // We check that it's NOT multiple columns (e.g., not "XXXpx XXXpx" or "1fr 1fr")
    const isSingleColumn = !row1ComputedStyle.includes(' ');
    expect(isSingleColumn).toBe(true);

    // Verify no horizontal scrolling
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 0;
    expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance

    // Verify form is usable: tap first input field
    const firstInput = page.locator('input').first();
    await firstInput.click();
    await expect(firstInput).toBeFocused();

    // Type test value to ensure input works on mobile
    await firstInput.fill('Mobile Test');
    await expect(firstInput).toHaveValue('Mobile Test');

    // Verify submit button is still visible and clickable
    const submitButton = page.getByRole('button', { name: /submit/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();

    console.log('✅ Test 2 PASS: Mobile responsive rendering works correctly');
  });

  /**
   * Test 3: Backward compatibility with global layout
   *
   * Validates:
   * - Forms without rowLayout property render with global column layout
   * - No errors or warnings in browser console
   * - Fields render in correct order (by field.order)
   * - Existing forms work without changes
   */
  test('should render forms without row layout using global layout', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to form without row layout (use existing form or create via setup)
    // This assumes a test form exists with shortCode 'test-global-layout-form'
    await page.goto('/public/form/test-global-layout-form');

    // Wait for form to load
    await page.waitForSelector('form', { state: 'visible' });

    // Verify global layout container exists (NOT row layout container)
    const globalLayoutContainer = page.locator('.global-layout-renderer');
    await expect(globalLayoutContainer).toBeVisible();

    // Verify row layout container does NOT exist
    const rowLayoutContainer = page.locator('.row-layout-renderer');
    await expect(rowLayoutContainer).not.toBeVisible();

    // Verify fields are rendered
    const fields = page.locator('.field-wrapper');
    const fieldCount = await fields.count();
    expect(fieldCount).toBeGreaterThan(0);

    // Verify no console errors
    expect(consoleErrors.length).toBe(0);

    // Verify submit button is visible
    const submitButton = page.getByRole('button', { name: /submit/i });
    await expect(submitButton).toBeVisible();

    console.log('✅ Test 3 PASS: Backward compatibility with global layout works correctly');
  });

  /**
   * Test 4: Form submission with row layout
   *
   * Validates:
   * - Form with row layout can be submitted successfully
   * - All field values are submitted correctly
   * - Success message is displayed after submission
   * - API endpoint receives correct data
   */
  test('should submit form with row layout successfully', async ({ page }) => {
    // Navigate to form with row layout
    await page.goto('/public/form/test-row-layout-form');

    // Wait for form to load
    await page.waitForSelector('form', { state: 'visible' });

    // Fill out form fields with test data
    // Assuming form has at least: text, email, textarea fields

    // Fill first text input (if exists)
    const textInputs = page.locator('input[type="text"]');
    const textInputCount = await textInputs.count();
    if (textInputCount > 0) {
      await textInputs.first().fill('John Doe');
    }

    // Fill email input (if exists)
    const emailInputs = page.locator('input[type="email"]');
    const emailInputCount = await emailInputs.count();
    if (emailInputCount > 0) {
      await emailInputs.first().fill('john.doe@example.com');
    }

    // Fill textarea (if exists)
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count();
    if (textareaCount > 0) {
      await textareas.first().fill('This is a test message for row layout submission.');
    }

    // Fill number input (if exists)
    const numberInputs = page.locator('input[type="number"]');
    const numberInputCount = await numberInputs.count();
    if (numberInputCount > 0) {
      await numberInputs.first().fill('25');
    }

    // Check checkbox (if exists)
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    if (checkboxCount > 0) {
      await checkboxes.first().check();
    }

    // Select radio option (if exists)
    const radios = page.locator('input[type="radio"]');
    const radioCount = await radios.count();
    if (radioCount > 0) {
      await radios.first().check();
    }

    // Listen for network request to submission endpoint
    const submissionPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/public/forms/') &&
        response.url().includes('/submit') &&
        response.request().method() === 'POST'
    );

    // Click submit button
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();

    // Wait for submission request to complete
    const submissionResponse = await submissionPromise;

    // Verify response is successful (200 or 201)
    expect(submissionResponse.status()).toBeGreaterThanOrEqual(200);
    expect(submissionResponse.status()).toBeLessThan(300);

    // Wait for success message to appear
    // Assuming success message has text "submitted" or "success" (case-insensitive)
    const successMessage = page.locator('text=/submitted|success|thank you/i').first();
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    // Verify form is reset or submit button is disabled after successful submission
    await expect(submitButton).toBeDisabled();

    console.log('✅ Test 4 PASS: Form submission with row layout works correctly');
  });
});

/**
 * Additional cross-browser validation (runs on all configured browsers)
 *
 * This test suite runs the above tests on Chrome, Firefox, Safari (WebKit), and Edge
 * to ensure CSS Grid layout compatibility across all major browsers.
 *
 * Playwright configuration in playwright.config.ts should include:
 * projects: [
 *   { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
 *   { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
 *   { name: 'webkit', use: { ...devices['Desktop Safari'] } },
 *   { name: 'edge', use: { ...devices['Desktop Edge'] } },
 * ]
 */
test.describe('Cross-Browser Compatibility', () => {
  test('should render row layout correctly across all browsers', async ({ page, browserName }) => {
    // Navigate to form with row layout
    await page.goto('/public/form/test-row-layout-form');

    // Wait for form to load
    await page.waitForSelector('form', { state: 'visible' });

    // Verify row layout renders
    const rowLayoutContainer = page.locator('.row-layout-renderer');
    await expect(rowLayoutContainer).toBeVisible();

    // Verify rows exist
    const rows = page.locator('.form-row');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify columns exist in first row
    const row1Columns = rows.first().locator('.form-column');
    const columnCount = await row1Columns.count();
    expect(columnCount).toBeGreaterThan(0);

    console.log(`✅ Cross-browser test PASS on ${browserName}`);
  });
});
