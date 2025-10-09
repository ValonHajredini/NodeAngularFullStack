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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Checkbox } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { ButtonDirective } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Panel } from 'primeng/panel';
import { Slider } from 'primeng/slider';
import { ColorPicker } from 'primeng/colorpicker';
import { SelectButton } from 'primeng/selectbutton';
import { CdkDrag, CdkDropList, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormField, FormFieldType, FormFieldOption } from '@nodeangularfullstack/shared';
import { FormBuilderService } from '../form-builder.service';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import {
  sanitizeCustomBackground,
  containsDangerousPatterns,
} from '../../../../../shared/utils/sanitizer';
import { validateCSS, CSSValidationResult } from '../../../../../shared/utils/css-validator';

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
    InputTextModule,
    Checkbox,
    TextareaModule,
    ButtonDirective,
    Select,
    InputNumber,
    ToggleSwitch,
    Panel,
    Slider,
    ColorPicker,
    SelectButton,
    CdkDrag,
    CdkDropList,
    MonacoEditorModule,
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
        <div class="p-4 space-y-4">
          <div class="mb-4">
            <span class="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
              {{ formBuilderService.selectedField()!.type }}
            </span>
          </div>

          <form [formGroup]="propertiesForm" class="space-y-6">
            <!-- Basic Properties Section -->
            <p-panel header="Basic Properties" [toggleable]="true">
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
                  />
                  @if (
                    propertiesForm.get('label')?.invalid && propertiesForm.get('label')?.touched
                  ) {
                    <small class="text-red-500 text-xs"
                      >Label is required (max 200 characters)</small
                    >
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
                    class="w-full"
                    placeholder="Enter field name"
                  />
                  @if (
                    propertiesForm.get('fieldName')?.errors?.['required'] &&
                    propertiesForm.get('fieldName')?.touched
                  ) {
                    <small class="text-red-500 text-xs">Field name is required</small>
                  }
                  @if (propertiesForm.get('fieldName')?.errors?.['pattern']) {
                    <small class="text-red-500 text-xs"
                      >Must be kebab-case (e.g., first-name)</small
                    >
                  }
                  @if (propertiesForm.get('fieldName')?.errors?.['duplicateFieldName']) {
                    <small class="text-red-500 text-xs">Field name must be unique</small>
                  }
                  <small class="text-gray-500 text-xs">
                    Used in form data (e.g., first-name, email-address)
                  </small>
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
              </div>
            </p-panel>

            <!-- Validation Properties Section -->
            <p-panel header="Validation" [toggleable]="true">
              <div class="space-y-4">
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

                  <div class="field">
                    <label for="pattern" class="block text-sm font-medium text-gray-700 mb-1">
                      Regex Pattern
                    </label>
                    <input
                      pInputText
                      id="pattern"
                      formControlName="pattern"
                      class="w-full"
                      placeholder="^[A-Za-z]+$"
                    />
                    @if (propertiesForm.get('pattern')?.errors?.['invalidPattern']) {
                      <small class="text-red-500 text-xs">Invalid regular expression</small>
                    }
                    <small class="text-gray-500 text-xs">
                      Regular expression for custom validation
                    </small>
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
            </p-panel>

            <!-- Behavior Properties Section -->
            <p-panel header="Behavior" [toggleable]="true">
              <div class="space-y-4">
                <div class="field flex items-center">
                  <p-toggleSwitch formControlName="disabled" inputId="disabled"></p-toggleSwitch>
                  <label for="disabled" class="ml-2 text-sm font-medium text-gray-700">
                    Disabled
                  </label>
                </div>

                <div class="field flex items-center">
                  <p-toggleSwitch formControlName="readOnly" inputId="readOnly"></p-toggleSwitch>
                  <label for="readOnly" class="ml-2 text-sm font-medium text-gray-700">
                    Read-only
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
            </p-panel>

            <!-- Conditional Visibility Section -->
            <p-panel header="Conditional Visibility" [toggleable]="true" [collapsed]="true">
              <div class="space-y-4">
                <div class="field">
                  <label for="showIfField" class="block text-sm font-medium text-gray-700 mb-1">
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
                    <label for="showIfValue" class="block text-sm font-medium text-gray-700 mb-1">
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
            </p-panel>

            <!-- Select/Radio Options Section -->
            @if (isSelectOrRadio()) {
              <p-panel header="Options" [toggleable]="true">
                <div class="space-y-4">
                  @if (isSelectField()) {
                    <div class="field flex items-center">
                      <p-toggleSwitch
                        formControlName="multiSelect"
                        inputId="multiSelect"
                      ></p-toggleSwitch>
                      <label for="multiSelect" class="ml-2 text-sm font-medium text-gray-700">
                        Allow multiple selections
                      </label>
                    </div>
                  }

                  <div formArrayName="options">
                    <div
                      cdkDropList
                      (cdkDropListDropped)="onOptionsReorder($event)"
                      class="space-y-2"
                    >
                      @for (option of options.controls; track $index; let i = $index) {
                        <div
                          [formGroupName]="i"
                          cdkDrag
                          class="flex gap-2 items-start p-2 border border-gray-200 rounded bg-gray-50"
                        >
                          <i class="pi pi-bars text-gray-400 cursor-move mt-2" cdkDragHandle></i>
                          <div class="flex-1 space-y-2">
                            <input
                              pInputText
                              formControlName="label"
                              placeholder="Option label"
                              class="w-full"
                            />
                            <input
                              pInputText
                              formControlName="value"
                              placeholder="Option value"
                              class="w-full"
                            />
                          </div>
                          <button
                            pButton
                            type="button"
                            icon="pi pi-trash"
                            severity="danger"
                            [text]="true"
                            (click)="removeOption(i)"
                          ></button>
                        </div>
                      }
                    </div>
                  </div>

                  <button
                    pButton
                    type="button"
                    label="Add Option"
                    icon="pi pi-plus"
                    severity="secondary"
                    size="small"
                    (click)="addOption()"
                  ></button>
                </div>
              </p-panel>
            }

            <!-- File Upload Settings Section -->
            @if (isFileField()) {
              <p-panel header="File Upload Settings" [toggleable]="true">
                <div class="space-y-4">
                  <div class="field">
                    <label for="acceptedTypes" class="block text-sm font-medium text-gray-700 mb-1">
                      Accepted File Types
                    </label>
                    <input
                      pInputText
                      id="acceptedTypes"
                      formControlName="acceptedTypes"
                      class="w-full"
                      placeholder="image/*, application/pdf, .docx"
                    />
                    <small class="text-gray-500 text-xs">
                      Comma-separated MIME types or extensions
                    </small>
                  </div>

                  <div class="field">
                    <label for="maxFileSize" class="block text-sm font-medium text-gray-700 mb-1">
                      Max File Size (MB)
                    </label>
                    <p-inputNumber
                      formControlName="maxFileSize"
                      inputId="maxFileSize"
                      [showButtons]="true"
                      [min]="1"
                      [max]="100"
                      class="w-full"
                    />
                  </div>

                  <div class="field">
                    <label for="maxFiles" class="block text-sm font-medium text-gray-700 mb-1">
                      Max Files
                    </label>
                    <p-inputNumber
                      formControlName="maxFiles"
                      inputId="maxFiles"
                      [showButtons]="true"
                      [min]="1"
                      [max]="10"
                      class="w-full"
                    />
                  </div>
                </div>
              </p-panel>
            }

            <!-- Heading Settings Section -->
            @if (isHeadingField()) {
              <p-panel header="Heading Settings" [toggleable]="true">
                <div class="space-y-4">
                  <div class="field">
                    <label for="headingText" class="block text-sm font-medium text-gray-700 mb-1">
                      Heading Text <span class="text-red-500">*</span>
                    </label>
                    <input
                      pInputText
                      id="headingText"
                      formControlName="label"
                      class="w-full"
                      placeholder="Enter heading text"
                    />
                    <small class="text-gray-500 text-xs">
                      This text will be displayed as the heading
                    </small>
                  </div>

                  <div class="field">
                    <label for="headingLevel" class="block text-sm font-medium text-gray-700 mb-1">
                      Heading Level
                    </label>
                    <p-select
                      formControlName="headingLevel"
                      inputId="headingLevel"
                      [options]="headingLevelOptions"
                      optionLabel="label"
                      optionValue="value"
                      class="w-full"
                    />
                    <small class="text-gray-500 text-xs">
                      H1 is largest, H6 is smallest (H2 recommended for sections)
                    </small>
                  </div>

                  <div class="field">
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Text Alignment
                    </label>
                    <p-selectbutton
                      formControlName="headingAlignment"
                      [options]="headingAlignmentOptions"
                      optionLabel="label"
                      optionValue="value"
                    />
                  </div>

                  <div class="field">
                    <label for="headingColor" class="block text-sm font-medium text-gray-700 mb-1">
                      Text Color
                    </label>
                    <p-colorpicker
                      formControlName="headingColor"
                      inputId="headingColor"
                      format="hex"
                    />
                    <small class="text-gray-500 text-xs"> Leave empty for default color </small>
                  </div>

                  <div class="field">
                    <label
                      for="headingFontWeight"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Font Weight
                    </label>
                    <p-select
                      formControlName="headingFontWeight"
                      inputId="headingFontWeight"
                      [options]="fontWeightOptions"
                      optionLabel="label"
                      optionValue="value"
                      class="w-full"
                    />
                  </div>
                </div>
              </p-panel>
            }

            <!-- Background Image Settings Section -->
            @if (isBackgroundImageField()) {
              <p-panel header="Background Image Settings" [toggleable]="true">
                <div class="space-y-4">
                  <div class="field">
                    <label for="imageUrl" class="block text-sm font-medium text-gray-700 mb-1">
                      Image URL
                    </label>
                    <input
                      pInputText
                      id="imageUrl"
                      formControlName="imageUrl"
                      class="w-full"
                      placeholder="https://example.com/image.jpg"
                    />
                    <small class="text-gray-500 text-xs">
                      Enter a URL or upload an image below
                    </small>
                  </div>

                  <div class="field">
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Or Upload Image
                    </label>
                    <input
                      #fileInput
                      type="file"
                      accept="image/*"
                      (change)="onImageFileSelected($event)"
                      class="hidden"
                    />
                    <button
                      pButton
                      type="button"
                      label="Choose Image"
                      icon="pi pi-upload"
                      severity="secondary"
                      size="small"
                      (click)="fileInput.click()"
                    ></button>
                    <small class="text-gray-500 text-xs block mt-1">
                      Max 5MB (JPG, PNG, GIF, WebP)
                    </small>
                  </div>

                  @if (imagePreviewUrl()) {
                    <div class="field">
                      <label class="block text-sm font-medium text-gray-700 mb-1">Preview</label>
                      <img
                        [src]="imagePreviewUrl()"
                        alt="Background preview"
                        class="w-full h-32 object-cover rounded border border-gray-300"
                      />
                    </div>
                  }

                  <div class="field">
                    <label for="imagePosition" class="block text-sm font-medium text-gray-700 mb-1">
                      Background Size
                    </label>
                    <p-select
                      formControlName="imagePosition"
                      [options]="positionOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Select background size"
                      class="w-full"
                    />
                  </div>

                  <div class="field">
                    <label
                      for="imageAlignment"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Alignment
                    </label>
                    <p-select
                      formControlName="imageAlignment"
                      [options]="alignmentOptions"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Select alignment"
                      class="w-full"
                    />
                  </div>

                  <div class="field">
                    <label for="imageOpacity" class="block text-sm font-medium text-gray-700 mb-1">
                      Opacity: {{ propertiesForm.get('imageOpacity')?.value || 100 }}%
                    </label>
                    <p-slider formControlName="imageOpacity" [min]="0" [max]="100" class="w-full" />
                  </div>

                  <div class="field">
                    <label for="imageBlur" class="block text-sm font-medium text-gray-700 mb-1">
                      Blur: {{ propertiesForm.get('imageBlur')?.value || 0 }}px
                    </label>
                    <p-slider formControlName="imageBlur" [min]="0" [max]="20" class="w-full" />
                    <small class="text-gray-500 text-xs">
                      Apply blur effect to background image (0-20 pixels)
                    </small>
                  </div>
                </div>
              </p-panel>
            }

            <!-- Custom Background Settings Section -->
            @if (isCustomBackgroundField()) {
              <p-panel header="Custom Background Settings" [toggleable]="true">
                <div class="space-y-4">
                  <!-- Security Warning -->
                  <div class="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                    <div class="flex items-start gap-2">
                      <i class="pi pi-exclamation-triangle text-yellow-600 mt-1"></i>
                      <div>
                        <p class="text-sm font-medium text-yellow-800">Security Notice</p>
                        <p class="text-xs text-yellow-700 mt-1">
                          Only whitelisted HTML tags are allowed. All scripts and event handlers are
                          removed automatically.
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- HTML Editor -->
                  <div class="field">
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      HTML Editor
                    </label>
                    <ngx-monaco-editor
                      [options]="htmlEditorOptions"
                      formControlName="customHtml"
                      (ngModelChange)="onCustomHTMLChange($event)"
                      style="height: 200px; border: 1px solid #d1d5db; border-radius: 6px;"
                    ></ngx-monaco-editor>
                    <small class="text-xs text-gray-600 mt-1 block">
                      Allowed tags: div, span, p, h1-h3, style. Max 10000 characters.
                    </small>
                  </div>

                  <!-- CSS Editor -->
                  <div class="field">
                    <label class="block text-sm font-medium text-gray-700 mb-1"> CSS Editor </label>
                    <ngx-monaco-editor
                      [options]="cssEditorOptions"
                      formControlName="customCss"
                      (ngModelChange)="onCustomCSSChange($event)"
                      style="height: 200px; border: 1px solid #d1d5db; border-radius: 6px;"
                    ></ngx-monaco-editor>
                    <small class="text-xs text-gray-600 mt-1 block">
                      Max 5000 characters. JavaScript URLs are not allowed.
                    </small>
                  </div>

                  <!-- Validation Errors -->
                  @if (cssValidationErrors().length > 0) {
                    <div class="bg-red-50 border border-red-200 rounded p-3">
                      <p class="text-sm font-medium text-red-800 mb-2">
                        <i class="pi pi-times-circle mr-1"></i>
                        Validation Errors:
                      </p>
                      <ul class="text-sm text-red-700 list-disc list-inside space-y-1">
                        @for (error of cssValidationErrors(); track error) {
                          <li>{{ error }}</li>
                        }
                      </ul>
                    </div>
                  }

                  <!-- Validation Warnings -->
                  @if (cssValidationWarnings().length > 0) {
                    <div class="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p class="text-sm font-medium text-yellow-800 mb-2">
                        <i class="pi pi-exclamation-triangle mr-1"></i>
                        Warnings:
                      </p>
                      <ul class="text-sm text-yellow-700 list-disc list-inside space-y-1">
                        @for (warning of cssValidationWarnings(); track warning) {
                          <li>{{ warning }}</li>
                        }
                      </ul>
                    </div>
                  }

                  <!-- Dangerous Patterns Warning -->
                  @if (htmlContainsDangerousPatterns()) {
                    <div class="bg-orange-50 border border-orange-200 rounded p-3">
                      <p class="text-sm font-medium text-orange-800">
                        <i class="pi pi-shield mr-1"></i>
                        Dangerous content detected and will be removed
                      </p>
                      <p class="text-xs text-orange-700 mt-1">
                        Your HTML contains scripts or event handlers that will be automatically
                        sanitized.
                      </p>
                    </div>
                  }
                </div>
              </p-panel>
            }

            <!-- Action Buttons -->
            <div
              class="flex gap-2 pt-4 sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4"
            >
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

  propertiesForm: FormGroup;
  readonly hasChanges = signal<boolean>(false);

  @Output() propertyChanged = new EventEmitter<Partial<FormField>>();
  @Output() fieldDeleted = new EventEmitter<void>();

  // Operator options for conditional visibility
  readonly operatorOptions = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equals', value: 'notEquals' },
    { label: 'Contains', value: 'contains' },
  ];

  // Background image position options
  readonly positionOptions = [
    { label: 'Cover (fill container)', value: 'cover' },
    { label: 'Contain (fit inside)', value: 'contain' },
    { label: 'Repeat', value: 'repeat' },
  ];

  // Background image alignment options
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

  // Image preview URL signal
  readonly imagePreviewUrl = signal<string | null>(null);

  // Custom background validation signals
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
    this.propertiesForm = this.fb.group({
      // Basic properties
      label: ['', [Validators.required, Validators.maxLength(200)]],
      fieldName: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[a-z0-9-]+$/),
          this.uniqueFieldNameValidator.bind(this),
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
      pattern: ['', this.regexPatternValidator()],
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

      // Background image specific
      imageUrl: [''],
      imagePosition: ['cover'],
      imageOpacity: [100],
      imageAlignment: ['center'],
      imageBlur: [0],

      // Custom background specific
      customHtml: ['', [Validators.maxLength(10000)]],
      customCss: ['', [Validators.maxLength(5000)]],

      // Heading specific
      headingLevel: ['h2'],
      headingAlignment: ['left'],
      headingColor: [''],
      headingFontWeight: ['bold'],
    });

    // Watch for selected field changes using effect
    effect(() => {
      const selectedField = this.formBuilderService.selectedField();
      if (selectedField) {
        this.loadFieldProperties(selectedField);
      }
    });
  }

  ngOnInit(): void {
    // Subscribe to form value changes for live updates (debounced)
    this.propertiesForm.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.hasChanges.set(this.propertiesForm.dirty);
        if (this.propertiesForm.valid && this.propertiesForm.dirty) {
          this.applyChangesImmediately();
        }
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
   * Custom validator for unique field names
   */
  private uniqueFieldNameValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const currentField = this.formBuilderService.selectedField();
    if (!currentField) return null;

    const isDuplicate = this.formBuilderService
      .formFields()
      .some((f) => f.id !== currentField.id && f.fieldName === control.value);

    return isDuplicate ? { duplicateFieldName: true } : null;
  }

  /**
   * Custom validator for regex patterns
   */
  private regexPatternValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      try {
        new RegExp(control.value);
        return null;
      } catch (e) {
        return { invalidPattern: true };
      }
    };
  }

  /**
   * Load field properties into form
   */
  private loadFieldProperties(field: FormField): void {
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
        // Background image metadata
        imageUrl: (field.metadata as any)?.imageUrl || '',
        imagePosition: (field.metadata as any)?.imagePosition || 'cover',
        imageOpacity: (field.metadata as any)?.imageOpacity ?? 100,
        imageAlignment: (field.metadata as any)?.imageAlignment || 'center',
        imageBlur: (field.metadata as any)?.imageBlur ?? 0,
        // Custom background metadata
        customHtml: (field.metadata as any)?.html || '',
        customCss: (field.metadata as any)?.css || '',
        // Heading metadata
        headingLevel: (field.metadata as any)?.headingLevel || 'h2',
        headingAlignment: (field.metadata as any)?.alignment || 'left',
        headingColor: (field.metadata as any)?.color || '',
        headingFontWeight: (field.metadata as any)?.fontWeight || 'bold',
      },
      { emitEvent: false },
    );

    // Set image preview if URL exists
    const imageUrl = (field.metadata as any)?.imageUrl;
    if (imageUrl) {
      this.imagePreviewUrl.set(imageUrl);
    } else {
      this.imagePreviewUrl.set(null);
    }

    // Reset custom background validation signals
    this.cssValidationErrors.set([]);
    this.cssValidationWarnings.set([]);
    this.htmlContainsDangerousPatterns.set(false);

    // Background fields are no longer supported as field types
    // They are now form-level settings managed in form-settings.component

    this.propertiesForm.markAsPristine();
    this.hasChanges.set(false);
  }

  /**
   * Auto-generate field name from label on blur
   */
  onLabelBlur(): void {
    const labelControl = this.propertiesForm.get('label');
    const fieldNameControl = this.propertiesForm.get('fieldName');

    if (labelControl?.value && !fieldNameControl?.dirty) {
      const generatedFieldName = this.convertToKebabCase(labelControl.value);
      fieldNameControl?.setValue(generatedFieldName);
    }
  }

  /**
   * Convert string to kebab-case
   */
  private convertToKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
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

    // Build metadata object (GROUP and HEADING fields)
    let metadata = currentField.metadata;
    if (currentField.type === FormFieldType.HEADING) {
      metadata = {
        headingLevel: formValues.headingLevel,
        alignment: formValues.headingAlignment,
        color: formValues.headingColor || undefined,
        fontWeight: formValues.headingFontWeight,
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
