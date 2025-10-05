import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
  OnInit,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';

export interface FormSettings {
  title: string;
  description: string;
  columnLayout: 1 | 2 | 3;
  fieldSpacing: 'compact' | 'normal' | 'relaxed';
  successMessage: string;
  redirectUrl: string;
  allowMultipleSubmissions: boolean;
}

/**
 * Form settings component for configuring form-level options.
 * Displayed as a dialog for editing form metadata and layout settings.
 */
@Component({
  selector: 'app-form-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ButtonModule,
    CheckboxModule,
  ],
  template: `
    <p-dialog
      header="Form Settings"
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
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
      <form [formGroup]="settingsForm" class="space-y-4 pt-4">
        <div class="field">
          <label for="title" class="block text-sm font-medium text-gray-700 mb-1">
            Form Title <span class="text-red-500">*</span>
          </label>
          <input
            pInputText
            id="title"
            formControlName="title"
            class="w-full"
            placeholder="Enter form title"
            maxlength="200"
          />
          @if (
            settingsForm.get('title')?.hasError('required') && settingsForm.get('title')?.touched
          ) {
            <small class="text-red-500">Title is required</small>
          }
        </div>

        <div class="field">
          <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            pTextarea
            id="description"
            formControlName="description"
            class="w-full"
            rows="4"
            placeholder="Enter form description"
            maxlength="2000"
          ></textarea>
          <small class="text-gray-500 text-xs">
            {{ settingsForm.get('description')?.value?.length || 0 }}/2000 characters
          </small>
        </div>

        <div class="field">
          <label for="columnLayout" class="block text-sm font-medium text-gray-700 mb-1">
            Column Layout
          </label>
          <p-select
            id="columnLayout"
            formControlName="columnLayout"
            [options]="columnOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select layout"
            styleClass="w-full"
          ></p-select>
          <small class="text-gray-500 text-xs">Number of columns for form fields</small>
        </div>

        <div class="field">
          <label for="fieldSpacing" class="block text-sm font-medium text-gray-700 mb-1">
            Field Spacing
          </label>
          <p-select
            id="fieldSpacing"
            formControlName="fieldSpacing"
            [options]="spacingOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select spacing"
            styleClass="w-full"
          ></p-select>
          <small class="text-gray-500 text-xs">Vertical spacing between form fields</small>
        </div>

        <div class="border-t border-gray-200 my-4 pt-4">
          <h4 class="text-sm font-semibold text-gray-800 mb-3">Submission Settings</h4>

          <div class="field">
            <label for="successMessage" class="block text-sm font-medium text-gray-700 mb-1">
              Success Message
            </label>
            <input
              pInputText
              id="successMessage"
              formControlName="successMessage"
              class="w-full"
              placeholder="Thank you for your submission!"
              maxlength="500"
            />
            <small class="text-gray-500 text-xs">Message shown after successful submission</small>
          </div>

          <div class="field">
            <label for="redirectUrl" class="block text-sm font-medium text-gray-700 mb-1">
              Redirect URL (Optional)
            </label>
            <input
              pInputText
              id="redirectUrl"
              formControlName="redirectUrl"
              class="w-full"
              placeholder="https://example.com/thank-you"
            />
            @if (
              settingsForm.get('redirectUrl')?.hasError('pattern') &&
              settingsForm.get('redirectUrl')?.touched
            ) {
              <small class="text-red-500">Please enter a valid URL (http:// or https://)</small>
            }
            <small class="text-gray-500 text-xs">Redirect user after submission (optional)</small>
          </div>

          <div class="field flex items-center gap-2">
            <p-checkbox
              inputId="allowMultipleSubmissions"
              formControlName="allowMultipleSubmissions"
              [binary]="true"
            ></p-checkbox>
            <label for="allowMultipleSubmissions" class="text-sm font-medium text-gray-700">
              Allow Multiple Submissions
            </label>
          </div>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Cancel"
            icon="pi pi-times"
            severity="secondary"
            (onClick)="onCancel()"
          ></p-button>
          <p-button
            [label]="saveButtonLabel"
            icon="pi pi-check"
            (onClick)="onSave()"
            [disabled]="settingsForm.invalid"
          ></p-button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class FormSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  private readonly defaultSettings: FormSettings = {
    title: '',
    description: '',
    columnLayout: 1,
    fieldSpacing: 'normal',
    successMessage: 'Thank you for your submission!',
    redirectUrl: '',
    allowMultipleSubmissions: true,
  };

  private lastSettings: FormSettings = { ...this.defaultSettings };

  @Input() visible = false;
  @Input() mode: 'create' | 'edit' = 'edit';
  @Input()
  set settings(value: FormSettings | null | undefined) {
    const mergedSettings: FormSettings = {
      ...this.defaultSettings,
      ...(value ?? {}),
    };
    this.lastSettings = { ...mergedSettings };
    // Only reset the form if it exists and we're not currently editing
    if (this.settingsForm && !this.settingsForm.dirty) {
      this.settingsForm.reset(mergedSettings);
    }
  }
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() settingsSaved = new EventEmitter<FormSettings>();

  get saveButtonLabel(): string {
    return this.mode === 'create' ? 'Save & Continue to Builder' : 'Update Form Settings';
  }

  settingsForm: FormGroup;

  readonly columnOptions = [
    { label: '1 Column', value: 1 },
    { label: '2 Columns', value: 2 },
    { label: '3 Columns', value: 3 },
  ];

  readonly spacingOptions = [
    { label: 'Compact', value: 'compact' },
    { label: 'Normal', value: 'normal' },
    { label: 'Relaxed', value: 'relaxed' },
  ];

  constructor() {
    this.settingsForm = this.fb.group({
      title: [this.defaultSettings.title, [Validators.required, Validators.maxLength(200)]],
      description: [this.defaultSettings.description, Validators.maxLength(2000)],
      columnLayout: [this.defaultSettings.columnLayout, Validators.required],
      fieldSpacing: [this.defaultSettings.fieldSpacing, Validators.required],
      successMessage: [this.defaultSettings.successMessage, Validators.maxLength(500)],
      redirectUrl: [this.defaultSettings.redirectUrl, Validators.pattern(/^(https?:\/\/.+)?$/)],
      allowMultipleSubmissions: [this.defaultSettings.allowMultipleSubmissions],
    });
  }

  ngOnInit(): void {
    // Initialize with default values
  }

  onUpdateSettings(): void {
    console.log('Form Settings Dialog: onUpdateSettings called', {
      valid: this.settingsForm.valid,
      errors: this.settingsForm.errors,
      value: this.settingsForm.value,
    });
    if (this.settingsForm.valid) {
      const formValue = this.settingsForm.getRawValue() as FormSettings;
      this.settingsSaved.emit(formValue);
      this.lastSettings = { ...formValue };
      this.settingsForm.markAsPristine();
      this.settingsForm.markAsUntouched();
      this.visible = false;
      this.visibleChange.emit(false);
    } else {
      console.log('Form is invalid, cannot save');
    }
  }

  onSave(): void {
    console.log('Form Settings Dialog: onSave called', {
      valid: this.settingsForm.valid,
      errors: this.settingsForm.errors,
      value: this.settingsForm.value,
    });
    if (this.settingsForm.valid) {
      const formValue = this.settingsForm.getRawValue() as FormSettings;
      this.settingsSaved.emit(formValue);
      this.lastSettings = { ...formValue };
      this.settingsForm.markAsPristine();
      this.settingsForm.markAsUntouched();
      this.visible = false;
      this.visibleChange.emit(false);
    } else {
      console.log('Form is invalid, cannot save');
    }
  }

  onCancel(): void {
    this.settingsForm.reset(this.lastSettings);
    this.settingsForm.markAsPristine();
    this.settingsForm.markAsUntouched();
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onDialogShow(): void {
    console.log('Form Settings Dialog: onDialogShow called');
    // Ensure form is reset to last known good settings when dialog opens
    this.settingsForm.reset(this.lastSettings);
    this.settingsForm.markAsPristine();
    this.settingsForm.markAsUntouched();
  }

  onDialogHide(): void {
    console.log('Form Settings Dialog: onDialogHide called');
    // Reset form to last saved state when dialog is closed without saving
    this.settingsForm.reset(this.lastSettings);
    this.settingsForm.markAsPristine();
    this.settingsForm.markAsUntouched();
    this.visible = false;
    this.visibleChange.emit(false);
  }

  /**
   * Handles escape key press to close dialog.
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (this.visible) {
      event.preventDefault();
      this.onCancel();
    }
  }
}
