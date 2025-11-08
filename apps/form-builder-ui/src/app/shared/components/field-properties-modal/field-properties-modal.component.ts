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
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Checkbox } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule, ButtonDirective } from 'primeng/button';
import { Select, SelectModule } from 'primeng/select';
import { InputNumber, InputNumberModule } from 'primeng/inputnumber';
import { AccordionModule } from 'primeng/accordion';
import { TooltipModule } from 'primeng/tooltip';
import { TabsModule } from 'primeng/tabs';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import {
  FormField,
  FormFieldType,
  isInputField,
} from '@nodeangularfullstack/shared';
import { Subject, takeUntil, debounceTime, map, distinctUntilChanged } from 'rxjs';
import { Message, MessageModule } from 'primeng/message';

// Custom validators
import { uniqueFieldNameValidator } from '../../../features/dashboard/field-properties/validators/unique-field-name.validator';
import { regexSyntaxValidator } from '../../../features/dashboard/field-properties/validators/regex-syntax.validator';
import { minMaxRangeValidator } from '../../../features/dashboard/field-properties/validators/min-max-range.validator';

// Slug utility
import { slugify } from '../../../features/dashboard/field-properties/utils/slugify.util';

// Validation presets service
import { ValidationPresetsService, ValidationPreset } from '../../../features/dashboard/field-properties/validation-presets.service';

/**
 * Shared Field Properties Modal component for editing field configurations.
 *
 * Uses Angular signals for reactive state management:
 * - model() for two-way binding of visibility
 * - input() for one-way data flow from parent
 * - output() for emitting events to parent
 * - signal() for internal component state
 */
@Component({
  selector: 'app-field-properties-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    InputTextModule,
    Checkbox,
    TextareaModule,
    ButtonModule,
    ButtonDirective,
    SelectModule,
    Select,
    InputNumberModule,
    InputNumber,
    AccordionModule,
    TooltipModule,
    TabsModule,
    MessageModule,
    Message,
    DragDropModule,
  ],
  styles: [`
    // Custom checkbox styling for better visual feedback
    ::ng-deep .p-checkbox {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      flex-shrink: 0;
    }

    ::ng-deep .p-checkbox .p-checkbox-box {
      width: 20px;
      height: 20px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      background: #ffffff;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    ::ng-deep .p-checkbox:not(.p-disabled):hover .p-checkbox-box {
      border-color: #3b82f6;
      background: #eff6ff;
    }

    ::ng-deep .p-checkbox.p-highlight .p-checkbox-box {
      background: #3b82f6;
      border-color: #3b82f6;
    }

    ::ng-deep .p-checkbox .p-checkbox-box .p-checkbox-icon {
      color: #ffffff;
      font-size: 14px;
      font-weight: bold;
    }

    ::ng-deep .p-checkbox:focus-visible .p-checkbox-box {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
  `],
  template: `
    <p-dialog
      header="Field Properties"
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="false"
      [closeOnEscape]="true"
      [draggable]="false"
      [resizable]="false"
      [blockScroll]="true"
      appendTo="body"
      [style]="{ width: '700px', maxHeight: '90vh' }"
      [contentStyle]="{ maxHeight: 'calc(90vh - 180px)', overflow: 'auto' }"
      (onHide)="onDialogHide()"
      (onShow)="onDialogShow()"
    >
      @if (field()) {
        <div class="mb-4 flex flex-wrap gap-2">
          <span class="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
            {{ field()!.type }}
          </span>
          <span
            [class]="
              'inline-block text-xs px-3 py-1 rounded-full font-semibold ' +
              fieldCategoryBadgeClass()
            "
          >
            {{ fieldCategoryLabel() }}
          </span>
        </div>

        <form [formGroup]="propertiesForm" class="space-y-4">
          <!-- Tab View for organized property sections -->
          <p-tabs [(value)]="activeTabIndex">
            <p-tablist>
              <p-tab value="0">Basic</p-tab>
              @if (showValidationSection()) {
                <p-tab value="1">Validation</p-tab>
              }
              @if (showValidationSection()) {
                <p-tab value="2">Behavior</p-tab>
              }
              @if (showValidationSection()) {
                <p-tab value="3">Conditional Visibility</p-tab>
              }
            </p-tablist>

            <p-tabpanels>
              <!-- Basic Tab -->
              <p-tabpanel value="0">
              <div class="space-y-4 pt-4">
                <div class="field">
                  <label for="label" class="block text-sm font-medium text-gray-700 mb-1">
                    Label <span class="text-red-500">*</span>
                  </label>
                  <input
                    pInputText
                    id="label"
                    formControlName="label"
                    class="w-full"
                    placeholder="Enter field label"
                    [attr.aria-invalid]="
                      propertiesForm.get('label')?.invalid && propertiesForm.get('label')?.touched
                    "
                  />
                  @if (
                    propertiesForm.get('label')?.invalid && propertiesForm.get('label')?.touched
                  ) {
                    <p-message
                      severity="error"
                      aria-live="polite"
                      styleClass="w-full mt-2"
                      [text]="'Label is required'"
                    />
                  }
                </div>

                <div class="field">
                  <label for="fieldName" class="block text-sm font-medium text-gray-700 mb-1">
                    Field Name <span class="text-red-500">*</span>
                  </label>
                  <input
                    pInputText
                    id="fieldName"
                    formControlName="fieldName"
                    class="w-full font-mono text-sm"
                    placeholder="Enter field name"
                  />
                  <small class="text-gray-600 text-xs block mt-1">
                    Auto-generated from label. Edit to customize.
                  </small>
                  @if (
                    propertiesForm.get('fieldName')?.errors?.['required'] &&
                    propertiesForm.get('fieldName')?.touched
                  ) {
                    <p-message
                      severity="error"
                      aria-live="polite"
                      styleClass="w-full mt-2"
                      [text]="'Field name is required'"
                    />
                  }
                  @if (
                    propertiesForm.get('fieldName')?.errors?.['pattern'] &&
                    propertiesForm.get('fieldName')?.touched
                  ) {
                    <p-message
                      severity="error"
                      aria-live="polite"
                      styleClass="w-full mt-2"
                      [text]="'Must use lowercase letters, numbers, and underscores only'"
                    />
                  }
                  @if (
                    propertiesForm.get('fieldName')?.errors?.['duplicateFieldName'] &&
                    propertiesForm.get('fieldName')?.touched
                  ) {
                    <p-message
                      severity="error"
                      aria-live="polite"
                      styleClass="w-full mt-2"
                      [text]="'Field name must be unique within this form'"
                    />
                  }
                </div>

                <div class="field">
                  <label for="placeholder" class="block text-sm font-medium text-gray-700 mb-1">
                    Placeholder
                  </label>
                  <input
                    pInputText
                    id="placeholder"
                    formControlName="placeholder"
                    class="w-full"
                    placeholder="Enter placeholder text"
                  />
                </div>

                <div class="field">
                  <label for="helpText" class="block text-sm font-medium text-gray-700 mb-1">
                    Help Text
                  </label>
                  <textarea
                    pTextarea
                    id="helpText"
                    formControlName="helpText"
                    class="w-full"
                    rows="3"
                    placeholder="Enter help text"
                  ></textarea>
                </div>

                <div class="field flex items-center">
                  <p-checkbox
                    formControlName="required"
                    [binary]="true"
                    inputId="required"
                  ></p-checkbox>
                  <label for="required" class="ml-2 text-sm font-medium text-gray-700">
                    Required field
                  </label>
                </div>

                <div class="field">
                  <label for="defaultValue" class="block text-sm font-medium text-gray-700 mb-1">
                    Default Value
                  </label>
                  @if (isCheckboxOrToggle()) {
                    <p-toggleswitch
                      formControlName="defaultValue"
                      inputId="defaultValue"
                    ></p-toggleswitch>
                  } @else if (isNumberField()) {
                    <p-inputNumber
                      formControlName="defaultValue"
                      inputId="defaultValue"
                      class="w-full"
                    />
                  } @else {
                    <input
                      pInputText
                      id="defaultValue"
                      formControlName="defaultValue"
                      class="w-full"
                      placeholder="Enter default value"
                    />
                  }
                </div>
              </div>
            </p-tabpanel>

            <!-- Validation Tab (conditional on input field types) -->
            @if (showValidationSection()) {
              <p-tabpanel value="1">
                <div class="space-y-4 pt-4">
                  @if (isNumberField()) {
                    <div class="field">
                      <label for="minValue" class="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Value
                      </label>
                      <p-inputNumber
                        formControlName="minValue"
                        inputId="minValue"
                        [showButtons]="true"
                        class="w-full"
                      />
                    </div>

                    <div class="field">
                      <label for="maxValue" class="block text-sm font-medium text-gray-700 mb-1">
                        Maximum Value
                      </label>
                      <p-inputNumber
                        formControlName="maxValue"
                        inputId="maxValue"
                        [showButtons]="true"
                        class="w-full"
                      />
                    </div>

                    @if (
                      propertiesForm.hasError('minMaxRange') &&
                      (propertiesForm.get('minValue')?.touched ||
                        propertiesForm.get('maxValue')?.touched)
                    ) {
                      <p-message
                        severity="error"
                        aria-live="polite"
                        styleClass="w-full mt-2"
                        [text]="'Minimum must be less than or equal to maximum'"
                      />
                    }
                  }

                  @if (isTextField()) {
                    <div class="field">
                      <label for="minLength" class="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Length
                      </label>
                      <p-inputNumber
                        formControlName="minLength"
                        inputId="minLength"
                        [showButtons]="true"
                        [min]="0"
                        class="w-full"
                      />
                    </div>

                    <div class="field">
                      <label for="maxLength" class="block text-sm font-medium text-gray-700 mb-1">
                        Maximum Length
                      </label>
                      <p-inputNumber
                        formControlName="maxLength"
                        inputId="maxLength"
                        [showButtons]="true"
                        [min]="1"
                        class="w-full"
                      />
                    </div>

                    @if (
                      propertiesForm.hasError('minMaxRange') &&
                      (propertiesForm.get('minLength')?.touched ||
                        propertiesForm.get('maxLength')?.touched)
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
                        propertiesForm.get('pattern')?.errors?.['invalidRegex'] &&
                        propertiesForm.get('pattern')?.touched
                      ) {
                        <p-message
                          severity="error"
                          aria-live="polite"
                          styleClass="w-full mt-2"
                          [text]="
                            'Invalid regex pattern: ' +
                            propertiesForm.get('pattern')?.errors?.['invalidRegex']?.message
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
                          >{{ propertiesForm.get('errorMessage')?.value?.length || 0 }}/200</span
                        >
                      </div>
                    </div>
                  }

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
                </div>
              </p-tabpanel>
            }

            <!-- Behavior Tab -->
            @if (showValidationSection()) {
              <p-tabpanel value="2">
                <div class="space-y-4 pt-4">
                  <div class="field flex items-center">
                    <p-checkbox
                      formControlName="disabled"
                      inputId="disabled"
                      [binary]="true"
                      (onChange)="onFieldPropertyChange()"
                    ></p-checkbox>
                    <label for="disabled" class="ml-2 text-sm font-medium text-gray-700">
                      Disabled
                    </label>
                  </div>

                  <div class="field flex items-center">
                    <p-checkbox
                      formControlName="readOnly"
                      inputId="readOnly"
                      [binary]="true"
                      (onChange)="onFieldPropertyChange()"
                    ></p-checkbox>
                    <label for="readOnly" class="ml-2 text-sm font-medium text-gray-700">
                      Read-only
                    </label>
                  </div>

                  <div class="field">
                    <label for="defaultValue" class="block text-sm font-medium text-gray-700 mb-1">
                      Default Value
                    </label>
                    <input
                      pInputText
                      id="defaultValue"
                      formControlName="defaultValue"
                      class="w-full"
                      placeholder="Enter default value"
                    />
                  </div>
                </div>
              </p-tabpanel>
            }

            <!-- Conditional Visibility Tab -->
            @if (showValidationSection()) {
              <p-tabpanel value="3">
                <div class="space-y-4 pt-4">
                  <div class="field">
                    <label
                      for="showIfField"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Show If Field
                    </label>
                    <p-select
                      formControlName="showIfField"
                      [options]="otherFieldsOptions()"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Select field"
                      [showClear]="true"
                      class="w-full"
                    />
                  </div>

                  @if (propertiesForm.get('showIfField')?.value) {
                    <div class="field">
                      <label
                        for="showIfOperator"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Operator
                      </label>
                      <p-select
                        formControlName="showIfOperator"
                        [options]="operatorOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select operator"
                        class="w-full"
                      />
                    </div>

                    <div class="field">
                      <label
                        for="showIfValue"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Value
                      </label>
                      <input
                        pInputText
                        id="showIfValue"
                        formControlName="showIfValue"
                        class="w-full"
                        placeholder="Enter comparison value"
                      />
                    </div>

                    <button
                      pButton
                      type="button"
                      label="Clear Rule"
                      icon="pi pi-times"
                      severity="secondary"
                      size="small"
                      (click)="clearConditionalRule()"
                    ></button>
                  }
                </div>
              </p-tabpanel>
            }
            </p-tabpanels>
          </p-tabs>
        </form>
      }

      <ng-template pTemplate="footer">
        <div class="flex gap-2 justify-end">
          <button
            pButton
            type="button"
            label="Delete Field"
            icon="pi pi-trash"
            severity="danger"
            [outlined]="true"
            (click)="onDeleteField()"
          ></button>
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
            [disabled]="propertiesForm.invalid"
            (click)="onSaveChanges()"
          ></button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class FieldPropertiesModalComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly validationPresetsService = inject(ValidationPresetsService);

  // Signal-based inputs/outputs
  readonly visible = model<boolean>(false);
  readonly field = input<FormField | null>(null);
  readonly allFields = input<FormField[]>([]);

  readonly saveChanges = output<FormField>();
  readonly deleteField = output<void>();
  readonly cancel = output<void>();

  // Form and state
  propertiesForm: FormGroup;
  private isFieldNameManuallyEdited = false;
  activeTabIndex = signal<string>('0');

  // Validation presets
  readonly validationPresets: ValidationPreset[] = this.validationPresetsService.getPresets();
  selectedPreset: ValidationPreset | null = null;

  // Mobile responsive behavior
  private readonly isMobile$ = this.breakpointObserver
    .observe([Breakpoints.XSmall, Breakpoints.Small])
    .pipe(map((result) => result.matches));
  readonly isMobile = toSignal(this.isMobile$, { initialValue: false });

  // Computed signals for showing Validation section
  readonly showValidationSection = computed(() => {
    const selectedField = this.field();
    return selectedField ? isInputField(selectedField.type) : false;
  });

  // Computed signal for field category label
  readonly fieldCategoryLabel = computed(() => {
    const selectedField = this.field();
    if (!selectedField) return '';
    return isInputField(selectedField.type) ? 'Input' : 'Preview';
  });

  // Computed signal for field category badge color
  readonly fieldCategoryBadgeClass = computed(() => {
    const selectedField = this.field();
    if (!selectedField) return 'bg-gray-100 text-gray-800';
    return isInputField(selectedField.type)
      ? 'bg-green-100 text-green-800'
      : 'bg-purple-100 text-purple-800';
  });

  // Operator options for conditional visibility
  readonly operatorOptions = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equals', value: 'notEquals' },
    { label: 'Contains', value: 'contains' },
  ];

  constructor() {
    this.propertiesForm = this.fb.group(
      {
        // Basic properties
        label: ['', [Validators.required, Validators.maxLength(200)]],
        fieldName: [
          '',
          [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)],
        ],
        placeholder: ['', Validators.maxLength(100)],
        helpText: ['', Validators.maxLength(500)],
        required: [false],

        // Validation properties
        minValue: [null],
        maxValue: [null],
        minLength: [null],
        maxLength: [null],
        pattern: ['', regexSyntaxValidator()],
        errorMessage: ['', Validators.maxLength(200)],
        emailFormat: [false],

        // Behavior properties
        disabled: [false],
        readOnly: [false],
        defaultValue: [null],

        // Conditional visibility
        showIfField: [''],
        showIfOperator: ['equals'],
        showIfValue: [''],
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
    // Setup field name auto-generation
    this.setupFieldNameAutoGeneration();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Check if current field is a number type
   */
  isNumberField(): boolean {
    const fieldType = this.field()?.type;
    return fieldType === FormFieldType.NUMBER;
  }

  /**
   * Check if current field is a text type
   */
  isTextField(): boolean {
    const fieldType = this.field()?.type;
    return fieldType === FormFieldType.TEXT || fieldType === FormFieldType.TEXTAREA;
  }

  /**
   * Check if current field is email type
   */
  isEmailField(): boolean {
    const fieldType = this.field()?.type;
    return fieldType === FormFieldType.EMAIL;
  }

  /**
   * Check if current field is checkbox or toggle
   */
  isCheckboxOrToggle(): boolean {
    const fieldType = this.field()?.type;
    return fieldType === FormFieldType.CHECKBOX || fieldType === FormFieldType.TOGGLE;
  }

  /**
   * Get list of other fields for conditional visibility
   */
  otherFieldsOptions(): { label: string; value: string }[] {
    const currentField = this.field();
    if (!currentField) return [];

    return this.allFields()
      .filter((f) => f.id !== currentField.id)
      .map((f) => ({
        label: f.label || f.fieldName,
        value: f.id,
      }));
  }

  /**
   * Load field properties into form
   */
  private loadFieldProperties(field: FormField): void {
    // Reset manual edit flag
    this.isFieldNameManuallyEdited = false;

    // Add unique field name validator dynamically
    const fieldNameControl = this.propertiesForm.get('fieldName');
    if (fieldNameControl) {
      const formBuilderService = {
        getAllFields: () => this.allFields(),
      };
      fieldNameControl.setValidators([
        Validators.required,
        Validators.pattern(/^[a-z0-9_]+$/),
        uniqueFieldNameValidator(formBuilderService as any, field.id),
      ]);
      fieldNameControl.updateValueAndValidity({ emitEvent: false });
    }

    // Patch form values
    this.propertiesForm.patchValue(
      {
        label: field.label || '',
        fieldName: field.fieldName,
        placeholder: field.placeholder || '',
        helpText: field.helpText || '',
        required: field.required || false,
        minValue: field.validation?.min ?? null,
        maxValue: field.validation?.max ?? null,
        minLength: field.validation?.minLength ?? null,
        maxLength: field.validation?.maxLength ?? null,
        pattern: field.validation?.pattern || '',
        errorMessage: field.validation?.errorMessage || '',
        emailFormat: false,
        disabled: false,
        readOnly: false,
        defaultValue: field.defaultValue ?? null,
        showIfField: field.conditional?.watchFieldId || '',
        showIfOperator: field.conditional?.operator || 'equals',
        showIfValue: field.conditional?.value || '',
      },
      { emitEvent: false },
    );

    this.propertiesForm.markAsPristine();
  }

  /**
   * Clear conditional visibility rule
   */
  clearConditionalRule(): void {
    this.propertiesForm.patchValue({
      showIfField: '',
      showIfOperator: 'equals',
      showIfValue: '',
    });
  }

  /**
   * Handle validation preset selection change
   */
  onPresetChange(event: any): void {
    const preset: ValidationPreset = event.value;
    if (preset) {
      this.selectedPreset = preset;
      const patternControl = this.propertiesForm.get('pattern');

      if (preset.name !== 'custom') {
        // Auto-fill pattern with preset regex and disable the field
        this.propertiesForm.patchValue({ pattern: preset.pattern });
        patternControl?.disable();
      } else {
        // Enable the field for custom input
        patternControl?.enable();
      }
      this.propertiesForm.markAsDirty();
    }
  }

  /**
   * Setup field name auto-generation from label
   */
  private setupFieldNameAutoGeneration(): void {
    // Track manual edits to fieldName
    this.propertiesForm
      .get('fieldName')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.propertiesForm.get('fieldName')?.dirty) {
          this.isFieldNameManuallyEdited = true;
        }
      });

    // Auto-generate fieldName from label (if not manually edited)
    this.propertiesForm
      .get('label')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((label) => {
        if (!this.isFieldNameManuallyEdited && label) {
          const slugifiedName = slugify(label);
          this.propertiesForm.patchValue(
            { fieldName: slugifiedName },
            { emitEvent: false },
          );
        }
      });
  }

  /**
   * Handle field property changes (for checkboxes and other controls)
   */
  onFieldPropertyChange(): void {
    this.propertiesForm.markAsDirty();
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
    this.propertiesForm.reset();
    this.isFieldNameManuallyEdited = false;
    this.selectedPreset = null;
  }

  /**
   * Save changes handler
   */
  onSaveChanges(): void {
    if (this.propertiesForm.invalid) {
      // Mark all fields as touched to show errors
      Object.keys(this.propertiesForm.controls).forEach((key) => {
        this.propertiesForm.get(key)?.markAsTouched();
      });
      return;
    }

    const currentField = this.field();
    if (!currentField) return;

    const formValues = this.propertiesForm.value;

    // Build validation object
    const validation: any = {};
    if (formValues.minValue !== null) validation.min = formValues.minValue;
    if (formValues.maxValue !== null) validation.max = formValues.maxValue;
    if (formValues.minLength !== null) validation.minLength = formValues.minLength;
    if (formValues.maxLength !== null) validation.maxLength = formValues.maxLength;
    if (formValues.pattern) validation.pattern = formValues.pattern;
    if (formValues.errorMessage) validation.errorMessage = formValues.errorMessage;

    // Build conditional object
    let conditional = undefined;
    if (formValues.showIfField) {
      conditional = {
        watchFieldId: formValues.showIfField,
        operator: formValues.showIfOperator,
        value: formValues.showIfValue,
      };
    }

    const updatedField: FormField = {
      ...currentField,
      label: formValues.label,
      fieldName: formValues.fieldName,
      placeholder: formValues.placeholder,
      helpText: formValues.helpText,
      required: formValues.required,
      validation: Object.keys(validation).length > 0 ? validation : undefined,
      defaultValue: formValues.defaultValue,
      conditional,
      disabled: formValues.disabled,
      readOnly: formValues.readOnly,
    };

    this.saveChanges.emit(updatedField);
    this.visible.set(false);
  }

  /**
   * Cancel handler
   */
  onCancel(): void {
    this.cancel.emit();
    this.visible.set(false);
  }

  /**
   * Delete field handler
   */
  onDeleteField(): void {
    this.deleteField.emit();
    this.visible.set(false);
  }
}
