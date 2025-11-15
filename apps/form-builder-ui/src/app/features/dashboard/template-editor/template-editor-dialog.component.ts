import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  input,
  output,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormControlStatus,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Dialog } from 'primeng/dialog';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { FileUpload } from 'primeng/fileupload';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Checkbox } from 'primeng/checkbox';
import { StepperModule } from 'primeng/stepper';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  FormTemplate,
  TemplateCategory,
  TemplateBusinessLogicConfig,
  CreateFormTemplateRequest,
  FormSchema,
  QuizScoringRule,
  FormField,
  FormFieldType,
} from '@nodeangularfullstack/shared';
import { TemplatesApiService } from '../templates-api.service';

/**
 * Dropdown option interface for PrimeNG dropdowns
 */
interface DropdownOption {
  label: string;
  value: string;
}

interface QuizConfigFormState {
  questionField: string;
  answerField: string;
  passingScore: number;
  showResults: boolean;
  scoringRules: QuizScoringRule[];
}

/**
 * Admin Template Editor Dialog Component
 *
 * Comprehensive template editor allowing admins to define template schemas and business logic.
 * Supports both create and edit modes with real-time validation.
 *
 * **Features:**
 * - Metadata form (name, description, category)
 * - Preview image upload to Digital Ocean Spaces
 * - JSON schema editing with validation
 * - Dynamic business logic configuration based on category
 * - Real-time preview integration
 * - Unsaved changes confirmation
 *
 * **Modes:**
 * - Create: Empty form for new template creation
 * - Edit: Pre-populated form for editing existing template
 *
 * **Inputs:**
 * @Input() visible - Controls dialog visibility
 * @Input() mode - 'create' or 'edit'
 * @Input() templateId - Template ID for edit mode
 *
 * **Outputs:**
 * @Output() visibleChange - Emits when dialog visibility changes
 * @Output() saved - Emits when template is successfully saved
 *
 * @example
 * ```html
 * <app-template-editor-dialog
 *   [(visible)]="showEditor"
 *   [mode]="editorMode"
 *   [templateId]="selectedTemplateId"
 *   (saved)="handleEditorSave()"
 * />
 * ```
 */
@Component({
  selector: 'app-template-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    Dialog,
    ButtonDirective,
    InputText,
    Textarea,
    FileUpload,
    ProgressSpinner,
    Toast,
    ConfirmDialog,
    Checkbox,
    StepperModule,
  ],
  providers: [ConfirmationService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-editor-dialog.component.html',
  styleUrls: ['./template-editor-dialog.component.scss'],
})
export class TemplateEditorDialogComponent {
  // Injected services
  private readonly fb = inject(FormBuilder);
  private readonly templatesApiService = inject(TemplatesApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  // Inputs
  readonly visible = input.required<boolean>();
  readonly mode = input.required<'create' | 'edit'>();
  readonly templateId = input<string | null>(null);

  // Outputs
  readonly visibleChange = output<boolean>();
  readonly saved = output();

  // Internal state for dialog visibility
  protected readonly visibleSignal = signal(false);

  // State signals
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly defaultSchema = '{\n  "fields": [],\n  "settings": {}\n}';
  protected readonly schemaErrors = signal<string[]>([]);
  protected readonly selectedImage = signal<File | null>(null);
  private initialSchemaJson = this.defaultSchema;

  // Wizard state
  protected readonly currentStep = signal(0);
  protected readonly viewMode = signal<'json' | 'fields'>('json'); // For Step 2: toggle between JSON and field editor
  protected readonly parsedFields = signal<FormField[]>([]); // Parsed fields from JSON for field editor
  protected readonly screenshotFile = signal<File | null>(null); // Screenshot for Step 4

  // Field editor stepper state
  protected readonly currentFieldIndex = signal(0); // Current field being edited in the stepper
  protected readonly totalFields = computed(() => this.parsedFields().length);
  protected readonly currentField = computed(() => this.parsedFields()[this.currentFieldIndex()]);
  protected readonly hasNextField = computed(() => this.currentFieldIndex() < this.totalFields() - 1);
  protected readonly hasPreviousField = computed(() => this.currentFieldIndex() > 0);

  // Category options for dropdown
  protected readonly categoryOptions: DropdownOption[] = [
    { label: 'E-commerce', value: TemplateCategory.ECOMMERCE },
    { label: 'Services', value: TemplateCategory.SERVICES },
    { label: 'Data Collection', value: TemplateCategory.DATA_COLLECTION },
    { label: 'Events', value: TemplateCategory.EVENTS },
    { label: 'Quiz', value: TemplateCategory.QUIZ },
    { label: 'Polls', value: TemplateCategory.POLLS },
  ];

  // Reactive form for metadata
  protected readonly templateForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    category: ['', Validators.required],
    preview_image_url: [''],
    schema: [this.defaultSchema, Validators.required],
  });

  private readonly formStatus = signal<FormControlStatus>(
    this.templateForm.status as FormControlStatus,
  );

  // Signal to track form value changes for reactivity
  private readonly formValueChanged = signal<number>(0);

  // Business logic configuration signals (category-specific)
  protected readonly inventoryConfig = signal({
    stockField: '',
    decrementOnSubmit: false,
  });

  protected readonly appointmentConfig = signal({
    timeSlotField: '',
    dateField: '',
    maxBookingsPerSlot: 1,
  });

  protected readonly quizConfig = signal<QuizConfigFormState>({
    questionField: '',
    answerField: '',
    passingScore: 70,
    showResults: true,
    scoringRules: [],
  });

  protected readonly pollConfig = signal({
    pollQuestionField: '',
    optionsField: '',
    preventDuplicates: true,
    showResultsAfterVote: true,
  });

  // Convenience getters for form controls
  get nameControl(): ReturnType<typeof this.templateForm.get> {
    return this.templateForm.get('name');
  }
  get descriptionControl(): ReturnType<typeof this.templateForm.get> {
    return this.templateForm.get('description');
  }
  get categoryControl(): ReturnType<typeof this.templateForm.get> {
    return this.templateForm.get('category');
  }
  get schemaControl(): FormControl<string | null> {
    return this.templateForm.get('schema') as FormControl<string | null>;
  }

  // Computed signals
  protected readonly formDirty = computed(
    () => this.templateForm.dirty || (this.schemaControl.value ?? '') !== this.initialSchemaJson,
  );

  protected readonly canSave = computed(
    () => this.formStatus() === 'VALID' && this.schemaErrors().length === 0 && !this.saving(),
  );

  // Debug signals to show validation state
  protected readonly debugFormValid = computed(() => this.formStatus() === 'VALID');
  protected readonly debugSchemaErrors = computed(() => this.schemaErrors().length);
  protected readonly debugSaving = computed(() => this.saving());

  protected readonly dialogHeader = computed(() =>
    this.mode() === 'create' ? 'Create Template' : 'Edit Template',
  );

  protected readonly saveButtonLabel = computed(() =>
    this.mode() === 'create' ? 'Create Template' : 'Save Changes',
  );

  // Wizard step validation computed signals

  // Step 0: Category Selection
  protected readonly canProceedFromStep0 = computed(() => {
    // Trigger reactivity
    this.formValueChanged();

    // Check if category is selected
    const categoryValue = this.templateForm.get('category')?.value;
    return categoryValue && typeof categoryValue === 'string' && categoryValue.trim().length > 0;
  });

  // Step 1: Basic Info (name, description)
  protected readonly canProceedFromStep1 = computed(() => {
    // Trigger reactivity by accessing form value changes
    this.formValueChanged();

    // Check if controls exist and have values
    const nameValue = this.templateForm.get('name')?.value;
    const descValue = this.templateForm.get('description')?.value;

    const nameValid = nameValue && typeof nameValue === 'string' && nameValue.trim().length > 0;
    const descValid = descValue && typeof descValue === 'string' && descValue.trim().length > 0;

    return !!(nameValid && descValid);
  });

  // Step 2: Schema & Fields
  protected readonly canProceedFromStep2 = computed(() => {
    return this.schemaErrors().length === 0 && !!this.schemaControl.value;
  });

  // Step 3: Category-Specific Business Logic
  // No validation required - business logic is optional
  protected readonly canProceedFromStep3 = computed(() => {
    return true; // Always allow proceeding from business logic step
  });

  protected readonly isLastStep = computed(() => this.currentStep() === 4);

  protected readonly isFirstStep = computed(() => this.currentStep() === 0);

  /**
   * Get available fields from schema for field mapping
   */
  protected readonly availableFields = computed(() => {
    // Trigger reactivity
    this.formValueChanged();

    try {
      const schemaValue = this.schemaControl.value ?? '';
      if (!schemaValue) return [];

      const schema = JSON.parse(schemaValue);
      if (!schema.fields || !Array.isArray(schema.fields)) return [];

      return schema.fields.map((field: FormField) => ({
        label: `${field.label} (${field.fieldName})`,
        value: field.fieldName,
        type: field.type,
        fieldName: field.fieldName,
      }));
    } catch (e) {
      return [];
    }
  });

  /**
   * Get fields filtered by type
   */
  protected getFieldsByType(type: FormFieldType | FormFieldType[]): any[] {
    const fields = this.availableFields();
    const types = Array.isArray(type) ? type : [type];
    return fields.filter((f: any) => types.includes(f.type as FormFieldType));
  }

  /**
   * Get all quiz question fields (fields with options like radio, select, dropdown, checkbox)
   */
  protected readonly quizQuestions = computed(() => {
    this.formValueChanged();

    try {
      const schemaValue = this.schemaControl.value ?? '';
      if (!schemaValue) return [];

      const schema = JSON.parse(schemaValue);
      if (!schema.fields || !Array.isArray(schema.fields)) return [];

      // Filter fields that have options (quiz questions)
      const questionTypes = ['radio', 'select', 'dropdown', 'checkbox'];
      return schema.fields.filter(
        (field: FormField) => questionTypes.includes(field.type) && field.options && field.options.length > 0,
      );
    } catch (e) {
      return [];
    }
  });

  /**
   * List form control names that are currently invalid.
   * Helpful for debugging validation state in the UI.
   */
  protected getInvalidControls(): string[] {
    const invalidControls = Object.entries(this.templateForm.controls)
      .filter(([, control]) => control.invalid)
      .map(([name]) => name);

    if (this.templateForm.errors) {
      invalidControls.push('(form)');
    }

    return invalidControls;
  }

  /**
   * Current reactive form status (VALID, INVALID, PENDING, DISABLED)
   */
  protected getFormStatus(): FormControlStatus {
    return this.formStatus();
  }

  /**
   * Extract current form-level validation errors (if any).
   */
  protected getFormErrors(): string[] {
    const errors = this.templateForm.errors;
    if (!errors) {
      return [];
    }

    return Object.keys(errors);
  }

  /**
   * Navigate to next step
   */
  protected nextStep(): void {
    if (this.currentStep() < 4) {
      this.currentStep.set(this.currentStep() + 1);
    }
  }

  /**
   * Navigate to previous step
   */
  protected previousStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  /**
   * Navigate to specific step
   */
  protected goToStep(step: number): void {
    if (step >= 0 && step <= 4) {
      this.currentStep.set(step);
    }
  }

  /**
   * Navigate to next field in the field editor stepper
   */
  protected nextField(): void {
    if (this.hasNextField()) {
      this.currentFieldIndex.update(idx => idx + 1);
    }
  }

  /**
   * Navigate to previous field in the field editor stepper
   */
  protected previousField(): void {
    if (this.hasPreviousField()) {
      this.currentFieldIndex.update(idx => idx - 1);
    }
  }

  /**
   * Navigate to specific field in the field editor stepper
   */
  protected goToField(index: number): void {
    if (index >= 0 && index < this.totalFields()) {
      this.currentFieldIndex.set(index);
    }
  }

  /**
   * Toggle between JSON and field editor view (Step 2)
   */
  protected toggleViewMode(): void {
    if (this.viewMode() === 'json') {
      // Parse JSON and show fields
      this.parseJsonToFields();
      this.currentFieldIndex.set(0); // Reset to first field
      this.viewMode.set('fields');
    } else {
      // Convert fields back to JSON and show JSON
      this.convertFieldsToJson();
      this.viewMode.set('json');
    }
  }

  /**
   * Parse JSON schema to field editor format
   */
  private parseJsonToFields(): void {
    const schemaValue = this.schemaControl.value ?? '';
    try {
      const schema = JSON.parse(schemaValue);
      if (schema.fields && Array.isArray(schema.fields)) {
        this.parsedFields.set(schema.fields);
      }
    } catch (e) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Invalid JSON. Please fix errors before switching to field editor.',
        life: 5000,
      });
    }
  }

  /**
   * Convert field editor data back to JSON
   */
  private convertFieldsToJson(): void {
    try {
      const schemaValue = this.schemaControl.value ?? '';
      const schema = JSON.parse(schemaValue);
      schema.fields = this.parsedFields();
      const updatedJson = JSON.stringify(schema, null, 2);
      this.templateForm.patchValue({ schema: updatedJson });
    } catch (e) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to convert fields to JSON',
        life: 5000,
      });
    }
  }

  /**
   * Update a specific field property in field editor
   */
  protected updateFieldProperty(fieldIndex: number, property: keyof FormField, value: any): void {
    const fields = [...this.parsedFields()];
    fields[fieldIndex] = { ...fields[fieldIndex], [property]: value };
    this.parsedFields.set(fields);
  }

  /**
   * Check if a field type supports options (radio, select, dropdown, checkbox)
   */
  protected fieldHasOptions(fieldType: string): boolean {
    const optionFieldTypes = ['radio', 'select', 'dropdown', 'checkbox'];
    return optionFieldTypes.includes(fieldType);
  }

  /**
   * Add a new option to a field
   */
  protected addFieldOption(fieldIndex: number): void {
    const fields = [...this.parsedFields()];
    const field = fields[fieldIndex];

    // Initialize options array if it doesn't exist
    if (!field.options) {
      field.options = [];
    }

    // Add new option
    const newOption = {
      label: `Option ${field.options.length + 1}`,
      value: `option_${field.options.length + 1}`,
    };

    field.options = [...field.options, newOption];
    this.parsedFields.set(fields);
  }

  /**
   * Update a specific option property
   */
  protected updateFieldOptionProperty(
    fieldIndex: number,
    optionIndex: number,
    property: 'label' | 'value',
    value: string,
  ): void {
    const fields = [...this.parsedFields()];
    const field = fields[fieldIndex];

    if (field.options && field.options[optionIndex]) {
      const updatedOptions = [...field.options];
      updatedOptions[optionIndex] = {
        ...updatedOptions[optionIndex],
        [property]: value,
      };
      field.options = updatedOptions;
      this.parsedFields.set(fields);
    }
  }

  /**
   * Remove an option from a field
   */
  protected removeFieldOption(fieldIndex: number, optionIndex: number): void {
    const fields = [...this.parsedFields()];
    const field = fields[fieldIndex];

    if (field.options && field.options.length > 1) {
      field.options = field.options.filter((_: any, idx: number) => idx !== optionIndex);
      this.parsedFields.set(fields);
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'At least one option is required for this field type',
        life: 3000,
      });
    }
  }

  /**
   * Get scoring rule for a quiz question (or create default)
   */
  protected getScoringRuleForQuestion(fieldId: string): QuizScoringRule {
    const existingRule = this.quizConfig().scoringRules.find((rule) => rule.fieldId === fieldId);
    return (
      existingRule || {
        fieldId,
        correctAnswer: '',
        points: 1,
      }
    );
  }

  /**
   * Update points for a quiz question
   */
  protected updateQuizQuestionPoints(fieldId: string, points: number): void {
    const config = this.quizConfig();
    const existingRuleIndex = config.scoringRules.findIndex((rule) => rule.fieldId === fieldId);

    if (existingRuleIndex >= 0) {
      // Update existing rule
      const updatedRules = [...config.scoringRules];
      updatedRules[existingRuleIndex] = {
        ...updatedRules[existingRuleIndex],
        points,
      };
      this.quizConfig.set({ ...config, scoringRules: updatedRules });
    } else {
      // Create new rule
      const newRule: QuizScoringRule = {
        fieldId,
        correctAnswer: '',
        points,
      };
      this.quizConfig.set({ ...config, scoringRules: [...config.scoringRules, newRule] });
    }
  }

  /**
   * Update correct answer for a quiz question
   */
  protected updateQuizQuestionCorrectAnswer(fieldId: string, correctAnswer: string): void {
    const config = this.quizConfig();
    const existingRuleIndex = config.scoringRules.findIndex((rule) => rule.fieldId === fieldId);

    if (existingRuleIndex >= 0) {
      // Update existing rule
      const updatedRules = [...config.scoringRules];
      updatedRules[existingRuleIndex] = {
        ...updatedRules[existingRuleIndex],
        correctAnswer,
      };
      this.quizConfig.set({ ...config, scoringRules: updatedRules });
    } else {
      // Create new rule
      const newRule: QuizScoringRule = {
        fieldId,
        correctAnswer,
        points: 1,
      };
      this.quizConfig.set({ ...config, scoringRules: [...config.scoringRules, newRule] });
    }
  }

  /**
   * Handle screenshot file selection for Step 4
   */
  protected onScreenshotSelect(event: any): void {
    const file = event.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5242880) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Screenshot size exceeds 5MB limit',
          life: 5000,
        });
        return;
      }

      this.screenshotFile.set(file);
    }
  }

  /**
   * Remove selected screenshot
   */
  protected removeScreenshot(): void {
    this.screenshotFile.set(null);
  }

  /**
   * Get category label by value
   */
  protected getCategoryLabel(value: string | null | undefined): string {
    if (!value) return 'N/A';
    const option = this.categoryOptions.find((c) => c.value === value);
    return option?.label || 'N/A';
  }

  // Effects to sync visible input with internal signal
  constructor() {
    effect(() => {
      this.visibleSignal.set(this.visible());
    });

    this.templateForm.statusChanges.pipe(takeUntilDestroyed()).subscribe((status) => {
      this.formStatus.set(status as FormControlStatus);
    });

    // Subscribe to form value changes to trigger reactivity in computed signals
    this.templateForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.formValueChanged.update((v) => v + 1);
    });

    this.schemaControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.validateSchema(value ?? '');
    });

    this.validateSchema(this.schemaControl.value ?? this.defaultSchema);

    effect(() => {
      if (this.visible() && this.mode() === 'edit' && this.templateId()) {
        this.loadTemplateData();
      } else if (this.visible() && this.mode() === 'create') {
        this.resetForm();
        // Validate initial schema
        this.validateSchema();
      }
    });
  }

  /**
   * Load template data in edit mode
   * @protected
   */
  protected loadTemplateData(): void {
    const id = this.templateId();
    if (!id) return;

    this.loading.set(true);
    this.error.set(null);

    this.templatesApiService.getTemplateById(id).subscribe({
      next: (template: FormTemplate) => {
        // Populate form
        this.templateForm.patchValue({
          name: template.name,
          description: template.description,
          category: template.category,
          preview_image_url: template.previewImageUrl,
        });

        // Load schema into Monaco Editor (only fields and settings)
        const simplifiedSchema = {
          fields: template.templateSchema.fields,
          settings: template.templateSchema.settings
        };
        const schemaJson = JSON.stringify(simplifiedSchema, null, 2);
        this.templateForm.patchValue({ schema: schemaJson });
        this.initialSchemaJson = schemaJson;

        // Load business logic config
        this.loadBusinessLogicConfig(template.businessLogicConfig);

        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load template data',
          life: 5000,
        });
      },
    });
  }

  /**
   * Load business logic configuration into form
   * @private
   */
  private loadBusinessLogicConfig(config?: TemplateBusinessLogicConfig): void {
    if (!config) return;

    switch (config.type) {
      case 'inventory':
        this.inventoryConfig.set({
          stockField: config.stockField,
          decrementOnSubmit: config.decrementOnSubmit,
        });
        break;
      case 'appointment':
        this.appointmentConfig.set({
          timeSlotField: config.timeSlotField,
          dateField: config.dateField || '',
          maxBookingsPerSlot: config.maxBookingsPerSlot,
        });
        break;
      case 'quiz':
        this.quizConfig.set({
          questionField: config.questionField || '',
          answerField: config.answerField || '',
          passingScore: config.passingScore ?? 70,
          showResults: config.showResults ?? true,
          scoringRules: config.scoringRules?.map((rule) => ({ ...rule })) ?? [],
        });
        break;
      case 'poll':
        this.pollConfig.set({
          pollQuestionField: config.pollQuestionField || '',
          optionsField: config.optionsField || '',
          preventDuplicates: config.preventDuplicates,
          showResultsAfterVote: config.showResultsAfterVote,
        });
        break;
    }
  }

  /**
   * Validate JSON schema
   * Checks for valid JSON syntax, required fields, and size limit
   */
  protected validateSchema(schemaValue?: string): void {
    const json = schemaValue ?? this.schemaControl.value ?? '';
    const errors: string[] = [];

    // 1. Valid JSON syntax
    let schema: any;
    try {
      schema = JSON.parse(json);
    } catch (e) {
      errors.push('Invalid JSON syntax');
      this.schemaErrors.set(errors);
      return;
    }

    // 2. Must have fields array
    if (!schema.fields || !Array.isArray(schema.fields)) {
      errors.push('Schema must have a "fields" array');
    }

    // 3. Each field must have required properties
    if (schema.fields) {
      schema.fields.forEach((field: any, index: number) => {
        if (!field.id) errors.push(`Field ${index + 1} missing "id"`);
        if (!field.type) errors.push(`Field ${index + 1} missing "type"`);
        if (!field.fieldName) errors.push(`Field ${index + 1} missing "fieldName"`);
        if (!field.label) errors.push(`Field ${index + 1} missing "label"`);
      });
    }

    // 4. Size limit check (100KB)
    const sizeBytes = new Blob([json]).size;
    if (sizeBytes > 102400) {
      errors.push(`Schema size (${(sizeBytes / 1024).toFixed(1)}KB) exceeds 100KB limit`);
    }

    this.schemaErrors.set(errors);
  }

  /**
   * Handle file selection for preview image
   */
  protected onFileSelect(event: any): void {
    const file = event.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5242880) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'File size exceeds 5MB limit',
          life: 5000,
        });
        return;
      }

      this.selectedImage.set(file);
    }
  }

  /**
   * Remove selected preview image
   */
  protected removeImage(): void {
    this.selectedImage.set(null);
    this.templateForm.patchValue({ preview_image_url: '' });
  }

  /**
   * Handle preview button click
   */
  protected handlePreview(): void {
    // Validate schema before preview
    this.validateSchema();
    if (this.schemaErrors().length > 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fix schema errors before preview',
        life: 5000,
      });
      return;
    }

    // TODO: Open template preview modal (Story 29.7)
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: 'Template preview will be integrated from Story 29.7',
      life: 3000,
    });
  }

  /**
   * Handle save button click
   */
  protected handleSave(): void {
    // Validate form and schema
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields',
        life: 5000,
      });
      return;
    }

    this.validateSchema();
    if (this.schemaErrors().length > 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fix schema errors before saving',
        life: 5000,
      });
      return;
    }

    // Parse schema
    let templateSchema: FormSchema;
    const schemaValue = this.schemaControl.value ?? '';
    try {
      templateSchema = JSON.parse(schemaValue);
    } catch (e) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Invalid JSON schema',
        life: 5000,
      });
      return;
    }

    // Build template data
    const formValue = this.templateForm.value;
    const businessLogicConfig = this.getBusinessLogicConfig();

    // Inject category into schema (both root and settings.templateCategory)
    const selectedCategory = formValue.category as TemplateCategory;
    templateSchema.category = selectedCategory;

    // Add templateCategory to settings if settings exists, otherwise let backend handle it
    if (templateSchema.settings) {
      templateSchema.settings.templateCategory = selectedCategory;
    } else {
      // Initialize settings with templateCategory and minimal required properties
      (templateSchema as any).settings = {
        templateCategory: selectedCategory,
      };
    }

    const templateData: CreateFormTemplateRequest = {
      name: formValue.name,
      description: formValue.description,
      category: formValue.category,
      // Only include previewImageUrl if it has a value
      ...(formValue.preview_image_url && formValue.preview_image_url.trim()
        ? { previewImageUrl: formValue.preview_image_url }
        : {}),
      templateSchema,
      // Only include businessLogicConfig if it's defined
      ...(businessLogicConfig ? { businessLogicConfig } : {}),
    };

    this.saving.set(true);

    // Call appropriate API method based on mode
    const apiCall =
      this.mode() === 'create'
        ? this.templatesApiService.createTemplate(templateData)
        : this.templatesApiService.updateTemplate(this.templateId()!, templateData);

    apiCall.subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Template ${this.mode() === 'create' ? 'created' : 'updated'} successfully`,
          life: 3000,
        });
        this.saved.emit();
        this.closeDialog();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.message || 'Failed to save template',
          life: 5000,
        });
      },
    });
  }

  /**
   * Get business logic configuration based on category
   * Returns undefined if required fields are not configured to allow templates
   * to be created without complete business logic setup
   * @private
   */
  private getBusinessLogicConfig(): TemplateBusinessLogicConfig | undefined {
    const category = this.categoryControl?.value;

    switch (category) {
      case TemplateCategory.ECOMMERCE:
        // Inventory config requires stockField at minimum
        if (!this.inventoryConfig().stockField) {
          return undefined;
        }
        return {
          type: 'inventory',
          stockField: this.inventoryConfig().stockField,
          variantField: '',
          quantityField: '',
          stockTable: 'inventory',
          decrementOnSubmit: this.inventoryConfig().decrementOnSubmit,
        };
      case TemplateCategory.SERVICES:
        // Appointment config requires timeSlotField and dateField at minimum
        if (!this.appointmentConfig().timeSlotField || !this.appointmentConfig().dateField) {
          return undefined;
        }
        return {
          type: 'appointment',
          timeSlotField: this.appointmentConfig().timeSlotField,
          dateField: this.appointmentConfig().dateField,
          maxBookingsPerSlot: this.appointmentConfig().maxBookingsPerSlot,
          bookingsTable: 'appointment_bookings',
        };
      case TemplateCategory.QUIZ:
        // Quiz config requires at least one scoring rule
        if (!this.quizConfig().scoringRules || this.quizConfig().scoringRules.length === 0) {
          return undefined;
        }
        return {
          type: 'quiz',
          scoringRules: this.quizConfig().scoringRules.map((rule) => ({ ...rule })),
          passingScore: this.quizConfig().passingScore,
          showResults: this.quizConfig().showResults,
        };
      case TemplateCategory.POLLS:
        // Poll config requires voteField to be specified
        // Since we don't have UI for this yet, return undefined
        return undefined;
      default:
        return undefined;
    }
  }

  /**
   * Handle cancel button click
   */
  protected handleCancel(): void {
    if (this.formDirty()) {
      this.confirmationService.confirm({
        message: 'You have unsaved changes. Are you sure you want to close?',
        header: 'Unsaved Changes',
        icon: 'pi pi-exclamation-triangle',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => {
          this.closeDialog();
        },
      });
    } else {
      this.closeDialog();
    }
  }

  /**
   * Handle dialog close event
   */
  protected handleDialogClose(): void {
    if (this.formDirty()) {
      this.confirmationService.confirm({
        message: 'You have unsaved changes. Are you sure you want to close?',
        header: 'Unsaved Changes',
        icon: 'pi pi-exclamation-triangle',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => {
          this.closeDialog();
        },
        reject: () => {
          // Keep dialog open
          this.visibleSignal.set(true);
        },
      });
    } else {
      this.closeDialog();
    }
  }

  /**
   * Close dialog and reset form
   * @private
   */
  private closeDialog(): void {
    this.resetForm();
    this.visibleSignal.set(false);
    this.visibleChange.emit(false);
  }

  /**
   * Reset form to initial state
   * @private
   */
  private resetForm(): void {
    this.templateForm.reset({
      name: '',
      description: '',
      category: '',
      preview_image_url: '',
      schema: this.defaultSchema,
    });
    this.initialSchemaJson = this.defaultSchema;
    this.schemaErrors.set([]);
    this.selectedImage.set(null);
    this.error.set(null);
    this.inventoryConfig.set({ stockField: '', decrementOnSubmit: false });
    this.appointmentConfig.set({ timeSlotField: '', dateField: '', maxBookingsPerSlot: 1 });
    this.quizConfig.set({
      questionField: '',
      answerField: '',
      passingScore: 70,
      showResults: true,
      scoringRules: [],
    });
    this.pollConfig.set({
      pollQuestionField: '',
      optionsField: '',
      preventDuplicates: true,
      showResultsAfterVote: true,
    });
    this.validateSchema(this.defaultSchema);
    this.templateForm.markAsPristine();

    // Reset wizard state
    this.currentStep.set(0);
    this.viewMode.set('json');
    this.parsedFields.set([]);
    this.screenshotFile.set(null);
    this.currentFieldIndex.set(0);
  }
}
