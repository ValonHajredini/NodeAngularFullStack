import { Component, Input, OnInit, OnDestroy } from '@angular/core';
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

// Shared Types
import {
  FormSchema,
  FormSettings,
  FormField,
  FormFieldType,
  FormBackgroundSettings,
  HeadingMetadata,
  isInputField,
  isDisplayElement,
} from '@nodeangularfullstack/shared';

// Service
import { FormRendererService, FormRenderError, FormRenderErrorType } from './form-renderer.service';

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
  imports: [CommonModule, ReactiveFormsModule, ProgressSpinner, Card, ButtonDirective],
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

  state: ComponentState = {
    loading: true,
    error: null,
    errorType: null,
    submitting: false,
    submitted: false,
    submissionMessage: null,
  };

  // Expose enums to template
  fieldTypes = FormFieldType;
  errorTypes = FormRenderErrorType;

  private destroy$ = new Subject<void>();
  private token = '';

  constructor(
    private route: ActivatedRoute,
    private formRendererService: FormRendererService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    // If in preview mode with provided schema, use it directly (Story 14.3)
    if (this.previewMode && this.formSchema) {
      this.schema = this.formSchema;
      this.settings = this.formSchema.settings as FormSettings;
      this.isPreview = true;
      this.formGroup = this.buildFormGroup(this.formSchema);
      this.setupConditionalVisibility();
      this.state = { ...this.state, loading: false };
      return;
    }

    // Otherwise, detect if this is a preview route or published form route
    this.route.url.pipe(takeUntil(this.destroy$)).subscribe((urlSegments) => {
      const isPreviewRoute =
        urlSegments.length >= 2 &&
        urlSegments[0]?.path === 'forms' &&
        urlSegments[1]?.path === 'preview';

      if (isPreviewRoute) {
        this.loadPreviewData();
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
      this.settings = previewData.settings;
      this.isPreview = previewData.isPreview || false;

      if (this.schema) {
        this.formGroup = this.buildFormGroup(this.schema);
        this.setupConditionalVisibility();
      }

      this.state = { ...this.state, loading: false };
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
          this.settings = result.settings;
          this.formGroup = this.buildFormGroup(result.schema);
          this.setupConditionalVisibility();
          this.state = { ...this.state, loading: false };
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

    schema.fields.forEach((field) => {
      // Skip display elements (heading, divider, group) - only add input fields to form
      if (isDisplayElement(field.type)) {
        return;
      }

      const validators = this.buildValidators(field);
      const defaultValue = this.getDefaultValue(field);

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
    if (field.defaultValue !== undefined) {
      return field.defaultValue;
    }

    switch (field.type) {
      case FormFieldType.CHECKBOX:
      case FormFieldType.TOGGLE:
        return false;
      case FormFieldType.NUMBER:
        return null;
      default:
        return '';
    }
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
   * Returns fields sorted by order
   */
  getSortedFields(): FormField[] {
    if (!this.schema) return [];
    return [...this.schema.fields].sort((a, b) => a.order - b.order);
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
  getRowConfigs(): Array<{ rowId: string; columnCount: number; order: number }> {
    if (!this.settings?.rowLayout?.enabled || !this.settings.rowLayout.rows) {
      return [];
    }
    // Sort rows by order (ascending)
    return [...this.settings.rowLayout.rows].sort((a, b) => a.order - b.order);
  }

  /**
   * Get all fields in a specific row-column position, sorted by orderInColumn.
   * Supports multi-field columns (Story 14.1).
   * @param rowId - The row ID to filter by
   * @param columnIndex - The column index to filter by
   * @returns Array of fields sorted by orderInColumn (ascending)
   */
  getFieldsInColumn(rowId: string, columnIndex: number): FormField[] {
    if (!this.schema?.fields) return [];

    return this.schema.fields
      .filter(
        (field) => field.position?.rowId === rowId && field.position?.columnIndex === columnIndex,
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
    // Return ALL fields sorted by order (ignore position when rowLayout disabled)
    return this.schema.fields.slice().sort((a, b) => a.order - b.order);
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
   * Get CSS Grid template columns for a row
   * @param columnCount - Number of columns in the row
   * @returns CSS Grid template columns value (e.g., 'repeat(2, 1fr)')
   */
  getGridColumns(columnCount: number): string {
    return `repeat(${columnCount}, 1fr)`;
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
   * Determines if error should be shown for a field
   */
  shouldShowError(fieldName: string): boolean {
    const control = this.formGroup?.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Gets user-friendly error message for field
   */
  getErrorMessage(field: FormField): string {
    const control = this.formGroup?.get(field.fieldName);
    if (!control?.errors) return '';

    const errors = control.errors;

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
      return field.validation?.errorMessage || 'Invalid format';
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
   */
  onSubmit(): void {
    // Prevent submission in preview mode (Story 14.3)
    if (this.previewMode || this.isPreview) {
      console.log('Form submission disabled in preview mode');
      return;
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

    // Submit form values
    this.formRendererService
      .submitForm(this.token, this.formGroup.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
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
}
