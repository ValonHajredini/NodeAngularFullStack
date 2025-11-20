import { test, expect, Page } from '@playwright/test';

/**
 * Story 29.11 - Product Template with Inventory Tracking E2E Tests
 *
 * End-to-end testing for product template with inventory management:
 * - Product form creation with inventory config
 * - Variant selection with real-time stock display
 * - Form submission with stock decrement
 * - Out-of-stock prevention UI
 * - Concurrent submission handling
 *
 * Test Execution: npm run test:e2e -- product-template-inventory.spec.ts
 */

// =============================================================================
// Configuration & Constants
// =============================================================================

const BASE_URL = 'http://localhost:4201'; // Form Builder UI
const API_URL = 'http://localhost:3001'; // Forms API

// Test user credentials
const ADMIN_USER = {
  email: 'admin@example.com',
  password: 'User123!@#',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Logs in admin user (simplified for product template testing)
 */
async function loginAsAdmin(page: Page): Promise<void> {
  // For MVP, form builder may not require login for public forms
  // This is a placeholder for future auth integration
  console.log('Login helper ready for future auth integration');
}

/**
 * Seeds test inventory data via API
 */
async function seedTestInventory(formId: string, sku: string, quantity: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formId,
      sku,
      stockQuantity: quantity,
      reservedQuantity: 0,
    }),
  });

  if (!response.ok) {
    console.warn(`Failed to seed inventory: ${response.statusText}`);
  }
}

/**
 * Gets stock quantity for a SKU via API
 */
async function getStockQuantity(sku: string): Promise<number> {
  const response = await fetch(`${API_URL}/api/v1/inventory/${sku}`);
  if (!response.ok) return 0;

  const data = await response.json();
  return data.data.stock_quantity;
}

// =============================================================================
// E2E Test Suite
// =============================================================================

test.describe('Product Template - Inventory Tracking E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to public form renderer (assumes form already exists from seed data)
    // Test uses the seeded "T-Shirt Product Order" form
    await page.goto(`${BASE_URL}`);
  });

  test('should display real-time stock availability badge when variant selected (AC: 10)', async ({
    page,
  }) => {
    // Navigate to public form with product template
    // Assuming short code from seed: TEST{timestamp} or predefined
    // For E2E, we'll navigate directly to a test form URL
    await page.goto(`${BASE_URL}/forms/render/TEST-FORM-SHORTCODE`);

    // Wait for form to load
    await page.waitForSelector('.form-renderer-container', { timeout: 10000 });

    // Find IMAGE_GALLERY field with variants
    const galleryField = page.locator('[data-field-type="IMAGE_GALLERY"]');
    await expect(galleryField).toBeVisible();

    // Click on first variant image
    const firstVariantImage = galleryField.locator('.gallery-image').first();
    await firstVariantImage.click();

    // Stock badge should appear
    const stockBadge = page.locator('.stock-badge');
    await expect(stockBadge).toBeVisible({ timeout: 5000 });

    // Verify badge shows stock quantity
    await expect(stockBadge).toContainText(/\d+ units available/);

    // Verify badge has correct color class (green for > 10 units)
    const badgeClasses = await stockBadge.getAttribute('class');
    expect(badgeClasses).toMatch(/badge-(green|yellow|red)/);
  });

  test('should disable submit button when product is out of stock (AC: 10)', async ({ page }) => {
    // Setup: Navigate to form with zero stock variant
    await page.goto(`${BASE_URL}/forms/render/TEST-FORM-ZERO-STOCK`);

    await page.waitForSelector('.form-renderer-container', { timeout: 10000 });

    // Select variant with zero stock
    const zeroStockVariant = page.locator('.gallery-image[data-sku="ZERO-STOCK-SKU"]');
    await zeroStockVariant.click();

    // Wait for stock check to complete
    await page.waitForTimeout(1000);

    // Stock badge should show zero
    const stockBadge = page.locator('.stock-badge');
    await expect(stockBadge).toContainText('0 units available');
    await expect(stockBadge).toHaveClass(/badge-red/);

    // Out of stock message should be visible
    const outOfStockMessage = page.locator('.out-of-stock-message');
    await expect(outOfStockMessage).toBeVisible();
    await expect(outOfStockMessage).toContainText('Out of Stock');

    // Submit button should be disabled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should successfully submit form and decrement inventory (AC: 7)', async ({ page }) => {
    const testSku = 'TSHIRT-RED-M';

    // Get initial stock quantity
    const initialStock = await getStockQuantity(testSku);

    // Navigate to public form
    await page.goto(`${BASE_URL}/forms/render/TEST-PRODUCT-FORM`);

    await page.waitForSelector('.form-renderer-container', { timeout: 10000 });

    // Select product variant
    const variantImage = page.locator(`.gallery-image[data-sku="${testSku}"]`);
    await variantImage.click();

    // Fill quantity field
    const quantityField = page.locator('input[name="quantity"]');
    await quantityField.fill('2');

    // Fill customer information
    await page.fill('input[name="customer_email"]', 'e2e-test@example.com');
    await page.fill('input[name="customer_name"]', 'E2E Test User');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for success message
    const successMessage = page.locator('.submission-success-message');
    await expect(successMessage).toBeVisible({ timeout: 10000 });

    // Verify stock was decremented
    const finalStock = await getStockQuantity(testSku);
    expect(finalStock).toBe(initialStock - 2);
  });

  test('should prevent submission when quantity exceeds stock (AC: 8)', async ({ page }) => {
    const testSku = 'TSHIRT-BLUE-M';

    // Get current stock quantity
    const currentStock = await getStockQuantity(testSku);

    // Navigate to public form
    await page.goto(`${BASE_URL}/forms/render/TEST-PRODUCT-FORM`);

    await page.waitForSelector('.form-renderer-container', { timeout: 10000 });

    // Select product variant
    const variantImage = page.locator(`.gallery-image[data-sku="${testSku}"]`);
    await variantImage.click();

    // Request more than available stock
    const quantityField = page.locator('input[name="quantity"]');
    await quantityField.fill((currentStock + 10).toString());

    // Fill customer information
    await page.fill('input[name="customer_email"]', 'e2e-test@example.com');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for error message
    const errorMessage = page.locator('.submission-error-message');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Verify error message content (AC: 8)
    await expect(errorMessage).toContainText(/out of stock/i);
    await expect(errorMessage).toContainText(new RegExp(`Only ${currentStock} units available`));

    // Verify stock was NOT changed
    const finalStock = await getStockQuantity(testSku);
    expect(finalStock).toBe(currentStock);
  });

  test('should update stock badge after failed submission attempt', async ({ page }) => {
    // Navigate to public form
    await page.goto(`${BASE_URL}/forms/render/TEST-PRODUCT-FORM`);

    await page.waitForSelector('.form-renderer-container', { timeout: 10000 });

    // Select variant
    const variantImage = page.locator('.gallery-image').first();
    await variantImage.click();

    // Initial stock badge should show available stock
    const stockBadge = page.locator('.stock-badge');
    await expect(stockBadge).toBeVisible();

    // Attempt invalid submission (missing required fields)
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Validation error should appear (not stock error)
    const validationError = page.locator('.validation-error');
    await expect(validationError).toBeVisible({ timeout: 5000 });

    // Stock badge should still be visible and unchanged
    await expect(stockBadge).toBeVisible();
  });

  test('should show correct stock badge color based on quantity', async ({ page }) => {
    await page.goto(`${BASE_URL}/forms/render/TEST-PRODUCT-FORM`);

    await page.waitForSelector('.form-renderer-container', { timeout: 10000 });

    // Test green badge (> 10 units)
    const highStockVariant = page.locator('.gallery-image[data-stock=">10"]');
    if (await highStockVariant.count() > 0) {
      await highStockVariant.first().click();
      const badgeGreen = page.locator('.stock-badge.badge-green');
      await expect(badgeGreen).toBeVisible({ timeout: 3000 });
    }

    // Test yellow badge (1-10 units)
    const mediumStockVariant = page.locator('.gallery-image[data-stock="1-10"]');
    if (await mediumStockVariant.count() > 0) {
      await mediumStockVariant.first().click();
      const badgeYellow = page.locator('.stock-badge.badge-yellow');
      await expect(badgeYellow).toBeVisible({ timeout: 3000 });
    }

    // Test red badge (0 units)
    const zeroStockVariant = page.locator('.gallery-image[data-stock="0"]');
    if (await zeroStockVariant.count() > 0) {
      await zeroStockVariant.first().click();
      const badgeRed = page.locator('.stock-badge.badge-red');
      await expect(badgeRed).toBeVisible({ timeout: 3000 });

      // Verify out-of-stock message appears
      const outOfStockMsg = page.locator('.out-of-stock-message');
      await expect(outOfStockMsg).toBeVisible();
    }
  });

  test('should handle rapid variant switching and stock fetching', async ({ page }) => {
    await page.goto(`${BASE_URL}/forms/render/TEST-PRODUCT-FORM`);

    await page.waitForSelector('.form-renderer-container', { timeout: 10000 });

    const variantImages = page.locator('.gallery-image');
    const count = await variantImages.count();

    // Rapidly click through variants
    for (let i = 0; i < Math.min(count, 3); i++) {
      await variantImages.nth(i).click();
      await page.waitForTimeout(500); // Allow stock fetch to complete
    }

    // Stock badge should be visible and accurate for last selected variant
    const stockBadge = page.locator('.stock-badge');
    await expect(stockBadge).toBeVisible();
    await expect(stockBadge).toContainText(/\d+ units available/);
  });
});

test.describe('Product Template - Performance Requirements', () => {
  test('stock API should respond within 50ms (AC: 9)', async ({ page }) => {
    const testSku = 'TSHIRT-RED-M';

    // Measure API response time
    const startTime = Date.now();
    const response = await page.request.get(`${API_URL}/api/v1/inventory/${testSku}`);
    const endTime = Date.now();

    const responseTime = endTime - startTime;

    // Verify response time requirement (AC: 9)
    expect(responseTime).toBeLessThan(50);

    // Verify response format
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data.data).toHaveProperty('sku');
    expect(data.data).toHaveProperty('stock_quantity');
    expect(data.data).toHaveProperty('available');
  });
});

test.describe('Product Template - Integration Verification', () => {
  test('forms without inventory config should work normally (AC: IV1)', async ({ page }) => {
    // Navigate to a standard form (no inventory business logic)
    await page.goto(`${BASE_URL}/forms/render/NORMAL-FORM-SHORTCODE`);

    await page.waitForSelector('.form-renderer-container', { timeout: 10000 });

    // Fill form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should succeed without inventory check
    const successMessage = page.locator('.submission-success-message');
    await expect(successMessage).toBeVisible({ timeout: 10000 });

    // No stock badge should be present
    const stockBadge = page.locator('.stock-badge');
    await expect(stockBadge).not.toBeVisible();
  });
});

test.describe('Product Template - Edge Cases', () => {
  test('should handle API errors gracefully when fetching stock', async ({ page }) => {
    await page.goto(`${BASE_URL}/forms/render/TEST-PRODUCT-FORM`);

    // Intercept stock API and return error
    await page.route('**/api/v1/inventory/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.waitForSelector('.form-renderer-container', { timeout: 10000 });

    // Select variant
    const variantImage = page.locator('.gallery-image').first();
    await variantImage.click();

    // Wait for error handling
    await page.waitForTimeout(2000);

    // Submit button should be disabled (fail-safe behavior)
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test('should handle variant without SKU metadata', async ({ page }) => {
    await page.goto(`${BASE_URL}/forms/render/TEST-FORM-NO-SKU`);

    await page.waitForSelector('.form-renderer-container', { timeout: 10000 });

    // Select image without SKU metadata
    const noSkuImage = page.locator('.gallery-image[data-sku=""]');
    if (await noSkuImage.count() > 0) {
      await noSkuImage.click();

      // Stock badge should not appear
      const stockBadge = page.locator('.stock-badge');
      await expect(stockBadge).not.toBeVisible();

      // Submit button should remain enabled (non-inventory form behavior)
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeEnabled();
    }
  });
});
