import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormField, ImageGalleryMetadata } from '@nodeangularfullstack/shared';
import { ImageGallerySelectorComponent } from '../../../../shared/components/image-gallery-selector/image-gallery-selector.component';

/**
 * Preview component for IMAGE_GALLERY field type in form builder canvas.
 * Displays non-interactive gallery preview using ImageGallerySelectorComponent.
 * Shows empty state when no images uploaded.
 */
@Component({
  selector: 'app-image-gallery-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ImageGallerySelectorComponent],
  template: `
    <div class="field-preview">
      <!-- Field Label -->
      <div class="preview-label" role="heading" aria-level="3">
        {{ field.label }}
      </div>

      @if (metadata.images && metadata.images.length > 0) {
        <!-- Gallery Preview (read-only) -->
        <app-image-gallery-selector
          [images]="metadata.images"
          [columns]="metadata.columns || 4"
          [aspectRatio]="metadata.aspectRatio || 'square'"
          [selectedImageKey]="metadata.images[0]?.key || null"
          class="pointer-events-none"
        />
      } @else {
        <!-- Empty State -->
        <div class="empty-state">
          <i class="pi pi-images text-4xl text-gray-400 mb-2"></i>
          <p class="text-sm text-gray-500 font-medium">No images uploaded</p>
          <p class="text-xs text-gray-400">Add images in the properties panel</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .field-preview {
        pointer-events: none;
        opacity: 0.9;
        margin-bottom: 1rem;
      }

      .preview-label {
        display: block;
        color: var(--theme-label-color, #374151);
        font-family: var(--theme-body-font, system-ui);
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem 1rem;
        background: #f9fafb;
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        min-height: 150px;
      }
    `,
  ],
})
export class ImageGalleryPreviewComponent {
  @Input({ required: true }) field!: FormField;

  /**
   * Get metadata with default values
   */
  get metadata(): ImageGalleryMetadata {
    const fieldMetadata = this.field.metadata as ImageGalleryMetadata | null | undefined;
    if (fieldMetadata !== null && fieldMetadata !== undefined) {
      return fieldMetadata;
    }
    return {
      images: [],
      columns: 4,
      aspectRatio: 'square',
      maxImages: 10,
    };
  }
}
