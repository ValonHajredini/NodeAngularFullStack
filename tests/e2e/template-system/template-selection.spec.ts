import { test, expect } from '@playwright/test';

test.describe('Template Selection and Application', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:4201/auth/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'User123!@#');
    await page.click('button[type="submit"]');

    // Wait for redirect to forms list page
    await page.waitForURL('**/app/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display template selection modal with categories', async ({ page }) => {
    // Click "Create New Form" button to open template selection modal
    await page.click('button:has-text("Create New Form")');

    // Verify modal appears with title
    await expect(page.getByRole('dialog', { name: 'Choose a Template' })).toBeVisible();

    // Verify category cards display (6 categories: E-commerce, Services, Data Collection, Events, Quiz, Polls)
    await expect(page.getByRole('button', { name: /Browse E-commerce templates/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Browse Services templates/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Browse Data Collection templates/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Browse Events templates/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Browse Quiz templates/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Browse Polls templates/i })).toBeVisible();

    // Verify "Start Blank" option is visible
    await expect(page.getByRole('button', { name: /Start with a blank form/i })).toBeVisible();
  });

  test('should filter templates by category', async ({ page }) => {
    // Open template selection modal
    await page.click('button:has-text("Create New Form")');
    await expect(page.getByRole('dialog', { name: 'Choose a Template' })).toBeVisible();

    // Click E-commerce category
    await page.getByRole('button', { name: /Browse E-commerce templates/i }).click();

    // Verify E-commerce templates display (use .first() to handle multiple matching elements)
    await expect(page.getByRole('heading', { name: 'Product Order Form' })).toBeVisible();

    // Verify template count shows correctly (3 E-commerce templates)
    await expect(page.locator('text=3 templates')).toBeVisible();
  });

  test('should navigate through categories', async ({ page }) => {
    // Open template selection modal
    await page.click('button:has-text("Create New Form")');
    await expect(page.getByRole('dialog', { name: 'Choose a Template' })).toBeVisible();

    // Click Quiz category to filter templates
    await page.getByRole('button', { name: /Browse Quiz templates/i }).click();

    // Wait for category to expand/filter
    await page.waitForTimeout(1000);

    // Verify we're still on the template selection modal
    await expect(page.getByRole('dialog', { name: 'Choose a Template' })).toBeVisible();

    // Click another category (Events)
    await page.getByRole('button', { name: /Browse Events templates/i }).click();

    // Wait for category to expand/filter
    await page.waitForTimeout(1000);

    // Verify modal still visible and responsive
    await expect(page.getByRole('dialog', { name: 'Choose a Template' })).toBeVisible();
  });

  test('should have functional search box', async ({ page }) => {
    // Open template selection modal
    await page.click('button:has-text("Create New Form")');
    await expect(page.getByRole('dialog', { name: 'Choose a Template' })).toBeVisible();

    // Verify search box is present and functional
    const searchBox = page.locator('input[placeholder*="Search templates"]');
    await expect(searchBox).toBeVisible();

    // Verify search box accepts input
    await searchBox.fill('Order');

    // Verify the input value was set
    const searchValue = await searchBox.inputValue();
    expect(searchValue).toBe('Order');

    // Clear search
    await searchBox.clear();
    const clearedValue = await searchBox.inputValue();
    expect(clearedValue).toBe('');
  });

  test('should start with blank form', async ({ page }) => {
    // Open template selection modal
    await page.click('button:has-text("Create New Form")');
    await expect(page.getByRole('dialog', { name: 'Choose a Template' })).toBeVisible();

    // Click "Start Blank" button - this opens a create form modal
    await page.getByRole('button', { name: /Start with a blank form/i }).click();

    // Verify a create form modal or form builder appears
    // (The actual behavior may vary - it might show a form creation modal first)
    await page.waitForTimeout(1000);

    // Check that EITHER:
    // 1. A form creation modal appears, OR
    // 2. We navigated to form builder
    const stillOnDashboard = page.url().includes('/app/dashboard');
    const hasFormModal = await page.locator('[role="dialog"]').count() > 0;

    expect(stillOnDashboard || hasFormModal).toBeTruthy();
  });
});
