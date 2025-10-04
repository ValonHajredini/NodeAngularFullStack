import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { ButtonDirective } from 'primeng/button';

interface FormSettings {
  title: string;
  description: string;
  columnLayout: 1 | 2 | 3;
  fieldSpacing: 'compact' | 'normal' | 'relaxed';
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
    Dialog,
    InputTextModule,
    TextareaModule,
    Select,
    ButtonDirective,
  ],
  template: `
    <p-dialog
      header="Form Settings"
      [modal]="true"
      [visible]="visible"
      [style]="{ width: '600px' }"
      (onHide)="onDialogHide()"
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
      </form>

      <ng-template pTemplate="footer">
        <button
          pButton
          label="Cancel"
          icon="pi pi-times"
          severity="secondary"
          (click)="onCancel()"
        ></button>
        <button
          pButton
          label="Save Settings"
          icon="pi pi-check"
          (click)="onSave()"
          [disabled]="settingsForm.invalid"
        ></button>
      </ng-template>
    </p-dialog>
  `,
})
export class FormSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() settingsSaved = new EventEmitter<FormSettings>();

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
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', Validators.maxLength(2000)],
      columnLayout: [1, Validators.required],
      fieldSpacing: ['normal', Validators.required],
    });
  }

  ngOnInit(): void {
    // Initialize with default values
  }

  onSave(): void {
    if (this.settingsForm.valid) {
      this.settingsSaved.emit(this.settingsForm.value);
      this.visible = false;
      this.visibleChange.emit(false);
    }
  }

  onCancel(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onDialogHide(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
