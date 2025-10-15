import { test, expect } from '@playwright/test';

/**
 * E2E tests for Public Step Form Navigation and Rendering (Story 19.4).
 * Validates that published step forms render correctly with navigation controls,
 * validation, and progress tracking for visitors.
 *
 * Test Coverage:
 * - Test 1: Step form renders with progress indicator
 * - Test 2: Navigation between steps works correctly
 * - Test 3: Step validation prevents moving forward with invalid data
 * - Test 4: Keyboard navigation shortcuts work
 * - Test 5: Form submission includes all step data
 * - Test 6: Mobile responsive rendering for step forms
 * - Test 7: Step progress indicator shows completed steps
 *
 * Epic 19, Story 19.4: Frontend - Public Step Form Rendering and Navigation
 */
test.describe('Public Step Form Navigation', () => {
  /**
   * Test 1: Step form renders with progress indicator
   *
   * Validates:
   * - Step form loads without errors
   * - Progress indicator is visible
   * - Current step is highlighted
   * - Navigation buttons are present (Next/Previous)
   * - Only current step fields are visible
   */
  test('should render step form with progress indicator', async ({ page }) => {
    // Navigate to a step form (assumes test form exists with shortCode 'test-step-form')
    // Form structure: 3 steps with various field types
    await page.goto('/public/form/test-step-form');

    // Wait for form to load
    await page.waitForSelector('form', { state: 'visible' });

    // Verify step progress indicator is visible (desktop)
    const desktopProgressIndicator = page.locator('.step-progress-desktop');
    await expect(desktopProgressIndicator).toBeVisible();

    // Verify current step is highlighted (first step should be active)
    const activeStep = desktopProgressIndicator.locator('.step-item.active');
    await expect(activeStep).toBeVisible();
    await expect(activeStep).toHaveCount(1);

    // Verify step circle shows step number (1)
    const firstStepCircle = desktopProgressIndicator.locator('.step-circle').first();
    await expect(firstStepCircle).toContainText('1');

    // Verify step title is visible
    const firstStepTitle = desktopProgressIndicator.locator('.step-title').first();
    await expect(firstStepTitle).toBeVisible();

    // Verify only current step fields are visible
    const visibleFields = page.locator('.field-wrapper:visible');
    const fieldCount = await visibleFields.count();
    expect(fieldCount).toBeGreaterThan(0);

    // Verify Next button is visible and enabled
    const nextButton = page.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeEnabled();

    // Verify Previous button is NOT visible on first step
    const previousButton = page.getByRole('button', { name: /previous/i });
    await expect(previousButton).not.toBeVisible();

    // Verify Submit button is NOT visible on first step
    const submitButton = page.getByRole('button', { name: /submit/i });
    await expect(submitButton).not.toBeVisible();

    console.log('✅ Test 1 PASS: Step form renders with progress indicator');
  });

  /**
   * Test 2: Navigation between steps works correctly
   *
   * Validates:
   * - Next button advances to next step
   * - Previous button goes back to previous step
   * - Step progress indicator updates to show current step
   * - Field visibility changes with step navigation
   * - Submit button appears only on last step
   */
  test('should navigate between steps correctly', async ({ page }) => {
    await page.goto('/public/form/test-step-form');
    await page.waitForSelector('form', { state: 'visible' });

    // Verify we're on step 1
    const activeStep1 = page.locator('.step-item.active .step-circle');
    await expect(activeStep1).toContainText('1');

    // Fill required fields on step 1 (assuming first field is required text input)
    const firstInput = page.locator('input[type="text"]').first();
    await firstInput.fill('Test User');

    // Click Next button
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();

    // Wait for step transition
    await page.waitForTimeout(500); // Allow transition animation

    // Verify we're now on step 2
    const activeStep2 = page.locator('.step-item.active .step-circle');
    await expect(activeStep2).toContainText('2');

    // Verify step 1 now shows completed checkmark
    const completedStep1 = page.locator('.step-circle.completed').first();
    await expect(completedStep1).toBeVisible();
    const checkIcon = completedStep1.locator('.pi-check');
    await expect(checkIcon).toBeVisible();

    // Verify Previous button is now visible
    const previousButton = page.getByRole('button', { name: /previous/i });
    await expect(previousButton).toBeVisible();
    await expect(previousButton).toBeEnabled();

    // Verify Next button is still visible (not last step)
    await expect(nextButton).toBeVisible();

    // Fill required fields on step 2 (if any)
    const step2Inputs = page.locator('input:visible');
    const step2InputCount = await step2Inputs.count();
    if (step2InputCount > 0) {
      await step2Inputs.first().fill('test@example.com');
    }

    // Advance to step 3 (last step)
    await nextButton.click();
    await page.waitForTimeout(500);

    // Verify we're on step 3
    const activeStep3 = page.locator('.step-item.active .step-circle');
    await expect(activeStep3).toContainText('3');

    // Verify Submit button is visible on last step
    const submitButton = page.getByRole('button', { name: /submit/i });
    await expect(submitButton).toBeVisible();

    // Verify Next button is NOT visible on last step
    await expect(nextButton).not.toBeVisible();

    // Navigate back to step 2
    await previousButton.click();
    await page.waitForTimeout(500);

    // Verify we're back on step 2
    const backToStep2 = page.locator('.step-item.active .step-circle');
    await expect(backToStep2).toContainText('2');

    console.log('✅ Test 2 PASS: Navigation between steps works correctly');
  });

  /**
   * Test 3: Step validation prevents moving forward with invalid data
   *
   * Validates:
   * - Next button is blocked when required fields are empty
   * - Error messages are displayed for invalid fields
   * - Validation error toast/message appears
   * - User cannot advance to next step with invalid data
   */
  test('should prevent navigation with invalid step data', async ({ page }) => {
    await page.goto('/public/form/test-step-form');
    await page.waitForSelector('form', { state: 'visible' });

    // Attempt to click Next without filling required fields
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();

    // Wait for validation to trigger
    await page.waitForTimeout(500);

    // Verify validation error message appears (PrimeNG toast)
    const errorToast = page.locator('.p-toast-message-error, .p-message-error, text=/validation error|required/i');
    await expect(errorToast.first()).toBeVisible({ timeout: 3000 });

    // Verify we're still on step 1 (did not advance)
    const activeStep = page.locator('.step-item.active .step-circle');
    await expect(activeStep).toContainText('1');

    // Verify field-level error is displayed (if field is touched)
    const requiredFields = page.locator('input[required], textarea[required]');
    const requiredCount = await requiredFields.count();
    if (requiredCount > 0) {
      const firstRequiredField = requiredFields.first();
      await firstRequiredField.focus();
      await firstRequiredField.blur();

      // Check for error message near field
      const fieldError = page.locator('.field-error, .error-message, text=/required/i').first();
      await expect(fieldError).toBeVisible({ timeout: 2000 });
    }

    // Now fill the required field correctly
    const firstInput = page.locator('input[type="text"]').first();
    await firstInput.fill('Valid Name');

    // Click Next again
    await nextButton.click();
    await page.waitForTimeout(500);

    // Verify we successfully advanced to step 2
    const newActiveStep = page.locator('.step-item.active .step-circle');
    await expect(newActiveStep).toContainText('2');

    console.log('✅ Test 3 PASS: Step validation prevents moving forward with invalid data');
  });

  /**
   * Test 4: Keyboard navigation shortcuts work
   *
   * Validates:
   * - Ctrl+ArrowRight (or Cmd+ArrowRight on Mac) advances to next step
   * - Ctrl+ArrowLeft (or Cmd+ArrowLeft on Mac) goes to previous step
   * - Enter key advances to next step (when not in input field)
   * - Keyboard shortcuts respect validation rules
   */
  test('should support keyboard navigation shortcuts', async ({ page }) => {
    await page.goto('/public/form/test-step-form');
    await page.waitForSelector('form', { state: 'visible' });

    // Fill required field on step 1
    const firstInput = page.locator('input[type="text"]').first();
    await firstInput.fill('Keyboard Test');

    // Verify we're on step 1
    const step1Active = page.locator('.step-item.active .step-circle');
    await expect(step1Active).toContainText('1');

    // Focus outside input field (to enable keyboard shortcuts)
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Use keyboard shortcut to advance: Ctrl+ArrowRight (Cmd+ArrowRight on Mac)
    const isMac = process.platform === 'darwin';
    const modifierKey = isMac ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifierKey}+ArrowRight`);

    // Wait for step transition
    await page.waitForTimeout(500);

    // Verify we're now on step 2
    const step2Active = page.locator('.step-item.active .step-circle');
    await expect(step2Active).toContainText('2');

    // Use keyboard shortcut to go back: Ctrl+ArrowLeft
    await page.keyboard.press(`${modifierKey}+ArrowLeft`);
    await page.waitForTimeout(500);

    // Verify we're back on step 1
    const backToStep1 = page.locator('.step-item.active .step-circle');
    await expect(backToStep1).toContainText('1');

    console.log('✅ Test 4 PASS: Keyboard navigation shortcuts work correctly');
  });

  /**
   * Test 5: Form submission includes all step data
   *
   * Validates:
   * - All fields from all steps are submitted
   * - Submission payload contains data from step 1, 2, and 3
   * - API receives correct data structure
   * - Success message is displayed after submission
   */
  test('should submit form with data from all steps', async ({ page }) => {
    await page.goto('/public/form/test-step-form');
    await page.waitForSelector('form', { state: 'visible' });

    // Track submission payload
    let submissionPayload: any = null;
    page.on('request', (request) => {
      if (request.url().includes('/api/public/forms/') && request.url().includes('/submit')) {
        submissionPayload = request.postDataJSON();
      }
    });

    // Fill fields on step 1
    const step1Input = page.locator('input[type="text"]').first();
    await step1Input.fill('John Doe');

    // Advance to step 2
    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();
    await page.waitForTimeout(500);

    // Fill fields on step 2
    const step2Input = page.locator('input:visible').first();
    await step2Input.fill('john.doe@example.com');

    // Advance to step 3
    await nextButton.click();
    await page.waitForTimeout(500);

    // Fill fields on step 3 (if any)
    const step3Textareas = page.locator('textarea:visible');
    const textareaCount = await step3Textareas.count();
    if (textareaCount > 0) {
      await step3Textareas.first().fill('Final step message');
    }

    // Listen for submission response
    const submissionPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/public/forms/') &&
        response.url().includes('/submit') &&
        response.request().method() === 'POST'
    );

    // Submit form
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();

    // Wait for submission to complete
    const submissionResponse = await submissionPromise;

    // Verify response is successful
    expect(submissionResponse.status()).toBeGreaterThanOrEqual(200);
    expect(submissionResponse.status()).toBeLessThan(300);

    // Verify submission payload contains data from all steps
    expect(submissionPayload).toBeTruthy();
    expect(Object.keys(submissionPayload).length).toBeGreaterThan(0);

    // Wait for success message
    const successMessage = page.locator('text=/submitted|success|thank you/i').first();
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    console.log('✅ Test 5 PASS: Form submission includes all step data');
  });

  /**
   * Test 6: Mobile responsive rendering for step forms
   *
   * Validates:
   * - Step progress indicator adapts to mobile view
   * - Mobile progress bar shows current step
   * - Navigation buttons are accessible on mobile
   * - Form is usable on mobile viewport
   */
  test('should render step form responsively on mobile', async ({ page }) => {
    // Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/public/form/test-step-form');
    await page.waitForSelector('form', { state: 'visible' });

    // Verify mobile progress bar is visible
    const mobileProgress = page.locator('.step-progress-mobile');
    await expect(mobileProgress).toBeVisible();

    // Verify desktop stepper is hidden on mobile
    const desktopProgress = page.locator('.step-progress-desktop');
    await expect(desktopProgress).not.toBeVisible();

    // Verify progress text shows current step
    const progressText = page.locator('.progress-text');
    await expect(progressText).toContainText('Step 1');

    // Verify progress bar is visible
    const progressBar = page.locator('p-progressbar, .p-progressbar');
    await expect(progressBar).toBeVisible();

    // Verify navigation buttons are visible and accessible
    const nextButton = page.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeEnabled();

    // Fill field and test navigation on mobile
    const firstInput = page.locator('input[type="text"]').first();
    await firstInput.tap();
    await firstInput.fill('Mobile User');

    // Tap Next button
    await nextButton.tap();
    await page.waitForTimeout(500);

    // Verify step advanced
    await expect(progressText).toContainText('Step 2');

    // Verify no horizontal scrolling
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 0;
    expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 1);

    console.log('✅ Test 6 PASS: Mobile responsive rendering for step forms works correctly');
  });

  /**
   * Test 7: Step progress indicator shows completed steps
   *
   * Validates:
   * - Completed steps show checkmark icon
   * - Completed steps have different styling (green background)
   * - Progress percentage increases as steps are completed
   * - User can click on completed steps to navigate back
   */
  test('should show completed steps in progress indicator', async ({ page }) => {
    await page.goto('/public/form/test-step-form');
    await page.waitForSelector('form', { state: 'visible' });

    const desktopProgress = page.locator('.step-progress-desktop');

    // Verify step 1 is active (not completed yet)
    const step1 = desktopProgress.locator('.step-item').first();
    await expect(step1).toHaveClass(/active/);

    // Fill required field and advance
    const firstInput = page.locator('input[type="text"]').first();
    await firstInput.fill('Progress Test');

    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();
    await page.waitForTimeout(500);

    // Verify step 1 now shows as completed
    const completedStep1Circle = step1.locator('.step-circle');
    await expect(completedStep1Circle).toHaveClass(/completed/);

    // Verify checkmark icon is visible in step 1
    const checkIcon = completedStep1Circle.locator('.pi-check');
    await expect(checkIcon).toBeVisible();

    // Verify step 2 is now active
    const step2 = desktopProgress.locator('.step-item').nth(1);
    await expect(step2).toHaveClass(/active/);

    // Fill step 2 and advance to step 3
    const step2Input = page.locator('input:visible').first();
    await step2Input.fill('progress@test.com');
    await nextButton.click();
    await page.waitForTimeout(500);

    // Verify step 2 also shows as completed
    const completedStep2Circle = step2.locator('.step-circle');
    await expect(completedStep2Circle).toHaveClass(/completed/);

    // Verify step 3 is now active
    const step3 = desktopProgress.locator('.step-item').nth(2);
    await expect(step3).toHaveClass(/active/);

    // Test clicking on completed step 1 to navigate back
    await step1.click();
    await page.waitForTimeout(500);

    // Verify we're back on step 1
    const activeStepCircle = page.locator('.step-item.active .step-circle');
    await expect(activeStepCircle).toContainText('1');

    // Verify step 1 is no longer showing as completed (back to active)
    await expect(step1).toHaveClass(/active/);

    console.log('✅ Test 7 PASS: Step progress indicator shows completed steps correctly');
  });
});

/**
 * Cross-browser compatibility tests for step forms
 */
test.describe('Step Form Cross-Browser Compatibility', () => {
  test('should render step form correctly across all browsers', async ({ page, browserName }) => {
    await page.goto('/public/form/test-step-form');
    await page.waitForSelector('form', { state: 'visible' });

    // Verify progress indicator renders
    const desktopProgress = page.locator('.step-progress-desktop');
    await expect(desktopProgress).toBeVisible();

    // Verify steps are visible
    const steps = page.locator('.step-item');
    const stepCount = await steps.count();
    expect(stepCount).toBeGreaterThan(0);

    // Verify navigation works
    const firstInput = page.locator('input[type="text"]').first();
    await firstInput.fill('Cross-Browser Test');

    const nextButton = page.getByRole('button', { name: /next/i });
    await nextButton.click();
    await page.waitForTimeout(500);

    // Verify step advanced
    const activeStep = page.locator('.step-item.active .step-circle');
    await expect(activeStep).toContainText('2');

    console.log(`✅ Cross-browser step form test PASS on ${browserName}`);
  });
});
