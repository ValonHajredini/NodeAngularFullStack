import { test, expect } from '@playwright/test';

/**
 * Story 24.1: Baseline Visual Regression Test for Theme CSS Variable Usage
 * 
 * This test captures baseline screenshots of all 16 field types with current theme application.
 * These screenshots serve as the baseline for future theme implementation comparisons.
 * 
 * Test Coverage:
 * - All 16 field types in form builder preview mode
 * - Current theme application (default theme)
 * - Mobile and desktop viewports
 * - Form renderer component styling
 */

test.describe('Story 24.1: Theme CSS Variable Baseline Capture', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to form builder
    await page.goto('/tools/form-builder');
    
    // Wait for form builder to load
    await page.waitForSelector('[data-testid="form-builder-canvas"]', { timeout: 10000 });
    
    // Wait for any loading states to complete
    await page.waitForLoadState('networkidle');
  });

  test('capture baseline screenshots for all field types - desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });

    // Test each field type
    const fieldTypes = [
      { type: 'TEXT', name: 'text-input' },
      { type: 'EMAIL', name: 'email-input' },
      { type: 'NUMBER', name: 'number-input' },
      { type: 'TEXTAREA', name: 'textarea' },
      { type: 'SELECT', name: 'select' },
      { type: 'CHECKBOX', name: 'checkbox' },
      { type: 'RADIO', name: 'radio' },
      { type: 'DATE', name: 'date' },
      { type: 'DATETIME', name: 'datetime' },
      { type: 'TOGGLE', name: 'toggle' },
      { type: 'FILE', name: 'file' },
      { type: 'IMAGE_GALLERY', name: 'image-gallery' },
      { type: 'HEADING', name: 'heading' },
      { type: 'IMAGE', name: 'image' },
      { type: 'TEXT_BLOCK', name: 'text-block' },
      { type: 'DIVIDER', name: 'divider' }
    ];

    for (const fieldType of fieldTypes) {
      // Clear canvas
      await page.click('[data-testid="clear-canvas-button"]');
      await page.waitForTimeout(500);

      // Add field to canvas
      await page.click(`[data-testid="field-palette-${fieldType.name}"]`);
      await page.waitForTimeout(500);

      // Wait for field to render
      await page.waitForSelector(`[data-testid="field-preview-${fieldType.name}"]`, { timeout: 5000 });

      // Capture screenshot
      const screenshot = await page.screenshot({
        fullPage: false,
        clip: { x: 0, y: 0, width: 1200, height: 400 }
      });

      // Save baseline screenshot
      await expect(screenshot).toMatchSnapshot(`story-24.1-baseline-${fieldType.name}-desktop.png`);
    }
  });

  test('capture baseline screenshots for all field types - mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Test each field type
    const fieldTypes = [
      { type: 'TEXT', name: 'text-input' },
      { type: 'EMAIL', name: 'email-input' },
      { type: 'NUMBER', name: 'number-input' },
      { type: 'TEXTAREA', name: 'textarea' },
      { type: 'SELECT', name: 'select' },
      { type: 'CHECKBOX', name: 'checkbox' },
      { type: 'RADIO', name: 'radio' },
      { type: 'DATE', name: 'date' },
      { type: 'DATETIME', name: 'datetime' },
      { type: 'TOGGLE', name: 'toggle' },
      { type: 'FILE', name: 'file' },
      { type: 'IMAGE_GALLERY', name: 'image-gallery' },
      { type: 'HEADING', name: 'heading' },
      { type: 'IMAGE', name: 'image' },
      { type: 'TEXT_BLOCK', name: 'text-block' },
      { type: 'DIVIDER', name: 'divider' }
    ];

    for (const fieldType of fieldTypes) {
      // Clear canvas
      await page.click('[data-testid="clear-canvas-button"]');
      await page.waitForTimeout(500);

      // Add field to canvas
      await page.click(`[data-testid="field-palette-${fieldType.name}"]`);
      await page.waitForTimeout(500);

      // Wait for field to render
      await page.waitForSelector(`[data-testid="field-preview-${fieldType.name}"]`, { timeout: 5000 });

      // Capture screenshot
      const screenshot = await page.screenshot({
        fullPage: false,
        clip: { x: 0, y: 0, width: 375, height: 300 }
      });

      // Save baseline screenshot
      await expect(screenshot).toMatchSnapshot(`story-24.1-baseline-${fieldType.name}-mobile.png`);
    }
  });

  test('capture baseline screenshot for form renderer component', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });

    // Create a form with multiple field types
    const fieldTypes = ['TEXT', 'EMAIL', 'SELECT', 'CHECKBOX', 'RADIO', 'TEXTAREA'];
    
    for (const fieldType of fieldTypes) {
      await page.click(`[data-testid="field-palette-${fieldType.toLowerCase()}"]`);
      await page.waitForTimeout(300);
    }

    // Wait for all fields to render
    await page.waitForTimeout(1000);

    // Capture form renderer screenshot
    const screenshot = await page.screenshot({
      fullPage: false,
      clip: { x: 0, y: 0, width: 1200, height: 600 }
    });

    // Save baseline screenshot
    await expect(screenshot).toMatchSnapshot('story-24.1-baseline-form-renderer-desktop.png');
  });

  test('capture baseline screenshot for theme switching', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });

    // Add a few field types
    await page.click('[data-testid="field-palette-text-input"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="field-palette-select"]');
    await page.waitForTimeout(300);
    await page.click('[data-testid="field-palette-checkbox"]');
    await page.waitForTimeout(500);

    // Apply default theme
    await page.click('[data-testid="theme-dropdown"]');
    await page.click('[data-testid="theme-default"]');
    await page.waitForTimeout(500);

    // Capture default theme screenshot
    const defaultScreenshot = await page.screenshot({
      fullPage: false,
      clip: { x: 0, y: 0, width: 1200, height: 400 }
    });
    await expect(defaultScreenshot).toMatchSnapshot('story-24.1-baseline-default-theme.png');

    // Apply custom theme
    await page.click('[data-testid="theme-dropdown"]');
    await page.click('[data-testid="theme-custom"]');
    await page.waitForTimeout(500);

    // Capture custom theme screenshot
    const customScreenshot = await page.screenshot({
      fullPage: false,
      clip: { x: 0, y: 0, width: 1200, height: 400 }
    });
    await expect(customScreenshot).toMatchSnapshot('story-24.1-baseline-custom-theme.png');
  });

  test('capture baseline screenshot for public form renderer', async ({ page }) => {
    // Navigate to a published form
    await page.goto('/public/form/test-form');
    await page.waitForSelector('[data-testid="form-renderer"]', { timeout: 10000 });

    // Set desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });

    // Wait for form to load
    await page.waitForLoadState('networkidle');

    // Capture public form renderer screenshot
    const screenshot = await page.screenshot({
      fullPage: false,
      clip: { x: 0, y: 0, width: 1200, height: 600 }
    });

    // Save baseline screenshot
    await expect(screenshot).toMatchSnapshot('story-24.1-baseline-public-form-renderer.png');
  });
});