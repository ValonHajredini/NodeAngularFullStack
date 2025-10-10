import {
  Component,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  inject,
  OnInit,
  OnDestroy,
  signal,
  effect,
  computed,
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
import { InputTextModule } from 'primeng/inputtext';
import { Checkbox } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { ButtonDirective } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Accordion, AccordionPanel } from 'primeng/accordion';
import { Tooltip } from 'primeng/tooltip';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  FormField,
  FormFieldType,
  FormFieldOption,
  isInputField,
  isDisplayElement,
} from '@nodeangularfullstack/shared';
import { FormBuilderService } from '../form-builder.service';
import { Subject, takeUntil, debounceTime, map, distinctUntilChanged } from 'rxjs';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import {
  sanitizeCustomBackground,
  containsDangerousPatterns,
} from '../../../../../shared/utils/sanitizer';
import { validateCSS, CSSValidationResult } from '../../../../../shared/utils/css-validator';
import { AccordionStateService } from './accordion-state.service';
import { CssValidatorService } from '../../../../../shared/services/css-validator.service';
import { Message } from 'primeng/message';
import { ValidationPresetsService, ValidationPreset } from './validation-presets.service';
// Custom validators (Story 16.6)
import { uniqueFieldNameValidator } from './validators/unique-field-name.validator';
import { regexSyntaxValidator } from './validators/regex-syntax.validator';
import { minMaxRangeValidator } from './validators/min-max-range.validator';
// Slug utility (Story 16.6)
import { slugify } from './utils/slugify.util';
// Field-type specific property panels (Story 16.4)
import { HeadingPropertiesPanelComponent } from './panels/heading-properties-panel.component';
import { ImagePropertiesPanelComponent } from './panels/image-properties-panel.component';
import { TextBlockPropertiesPanelComponent } from './panels/text-block-properties-panel.component';
import { OptionsPropertiesPanelComponent } from './panels/options-properties-panel.component';
import { FilePropertiesPanelComponent } from './panels/file-properties-panel.component';
import { GroupPropertiesPanelComponent } from './panels/group-properties-panel.component';

/**
 * Field properties component for editing selected field properties.
 * Displays a form for configuring field attributes.
 */
@Component({
  selector: 'app-field-properties',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    InputTextModule,
    Checkbox,
    TextareaModule,
    ButtonDirective,
    Select,
    InputNumber,
    ToggleSwitch,
    Accordion,
    AccordionPanel,
    Tooltip,
    MonacoEditorModule,
    Message,
    // Field-type specific property panels
    HeadingPropertiesPanelComponent,
    ImagePropertiesPanelComponent,
    TextBlockPropertiesPanelComponent,
    OptionsPropertiesPanelComponent,
    FilePropertiesPanelComponent,
    GroupPropertiesPanelComponent,
  ],
  template: `
    <div class="field-properties h-full bg-white border-l border-gray-200 overflow-y-auto">
      <div class="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <h3 class="text-lg font-semibold text-gray-900">Field Properties</h3>
      </div>

      @if (!formBuilderService.selectedField()) {
        <div class="empty-state p-6 text-center">
          <i class="pi pi-cog text-5xl text-gray-300 mb-4 block"></i>
          <p class="text-gray-600">Select a field to configure its properties</p>
        </div>
      } @else {
        <div class="p-4">
          <div class="mb-4 flex flex-wrap gap-2">
            <span class="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
              {{ formBuilderService.selectedField()!.type }}
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

          <form [formGroup]="propertiesForm">
            <p-accordion
              [multiple]="isMobile()"
              [(value)]="activeIndex"
              (valueChange)="onAccordionChange($event)"
              class="w-full"
            >
              <!-- Basic Properties Panel -->
              <p-accordionpanel header="Basic Properties">
                <div class="space-y-4">
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
                      (blur)="onLabelBlur()"
                      [attr.aria-invalid]="
                        propertiesForm.get('label')?.invalid && propertiesForm.get('label')?.touched
                      "
                      [attr.aria-describedby]="
                        propertiesForm.get('label')?.invalid && propertiesForm.get('label')?.touched
                          ? 'label-error'
                          : null
                      "
                    />
                    @if (
                      propertiesForm.get('label')?.invalid && propertiesForm.get('label')?.touched
                    ) {
                      <p-message
                        severity="error"
                        id="label-error"
                        aria-live="polite"
                        styleClass="w-full mt-2"
                      >
                        <div class="flex items-center gap-2">
                          <i class="pi pi-exclamation-circle"></i>
                          <span>Label is required</span>
                        </div>
                      </p-message>
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
                      [attr.aria-invalid]="
                        propertiesForm.get('fieldName')?.invalid &&
                        propertiesForm.get('fieldName')?.touched
                      "
                      [attr.aria-describedby]="
                        propertiesForm.get('fieldName')?.invalid &&
                        propertiesForm.get('fieldName')?.touched
                          ? 'fieldname-error'
                          : null
                      "
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
                        id="fieldname-error"
                        aria-live="polite"
                        styleClass="w-full mt-2"
                      >
                        <div class="flex items-center gap-2">
                          <i class="pi pi-exclamation-circle"></i>
                          <span>Field name is required</span>
                        </div>
                      </p-message>
                    }
                    @if (
                      propertiesForm.get('fieldName')?.errors?.['pattern'] &&
                      propertiesForm.get('fieldName')?.touched
                    ) {
                      <p-message
                        severity="error"
                        id="fieldname-error"
                        aria-live="polite"
                        styleClass="w-full mt-2"
                      >
                        <div class="flex items-center gap-2">
                          <i class="pi pi-exclamation-circle"></i>
                          <span
                            >Must use lowercase letters, numbers, and underscores only (e.g.,
                            first_name, email_address)</span
                          >
                        </div>
                      </p-message>
                    }
                    @if (
                      propertiesForm.get('fieldName')?.errors?.['duplicateFieldName'] &&
                      propertiesForm.get('fieldName')?.touched
                    ) {
                      <p-message
                        severity="error"
                        id="fieldname-error"
                        aria-live="polite"
                        styleClass="w-full mt-2"
                      >
                        <div class="flex items-center gap-2">
                          <i class="pi pi-exclamation-circle"></i>
                          <span>Field name must be unique within this form</span>
                        </div>
                      </p-message>
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
                      <p-toggleSwitch
                        formControlName="defaultValue"
                        inputId="defaultValue"
                      ></p-toggleSwitch>
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
              </p-accordionpanel>

              <!-- Validation Panel (conditional on input field types) -->
              @if (showValidationSection()) {
                <p-accordionpanel header="Validation">
                  <div class="space-y-4">
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

                      <!-- Min/Max Range Error (Story 16.6 - Task 6) -->
                      @if (
                        propertiesForm.hasError('minMaxRange') &&
                        (propertiesForm.get('minValue')?.touched ||
                          propertiesForm.get('maxValue')?.touched)
                      ) {
                        <p-message severity="error" aria-live="polite" styleClass="w-full mt-2">
                          <div class="flex items-center gap-2">
                            <i class="pi pi-exclamation-circle"></i>
                            <span>Minimum must be less than or equal to maximum</span>
                          </div>
                        </p-message>
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

                      <!-- Min/Max Range Error (Story 16.6 - Task 6) -->
                      @if (
                        propertiesForm.hasError('minMaxRange') &&
                        (propertiesForm.get('minLength')?.touched ||
                          propertiesForm.get('maxLength')?.touched)
                      ) {
                        <p-message severity="error" aria-live="polite" styleClass="w-full mt-2">
                          <div class="flex items-center gap-2">
                            <i class="pi pi-exclamation-circle"></i>
                            <span>Minimum must be less than or equal to maximum</span>
                          </div>
                        </p-message>
                      }

                      <!-- Pattern Preset Dropdown (Story 16.3) -->
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
                          [disabled]="selectedPreset?.name !== 'custom'"
                          [attr.aria-invalid]="
                            propertiesForm.get('pattern')?.invalid &&
                            propertiesForm.get('pattern')?.touched
                          "
                          [attr.aria-describedby]="
                            propertiesForm.get('pattern')?.invalid &&
                            propertiesForm.get('pattern')?.touched
                              ? 'pattern-error'
                              : null
                          "
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
                            id="pattern-error"
                            aria-live="polite"
                            styleClass="w-full mt-2"
                          >
                            <div class="flex items-center gap-2">
                              <i class="pi pi-exclamation-circle"></i>
                              <span
                                >Invalid regex pattern:
                                {{
                                  propertiesForm.get('pattern')?.errors?.['invalidRegex']?.message
                                }}</span
                              >
                            </div>
                          </p-message>
                        }
                      </div>

                      <!-- Custom Error Message (Story 16.3) -->
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
                        <p-toggleSwitch
                          formControlName="emailFormat"
                          inputId="emailFormat"
                        ></p-toggleSwitch>
                        <label for="emailFormat" class="ml-2 text-sm font-medium text-gray-700">
                          Strict email validation
                        </label>
                      </div>
                    }
                  </div>
                </p-accordionpanel>
              }

              <!-- Styling Panel -->
              <p-accordionpanel header="Styling">
                <div class="space-y-4">
                  <div class="field">
                    <label for="customStyle" class="block text-sm font-medium text-gray-700 mb-1">
                      Custom CSS
                    </label>
                    <textarea
                      pTextarea
                      id="customStyle"
                      formControlName="customStyle"
                      class="w-full font-mono text-sm"
                      rows="8"
                      placeholder="Enter custom CSS (e.g., color: blue; padding: 10px;)"
                      (blur)="onCustomStyleBlur()"
                    ></textarea>

                    <!-- Character counter -->
                    <div class="flex justify-between items-center mt-1">
                      <small class="text-gray-500 text-xs">
                        Custom CSS properties to style this field
                      </small>
                      <small
                        [class.text-gray-500]="
                          (propertiesForm.get('customStyle')?.value?.length || 0) <= 5000
                        "
                        [class.text-red-500]="
                          (propertiesForm.get('customStyle')?.value?.length || 0) > 5000
                        "
                        class="text-xs font-medium"
                      >
                        {{ propertiesForm.get('customStyle')?.value?.length || 0 }}/5000
                      </small>
                    </div>

                    <!-- Validation errors -->
                    @if (propertiesForm.get('customStyle')?.errors?.['maxlength']) {
                      <small class="text-red-500 text-xs block mt-1">
                        CSS exceeds maximum length of 5000 characters
                      </small>
                    }

                    <!-- CSS validation warnings -->
                    @if (customStyleWarnings().length > 0) {
                      <div class="mt-2 space-y-1">
                        @for (warning of customStyleWarnings(); track $index) {
                          <p-message severity="warn" [text]="warning" styleClass="w-full" />
                        }
                      </div>
                    }
                  </div>
                </div>
              </p-accordionpanel>

              <!-- Advanced Panel -->
              <p-accordionpanel header="Advanced">
                <div class="space-y-6">
                  <!-- Behavior Settings (for input fields) -->
                  @if (showValidationSection()) {
                    <div class="border-b border-gray-200 pb-4">
                      <h4 class="text-sm font-semibold text-gray-700 mb-3">Behavior Settings</h4>
                      <div class="space-y-3">
                        <div class="field flex items-center">
                          <p-toggleSwitch
                            formControlName="disabled"
                            inputId="disabled"
                          ></p-toggleSwitch>
                          <label for="disabled" class="ml-2 text-sm font-medium text-gray-700">
                            Disabled
                          </label>
                        </div>

                        <div class="field flex items-center">
                          <p-toggleSwitch
                            formControlName="readOnly"
                            inputId="readOnly"
                          ></p-toggleSwitch>
                          <label for="readOnly" class="ml-2 text-sm font-medium text-gray-700">
                            Read-only
                          </label>
                        </div>
                      </div>
                    </div>
                  }

                  <!-- Conditional Visibility Section (for input fields) -->
                  @if (showValidationSection()) {
                    <div class="border-b border-gray-200 pb-4">
                      <h4 class="text-sm font-semibold text-gray-700 mb-3">
                        Conditional Visibility
                      </h4>
                      <div class="space-y-4">
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
                    </div>
                  }

                  <!-- Field-Type Specific Properties (Dynamic Panel Loading) -->
                  <div>
                    <h4 class="text-sm font-semibold text-gray-700 mb-3">
                      Field-Specific Properties
                    </h4>

                    <div>
                      @switch (formBuilderService.selectedField()?.type) {
                        @case ('heading') {
                          <app-heading-properties-panel
                            [field]="formBuilderService.selectedField()!"
                            (fieldChange)="onPanelFieldChange($event)"
                          />
                        }
                        @case ('image') {
                          <app-image-properties-panel
                            [field]="formBuilderService.selectedField()!"
                            (fieldChange)="onPanelFieldChange($event)"
                          />
                        }
                        @case ('text_block') {
                          <app-text-block-properties-panel
                            [field]="formBuilderService.selectedField()!"
                            (fieldChange)="onPanelFieldChange($event)"
                          />
                        }
                        @case ('select') {
                          <app-options-properties-panel
                            [field]="formBuilderService.selectedField()!"
                            (fieldChange)="onPanelFieldChange($event)"
                          />
                        }
                        @case ('radio') {
                          <app-options-properties-panel
                            [field]="formBuilderService.selectedField()!"
                            (fieldChange)="onPanelFieldChange($event)"
                          />
                        }
                        @case ('checkbox') {
                          <app-options-properties-panel
                            [field]="formBuilderService.selectedField()!"
                            (fieldChange)="onPanelFieldChange($event)"
                          />
                        }
                        @case ('file') {
                          <app-file-properties-panel
                            [field]="formBuilderService.selectedField()!"
                            (fieldChange)="onPanelFieldChange($event)"
                          />
                        }
                        @case ('group') {
                          <app-group-properties-panel
                            [field]="formBuilderService.selectedField()!"
                            (fieldChange)="onPanelFieldChange($event)"
                          />
                        }
                        @default {
                          <p class="text-sm text-gray-500 italic">
                            No advanced properties available for this field type.
                          </p>
                        }
                      }
                    </div>
                  </div>
                </div>
              </p-accordionpanel>
            </p-accordion>

            <!-- Action Buttons (Story 16.6 - Task 8) -->
            <div
              class="flex gap-2 pt-4 sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4"
            >
              <button
                pButton
                type="button"
                label="Save Changes"
                icon="pi pi-check"
                [disabled]="propertiesForm.invalid"
                [pTooltip]="propertiesForm.invalid ? 'Fix validation errors before saving' : ''"
                tooltipPosition="top"
                (click)="onSaveField()"
              ></button>
              <button
                pButton
                type="button"
                label="Delete Field"
                icon="pi pi-trash"
                severity="danger"
                [outlined]="true"
                (click)="onDeleteField()"
              ></button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .field-properties {
        min-height: 400px;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
      }
    `,
  ],
})
export class FieldPropertiesComponent implements OnInit, OnDestroy {
  readonly formBuilderService = inject(FormBuilderService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();
  private readonly accordionStateService = inject(AccordionStateService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly cssValidatorService = inject(CssValidatorService);
  private readonly validationPresetsService = inject(ValidationPresetsService);

  propertiesForm: FormGroup;
  readonly hasChanges = signal<boolean>(false);

  // Field name manual edit tracking (Story 16.6)
  private isFieldNameManuallyEdited = false;

  // Custom style validation warnings (Story 16.2)
  readonly customStyleWarnings = signal<string[]>([]);

  // Validation pattern presets (Story 16.3)
  readonly validationPresets: ValidationPreset[] = this.validationPresetsService.getPresets();
  selectedPreset: ValidationPreset | null = null;

  // Accordion state management
  activeIndex = signal<number | number[]>([0]);

  // Mobile responsive behavior
  private readonly isMobile$ = this.breakpointObserver
    .observe([
      Breakpoints.XSmall, // < 600px
      Breakpoints.Small, // 600px - 959px
    ])
    .pipe(map((result) => result.matches));
  readonly isMobile = toSignal(this.isMobile$, { initialValue: false });

  // Computed signal for showing Validation section
  readonly showValidationSection = computed(() => {
    const selectedField = this.formBuilderService.selectedField();
    return selectedField ? isInputField(selectedField.type) : false;
  });

  // Computed signal for field category label
  readonly fieldCategoryLabel = computed(() => {
    const selectedField = this.formBuilderService.selectedField();
    if (!selectedField) return '';
    return isInputField(selectedField.type) ? 'Input' : 'Preview';
  });

  // Computed signal for field category badge color
  readonly fieldCategoryBadgeClass = computed(() => {
    const selectedField = this.formBuilderService.selectedField();
    if (!selectedField) return 'bg-gray-100 text-gray-800';
    return isInputField(selectedField.type)
      ? 'bg-green-100 text-green-800'
      : 'bg-purple-100 text-purple-800';
  });

  @Output() propertyChanged = new EventEmitter<Partial<FormField>>();
  @Output() fieldDeleted = new EventEmitter<void>();

  // Operator options for conditional visibility
  readonly operatorOptions = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equals', value: 'notEquals' },
    { label: 'Contains', value: 'contains' },
  ];

  // Background image position options (kept for backward compatibility)
  readonly positionOptions = [
    { label: 'Cover (fill container)', value: 'cover' },
    { label: 'Contain (fit inside)', value: 'contain' },
    { label: 'Repeat', value: 'repeat' },
  ];

  // Background image alignment options (kept for backward compatibility)
  readonly alignmentOptions = [
    { label: 'Top', value: 'top' },
    { label: 'Center', value: 'center' },
    { label: 'Bottom', value: 'bottom' },
  ];

  // Heading-specific options
  readonly headingLevelOptions = [
    { label: 'H1', value: 'h1' },
    { label: 'H2', value: 'h2' },
    { label: 'H3', value: 'h3' },
    { label: 'H4', value: 'h4' },
    { label: 'H5', value: 'h5' },
    { label: 'H6', value: 'h6' },
  ];

  readonly headingAlignmentOptions = [
    { label: 'Left', value: 'left', icon: 'pi pi-align-left' },
    { label: 'Center', value: 'center', icon: 'pi pi-align-center' },
    { label: 'Right', value: 'right', icon: 'pi pi-align-right' },
  ];

  readonly fontWeightOptions = [
    { label: 'Normal', value: 'normal' },
    { label: 'Bold', value: 'bold' },
  ];

  readonly textBlockAlignmentOptions = [
    { label: 'Left', value: 'left', icon: 'pi pi-align-left' },
    { label: 'Center', value: 'center', icon: 'pi pi-align-center' },
    { label: 'Right', value: 'right', icon: 'pi pi-align-right' },
    { label: 'Justify', value: 'justify', icon: 'pi pi-align-justify' },
  ];

  readonly paddingOptions = [
    { label: 'None', value: 'none' },
    { label: 'Small', value: 'small' },
    { label: 'Medium', value: 'medium' },
    { label: 'Large', value: 'large' },
  ];

  // Image preview URL signal (kept for backward compatibility)
  readonly imagePreviewUrl = signal<string | null>(null);

  // Custom background validation signals (kept for backward compatibility)
  readonly cssValidationErrors = signal<string[]>([]);
  readonly cssValidationWarnings = signal<string[]>([]);
  readonly htmlContainsDangerousPatterns = signal<boolean>(false);

  // Monaco Editor options
  readonly htmlEditorOptions = {
    language: 'html',
    minimap: { enabled: false },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    theme: 'vs-light',
    automaticLayout: true,
    wordWrap: 'on',
  };

  readonly cssEditorOptions = {
    language: 'css',
    minimap: { enabled: false },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    theme: 'vs-light',
    automaticLayout: true,
    wordWrap: 'on',
  };

  constructor() {
    this.propertiesForm = this.fb.group(
      {
        // Basic properties
        label: ['', [Validators.required, Validators.maxLength(200)]],
        fieldName: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[a-z0-9_]+$/), // Allow underscores for slug format
          ],
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

        // Select/Radio specific
        multiSelect: [false],
        options: this.fb.array([]),

        // File upload specific
        acceptedTypes: [''],
        maxFileSize: [null],
        maxFiles: [1],

        // Background image specific (kept for backward compatibility)
        imageUrl: [''],
        imagePosition: ['cover'],
        imageOpacity: [100],
        imageAlignment: ['center'],
        imageBlur: [0],

        // Custom background specific (kept for backward compatibility)
        customHtml: ['', [Validators.maxLength(10000)]],
        customCss: ['', [Validators.maxLength(5000)]],

        // Custom field styling (Story 16.2)
        customStyle: ['', [Validators.maxLength(5000)]],

        // Heading specific
        headingLevel: ['h2'],
        headingAlignment: ['left'],
        headingColor: [''],
        headingFontWeight: ['bold'],

        // Text block specific
        textBlockContent: [
          '<p>Add your instructions here...</p>',
          [Validators.required, Validators.maxLength(5000)],
        ],
        textBlockAlignment: ['left'],
        textBlockBgColor: ['', [this.hexColorValidator()]],
        textBlockPadding: ['medium'],
        textBlockCollapsible: [false],
        textBlockCollapsed: [false],
      },
      {
        validators: [
          minMaxRangeValidator('minLength', 'maxLength'),
          minMaxRangeValidator('minValue', 'maxValue'),
        ],
      },
    );

    // Watch for selected field changes using effect
    effect(() => {
      const selectedField = this.formBuilderService.selectedField();
      if (selectedField) {
        this.loadFieldProperties(selectedField);
      }
    });

    // Watch for mobile state or field changes to update accordion state
    effect(() => {
      const selectedField = this.formBuilderService.selectedField();
      const isMobile = this.isMobile();

      if (!selectedField) return;

      if (isMobile) {
        // On mobile, expand all panels
        this.activeIndex.set([0, 1, 2, 3]);
      } else {
        // On desktop, load saved state or default to Basic Properties
        const savedState = this.accordionStateService.loadAccordionState(selectedField.type);
        this.activeIndex.set(savedState);
      }
    });
  }

  ngOnInit(): void {
    // Setup field name auto-generation (Story 16.6 - Task 3)
    this.setupFieldNameAutoGeneration();

    // Setup instant preview updates for basic properties (Story 16.5 - AC 1, 2, 3)
    this.setupInstantPreviewUpdates();

    // Setup debounced preview updates for custom CSS (Story 16.5 - AC 4)
    this.setupDebouncedCSSPreview();

    // Keep existing debounced form changes for Save button
    this.propertiesForm.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.hasChanges.set(this.propertiesForm.dirty);
        // Note: applyChangesImmediately is now used only when user clicks Save
        // Real-time preview uses instant/debounced update methods
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get FormArray for options
   */
  get options(): FormArray {
    return this.propertiesForm.get('options') as FormArray;
  }

  /**
   * Check if current field is a number type
   */
  isNumberField(): boolean {
    const fieldType = this.formBuilderService.selectedField()?.type;
    return fieldType === FormFieldType.NUMBER;
  }

  /**
   * Check if current field is a text type
   */
  isTextField(): boolean {
    const fieldType = this.formBuilderService.selectedField()?.type;
    return fieldType === FormFieldType.TEXT || fieldType === FormFieldType.TEXTAREA;
  }

  /**
   * Check if current field is email type
   */
  isEmailField(): boolean {
    const fieldType = this.formBuilderService.selectedField()?.type;
    return fieldType === FormFieldType.EMAIL;
  }

  /**
   * Check if current field is checkbox or toggle
   */
  isCheckboxOrToggle(): boolean {
    const fieldType = this.formBuilderService.selectedField()?.type;
    return fieldType === FormFieldType.CHECKBOX || fieldType === FormFieldType.TOGGLE;
  }

  /**
   * Check if current field is select or radio
   */
  isSelectOrRadio(): boolean {
    const fieldType = this.formBuilderService.selectedField()?.type;
    return fieldType === FormFieldType.SELECT || fieldType === FormFieldType.RADIO;
  }

  /**
   * Check if current field is select
   */
  isSelectField(): boolean {
    const fieldType = this.formBuilderService.selectedField()?.type;
    return fieldType === FormFieldType.SELECT;
  }

  /**
   * Check if current field is file upload
   */
  isFileField(): boolean {
    const fieldType = this.formBuilderService.selectedField()?.type;
    return fieldType === FormFieldType.FILE;
  }

  /**
   * Check if current field is heading
   */
  isHeadingField(): boolean {
    const fieldType = this.formBuilderService.selectedField()?.type;
    return fieldType === FormFieldType.HEADING;
  }

  /**
   * Check if current field is text block field
   */
  isTextBlockField(): boolean {
    const fieldType = this.formBuilderService.selectedField()?.type;
    return fieldType === FormFieldType.TEXT_BLOCK;
  }

  /**
   * Check if current field is background image
   * NOTE: Background images are now form-level settings, not fields
   */
  isBackgroundImageField(): boolean {
    return false;
  }

  /**
   * Check if current field is custom background
   * NOTE: Custom backgrounds are now form-level settings, not fields
   */
  isCustomBackgroundField(): boolean {
    return false;
  }

  /**
   * Handler for custom HTML changes
   * NOTE: Custom backgrounds are now form-level settings, not fields
   */
  onCustomHTMLChange(html: string): void {
    // Custom backgrounds are now managed in form-settings.component
    // This method is kept for compatibility but does nothing
  }

  /**
   * Handler for custom CSS changes
   * NOTE: Custom backgrounds are now form-level settings, not fields
   */
  onCustomCSSChange(css: string): void {
    // Custom backgrounds are now managed in form-settings.component
    // This method is kept for compatibility but does nothing
  }

  /**
   * Get list of other fields for conditional visibility
   */
  otherFieldsOptions(): { label: string; value: string }[] {
    const currentField = this.formBuilderService.selectedField();
    if (!currentField) return [];

    return this.formBuilderService
      .formFields()
      .filter((f) => f.id !== currentField.id)
      .map((f) => ({
        label: f.label || f.fieldName,
        value: f.id,
      }));
  }

  /**
   * Custom validator for hex color format
   * Validates 3-digit (#RGB) and 6-digit (#RRGGBB) hex colors
   */
  private hexColorValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null; // Allow empty values

      const hexColorPattern = /^#([0-9A-Fa-f]{3}){1,2}$/;
      const isValid = hexColorPattern.test(control.value);

      return isValid ? null : { invalidHexColor: true };
    };
  }

  /**
   * Handle accordion panel state changes
   * Saves the active panel indices to localStorage (only on desktop)
   */
  onAccordionChange(event: any): void {
    const selectedField = this.formBuilderService.selectedField();
    if (!selectedField) return;

    // Only save state on desktop (mobile always shows all panels)
    if (!this.isMobile()) {
      // event.index can be a number or array of numbers
      this.accordionStateService.saveAccordionState(selectedField.type, event.index);
    }
  }

  /**
   * Load field properties into form
   */
  private loadFieldProperties(field: FormField): void {
    // Reset manual edit flag (Story 16.6 - Task 3)
    this.isFieldNameManuallyEdited = false;

    // Add unique field name validator dynamically (Story 16.6 - Task 2)
    const fieldNameControl = this.propertiesForm.get('fieldName');
    if (fieldNameControl) {
      fieldNameControl.setValidators([
        Validators.required,
        Validators.pattern(/^[a-z0-9_]+$/),
        uniqueFieldNameValidator(this.formBuilderService, field.id),
      ]);
      fieldNameControl.updateValueAndValidity({ emitEvent: false });
    }

    // Clear options array first
    while (this.options.length) {
      this.options.removeAt(0);
    }

    // Load options if present
    if (field.options && field.options.length > 0) {
      field.options.forEach((option) => {
        this.options.push(
          this.fb.group({
            label: [option.label, Validators.required],
            value: [option.value, Validators.required],
          }),
        );
      });
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
        multiSelect: false,
        acceptedTypes: field.validation?.acceptedFileTypes?.join(', ') || '',
        maxFileSize: field.validation?.maxFileSize
          ? field.validation.maxFileSize / (1024 * 1024)
          : null,
        maxFiles: 1,
        // Background image metadata (kept for backward compatibility)
        imageUrl: (field.metadata as any)?.imageUrl || '',
        imagePosition: (field.metadata as any)?.imagePosition || 'cover',
        imageOpacity: (field.metadata as any)?.imageOpacity ?? 100,
        imageAlignment: (field.metadata as any)?.imageAlignment || 'center',
        imageBlur: (field.metadata as any)?.imageBlur ?? 0,
        // Custom background metadata (kept for backward compatibility)
        customHtml: (field.metadata as any)?.html || '',
        customCss: (field.metadata as any)?.css || '',
        // Heading metadata
        headingLevel: (field.metadata as any)?.headingLevel || 'h2',
        headingAlignment: (field.metadata as any)?.alignment || 'left',
        headingColor: (field.metadata as any)?.color || '',
        headingFontWeight: (field.metadata as any)?.fontWeight || 'bold',
        // Text block metadata
        textBlockContent:
          (field.metadata as any)?.content || '<p>Add your instructions here...</p>',
        textBlockAlignment: (field.metadata as any)?.alignment || 'left',
        textBlockBgColor: (field.metadata as any)?.backgroundColor || '',
        textBlockPadding: (field.metadata as any)?.padding || 'medium',
        textBlockCollapsible: (field.metadata as any)?.collapsible || false,
        textBlockCollapsed: (field.metadata as any)?.collapsed || false,
        // Custom styling (Story 16.2)
        customStyle: (field.metadata as any)?.customStyle || '',
      },
      { emitEvent: false },
    );

    // Set image preview if URL exists (kept for backward compatibility)
    const imageUrl = (field.metadata as any)?.imageUrl;
    if (imageUrl) {
      this.imagePreviewUrl.set(imageUrl);
    } else {
      this.imagePreviewUrl.set(null);
    }

    // Reset custom background validation signals (kept for backward compatibility)
    this.cssValidationErrors.set([]);
    this.cssValidationWarnings.set([]);
    this.htmlContainsDangerousPatterns.set(false);

    // Background fields are no longer supported as field types
    // They are now form-level settings managed in form-settings.component

    // Add IMAGE-specific validation for alt text (Story 16.6 - Task 4)
    if (field.type === FormFieldType.IMAGE) {
      const altText = (field.metadata as any)?.altText || '';
      if (!this.propertiesForm.contains('altText')) {
        this.propertiesForm.addControl('altText', this.fb.control(altText, Validators.required));
      } else {
        this.propertiesForm.get('altText')?.setValue(altText, { emitEvent: false });
        this.propertiesForm.get('altText')?.setValidators(Validators.required);
        this.propertiesForm.get('altText')?.updateValueAndValidity({ emitEvent: false });
      }
    } else {
      // Remove alt text control for non-IMAGE fields
      if (this.propertiesForm.contains('altText')) {
        this.propertiesForm.removeControl('altText');
      }
    }

    this.propertiesForm.markAsPristine();
    this.hasChanges.set(false);
  }

  /**
   * Auto-generate field name from label on blur (Story 16.6 - Task 3)
   * NOTE: This is for backward compatibility. Auto-generation is now handled
   * in setupFieldNameAutoGeneration() which runs on label value changes.
   */
  onLabelBlur(): void {
    const labelControl = this.propertiesForm.get('label');
    const fieldNameControl = this.propertiesForm.get('fieldName');

    if (labelControl?.value && !this.isFieldNameManuallyEdited && !fieldNameControl?.value) {
      const generatedFieldName = slugify(labelControl.value);
      fieldNameControl?.setValue(generatedFieldName, { emitEvent: false });
    }
  }

  /**
   * Apply changes immediately (for live canvas preview)
   */
  private applyChangesImmediately(): void {
    if (this.propertiesForm.invalid) return;

    const fieldIndex = this.formBuilderService.selectedFieldIndex();
    if (fieldIndex < 0) return;

    const currentField = this.formBuilderService.selectedField();
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
    if (formValues.acceptedTypes) {
      validation.acceptedFileTypes = formValues.acceptedTypes
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);
    }
    if (formValues.maxFileSize) {
      validation.maxFileSize = formValues.maxFileSize * 1024 * 1024; // Convert MB to bytes
    }

    // Build conditional object
    let conditional = undefined;
    if (formValues.showIfField) {
      conditional = {
        watchFieldId: formValues.showIfField,
        operator: formValues.showIfOperator,
        value: formValues.showIfValue,
      };
    }

    // Build options array
    const options = this.options.value.length > 0 ? this.options.value : undefined;

    // Build metadata object (GROUP, HEADING, and TEXT_BLOCK fields)
    let metadata: any = currentField.metadata || {};
    if (currentField.type === FormFieldType.HEADING) {
      metadata = {
        headingLevel: formValues.headingLevel,
        alignment: formValues.headingAlignment,
        color: formValues.headingColor || undefined,
        fontWeight: formValues.headingFontWeight,
        customStyle: formValues.customStyle || undefined,
      };
    } else if (currentField.type === FormFieldType.TEXT_BLOCK) {
      metadata = {
        content: formValues.textBlockContent,
        alignment: formValues.textBlockAlignment,
        backgroundColor: formValues.textBlockBgColor || undefined,
        padding: formValues.textBlockPadding,
        collapsible: formValues.textBlockCollapsible,
        collapsed: formValues.textBlockCollapsed,
        customStyle: formValues.customStyle || undefined,
      };
    } else {
      // For all other field types, just add customStyle to existing metadata
      metadata = {
        ...metadata,
        customStyle: formValues.customStyle || undefined,
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
      options,
      conditional,
      metadata,
    };

    this.formBuilderService.updateField(fieldIndex, updatedField);
    // Update selection to trigger canvas re-render
    this.formBuilderService.selectField(updatedField);
    this.propertyChanged.emit(updatedField);
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
   * Add new option to select/radio field
   */
  addOption(): void {
    this.options.push(
      this.fb.group({
        label: ['', Validators.required],
        value: ['', Validators.required],
      }),
    );
    this.propertiesForm.markAsDirty();
  }

  /**
   * Remove option from select/radio field
   */
  removeOption(index: number): void {
    this.options.removeAt(index);
    this.propertiesForm.markAsDirty();
  }

  /**
   * Reorder options via drag and drop
   */
  onOptionsReorder(event: CdkDragDrop<any>): void {
    const optionsArray = this.options.controls;
    moveItemInArray(optionsArray, event.previousIndex, event.currentIndex);
    this.options.patchValue(optionsArray.map((c) => c.value));
    this.propertiesForm.markAsDirty();
  }

  /**
   * Handle image file selection for background image
   * Converts image to base64 data URL for storage
   * NOTE: Background images are now form-level settings, not fields
   */
  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF, WebP)');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      alert('Image file size must be less than 5MB');
      return;
    }

    // Read file and convert to base64
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const dataUrl = e.target?.result as string;
      this.propertiesForm.patchValue({ imageUrl: dataUrl });
      this.imagePreviewUrl.set(dataUrl);
      this.propertiesForm.markAsDirty();
    };
    reader.onerror = () => {
      alert('Error reading image file. Please try again.');
    };
    reader.readAsDataURL(file);
  }

  /**
   * Validate custom CSS on blur (debounced)
   * Shows warnings for potentially dangerous patterns
   */
  onCustomStyleBlur(): void {
    const customStyle = this.propertiesForm.get('customStyle')?.value || '';

    if (!customStyle.trim()) {
      this.customStyleWarnings.set([]);
      return;
    }

    // Use debounced validation (500ms delay)
    setTimeout(() => {
      const validationResult = this.cssValidatorService.validateCSS(customStyle);
      this.customStyleWarnings.set(validationResult.warnings);
    }, 500);
  }

  /**
   * Handle validation preset selection change (Story 16.3)
   * Auto-fills pattern input with selected preset regex
   */
  onPresetChange(event: any): void {
    const preset: ValidationPreset = event.value;
    if (preset) {
      this.selectedPreset = preset;
      if (preset.name !== 'custom') {
        // Auto-fill pattern with preset regex
        this.propertiesForm.patchValue({ pattern: preset.pattern });
      }
      // Mark form as dirty to trigger live update
      this.propertiesForm.markAsDirty();
    }
  }

  /**
   * Handle field changes from field-type specific panels (Story 16.4)
   * Updates the field in FormBuilderService when panel emits changes
   */
  onPanelFieldChange(updatedField: FormField): void {
    const fieldIndex = this.formBuilderService.selectedFieldIndex();
    if (fieldIndex >= 0) {
      this.formBuilderService.updateField(fieldIndex, updatedField);
      // Update selection to trigger canvas re-render
      this.formBuilderService.selectField(updatedField);
      this.propertyChanged.emit(updatedField);
    }
  }

  /**
   * Setup instant preview updates for basic properties (Story 16.5 - AC 1, 2, 3).
   * Updates canvas immediately as user types (no debounce).
   * Does NOT mark form as dirty (preview-only).
   * @private
   */
  private setupInstantPreviewUpdates(): void {
    // Label instant updates
    this.propertiesForm
      .get('label')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((label) => {
        const currentField = this.formBuilderService.selectedField();
        if (currentField) {
          this.formBuilderService.updateFieldPropertyInstant(currentField.id, { label });
        }
      });

    // Placeholder instant updates
    this.propertiesForm
      .get('placeholder')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((placeholder) => {
        const currentField = this.formBuilderService.selectedField();
        if (currentField) {
          this.formBuilderService.updateFieldPropertyInstant(currentField.id, { placeholder });
        }
      });

    // Required toggle instant updates
    this.propertiesForm
      .get('required')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((required) => {
        const currentField = this.formBuilderService.selectedField();
        if (currentField) {
          this.formBuilderService.updateFieldPropertyInstant(currentField.id, { required });
        }
      });
  }

  /**
   * Setup debounced preview updates for custom CSS (Story 16.5 - AC 4).
   * Updates canvas after 300ms delay to prevent lag on every keystroke.
   * Does NOT mark form as dirty (preview-only).
   * @private
   */
  private setupDebouncedCSSPreview(): void {
    // Custom CSS debounced updates (300ms)
    this.propertiesForm
      .get('customStyle')
      ?.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((customStyle) => {
        const currentField = this.formBuilderService.selectedField();
        if (currentField) {
          const metadata = { ...(currentField.metadata || {}), customStyle };
          this.formBuilderService.updateFieldPropertyDebounced(currentField.id, { metadata });
        }
      });
  }

  /**
   * Setup field name auto-generation from label (Story 16.6 - Task 3).
   * Auto-generates fieldName from label using slug format (underscores).
   * Stops auto-generation if user manually edits fieldName.
   * @private
   */
  private setupFieldNameAutoGeneration(): void {
    // Track manual edits to fieldName
    this.propertiesForm
      .get('fieldName')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Mark as manually edited only if user actually typed something
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
            { emitEvent: false }, // Don't trigger manual edit flag
          );
        }
      });
  }

  /**
   * Save field properties (Story 16.6 - Task 8)
   * Validates form and applies changes permanently
   */
  onSaveField(): void {
    if (this.propertiesForm.invalid) {
      // Mark all fields as touched to show errors
      Object.keys(this.propertiesForm.controls).forEach((key) => {
        this.propertiesForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Apply changes immediately to FormBuilderService
    this.applyChangesImmediately();

    // Mark form as pristine after successful save
    this.propertiesForm.markAsPristine();
    this.hasChanges.set(false);
  }

  /**
   * Delete the selected field
   */
  onDeleteField(): void {
    const selectedField = this.formBuilderService.selectedField();
    if (selectedField) {
      this.formBuilderService.removeField(selectedField.id);
      this.fieldDeleted.emit();
    }
  }
}
