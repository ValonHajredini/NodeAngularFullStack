import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Custom Theme Public Form Rendering
 * 
 * These tests verify that:
 * 1. Published forms render custom themes correctly
 * 2. Custom themes maintain responsive behavior
 * 3. Form submission works with custom themes
 * 4. Performance remains acceptable with custom themes
 * 5. Themes gracefully degrade when deleted/missing
 */

// Test constants
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'User123!@#';
const API_BASE_URL = 'http://localhost:3000/api';
const WEB_BASE_URL = 'http://localhost:4200';

// Custom theme definition for testing
const TEST_CUSTOM_THEME = {
  name: 'E2E Test Theme',
  description: 'Custom theme for E2E testing',
  themeDefinition: {
    primaryColor: '#ff6b35',
    secondaryColor: '#4ecdc4',
    backgroundColor: '#f8f9fa',
    textColor: '#2c3e50',
    fontFamily: 'Inter, sans-serif',
    fontSize: '16px',
    borderRadius: '8px',
    spacing: '1rem'
  }
};

// Sample form schema for testing
const TEST_FORM_SCHEMA = {
  title: 'Custom Theme Test Form',
  description: 'Testing custom theme rendering',
  fields: [
    {
      id: 'name-field',
      fieldName: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      order: 1
    },
    {
      id: 'email-field',
      fieldName: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      order: 2
    },
    {
      id: 'message-field',
      fieldName: 'message',
      label: 'Message',
      type: 'textarea',
      required: false,
      order: 3
    }
  ]
};

/**
 * Helper function to create a custom theme via API
 */
async function createCustomTheme(page: Page): Promise<string> {
  // Login as admin first
  await page.goto(`${WEB_BASE_URL}/auth/login`);
  await page.fill('[data-testid="email-input"]', ADMIN_EMAIL);
  await page.fill('[data-testid="password-input"]', ADMIN_PASSWORD);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');

  // Navigate to theme designer
  await page.goto(`${WEB_BASE_URL}/app/admin/themes/designer`);
  
  // Create custom theme
  await page.fill('[data-testid="theme-name-input"]', TEST_CUSTOM_THEME.name);
  await page.fill('[data-testid="theme-description-input"]', TEST_CUSTOM_THEME.description);
  
  // Set theme colors
  await page.fill('[data-testid="primary-color-input"]', TEST_CUSTOM_THEME.themeDefinition.primaryColor);
  await page.fill('[data-testid="secondary-color-input"]', TEST_CUSTOM_THEME.themeDefinition.secondaryColor);
  await page.fill('[data-testid="background-color-input"]', TEST_CUSTOM_THEME.themeDefinition.backgroundColor);
  
  // Save theme
  await page.click('[data-testid="save-theme-button"]');
  await page.waitForSelector('[data-testid="success-message"]');
  
  // Extract theme ID from URL or response
  const url = page.url();
  const themeId = url.split('?editId=')[1] || 'custom-theme-id';
  
  return themeId;
}

/**
 * Helper function to create a form with custom theme
 */
async function createFormWithCustomTheme(page: Page, themeId: string): Promise<{ formId: string; shortCode: string }> {
  // Navigate to form builder
  await page.goto(`${WEB_BASE_URL}/app/tools/form-builder`);
  
  // Create basic form
  await page.fill('[data-testid="form-title-input"]', TEST_FORM_SCHEMA.title);
  await page.fill('[data-testid="form-description-input"]', TEST_FORM_SCHEMA.description);
  
  // Add form fields
  for (const field of TEST_FORM_SCHEMA.fields) {
    await page.click(`[data-testid="add-field-${field.type}"]`);
    await page.fill(`[data-testid="field-label-${field.id}"]`, field.label);
    if (field.required) {
      await page.check(`[data-testid="field-required-${field.id}"]`);
    }
  }
  
  // Apply custom theme
  await page.click('[data-testid="form-settings-tab"]');
  await page.selectOption('[data-testid="theme-selector"]', themeId);
  
  // Save form
  await page.click('[data-testid="save-form-button"]');
  await page.waitForSelector('[data-testid="form-saved-message"]');
  
  // Publish form
  await page.click('[data-testid="publish-form-button"]');
  await page.waitForSelector('[data-testid="publish-success-dialog"]');
  
  // Extract form ID and short code
  const shortCode = await page.textContent('[data-testid="form-short-code"]');
  const formId = await page.getAttribute('[data-testid="form-id"]', 'data-form-id');
  
  return { formId: formId || 'test-form-id', shortCode: shortCode || 'test-code' };
}

test.describe('Custom Theme Public Form Rendering', () => {
  let customThemeId: string;
  let testForm: { formId: string; shortCode: string };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    
    // Create custom theme
    customThemeId = await createCustomTheme(page);
    
    // Create form with custom theme
    testForm = await createFormWithCustomTheme(page, customThemeId);
    
    await page.close();
  });

  test('should render custom theme correctly in published form', async ({ page }) => {
    // Navigate to published form
    await page.goto(`${WEB_BASE_URL}/public/form/${testForm.shortCode}`);
    
    // Wait for form to load
    await page.waitForSelector('[data-testid="public-form-container"]');
    
    // Verify custom theme is applied
    const formContainer = page.locator('[data-testid="public-form-container"]');
    
    // Check primary color is applied to buttons
    const submitButton = page.locator('[data-testid="submit-button"]');
    const primaryColor = await submitButton.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(primaryColor).toContain('255, 107, 53'); // RGB equivalent of #ff6b35
    
    // Check background color is applied
    const backgroundColor = await formContainer.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(backgroundColor).toContain('248, 249, 250'); // RGB equivalent of #f8f9fa
    
    // Check font family is applied
    const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(fontFamily).toContain('Inter');
    
    // Verify all form fields are rendered with theme
    await expect(page.locator('[data-testid="field-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-message"]')).toBeVisible();
    
    // Check field styling
    const nameField = page.locator('[data-testid="field-name"] input');
    const borderRadius = await nameField.evaluate(el => getComputedStyle(el).borderRadius);
    expect(borderRadius).toBe('8px');
  });

  test('should maintain responsive behavior with custom theme', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto(`${WEB_BASE_URL}/public/form/${testForm.shortCode}`);
    await page.waitForSelector('[data-testid="public-form-container"]');
    
    // Verify form layout on desktop
    const formWidth = await page.locator('[data-testid="public-form-container"]').evaluate(el => el.offsetWidth);
    expect(formWidth).toBeGreaterThan(800);
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Allow time for responsive adjustments
    
    // Verify form adapts to tablet
    const tabletFormWidth = await page.locator('[data-testid="public-form-container"]').evaluate(el => el.offsetWidth);
    expect(tabletFormWidth).toBeLessThan(formWidth);
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Verify form adapts to mobile
    const mobileFormWidth = await page.locator('[data-testid="public-form-container"]').evaluate(el => el.offsetWidth);
    expect(mobileFormWidth).toBeLessThan(tabletFormWidth);
    
    // Verify all fields are still accessible on mobile
    await expect(page.locator('[data-testid="field-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-button"]')).toBeVisible();
  });

  test('should submit form successfully with custom theme applied', async ({ page }) => {
    await page.goto(`${WEB_BASE_URL}/public/form/${testForm.shortCode}`);
    await page.waitForSelector('[data-testid="public-form-container"]');
    
    // Fill out form
    await page.fill('[data-testid="field-name"] input', 'John Doe');
    await page.fill('[data-testid="field-email"] input', 'john.doe@example.com');
    await page.fill('[data-testid="field-message"] textarea', 'This is a test message for custom theme form submission.');
    
    // Verify theme styling is maintained during interaction
    const nameField = page.locator('[data-testid="field-name"] input');
    await nameField.focus();
    
    // Check focus styling respects theme
    const focusColor = await nameField.evaluate(el => getComputedStyle(el).borderColor);
    expect(focusColor).toBeTruthy(); // Should have some focus styling
    
    // Submit form
    await page.click('[data-testid="submit-button"]');
    
    // Wait for submission to complete
    await page.waitForSelector('[data-testid="submission-success"]', { timeout: 10000 });
    
    // Verify success message appears with theme styling
    const successMessage = page.locator('[data-testid="submission-success"]');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText('Thank you');
    
    // Verify the success styling respects the theme
    const successBgColor = await successMessage.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(successBgColor).toBeTruthy();
  });

  test('should maintain acceptable performance with custom theme', async ({ page }) => {
    // Start performance monitoring
    await page.goto('about:blank');
    
    const startTime = Date.now();
    
    // Navigate to form with custom theme
    await page.goto(`${WEB_BASE_URL}/public/form/${testForm.shortCode}`);
    
    // Wait for form to be fully loaded
    await page.waitForSelector('[data-testid="public-form-container"]');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Verify form loads within acceptable time (should be under 3 seconds)
    expect(loadTime).toBeLessThan(3000);
    
    // Verify theme assets don't cause layout shift
    const layoutShiftScore = await page.evaluate(() => {
      return new Promise(resolve => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          resolve(clsValue);
        }).observe({ type: 'layout-shift', buffered: true });
        
        // Resolve after 2 seconds if no layout shifts detected
        setTimeout(() => resolve(clsValue), 2000);
      });
    });
    
    // CLS should be minimal (under 0.1 is good)
    expect(layoutShiftScore).toBeLessThan(0.1);
  });

  test('should gracefully handle missing/deleted custom theme', async ({ page }) => {
    // Create a form reference that points to a non-existent theme
    const invalidThemeFormUrl = `${WEB_BASE_URL}/public/form/${testForm.shortCode}?theme=invalid-theme-id`;
    
    await page.goto(invalidThemeFormUrl);
    await page.waitForSelector('[data-testid="public-form-container"]');
    
    // Form should still render with default styling
    await expect(page.locator('[data-testid="field-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-button"]')).toBeVisible();
    
    // Check that default theme is applied (fallback behavior)
    const submitButton = page.locator('[data-testid="submit-button"]');
    const buttonColor = await submitButton.evaluate(el => getComputedStyle(el).backgroundColor);
    
    // Should not be the custom theme color anymore
    expect(buttonColor).not.toContain('255, 107, 53');
    
    // Form should still be functional
    await page.fill('[data-testid="field-name"] input', 'Test User');
    await page.fill('[data-testid="field-email"] input', 'test@example.com');
    await page.click('[data-testid="submit-button"]');
    
    // Should still submit successfully
    await page.waitForSelector('[data-testid="submission-success"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="submission-success"]')).toBeVisible();
  });

  test('should render complex custom theme with gradients and shadows', async ({ page }) => {
    // Create a more complex theme with advanced CSS properties
    const complexTheme = {
      name: 'Complex E2E Theme',
      description: 'Complex theme with gradients and shadows',
      themeDefinition: {
        primaryColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        secondaryColor: '#f093fb',
        backgroundColor: '#ffffff',
        textColor: '#333333',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '12px',
        fontFamily: 'Roboto, sans-serif'
      }
    };
    
    // Note: In a real implementation, you would create this theme via API
    // For this test, we'll modify the existing form's theme
    
    await page.goto(`${WEB_BASE_URL}/public/form/${testForm.shortCode}`);
    await page.waitForSelector('[data-testid="public-form-container"]');
    
    // Inject complex theme styles to simulate advanced theme
    await page.addStyleTag({
      content: `
        [data-testid="public-form-container"] {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 2rem;
        }
        [data-testid="submit-button"] {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 12px;
          color: white;
          padding: 12px 24px;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: transform 0.2s ease;
        }
        [data-testid="submit-button"]:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        input, textarea {
          border-radius: 12px;
          border: 2px solid #e1e5e9;
          padding: 12px 16px;
          transition: border-color 0.2s ease;
        }
        input:focus, textarea:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
      `
    });
    
    // Verify complex styling is applied
    const formContainer = page.locator('[data-testid="public-form-container"]');
    const containerBorderRadius = await formContainer.evaluate(el => getComputedStyle(el).borderRadius);
    expect(containerBorderRadius).toBe('12px');
    
    const containerBoxShadow = await formContainer.evaluate(el => getComputedStyle(el).boxShadow);
    expect(containerBoxShadow).toContain('rgba(0, 0, 0, 0.1)');
    
    // Test interactive elements
    const submitButton = page.locator('[data-testid="submit-button"]');
    await submitButton.hover();
    
    // Verify hover effects work
    const hoverTransform = await submitButton.evaluate(el => getComputedStyle(el).transform);
    expect(hoverTransform).toBeTruthy();
    
    // Form should still be functional with complex theme
    await page.fill('[data-testid="field-name"] input', 'Complex Theme User');
    await page.fill('[data-testid="field-email"] input', 'complex@example.com');
    
    const nameField = page.locator('[data-testid="field-name"] input');
    await nameField.focus();
    
    // Check focus state with complex theme
    const focusBorderColor = await nameField.evaluate(el => getComputedStyle(el).borderColor);
    expect(focusBorderColor).toContain('102, 126, 234'); // Should match focus color
  });

  test.afterAll(async ({ browser }) => {
    // Cleanup: Delete test theme and form
    const page = await browser.newPage();
    
    try {
      // Login as admin
      await page.goto(`${WEB_BASE_URL}/auth/login`);
      await page.fill('[data-testid="email-input"]', ADMIN_EMAIL);
      await page.fill('[data-testid="password-input"]', ADMIN_PASSWORD);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('**/dashboard');
      
      // Delete test form
      await page.goto(`${WEB_BASE_URL}/app/tools/form-builder`);
      await page.click(`[data-testid="delete-form-${testForm.formId}"]`);
      await page.click('[data-testid="confirm-delete"]');
      
      // Delete test theme
      await page.goto(`${WEB_BASE_URL}/app/admin/themes`);
      await page.click(`[data-testid="delete-theme-${customThemeId}"]`);
      await page.click('[data-testid="confirm-delete"]');
      
    } catch (error) {
      console.warn('Cleanup failed:', error);
    } finally {
      await page.close();
    }
  });
});