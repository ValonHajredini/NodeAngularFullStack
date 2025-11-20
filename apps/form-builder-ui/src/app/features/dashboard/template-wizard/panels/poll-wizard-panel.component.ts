import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { Textarea } from 'primeng/textarea';
import { AutoComplete } from 'primeng/autocomplete';
import { TemplateWizardService } from '../services/template-wizard.service';

/**
 * Poll Wizard Panel Component
 *
 * Provides a 4-step wizard interface for creating poll templates:
 * 1. Question Setup - Define the poll question
 * 2. Choice Management - Add/remove poll options
 * 3. Duplicate-Vote Settings - Configure vote tracking method
 * 4. Result Visibility - Control when/how results are shown
 *
 * Binds to TemplateWizardService config signals for reactive state management.
 * Provides inline validation with ARIA descriptions for accessibility.
 *
 * @since Epic 30, Story 30.11
 *
 * @example
 * ```html
 * <app-poll-wizard-panel></app-poll-wizard-panel>
 * ```
 */
@Component({
  selector: 'app-poll-wizard-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    Select,
    InputNumberModule,
    CheckboxModule,
    MessageModule,
    TooltipModule,
    Textarea,
    AutoComplete,
  ],
  templateUrl: './poll-wizard-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollWizardPanelComponent implements OnInit {
  /**
   * Injected services
   */
  private readonly wizardService = inject(TemplateWizardService);
  private readonly fb = inject(FormBuilder);

  /**
   * Current wizard step (0-based index)
   * Maps to 4-step poll configuration flow
   */
  public readonly currentStep = computed(() => this.wizardService.currentStep());

  /**
   * Poll configuration form group
   * Contains all 4 steps' form controls
   */
  public pollForm!: FormGroup;

  /**
   * Poll options array (dynamic list of choices)
   * User can add/remove options via Chips component
   */
  public readonly pollOptions = signal<string[]>([]);

  /**
   * Vote tracking method options
   * Available methods: session (recommended), IP address, browser fingerprint
   */
  public readonly trackingMethodOptions = [
    { label: 'Session (Recommended)', value: 'session' },
    { label: 'IP Address', value: 'ip' },
    { label: 'Browser Fingerprint', value: 'fingerprint' },
  ];

  /**
   * Step metadata for display
   * Controls step navigation and labels
   */
  public readonly steps = [
    { label: 'Question Setup', icon: 'pi pi-question-circle' },
    { label: 'Choice Management', icon: 'pi pi-list' },
    { label: 'Vote Settings', icon: 'pi pi-shield' },
    { label: 'Result Visibility', icon: 'pi pi-chart-bar' },
  ];

  /**
   * Validation error messages signal
   * Updated reactively based on form validation state
   */
  public readonly validationErrors = computed(() => {
    const errors: string[] = [];

    if (this.currentStep() === 0 && this.pollForm?.get('question')?.invalid) {
      if (this.pollForm.get('question')?.errors?.['required']) {
        errors.push('Poll question is required');
      }
      if (this.pollForm.get('question')?.errors?.['minlength']) {
        errors.push('Poll question must be at least 10 characters');
      }
    }

    if (this.currentStep() === 1 && this.pollOptions().length < 2) {
      errors.push('Poll must have at least 2 options');
    }

    if (this.currentStep() === 1 && this.pollOptions().length > 10) {
      errors.push('Poll cannot have more than 10 options');
    }

    if (this.currentStep() === 2 && !this.pollForm?.get('trackingMethod')?.value) {
      errors.push('Vote tracking method is required');
    }

    return errors;
  });

  /**
   * Is current step valid computed signal
   * Used to enable/disable "Next" button
   */
  public readonly isStepValid = computed(() => {
    const errors = this.validationErrors();
    return errors.length === 0;
  });

  constructor() {
    // Effect: Sync form state to wizard service config on changes
    effect(() => {
      if (this.pollForm) {
        const formValue = this.pollForm.value;
        this.wizardService.updateConfig({
          categoryData: {
            question: formValue.question,
            options: this.pollOptions(),
            trackingMethod: formValue.trackingMethod,
            preventDuplicates: formValue.preventDuplicates,
            showResultsAfterVote: formValue.showResultsAfterVote,
            allowChangeVote: formValue.allowChangeVote,
          },
        });
      }
    });
  }

  /**
   * Component initialization
   * Creates form controls and hydrates from wizard service if resuming
   */
  ngOnInit(): void {
    this.initializeForm();
    this.hydrateFromWizardConfig();
  }

  /**
   * Initializes the poll configuration form
   * Sets up form controls with validation rules
   * @private
   */
  private initializeForm(): void {
    this.pollForm = this.fb.group({
      // Step 1: Question Setup
      question: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],

      // Step 2: Choice Management (handled via pollOptions signal)

      // Step 3: Duplicate-Vote Settings
      trackingMethod: ['session', Validators.required],
      preventDuplicates: [true],
      allowChangeVote: [false],

      // Step 4: Result Visibility
      showResultsAfterVote: [true],
    });
  }

  /**
   * Hydrates form from existing wizard configuration
   * Called when resuming a saved draft
   * @private
   */
  private hydrateFromWizardConfig(): void {
    const config = this.wizardService.config();
    const categoryData = config.categoryData as Record<string, any>;

    if (categoryData['question']) {
      this.pollForm.patchValue({
        question: categoryData['question'],
        trackingMethod: categoryData['trackingMethod'] || 'session',
        preventDuplicates: categoryData['preventDuplicates'] ?? true,
        allowChangeVote: categoryData['allowChangeVote'] ?? false,
        showResultsAfterVote: categoryData['showResultsAfterVote'] ?? true,
      });
    }

    if (Array.isArray(categoryData['options']) && categoryData['options'].length > 0) {
      this.pollOptions.set(categoryData['options'] as string[]);
    }
  }

  /**
   * Navigate to previous step
   * Delegates to wizard service
   */
  public previousStep(): void {
    this.wizardService.previousStep();
  }

  /**
   * Navigate to next step
   * Validates current step before proceeding
   */
  public nextStep(): void {
    if (this.isStepValid()) {
      this.wizardService.nextStep();
    }
  }

  /**
   * Add a new poll option
   * Used by Chips component
   */
  public addPollOption(option: string): void {
    const trimmed = option.trim();
    if (trimmed && !this.pollOptions().includes(trimmed)) {
      this.pollOptions.update((options) => [...options, trimmed]);
    }
  }

  /**
   * Remove a poll option by index
   * Used by Chips component
   */
  public removePollOption(index: number): void {
    this.pollOptions.update((options) => options.filter((_, i) => i !== index));
  }

  /**
   * Get help text for current step
   * Displayed in tooltip or info message
   */
  public getStepHelpText(): string {
    switch (this.currentStep()) {
      case 0:
        return 'Enter a clear, concise question for your poll. This will be the main question voters see.';
      case 1:
        return 'Add 2-10 poll options. Voters will choose one of these options.';
      case 2:
        return 'Configure how duplicate votes are prevented. Session tracking is recommended for most use cases.';
      case 3:
        return 'Control when and how poll results are displayed to voters.';
      default:
        return '';
    }
  }
}
