import { Injectable, signal, WritableSignal, computed, Signal } from '@angular/core';
import { TemplateCategory, TemplateWizardConfig, FormSchema } from '@nodeangularfullstack/shared';
import { validateCategoryConfiguration, ValidationResult } from './validators';
import { buildSchemaForCategory } from './schema-builders';

/**
 * Wizard status enumeration
 */
export enum WizardStatus {
  /** Wizard has not been started */
  IDLE = 'idle',
  /** User is actively configuring the wizard */
  IN_PROGRESS = 'in_progress',
  /** Wizard configuration is complete */
  COMPLETED = 'completed',
  /** Error occurred during wizard */
  ERROR = 'error',
}

/**
 * Wizard configuration state
 * Stores user's selections and inputs during wizard progression
 */
export interface WizardConfig {
  /** Template name */
  templateName: string;
  /** Template description */
  templateDescription?: string;
  /** Category-specific configuration data (varies by category) */
  categoryData: Record<string, unknown>;
}

/**
 * Template Wizard Service
 * Manages wizard state with Angular signals for creating category-specific templates.
 * Provides reactive state management, validation, persistence, and schema generation.
 *
 * @since Epic 30, Story 30.9
 *
 * @example
 * ```typescript
 * constructor(private wizardService: TemplateWizardService) {
 *   // Set category and start wizard
 *   this.wizardService.setCategory(TemplateCategory.POLLS);
 *
 *   // Update configuration
 *   this.wizardService.updateConfig({ templateName: 'Customer Poll' });
 *
 *   // Navigate wizard
 *   this.wizardService.nextStep();
 *   this.wizardService.previousStep();
 *
 *   // Save draft
 *   this.wizardService.saveTemplateDraft();
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class TemplateWizardService {
  /**
   * Current template category selected by user
   * Used to determine which wizard configuration and validation to apply
   */
  public readonly category: WritableSignal<TemplateCategory | null> = signal(null);

  /**
   * Current step index in the wizard (0-based)
   * Increments as user progresses through wizard steps
   */
  public readonly currentStep: WritableSignal<number> = signal(0);

  /**
   * Wizard configuration state containing user inputs
   * Accumulates data as user completes wizard steps
   */
  public readonly config: WritableSignal<WizardConfig> = signal({
    templateName: '',
    templateDescription: '',
    categoryData: {},
  });

  /**
   * Wizard status tracking lifecycle state
   * Transitions: IDLE → IN_PROGRESS → COMPLETED or ERROR
   */
  public readonly status: WritableSignal<WizardStatus> = signal(WizardStatus.IDLE);

  /**
   * Validation errors signal
   * Updated when validation runs via computed signals
   */
  public readonly validationErrors: WritableSignal<string[]> = signal([]);

  /**
   * LocalStorage key namespace for wizard persistence
   * @private
   */
  private readonly STORAGE_KEY = 'template-wizard-draft';

  /**
   * Computed signal: Validates current wizard state and returns validation status.
   * Checks if all required fields are filled and validates category-specific rules.
   *
   * @returns True if wizard configuration is valid, false otherwise
   *
   * @example
   * ```typescript
   * const valid = wizardService.isValid();
   * if (valid) {
   *   wizardService.nextStep();
   * }
   * ```
   */
  public readonly isValid: Signal<boolean> = computed(() => {
    const category = this.category();
    const config = this.config();

    if (!category || !config.templateName.trim()) {
      return false;
    }

    return this.validateCategoryConfig(category, config.categoryData);
  });

  /**
   * Computed signal: Generates preview FormSchema from current wizard configuration.
   * Returns null if configuration is incomplete or invalid.
   *
   * @returns FormSchema preview object or null if invalid
   *
   * @example
   * ```typescript
   * const preview = wizardService.previewSchema();
   * if (preview) {
   *   this.formRenderer.renderPreview(preview);
   * }
   * ```
   */
  public readonly previewSchema: Signal<FormSchema | null> = computed(() => {
    const category = this.category();
    const config = this.config();

    if (!this.isValid()) {
      return null;
    }

    return this.buildSchemaFromConfig(category!, config);
  });

  /**
   * Computed signal: Generates wizard summary for display in confirmation/preview.
   * Returns formatted summary object with category, name, and key configuration details.
   *
   * @returns Wizard summary object
   *
   * @example
   * ```typescript
   * const summary = wizardService.wizardSummary();
   * console.log(summary.templateName); // "Customer Poll"
   * console.log(summary.category); // "polls"
   * ```
   */
  public readonly wizardSummary: Signal<{
    category: TemplateCategory | null;
    templateName: string;
    templateDescription: string;
    stepCount: number;
    configSummary: string[];
  }> = computed(() => {
    const category = this.category();
    const config = this.config();
    const wizardConfig = category ? this.getWizardConfigForCategory(category) : null;

    const configSummary = this.generateConfigSummary(category, config.categoryData);

    return {
      category,
      templateName: config.templateName,
      templateDescription: config.templateDescription || '',
      stepCount: wizardConfig?.steps.length || 0,
      configSummary,
    };
  });

  constructor() {
    // Hydrate state from localStorage on service initialization
    this.hydrateFromStorage();
  }

  /**
   * Sets the template category and initializes wizard state.
   * Resets wizard to step 0 and clears previous configuration.
   *
   * @param category - Template category to create (polls, quiz, ecommerce, etc.)
   *
   * @example
   * ```typescript
   * wizardService.setCategory(TemplateCategory.QUIZ);
   * ```
   */
  public setCategory(category: TemplateCategory): void {
    this.category.set(category);
    this.currentStep.set(0);
    this.status.set(WizardStatus.IN_PROGRESS);

    // Reset config with category-specific defaults
    this.config.set({
      templateName: '',
      templateDescription: '',
      categoryData: this.getDefaultCategoryData(category),
    });

    // Persist state change
    this.persistToStorage();
  }

  /**
   * Advances wizard to the next step if current step is valid.
   * Automatically persists state after navigation.
   *
   * @throws {Error} If current step validation fails
   *
   * @example
   * ```typescript
   * if (wizardService.isCurrentStepValid()) {
   *   wizardService.nextStep();
   * }
   * ```
   */
  public nextStep(): void {
    const category = this.category();
    if (!category) {
      throw new Error('Cannot navigate: No category selected');
    }

    const wizardConfig = this.getWizardConfigForCategory(category);
    const maxSteps = wizardConfig.steps.length;

    if (this.currentStep() < maxSteps - 1) {
      this.currentStep.update((step) => step + 1);
      this.persistToStorage();
    }
  }

  /**
   * Returns to the previous wizard step.
   * Automatically persists state after navigation.
   *
   * @example
   * ```typescript
   * wizardService.previousStep();
   * ```
   */
  public previousStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update((step) => step - 1);
      this.persistToStorage();
    }
  }

  /**
   * Updates wizard configuration with partial updates.
   * Merges new configuration with existing state.
   *
   * @param partialConfig - Partial configuration object to merge
   *
   * @example
   * ```typescript
   * wizardService.updateConfig({
   *   templateName: 'Customer Satisfaction Survey',
   *   categoryData: { minOptions: 3, maxOptions: 8 }
   * });
   * ```
   */
  public updateConfig(partialConfig: Partial<WizardConfig>): void {
    this.config.update((current) => ({
      ...current,
      ...partialConfig,
      categoryData: {
        ...current.categoryData,
        ...(partialConfig.categoryData || {}),
      },
    }));

    this.persistToStorage();
  }

  /**
   * Saves current wizard state as a draft to localStorage.
   * Allows users to resume wizard later without losing progress.
   *
   * @example
   * ```typescript
   * wizardService.saveTemplateDraft();
   * ```
   */
  public saveTemplateDraft(): void {
    this.persistToStorage();
    // Draft saved to localStorage - logged via persistToStorage error handling
  }

  /**
   * Resets wizard to initial state and clears localStorage.
   * Used when user cancels wizard or completes template creation.
   *
   * @example
   * ```typescript
   * wizardService.resetWizard();
   * ```
   */
  public resetWizard(): void {
    this.category.set(null);
    this.currentStep.set(0);
    this.config.set({
      templateName: '',
      templateDescription: '',
      categoryData: {},
    });
    this.status.set(WizardStatus.IDLE);

    this.clearStorage();
  }

  /**
   * Persists current wizard state to localStorage.
   * @private
   */
  private persistToStorage(): void {
    const state = {
      category: this.category(),
      currentStep: this.currentStep(),
      config: this.config(),
      status: this.status(),
    };

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist wizard state:', error);
    }
  }

  /**
   * Hydrates wizard state from localStorage on service initialization.
   * @private
   */
  private hydrateFromStorage(): void {
    try {
      const storedState = localStorage.getItem(this.STORAGE_KEY);
      if (!storedState) {
        return;
      }

      const state = JSON.parse(storedState);

      if (state.category) {
        this.category.set(state.category);
      }
      if (typeof state.currentStep === 'number') {
        this.currentStep.set(state.currentStep);
      }
      if (state.config) {
        this.config.set(state.config);
      }
      if (state.status) {
        this.status.set(state.status);
      }
    } catch (error) {
      console.error('Failed to hydrate wizard state:', error);
      this.clearStorage();
    }
  }

  /**
   * Clears wizard state from localStorage.
   * @private
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear wizard storage:', error);
    }
  }

  /**
   * Returns default category-specific data for initialization.
   * @private
   * @param category - Template category
   * @returns Default category data object
   */
  private getDefaultCategoryData(category: TemplateCategory): Record<string, unknown> {
    switch (category) {
      case TemplateCategory.POLLS:
        return { minOptions: 2, maxOptions: 10, voteTracking: 'session' };
      case TemplateCategory.QUIZ:
        return { minQuestions: 1, passingScore: 70, allowRetakes: true };
      case TemplateCategory.ECOMMERCE:
        return { enableInventory: true, enableTax: false };
      case TemplateCategory.SERVICES:
        return { slotInterval: 30, maxBookingsPerSlot: 1 };
      case TemplateCategory.DATA_COLLECTION:
        return { minItems: 1, enableCategories: false };
      case TemplateCategory.EVENTS:
        return { allowGuestCount: true, maxTicketsPerOrder: 10 };
      default:
        return {};
    }
  }

  /**
   * Returns wizard configuration metadata for a given category.
   * This is a placeholder that will be expanded in Task 2 with actual wizard configs.
   * @private
   * @param category - Template category
   * @returns Wizard configuration with steps and allowed fields
   */
  private getWizardConfigForCategory(category: TemplateCategory): TemplateWizardConfig {
    // Placeholder: Will be populated with actual wizard configurations
    const baseSteps = [
      { stepId: 'basic', label: 'Basic Info', required: true, order: 0 },
      { stepId: 'config', label: 'Configuration', required: true, order: 1 },
      { stepId: 'preview', label: 'Preview', required: false, order: 2 },
    ];

    const baseFields: any[] = [];

    switch (category) {
      case TemplateCategory.POLLS:
        return {
          category: TemplateCategory.POLLS,
          steps: baseSteps,
          allowedFields: baseFields,
          pollOptions: { minOptions: 2, maxOptions: 10 },
          voteTrackingOptions: ['session', 'ip', 'fingerprint'],
        };
      case TemplateCategory.QUIZ:
        return {
          category: TemplateCategory.QUIZ,
          steps: baseSteps,
          allowedFields: baseFields,
          questionOptions: { minQuestions: 1, maxQuestions: 50 },
          scoringOptions: { defaultPoints: 1, allowCustomPoints: true },
        };
      case TemplateCategory.ECOMMERCE:
        return {
          category: TemplateCategory.ECOMMERCE,
          steps: baseSteps,
          allowedFields: baseFields,
          inventoryOptions: { enableTracking: true, enableVariants: true },
          pricingOptions: { enableTax: true, enableShipping: true },
        };
      case TemplateCategory.SERVICES:
        return {
          category: TemplateCategory.SERVICES,
          steps: baseSteps,
          allowedFields: baseFields,
          timeSlotOptions: { interval: 30, minAdvanceBooking: 1, maxAdvanceBooking: 30 },
          capacityOptions: { defaultCapacity: 1, allowOverbook: false },
        };
      case TemplateCategory.DATA_COLLECTION:
        return {
          category: TemplateCategory.DATA_COLLECTION,
          steps: baseSteps,
          allowedFields: baseFields,
          menuOptions: { minItems: 1, maxItems: 100, enableCategories: true },
          orderOptions: { enableTax: true, enableTips: true, calculateTotal: true },
        };
      case TemplateCategory.EVENTS:
        return {
          category: TemplateCategory.EVENTS,
          steps: baseSteps,
          allowedFields: baseFields,
          rsvpOptions: { allowGuestCount: true, requireContactInfo: true },
          ticketOptions: { enableSales: true, enableDiscounts: false, maxPerOrder: 10 },
        };
      default:
        // Exhaustiveness check
        const _exhaustive: never = category;
        throw new Error(`Unknown template category: ${category}`);
    }
  }

  /**
   * Validates category-specific configuration data.
   * Uses pure validator functions from validators.ts module.
   * @private
   * @param category - Template category
   * @param categoryData - Category configuration data
   * @returns True if valid, false otherwise
   */
  private validateCategoryConfig(
    category: TemplateCategory,
    categoryData: Record<string, unknown>,
  ): boolean {
    const result: ValidationResult = validateCategoryConfiguration(category, categoryData);

    // Update validation errors signal for UI consumption
    this.validationErrors.set(result.errors);

    return result.valid;
  }

  /**
   * Builds FormSchema from wizard configuration.
   * Uses category-specific schema builders from schema-builders.ts module.
   * @private
   * @param category - Template category
   * @param config - Wizard configuration
   * @returns FormSchema object with category-specific fields and business logic
   */
  private buildSchemaFromConfig(category: TemplateCategory, config: WizardConfig): FormSchema {
    return buildSchemaForCategory(category, config);
  }

  /**
   * Generates human-readable configuration summary.
   * @private
   * @param category - Template category
   * @param categoryData - Category configuration data
   * @returns Array of summary strings
   */
  private generateConfigSummary(
    category: TemplateCategory | null,
    categoryData: Record<string, unknown>,
  ): string[] {
    if (!category) {
      return [];
    }

    const summary: string[] = [];

    switch (category) {
      case TemplateCategory.POLLS:
        summary.push(`Min options: ${(categoryData['minOptions'] as number) || 2}`);
        summary.push(`Max options: ${(categoryData['maxOptions'] as number) || 10}`);
        summary.push(`Vote tracking: ${(categoryData['voteTracking'] as string) || 'session'}`);
        break;
      case TemplateCategory.QUIZ:
        summary.push(`Min questions: ${(categoryData['minQuestions'] as number) || 1}`);
        summary.push(`Passing score: ${(categoryData['passingScore'] as number) || 70}%`);
        summary.push(`Allow retakes: ${(categoryData['allowRetakes'] as boolean) ? 'Yes' : 'No'}`);
        break;
      case TemplateCategory.ECOMMERCE:
        summary.push(
          `Inventory tracking: ${(categoryData['enableInventory'] as boolean) ? 'Yes' : 'No'}`,
        );
        summary.push(`Tax calculation: ${(categoryData['enableTax'] as boolean) ? 'Yes' : 'No'}`);
        break;
      case TemplateCategory.SERVICES:
        summary.push(`Slot interval: ${(categoryData['slotInterval'] as number) || 30} minutes`);
        summary.push(
          `Max bookings: ${(categoryData['maxBookingsPerSlot'] as number) || 1} per slot`,
        );
        break;
      case TemplateCategory.DATA_COLLECTION:
        summary.push(`Min items: ${(categoryData['minItems'] as number) || 1}`);
        summary.push(
          `Categories: ${(categoryData['enableCategories'] as boolean) ? 'Enabled' : 'Disabled'}`,
        );
        break;
      case TemplateCategory.EVENTS:
        summary.push(
          `Guest count: ${(categoryData['allowGuestCount'] as boolean) ? 'Allowed' : 'Not allowed'}`,
        );
        summary.push(
          `Max tickets: ${(categoryData['maxTicketsPerOrder'] as number) || 10} per order`,
        );
        break;
    }

    return summary;
  }
}
