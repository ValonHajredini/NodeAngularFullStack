import { test, expect } from '@playwright/test';

test.describe('Public Form Theme Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a test form with Neon theme
    await page.goto('/public/form/test-neon-theme');
  });

  test('should render themed public form with correct colors', async ({ page }) => {
    // Wait for form to load
    await page.waitForSelector('.form-container', { timeout: 10000 });

    // Verify theme CSS variables applied to root
    const root = page.locator(':root');
    const primaryColor = await root.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--theme-primary-color').trim()
    );
    expect(primaryColor).toBe('#FF006E'); // Neon pink

    // Verify secondary color
    const secondaryColor = await root.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--theme-secondary-color').trim()
    );
    expect(secondaryColor).toBe('#8338EC'); // Neon purple

    // Verify form fields use theme styles
    const field = page.locator('input[type="text"]').first();
    const fieldBorderRadius = await field.evaluate((el) => getComputedStyle(el).borderRadius);
    expect(fieldBorderRadius).toBe('8px'); // From theme

    // Verify form container has theme background
    const formContainer = page.locator('.form-container');
    const containerBg = await formContainer.evaluate((el) => 
      getComputedStyle(el).getPropertyValue('background-color')
    );
    expect(containerBg).toBeTruthy();
  });

  test('should render form without theme using default styles', async ({ page }) => {
    // Navigate to form without theme
    await page.goto('/public/form/test-no-theme');

    // Wait for form to load
    await page.waitForSelector('.form-container', { timeout: 10000 });

    // Verify no theme CSS variables set
    const root = page.locator(':root');
    const primaryColor = await root.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--theme-primary-color').trim()
    );
    expect(primaryColor).toBe('');

    // Form should still render correctly
    await expect(page.locator('.form-container')).toBeVisible();
    
    // Verify form fields are still functional
    const textField = page.locator('input[type="text"]').first();
    await expect(textField).toBeVisible();
  });

  test('should handle deleted theme gracefully', async ({ page }) => {
    // Navigate to form with deleted theme
    await page.goto('/public/form/test-deleted-theme');

    // Wait for form to load
    await page.waitForSelector('.form-container', { timeout: 10000 });

    // Check console for warning message
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warn') {
        consoleMessages.push(msg.text());
      }
    });

    // Verify no theme CSS variables set (graceful degradation)
    const root = page.locator(':root');
    const primaryColor = await root.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--theme-primary-color').trim()
    );
    expect(primaryColor).toBe('');

    // Form should still render correctly
    await expect(page.locator('.form-container')).toBeVisible();
  });

  test('should submit themed form successfully', async ({ page }) => {
    // Wait for form to load
    await page.waitForSelector('.form-container', { timeout: 10000 });

    // Fill out form fields
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="message"]', 'Test message with theme applied');
    await page.fill('[name="name"]', 'Test User');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.locator('.success-message, .alert-success')).toBeVisible({ timeout: 10000 });
    
    // Verify form submission was successful
    const successText = await page.locator('.success-message, .alert-success').textContent();
    expect(successText).toContain('success');
  });

  test('should render themed form responsively on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for form to load
    await page.waitForSelector('.form-container', { timeout: 10000 });

    // Verify theme CSS variables still applied on mobile
    const root = page.locator(':root');
    const primaryColor = await root.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--theme-primary-color').trim()
    );
    expect(primaryColor).toBe('#FF006E');

    // Verify form is responsive (no horizontal scroll)
    const formContainer = page.locator('.form-container');
    const containerWidth = await formContainer.evaluate((el) => el.getBoundingClientRect().width);
    expect(containerWidth).toBeLessThanOrEqual(375);

    // Verify form fields are accessible on mobile
    const textField = page.locator('input[type="text"]').first();
    await expect(textField).toBeVisible();
    
    // Test mobile interaction
    await textField.click();
    await textField.fill('Mobile test input');
    expect(await textField.inputValue()).toBe('Mobile test input');
  });

  test('should apply theme to row layout forms correctly', async ({ page }) => {
    // Navigate to form with row layout and theme
    await page.goto('/public/form/test-row-layout-theme');

    // Wait for form to load
    await page.waitForSelector('.form-container', { timeout: 10000 });

    // Verify theme CSS variables applied
    const root = page.locator(':root');
    const primaryColor = await root.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--theme-primary-color').trim()
    );
    expect(primaryColor).toBe('#FF006E');

    // Verify row layout renders correctly with theme
    const formRows = page.locator('.form-row');
    await expect(formRows.first()).toBeVisible();

    // Verify columns within rows are styled with theme
    const firstColumn = page.locator('.form-row .form-column').first();
    const columnBg = await firstColumn.evaluate((el) => 
      getComputedStyle(el).getPropertyValue('background-color')
    );
    expect(columnBg).toBeTruthy();
  });

  test('should handle theme with custom background correctly', async ({ page }) => {
    // Navigate to form with both theme and custom background
    await page.goto('/public/form/test-theme-custom-bg');

    // Wait for form to load
    await page.waitForSelector('.form-container', { timeout: 10000 });

    // Verify theme CSS variables applied (for colors/fonts)
    const root = page.locator(':root');
    const primaryColor = await root.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--theme-primary-color').trim()
    );
    expect(primaryColor).toBe('#FF006E');

    // Verify custom background overrides theme background
    const formContainer = page.locator('.form-container');
    const backgroundImage = await formContainer.evaluate((el) => 
      getComputedStyle(el).getPropertyValue('background-image')
    );
    
    // Should have custom background (not theme background)
    expect(backgroundImage).not.toBe('none');
    expect(backgroundImage).toContain('url(');
  });
});
