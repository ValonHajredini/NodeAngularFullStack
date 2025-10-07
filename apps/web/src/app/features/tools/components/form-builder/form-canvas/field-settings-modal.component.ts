import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';

/**
 * Field settings modal component.
 * Provides a comprehensive form for editing all field properties.
 */
@Component({
  selector: 'app-field-settings-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    ToggleSwitchModule,
    InputNumberModule,
    ButtonModule,
    TooltipModule,
  ],
  template: `
    <p-dialog
      [(visible)]="displayModalInternal"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [style]="{ width: '50vw' }"
      [draggable]="false"
      [resizable]="false"
      (onHide)="onCancel()"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center justify-between w-full">
          <span class="text-xl font-semibold">Field Settings</span>
          <p-button
            icon="pi pi-trash"
            severity="danger"
            [text]="true"
            [rounded]="true"
            (onClick)="onDelete()"
            [attr.aria-label]="'Delete field'"
            pTooltip="Delete Field"
            tooltipPosition="bottom"
          />
        </div>
      </ng-template>
      @if (settingsForm) {
        <form [formGroup]="settingsForm" (ngSubmit)="onSave()">
          <!-- Label -->
          <div class="field mb-4">
            <label for="label" class="block font-medium mb-2"
              >Label <span class="text-red-500">*</span></label
            >
            <input id="label" type="text" pInputText formControlName="label" class="w-full" />
            @if (labelControl?.invalid && labelControl?.touched) {
              <small class="p-error">Label is required</small>
            }
          </div>

          <!-- Field Name -->
          <div class="field mb-4">
            <label for="fieldName" class="block font-medium mb-2"
              >Field Name <span class="text-red-500">*</span></label
            >
            <input
              id="fieldName"
              type="text"
              pInputText
              formControlName="fieldName"
              class="w-full"
            />
            <small class="text-gray-500 block mt-1"
              >Used as key in form submission (alphanumeric, underscores)</small
            >
            @if (fieldNameControl?.invalid && fieldNameControl?.touched) {
              <small class="p-error"
                >Field name is required and must be alphanumeric with underscores</small
              >
            }
          </div>

          <!-- Placeholder -->
          <div class="field mb-4">
            <label for="placeholder" class="block font-medium mb-2">Placeholder</label>
            <input
              id="placeholder"
              type="text"
              pInputText
              formControlName="placeholder"
              class="w-full"
            />
          </div>

          <!-- Help Text -->
          <div class="field mb-4">
            <label for="helpText" class="block font-medium mb-2">Help Text</label>
            <textarea
              id="helpText"
              pTextarea
              formControlName="helpText"
              rows="3"
              class="w-full"
            ></textarea>
          </div>

          <!-- Required Toggle -->
          <div class="field mb-4 flex items-center">
            <p-toggleSwitch formControlName="required" inputId="required" />
            <label for="required" class="ml-3">Required field</label>
          </div>

          <!-- Default Value -->
          <div class="field mb-4">
            <label for="defaultValue" class="block font-medium mb-2">Default Value</label>
            <input
              id="defaultValue"
              type="text"
              pInputText
              formControlName="defaultValue"
              class="w-full"
            />
          </div>

          <!-- Text Validation -->
          @if (showTextValidation()) {
            <div class="field mb-4">
              <label class="block font-medium mb-2">Text Validation</label>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="minLength" class="block text-sm mb-1">Min Length</label>
                  <p-inputNumber
                    inputId="minLength"
                    formControlName="minLength"
                    [min]="0"
                    [showButtons]="true"
                    styleClass="w-full"
                  />
                </div>
                <div>
                  <label for="maxLength" class="block text-sm mb-1">Max Length</label>
                  <p-inputNumber
                    inputId="maxLength"
                    formControlName="maxLength"
                    [min]="0"
                    [showButtons]="true"
                    styleClass="w-full"
                  />
                </div>
              </div>
            </div>
          }

          <!-- Number Validation -->
          @if (showNumberValidation()) {
            <div class="field mb-4">
              <label class="block font-medium mb-2">Number Validation</label>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="min" class="block text-sm mb-1">Min Value</label>
                  <p-inputNumber
                    inputId="min"
                    formControlName="min"
                    [showButtons]="true"
                    styleClass="w-full"
                  />
                </div>
                <div>
                  <label for="max" class="block text-sm mb-1">Max Value</label>
                  <p-inputNumber
                    inputId="max"
                    formControlName="max"
                    [showButtons]="true"
                    styleClass="w-full"
                  />
                </div>
              </div>
            </div>
          }

          <!-- Pattern Validation -->
          @if (showPatternValidation()) {
            <div class="field mb-4">
              <label for="pattern" class="block font-medium mb-2">Validation Pattern (RegEx)</label>
              <input
                id="pattern"
                type="text"
                pInputText
                formControlName="pattern"
                class="w-full"
                placeholder="^[a-zA-Z]+$"
              />
              <small class="text-gray-500 block mt-1"
                >Regular expression for custom validation</small
              >
            </div>
          }

          <!-- Custom Error Message -->
          <div class="field mb-4">
            <label for="errorMessage" class="block font-medium mb-2">Custom Error Message</label>
            <input
              id="errorMessage"
              type="text"
              pInputText
              formControlName="errorMessage"
              class="w-full"
            />
          </div>

          <!-- Footer Buttons -->
          <div class="flex justify-end gap-2 mt-6">
            <p-button label="Cancel" severity="secondary" (onClick)="onCancel()" type="button" />
            <p-button label="Save" type="submit" [disabled]="settingsForm.invalid" />
          </div>
        </form>
      }
    </p-dialog>
  `,
  styles: [
    `
      :host ::ng-deep {
        .p-dialog .p-dialog-content {
          padding: 1.5rem;
        }
      }
    `,
  ],
})
export class FieldSettingsModalComponent implements OnChanges {
  @Input() field: FormField | null = null;
  @Input() displayModal = false;
  @Output() displayModalChange = new EventEmitter<boolean>();
  @Output() settingsSaved = new EventEmitter<Partial<FormField>>();
  @Output() fieldDeleted = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  settingsForm!: FormGroup;

  displayModalInternal = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['field'] && this.field) {
      this.buildForm();
    }
    if (changes['displayModal']) {
      this.displayModalInternal = this.displayModal;
    }
  }

  /**
   * Builds the settings form with the current field data.
   */
  buildForm(): void {
    this.settingsForm = this.fb.group({
      label: [this.field?.label || '', Validators.required],
      fieldName: [
        this.field?.fieldName || '',
        [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]+$/)],
      ],
      placeholder: [this.field?.placeholder || ''],
      helpText: [this.field?.helpText || ''],
      required: [this.field?.required || false],
      defaultValue: [this.field?.defaultValue || ''],
      minLength: [this.field?.validation?.minLength || null],
      maxLength: [this.field?.validation?.maxLength || null],
      min: [this.field?.validation?.min || null],
      max: [this.field?.validation?.max || null],
      pattern: [this.field?.validation?.pattern || ''],
      errorMessage: [this.field?.validation?.errorMessage || ''],
    });
  }

  /**
   * Handles save button click.
   * Emits the updated field properties.
   */
  onSave(): void {
    if (this.settingsForm.invalid) return;

    const formValue = this.settingsForm.value;
    const updates: Partial<FormField> = {
      label: formValue.label,
      fieldName: formValue.fieldName,
      placeholder: formValue.placeholder,
      helpText: formValue.helpText,
      required: formValue.required,
      defaultValue: formValue.defaultValue,
      validation: {
        minLength: formValue.minLength,
        maxLength: formValue.maxLength,
        min: formValue.min,
        max: formValue.max,
        pattern: formValue.pattern,
        errorMessage: formValue.errorMessage,
      },
    };

    this.settingsSaved.emit(updates);
    this.closeModal();
  }

  /**
   * Handles cancel button click or modal close.
   */
  onCancel(): void {
    this.closeModal();
  }

  /**
   * Handles delete button click.
   * Emits fieldDeleted event and closes the modal.
   */
  onDelete(): void {
    if (confirm('Are you sure you want to delete this field? This action cannot be undone.')) {
      this.fieldDeleted.emit();
      this.closeModal();
    }
  }

  /**
   * Closes the modal and resets the form.
   */
  closeModal(): void {
    this.displayModalInternal = false;
    this.displayModalChange.emit(false);
  }

  /**
   * Handles visibility change from p-dialog.
   */
  onVisibleChange(visible: boolean): void {
    this.displayModalInternal = visible;
    this.displayModalChange.emit(visible);
  }

  /**
   * Determines if text validation fields should be shown.
   */
  showTextValidation(): boolean {
    return [FormFieldType.TEXT, FormFieldType.EMAIL, FormFieldType.TEXTAREA].includes(
      this.field?.type!,
    );
  }

  /**
   * Determines if number validation fields should be shown.
   */
  showNumberValidation(): boolean {
    return this.field?.type === FormFieldType.NUMBER;
  }

  /**
   * Determines if pattern validation field should be shown.
   */
  showPatternValidation(): boolean {
    return [FormFieldType.TEXT, FormFieldType.EMAIL].includes(this.field?.type!);
  }

  get labelControl() {
    return this.settingsForm?.get('label');
  }

  get fieldNameControl() {
    return this.settingsForm?.get('fieldName');
  }
}
