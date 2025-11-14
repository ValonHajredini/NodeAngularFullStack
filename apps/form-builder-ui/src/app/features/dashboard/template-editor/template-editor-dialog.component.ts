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
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  FormTemplate,
  TemplateCategory,
  TemplateBusinessLogicConfig,
  CreateFormTemplateRequest,
  FormSchema,
  QuizScoringRule,
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
    passingScore: 70,
    showResults: true,
    scoringRules: [],
  });

  protected readonly pollConfig = signal({
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

  // Effects to sync visible input with internal signal
  constructor() {
    effect(() => {
      this.visibleSignal.set(this.visible());
    });

    this.templateForm.statusChanges.pipe(takeUntilDestroyed()).subscribe((status) => {
      this.formStatus.set(status as FormControlStatus);
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

        // Load schema into Monaco Editor
        const schemaJson = JSON.stringify(template.templateSchema, null, 2);
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
          passingScore: config.passingScore ?? 70,
          showResults: config.showResults ?? true,
          scoringRules: config.scoringRules?.map((rule) => ({ ...rule })) ?? [],
        });
        break;
      case 'poll':
        this.pollConfig.set({
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
    this.quizConfig.set({ passingScore: 70, showResults: true, scoringRules: [] });
    this.pollConfig.set({ preventDuplicates: true, showResultsAfterVote: true });
    this.validateSchema(this.defaultSchema);
    this.templateForm.markAsPristine();
  }
}
