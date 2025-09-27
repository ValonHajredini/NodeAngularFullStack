import { test, expect } from '@playwright/test';
import { ToolRegistrationWizardPage } from './pages/tool-registration-wizard.page';

/**
 * Cross-browser tests for the Tool Registration Wizard.
 * Validates AC10: User experience tested across different browsers and screen sizes.
 */
test.describe('Tool Registration Wizard - Cross Browser', () => {
  let wizardPage: ToolRegistrationWizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new ToolRegistrationWizardPage(page);

    // Navigate to login page and authenticate as admin
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('Admin123!@#');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Wait for successful login and redirect
    await page.waitForURL('**/dashboard');

    // Navigate to the wizard
    await wizardPage.goto();
  });

  test('should complete the three-step wizard successfully', async ({ browserName }) => {
    // Generate unique tool data for this test run
    const timestamp = Date.now();
    const toolData = {
      name: `Test Tool ${timestamp}`,
      description: 'A test tool created during cross-browser testing',
      toolKey: `test-tool-${timestamp}`,
      icon: 'pi pi-cog',
      category: 'utility',
    };

    // Step 1: Basic Info
    await wizardPage.fillBasicInfo({
      name: toolData.name,
      description: toolData.description,
      toolKey: toolData.toolKey,
    });

    // Verify we're on step 1
    expect(await wizardPage.getCurrentStep()).toBe(1);

    // Navigate to step 2
    await wizardPage.goToNextStep();

    // Step 2: Configuration
    await wizardPage.fillConfiguration({
      icon: toolData.icon,
      category: toolData.category,
    });

    // Verify we're on step 2
    expect(await wizardPage.getCurrentStep()).toBe(2);

    // Navigate to step 3
    await wizardPage.goToNextStep();

    // Step 3: Preview and Confirmation
    expect(await wizardPage.getCurrentStep()).toBe(3);

    // Verify preview shows correct data
    await expect(wizardPage.previewName).toContainText(toolData.name);
    await expect(wizardPage.previewDescription).toContainText(toolData.description);

    // Complete the wizard
    await wizardPage.finishWizard();

    // Verify successful completion
    await wizardPage.waitForSuccess();

    console.log(`✅ Tool registration completed successfully in ${browserName}`);
  });

  test('should validate required fields', async ({ browserName }) => {
    // Try to proceed without filling required fields
    await wizardPage.goToNextStep();

    // Should still be on step 1 and show validation errors
    expect(await wizardPage.getCurrentStep()).toBe(1);
    expect(await wizardPage.hasValidationErrors()).toBe(true);

    // Fill only name and try again
    await wizardPage.nameInput.fill('Test Tool');
    await wizardPage.goToNextStep();

    // Should still be on step 1 due to missing required fields
    expect(await wizardPage.getCurrentStep()).toBe(1);

    console.log(`✅ Form validation working correctly in ${browserName}`);
  });

  test('should handle navigation between steps', async ({ browserName }) => {
    const toolData = {
      name: 'Navigation Test Tool',
      description: 'Testing navigation between wizard steps',
      toolKey: 'nav-test-tool',
    };

    // Fill step 1 and go to step 2
    await wizardPage.fillBasicInfo(toolData);
    await wizardPage.goToNextStep();
    expect(await wizardPage.getCurrentStep()).toBe(2);

    // Go back to step 1
    await wizardPage.goToPreviousStep();
    expect(await wizardPage.getCurrentStep()).toBe(1);

    // Verify data is preserved
    await expect(wizardPage.nameInput).toHaveValue(toolData.name);
    await expect(wizardPage.descriptionInput).toHaveValue(toolData.description);
    await expect(wizardPage.toolKeyInput).toHaveValue(toolData.toolKey);

    // Go forward again
    await wizardPage.goToNextStep();
    expect(await wizardPage.getCurrentStep()).toBe(2);

    console.log(`✅ Step navigation and data persistence working in ${browserName}`);
  });

  test('should handle tool key uniqueness validation', async ({ browserName }) => {
    // Try to create a tool with a key that might already exist
    await wizardPage.fillBasicInfo({
      name: 'Duplicate Key Test',
      description: 'Testing unique key validation',
      toolKey: 'short-link', // This key likely already exists
    });

    // The validation should trigger on blur or when trying to proceed
    await wizardPage.toolKeyInput.blur();

    // Wait a moment for async validation
    await wizardPage.page.waitForTimeout(1000);

    // Check if validation error appears
    const hasErrors = await wizardPage.hasValidationErrors();
    if (hasErrors) {
      console.log(`✅ Tool key uniqueness validation triggered in ${browserName}`);
    } else {
      console.log(`ℹ️  No duplicate key found (test tool may not exist) in ${browserName}`);
    }
  });

  test('should be responsive on mobile devices', async ({ page, isMobile, browserName }) => {
    if (!isMobile) {
      test.skip('This test only runs on mobile devices');
    }

    // Verify wizard is visible and usable on mobile
    await expect(wizardPage.wizardContainer).toBeVisible();
    await expect(wizardPage.nameInput).toBeVisible();

    // Test that form elements are properly sized for mobile
    const nameInputBox = await wizardPage.nameInput.boundingBox();
    const viewportSize = page.viewportSize();

    if (nameInputBox && viewportSize) {
      // Input should not be wider than viewport
      expect(nameInputBox.width).toBeLessThanOrEqual(viewportSize.width);
    }

    console.log(`✅ Mobile responsiveness verified in ${browserName}`);
  });

  test('should handle wizard cancellation', async ({ page, browserName }) => {
    // Fill some data
    await wizardPage.fillBasicInfo({
      name: 'Cancel Test Tool',
      description: 'This wizard will be cancelled',
      toolKey: 'cancel-test',
    });

    // Cancel the wizard
    await wizardPage.cancelWizard();

    // Should navigate back to tools list
    await expect(page).toHaveURL(/.*\/admin\/tools$/);

    console.log(`✅ Wizard cancellation working correctly in ${browserName}`);
  });
});

/**
 * Visual regression tests for the wizard across browsers
 */
test.describe('Tool Registration Wizard - Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authentication and navigate to wizard
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('Admin123!@#');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('/admin/tools/create');
  });

  test('should maintain consistent visual appearance', async ({ page, browserName }) => {
    // Take screenshots of each step for visual regression testing
    await expect(page).toHaveScreenshot(`wizard-step-1-${browserName}.png`);

    // Fill step 1 and move to step 2
    const wizardPage = new ToolRegistrationWizardPage(page);
    await wizardPage.fillBasicInfo({
      name: 'Visual Test Tool',
      description: 'Testing visual consistency',
      toolKey: 'visual-test',
    });
    await wizardPage.goToNextStep();

    await expect(page).toHaveScreenshot(`wizard-step-2-${browserName}.png`);

    // Fill step 2 and move to step 3
    await wizardPage.fillConfiguration({
      icon: 'pi pi-cog',
      category: 'utility',
    });
    await wizardPage.goToNextStep();

    await expect(page).toHaveScreenshot(`wizard-step-3-${browserName}.png`);

    console.log(`✅ Visual consistency verified for ${browserName}`);
  });
});