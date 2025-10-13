import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
  ViewChild,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormField, ImageGalleryMetadata } from '@nodeangularfullstack/shared';
import { Accordion, AccordionPanel } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ImageUploadComponent } from './image-upload.component';
import { ImageGallerySelectorComponent } from '../../../../../../shared/components/image-gallery-selector/image-gallery-selector.component';

interface GalleryImage {
  key: string;
  url: string;
  alt: string;
}

/**
 * Properties panel for IMAGE_GALLERY field type.
 * Manages gallery images with upload, delete, reorder, and alt text editing.
 * Provides configuration options for columns, aspect ratio, and max images.
 */
@Component({
  selector: 'app-image-gallery-properties-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    Accordion,
    AccordionPanel,
    ButtonModule,
    InputTextModule,
    Select,
    ImageUploadComponent,
    ImageGallerySelectorComponent,
  ],
  template: `
    <p-accordion>
      <!-- Gallery Images Section -->
      <p-accordionpanel header="Gallery Images">
        <!-- Status Bar (Styled Box) -->
        <div class="status-box mb-4">
          <div class="flex items-center justify-between">
            <span class="font-medium text-sm text-gray-700">
              Gallery Images: {{ images().length }} / {{ maxImages() }}
            </span>
            @if (isUploading()) {
              <span class="text-xs text-blue-600 flex items-center gap-1">
                <i class="pi pi-spin pi-spinner"></i>
                Uploading...
              </span>
            }
          </div>
          @if (images().length < minImagesRequired) {
            <p class="text-xs text-orange-600 mt-1">
              ⚠️ Minimum {{ minImagesRequired }} images required
            </p>
          }
          @if (!allImagesHaveAltText()) {
            <p class="text-xs text-orange-600 mt-1">⚠️ All images need alt text</p>
          }
        </div>

        <!-- Hidden Image Upload Component -->
        <div class="hidden">
          <app-image-upload
            #imageUploadComponent
            [formId]="formId"
            [imageUrl]="signal(null)"
            (imageUploaded)="onImageUploaded($event)"
            (uploadErrorEvent)="onUploadError($event)"
            (uploadingChange)="onUploadingChange($event)"
          />
        </div>

        <!-- Enhanced Preview-Gallery Layout (Edit Mode) -->
        @if (images().length > 0) {
          <app-image-gallery-selector
            [images]="images()"
            [layoutMode]="'preview-gallery'"
            [editMode]="true"
            [maxImages]="maxImages()"
            [selectedImageKey]="selectedImageKey()"
            (selectionChange)="onImageSelected($event)"
            (imageUploadRequested)="triggerImageUpload()"
            (imageDescriptionChanged)="onDescriptionChanged($event)"
            (imageDeleted)="onImageDeleted($event)"
          />
        } @else {
          <div class="empty-gallery-state">
            <i class="pi pi-images text-5xl text-gray-300 mb-3"></i>
            <p class="text-gray-500 mb-3">No images in gallery</p>
            <button
              pButton
              type="button"
              label="Add First Image"
              icon="pi pi-plus"
              (click)="triggerImageUpload()"
            ></button>
          </div>
        }
      </p-accordionpanel>

      <!-- Gallery Settings Section -->
      <p-accordionpanel header="Gallery Settings">
        <div class="space-y-4">
          <!-- Grid Columns -->
          <div>
            <label class="block text-sm font-medium mb-1">Grid Columns</label>
            <p-select
              [options]="columnOptions"
              [ngModel]="columns()"
              (ngModelChange)="updateColumns($event)"
              placeholder="Select columns"
              class="w-full"
              [style]="{ width: '100%' }"
            />
          </div>

          <!-- Aspect Ratio -->
          <div>
            <label class="block text-sm font-medium mb-1">Image Aspect Ratio</label>
            <p-select
              [options]="aspectRatioOptions"
              [ngModel]="aspectRatio()"
              (ngModelChange)="updateAspectRatio($event)"
              placeholder="Select aspect ratio"
              class="w-full"
              [style]="{ width: '100%' }"
            />
          </div>

          <!-- Max Images -->
          <div>
            <label class="block text-sm font-medium mb-1">Maximum Images</label>
            <input
              type="number"
              pInputText
              [value]="maxImages()"
              (input)="updateMaxImages(+$any($event.target).value)"
              min="2"
              max="20"
              class="w-full"
            />
            <p class="text-xs text-gray-500 mt-1">Recommended: 2-10 images</p>
          </div>
        </div>
      </p-accordionpanel>
    </p-accordion>
  `,
  styles: [
    `
      .hidden {
        display: none !important;
      }

      .status-box {
        padding: 0.75rem 1rem;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
      }

      .empty-gallery-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        background: #f9fafb;
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        min-height: 300px;
      }
    `,
  ],
})
export class ImageGalleryPropertiesPanelComponent implements OnInit {
  @Input({ required: true }) field!: FormField;
  @Input({ required: true }) formId!: string | null;
  @Output() metadataChange = new EventEmitter<ImageGalleryMetadata>();
  @ViewChild('imageUploadComponent') imageUploadComponent!: ImageUploadComponent;

  // Constants for default values
  private static readonly DEFAULT_COLUMNS = 4;
  private static readonly DEFAULT_MAX_IMAGES = 10;
  private static readonly MIN_IMAGES = 2;
  private static readonly MAX_IMAGES_LIMIT = 20;

  // Signals for reactive state management
  protected readonly images = signal<GalleryImage[]>([]);
  protected readonly columns = signal<2 | 3 | 4>(
    ImageGalleryPropertiesPanelComponent.DEFAULT_COLUMNS,
  );
  protected readonly aspectRatio = signal<'square' | '16:9' | 'auto'>('square');
  protected readonly maxImages = signal<number>(
    ImageGalleryPropertiesPanelComponent.DEFAULT_MAX_IMAGES,
  );
  protected readonly selectedImageKey = signal<string | null>(null);
  protected readonly isUploading = signal<boolean>(false);

  // Dropdown options
  protected readonly columnOptions = [
    { label: '2 Columns', value: 2 },
    { label: '3 Columns', value: 3 },
    { label: '4 Columns', value: 4 },
  ];

  protected readonly aspectRatioOptions = [
    { label: 'Square (1:1)', value: 'square' },
    { label: 'Widescreen (16:9)', value: '16:9' },
    { label: 'Auto', value: 'auto' },
  ];

  // Computed signal for validation state
  protected readonly isValid = computed(() => {
    const imgs = this.images();
    return (
      imgs.length >= ImageGalleryPropertiesPanelComponent.MIN_IMAGES &&
      imgs.every((img) => img.alt && img.alt.trim() !== '')
    );
  });

  protected signal = signal;
  protected get minImagesRequired(): number {
    return ImageGalleryPropertiesPanelComponent.MIN_IMAGES;
  }

  ngOnInit(): void {
    this.loadMetadata();
    // Select first image by default for preview
    const imgs = this.images();
    if (imgs.length > 0) {
      this.selectedImageKey.set(imgs[0].key);
    }
  }

  /**
   * Helper method to check if all images have alt text
   */
  protected allImagesHaveAltText(): boolean {
    return this.images().every((img) => img.alt && img.alt.trim() !== '');
  }

  /**
   * Programmatically trigger the hidden ImageUploadComponent's file input.
   * Called when user clicks the "Add Image" button.
   */
  protected triggerImageUpload(): void {
    if (!this.formId) {
      console.warn('Cannot upload image: form not saved yet');
      return;
    }

    // Find the file input within the hidden ImageUploadComponent
    const fileInput = document.querySelector(
      '.hidden app-image-upload input[type="file"]',
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    } else {
      console.error('File input not found in ImageUploadComponent');
    }
  }

  /**
   * Load metadata from field into component state
   */
  private loadMetadata(): void {
    const metadata = this.field.metadata as ImageGalleryMetadata | undefined;
    if (metadata) {
      this.images.set(metadata.images || []);
      this.columns.set(metadata.columns || ImageGalleryPropertiesPanelComponent.DEFAULT_COLUMNS);
      this.aspectRatio.set(metadata.aspectRatio || 'square');
      this.maxImages.set(
        metadata.maxImages || ImageGalleryPropertiesPanelComponent.DEFAULT_MAX_IMAGES,
      );
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
   * Handle uploading state change from ImageUploadComponent
   */
  protected onUploadingChange(isUploading: boolean): void {
    this.isUploading.set(isUploading);
  }

  /**
   * Handle image selection change from preview-gallery component
   */
  protected onImageSelected(key: string): void {
    this.selectedImageKey.set(key);
  }

  /**
   * Handle image description change from preview-gallery component
   */
  protected onDescriptionChanged(event: { key: string; description: string }): void {
    const updated = this.images().map((img) =>
      img.key === event.key ? { ...img, alt: event.description } : img,
    );
    this.images.set(updated);
    this.emitMetadata();
  }

  /**
   * Handle image deletion from preview-gallery component
   */
  protected onImageDeleted(key: string): void {
    const updated = this.images().filter((img) => img.key !== key);
    this.images.set(updated);

    // If deleted image was selected, select first remaining image
    if (this.selectedImageKey() === key && updated.length > 0) {
      this.selectedImageKey.set(updated[0].key);
    } else if (updated.length === 0) {
      this.selectedImageKey.set(null);
    }

    this.emitMetadata();
  }

  /**
   * Update grid columns configuration
   */
  protected updateColumns(columns: 2 | 3 | 4): void {
    this.columns.set(columns);
    this.emitMetadata();
  }

  /**
   * Update aspect ratio configuration
   */
  protected updateAspectRatio(ratio: 'square' | '16:9' | 'auto'): void {
    this.aspectRatio.set(ratio);
    this.emitMetadata();
  }

  /**
   * Update max images configuration
   */
  protected updateMaxImages(max: number): void {
    this.maxImages.set(
      Math.max(
        ImageGalleryPropertiesPanelComponent.MIN_IMAGES,
        Math.min(max, ImageGalleryPropertiesPanelComponent.MAX_IMAGES_LIMIT),
      ),
    );
    this.emitMetadata();
  }

  /**
   * Emit metadata changes to parent component
   */
  private emitMetadata(): void {
    const metadata: ImageGalleryMetadata = {
      images: this.images(),
      columns: this.columns(),
      aspectRatio: this.aspectRatio(),
      maxImages: this.maxImages(),
    };
    this.metadataChange.emit(metadata);
  }
}
