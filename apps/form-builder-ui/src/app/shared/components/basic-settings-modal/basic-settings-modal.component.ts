import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  OnDestroy,
  signal,
  effect,
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
import { Checkbox } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule, ButtonDirective } from 'primeng/button';
import { InputNumber, InputNumberModule } from 'primeng/inputnumber';
import { Message, MessageModule } from 'primeng/message';
import {
  FormField,
  FormFieldType,
} from '@nodeangularfullstack/shared';
import { Subject, takeUntil } from 'rxjs';

// Custom validators
import { uniqueFieldNameValidator } from '../../../features/dashboard/field-properties/validators/unique-field-name.validator';

// Slug utility
import { slugify } from '../../../features/dashboard/field-properties/utils/slugify.util';

/**
 * Basic Settings Modal component for editing field basic properties.
 *
 * Handles:
 * - Label (required)
 * - Field Name (required, auto-generated from label)
 * - Placeholder
 * - Help Text
 * - Required flag
 * - Default Value
 */
@Component({
  selector: 'app-basic-settings-modal',
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
    InputNumberModule,
    InputNumber,
    MessageModule,
    Message,
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

    // InputNumber spinner button styling - fit arrows within input height
    ::ng-deep .p-inputnumber {
      width: 100%;
    }

    ::ng-deep .p-inputnumber .p-inputtext {
      height: 38px;
      padding-right: 2rem;
      font-size: 0.875rem;
    }

    ::ng-deep .p-inputnumber-buttons-stacked .p-inputnumber-button-group {
      display: flex;
      flex-direction: column;
      position: absolute;
      top: 1px;
      right: 1px;
      height: calc(100% - 2px);
      width: 1.75rem;
    }

    ::ng-deep .p-inputnumber-buttons-stacked .p-inputnumber-button {
      flex: 1 1 50%;
      border-radius: 0;
      width: 100%;
      padding: 0;
      min-height: 0;
      height: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    ::ng-deep .p-inputnumber-buttons-stacked .p-inputnumber-button:first-child {
      border-top-right-radius: 0.375rem;
      border-bottom: 1px solid #d1d5db;
    }

    ::ng-deep .p-inputnumber-buttons-stacked .p-inputnumber-button:last-child {
      border-bottom-right-radius: 0.375rem;
    }

    ::ng-deep .p-inputnumber-buttons-stacked .p-button-icon {
      font-size: 0.625rem;
      line-height: 1;
    }
  `],
  template: `
    <p-dialog
      header="Basic Settings"
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="false"
      [closeOnEscape]="true"
      [draggable]="false"
      [resizable]="false"
      [blockScroll]="true"
      appendTo="body"
      [style]="{ width: '600px', maxHeight: '90vh' }"
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

        <form [formGroup]="basicForm" class="space-y-4">
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
                basicForm.get('label')?.invalid && basicForm.get('label')?.touched
              "
            />
            @if (
              basicForm.get('label')?.invalid && basicForm.get('label')?.touched
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
              basicForm.get('fieldName')?.errors?.['required'] &&
              basicForm.get('fieldName')?.touched
            ) {
              <p-message
                severity="error"
                aria-live="polite"
                styleClass="w-full mt-2"
                [text]="'Field name is required'"
              />
            }
            @if (
              basicForm.get('fieldName')?.errors?.['pattern'] &&
              basicForm.get('fieldName')?.touched
            ) {
              <p-message
                severity="error"
                aria-live="polite"
                styleClass="w-full mt-2"
                [text]="'Must use lowercase letters, numbers, and underscores only'"
              />
            }
            @if (
              basicForm.get('fieldName')?.errors?.['duplicateFieldName'] &&
              basicForm.get('fieldName')?.touched
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
            [disabled]="basicForm.invalid"
            (click)="onSaveChanges()"
          ></button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class BasicSettingsModalComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // Signal-based inputs/outputs
  readonly visible = model<boolean>(false);
  readonly field = input<FormField | null>(null);
  readonly allFields = input<FormField[]>([]);

  readonly saveChanges = output<Partial<FormField>>();
  readonly deleteField = output<void>();
  readonly cancel = output<void>();

  // Form and state
  basicForm: FormGroup;
  private isFieldNameManuallyEdited = false;

  constructor() {
    this.basicForm = this.fb.group({
      label: ['', [Validators.required, Validators.maxLength(200)]],
      fieldName: [
        '',
        [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)],
      ],
      placeholder: ['', Validators.maxLength(100)],
      helpText: ['', Validators.maxLength(500)],
      required: [false],
      defaultValue: [null],
    });

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
   * Check if current field is checkbox or toggle
   */
  isCheckboxOrToggle(): boolean {
    const fieldType = this.field()?.type;
    return fieldType === FormFieldType.CHECKBOX || fieldType === FormFieldType.TOGGLE;
  }

  /**
   * Load field properties into form
   */
  private loadFieldProperties(field: FormField): void {
    // Reset manual edit flag
    this.isFieldNameManuallyEdited = false;

    // Add unique field name validator dynamically
    const fieldNameControl = this.basicForm.get('fieldName');
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
    this.basicForm.patchValue(
      {
        label: field.label || '',
        fieldName: field.fieldName,
        placeholder: field.placeholder || '',
        helpText: field.helpText || '',
        required: field.required || false,
        defaultValue: field.defaultValue ?? null,
      },
      { emitEvent: false },
    );

    this.basicForm.markAsPristine();
  }

  /**
   * Setup field name auto-generation from label
   */
  private setupFieldNameAutoGeneration(): void {
    // Track manual edits to fieldName
    this.basicForm
      .get('fieldName')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.basicForm.get('fieldName')?.dirty) {
          this.isFieldNameManuallyEdited = true;
        }
      });

    // Auto-generate fieldName from label (if not manually edited)
    this.basicForm
      .get('label')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((label) => {
        if (!this.isFieldNameManuallyEdited && label) {
          const slugifiedName = slugify(label);
          this.basicForm.patchValue(
            { fieldName: slugifiedName },
            { emitEvent: false },
          );
        }
      });
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
    this.basicForm.reset();
    this.isFieldNameManuallyEdited = false;
  }

  /**
   * Save changes handler
   */
  onSaveChanges(): void {
    if (this.basicForm.invalid) {
      // Mark all fields as touched to show errors
      Object.keys(this.basicForm.controls).forEach((key) => {
        this.basicForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValues = this.basicForm.value;

    // Emit partial field update
    const updates: Partial<FormField> = {
      label: formValues.label,
      fieldName: formValues.fieldName,
      placeholder: formValues.placeholder,
      helpText: formValues.helpText,
      required: formValues.required,
      defaultValue: formValues.defaultValue,
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

  /**
   * Delete field handler
   */
  onDeleteField(): void {
    this.deleteField.emit();
    this.visible.set(false);
  }
}
