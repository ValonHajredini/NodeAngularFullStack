import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { FormField, ImageMetadata } from '@nodeangularfullstack/shared';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { FileUpload } from 'primeng/fileupload';
import { Message } from 'primeng/message';

/**
 * Image upload response from backend
 */
interface ImageUploadResponse {
  imageUrl: string;
  fileName: string;
  fileSize: number;
}

/**
 * Properties panel for IMAGE field type.
 * Allows configuration of image upload, alt text, dimensions, alignment, and styling.
 */
@Component({
  selector: 'app-image-properties-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, Select, TextareaModule, FileUpload, Message],
  template: `
    <div [formGroup]="form" class="space-y-4">
      <!-- Image Upload -->
      <div class="field">
        <label class="block text-sm font-medium text-gray-700 mb-2"> Image Upload </label>

        @if (imagePreviewUrl()) {
          <div class="mb-3">
            <img
              [src]="imagePreviewUrl()!"
              alt="Preview"
              class="max-w-full h-auto max-h-48 rounded border border-gray-300"
            />
          </div>
        }

        <p-fileupload
          mode="basic"
          chooseLabel="Choose Image"
          accept="image/*"
          [maxFileSize]="5242880"
          (onSelect)="onImageSelect($event)"
          [auto]="false"
          chooseIcon="pi pi-upload"
        />
        <small class="text-gray-500 text-xs"> Max 5MB (JPG, PNG, GIF, WebP) </small>

        @if (uploadError()) {
          <p-message severity="error" [text]="uploadError()!" styleClass="w-full mt-2" />
        }
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
  @Output() fieldChange = new EventEmitter<FormField>();

  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  protected form!: FormGroup;
  protected readonly imagePreviewUrl = signal<string | null>(null);
  protected readonly uploadError = signal<string | null>(null);

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

    // Set initial preview if imageUrl exists
    if (metadata?.imageUrl) {
      this.imagePreviewUrl.set(metadata.imageUrl);
    }

    this.form = this.fb.group({
      imageUrl: [metadata?.imageUrl || ''],
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

  /**
   * Handle image file selection and upload
   */
  protected onImageSelect(event: any): void {
    const file = event.files[0];
    if (!file) return;

    this.uploadError.set(null);

    // Upload to backend
    const formData = new FormData();
    formData.append('image', file);

    this.http.post<ImageUploadResponse>('/api/forms/upload', formData).subscribe({
      next: (response) => {
        // Update form with uploaded image URL
        this.form.patchValue({ imageUrl: response.imageUrl });
        this.imagePreviewUrl.set(response.imageUrl);
        this.uploadError.set(null);
      },
      error: (err) => {
        console.error('Image upload failed:', err);
        this.uploadError.set(err.error?.message || 'Image upload failed. Please try again.');
      },
    });
  }

  private emitFieldChange(): void {
    const metadata: ImageMetadata = {
      imageUrl: this.form.value.imageUrl || undefined,
      altText: this.form.value.altText,
      width: this.form.value.width || undefined,
      height: this.form.value.height || undefined,
      alignment: this.form.value.alignment || 'center',
      objectFit: this.form.value.objectFit || 'contain',
      caption: this.form.value.caption || undefined,
      customStyle: (this.field.metadata as ImageMetadata)?.customStyle, // Preserve custom CSS
    };

    this.fieldChange.emit({
      ...this.field,
      metadata,
    });
  }
}
