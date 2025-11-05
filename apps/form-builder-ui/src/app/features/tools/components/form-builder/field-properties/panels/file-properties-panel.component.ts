import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormField, FormFieldValidation } from '@nodeangularfullstack/shared';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';

/**
 * Properties panel for FILE field type.
 * Allows configuration of accepted file types and file size limits.
 */
@Component({
  selector: 'app-file-properties-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, InputNumber],
  template: `
    <div [formGroup]="form" class="space-y-4">
      <!-- Accepted File Types -->
      <div class="field">
        <label for="acceptedTypes" class="block text-sm font-medium text-gray-700 mb-1">
          Accepted File Types
        </label>
        <input
          pInputText
          id="acceptedTypes"
          formControlName="acceptedTypes"
          class="w-full"
          placeholder="image/*, application/pdf, .docx, .xlsx"
        />
        <small class="text-gray-500 text-xs">
          Comma-separated MIME types or file extensions (e.g., image/*, .pdf, .docx)
        </small>
      </div>

      <!-- Max File Size -->
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
        <small class="text-gray-500 text-xs">
          Maximum file size allowed per upload (1-100 MB)
        </small>
      </div>

      <!-- Friendly Examples -->
      <div class="p-3 bg-blue-50 border border-blue-200 rounded">
        <h4 class="text-sm font-semibold text-blue-900 mb-2">Common Examples:</h4>
        <ul class="text-xs text-blue-800 space-y-1">
          <li><strong>Images:</strong> image/*</li>
          <li><strong>Documents:</strong> application/pdf, .docx, .xlsx</li>
          <li><strong>Archives:</strong> .zip, .tar.gz</li>
          <li><strong>All files:</strong> Leave empty</li>
        </ul>
      </div>

      @if (form.value.acceptedTypes || form.value.maxFileSize) {
        <div class="p-3 bg-gray-50 border border-gray-200 rounded">
          <h4 class="text-sm font-semibold text-gray-700 mb-1">Summary:</h4>
          <p class="text-sm text-gray-600">
            Max {{ form.value.maxFileSize || 10 }}MB,
            @if (form.value.acceptedTypes) {
              accepts: {{ form.value.acceptedTypes }}
            } @else {
              accepts all file types
            }
          </p>
        </div>
      }
    </div>
  `,
})
export class FilePropertiesPanelComponent implements OnInit {
  @Input() field!: FormField;
  @Output() fieldChange = new EventEmitter<FormField>();

  private readonly fb = inject(FormBuilder);

  protected form!: FormGroup;

  ngOnInit(): void {
    const validation = this.field.validation;

    // Convert acceptedFileTypes array to comma-separated string
    const acceptedTypesString = validation?.acceptedFileTypes
      ? validation.acceptedFileTypes.join(', ')
      : '';

    // Convert maxFileSize from bytes to MB
    const maxFileSizeMB = validation?.maxFileSize ? validation.maxFileSize / (1024 * 1024) : 10;

    this.form = this.fb.group({
      acceptedTypes: [acceptedTypesString],
      maxFileSize: [maxFileSizeMB],
    });

    // Emit field changes on form value changes
    this.form.valueChanges.subscribe(() => {
      this.emitFieldChange();
    });
  }

  private emitFieldChange(): void {
    // Build validation object
    const validation: FormFieldValidation = {
      ...(this.field.validation || {}),
    };

    // Parse acceptedTypes string to array
    if (this.form.value.acceptedTypes) {
      validation.acceptedFileTypes = this.form.value.acceptedTypes
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);
    } else {
      delete validation.acceptedFileTypes;
    }

    // Convert maxFileSize from MB to bytes
    if (this.form.value.maxFileSize) {
      validation.maxFileSize = this.form.value.maxFileSize * 1024 * 1024;
    } else {
      delete validation.maxFileSize;
    }

    this.fieldChange.emit({
      ...this.field,
      validation: Object.keys(validation).length > 0 ? validation : undefined,
    });
  }
}
