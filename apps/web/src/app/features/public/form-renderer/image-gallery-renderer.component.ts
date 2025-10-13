import { Component, ChangeDetectionStrategy, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField, ImageGalleryMetadata } from '@nodeangularfullstack/shared';
import {
  ImageGallerySelectorComponent,
  GalleryImage,
} from '../../../shared/components/image-gallery-selector/image-gallery-selector.component';

/**
 * Public form renderer component for IMAGE_GALLERY field type.
 * Renders an interactive image gallery selector for single image selection.
 * Integrates with Angular reactive forms for validation and submission.
 *
 * @example
 * ```html
 * <app-image-gallery-renderer
 *   [field]="galleryField"
 *   [control]="formControl"
 * />
 * ```
 */
@Component({
  selector: 'app-image-gallery-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ImageGallerySelectorComponent],
  template: `
    <div class="form-field mb-4">
      <!-- Field Label -->
      <label [for]="field.fieldName" class="block text-sm font-medium text-gray-700 mb-2">
        {{ field.label }}
        @if (field.required) {
          <span class="text-red-500 ml-1" aria-label="required">*</span>
        }
      </label>

      <!-- Help Text -->
      @if (field.helpText) {
        <p class="text-xs text-gray-500 mb-2">{{ field.helpText }}</p>
      }

      <!-- Image Gallery -->
      @if (metadata.images && metadata.images.length > 0) {
        <app-image-gallery-selector
          [images]="galleryImages"
          [layoutMode]="'preview-gallery'"
          [editMode]="false"
          [columns]="metadata.columns || 4"
          [aspectRatio]="metadata.aspectRatio || 'square'"
          [selectedImageKey]="selectedImageKeyForUI"
          [ariaLabel]="field.label + ' - Select one image'"
          (selectionChange)="onSelectionChange($event)"
        />
      } @else {
        <div class="error-state">
          <i class="pi pi-exclamation-triangle text-2xl text-red-500"></i>
          <p class="text-sm text-red-600 mt-2">Gallery configuration error: No images available</p>
        </div>
      }

      <!-- Validation Error -->
      @if (control.invalid && control.touched) {
        <div class="validation-error mt-2 flex items-center gap-2" aria-live="polite">
          <i class="pi pi-exclamation-circle text-red-500"></i>
          <span class="text-sm text-red-600">
            {{ getErrorMessage() }}
          </span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .form-field {
        width: 100%;
      }

      .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: #fef2f2;
        border: 2px solid #fca5a5;
        border-radius: 8px;
        min-height: 150px;
      }

      .validation-error {
        animation: slideDown 0.2s ease-out;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ImageGalleryRendererComponent implements OnInit {
  /**
   * Form field definition containing gallery metadata and configuration
   */
  @Input({ required: true }) field!: FormField;

  /**
   * Angular FormControl for reactive form integration
   * Value type: string | null (selected image index as string or null)
   */
  @Input({ required: true }) control!: FormControl;

  /**
   * Tracks the selected image key for UI preview.
   * Separate from FormControl value which stores numeric index.
   */
  protected selectedImageKeyForUI: string | null = null;

  /**
   * Get image gallery metadata with defaults.
   * Safely casts field.metadata to ImageGalleryMetadata type.
   *
   * @returns ImageGalleryMetadata object with default values
   */
  get metadata(): ImageGalleryMetadata {
    const fieldMetadata = this.field.metadata as ImageGalleryMetadata | undefined;
    if (fieldMetadata) {
      return fieldMetadata;
    }
    return {
      images: [],
      columns: 4,
      aspectRatio: 'square',
      maxImages: 10,
    };
  }

  /**
   * Transforms metadata images to GalleryImage format expected by ImageGallerySelectorComponent.
   * Ensures type compatibility between form metadata and gallery component.
   *
   * @returns Array of GalleryImage objects
   */
  get galleryImages(): GalleryImage[] {
    const images = this.metadata.images?.map((img) => ({
      key: img.key,
      url: img.url,
      alt: img.alt || 'Gallery image',
    }));
    return images ?? [];
  }

  /**
   * Initializes FormControl value and selectedImageKeyForUI.
   * Sets default value to null if undefined (no default selection).
   * If FormControl has an existing index value, converts it back to image key for UI preview.
   */
  ngOnInit(): void {
    // Initialize FormControl value as null (no default selection)
    if (this.control.value === undefined) {
      this.control.setValue(null, { emitEvent: false });
    } else if (this.control.value !== null) {
      // If FormControl has an existing index, convert to image key for UI
      const indexValue = parseInt(this.control.value, 10);
      if (
        !isNaN(indexValue) &&
        indexValue >= 1 &&
        this.metadata.images !== undefined &&
        this.metadata.images.length > 0
      ) {
        const arrayIndex = indexValue - 1;
        if (arrayIndex < this.metadata.images.length) {
          this.selectedImageKeyForUI = this.metadata.images[arrayIndex].key;
        }
      }
    }
  }

  /**
   * Handles image selection from gallery.
   * Updates both selectedImageKeyForUI (for preview) and FormControl value (1-based index for submission).
   * Marks control as touched/dirty for validation.
   *
   * @param imageKey - Selected image key (string)
   */
  onSelectionChange(imageKey: string): void {
    // Update UI preview state
    this.selectedImageKeyForUI = imageKey;

    // Find the index of the selected image (1-based)
    const imageIndex = this.metadata.images?.findIndex((img) => img.key === imageKey);
    if (imageIndex !== undefined && imageIndex !== -1) {
      // Store 1-based index (1, 2, 3, etc.) in FormControl for submission
      this.control.setValue((imageIndex + 1).toString());
    } else {
      this.control.setValue(null);
    }
    this.control.markAsTouched();
    this.control.markAsDirty();
  }

  /**
   * Gets validation error message for display.
   * Uses custom error message from field.validation if available,
   * otherwise falls back to default message.
   *
   * @returns Error message string
   */
  getErrorMessage(): string {
    if (this.control.hasError('required')) {
      return this.field.validation?.errorMessage ?? 'Please select an image';
    }
    return 'Invalid selection';
  }
}
