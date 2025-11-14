import {
  Component,
  ChangeDetectionStrategy,
  signal,
  WritableSignal,
  computed,
  Signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { StepsModule } from 'primeng/steps';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { TemplateWizardService, WizardStatus } from '../services/template-wizard.service';
import { TemplateCategory } from '@nodeangularfullstack/shared';
import { CategorySelectionComponent } from './category-selection.component';
import { LivePreviewPanelComponent } from './live-preview-panel.component';

/**
 * Template Wizard Component
 * Main wizard dialog for creating category-specific form templates.
 * Uses PrimeNG p-dialog and p-steps for multi-step wizard navigation.
 *
 * @since Epic 30, Story 30.10
 *
 * @example
 * ```html
 * <app-template-wizard
 *   [(visible)]="showWizard"
 *   (onComplete)="handleTemplateCreated($event)"
 *   (onCancel)="handleWizardCancelled()">
 * </app-template-wizard>
 * ```
 */
@Component({
  selector: 'app-template-wizard',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    StepsModule,
    ButtonModule,
    CategorySelectionComponent,
    LivePreviewPanelComponent,
  ],
  templateUrl: './template-wizard.component.html',
  styleUrl: './template-wizard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateWizardComponent {
  /**
   * Inject TemplateWizardService for state management
   * @private
   */
  private readonly wizardService = inject(TemplateWizardService);

  /**
   * Controls dialog visibility
   * Two-way bindable via [(visible)]
   */
  public readonly visible: WritableSignal<boolean> = signal(false);

  /**
   * Advanced mode toggle
   * When enabled, allows users to jump to legacy JSON editor
   */
  public readonly advancedMode: WritableSignal<boolean> = signal(false);

  /**
   * Expose wizard service signals for template consumption
   */
  public readonly category: Signal<TemplateCategory | null> = this.wizardService.category;
  public readonly currentStep: Signal<number> = this.wizardService.currentStep;
  public readonly status: Signal<WizardStatus> = this.wizardService.status;
  public readonly isValid: Signal<boolean> = this.wizardService.isValid;
  public readonly validationErrors: Signal<string[]> = this.wizardService.validationErrors;

  /**
   * Computed signal: PrimeNG steps menu items
   * Generates step configuration based on selected category
   */
  public readonly stepItems: Signal<MenuItem[]> = computed(() => {
    const category = this.category();
    if (!category) {
      return [
        { label: 'Select Category', command: () => this.goToStep(0) },
        { label: 'Configure', command: () => this.goToStep(1) },
        { label: 'Preview', command: () => this.goToStep(2) },
      ];
    }

    // Category-specific step labels (will be enhanced in future stories)
    return [
      { label: 'Select Category', command: () => this.goToStep(0) },
      { label: 'Basic Info', command: () => this.goToStep(1) },
      { label: 'Configure', command: () => this.goToStep(2) },
      { label: 'Preview', command: () => this.goToStep(3) },
    ];
  });

  /**
   * Computed signal: Active step index for PrimeNG p-steps
   */
  public readonly activeIndex: Signal<number> = computed(() => {
    return this.currentStep();
  });

  /**
   * Computed signal: Can navigate to next step
   * Prevents navigation when current step is invalid
   */
  public readonly canGoNext: Signal<boolean> = computed(() => {
    const currentStep = this.currentStep();
    const stepItems = this.stepItems();
    const isValid = this.isValid();

    // Can't go beyond last step
    if (currentStep >= stepItems.length - 1) {
      return false;
    }

    // Step 0 (category selection) requires category to be selected
    if (currentStep === 0) {
      return this.category() !== null;
    }

    // Other steps require validation to pass
    return isValid;
  });

  /**
   * Computed signal: Can navigate to previous step
   */
  public readonly canGoBack: Signal<boolean> = computed(() => {
    return this.currentStep() > 0;
  });

  /**
   * Computed signal: Is on final step
   */
  public readonly isLastStep: Signal<boolean> = computed(() => {
    return this.currentStep() === this.stepItems().length - 1;
  });

  /**
   * Opens the wizard dialog and hydrates state from localStorage
   * Automatically restores draft if available
   */
  public open(): void {
    this.visible.set(true);
    // Service automatically hydrates state from localStorage on init
  }

  /**
   * Closes the wizard dialog
   * @param saveChanges - Whether to save current state as draft before closing
   */
  public close(saveChanges: boolean = true): void {
    if (saveChanges) {
      this.wizardService.saveTemplateDraft();
    }
    this.visible.set(false);
  }

  /**
   * Cancels wizard and resets all state
   * Clears localStorage and closes dialog
   */
  public cancel(): void {
    this.wizardService.resetWizard();
    this.visible.set(false);
  }

  /**
   * Navigates to the next wizard step
   * Validates current step before navigation
   */
  public nextStep(): void {
    if (this.canGoNext()) {
      this.wizardService.nextStep();
    }
  }

  /**
   * Navigates to the previous wizard step
   */
  public previousStep(): void {
    if (this.canGoBack()) {
      this.wizardService.previousStep();
    }
  }

  /**
   * Jumps to a specific step index
   * Used by PrimeNG steps menu item commands
   *
   * @param stepIndex - Target step index
   */
  public goToStep(stepIndex: number): void {
    const currentStep = this.currentStep();
    const targetStep = stepIndex;

    // Allow navigation backward without validation
    if (targetStep < currentStep) {
      // Manually set step (service doesn't have goToStep method)
      // This is safe for backward navigation
      while (this.currentStep() > targetStep) {
        this.wizardService.previousStep();
      }
      return;
    }

    // Forward navigation requires validation
    if (targetStep > currentStep && this.canGoNext()) {
      // Navigate one step at a time
      while (this.currentStep() < targetStep && this.canGoNext()) {
        this.wizardService.nextStep();
      }
    }
  }

  /**
   * Toggles advanced mode
   * When enabled, allows jumping to legacy JSON editor
   */
  public toggleAdvancedMode(): void {
    this.advancedMode.update((current) => !current);
  }

  /**
   * Jumps to legacy JSON editor
   * Only available when advanced mode is enabled
   */
  public jumpToJsonEditor(): void {
    if (this.advancedMode()) {
      // TODO: Navigate to legacy JSON editor (Story 30.11+)
      console.warn('JSON editor navigation not yet implemented');
    }
  }
}
