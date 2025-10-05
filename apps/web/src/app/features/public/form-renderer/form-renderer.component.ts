import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { FormSchema, FormSettings, FormField, FormFieldType } from '@nodeangularfullstack/shared';

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
 */
@Component({
  selector: 'app-form-renderer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProgressSpinner, Card, ButtonDirective],
  templateUrl: './form-renderer.component.html',
  styleUrls: ['./form-renderer.component.scss'],
})
export class FormRendererComponent implements OnInit, OnDestroy {
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
    // Detect if this is a preview route or published form route
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
   */
  private buildFormGroup(schema: FormSchema): FormGroup {
    const group: Record<string, FormControl> = {};

    schema.fields.forEach((field) => {
      if (field.type === FormFieldType.DIVIDER) {
        return; // Skip dividers
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
   */
  get canSubmit(): boolean {
    return !this.isPreview && !!this.formGroup?.valid && !this.state.submitting;
  }

  /**
   * Handles form submission
   */
  onSubmit(): void {
    // Prevent submission in preview mode
    if (this.isPreview) {
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
}
