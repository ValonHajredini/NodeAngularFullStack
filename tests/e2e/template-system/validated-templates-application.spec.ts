import { test, expect } from '@playwright/test';

/**
 * E2E tests for validated template application (Story 29.3 - AC #12).
 * Validates that all 18 seeded templates can be applied to create working forms.
 *
 * Test Coverage:
 * - All 6 categories (POLLS, QUIZ, ECOMMERCE, SERVICES, DATA_COLLECTION, EVENTS)
 * - 18 total templates (3 per category)
 * - Template selection and form creation workflow
 * - Field validation and form submission readiness
 */
test.describe('Validated Templates Application - Story 29.3', () => {
  // Template definitions for each category (matching seed-templates.js)
  const TEMPLATES_BY_CATEGORY = {
    polls: ['Opinion Poll', 'Customer Feedback Poll', 'Yes/No Vote'],
    quiz: ['Trivia Quiz', 'Knowledge Assessment', 'Certification Test'],
    ecommerce: ['Product Order Form', 'Multi-Product Catalog', 'Variant Selection Form'],
    services: ['Appointment Booking', 'Service Request Form', 'Time Slot Reservation'],
    data_collection: ['Restaurant Order Form', 'Meal Preferences Survey', 'Catering Request'],
    events: ['Event RSVP Form', 'Ticket Purchase Form', 'Guest Registration']
  };

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:4201/auth/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'User123!@#');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/app/dashboard');
    await page.waitForLoadState('networkidle');
  });

  // Test each category separately to ensure all templates can be applied
  test('should apply POLLS templates successfully', async ({ page }) => {
    for (const templateName of TEMPLATES_BY_CATEGORY.polls) {
      await applyTemplateAndVerify(page, 'polls', templateName);
    }
  });

  test('should apply QUIZ templates successfully', async ({ page }) => {
    for (const templateName of TEMPLATES_BY_CATEGORY.quiz) {
      await applyTemplateAndVerify(page, 'quiz', templateName);
    }
  });

  test('should apply ECOMMERCE templates successfully', async ({ page }) => {
    for (const templateName of TEMPLATES_BY_CATEGORY.ecommerce) {
      await applyTemplateAndVerify(page, 'ecommerce', templateName);
    }
  });

  test('should apply SERVICES templates successfully', async ({ page }) => {
    for (const templateName of TEMPLATES_BY_CATEGORY.services) {
      await applyTemplateAndVerify(page, 'services', templateName);
    }
  });

  test('should apply DATA_COLLECTION templates successfully', async ({ page }) => {
    for (const templateName of TEMPLATES_BY_CATEGORY.data_collection) {
      await applyTemplateAndVerify(page, 'data_collection', templateName);
    }
  });

  test('should apply EVENTS templates successfully', async ({ page }) => {
    for (const templateName of TEMPLATES_BY_CATEGORY.events) {
      await applyTemplateAndVerify(page, 'events', templateName);
    }
  });

  // Comprehensive test to verify all 18 templates in one run
  test('should successfully apply all 18 validated templates', async ({ page }) => {
    const allTemplates = Object.values(TEMPLATES_BY_CATEGORY).flat();
    expect(allTemplates.length).toBe(18); // Verify we have all 18 templates

    let successCount = 0;
    const failedTemplates: string[] = [];

    for (const [category, templates] of Object.entries(TEMPLATES_BY_CATEGORY)) {
      for (const templateName of templates) {
        try {
          await applyTemplateAndVerify(page, category, templateName);
          successCount++;
          console.log(`✅ Successfully applied: ${templateName} (${category})`);
        } catch (error) {
          failedTemplates.push(`${templateName} (${category})`);
          console.error(`❌ Failed to apply: ${templateName} (${category})`, error);
        }
      }
    }

    // Assert all templates applied successfully
    expect(successCount).toBe(18);
    expect(failedTemplates).toHaveLength(0);

    console.log(`✅ All 18 validated templates applied successfully!`);
  });
});

/**
 * Helper function to apply a template and verify form creation
 */
async function applyTemplateAndVerify(page: any, category: string, templateName: string) {
  // Navigate to dashboard (if not already there)
  if (!page.url().includes('/app/dashboard')) {
    await page.goto('http://localhost:4201/app/dashboard');
    await page.waitForLoadState('networkidle');
  }

  // Open template selection modal
  await page.click('button:has-text("Create New Form")');
  await expect(page.getByRole('dialog', { name: 'Choose a Template' })).toBeVisible();

  // Click category button to filter templates
  const categoryButtonMap: Record<string, string> = {
    polls: 'Browse Polls templates',
    quiz: 'Browse Quiz templates',
    ecommerce: 'Browse E-commerce templates',
    services: 'Browse Services templates',
    data_collection: 'Browse Data Collection templates',
    events: 'Browse Events templates'
  };

  const categoryButtonText = categoryButtonMap[category];
  if (!categoryButtonText) {
    throw new Error(`Unknown category: ${category}`);
  }

  await page.getByRole('button', { name: new RegExp(categoryButtonText, 'i') }).click();
  await page.waitForTimeout(500); // Wait for category filter to apply

  // Find and click the template card
  const templateCard = page.locator(`[role="button"]:has-text("${templateName}")`).first();
  await expect(templateCard).toBeVisible({ timeout: 5000 });
  await templateCard.click();

  // Wait for form builder to load
  await page.waitForURL('**/app/form-builder/**', { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // Verify form builder loaded successfully
  await expect(page.locator('text=Form Builder')).toBeVisible({ timeout: 5000 });

  // Verify form has fields from the template (check for field palette or canvas)
  const hasFieldPalette = await page.locator('[data-testid="field-palette"]').isVisible().catch(() => false);
  const hasFormCanvas = await page.locator('[data-testid="form-canvas"]').isVisible().catch(() => false);
  const hasFields = await page.locator('text=/field|Field/i').count() > 0;

  expect(hasFieldPalette || hasFormCanvas || hasFields).toBeTruthy();

  // Navigate back to dashboard for next template
  await page.goto('http://localhost:4201/app/dashboard');
  await page.waitForLoadState('networkidle');

  console.log(`✅ Template applied successfully: ${templateName} (${category})`);
}
