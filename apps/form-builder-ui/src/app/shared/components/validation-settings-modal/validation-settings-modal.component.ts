import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  OnDestroy,
  signal,
  effect,
  computed,
  model,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule, ButtonDirective } from 'primeng/button';
import { Select, SelectModule } from 'primeng/select';
import { Slider, SliderModule } from 'primeng/slider';
import { Message, MessageModule } from 'primeng/message';
import { ToggleSwitch } from 'primeng/toggleswitch';
import {
  FormField,
  FormFieldType,
} from '@nodeangularfullstack/shared';
import { Subject, takeUntil } from 'rxjs';

// Custom validators
import { regexSyntaxValidator } from '../../../features/dashboard/field-properties/validators/regex-syntax.validator';
import { minMaxRangeValidator } from '../../../features/dashboard/field-properties/validators/min-max-range.validator';

// Validation presets service
import { ValidationPresetsService, ValidationPreset } from '../../../features/dashboard/field-properties/validation-presets.service';

/**
 * Validation Settings Modal component for editing field validation properties.
 *
 * Handles:
 * - Number fields: Min/Max value sliders
 * - Text fields: Min/Max length sliders, Regex patterns, Custom error message
 * - Email fields: Strict email validation toggle
 */
@Component({
  selector: 'app-validation-settings-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    ButtonDirective,
    SelectModule,
    Select,
    SliderModule,
    Slider,
    MessageModule,
    Message,
    ToggleSwitch,
  ],
  template: `
    <p-dialog
      header="Validation Settings"
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="false"
      [closeOnEscape]="true"
      [draggable]="false"
      [resizable]="false"
      [blockScroll]="true"
      appendTo="body"
      [style]="{ width: '650px', maxHeight: '90vh' }"
      [contentStyle]="{ maxHeight: 'calc(90vh - 180px)', overflow: 'auto' }"
      (onHide)="onDialogHide()"
      (onShow)="onDialogShow()"
    >
      @if (field()) {
        <div class="mb-4">
          <span class="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
            {{ field()!.type }}
          </span>
        </div>

        <form [formGroup]="validationForm" class="space-y-4">
          <!-- Number Field Validation -->
          @if (isNumberField()) {
            <div class="grid grid-cols-2 gap-4">
              <div class="field">
                <label for="minValue" class="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Minimum Value</span>
                  <span class="text-blue-600 font-semibold">{{ validationForm.get('minValue')?.value ?? 0 }}</span>
                </label>
                <p-slider
                  formControlName="minValue"
                  inputId="minValue"
                  [min]="0"
                  [max]="25"
                  [step]="1"
                  class="w-full"
                  (onChange)="onMinValueChange()"
                />
              </div>

              <div class="field">
                <label for="maxValue" class="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Maximum Value</span>
                  <span class="text-blue-600 font-semibold">{{ validationForm.get('maxValue')?.value ?? 100 }}</span>
                </label>
                <p-slider
                  formControlName="maxValue"
                  inputId="maxValue"
                  [min]="5"
                  [max]="250"
                  [step]="1"
                  class="w-full"
                  (onChange)="onMaxValueChange()"
                />
              </div>
            </div>

            @if (
              validationForm.hasError('minMaxRange') &&
              (validationForm.get('minValue')?.touched ||
                validationForm.get('maxValue')?.touched)
            ) {
              <p-message
                severity="error"
                aria-live="polite"
                styleClass="w-full mt-2"
                [text]="'Minimum must be less than or equal to maximum'"
              />
            }
          }

          <!-- Text Field Validation -->
          @if (isTextField()) {
            <div class="grid grid-cols-2 gap-4">
              <div class="field">
                <label for="minLength" class="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Minimum Length</span>
                  <span class="text-blue-600 font-semibold">{{ validationForm.get('minLength')?.value ?? 0 }}</span>
                </label>
                <p-slider
                  formControlName="minLength"
                  inputId="minLength"
                  [min]="0"
                  [max]="25"
                  [step]="1"
                  class="w-full"
                  (onChange)="onMinLengthChange()"
                />
              </div>

              <div class="field">
                <label for="maxLength" class="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Maximum Length</span>
                  <span class="text-blue-600 font-semibold">{{ validationForm.get('maxLength')?.value ?? 100 }}</span>
                </label>
                <p-slider
                  formControlName="maxLength"
                  inputId="maxLength"
                  [min]="5"
                  [max]="250"
                  [step]="1"
                  class="w-full"
                  (onChange)="onMaxLengthChange()"
                />
              </div>
            </div>

            @if (
              validationForm.hasError('minMaxRange') &&
              (validationForm.get('minLength')?.touched ||
                validationForm.get('maxLength')?.touched)
            ) {
              <p-message
                severity="error"
                aria-live="polite"
                styleClass="w-full mt-2"
                [text]="'Minimum must be less than or equal to maximum'"
              />
            }

            <!-- Pattern Preset Dropdown -->
            <div class="field space-y-2">
              <label
                for="patternPreset"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Validation Pattern
              </label>
              <p-select
                [options]="validationPresets"
                [(ngModel)]="selectedPreset"
                (onChange)="onPresetChange($event)"
                [ngModelOptions]="{ standalone: true }"
                optionLabel="label"
                placeholder="Select pattern preset"
                class="w-full"
                inputId="patternPreset"
              />

              <textarea
                pTextarea
                formControlName="pattern"
                rows="2"
                class="w-full font-mono text-sm"
                placeholder="Enter regex pattern (e.g., ^[A-Za-z]+$)"
              ></textarea>

              @if (selectedPreset && selectedPreset.name !== 'custom') {
                <p class="text-xs text-gray-600 flex items-start gap-1 mt-1">
                  <i class="pi pi-info-circle mt-0.5"></i>
                  <span>
                    {{ selectedPreset.description }}
                    <br />
                    <span class="font-medium">Example:</span> {{ selectedPreset.example }}
                  </span>
                </p>
              }

              @if (
                validationForm.get('pattern')?.errors?.['invalidRegex'] &&
                validationForm.get('pattern')?.touched
              ) {
                <p-message
                  severity="error"
                  aria-live="polite"
                  styleClass="w-full mt-2"
                  [text]="
                    'Invalid regex pattern: ' +
                    validationForm.get('pattern')?.errors?.['invalidRegex']?.message
                  "
                />
              }
            </div>

            <!-- Custom Error Message -->
            <div class="field space-y-2">
              <label
                for="errorMessage"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                Custom Error Message
              </label>
              <textarea
                pTextarea
                id="errorMessage"
                formControlName="errorMessage"
                rows="2"
                maxlength="200"
                class="w-full"
                placeholder="Enter custom error message shown when validation fails"
              ></textarea>
              <div class="flex justify-between text-xs text-gray-500">
                <span
                  >Optional - defaults to generic validation error if not provided</span
                >
                <span
                  >{{ validationForm.get('errorMessage')?.value?.length || 0 }}/200</span
                >
              </div>
            </div>
          }

          <!-- Email Field Validation -->
          @if (isEmailField()) {
            <div class="field flex items-center">
              <p-toggleswitch
                formControlName="emailFormat"
                inputId="emailFormat"
              ></p-toggleswitch>
              <label for="emailFormat" class="ml-2 text-sm font-medium text-gray-700">
                Strict email validation
              </label>
            </div>
          }
        </form>
      }

      <ng-template pTemplate="footer">
        <div class="flex gap-2 justify-end">
          <button
            pButton
            type="button"
            label="Cancel"
            icon="pi pi-times"
            severity="secondary"
            (click)="onCancel()"
          ></button>
          <button
            pButton
            type="button"
            label="Save Changes"
            icon="pi pi-check"
            [disabled]="validationForm.invalid"
            (click)="onSaveChanges()"
          ></button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class ValidationSettingsModalComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();
  private readonly validationPresetsService = inject(ValidationPresetsService);

  // Signal-based inputs/outputs
  readonly visible = model<boolean>(false);
  readonly field = input<FormField | null>(null);

  readonly saveChanges = output<Partial<FormField>>();
  readonly cancel = output<void>();

  // Form and state
  validationForm: FormGroup;

  // Validation presets
  readonly validationPresets: ValidationPreset[] = this.validationPresetsService.getPresets();
  selectedPreset: ValidationPreset | null = null;

  // Computed signals for field type detection
  readonly isNumberField = computed(() => {
    const fieldType = this.field()?.type;
    return fieldType === FormFieldType.NUMBER;
  });

  readonly isTextField = computed(() => {
    const fieldType = this.field()?.type;
    return fieldType === FormFieldType.TEXT || fieldType === FormFieldType.TEXTAREA;
  });

  readonly isEmailField = computed(() => {
    const fieldType = this.field()?.type;
    return fieldType === FormFieldType.EMAIL;
  });

  constructor() {
    this.validationForm = this.fb.group(
      {
        // Number validation
        minValue: [null],
        maxValue: [null],
        // Text validation
        minLength: [null],
        maxLength: [null],
        pattern: ['', regexSyntaxValidator()],
        errorMessage: ['', Validators.maxLength(200)],
        // Email validation
        emailFormat: [false],
      },
      {
        validators: [
          minMaxRangeValidator('minLength', 'maxLength'),
          minMaxRangeValidator('minValue', 'maxValue'),
        ],
      },
    );

    // Watch for field changes using effect
    effect(() => {
      const selectedField = this.field();
      if (selectedField) {
        this.loadFieldProperties(selectedField);
      }
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load field properties into form
   */
  private loadFieldProperties(field: FormField): void {
    // Patch form values
    this.validationForm.patchValue(
      {
        minValue: field.validation?.min ?? null,
        maxValue: field.validation?.max ?? null,
        minLength: field.validation?.minLength ?? null,
        maxLength: field.validation?.maxLength ?? null,
        pattern: field.validation?.pattern || '',
        errorMessage: field.validation?.errorMessage || '',
        emailFormat: false,
      },
      { emitEvent: false },
    );

    this.validationForm.markAsPristine();
  }

  /**
   * Handle validation preset selection change
   */
  onPresetChange(event: any): void {
    const preset: ValidationPreset = event.value;
    if (preset) {
      this.selectedPreset = preset;
      const patternControl = this.validationForm.get('pattern');

      if (preset.name !== 'custom') {
        // Auto-fill pattern with preset regex and disable the field
        this.validationForm.patchValue({ pattern: preset.pattern });
        patternControl?.disable();
      } else {
        // Enable the field for custom input
        patternControl?.enable();
      }
      this.validationForm.markAsDirty();
    }
  }

  /**
   * Handle minimum value slider change
   * If min > max, set min = max
   */
  onMinValueChange(): void {
    const minValue = this.validationForm.get('minValue')?.value;
    const maxValue = this.validationForm.get('maxValue')?.value;

    if (minValue !== null && maxValue !== null && minValue > maxValue) {
      this.validationForm.patchValue({
        minValue: maxValue,
      }, { emitEvent: false });
    }
    this.validationForm.markAsDirty();
  }

  /**
   * Handle maximum value slider change
   * If max < min, set max = min
   */
  onMaxValueChange(): void {
    const minValue = this.validationForm.get('minValue')?.value;
    const maxValue = this.validationForm.get('maxValue')?.value;

    if (minValue !== null && maxValue !== null && maxValue < minValue) {
      this.validationForm.patchValue({
        maxValue: minValue,
      }, { emitEvent: false });
    }
    this.validationForm.markAsDirty();
  }

  /**
   * Handle minimum length slider change
   * If min > max, set min = max
   */
  onMinLengthChange(): void {
    const minLength = this.validationForm.get('minLength')?.value;
    const maxLength = this.validationForm.get('maxLength')?.value;

    if (minLength !== null && maxLength !== null && minLength > maxLength) {
      this.validationForm.patchValue({
        minLength: maxLength,
      }, { emitEvent: false });
    }
    this.validationForm.markAsDirty();
  }

  /**
   * Handle maximum length slider change
   * If max < min, set max = min
   */
  onMaxLengthChange(): void {
    const minLength = this.validationForm.get('minLength')?.value;
    const maxLength = this.validationForm.get('maxLength')?.value;

    if (minLength !== null && maxLength !== null && maxLength < minLength) {
      this.validationForm.patchValue({
        maxLength: minLength,
      }, { emitEvent: false });
    }
    this.validationForm.markAsDirty();
  }

  /**
   * Dialog show event handler
   */
  onDialogShow(): void {
    const field = this.field();
    if (field) {
      this.loadFieldProperties(field);
    }
  }

  /**
   * Dialog hide event handler
   */
  onDialogHide(): void {
    this.validationForm.reset();
    this.selectedPreset = null;
  }

  /**
   * Save changes handler
   */
  onSaveChanges(): void {
    if (this.validationForm.invalid) {
      // Mark all fields as touched to show errors
      Object.keys(this.validationForm.controls).forEach((key) => {
        this.validationForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValues = this.validationForm.value;

    // Build validation object
    const validation: any = {};
    if (formValues.minValue !== null) validation.min = formValues.minValue;
    if (formValues.maxValue !== null) validation.max = formValues.maxValue;
    if (formValues.minLength !== null) validation.minLength = formValues.minLength;
    if (formValues.maxLength !== null) validation.maxLength = formValues.maxLength;
    if (formValues.pattern) validation.pattern = formValues.pattern;
    if (formValues.errorMessage) validation.errorMessage = formValues.errorMessage;

    // Emit partial field update
    const updates: Partial<FormField> = {
      validation: Object.keys(validation).length > 0 ? validation : undefined,
    };

    this.saveChanges.emit(updates);
    this.visible.set(false);
  }

  /**
   * Cancel handler
   */
  onCancel(): void {
    this.cancel.emit();
    this.visible.set(false);
  }
}
