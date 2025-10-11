import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, ImageMetadata } from '@nodeangularfullstack/shared';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

/**
 * Properties panel for IMAGE field type.
 * Allows configuration of alt text, dimensions, alignment, object fit, and caption.
 * Note: Image upload is handled in the Basic tab via ImageUploadComponent.
 */
@Component({
  selector: 'app-image-properties-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, Select, TextareaModule],
  template: `
    <div [formGroup]="form" class="space-y-4">
      <!-- Info message about upload location -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div class="flex items-start gap-2">
          <i class="pi pi-info-circle text-blue-600 mt-0.5"></i>
          <div class="text-sm text-blue-800">
            <p class="font-medium mb-1">Image Upload</p>
            <p class="text-xs text-blue-700">
              Upload your image in the <strong>Basic</strong> tab. This tab is for styling
              properties only.
            </p>
          </div>
        </div>
      </div>

      <!-- Alt Text (Required) -->
      <div class="field">
        <label for="altText" class="block text-sm font-medium text-gray-700 mb-1">
          Alt Text <span class="text-red-500">*</span>
        </label>
        <textarea
          pTextarea
          id="altText"
          formControlName="altText"
          class="w-full"
          rows="2"
          placeholder="Describe the image for accessibility"
        ></textarea>
        @if (form.get('altText')?.invalid && form.get('altText')?.touched) {
          <small class="text-red-500 text-xs">Alt text is required for accessibility</small>
        }
      </div>

      <!-- Width -->
      <div class="field">
        <label for="width" class="block text-sm font-medium text-gray-700 mb-1"> Width </label>
        <input
          pInputText
          id="width"
          formControlName="width"
          class="w-full"
          placeholder="e.g., 100%, 500px, auto"
        />
        <small class="text-gray-500 text-xs"> CSS value (px, %, auto) - defaults to 100% </small>
      </div>

      <!-- Height -->
      <div class="field">
        <label for="height" class="block text-sm font-medium text-gray-700 mb-1"> Height </label>
        <input
          pInputText
          id="height"
          formControlName="height"
          class="w-full"
          placeholder="e.g., auto, 300px"
        />
        <small class="text-gray-500 text-xs">
          CSS value (px, auto) - defaults to auto (maintains aspect ratio)
        </small>
      </div>

      <!-- Alignment -->
      <div class="field">
        <label for="alignment" class="block text-sm font-medium text-gray-700 mb-1">
          Alignment
        </label>
        <p-select
          formControlName="alignment"
          inputId="alignment"
          [options]="alignmentOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>

      <!-- Object Fit -->
      <div class="field">
        <label for="objectFit" class="block text-sm font-medium text-gray-700 mb-1">
          Object Fit
        </label>
        <p-select
          formControlName="objectFit"
          inputId="objectFit"
          [options]="objectFitOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
        <small class="text-gray-500 text-xs">
          Controls how image scales within its dimensions
        </small>
      </div>

      <!-- Caption (Optional) -->
      <div class="field">
        <label for="caption" class="block text-sm font-medium text-gray-700 mb-1">
          Caption (Optional)
        </label>
        <textarea
          pTextarea
          id="caption"
          formControlName="caption"
          class="w-full"
          rows="2"
          placeholder="Optional caption displayed below image"
        ></textarea>
      </div>
    </div>
  `,
})
export class ImagePropertiesPanelComponent implements OnInit {
  @Input() field!: FormField;
  @Input() formId!: string;
  @Output() fieldChange = new EventEmitter<FormField>();

  private readonly fb = inject(FormBuilder);

  protected form!: FormGroup;

  protected readonly alignmentOptions = [
    { label: 'Left', value: 'left' },
    { label: 'Center', value: 'center' },
    { label: 'Right', value: 'right' },
    { label: 'Full Width', value: 'full' },
  ];

  protected readonly objectFitOptions = [
    { label: 'Contain (fit inside)', value: 'contain' },
    { label: 'Cover (fill bounds)', value: 'cover' },
    { label: 'Fill (stretch)', value: 'fill' },
    { label: 'None (original size)', value: 'none' },
  ];

  ngOnInit(): void {
    const metadata = this.field.metadata as ImageMetadata;

    this.form = this.fb.group({
      altText: [metadata?.altText || '', Validators.required],
      width: [metadata?.width || '100%'],
      height: [metadata?.height || 'auto'],
      alignment: [metadata?.alignment || 'center'],
      objectFit: [metadata?.objectFit || 'contain'],
      caption: [metadata?.caption || ''],
    });

    // Emit field changes on form value changes
    this.form.valueChanges.subscribe(() => {
      if (this.form.valid) {
        this.emitFieldChange();
      }
    });
  }

  private emitFieldChange(): void {
    // Preserve existing imageUrl from field metadata
    const existingMetadata = this.field.metadata as ImageMetadata;

    const metadata: ImageMetadata = {
      imageUrl: existingMetadata?.imageUrl, // Preserve existing imageUrl (upload is handled in Basic tab)
      altText: this.form.value.altText,
      width: this.form.value.width || undefined,
      height: this.form.value.height || undefined,
      alignment: this.form.value.alignment || 'center',
      objectFit: this.form.value.objectFit || 'contain',
      caption: this.form.value.caption || undefined,
      customStyle: existingMetadata?.customStyle, // Preserve custom CSS
    };

    this.fieldChange.emit({
      ...this.field,
      metadata,
    });
  }
}
