import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormField, ImageMetadata } from '@nodeangularfullstack/shared';
import { ImageUploadComponent } from '../../field-properties/panels/image-upload.component';

/**
 * Image preview component for form builder canvas.
 * Renders an image with configurable URL, alt text, dimensions, alignment, and object fit.
 * Allows clicking placeholder to upload image.
 */
@Component({
  selector: 'app-image-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ImageUploadComponent],
  template: `
    <div
      class="image-preview"
      [class.text-left]="metadata.alignment === 'left'"
      [class.text-center]="metadata.alignment === 'center' || !metadata.alignment"
      [class.text-right]="metadata.alignment === 'right'"
      [class.w-full]="metadata.alignment === 'full'"
    >
      @if (metadata.imageUrl) {
        <img
          [src]="metadata.imageUrl"
          [alt]="metadata.altText || 'Image'"
          [style.width]="getWidth()"
          [style.height]="getHeight()"
          [style.object-fit]="metadata.objectFit || 'contain'"
          class="max-w-full max-h-[200px] rounded border border-gray-200"
          loading="lazy"
        />
        @if (metadata.caption) {
          <p class="text-sm text-gray-600 mt-2 mb-0">{{ metadata.caption }}</p>
        }
      } @else {
        <div
          class="image-placeholder flex flex-col items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded p-6 cursor-pointer hover:bg-gray-200 hover:border-gray-400 transition-colors"
          style="min-height: 150px; max-width: 300px; margin: 0 auto; pointer-events: auto;"
          (click)="triggerImageUpload(); $event.stopPropagation()"
          role="button"
          tabindex="0"
          [attr.aria-label]="'Click to upload image for ' + (metadata.altText || 'Image')"
        >
          <i class="pi pi-image text-4xl text-gray-400 mb-2"></i>
          <p class="text-sm text-gray-500 mb-1">No image uploaded</p>
          <p class="text-xs text-gray-400">Click to upload</p>
        </div>
      }

      <!-- Hidden Image Upload Component -->
      <div class="hidden">
        <app-image-upload
          #imageUploadComponent
          [formId]="formId"
          [imageUrl]="signal(metadata.imageUrl ?? null)"
          (imageUploaded)="onImageUploaded($event)"
          (uploadErrorEvent)="onUploadError($event)"
        />
      </div>
    </div>
  `,
  styleUrls: ['./image-preview.component.scss'],
})
export class ImagePreviewComponent {
  @Input({ required: true }) field!: FormField;
  @Input({ required: true }) formId!: string | null;
  @Output() imageUpdated = new EventEmitter<string>();
  @ViewChild('imageUploadComponent') imageUploadComponent!: ImageUploadComponent;

  // Expose signal for template
  protected signal = signal;

  /**
   * Get image metadata with type safety
   */
  get metadata(): ImageMetadata {
    return (
      (this.field.metadata as ImageMetadata | undefined) ?? {
        altText: 'Image',
        alignment: 'center',
        width: '100%',
        height: 'auto',
        objectFit: 'contain',
      }
    );
  }

  /**
   * Get formatted width value
   */
  getWidth(): string {
    const width = this.metadata.width;
    if (width === undefined || width === '100%') {
      return '100%';
    }
    if (typeof width === 'number') {
      return `${width}px`;
    }
    return width as string;
  }

  /**
   * Get formatted height value
   */
  getHeight(): string {
    const height = this.metadata.height;
    if (height === undefined || height === 'auto') {
      return 'auto';
    }
    if (typeof height === 'number') {
      return `${height}px`;
    }
    return height as string;
  }

  /**
   * Programmatically trigger the hidden ImageUploadComponent's file input.
   */
  protected triggerImageUpload(): void {
    if (this.formId === null || this.formId === '') {
      // eslint-disable-next-line no-console
      console.warn('Cannot upload image: form not saved yet. Please save the form first.');
      alert('Please save the form before uploading images.');
      return;
    }

    // Find the file input within the hidden ImageUploadComponent
    setTimeout(() => {
      const fileInput = document.querySelector(
        '.image-preview .hidden app-image-upload input[type="file"]',
      ) as HTMLInputElement;
      if (fileInput !== null) {
        fileInput.click();
      } else {
        // eslint-disable-next-line no-console
        console.error('File input not found in ImageUploadComponent');
      }
    }, 0);
  }

  /**
   * Handle successful image upload from ImageUploadComponent
   */
  protected onImageUploaded(imageUrl: string): void {
    this.imageUpdated.emit(imageUrl);
  }

  /**
   * Handle upload error from ImageUploadComponent
   */
  protected onUploadError(error: string): void {
    // eslint-disable-next-line no-console
    console.error('Image upload error:', error);
    // Error is already displayed by ImageUploadComponent
  }
}
