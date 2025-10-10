import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormField, ImageMetadata } from '@nodeangularfullstack/shared';

/**
 * Image preview component for form builder canvas.
 * Renders an image with configurable URL, alt text, dimensions, alignment, and object fit.
 */
@Component({
  selector: 'app-image-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
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
          class="image-placeholder flex flex-col items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded p-6"
          style="min-height: 150px; max-width: 300px; margin: 0 auto;"
        >
          <i class="pi pi-image text-4xl text-gray-400 mb-2"></i>
          <p class="text-sm text-gray-500 mb-1">No image uploaded</p>
          <p class="text-xs text-gray-400">{{ metadata.altText || 'Image' }}</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .image-preview {
        padding: 0.5rem 0;
      }

      .image-placeholder {
        user-select: none;
      }

      img {
        display: inline-block;
      }
    `,
  ],
})
export class ImagePreviewComponent {
  @Input({ required: true }) field!: FormField;

  /**
   * Get image metadata with type safety
   */
  get metadata(): ImageMetadata {
    return (
      (this.field.metadata as ImageMetadata) || {
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
}
