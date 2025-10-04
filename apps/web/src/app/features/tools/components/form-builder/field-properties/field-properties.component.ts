import {
  Component,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  inject,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Checkbox } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { ButtonDirective } from 'primeng/button';
import { FormField } from '@nodeangularfullstack/shared';
import { FormBuilderService } from '../form-builder.service';
import { Subject, takeUntil } from 'rxjs';

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
  ],
  template: `
    <div class="field-properties h-full bg-white border-l border-gray-200">
      <div class="p-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Field Properties</h3>
      </div>

      @if (!formBuilderService.selectedField()) {
        <div class="empty-state p-6 text-center">
          <i class="pi pi-cog text-5xl text-gray-300 mb-4 block"></i>
          <p class="text-gray-600">Select a field to configure its properties</p>
        </div>
      } @else {
        <div class="p-4">
          <div class="mb-4">
            <span class="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
              {{ formBuilderService.selectedField()!.type }}
            </span>
          </div>

          <form [formGroup]="propertiesForm" class="space-y-4">
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
              />
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
              <small class="text-gray-500 text-xs">
                Used in form data (e.g., firstName, email)
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

            <div class="flex gap-2 pt-4">
              <button
                pButton
                type="button"
                label="Apply Changes"
                icon="pi pi-check"
                class="flex-1"
                (click)="onApplyChanges()"
                [disabled]="propertiesForm.invalid || !hasChanges()"
              ></button>
              <button
                pButton
                type="button"
                label="Delete"
                icon="pi pi-trash"
                severity="danger"
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

  constructor() {
    this.propertiesForm = this.fb.group({
      label: ['', Validators.required],
      fieldName: ['', Validators.required],
      placeholder: [''],
      helpText: [''],
      required: [false],
    });
  }

  ngOnInit(): void {
    // Watch for selected field changes
    this.formBuilderService.selectedField;

    // Update form when field selection changes
    const selectedField = this.formBuilderService.selectedField();
    if (selectedField) {
      this.loadFieldProperties(selectedField);
    }

    // Track form changes
    this.propertiesForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.hasChanges.set(this.propertiesForm.dirty);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFieldProperties(field: FormField): void {
    this.propertiesForm.patchValue(
      {
        label: field.label || '',
        fieldName: field.fieldName,
        placeholder: field.placeholder || '',
        helpText: field.helpText || '',
        required: field.required || false,
      },
      { emitEvent: false },
    );
    this.propertiesForm.markAsPristine();
    this.hasChanges.set(false);
  }

  onApplyChanges(): void {
    if (this.propertiesForm.invalid) return;

    const updatedProperties = this.propertiesForm.value;
    const fieldIndex = this.formBuilderService.selectedFieldIndex();

    if (fieldIndex >= 0) {
      const currentField = this.formBuilderService.selectedField();
      if (currentField) {
        const updatedField: FormField = {
          ...currentField,
          ...updatedProperties,
        };
        this.formBuilderService.updateField(fieldIndex, updatedField);
        this.formBuilderService.selectField(updatedField);
        this.propertyChanged.emit(updatedProperties);
        this.propertiesForm.markAsPristine();
        this.hasChanges.set(false);
      }
    }
  }

  onDeleteField(): void {
    const selectedField = this.formBuilderService.selectedField();
    if (selectedField) {
      this.formBuilderService.removeField(selectedField.id);
      this.fieldDeleted.emit();
    }
  }
}
