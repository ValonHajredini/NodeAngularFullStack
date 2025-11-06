import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ButtonModule } from 'primeng/button';
import { FormField, ImageGalleryMetadata } from '@nodeangularfullstack/shared';
import { ImageUploadComponent } from '../../../field-properties/panels/image-upload.component';

interface GalleryImage {
  key: string;
  url: string;
  alt: string;
}

/**
 * Inline image gallery manager for IMAGE_GALLERY fields.
 * Provides collapsible interface for managing gallery images directly in the canvas.
 * Follows the same UX pattern as InlineOptionManagerComponent for consistency.
 */
@Component({
  selector: 'app-inline-image-gallery-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, ButtonModule, ImageUploadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inline-image-gallery-manager mt-3 p-3 bg-gray-50 rounded border border-gray-200">
      <div
        class="flex items-center justify-between cursor-pointer"
        (click)="toggleExpanded()"
        role="button"
        [attr.aria-expanded]="isExpanded()"
        [attr.aria-label]="
          'Toggle gallery images. Currently ' + (isExpanded() ? 'expanded' : 'collapsed')
        "
      >
        <div class="flex items-center gap-2">
          <i
            class="pi text-gray-500 transition-transform"
            [class.pi-chevron-down]="!isExpanded()"
            [class.pi-chevron-up]="isExpanded()"
          ></i>
          <label class="text-sm font-medium text-gray-700 cursor-pointer">
            Gallery Images
            <span class="text-gray-500 font-normal ml-1">({{ images().length }})</span>
          </label>
        </div>
        <p-button
          label="Add Image"
          icon="pi pi-plus"
          size="small"
          (onClick)="triggerImageUpload(); $event.stopPropagation()"
          [text]="true"
          [disabled]="images().length >= maxImages"
        />
      </div>

      <!-- Hidden Image Upload Component -->
      <div class="hidden">
        <app-image-upload
          #imageUploadComponent
          [formId]="formId"
          [imageUrl]="signal(null)"
          (imageUploaded)="onImageUploaded($event)"
          (uploadErrorEvent)="onUploadError($event)"
        />
      </div>

      @if (isExpanded()) {
        <div class="mt-3">
          @if (images().length === 0) {
            <p class="text-sm text-gray-500 text-center py-4">
              No images yet. Click "Add Image" to upload your first image.
            </p>
          } @else {
            <div cdkDropList (cdkDropListDropped)="onImageReordered($event)" class="space-y-2">
              @for (image of images(); track image.key; let i = $index) {
                <div
                  cdkDrag
                  class="image-row flex items-center gap-2 p-2 bg-white border rounded"
                  [class.border-orange-500]="!image.alt"
                >
                  <i
                    class="pi pi-bars text-gray-400 cursor-move"
                    cdkDragHandle
                    aria-label="Reorder image"
                  ></i>

                  <img
                    [src]="image.url"
                    [alt]="image.alt || 'Gallery image ' + (i + 1)"
                    class="w-16 h-16 object-cover rounded"
                  />

                  <div class="flex-1">
                    <input
                      type="text"
                      [(ngModel)]="image.alt"
                      (ngModelChange)="onImageChanged()"
                      placeholder="Alt text (required)"
                      class="w-full px-2 py-1 border rounded text-sm"
                      [class.border-orange-500]="!image.alt"
                      [attr.aria-label]="'Image ' + (i + 1) + ' alt text'"
                    />
                    @if (!image.alt) {
                      <small class="text-orange-600 text-xs" role="alert">Alt text required</small>
                    } @else {
                      <small class="text-gray-500 text-xs">{{ image.key }}</small>
                    }
                  </div>

                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    size="small"
                    [text]="true"
                    (onClick)="removeImage(i)"
                    [ariaLabel]="'Remove image ' + (image.alt || 'gallery image')"
                  />
                </div>
              }
            </div>
          }

          <small class="block text-gray-500 mt-2 text-xs">
            <i class="pi pi-info-circle mr-1"></i>
            @if (images().length < minImagesRequired) {
              <span class="text-orange-600 font-semibold"
                >⚠️ Minimum {{ minImagesRequired }} images required</span
              >
            } @else {
              Alt text is required for accessibility. Drag to reorder images.
            }
          </small>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .hidden {
        display: none !important;
      }

      .image-row {
        transition: border-color 200ms;
      }
      .image-row:hover {
        border-color: #93c5fd;
      }
      .image-row.cdk-drag-preview {
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      }
      .cdk-drag-placeholder {
        opacity: 0.5;
        background: #e5e7eb;
      }
    `,
  ],
})
export class InlineImageGalleryManagerComponent implements OnInit, OnChanges {
  @Input({ required: true }) field!: FormField;
  @Input({ required: true }) formId!: string | null;
  @Output() metadataChange = new EventEmitter<ImageGalleryMetadata>();
  @ViewChild('imageUploadComponent') imageUploadComponent!: ImageUploadComponent;

  // Constants
  private static readonly MIN_IMAGES = 2;
  private static readonly DEFAULT_MAX_IMAGES = 10;

  // Signals for reactive state
  images = signal<GalleryImage[]>([]);
  isExpanded = signal(false);

  // Expose constants for template
  protected readonly minImagesRequired = InlineImageGalleryManagerComponent.MIN_IMAGES;
  protected readonly maxImages = InlineImageGalleryManagerComponent.DEFAULT_MAX_IMAGES;
  protected signal = signal;

  ngOnInit(): void {
    this.loadMetadata();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['field'] && !changes['field'].firstChange) {
      this.loadMetadata();
    }
  }

  /**
   * Load metadata from field into component state
   */
  private loadMetadata(): void {
    const metadata = this.field.metadata as ImageGalleryMetadata | undefined;
    if (metadata?.images) {
      this.images.set([...metadata.images]);
    } else {
      this.images.set([]);
    }
  }

  /**
   * Toggle the expanded/collapsed state
   */
  toggleExpanded(): void {
    this.isExpanded.set(!this.isExpanded());
  }

  /**
   * Programmatically trigger the hidden ImageUploadComponent's file input.
   * Auto-expands the section when adding a new image.
   */
  protected triggerImageUpload(): void {
    if (!this.formId) {
      console.warn('Cannot upload image: form not saved yet');
      return;
    }

    // Auto-expand when adding new image
    this.isExpanded.set(true);

    // Find the file input within the hidden ImageUploadComponent
    const fileInput = document.querySelector(
      '.inline-image-gallery-manager .hidden app-image-upload input[type="file"]',
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    } else {
      console.error('File input not found in ImageUploadComponent');
    }
  }

  /**
   * Handle successful image upload from ImageUploadComponent
   */
  protected onImageUploaded(imageUrl: string): void {
    const newImage: GalleryImage = {
      key: `image-gallery-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      url: imageUrl,
      alt: '',
    };

    const updated = [...this.images(), newImage];
    this.images.set(updated);
    this.emitMetadata();
  }

  /**
   * Handle upload error from ImageUploadComponent
   */
  protected onUploadError(error: string): void {
    console.error('Image upload error:', error);
    // Error is already displayed by ImageUploadComponent
  }

  /**
   * Remove image at the specified index
   */
  removeImage(index: number): void {
    const updated = this.images().filter((_, i) => i !== index);
    this.images.set(updated);
    this.emitMetadata();
  }

  /**
   * Handle any image change (alt text edit)
   */
  onImageChanged(): void {
    this.emitMetadata();
  }

  /**
   * Handle drag-drop reordering of images
   */
  onImageReordered(event: CdkDragDrop<GalleryImage[]>): void {
    const updated = [...this.images()];
    moveItemInArray(updated, event.previousIndex, event.currentIndex);
    this.images.set(updated);
    this.emitMetadata();
  }

  /**
   * Emit metadata changes to parent component
   */
  private emitMetadata(): void {
    const metadata = this.field.metadata as ImageGalleryMetadata | undefined;
    const updatedMetadata: ImageGalleryMetadata = {
      images: this.images(),
      columns: metadata?.columns || 4,
      aspectRatio: metadata?.aspectRatio || 'square',
      maxImages: metadata?.maxImages || InlineImageGalleryManagerComponent.DEFAULT_MAX_IMAGES,
    };
    this.metadataChange.emit(updatedMetadata);
  }
}
