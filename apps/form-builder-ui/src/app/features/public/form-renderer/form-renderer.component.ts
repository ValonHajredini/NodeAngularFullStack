import { Component, Input, OnInit, OnDestroy, HostListener, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG Imports
import { ProgressSpinner } from 'primeng/progressspinner';
import { Card } from 'primeng/card';
import { ButtonDirective } from 'primeng/button';
import { MessageService } from 'primeng/api';

// Shared Types
import {
  FormSchema,
  FormSettings,
  FormField,
  FormFieldType,
  FormBackgroundSettings,
  FormTheme,
  HeadingMetadata,
  TextBlockMetadata,
  ImageMetadata,
  FormStep,
  StepNavigationEvent,
  RowLayoutConfig,
  QuizResultMetadata,
  isInputField,
  isDisplayElement,
  isQuizResultMetadata,
} from '@nodeangularfullstack/shared';

// Shared Services
import { HtmlSanitizerService } from '../../../shared/services/html-sanitizer.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Service
import { FormRendererService, FormRenderError, FormRenderErrorType } from './form-renderer.service';
import { ThemePreviewService } from '../../dashboard/theme-preview.service';

// Field Renderers
import { ImageGalleryRendererComponent } from './image-gallery-renderer.component';
import { AvailableSlotsComponent } from './available-slots.component';
import { QuizResultsComponent } from './quiz-results/quiz-results.component';

/**
 * Component state for UI management
 */
interface ComponentState {
  loading: boolean;
  error: string | null;
  errorType: FormRenderErrorType | null;
  submitting: boolean;
  submitted: boolean;
  submissionMessage: string | null;
}

/**
 * Step dot item for pagination display
 */
interface StepDotItem {
  type: 'dot' | 'ellipsis';
  index?: number;
  step?: FormStep;
}

/**
 * Public form renderer component that dynamically generates forms from schema.
 * Supports all field types, conditional visibility, validation, and responsive layouts.
 * This component is publicly accessible without authentication.
 *
 * Preview Mode Support (Story 14.3):
 * - Accepts @Input() formSchema for in-memory preview (bypasses API fetch)
 * - Accepts @Input() previewMode flag to disable submission
 * - When previewMode === true, uses provided formSchema and disables form submission
 * - When previewMode === false, loads schema from API via token (published form mode)
 */
@Component({
  selector: 'app-form-renderer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ProgressSpinner,
    Card,
    ButtonDirective,
    ImageGalleryRendererComponent,
    AvailableSlotsComponent,
    QuizResultsComponent,
  ],
  providers: [MessageService],
  templateUrl: './form-renderer.component.html',
  styleUrls: ['./form-renderer.component.scss'],
})
export class FormRendererComponent implements OnInit, OnDestroy {
  /**
   * Input: FormSchema for preview mode (bypasses API fetch).
   * When provided, component uses this schema instead of fetching from API.
   */
  @Input() formSchema: FormSchema | null = null;

  /**
   * Input: Preview mode flag (disables submission).
   * When true, form submission is disabled and no API calls are made.
   */
  @Input() previewMode = false;

  formGroup: FormGroup | null = null;
  schema: FormSchema | null = null;
  settings: FormSettings | null = null;
  isPreview = false;

  // Theme loading signal (Story 20.7)
  private readonly _themeLoaded = signal<boolean>(false);
  readonly themeLoaded = this._themeLoaded.asReadonly();

  // Current theme signal (Story 24.9)
  private readonly _currentTheme = signal<FormTheme | null>(null);

  // Computed container position class based on theme (Story 24.9)
  readonly containerPositionClass = computed(() => {
    const theme = this._currentTheme();
    if (!theme) {
      return 'form-container-center'; // Default to center when no theme
    }

    const position = theme.themeConfig.desktop.containerPosition;
    switch (position) {
      case 'left':
        return 'form-container-left';
      case 'full-width':
        return 'form-container-full-width';
      case 'center':
      default:
        return 'form-container-center';
    }
  });

  // Step Form Navigation Signals
  private readonly _formSchemaSignal = signal<FormSchema | null>(null);
  private readonly _settingsSignal = signal<FormSettings | null>(null);
  protected readonly isStepFormEnabled = computed(
    () => this._settingsSignal()?.stepForm?.enabled === true,
  );
  protected readonly steps = computed(() => this._settingsSignal()?.stepForm?.steps ?? []);

  private readonly _currentStepIndex = signal<number>(0);
  readonly currentStepIndex = this._currentStepIndex.asReadonly();
  readonly currentStep = computed(() => this.steps()[this._currentStepIndex()]);

  readonly isFirstStep = computed(() => this._currentStepIndex() === 0);
  readonly isLastStep = computed(() => this._currentStepIndex() === this.steps().length - 1);

  private readonly _stepValidationStates = signal<Set<number>>(new Set());
  readonly stepValidationStates = this._stepValidationStates.asReadonly();

  // Step navigation events tracking (Story 19.5)
  private readonly _stepEvents = signal<StepNavigationEvent[]>([]);
  readonly stepEvents = this._stepEvents.asReadonly();

  // Filter fields by current step
  protected readonly currentStepFields = computed(() => {
    const fields = this._formSchemaSignal()?.fields ?? [];
    return this.filterFieldsForCurrentStep(fields);
  });

  /**
   * Smart pagination for step dots - shows sliding window with ellipsis
   * @returns Array of step indicators to display with type: 'dot' | 'ellipsis'
   *
   * Examples:
   * - 7 steps or less: Show all dots
   * - At step 1 of 30: [1, 2, 3, 4, ..., 29, 30]
   * - At step 20 of 30: [1, 2, ..., 18, 19, 20, 21, 22, ..., 29, 30]
   * - At step 29 of 30: [1, 2, ..., 26, 27, 28, 29, 30]
   */
  protected readonly visibleStepDots = computed<StepDotItem[]>(() => {
    const steps = this.steps();
    const totalSteps = steps.length;
    const currentIndex = this._currentStepIndex();

    // If 7 steps or fewer, show all dots (no ellipsis needed)
    if (totalSteps <= 7) {
      return steps.map((step, index) => ({ type: 'dot' as const, index, step }));
    }

    const dots: StepDotItem[] = [];

    // Always show first 2 steps
    dots.push({ type: 'dot', index: 0, step: steps[0] });
    dots.push({ type: 'dot', index: 1, step: steps[1] });

    // Near the beginning (steps 0-3): show first 4 steps + ellipsis + last 2
    if (currentIndex <= 3) {
      if (totalSteps > 2) dots.push({ type: 'dot', index: 2, step: steps[2] });
      if (totalSteps > 3) dots.push({ type: 'dot', index: 3, step: steps[3] });
      if (totalSteps > 6) dots.push({ type: 'ellipsis' });
    }
    // Near the end (last 4 steps): show first 2 + ellipsis + last 4 steps
    else if (currentIndex >= totalSteps - 4) {
      dots.push({ type: 'ellipsis' });
      for (let i = totalSteps - 4; i < totalSteps - 2; i++) {
        if (i > 1) dots.push({ type: 'dot', index: i, step: steps[i] });
      }
    }
    // In the middle: show first 2 + ellipsis + window around current + ellipsis + last 2
    else {
      dots.push({ type: 'ellipsis' });

      // Show 2 steps before, current, and 2 steps after
      for (let i = currentIndex - 2; i <= currentIndex + 2; i++) {
        if (i > 1 && i < totalSteps - 2) {
          dots.push({ type: 'dot', index: i, step: steps[i] });
        }
      }

      dots.push({ type: 'ellipsis' });
    }

    // Always show last 2 steps
    dots.push({ type: 'dot', index: totalSteps - 2, step: steps[totalSteps - 2] });
    dots.push({ type: 'dot', index: totalSteps - 1, step: steps[totalSteps - 1] });

    return dots;
  });

  state: ComponentState = {
    loading: true,
    error: null,
    errorType: null,
    submitting: false,
    submitted: false,
    submissionMessage: null,
  };

  /**
   * Stock availability signal for product templates (Story 29.11 AC10).
   * Tracks whether selected product variant is in stock.
   * - true: In stock (can submit)
   * - false: Out of stock (disable submit)
   * - null: No variant selected or not a product form
   */
  private readonly _stockAvailable = signal<boolean | null>(null);
  readonly stockAvailable = this._stockAvailable.asReadonly();

  /**
   * Quiz results signal for quiz templates (Story 29.13).
   * Stores quiz scoring results after submission.
   * Contains score, pass/fail status, and detailed answer breakdown.
   */
  private readonly _quizResults = signal<QuizResultMetadata | null>(null);
  readonly quizResults = this._quizResults.asReadonly();

  /**
   * Show quiz results flag.
   * When true, displays QuizResultsComponent instead of form.
   */
  private readonly _showQuizResults = signal(false);
  readonly showQuizResults = this._showQuizResults.asReadonly();

  /**
   * Check if current form uses quiz template.
   * Returns true if template business logic config type is 'quiz'.
   */
  get isQuizTemplate(): boolean {
    const template = this.schema?.template;
    return template?.businessLogicConfig?.type === 'quiz';
  }

  // Expose enums to template
  fieldTypes = FormFieldType;
  errorTypes = FormRenderErrorType;

  private destroy$ = new Subject<void>();
  private token = '';
  private _shortCode = ''; // Form short code for appointment slot fetching

  // Public shortCode signal for template access (Story 29.12)
  private readonly _shortCodeSignal = signal<string>('');
  readonly shortCode = this._shortCodeSignal.asReadonly();

  // Computed signal to detect appointment template type (Story 29.12 AC9)
  protected readonly isAppointmentTemplate = computed(() => {
    const schema = this._formSchemaSignal();
    return (schema as any)?.template?.businessLogicConfig?.type === 'appointment';
  });

  private collapsedTextBlocks = new Set<string>();
  private checkboxSelections = new Map<string, string[]>();

  // Dynamic height management for step forms
  private heightUpdateTimer?: any;

  constructor(
    private route: ActivatedRoute,
    private formRendererService: FormRendererService,
    private fb: FormBuilder,
    private htmlSanitizer: HtmlSanitizerService,
    private domSanitizer: DomSanitizer,
    private messageService: MessageService,
    private themePreviewService: ThemePreviewService,
  ) {}

  ngOnInit(): void {
    // If in preview mode with provided schema, use it directly (Story 14.3)
    if (this.previewMode && this.formSchema) {
      this.schema = this.formSchema;
      this._formSchemaSignal.set(this.formSchema);
      this.settings = this.formSchema.settings as FormSettings;
      this._settingsSignal.set(this.settings);
      this.isPreview = true;
      this.formGroup = this.buildFormGroup(this.formSchema);
      this.setupConditionalVisibility();
      this.state = { ...this.state, loading: false };

      // Apply theme CSS if available (Story 20.7)
      // Note: Preview mode may not include theme data
      const themeIdFromSettings = this.settings?.themeId;
      const theme = (this.formSchema as any).theme; // Theme might be attached to schema
      this.applyThemeIfAvailable(theme, themeIdFromSettings);

      // Record initial 'view' event for step forms (Story 19.5)
      if (this.isStepFormEnabled()) {
        this.recordStepEvent('view');
      }

      // Initial height calculation after form loads (for all forms)
      setTimeout(() => this.updateHeight(), 100);

      return;
    }

    // Otherwise, detect if this is a preview route, short code route, or published form route
    this.route.url.pipe(takeUntil(this.destroy$)).subscribe((urlSegments) => {
      const isPreviewRoute =
        urlSegments.length >= 2 &&
        urlSegments[0]?.path === 'forms' &&
        urlSegments[1]?.path === 'preview';

      const isShortCodeRoute =
        urlSegments.length >= 2 &&
        urlSegments[0]?.path === 'public' &&
        urlSegments[1]?.path === 'form';

      if (isPreviewRoute) {
        this.loadPreviewData();
      } else if (isShortCodeRoute) {
        this.loadFormByShortCode();
      } else {
        this.loadPublishedForm();
      }
    });
  }

  /**
   * Loads preview data from localStorage
   */
  private loadPreviewData(): void {
    const previewId = this.route.snapshot.paramMap.get('previewId');
    if (!previewId) {
      this.handleError('Invalid preview URL', FormRenderErrorType.FORM_NOT_FOUND);
      return;
    }

    const previewDataStr = localStorage.getItem(`form-preview-${previewId}`);
    if (!previewDataStr) {
      this.handleError(
        'Preview data not found. Please generate a new preview.',
        FormRenderErrorType.FORM_NOT_FOUND,
      );
      return;
    }

    try {
      const previewData = JSON.parse(previewDataStr);

      // Check if preview data is expired (older than 5 minutes)
      if (previewData.timestamp && Date.now() - previewData.timestamp > 5 * 60 * 1000) {
        localStorage.removeItem(`form-preview-${previewId}`);
        this.handleError(
          'Preview has expired. Please generate a new preview.',
          FormRenderErrorType.FORM_NOT_FOUND,
        );
        return;
      }

      this.schema = previewData.schema;
      this._formSchemaSignal.set(previewData.schema);
      this.settings = previewData.settings;
      this._settingsSignal.set(previewData.settings);
      this.isPreview = previewData.isPreview || false;

      if (this.schema) {
        this.formGroup = this.buildFormGroup(this.schema);
        this.setupConditionalVisibility();
      }

      this.state = { ...this.state, loading: false };

      // Apply theme CSS if available (Story 20.7)
      // Note: Preview data may not include theme data
      const themeIdFromSettings = previewData.settings?.themeId;
      this.applyThemeIfAvailable(previewData.theme, themeIdFromSettings);

      // Record initial 'view' event for step forms (Story 19.5)
      if (this.isStepFormEnabled()) {
        this.recordStepEvent('view');
      }

      // Initial height calculation after form loads (for all forms)
      setTimeout(() => this.updateHeight(), 100);
    } catch (error) {
      this.handleError('Failed to load preview data', FormRenderErrorType.PARSE_ERROR);
    }
  }

  /**
   * Loads published form from API
   */
  private loadPublishedForm(): void {
    // Get token from route params
    this.token = this.route.snapshot.paramMap.get('token') || '';

    if (!this.token) {
      this.handleError('No form token provided', FormRenderErrorType.INVALID_TOKEN);
      return;
    }

    // Load form schema
    this.loadFormSchema();
  }

  /**
   * Loads a published form using short code from route parameter.
   * Used for short link access (e.g., /public/form/abc123).
   */
  private loadFormByShortCode(): void {
    // Get short code from route params
    const shortCode = this.route.snapshot.paramMap.get('shortCode') || '';

    if (!shortCode) {
      this.handleError('No form short code provided', FormRenderErrorType.INVALID_TOKEN);
      return;
    }

    // Store short code for appointment slot fetching (Story 29.12)
    this._shortCode = shortCode;
    this._shortCodeSignal.set(shortCode);

    // Load form schema by short code
    this.formRendererService
      .getFormByShortCode(shortCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.schema = result.schema;
          this._formSchemaSignal.set(result.schema);
          this.settings = result.settings;
          this._settingsSignal.set(result.settings);
          this.formGroup = this.buildFormGroup(result.schema);
          this.setupConditionalVisibility();
          this.state = { ...this.state, loading: false };

          // Set token to renderToken for form submission
          this.token = result.renderToken;

          // Apply theme CSS if available (Story 20.7)
          const themeIdFromSettings = this.settings?.themeId;
          this.applyThemeIfAvailable(result.theme, themeIdFromSettings);

          // Record initial 'view' event for step forms (Story 19.5)
          if (this.isStepFormEnabled()) {
            this.recordStepEvent('view');
          }

          // Initial height calculation after form loads (for all forms)
          setTimeout(() => this.updateHeight(), 100);
        },
        error: (error: FormRenderError) => {
          this.handleError(error.message, error.type);
        },
      });
  }

  /**
   * Handles errors by updating state
   */
  private handleError(message: string, type: FormRenderErrorType): void {
    this.state = {
      ...this.state,
      loading: false,
      error: message,
      errorType: type,
    };
  }

  /**
   * Applies theme CSS if theme is provided, otherwise clears theme CSS.
   * Handles deleted/missing themes gracefully (AC: 5).
   * Story 20.7: Public Form Rendering with Themes
   * Story 24.9: Store theme in signal for container position class
   * @param theme - Optional theme object to apply
   * @param themeIdFromSettings - Optional theme ID from form settings (for deleted theme detection)
   */
  private applyThemeIfAvailable(
    theme: FormTheme | null | undefined,
    themeIdFromSettings?: string,
  ): void {
    // If theme is provided, apply it
    if (theme) {
      this._currentTheme.set(theme); // Store theme in signal (Story 24.9)
      this.themePreviewService.applyThemeCss(theme);
      this._themeLoaded.set(true);
      console.log('[Theme] Applied theme:', theme.name);
    } else {
      // No theme available - clear any existing theme CSS
      this._currentTheme.set(null); // Clear theme signal (Story 24.9)
      this.themePreviewService.clearThemeCss();
      this._themeLoaded.set(false);

      // If theme ID was expected but theme is null, warn about deleted theme (AC: 5)
      if (themeIdFromSettings) {
        console.warn(
          `[Theme] Theme ${themeIdFromSettings} not found for form, using default styles. The theme may have been deleted.`,
        );
      }
    }
  }

  /**
   * Handles appointment slot selection from AvailableSlotsComponent.
   * Automatically populates date and time slot fields in the form.
   *
   * @param slot - Selected slot with date and timeSlot
   */
  onSlotSelected(slot: { date: string; timeSlot: string }): void {
    if (!this.formGroup) {
      console.warn('Form group not initialized, cannot populate slot fields');
      return;
    }

    console.log('Slot selected:', slot);

    // Find date and time slot fields in the form schema
    const dateField = this.schema?.fields.find((f) => f.type === FormFieldType.DATE);
    const timeSlotField = this.schema?.fields.find(
      (f) => f.type === FormFieldType.SELECT && f.fieldName.toLowerCase().includes('time')
    );

    // Auto-populate date field
    if (dateField) {
      const dateControl = this.formGroup.get(dateField.fieldName);
      if (dateControl) {
        // Convert ISO date string (YYYY-MM-DD) to Date object for calendar field
        const dateValue = new Date(slot.date + 'T00:00:00');
        dateControl.setValue(dateValue);
        dateControl.markAsTouched();
        console.log(`Auto-populated date field "${dateField.fieldName}" with:`, dateValue);
      }
    } else {
      console.warn('No date field found in form schema');
    }

    // Auto-populate time slot field
    if (timeSlotField) {
      const timeSlotControl = this.formGroup.get(timeSlotField.fieldName);
      if (timeSlotControl) {
        timeSlotControl.setValue(slot.timeSlot);
        timeSlotControl.markAsTouched();
        console.log(`Auto-populated time slot field "${timeSlotField.fieldName}" with:`, slot.timeSlot);
      }
    } else {
      console.warn('No time slot field found in form schema');
    }

    // Scroll to form fields after slot selection
    setTimeout(() => {
      const formElement = document.querySelector('.form-fields-container');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clear height update timer
    if (this.heightUpdateTimer) {
      clearTimeout(this.heightUpdateTimer);
    }

    // Clear theme CSS on component destruction (Story 20.7)
    this.themePreviewService.clearThemeCss();
    this._themeLoaded.set(false);
  }

  /**
   * Detects if the form is running inside an iframe.
   * @returns true if form is embedded in an iframe
   */
  private isInIframe(): boolean {
    try {
      return window !== window.parent;
    } catch (e) {
      // Cross-origin iframe access blocked - assume we're in iframe
      return true;
    }
  }

  /**
   * Calculates the actual content height of the form.
   * Measures the form content directly, not the container with fixed min-height.
   * @returns Calculated height in pixels
   */
  private calculateContentHeight(): number {
    // Try to measure the actual form element first
    const formElement = document.querySelector('form') as HTMLElement;
    if (formElement) {
      // Measure the form's natural content height
      const formHeight = formElement.scrollHeight;

      // Add padding from card body (15px top + 15px bottom = 30px)
      // Plus some buffer for better UX (prevents cutoff)
      const totalHeight = formHeight + 30 + 40;

      return totalHeight;
    }

    // Fallback: measure the form-content-wrapper itself
    const contentWrapper = document.querySelector('.form-content-wrapper') as HTMLElement;
    if (contentWrapper) {
      // Get all children and calculate their total height
      let totalHeight = 0;
      const children = Array.from(contentWrapper.children) as HTMLElement[];
      children.forEach(child => {
        totalHeight += child.offsetHeight;
      });

      return totalHeight + 60; // Add padding buffer
    }

    // Last resort fallback
    return 400;
  }

  /**
   * Updates the form height based on current content and context.
   * - If in iframe: sends postMessage to parent window
   * - If direct URL: adjusts container height directly
   * Debounced to prevent excessive updates (100ms delay).
   */
  private updateHeight(): void {
    // Clear any pending height updates
    if (this.heightUpdateTimer) {
      clearTimeout(this.heightUpdateTimer);
    }

    // Debounce the height update to avoid excessive calculations
    this.heightUpdateTimer = setTimeout(() => {
      const height = this.calculateContentHeight();

      if (this.isInIframe()) {
        // In iframe context: send postMessage to parent window
        try {
          window.parent.postMessage(
            {
              type: 'formHeightChange',
              height: height
            },
            '*' // Allow any origin (form can be embedded anywhere)
          );
          console.log('[Dynamic Height] Posted height to parent:', height);
        } catch (e) {
          console.error('[Dynamic Height] Failed to post message to parent:', e);
        }
      } else {
        // Direct URL context: apply height to container
        const container = document.querySelector('.form-content-wrapper') as HTMLElement;
        if (container) {
          container.style.minHeight = `${height}px`;
          console.log('[Dynamic Height] Applied min-height to container:', height);
        }
      }
    }, 100); // 100ms debounce delay
  }

  /**
   * Window resize listener to recalculate height on viewport changes.
   * Useful for responsive layouts and orientation changes on mobile.
   */
  @HostListener('window:resize')
  onWindowResize(): void {
    // Recalculate height for all forms on window resize
    this.updateHeight();
  }

  /**
   * Navigate to next step with validation
   */
  goToNextStep(): void {
    if (this.isLastStep()) return;
    if (!this.validateCurrentStep()) return;

    // Record 'next' event before navigating
    this.recordStepEvent('next');

    this.markStepAsValid(this._currentStepIndex());
    this._currentStepIndex.update((i) => i + 1);

    // Record 'view' event for the new step
    this.recordStepEvent('view');

    this.scrollToTop();

    // Update height after step change
    setTimeout(() => this.updateHeight(), 50);
  }

  /**
   * Navigate to previous step without validation
   */
  goToPreviousStep(): void {
    if (this.isFirstStep()) return;

    // Record 'previous' event before navigating
    this.recordStepEvent('previous');

    this._currentStepIndex.update((i) => i - 1);

    // Record 'view' event for the previous step
    this.recordStepEvent('view');

    this.scrollToTop();

    // Update height after step change
    setTimeout(() => this.updateHeight(), 50);
  }

  /**
   * Navigate to specific step
   */
  goToStep(stepIndex: number): void {
    // Allow navigation to previously validated steps only
    if (stepIndex < 0 || stepIndex >= this.steps().length) return;
    if (stepIndex > this._currentStepIndex() && !this.validateCurrentStep()) return;

    const previousIndex = this._currentStepIndex();
    this._currentStepIndex.set(stepIndex);

    // Record 'view' event for the target step
    this.recordStepEvent('view');

    this.scrollToTop();

    // Update height after step change
    setTimeout(() => this.updateHeight(), 50);
  }

  /**
   * Scroll to top of form
   */
  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Validate current step fields
   */
  validateCurrentStep(): boolean {
    const currentStepId = this.currentStep()?.id;
    if (!currentStepId) return true;

    // Get all form controls for current step fields
    const stepFields = this.currentStepFields();
    const stepFieldNames = stepFields.filter((f) => isInputField(f.type)).map((f) => f.fieldName);

    // Validate each field in current step
    let isValid = true;
    stepFieldNames.forEach((fieldName) => {
      const control = this.formGroup?.get(fieldName);
      if (control) {
        control.markAsTouched();
        control.updateValueAndValidity();
        if (control.invalid) {
          isValid = false;
        }
      }
    });

    if (!isValid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fix the errors before continuing to the next step.',
        life: 5000,
      });
    }

    return isValid;
  }

  /**
   * Mark step as validated
   */
  markStepAsValid(stepIndex: number): void {
    const states = new Set(this._stepValidationStates());
    states.add(stepIndex);
    this._stepValidationStates.set(states);
  }

  /**
   * Handle keyboard navigation for steps
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyboardNavigation(event: KeyboardEvent): void {
    // Only apply keyboard shortcuts for step forms
    if (!this.isStepFormEnabled()) return;

    if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) {
      return; // Don't interfere with form input
    }

    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.goToNextStep();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.goToPreviousStep();
      }
    }

    if (event.key === 'Enter' && !this.isLastStep()) {
      // Prevent form submission on Enter unless on last step
      if (event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      this.goToNextStep();
    }
  }

  /**
   * Records a step navigation event for analytics tracking (Story 19.5).
   * Events are stored in metadata and submitted with the form for step completion analysis.
   *
   * @param action - The navigation action performed ('view' | 'next' | 'previous' | 'submit')
   */
  private recordStepEvent(action: 'view' | 'next' | 'previous' | 'submit'): void {
    if (!this.isStepFormEnabled()) return;

    const currentStepData = this.currentStep();
    if (!currentStepData) return;

    const event: StepNavigationEvent = {
      stepId: currentStepData.id,
      stepOrder: currentStepData.order,
      action,
      timestamp: new Date(),
    };

    this._stepEvents.update((events) => [...events, event]);
  }

  /**
   * Type guard to safely access HeadingMetadata properties
   */
  getHeadingMetadata(field: FormField): HeadingMetadata | null {
    if (field.type === FormFieldType.HEADING && field.metadata) {
      return field.metadata as HeadingMetadata;
    }
    return null;
  }

  /**
   * Loads form schema from API using token
   */
  private loadFormSchema(): void {
    this.formRendererService
      .getFormSchema(this.token)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.schema = result.schema;
          this._formSchemaSignal.set(result.schema);
          this.settings = result.settings;
          this._settingsSignal.set(result.settings);
          this.formGroup = this.buildFormGroup(result.schema);
          this.setupConditionalVisibility();
          this.state = { ...this.state, loading: false };

          // Apply theme CSS if available (Story 20.7)
          const themeIdFromSettings = result.settings?.themeId;
          this.applyThemeIfAvailable(result.theme, themeIdFromSettings);

          // Record initial 'view' event for step forms (Story 19.5)
          if (this.isStepFormEnabled()) {
            this.recordStepEvent('view');
          }

          // Initial height calculation after form loads (for all forms)
          setTimeout(() => this.updateHeight(), 100);
        },
        error: (error: FormRenderError) => {
          this.state = {
            ...this.state,
            loading: false,
            error: error.message,
            errorType: error.type,
          };
        },
      });
  }

  /**
   * Builds dynamic FormGroup from schema fields
   * Only includes input fields - display elements (heading, divider, group) are skipped
   */
  private buildFormGroup(schema: FormSchema): FormGroup {
    const group: Record<string, FormControl> = {};
    this.checkboxSelections.clear();

    schema.fields.forEach((field) => {
      // Skip display elements (heading, divider, group) - only add input fields to form
      if (isDisplayElement(field.type)) {
        return;
      }

      const validators = this.buildValidators(field);
      const defaultValue = this.getDefaultValue(field);

      if (field.type === FormFieldType.CHECKBOX && Array.isArray(defaultValue)) {
        // Track multi-select checkbox defaults so we can maintain selections during user interaction
        this.checkboxSelections.set(field.fieldName, [...defaultValue]);
      }

      group[field.fieldName] = new FormControl(defaultValue, validators);
    });

    return this.fb.group(group);
  }

  /**
   * Builds validators array from field configuration
   */
  private buildValidators(field: FormField): any[] {
    const validators: any[] = [];

    if (field.required) {
      validators.push(Validators.required);
    }

    if (field.type === FormFieldType.EMAIL) {
      validators.push(Validators.email);
    }

    if (field.validation) {
      const v = field.validation;

      if (v.minLength !== undefined) {
        validators.push(Validators.minLength(v.minLength));
      }

      if (v.maxLength !== undefined) {
        validators.push(Validators.maxLength(v.maxLength));
      }

      if (v.min !== undefined) {
        validators.push(Validators.min(v.min));
      }

      if (v.max !== undefined) {
        validators.push(Validators.max(v.max));
      }

      if (v.pattern) {
        validators.push(Validators.pattern(v.pattern));
      }
    }

    return validators;
  }

  /**
   * Gets default value for field based on type
   */
  private getDefaultValue(field: FormField): any {
    switch (field.type) {
      case FormFieldType.CHECKBOX:
        // Checkbox fields support both single boolean toggles (no options) and multi-select arrays (with options).
        if (field.options && field.options.length > 0) {
          return this.normalizeCheckboxDefault(field);
        }

        return this.normalizeSingleCheckboxValue(field.defaultValue);
      case FormFieldType.TOGGLE:
        return this.normalizeSingleCheckboxValue(field.defaultValue);
      case FormFieldType.NUMBER:
        return field.defaultValue ?? null;
      default:
        return field.defaultValue ?? '';
    }
  }

  /**
   * Prepares form data for submission by transforming field values.
   * Converts checkbox arrays to comma-separated strings for proper backend storage and analytics display.
   * @returns Prepared submission data with transformed values
   */
  private prepareSubmissionData(): Record<string, any> {
    if (!this.formGroup || !this.schema) {
      return {};
    }

    // Ensure checkbox selection cache reflects latest control values before preparing payload
    this.syncCheckboxSelectionsFromForm();

    const rawValues = this.formGroup.value;
    const preparedValues: Record<string, any> = {};
    console.log('[SUBMIT DEBUG] Raw form values:', rawValues);

    // Transform field values based on field type
    this.schema.fields.forEach((field) => {
      // Skip display elements (they don't have form controls)
      if (isDisplayElement(field.type)) {
        return;
      }

      const value = rawValues[field.fieldName];

      // Handle checkbox fields - always convert arrays to comma-separated strings
      if (field.type === FormFieldType.CHECKBOX) {
        if (field.options && field.options.length > 0) {
          preparedValues[field.fieldName] = this.prepareCheckboxValue(field, value);
        } else {
          preparedValues[field.fieldName] = this.normalizeSingleCheckboxValue(value);
        }
      } else {
        // All other fields: use as-is
        preparedValues[field.fieldName] = value;
      }
    });

    console.log('[SUBMIT DEBUG] Prepared submission data:', preparedValues);
    return preparedValues;
  }

  /**
   * Sets up reactive conditional visibility
   */
  private setupConditionalVisibility(): void {
    if (!this.formGroup || !this.schema) return;

    this.formGroup.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.evaluateConditionalVisibility();
    });

    // Initial evaluation
    this.evaluateConditionalVisibility();
  }

  /**
   * Evaluates all conditional visibility rules and clears hidden field values
   */
  private evaluateConditionalVisibility(): void {
    if (!this.schema || !this.formGroup) return;

    this.schema.fields.forEach((field) => {
      if (!this.isFieldVisible(field)) {
        // Clear value of hidden field
        const control = this.formGroup?.get(field.fieldName);
        if (control && control.value !== null && control.value !== '') {
          control.patchValue(null, { emitEvent: false });
        }
      }
    });
  }

  /**
   * Determines if a field should be visible based on conditional rules
   */
  isFieldVisible(field: FormField): boolean {
    if (!field.conditional || !this.formGroup) {
      return true;
    }

    const watchControl = this.formGroup.get(this.getFieldNameById(field.conditional.watchFieldId));

    if (!watchControl) {
      return true;
    }

    const watchValue = watchControl.value;
    const targetValue = field.conditional.value;

    switch (field.conditional.operator) {
      case 'equals':
        return watchValue === targetValue;
      case 'notEquals':
        return watchValue !== targetValue;
      case 'contains':
        return typeof watchValue === 'string' && watchValue.includes(String(targetValue));
      case 'greaterThan':
        return Number(watchValue) > Number(targetValue);
      case 'lessThan':
        return Number(watchValue) < Number(targetValue);
      default:
        return true;
    }
  }

  /**
   * Gets field name by field ID for conditional logic
   */
  private getFieldNameById(fieldId: string): string {
    const field = this.schema?.fields.find((f) => f.id === fieldId);
    return field?.fieldName || '';
  }

  /**
   * Handles stock availability changes from IMAGE_GALLERY fields with variant metadata (Story 29.11 AC10).
   * Updates stock availability signal to control submit button state.
   *
   * @param available - Stock availability (true: in stock, false: out of stock, null: no variant selected)
   */
  onStockAvailabilityChange(available: boolean | null): void {
    this._stockAvailable.set(available);
  }

  /**
   * Returns fields sorted by order
   */
  getSortedFields(): FormField[] {
    if (!this.schema) return [];
    const fields = this.filterFieldsForCurrentStep(this.schema.fields);
    return [...fields].sort((a, b) => a.order - b.order);
  }

  /**
   * Check if row layout is enabled in form settings
   */
  isRowLayoutEnabled(): boolean {
    return this.settings?.rowLayout?.enabled === true;
  }

  /**
   * Get row configurations from form settings, sorted by order
   */
  getRowConfigs(): RowLayoutConfig[] {
    if (!this.settings?.rowLayout?.enabled || !this.settings.rowLayout.rows) {
      return [];
    }
    // Sort rows by order (ascending)
    const rows = [...this.settings.rowLayout.rows].sort((a, b) => a.order - b.order);
    return this.filterRowsForCurrentStep(rows);
  }

  /**
   * Get all fields in a specific row-column position, sorted by orderInColumn.
   * Supports multi-field columns (Story 14.1).
   * EXCLUDES fields that belong to sub-columns (Story 27.6) - those render separately.
   *
   * @param rowId - The row ID to filter by
   * @param columnIndex - The column index to filter by
   * @returns Array of fields sorted by orderInColumn (ascending), excluding sub-column fields
   */
  getFieldsInColumn(rowId: string, columnIndex: number): FormField[] {
    if (!this.schema?.fields) return [];

    const fieldsForStep = this.filterFieldsForCurrentStep(this.schema.fields);

    return fieldsForStep
      .filter(
        (field) =>
          field.position?.rowId === rowId &&
          field.position?.columnIndex === columnIndex &&
          field.position?.subColumnIndex === undefined, // Exclude sub-column fields
      )
      .sort((a, b) => {
        const orderA = a.position?.orderInColumn ?? 0;
        const orderB = b.position?.orderInColumn ?? 0;
        return orderA - orderB;
      });
  }

  /**
   * Get fields that belong to a specific row-column position (single field - DEPRECATED).
   * This method is kept for backward compatibility but getFieldsInColumn should be used instead.
   * @deprecated Use getFieldsInColumn instead for multi-field column support
   */
  getFieldAtPosition(rowId: string, columnIndex: number): FormField | null {
    const fields = this.getFieldsInColumn(rowId, columnIndex);
    return fields.length > 0 ? fields[0] : null;
  }

  /**
   * Get fields for global layout mode (backward compatibility).
   * When rowLayout is disabled, render all fields in global grid layout mode.
   * Fields are sorted by 'order' property regardless of position data.
   */
  getFieldsWithoutPosition(): FormField[] {
    if (!this.schema) return [];
    const fieldsForStep = this.filterFieldsForCurrentStep(this.schema.fields);
    // Return ALL fields sorted by order (ignore position when rowLayout disabled)
    return fieldsForStep.slice().sort((a, b) => a.order - b.order);
  }

  /**
   * Get array of column indices for rendering row columns
   * @param columnCount - Number of columns in the row
   * @returns Array of column indices [0, 1, 2, ...]
   */
  getColumnIndices(columnCount: number): number[] {
    return Array.from({ length: columnCount }, (_, i) => i);
  }

  /**
   * Get CSS Grid template columns for a row.
   * Uses custom columnWidths if defined, otherwise falls back to equal-width columns.
   *
   * @param row - Row configuration object or column count (for backward compatibility)
   * @returns CSS Grid template columns value (e.g., '1fr 3fr' or 'repeat(2, 1fr)')
   *
   * @example
   * // Row with custom widths
   * getGridColumns({ columnCount: 2, columnWidths: ['1fr', '3fr'] })
   * // Returns: "1fr 3fr"
   *
   * // Row without custom widths (equal width fallback)
   * getGridColumns({ columnCount: 3 })
   * // Returns: "repeat(3, 1fr)"
   *
   * // Backward compatibility: numeric column count
   * getGridColumns(2)
   * // Returns: "repeat(2, 1fr)"
   */
  getGridColumns(row: RowLayoutConfig | number): string {
    // Backward compatibility: accept numeric column count
    if (typeof row === 'number') {
      return `repeat(${row}, 1fr)`;
    }

    // Check for custom column widths
    if (row.columnWidths && row.columnWidths.length === row.columnCount) {
      return row.columnWidths.join(' '); // Custom widths: "1fr 3fr"
    }

    return `repeat(${row.columnCount}, 1fr)`; // Equal width fallback
  }

  /**
   * Get global grid columns for backward compatibility
   * @returns CSS Grid template columns value based on global column layout
   */
  getGlobalGridColumns(): string {
    const columnCount = this.settings?.layout?.columns || 1;
    return `repeat(${columnCount}, 1fr)`;
  }

  /**
   * Check if a column has sub-columns defined (Story 27.6).
   * Sub-columns enable nested column layouts within a parent column.
   *
   * @param rowId - Row identifier
   * @param columnIndex - Parent column index (0-3)
   * @returns True if sub-columns are configured for this column
   */
  hasSubColumns(rowId: string, columnIndex: number): boolean {
    const rows = this.settings?.rowLayout?.rows || [];
    const row = rows.find((r) => r.rowId === rowId);
    return row?.subColumns?.some((sc) => sc.columnIndex === columnIndex) ?? false;
  }

  /**
   * Get sub-column configuration for a specific column (Story 27.6).
   * Returns sub-column count and optional fractional width units.
   *
   * @param rowId - Row identifier
   * @param columnIndex - Parent column index (0-3)
   * @returns Sub-column configuration or undefined if not configured
   */
  getSubColumnConfig(rowId: string, columnIndex: number): any {
    const rows = this.settings?.rowLayout?.rows || [];
    const row = rows.find((r) => r.rowId === rowId);
    return row?.subColumns?.find((sc) => sc.columnIndex === columnIndex);
  }

  /**
   * Get all fields positioned within a specific sub-column (Story 27.6).
   * Fields are sorted by orderInColumn for vertical stacking.
   *
   * @param rowId - Row identifier
   * @param columnIndex - Parent column index
   * @param subColumnIndex - Sub-column index (0-3)
   * @returns Array of fields sorted by orderInColumn
   */
  fieldsForSubColumn(rowId: string, columnIndex: number, subColumnIndex: number): FormField[] {
    if (!this.schema?.fields) return [];

    const fieldsForStep = this.filterFieldsForCurrentStep(this.schema.fields);

    return fieldsForStep
      .filter(
        (field) =>
          field.position?.rowId === rowId &&
          field.position?.columnIndex === columnIndex &&
          field.position?.subColumnIndex === subColumnIndex,
      )
      .sort((a, b) => {
        const orderA = a.position?.orderInColumn ?? 0;
        const orderB = b.position?.orderInColumn ?? 0;
        return orderA - orderB;
      });
  }

  /**
   * Generate CSS Grid template columns for sub-columns (Story 27.6).
   * Uses custom fractional widths if defined, otherwise equal-width fallback.
   *
   * @param rowId - Row identifier
   * @param columnIndex - Parent column index
   * @returns CSS Grid template string (e.g., "1fr 2fr" or "repeat(2, 1fr)")
   */
  subColumnGridTemplate(rowId: string, columnIndex: number): string {
    const config = this.getSubColumnConfig(rowId, columnIndex);
    if (!config) {
      return '1fr'; // Default to single column if no config
    }

    // Check for custom sub-column widths
    if (config.subColumnWidths && config.subColumnWidths.length === config.subColumnCount) {
      return config.subColumnWidths.join(' '); // Custom widths: "1fr 2fr"
    }

    // Equal width fallback
    return `repeat(${config.subColumnCount}, 1fr)`;
  }

  /**
   * Get array of sub-column indexes for template iteration (Story 27.6).
   *
   * @param rowId - Row identifier
   * @param columnIndex - Parent column index
   * @returns Array of sub-column indexes [0, 1, 2, ...] or empty array if no sub-columns
   */
  subColumnIndexes(rowId: string, columnIndex: number): number[] {
    const config = this.getSubColumnConfig(rowId, columnIndex);
    if (!config) return [];
    return Array.from({ length: config.subColumnCount }, (_, i) => i);
  }

  /**
   * Determines if error should be shown for a field
   */
  shouldShowError(fieldName: string): boolean {
    const control = this.formGroup?.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Gets user-friendly error message for field.
   * Story 16.3: If custom error message is defined, it takes precedence for all validation errors.
   * Otherwise, falls back to default error messages.
   */
  getErrorMessage(field: FormField): string {
    const control = this.formGroup?.get(field.fieldName);
    if (!control?.errors) return '';

    const errors = control.errors;
    const customMessage = field.validation?.errorMessage;

    // If custom error message is defined, use it for any validation error (Story 16.3)
    if (customMessage && customMessage.trim() !== '') {
      return customMessage;
    }

    // Otherwise, fall back to default error messages
    if (errors['required']) {
      return 'This field is required';
    }

    if (errors['email']) {
      return 'Invalid email address';
    }

    if (errors['minlength']) {
      return `Minimum length is ${errors['minlength'].requiredLength} characters`;
    }

    if (errors['maxlength']) {
      return `Maximum length is ${errors['maxlength'].requiredLength} characters`;
    }

    if (errors['min']) {
      return `Value must be at least ${errors['min'].min}`;
    }

    if (errors['max']) {
      return `Value must be at most ${errors['max'].max}`;
    }

    if (errors['pattern']) {
      return 'Invalid format';
    }

    return 'Invalid value';
  }

  /**
   * Gets CSS grid class based on column layout
   */
  getGridClass(): string {
    const columns = this.settings?.layout.columns || 1;
    return `grid-cols-${columns}`;
  }

  /**
   * Gets CSS spacing class based on field spacing
   */
  getFieldSpacingClass(): string {
    const spacing = this.settings?.layout.spacing || 'medium';
    return `spacing-${spacing}`;
  }

  /**
   * Determines if form can be submitted
   * Disabled in preview mode (Story 14.3)
   */
  get canSubmit(): boolean {
    return (
      !this.previewMode && !this.isPreview && !!this.formGroup?.valid && !this.state.submitting
    );
  }

  /**
   * Handles form submission
   * Prevents submission in preview mode (Story 14.3)
   * For step forms, validates all steps before submission (Story 19.4)
   * Records step navigation events for analytics (Story 19.5)
   */
  onSubmit(): void {
    // Prevent submission in preview mode (Story 14.3)
    if (this.previewMode || this.isPreview) {
      console.log('Form submission disabled in preview mode');
      return;
    }

    // Record 'submit' event for step forms (Story 19.5)
    if (this.isStepFormEnabled()) {
      this.recordStepEvent('submit');
    }

    // For step forms, validate all steps before submission
    if (this.isStepFormEnabled()) {
      let allStepsValid = true;
      const currentStep = this._currentStepIndex();

      // Validate all steps from 0 to current
      for (let i = 0; i <= currentStep; i++) {
        this._currentStepIndex.set(i);
        if (!this.validateCurrentStep()) {
          allStepsValid = false;
          break;
        }
      }

      // Restore current step index
      this._currentStepIndex.set(currentStep);

      if (!allStepsValid) {
        this.messageService.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: 'Please complete all steps before submitting.',
          life: 5000,
        });
        return;
      }
    }

    // Validate form before submission
    if (!this.formGroup || this.formGroup.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.formGroup?.controls || {}).forEach((key) => {
        this.formGroup?.get(key)?.markAsTouched();
      });
      return;
    }

    // Set submitting state
    this.state = {
      ...this.state,
      submitting: true,
      error: null,
      errorType: null,
    };

    // Prepare submission data with step events (Story 19.5)
    const submissionPayload: any = {
      values: this.prepareSubmissionData(),
    };

    // Include step events in metadata for step forms
    if (this.isStepFormEnabled()) {
      submissionPayload.metadata = {
        stepEvents: this.stepEvents(),
      };
    }

    // Submit form values (with prepared/transformed data and step events)
    this.formRendererService
      .submitForm(this.token, submissionPayload.values, submissionPayload.metadata)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          // Check if response contains quiz results (Story 29.13)
          if (this.isQuizTemplate && isQuizResultMetadata(result.metadata)) {
            const metadata = result.metadata;
            this._quizResults.set(metadata);
            this._showQuizResults.set(true);
            this.state = {
              ...this.state,
              submitting: false,
            };
          } else {
            // Success - show success message
            const successMessage =
              this.settings?.submission?.successMessage ||
              result.message ||
              'Thank you! Your response has been submitted.';

            this.state = {
              ...this.state,
              submitting: false,
              submitted: true,
              submissionMessage: successMessage,
            };

            // Handle redirect if configured
            if (this.settings?.submission?.redirectUrl) {
              setTimeout(() => {
                window.location.href = this.settings!.submission!.redirectUrl!;
              }, 3000);
            }
          }
        },
        error: (error: FormRenderError) => {
          // Error - show error message
          this.state = {
            ...this.state,
            submitting: false,
            error: error.message,
            errorType: error.type,
          };
        },
      });
  }

  /**
   * Resets the form to allow another submission
   */
  submitAnother(): void {
    this.formGroup?.reset();
    this.syncCheckboxSelectionsFromForm();
    this.state = {
      ...this.state,
      submitted: false,
      submissionMessage: null,
      error: null,
      errorType: null,
    };
  }

  /**
   * Determine if a background image should be shown
   */
  hasBackgroundImage(): boolean {
    const bg = this.schema?.settings?.background;
    return !!bg && bg.type === 'image' && !!bg.imageUrl;
  }

  /**
   * Get background image metadata from schema settings
   */
  getBackgroundImage(): FormBackgroundSettings | null {
    return this.settings?.background ?? this.schema?.settings?.background ?? null;
  }

  /**
   * Get background styles for the absolute background layer
   */
  getBackgroundLayerStyles(): Record<string, string> {
    const bg = this.getBackgroundImage();
    if (!bg?.imageUrl || bg.type !== 'image') {
      return {};
    }

    const isRepeat = bg.imagePosition === 'repeat';
    const styles: Record<string, string> = {
      'background-image': `url(${bg.imageUrl})`,
      'background-size': isRepeat ? 'auto' : (bg.imagePosition ?? 'cover'),
      'background-position': bg.imageAlignment ?? 'center',
      'background-repeat': isRepeat ? 'repeat' : 'no-repeat',
      'background-attachment': 'fixed',
    };

    if (bg.imageBlur !== undefined && bg.imageBlur > 0) {
      styles['filter'] = `blur(${bg.imageBlur}px)`;
      styles['transform'] = 'scale(1.05)';
      styles['transform-origin'] = 'center';
    }

    return styles;
  }

  /**
   * Get opacity value for background overlay
   */
  getBackgroundOpacity(): number {
    const bg = this.getBackgroundImage();
    return bg?.imageOpacity !== undefined ? bg.imageOpacity / 100 : 1;
  }

  /**
   * Check if background overlay should be shown (when opacity < 100%)
   */
  shouldShowBackgroundOverlay(): boolean {
    const bg = this.getBackgroundImage();
    return !!bg && !!bg.imageUrl && bg.imageOpacity !== undefined && bg.imageOpacity < 100;
  }

  /**
   * Check if TEXT_BLOCK uses multi-paragraph mode
   */
  hasMultipleParagraphs(field: FormField): boolean {
    const metadata = field.metadata as TextBlockMetadata;
    return !!(metadata?.paragraphs && metadata.paragraphs.length > 0);
  }

  /**
   * Get sorted paragraphs for TEXT_BLOCK field
   */
  getTextBlockParagraphs(field: FormField) {
    const metadata = field.metadata as TextBlockMetadata;
    if (!metadata?.paragraphs) return [];
    return [...metadata.paragraphs].sort((a, b) => a.order - b.order);
  }

  /**
   * Get sanitized HTML content for a single paragraph
   * Preserves line breaks within the paragraph content
   */
  getSanitizedParagraphContent(paragraphContent: string): SafeHtml {
    // Convert newlines to HTML breaks/paragraphs before sanitizing
    const htmlContent = this.convertNewlinesToHtml(paragraphContent || '');

    // Sanitize the HTML content
    const sanitized = this.htmlSanitizer.sanitize(htmlContent);

    return this.domSanitizer.bypassSecurityTrustHtml(sanitized);
  }

  /**
   * Convert plain text newlines to HTML paragraph/break tags
   * Double newlines (\n\n) become paragraph breaks, single newlines (\n) become <br> tags
   */
  private convertNewlinesToHtml(content: string): string {
    if (!content) return '';

    // Split by double newlines to identify paragraphs
    const paragraphs = content.split(/\n\n+/);

    // Process each paragraph: trim whitespace and convert single newlines to <br>
    const processedParagraphs = paragraphs
      .map((para) => {
        const trimmed = para.trim();
        if (!trimmed) return '';

        // Convert single newlines to <br> tags within paragraphs
        const withBreaks = trimmed.replace(/\n/g, '<br>');

        // Wrap in <p> tag if not already wrapped in HTML tags
        if (!withBreaks.startsWith('<')) {
          return `<p>${withBreaks}</p>`;
        }

        return withBreaks;
      })
      .filter(Boolean); // Remove empty paragraphs

    return processedParagraphs.join('\n');
  }

  /**
   * Get sanitized HTML content for TEXT_BLOCK field (legacy single content)
   * Preserves line breaks by converting newlines to HTML before sanitizing
   */
  getSanitizedContent(field: FormField): SafeHtml {
    const metadata = field.metadata as TextBlockMetadata;
    const rawContent = metadata?.content || '';

    // Convert newlines to HTML breaks/paragraphs before sanitizing
    const htmlContent = this.convertNewlinesToHtml(rawContent);

    // Sanitize the HTML content
    const sanitized = this.htmlSanitizer.sanitize(htmlContent);

    return this.domSanitizer.bypassSecurityTrustHtml(sanitized);
  }

  /**
   * Check if TEXT_BLOCK content is long (> 500 words)
   */
  isTextBlockLong(field: FormField): boolean {
    const metadata = field.metadata as TextBlockMetadata;
    return this.htmlSanitizer.isContentLong(metadata?.content || '', 500);
  }

  /**
   * Check if TEXT_BLOCK is currently collapsed
   */
  isTextBlockCollapsed(fieldId: string): boolean {
    return this.collapsedTextBlocks.has(fieldId);
  }

  /**
   * Toggle TEXT_BLOCK collapsed state
   */
  toggleTextBlockCollapse(fieldId: string): void {
    if (this.collapsedTextBlocks.has(fieldId)) {
      this.collapsedTextBlocks.delete(fieldId);
    } else {
      this.collapsedTextBlocks.add(fieldId);
    }
  }

  /**
   * Parse custom CSS string from field metadata into Angular style object.
   * Converts CSS string (e.g., "color: red; padding: 10px") to object {color: 'red', padding: '10px'}
   * Returns empty object if no custom style is defined.
   * Story 16.2: Universal Custom CSS Support
   *
   * @param field - The form field containing potential customStyle metadata
   * @returns Style object for ngStyle binding
   */
  getFieldCustomStyles(field: FormField): Record<string, string> {
    const customStyle = (field.metadata as any)?.customStyle;
    if (!customStyle || typeof customStyle !== 'string') {
      return {};
    }

    const styles: Record<string, string> = {};

    // Parse CSS string: split by semicolons, then split each rule by colon
    customStyle.split(';').forEach((rule) => {
      const colonIndex = rule.indexOf(':');
      if (colonIndex === -1) return; // Skip malformed rules

      const property = rule.substring(0, colonIndex).trim();
      const value = rule.substring(colonIndex + 1).trim();

      if (property && value) {
        // Convert kebab-case CSS property to camelCase for Angular style binding
        const camelCaseProperty = property.replace(/-([a-z])/g, (_, letter) =>
          letter.toUpperCase(),
        );
        styles[camelCaseProperty] = value;
      }
    });

    return styles;
  }

  /**
   * Handles checkbox change event for checkbox groups.
   * Updates form control value with array of selected checkbox values.
   *
   * @param event - The checkbox change event
   * @param fieldName - The form field name
   * @param value - The checkbox option value
   */
  onCheckboxChange(event: Event, fieldName: string, value: string | number): void {
    const target = event.target as HTMLInputElement;
    const control = this.formGroup?.get(fieldName);

    if (!control) return;

    let valueUpdated = false;

    // Multi-select checkbox groups are tracked via checkboxSelections map
    if (this.checkboxSelections.has(fieldName)) {
      const currentSelections = this.checkboxSelections.get(fieldName) ?? [];
      const normalizedValue = String(value);

      let updatedSelections: string[] | null = null;

      if (target.checked) {
        if (!currentSelections.includes(normalizedValue)) {
          updatedSelections = [...currentSelections, normalizedValue];
        }
      } else if (currentSelections.includes(normalizedValue)) {
        updatedSelections = currentSelections.filter((selection) => selection !== normalizedValue);
      }

      if (updatedSelections !== null) {
        this.checkboxSelections.set(fieldName, updatedSelections);
        control.setValue([...updatedSelections]);
        valueUpdated = true;
      }
    } else {
      // Fallback for legacy single checkbox fields without options
      const normalized = this.normalizeSingleCheckboxValue(target.checked);
      if (control.value !== normalized) {
        control.setValue(normalized);
        valueUpdated = true;
      }
    }

    control.markAsTouched();

    if (valueUpdated) {
      control.markAsDirty();
      control.updateValueAndValidity({ emitEvent: true });
    }
  }

  /**
   * Determine if a checkbox option should be rendered as selected.
   * Falls back to checking the form control value directly when selections map is empty.
   * @param fieldName - The checkbox field name
   * @param optionValue - The option value to check
   */
  isCheckboxOptionSelected(fieldName: string, optionValue: string | number): boolean {
    const selections = this.checkboxSelections.get(fieldName);
    const normalizedOption = String(optionValue);

    if (selections) {
      return selections.includes(normalizedOption);
    }

    const controlValue = this.formGroup?.get(fieldName)?.value;

    if (Array.isArray(controlValue)) {
      return controlValue.map(String).includes(normalizedOption);
    }

    if (typeof controlValue === 'string') {
      return controlValue
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .includes(normalizedOption);
    }

    return controlValue === normalizedOption;
  }

  /**
   * Normalize default selections for checkbox groups to an array of valid option values.
   * @param field - Checkbox field definition
   */
  private normalizeCheckboxDefault(field: FormField): string[] {
    if (!field.options || field.options.length === 0) {
      return [];
    }

    const validValues = new Set(field.options.map((option) => String(option.value)));
    const rawDefault = field.defaultValue;

    if (rawDefault == null) {
      return [];
    }

    const parsedValues: string[] = Array.isArray(rawDefault)
      ? rawDefault.map((value) => String(value))
      : typeof rawDefault === 'string'
        ? rawDefault
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : [String(rawDefault)];

    return parsedValues.filter((value) => validValues.has(value));
  }

  /**
   * Prepare checkbox field values for submission by converting selected options to comma-separated value string.
   * Ensures only valid option values are included.
   * @param field - Checkbox field definition
   * @param rawValue - Current form control value
   */
  private prepareCheckboxValue(field: FormField, rawValue: unknown): string {
    const validValues = new Set((field.options || []).map((option) => String(option.value)));
    const trackedSelections = this.checkboxSelections.get(field.fieldName) ?? null;

    let selections: string[] = [];

    if (Array.isArray(rawValue)) {
      selections = rawValue.map((value) => String(value));
    } else if (typeof rawValue === 'string' && rawValue.trim() !== '') {
      selections = rawValue
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => String(value));
    } else if (trackedSelections) {
      selections = [...trackedSelections];
    }

    const uniqueValidSelections = Array.from(new Set(selections)).filter((value) =>
      validValues.size > 0 ? validValues.has(value) : true,
    );

    if (uniqueValidSelections.length === 0) {
      return '';
    }

    return uniqueValidSelections.join(',');
  }

  /**
   * Normalize legacy single checkbox values to a strict boolean.
   * Accepts truthy string/number representations to maintain compatibility with older schemas.
   */
  private normalizeSingleCheckboxValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return ['true', '1', 'yes', 'on'].includes(normalized);
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return Boolean(value);
  }

  /**
   * Filters provided fields by the currently active step when step form mode is enabled.
   * Fields without a step assignment fall back to the first step for backward compatibility.
   */
  private filterFieldsForCurrentStep(fields: FormField[]): FormField[] {
    if (!this.isStepFormEnabled()) {
      return fields;
    }

    const currentStep = this.currentStep();
    if (!currentStep) {
      return [];
    }

    return fields.filter((field) => {
      const fieldStepId = field.position?.stepId;
      if (!fieldStepId) {
        return this._currentStepIndex() === 0;
      }
      return fieldStepId === currentStep.id;
    });
  }

  /**
   * Filters row configurations to only those that belong to the active step.
   * Rows without a step assignment are treated as part of the first step (legacy fallback).
   */
  private filterRowsForCurrentStep(rows: RowLayoutConfig[]): RowLayoutConfig[] {
    if (!this.isStepFormEnabled()) {
      return rows;
    }

    const currentStep = this.currentStep();
    if (!currentStep) {
      return [];
    }

    return rows.filter((row) => {
      if (!row.stepId) {
        return this._currentStepIndex() === 0;
      }
      return row.stepId === currentStep.id;
    });
  }

  /**
   * Synchronize internal checkbox selections map with current FormGroup values.
   * Useful after operations like reset() where Angular updates control values directly.
   */
  private syncCheckboxSelectionsFromForm(): void {
    if (!this.formGroup || !this.schema) {
      return;
    }

    this.checkboxSelections.clear();

    this.schema.fields
      .filter(
        (field) =>
          field.type === FormFieldType.CHECKBOX && field.options && field.options.length > 0,
      )
      .forEach((field) => {
        const controlValue = this.formGroup?.get(field.fieldName)?.value;

        if (Array.isArray(controlValue)) {
          this.checkboxSelections.set(
            field.fieldName,
            controlValue.map((value) => String(value)),
          );
        } else if (typeof controlValue === 'string' && controlValue.trim() !== '') {
          const values = controlValue
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) => String(value));

          this.checkboxSelections.set(field.fieldName, values);
        } else {
          this.checkboxSelections.set(field.fieldName, []);
        }
      });
  }
}
