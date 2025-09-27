import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Tool Registration Wizard.
 * Encapsulates interactions with the three-step wizard for creating new tools.
 */
export class ToolRegistrationWizardPage {
  private readonly page: Page;

  // Navigation elements
  readonly wizardContainer: Locator;
  readonly backButton: Locator;
  readonly nextButton: Locator;
  readonly finishButton: Locator;
  readonly cancelButton: Locator;

  // Step 1: Basic Info
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly toolKeyInput: Locator;
  readonly nameError: Locator;
  readonly descriptionError: Locator;
  readonly toolKeyError: Locator;

  // Step 2: Configuration
  readonly slugInput: Locator;
  readonly iconDropdown: Locator;
  readonly categoryDropdown: Locator;
  readonly slugError: Locator;

  // Step 3: Preview
  readonly previewCard: Locator;
  readonly previewName: Locator;
  readonly previewDescription: Locator;
  readonly previewIcon: Locator;
  readonly previewCategory: Locator;
  readonly confirmationMessage: Locator;

  // Success/Error states
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation elements
    this.wizardContainer = page.locator('app-create-tool-wizard');
    this.backButton = page.getByRole('button', { name: /back|previous/i });
    this.nextButton = page.getByRole('button', { name: /next|continue/i });
    this.finishButton = page.getByRole('button', { name: /finish|create|complete/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });

    // Step 1: Basic Info
    this.nameInput = page.getByLabel(/tool name/i);
    this.descriptionInput = page.getByLabel(/description/i);
    this.toolKeyInput = page.getByLabel(/tool key/i);
    this.nameError = page.locator('[data-testid="name-error"], .error').filter({ hasText: /name/i });
    this.descriptionError = page.locator('[data-testid="description-error"], .error').filter({ hasText: /description/i });
    this.toolKeyError = page.locator('[data-testid="tool-key-error"], .error').filter({ hasText: /key|unique/i });

    // Step 2: Configuration
    this.slugInput = page.getByLabel(/slug/i);
    this.iconDropdown = page.getByLabel(/icon/i);
    this.categoryDropdown = page.getByLabel(/category/i);
    this.slugError = page.locator('[data-testid="slug-error"], .error').filter({ hasText: /slug/i });

    // Step 3: Preview
    this.previewCard = page.locator('[data-testid="tool-preview"], .preview-card');
    this.previewName = page.locator('[data-testid="preview-name"]');
    this.previewDescription = page.locator('[data-testid="preview-description"]');
    this.previewIcon = page.locator('[data-testid="preview-icon"]');
    this.previewCategory = page.locator('[data-testid="preview-category"]');
    this.confirmationMessage = page.locator('[data-testid="confirmation-message"]');

    // Success/Error states
    this.successMessage = page.locator('.success, [data-testid="success-message"]');
    this.errorMessage = page.locator('.error, [data-testid="error-message"]');
    this.loadingIndicator = page.locator('.loading, [data-testid="loading"]');
  }

  /**
   * Navigate to the tool registration wizard page
   */
  async goto(): Promise<void> {
    await this.page.goto('/admin/tools/create');
    await this.wizardContainer.waitFor();
  }

  /**
   * Fill out Step 1: Basic Info
   */
  async fillBasicInfo(toolData: {
    name: string;
    description: string;
    toolKey: string;
  }): Promise<void> {
    await this.nameInput.fill(toolData.name);
    await this.descriptionInput.fill(toolData.description);
    await this.toolKeyInput.fill(toolData.toolKey);
  }

  /**
   * Fill out Step 2: Configuration
   */
  async fillConfiguration(configData: {
    slug?: string;
    icon: string;
    category: string;
  }): Promise<void> {
    // If slug is provided, override the auto-generated one
    if (configData.slug) {
      await this.slugInput.clear();
      await this.slugInput.fill(configData.slug);
    }

    // Select icon from dropdown
    await this.iconDropdown.click();
    await this.page.getByRole('option', { name: configData.icon }).click();

    // Select category from dropdown
    await this.categoryDropdown.click();
    await this.page.getByRole('option', { name: configData.category }).click();
  }

  /**
   * Navigate to the next step
   */
  async goToNextStep(): Promise<void> {
    await this.nextButton.click();
    // Wait for navigation to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Navigate to the previous step
   */
  async goToPreviousStep(): Promise<void> {
    await this.backButton.click();
    // Wait for navigation to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Complete the wizard by clicking finish
   */
  async finishWizard(): Promise<void> {
    await this.finishButton.click();
  }

  /**
   * Cancel the wizard
   */
  async cancelWizard(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Get the current step indicator (1, 2, or 3)
   */
  async getCurrentStep(): Promise<number> {
    // Check which step is currently active based on visual indicators
    const step1Active = await this.page.locator('[data-step="1"].active, [data-step="1"][aria-current]').isVisible();
    const step2Active = await this.page.locator('[data-step="2"].active, [data-step="2"][aria-current]').isVisible();
    const step3Active = await this.page.locator('[data-step="3"].active, [data-step="3"][aria-current]').isVisible();

    if (step1Active) return 1;
    if (step2Active) return 2;
    if (step3Active) return 3;

    // Fallback: check which form is visible
    const nameVisible = await this.nameInput.isVisible();
    const slugVisible = await this.slugInput.isVisible();
    const previewVisible = await this.previewCard.isVisible();

    if (nameVisible) return 1;
    if (slugVisible) return 2;
    if (previewVisible) return 3;

    throw new Error('Could not determine current wizard step');
  }

  /**
   * Check if validation errors are displayed
   */
  async hasValidationErrors(): Promise<boolean> {
    const errors = [
      this.nameError,
      this.descriptionError,
      this.toolKeyError,
      this.slugError,
    ];

    for (const error of errors) {
      if (await error.isVisible()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Wait for the wizard to complete successfully
   */
  async waitForSuccess(): Promise<void> {
    await this.successMessage.waitFor();
  }

  /**
   * Wait for an error to appear
   */
  async waitForError(): Promise<void> {
    await this.errorMessage.waitFor();
  }

  /**
   * Complete the entire wizard flow with given data
   */
  async completeWizard(toolData: {
    name: string;
    description: string;
    toolKey: string;
    slug?: string;
    icon: string;
    category: string;
  }): Promise<void> {
    // Step 1: Basic Info
    await this.fillBasicInfo({
      name: toolData.name,
      description: toolData.description,
      toolKey: toolData.toolKey,
    });
    await this.goToNextStep();

    // Step 2: Configuration
    await this.fillConfiguration({
      slug: toolData.slug,
      icon: toolData.icon,
      category: toolData.category,
    });
    await this.goToNextStep();

    // Step 3: Preview and Finish
    await this.finishWizard();
  }
}