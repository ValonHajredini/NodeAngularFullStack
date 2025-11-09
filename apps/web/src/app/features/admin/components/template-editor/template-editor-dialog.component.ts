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
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { FileUpload } from 'primeng/fileupload';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Checkbox } from 'primeng/checkbox';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  FormTemplate,
  TemplateCategory,
  TemplateBusinessLogicConfig,
  CreateFormTemplateRequest,
  FormSchema,
} from '@nodeangularfullstack/shared';
import { TemplatesApiService } from '@core/services/templates-api.service';

/**
 * Dropdown option interface for PrimeNG dropdowns
 */
interface DropdownOption {
  label: string;
  value: string;
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
 * - Monaco Editor for JSON schema editing with validation
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
    Select,
    FileUpload,
    ProgressSpinner,
    Toast,
    ConfirmDialog,
    Checkbox,
    MonacoEditorModule,
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
  protected readonly schemaJson = signal<string>('{\n  "fields": [],\n  "settings": {}\n}');
  protected readonly schemaErrors = signal<string[]>([]);
  protected readonly selectedImage = signal<File | null>(null);
  private initialSchemaJson = '';

  // Monaco Editor configuration
  protected readonly editorOptions = {
    language: 'json',
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
    formatOnPaste: true,
    formatOnType: true,
  };

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
  });

  // Business logic configuration signals (category-specific)
  protected readonly inventoryConfig = signal({
    stockField: '',
    decrementOnSubmit: false,
  });

  protected readonly appointmentConfig = signal({
    timeSlotField: '',
    maxBookingsPerSlot: 1,
  });

  protected readonly quizConfig = signal({
    passingScore: 70,
    showResults: true,
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

  // Computed signals
  protected readonly formDirty = computed(
    () => this.templateForm.dirty || this.schemaJson() !== this.initialSchemaJson,
  );

  protected readonly canSave = computed(
    () => this.templateForm.valid && this.schemaErrors().length === 0 && !this.saving(),
  );

  protected readonly dialogHeader = computed(() =>
    this.mode() === 'create' ? 'Create Template' : 'Edit Template',
  );

  protected readonly saveButtonLabel = computed(() =>
    this.mode() === 'create' ? 'Create Template' : 'Save Changes',
  );

  // Effects to sync visible input with internal signal
  constructor() {
    effect(() => {
      this.visibleSignal.set(this.visible());
    });

    effect(() => {
      if (this.visible() && this.mode() === 'edit' && this.templateId()) {
        this.loadTemplateData();
      } else if (this.visible() && this.mode() === 'create') {
        this.resetForm();
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
        this.schemaJson.set(schemaJson);
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
          maxBookingsPerSlot: config.maxBookingsPerSlot,
        });
        break;
      case 'quiz':
        this.quizConfig.set({
          passingScore: config.passingScore || 70,
          showResults: config.showResults || true,
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
  protected validateSchema(): void {
    const json = this.schemaJson();
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
        if (!field.name) errors.push(`Field ${index + 1} missing "name"`);
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
   * Handle Monaco Editor value changes
   */
  protected onSchemaChange(value: string): void {
    this.schemaJson.set(value);
    this.validateSchema();
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
    try {
      templateSchema = JSON.parse(this.schemaJson());
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
    const templateData: CreateFormTemplateRequest = {
      name: formValue.name,
      description: formValue.description,
      category: formValue.category,
      previewImageUrl: formValue.preview_image_url,
      templateSchema,
      businessLogicConfig: this.getBusinessLogicConfig(),
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
   * @private
   */
  private getBusinessLogicConfig(): TemplateBusinessLogicConfig | undefined {
    const category = this.categoryControl?.value;

    switch (category) {
      case TemplateCategory.ECOMMERCE:
        return {
          type: 'inventory',
          stockField: this.inventoryConfig().stockField,
          variantField: '',
          quantityField: '',
          stockTable: 'inventory',
          decrementOnSubmit: this.inventoryConfig().decrementOnSubmit,
        };
      case TemplateCategory.SERVICES:
        return {
          type: 'appointment',
          timeSlotField: this.appointmentConfig().timeSlotField,
          dateField: '',
          maxBookingsPerSlot: this.appointmentConfig().maxBookingsPerSlot,
          bookingsTable: 'appointments',
        };
      case TemplateCategory.QUIZ:
        return {
          type: 'quiz',
          scoringRules: {},
          passingScore: this.quizConfig().passingScore,
          showResults: this.quizConfig().showResults,
        };
      case TemplateCategory.POLLS:
        return {
          type: 'poll',
          voteField: '',
          preventDuplicates: this.pollConfig().preventDuplicates,
          showResultsAfterVote: this.pollConfig().showResultsAfterVote,
          trackingMethod: 'session',
        };
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
    this.templateForm.reset();
    this.schemaJson.set('{\n  "fields": [],\n  "settings": {}\n}');
    this.initialSchemaJson = '';
    this.schemaErrors.set([]);
    this.selectedImage.set(null);
    this.error.set(null);
    this.inventoryConfig.set({ stockField: '', decrementOnSubmit: false });
    this.appointmentConfig.set({ timeSlotField: '', maxBookingsPerSlot: 1 });
    this.quizConfig.set({ passingScore: 70, showResults: true });
    this.pollConfig.set({ preventDuplicates: true, showResultsAfterVote: true });
  }
}
