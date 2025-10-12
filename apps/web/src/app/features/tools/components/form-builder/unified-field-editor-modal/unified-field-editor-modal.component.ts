import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
  OnInit,
  OnDestroy,
  signal,
  HostListener,
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
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { AccordionModule } from 'primeng/accordion';
import { InputTextModule } from 'primeng/inputtext';
import { Checkbox } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Tooltip } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CdkDrag, CdkDropList, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  FormField,
  FormFieldType,
  isInputField,
  isDisplayElement,
} from '@nodeangularfullstack/shared';
import { FormBuilderService } from '../form-builder.service';
import { ImagePropertiesPanelComponent } from '../field-properties/panels/image-properties-panel.component';
import { ImageUploadComponent } from '../field-properties/panels/image-upload.component';
import { HeadingPropertiesPanelComponent } from '../field-properties/panels/heading-properties-panel.component';
import { TextBlockPropertiesPanelComponent } from '../field-properties/panels/text-block-properties-panel.component';
import { Subject, takeUntil } from 'rxjs';

/**
 * Unified field editor modal component for editing all field properties.
 * Consolidates FieldPropertiesModalComponent and FieldSettingsModalComponent into single interface.
 * Uses tab-based organization for better UX and eliminates confusion about which modal to use.
 * Story 16.8: Consolidate Field Properties and Field Settings Modals
 */
@Component({
  selector: 'app-unified-field-editor-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    TabsModule,
    AccordionModule,
    InputTextModule,
    Checkbox,
    TextareaModule,
    ButtonModule,
    Select,
    InputNumber,
    ToggleSwitch,
    Toast,
    ConfirmDialog,
    Tooltip,
    CdkDrag,
    CdkDropList,
    ImagePropertiesPanelComponent,
    ImageUploadComponent,
    HeadingPropertiesPanelComponent,
    TextBlockPropertiesPanelComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-dialog
      header="Field Properties"
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
      [closeOnEscape]="false"
      [draggable]="false"
      [resizable]="false"
      [blockScroll]="true"
      appendTo="body"
      [style]="{ width: '720px', maxWidth: '90vw', maxHeight: '90vh' }"
      [contentStyle]="{ maxHeight: 'calc(90vh - 180px)', overflow: 'auto' }"
      [attr.aria-keyshortcuts]="'Control+S Escape'"
      (onHide)="onDialogHide()"
      (onShow)="onDialogShow()"
    >
      @if (field) {
        <!-- Keyboard Shortcut Hints (Accessibility) -->
        <div class="sr-only" role="status" aria-live="polite">
          Keyboard shortcuts: Press Control+S to save, Escape to close
        </div>

        <!-- Visible hint and field type -->
        <div class="mb-4 flex items-center justify-between">
          <div class="flex flex-wrap gap-2">
            <span class="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
              {{ field.type }}
            </span>
            <span
              [class]="
                'inline-block text-xs px-3 py-1 rounded-full font-semibold ' +
                (isInputField(field.type)
                  ? 'bg-green-100 text-green-800'
                  : 'bg-purple-100 text-purple-800')
              "
            >
              {{ isInputField(field.type) ? 'Input' : 'Preview' }}
            </span>
          </div>
          <div class="text-xs text-gray-600 flex items-center gap-2">
            <i class="pi pi-info-circle"></i>
            <span>
              <kbd class="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+S</kbd> to save,
              <kbd class="px-1 py-0.5 bg-gray-200 rounded text-xs">ESC</kbd> to close
            </span>
          </div>
        </div>

        <form [formGroup]="propertiesForm" class="space-y-4">
          <p-tabs
            [(value)]="activeTabIndex"
            (valueChange)="onTabChange()"
            [attr.aria-label]="'Field property tabs'"
          >
            <p-tablist>
              <p-tab value="0">Basic</p-tab>
              @if (!isDisplayField()) {
                <p-tab value="1">Validation</p-tab>
              }
              @if (isImageField()) {
                <p-tab value="1">Image Properties</p-tab>
              }
              <p-tab [value]="isImageField() ? '2' : isDisplayField() ? '1' : '2'">Behavior</p-tab>
              <p-tab [value]="isImageField() ? '3' : isDisplayField() ? '2' : '3'"
                >Conditional Visibility</p-tab
              >
              @if (isSelectOrRadioOrCheckbox()) {
                <p-tab [value]="isDisplayField() ? '3' : '4'">Options</p-tab>
              }
              @if (isFileField()) {
                <p-tab [value]="getFileTabIndex()">File Upload</p-tab>
              }
            </p-tablist>

            <p-tabpanels>
              <!-- Basic Tab -->
              <p-tabpanel value="0" [attr.aria-label]="'Basic properties'">
                <div class="space-y-4 pt-4">
                  <!-- Image Upload (for IMAGE field type only) -->
                  @if (field.type === FormFieldType.IMAGE) {
                    <div class="field">
                      <label class="block text-sm font-medium text-gray-700 mb-2">
                        Image Upload
                      </label>
                      <app-image-upload
                        [formId]="formId"
                        [imageUrl]="imagePreviewUrl"
                        (imageUploaded)="onImageUploaded($event)"
                      />
                    </div>
                  }

                  <!-- Label (hidden for IMAGE field type) -->
                  @if (field.type !== FormFieldType.IMAGE) {
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
                        [attr.aria-required]="'true'"
                      />
                      @if (
                        propertiesForm.get('label')?.invalid && propertiesForm.get('label')?.touched
                      ) {
                        <small class="text-red-500 text-xs" role="alert"
                          >Label is required (max 200 characters)</small
                        >
                      }
                    </div>
                  }

                  <!-- Field Name (hidden for preview elements) -->
                  @if (isInputField(field.type)) {
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
                        [attr.aria-required]="'true'"
                      />
                      @if (
                        propertiesForm.get('fieldName')?.errors?.['required'] &&
                        propertiesForm.get('fieldName')?.touched
                      ) {
                        <small class="text-red-500 text-xs" role="alert"
                          >Field name is required</small
                        >
                      }
                      @if (propertiesForm.get('fieldName')?.errors?.['pattern']) {
                        <small class="text-red-500 text-xs" role="alert"
                          >Must be kebab-case (e.g., first-name)</small
                        >
                      }
                      @if (propertiesForm.get('fieldName')?.errors?.['duplicateFieldName']) {
                        <small class="text-red-500 text-xs" role="alert"
                          >Field name must be unique</small
                        >
                      }
                      <small class="text-gray-500 text-xs">
                        Used in form data (e.g., first-name, email-address)
                      </small>
                    </div>
                  }

                  <!-- Placeholder (hidden for preview elements) -->
                  @if (isInputField(field.type)) {
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
                  }

                  <!-- Help Text (hidden for preview elements) -->
                  @if (isInputField(field.type)) {
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
                  }

                  <!-- Heading Properties (for HEADING field type only) -->
                  @if (field.type === FormFieldType.HEADING) {
                    <div class="border-t border-gray-200 pt-4 mt-4">
                      <h4 class="text-sm font-semibold text-gray-700 mb-3">Heading Properties</h4>
                      <app-heading-properties-panel
                        [field]="field"
                        (fieldChange)="onHeadingFieldChange($event)"
                      />
                    </div>
                  }

                  <!-- Text Block Properties (for TEXT_BLOCK field type only) -->
                  @if (field.type === FormFieldType.TEXT_BLOCK) {
                    <div class="border-t border-gray-200 pt-4 mt-4">
                      <h4 class="text-sm font-semibold text-gray-700 mb-3">
                        Text Block Properties
                      </h4>
                      <app-text-block-properties-panel
                        [field]="field"
                        (fieldChange)="onTextBlockFieldChange($event)"
                      />
                    </div>
                  }
                </div>
              </p-tabpanel>

              <!-- Validation Tab (hidden for display-only field types) -->
              @if (!isDisplayField()) {
                <p-tabpanel value="1" [attr.aria-label]="'Validation settings'">
                  <div class="space-y-4 pt-4">
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
                          <small class="text-red-500 text-xs" role="alert"
                            >Invalid regular expression</small
                          >
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
                </p-tabpanel>
              }

              <!-- Image Properties Tab (for IMAGE field type) -->
              @if (isImageField()) {
                <p-tabpanel value="1" [attr.aria-label]="'Image properties'">
                  <div class="pt-4">
                    <app-image-properties-panel
                      [field]="field"
                      [formId]="formId"
                      (fieldChange)="onImageFieldChange($event)"
                    />
                  </div>
                </p-tabpanel>
              }

              <!-- Behavior Tab -->
              <p-tabpanel
                [value]="isImageField() ? '2' : isDisplayField() ? '1' : '2'"
                [attr.aria-label]="'Behavior settings'"
              >
                <div class="space-y-4 pt-4">
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
              </p-tabpanel>

              <!-- Conditional Visibility Tab -->
              <p-tabpanel
                [value]="isDisplayField() ? '2' : '3'"
                [attr.aria-label]="'Conditional visibility'"
              >
                <div class="space-y-4 pt-4">
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
                      inputId="showIfField"
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
                        inputId="showIfOperator"
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
                      [attr.aria-label]="'Clear conditional visibility rule'"
                    ></button>
                  }
                </div>
              </p-tabpanel>

              <!-- Options Tab (for select/radio/checkbox fields) -->
              @if (isSelectOrRadioOrCheckbox()) {
                <p-tabpanel
                  [value]="isDisplayField() ? '3' : '4'"
                  [attr.aria-label]="'Field options'"
                >
                  <div class="space-y-4 pt-4">
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
                        [attr.aria-label]="'Reorderable options list'"
                      >
                        @for (option of options.controls; track $index; let i = $index) {
                          <div
                            [formGroupName]="i"
                            cdkDrag
                            class="flex gap-2 items-start p-2 border border-gray-200 rounded bg-gray-50"
                          >
                            <i
                              class="pi pi-bars text-gray-400 cursor-move mt-2"
                              cdkDragHandle
                              [attr.aria-label]="'Drag to reorder option'"
                            ></i>
                            <div class="flex-1 space-y-2">
                              <input
                                pInputText
                                formControlName="label"
                                placeholder="Option label"
                                class="w-full"
                                (keydown)="onOptionInputKeydown($event)"
                                [attr.aria-label]="'Option label ' + (i + 1)"
                              />
                              <input
                                pInputText
                                formControlName="value"
                                placeholder="Option value"
                                class="w-full"
                                (keydown)="onOptionInputKeydown($event)"
                                [attr.aria-label]="'Option value ' + (i + 1)"
                              />
                            </div>
                            <button
                              pButton
                              type="button"
                              icon="pi pi-trash"
                              severity="danger"
                              [text]="true"
                              (click)="removeOption(i)"
                              [attr.aria-label]="'Remove option ' + (i + 1)"
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
                      [attr.aria-label]="'Add new option'"
                    ></button>
                  </div>
                </p-tabpanel>
              }

              <!-- File Upload Tab (for file fields) -->
              @if (isFileField()) {
                <p-tabpanel [value]="getFileTabIndex()" [attr.aria-label]="'File upload settings'">
                  <div class="space-y-4 pt-4">
                    <div class="field">
                      <label
                        for="acceptedTypes"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
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
                </p-tabpanel>
              }
            </p-tabpanels>
          </p-tabs>
        </form>
      }

      <ng-template pTemplate="footer">
        <div class="flex justify-between items-center gap-2">
          <button
            pButton
            type="button"
            label="Delete Field"
            icon="pi pi-trash"
            severity="danger"
            [outlined]="true"
            (click)="onDeleteField()"
            [attr.aria-label]="'Delete field permanently'"
          ></button>

          <div class="flex items-center gap-3">
            <!-- Dirty indicator -->
            @if (isDirty()) {
              <div
                class="flex items-center gap-2 text-sm text-orange-600"
                role="status"
                aria-live="polite"
              >
                <i class="pi pi-circle-fill text-orange-500" style="font-size: 0.5rem;"></i>
                <span>Unsaved changes</span>
              </div>
            }

            <button
              pButton
              type="button"
              label="Cancel"
              icon="pi pi-times"
              severity="secondary"
              (click)="onCancel()"
              [attr.aria-label]="'Cancel without saving'"
            ></button>
            <button
              pButton
              type="button"
              label="Save Changes"
              icon="pi pi-check"
              (click)="onSave()"
              [disabled]="propertiesForm.invalid"
              [pTooltip]="
                propertiesForm.invalid ? 'Fix validation errors before saving' : 'Save (Ctrl+S)'
              "
              tooltipPosition="top"
              [attr.aria-label]="'Save changes'"
            ></button>
          </div>
        </div>
      </ng-template>
    </p-dialog>

    <!-- Toast Notifications -->
    <p-toast position="top-right" [attr.aria-live]="'polite'" [attr.aria-atomic]="'true'"></p-toast>

    <!-- Confirmation Dialog -->
    <p-confirmDialog></p-confirmDialog>
  `,
})
export class UnifiedFieldEditorModalComponent implements OnInit, OnDestroy {
  readonly formBuilderService = inject(FormBuilderService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroy$ = new Subject<void>();

  @Input() visible = false;
  @Input() field: FormField | null = null;
  @Input() formId!: string;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<FormField>();
  @Output() cancelModal = new EventEmitter<void>();
  @Output() fieldDeleted = new EventEmitter<void>();

  propertiesForm: FormGroup;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private initialFormValue: any;

  // Active tab value (PrimeNG 17+ tabs use string values)
  activeTabIndex: string | number = '0';

  // Dirty state tracking (Story 16.7)
  readonly isDirty = signal(false);

  // Auto-save configuration (Story 16.7)
  readonly autoSaveEnabled = true;

  // Image upload state
  readonly imagePreviewUrl = signal<string | null>(null);

  // Operator options for conditional visibility
  readonly operatorOptions = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equals', value: 'notEquals' },
    { label: 'Contains', value: 'contains' },
  ];

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
    });
  }

  ngOnInit(): void {
    // Setup dirty state tracking (Story 16.7 - Task 2)
    this.setupDirtyStateTracking();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handles keyboard shortcuts for save (Ctrl+S/Cmd+S) and close (ESC).
   * Works across all tabs in the unified modal.
   * Story 16.7 - Task 1: Keyboard shortcut handling
   * Story 16.8 - FR3: Keyboard shortcuts work across all tabs
   */
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    // Only handle shortcuts when modal is visible
    if (!this.visible) return;

    // Ctrl+S (Windows/Linux) or Cmd+S (Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault(); // Prevent browser save dialog
      this.saveProperties();
      return;
    }

    // ESC key
    if (event.key === 'Escape') {
      event.preventDefault();
      this.attemptClose();
      return;
    }
  }

  /**
   * Setup dirty state tracking for form value changes.
   * Story 16.7 - Task 2: Dirty state tracking
   * Story 16.8 - FR3: Dirty state indicator works correctly across all tabs
   */
  private setupDirtyStateTracking(): void {
    this.propertiesForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      // Compare current value with initial value
      const hasChanges =
        JSON.stringify(this.propertiesForm.value) !== JSON.stringify(this.initialFormValue);
      this.isDirty.set(hasChanges);
    });
  }

  /**
   * Handle tab change event for focus management and accessibility.
   * Story 16.8 - QR2: Focus management when switching tabs
   */
  onTabChange(): void {
    // Focus management: Focus moves to first input in tab when tab switches
    // PrimeNG Tabs handles basic keyboard navigation, we enhance with focus management
    setTimeout(() => {
      const activePanel = document.querySelector('p-tabpanel:not([hidden])');
      const firstInput = activePanel?.querySelector('input, textarea, p-select');
      if (firstInput) {
        (firstInput as HTMLElement).focus();
      }
    }, 100);
  }

  /**
   * Get FormArray for options
   */
  get options(): FormArray {
    return this.propertiesForm.get('options') as FormArray;
  }

  /**
   * Check if current field is a display-only type (no validation needed)
   */
  isDisplayField(): boolean {
    const fieldType = this.field?.type;
    return (
      fieldType === FormFieldType.HEADING ||
      fieldType === FormFieldType.IMAGE ||
      fieldType === FormFieldType.TEXT_BLOCK
    );
  }

  /**
   * Expose isInputField helper for template usage
   */
  readonly isInputField = isInputField;

  /**
   * Expose isDisplayElement helper for template usage
   */
  readonly isDisplayElement = isDisplayElement;

  /**
   * Expose FormFieldType enum for template usage
   */
  readonly FormFieldType = FormFieldType;

  /**
   * Check if current field is a number type
   */
  isNumberField(): boolean {
    return this.field?.type === FormFieldType.NUMBER;
  }

  /**
   * Check if current field is a text type
   */
  isTextField(): boolean {
    const fieldType = this.field?.type;
    return fieldType === FormFieldType.TEXT || fieldType === FormFieldType.TEXTAREA;
  }

  /**
   * Check if current field is email type
   */
  isEmailField(): boolean {
    return this.field?.type === FormFieldType.EMAIL;
  }

  /**
   * Check if current field is checkbox or toggle
   */
  isCheckboxOrToggle(): boolean {
    const fieldType = this.field?.type;
    return fieldType === FormFieldType.CHECKBOX || fieldType === FormFieldType.TOGGLE;
  }

  /**
   * Check if current field is select or radio or checkbox (has options)
   * Story 16.8 - FR2: Options tab visible for select/radio/checkbox fields
   */
  isSelectOrRadioOrCheckbox(): boolean {
    const fieldType = this.field?.type;
    return (
      fieldType === FormFieldType.SELECT ||
      fieldType === FormFieldType.RADIO ||
      fieldType === FormFieldType.CHECKBOX
    );
  }

  /**
   * Check if current field is select
   */
  isSelectField(): boolean {
    return this.field?.type === FormFieldType.SELECT;
  }

  /**
   * Check if current field is file upload
   */
  isFileField(): boolean {
    return this.field?.type === FormFieldType.FILE;
  }

  /**
   * Check if current field is image type
   */
  isImageField(): boolean {
    return this.field?.type === FormFieldType.IMAGE;
  }

  /**
   * Get the File Upload tab index based on whether other tabs are visible
   */
  getFileTabIndex(): string {
    let index = this.isDisplayField() ? 4 : 5;
    if (!this.isSelectOrRadioOrCheckbox()) {
      index--;
    }
    return index.toString();
  }

  /**
   * Get list of other fields for conditional visibility
   */
  otherFieldsOptions(): { label: string; value: string }[] {
    if (!this.field) return [];

    const currentField = this.field;
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
    const value = control.value;
    if (value === null || value === undefined || value === '' || !this.field) return null;

    const currentField = this.field;
    const isDuplicate = this.formBuilderService
      .formFields()
      .some((f) => f.id !== currentField.id && f.fieldName === value);

    return isDuplicate ? { duplicateFieldName: true } : null;
  }

  /**
   * Custom validator for regex patterns
   */
  private regexPatternValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (value === null || value === undefined || value === '') return null;

      try {
        new RegExp(value);
        return null;
      } catch {
        return { invalidPattern: true };
      }
    };
  }

  /**
   * Load field properties into form
   */
  // eslint-disable-next-line max-lines-per-function, complexity
  private loadFieldProperties(field: FormField): void {
    // Clear options array first
    while (this.options.length) {
      this.options.removeAt(0);
    }

    // Load image URL for IMAGE field type
    if (field.type === FormFieldType.IMAGE) {
      const imageMetadata = field.metadata as any;
      this.imagePreviewUrl.set(imageMetadata?.imageUrl || null);
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
      },
      { emitEvent: false },
    );

    this.propertiesForm.markAsPristine();

    // Store initial form value for dirty checking (Story 16.7 - Task 2)
    this.initialFormValue = this.propertiesForm.value;
    this.isDirty.set(false);

    // Reset tab to Basic when opening modal
    this.activeTabIndex = '0';
  }

  /**
   * Saves field properties if form is valid.
   * Marks all fields as touched to show validation errors if invalid.
   * Closes modal after successful save and resets dirty state.
   * Story 16.7 - Task 1, Task 6: Keyboard shortcut and Save Changes button
   * Story 16.8 - FR3: Save works from any tab
   * @throws Displays error toast if form validation fails
   */
  saveProperties(): void {
    if (this.propertiesForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.propertiesForm.controls).forEach((key) => {
        this.propertiesForm.get(key)?.markAsTouched();
      });

      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fix validation errors before saving',
        life: 3000,
      });
      return;
    }

    // Call the existing onSave method which emits the save event
    this.onSave();
  }

  /**
   * Attempts to close modal, checking for unsaved changes first.
   * If dirty, shows confirmation dialog. Otherwise closes immediately.
   * Story 16.7 - Task 4: Cancel button with confirmation
   * Story 16.8 - FR3: Works from any tab
   */
  attemptClose(): void {
    if (this.isDirty()) {
      this.showUnsavedChangesConfirmation();
    } else {
      this.closeModal();
    }
  }

  /**
   * Shows confirmation dialog for unsaved changes.
   * Presents "Discard Changes" and "Keep Editing" options to user.
   * Story 16.7 - Task 3: Unsaved changes confirmation
   * Story 16.8 - FR3: Unsaved changes confirmation works when switching tabs or closing
   */
  private showUnsavedChangesConfirmation(): void {
    this.confirmationService.confirm({
      message: 'You have unsaved changes. Do you want to discard them?',
      header: 'Unsaved Changes',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Discard Changes',
      rejectLabel: 'Keep Editing',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.isDirty.set(false);
        this.closeModal();
      },
      reject: () => {
        // User wants to keep editing - do nothing
      },
    });
  }

  /**
   * Closes modal with optional auto-save.
   * Auto-saves valid changes if enabled and form is dirty.
   * Shows confirmation for invalid changes that cannot be saved.
   * Story 16.7 - Task 5: Auto-save on modal close
   */
  closeModal(): void {
    // Auto-save valid changes if enabled and dirty
    if (this.autoSaveEnabled && this.isDirty() && this.propertiesForm.valid) {
      // Save changes automatically - onSave() already shows success toast
      this.onSave();
      return; // onSave() closes the modal
    } else if (this.isDirty() && this.propertiesForm.invalid) {
      // Form has invalid changes - show warning
      this.confirmationService.confirm({
        message: 'Your changes contain errors and cannot be saved. Discard changes?',
        header: 'Invalid Changes',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Discard',
        rejectLabel: 'Fix Errors',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => {
          this.isDirty.set(false);
          this.visible = false;
          this.visibleChange.emit(false);
        },
      });
      return; // Don't close yet, wait for user decision
    } else {
      // Form is clean - close immediately
      this.visible = false;
      this.visibleChange.emit(false);
    }
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
   * Add new option to select/radio/checkbox field
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
   * Remove option from select/radio/checkbox field
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
   * Handle keydown events in option input fields to prevent event bubbling.
   * Stops propagation for backspace, delete, and other keys to prevent
   * accidental field deletion while editing options.
   */
  onOptionInputKeydown(event: KeyboardEvent): void {
    // Stop propagation to prevent the event from bubbling up to parent components
    // This prevents backspace/delete from triggering field deletion
    event.stopPropagation();
  }

  /**
   * Handle save button click
   * Updated for Story 16.7 to reset dirty state after save
   * Story 16.8 - FR3: Save works from any tab
   */
  onSave(): void {
    if (this.propertiesForm.invalid || !this.field) return;

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

    const updatedField: FormField = {
      ...this.field,
      label: formValues.label,
      fieldName: formValues.fieldName,
      placeholder: formValues.placeholder,
      helpText: formValues.helpText,
      required: formValues.required,
      validation: Object.keys(validation).length > 0 ? validation : undefined,
      defaultValue: formValues.defaultValue,
      options,
      conditional,
    };

    // Reset dirty state after successful save (Story 16.7)
    this.isDirty.set(false);

    // Show success message
    this.messageService.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Field properties saved successfully',
      life: 2000,
    });

    this.save.emit(updatedField);
    this.visible = false;
    this.visibleChange.emit(false);
  }

  /**
   * Handle cancel button click
   * Updated for Story 16.7 to check for unsaved changes
   * Story 16.8 - FR3: Cancel works from any tab
   */
  onCancel(): void {
    this.attemptClose();
  }

  /**
   * Handle delete field button click
   * Story 16.8 - FR3: Delete works from any tab
   */
  onDeleteField(): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this field? This action cannot be undone.',
      header: 'Delete Field',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.fieldDeleted.emit();
        this.visible = false;
        this.visibleChange.emit(false);
      },
    });
  }

  /**
   * Handle dialog show event.
   * Loads field properties into form when dialog opens.
   */
  onDialogShow(): void {
    if (this.field) {
      this.loadFieldProperties(this.field);
    }
  }

  /**
   * Handle dialog hide event (triggered by X button, backdrop click, or programmatic close).
   * Note: This is a cleanup callback - the dialog is already closing at this point.
   * Story 16.7: Ensures form state is reset when dialog closes.
   */
  onDialogHide(): void {
    // Reset form to clean state when dialog closes
    // Auto-save and confirmations are handled in closeModal() which is called before hide
    this.propertiesForm.reset();
    this.isDirty.set(false);
    this.activeTabIndex = '0';

    // Ensure parent component knows modal is closed (fixes issue when X button is clicked)
    this.visible = false;
    this.visibleChange.emit(false);
  }

  /**
   * Handle image field change from image properties panel.
   * Updates the field with new metadata from the image panel.
   * Immediately saves metadata changes to FormBuilderService so canvas preview updates in real-time.
   */
  onImageFieldChange(updatedField: FormField): void {
    // Update the field with new metadata from image panel
    this.field = updatedField;
    this.isDirty.set(true);

    // Immediately update the field in the service so the canvas preview updates
    this.formBuilderService.updateFieldProperties(this.field.id, {
      metadata: updatedField.metadata,
    });
  }

  /**
   * Handle heading field change from heading properties panel.
   * Updates the field with new metadata from the heading panel.
   * Immediately saves metadata changes to FormBuilderService so canvas preview updates in real-time.
   */
  onHeadingFieldChange(updatedField: FormField): void {
    // Update the field with new metadata from heading panel
    this.field = updatedField;
    this.isDirty.set(true);

    // Immediately update the field in the service so the canvas preview updates
    this.formBuilderService.updateFieldProperties(this.field.id, {
      metadata: updatedField.metadata,
    });
  }

  /**
   * Handle text block field change from text block properties panel.
   * Updates the field with new metadata from the text block panel.
   * Immediately saves metadata changes to FormBuilderService so canvas preview updates in real-time.
   */
  onTextBlockFieldChange(updatedField: FormField): void {
    // Update the field with new metadata from text block panel
    this.field = updatedField;
    this.isDirty.set(true);

    // Immediately update the field in the service so the canvas preview updates
    this.formBuilderService.updateFieldProperties(this.field.id, {
      metadata: updatedField.metadata,
    });
  }

  /**
   * Handle image upload from image upload component.
   * Updates the field metadata with new image URL and marks form as dirty.
   */
  onImageUploaded(imageUrl: string): void {
    if (!this.field) return;

    // Update preview URL signal
    this.imagePreviewUrl.set(imageUrl);

    // Update field metadata with new image URL
    const updatedMetadata = {
      ...(this.field.metadata || {}),
      imageUrl,
    };

    // Update the field
    this.field = {
      ...this.field,
      metadata: updatedMetadata,
    };

    // Mark form as dirty
    this.isDirty.set(true);

    // Immediately update the field in the service so the canvas preview updates
    this.formBuilderService.updateFieldProperties(this.field.id, {
      metadata: updatedMetadata,
    });

    // Show success message
    this.messageService.add({
      severity: 'success',
      summary: 'Image Uploaded',
      detail: 'Image uploaded successfully',
      life: 2000,
    });
  }
}
