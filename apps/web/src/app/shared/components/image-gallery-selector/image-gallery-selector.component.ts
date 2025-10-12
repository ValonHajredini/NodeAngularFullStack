import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  input,
  output,
  effect,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';

/**
 * Interface for image objects in the gallery
 */
export interface GalleryImage {
  /** Unique identifier for the image */
  key: string;
  /** URL of the image */
  url: string;
  /** Optional alt text for accessibility */
  alt?: string;
}

/** Responsive breakpoint constants */
const BREAKPOINT_MOBILE = 768;
const BREAKPOINT_TABLET = 1024;

/** Grid column constants */
const COLUMNS_MOBILE = 2;
const COLUMNS_TABLET = 3;
const COLUMNS_DESKTOP = 4;

/** Default window width for SSR */
const DEFAULT_WINDOW_WIDTH = BREAKPOINT_TABLET;

/**
 * Reusable image gallery selector component with single-selection behavior.
 * Displays images in a responsive grid with keyboard navigation and accessibility support.
 *
 * @example
 * ```html
 * <app-image-gallery-selector
 *   [images]="galleryImages"
 *   [selectedImageKey]="selectedKey"
 *   (selectionChange)="onImageSelected($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-image-gallery-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, InputTextModule],
  template: `
    <div
      role="radiogroup"
      [attr.aria-label]="ariaLabel()"
      tabindex="-1"
      class="image-gallery-selector"
      (keydown)="onKeyDown($event)"
    >
      @if (images().length === 0) {
        <div class="empty-state">
          <i class="pi pi-images text-4xl text-gray-400"></i>
          <p class="text-gray-500 mt-2">No images available</p>
        </div>
      } @else {
        @if (layoutMode() === 'preview-gallery') {
          <!-- Preview Pane Section -->
          <div
            class="preview-pane"
            [attr.aria-label]="'Preview: ' + (previewImage()?.alt || 'Selected image')"
          >
            @if (previewImage()) {
              <img
                [src]="previewImage()!.url"
                [alt]="previewImage()!.alt || 'Selected image preview'"
                class="preview-image"
                loading="lazy"
              />
              @if (previewImage()!.alt) {
                <p class="preview-alt-text">{{ previewImage()!.alt }}</p>
              }
            } @else {
              <div class="empty-preview">
                <i class="pi pi-image text-5xl text-gray-300"></i>
                <p class="text-gray-500">No image selected</p>
              </div>
            }
          </div>

          <!-- Thumbnail Gallery Section -->
          <div class="thumbnail-gallery">
            <div class="thumbnail-scroll-container">
              @for (image of images(); track image.key; let idx = $index) {
                <div class="thumbnail-item">
                  <div
                    role="radio"
                    [attr.aria-checked]="selectedImageKey() === image.key"
                    [attr.aria-label]="image.alt || 'Image ' + (idx + 1)"
                    [tabindex]="focusedIndex() === idx ? 0 : -1"
                    class="thumbnail-wrapper"
                    [class.selected]="selectedImageKey() === image.key"
                    [class.focused]="focusedIndex() === idx"
                    (click)="selectImage(image.key)"
                    (focus)="onImageFocus(idx)"
                    (keydown.space)="selectImage(image.key); $event.preventDefault()"
                    (keydown.enter)="selectImage(image.key); $event.preventDefault()"
                  >
                    <img
                      [src]="image.url"
                      [alt]="image.alt || 'Thumbnail ' + (idx + 1)"
                      class="thumbnail-image"
                      loading="lazy"
                    />
                    <!-- Delete button (edit mode, hover overlay) -->
                    @if (editMode()) {
                      <button
                        class="thumbnail-delete"
                        type="button"
                        (click)="deleteImageHandler(image.key); $event.stopPropagation()"
                        [attr.aria-label]="'Delete ' + (image.alt || 'image ' + (idx + 1))"
                      >
                        <i class="pi pi-times"></i>
                      </button>
                    }
                  </div>
                  <!-- Description input (edit mode) -->
                  @if (editMode()) {
                    <input
                      type="text"
                      pInputText
                      placeholder="Image description..."
                      [value]="image.alt || ''"
                      (input)="onDescriptionChange(image.key, $any($event.target).value)"
                      class="thumbnail-description"
                      [attr.aria-label]="'Description for image ' + (idx + 1)"
                    />
                  }
                </div>
              }

              <!-- Add Image Button (edit mode) -->
              @if (editMode() && images().length < maxImages()) {
                <button
                  class="add-image-button"
                  type="button"
                  (click)="requestImageUpload()"
                  aria-label="Add new image"
                >
                  <i class="pi pi-plus text-2xl"></i>
                  <span class="text-xs">Add Image</span>
                </button>
              }
            </div>
          </div>
        } @else {
          <!-- Grid Layout (existing behavior) -->
          <div
            class="image-grid"
            [class.grid-cols-2]="effectiveColumns() === 2"
            [class.grid-cols-3]="effectiveColumns() === 3"
            [class.grid-cols-4]="effectiveColumns() === 4"
          >
            @for (image of images(); track image.key; let idx = $index) {
              <div
                role="radio"
                [attr.aria-checked]="selectedImageKey() === image.key"
                [attr.aria-label]="image.alt || 'Image ' + (idx + 1)"
                [tabindex]="focusedIndex() === idx ? 0 : -1"
                class="image-item"
                [class.selected]="selectedImageKey() === image.key"
                [class.focused]="focusedIndex() === idx"
                (click)="selectImage(image.key)"
                (focus)="onImageFocus(idx)"
                (keydown.space)="selectImage(image.key); $event.preventDefault()"
                (keydown.enter)="selectImage(image.key); $event.preventDefault()"
              >
                <img
                  [src]="image.url"
                  [alt]="image.alt || 'Image ' + (idx + 1)"
                  [class.aspect-square]="aspectRatio() === 'square'"
                  [class.aspect-video]="aspectRatio() === '16:9'"
                  loading="lazy"
                  class="w-full h-full object-cover"
                />
                @if (selectedImageKey() === image.key) {
                  <div class="selection-indicator">
                    <i class="pi pi-check-circle"></i>
                  </div>
                }
              </div>
            }
          </div>
        }
      }

      <!-- Screen reader live region -->
      <div aria-live="polite" aria-atomic="true" class="sr-only">
        @if (selectedImageKey()) {
          Image selected: {{ getSelectedImageAlt() }}
        }
      </div>
    </div>
  `,
  styles: [
    `
      .image-gallery-selector {
        width: 100%;
      }

      .image-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(4, 1fr);
      }

      .image-grid.grid-cols-2 {
        grid-template-columns: repeat(2, 1fr);
      }

      .image-grid.grid-cols-3 {
        grid-template-columns: repeat(3, 1fr);
      }

      .image-grid.grid-cols-4 {
        grid-template-columns: repeat(4, 1fr);
      }

      @media (max-width: 1023px) {
        .image-grid:not(.grid-cols-2):not(.grid-cols-3):not(.grid-cols-4) {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      @media (max-width: 767px) {
        .image-grid:not(.grid-cols-2):not(.grid-cols-3):not(.grid-cols-4) {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      .image-item {
        position: relative;
        border: 2px solid #d1d5db;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.2s ease-out;
        min-height: 120px;
        min-width: 44px; /* WCAG minimum touch target */
      }

      .image-item:hover {
        transform: scale(1.02);
        border-color: #9ca3af;
      }

      .image-item:active {
        transform: scale(0.98);
      }

      .image-item.selected {
        border-color: #3b82f6;
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }

      .image-item.focused {
        outline: 2px dotted #3b82f6;
        outline-offset: 2px;
      }

      .image-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .selection-indicator {
        position: absolute;
        top: 8px;
        right: 8px;
        background: #3b82f6;
        color: white;
        border-radius: 50%;
        padding: 4px;
        font-size: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        background: #f9fafb;
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        min-height: 200px;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }

      .aspect-square {
        aspect-ratio: 1 / 1;
      }

      .aspect-video {
        aspect-ratio: 16 / 9;
      }

      /* Preview-Gallery Layout Styles */
      .preview-pane {
        width: 100%;
        min-height: 300px;
        max-height: 500px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #f9fafb;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        overflow: hidden;
      }

      .preview-image {
        max-width: 100%;
        max-height: 450px;
        object-fit: contain;
        border-radius: 4px;
        transition: opacity 200ms ease-in-out;
      }

      .preview-alt-text {
        margin-top: 0.5rem;
        text-align: center;
        font-size: 0.875rem;
        color: #6b7280;
      }

      .empty-preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #9ca3af;
      }

      .thumbnail-gallery {
        width: 100%;
        overflow: hidden;
      }

      .thumbnail-scroll-container {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 8px;
        scroll-behavior: smooth;
        scrollbar-width: thin;
        scrollbar-color: #d1d5db transparent;
      }

      .thumbnail-scroll-container::-webkit-scrollbar {
        height: 6px;
      }

      .thumbnail-scroll-container::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;
      }

      .thumbnail-item {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
      }

      .thumbnail-wrapper {
        position: relative;
        width: auto;
        height: 100px;
        border: 2px solid #d1d5db;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: all 150ms ease-out;
      }

      .thumbnail-wrapper:hover {
        border-color: #9ca3af;
        transform: scale(1.02);
      }

      .thumbnail-wrapper.selected {
        border: 3px solid #3b82f6;
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }

      .thumbnail-wrapper.focused {
        outline: 2px dotted #3b82f6;
        outline-offset: 2px;
      }

      .thumbnail-image {
        width: auto;
        height: 100%;
        object-fit: cover;
      }

      .thumbnail-delete {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 24px;
        height: 24px;
        background: rgba(239, 68, 68, 0.9);
        color: white;
        border: none;
        border-radius: 50%;
        display: none;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 150ms;
      }

      .thumbnail-wrapper:hover .thumbnail-delete {
        display: flex;
      }

      .thumbnail-delete:hover {
        background: rgb(220, 38, 38);
      }

      .thumbnail-description {
        margin-top: 8px;
        width: 120px;
        font-size: 0.75rem;
      }

      .add-image-button {
        flex-shrink: 0;
        width: 100px;
        height: 100px;
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        background: #f9fafb;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #6b7280;
        transition: all 150ms ease-out;
      }

      .add-image-button:hover:not(:disabled) {
        border-color: #3b82f6;
        background: #eff6ff;
        color: #3b82f6;
        transform: scale(1.02);
      }

      .add-image-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* Responsive Styles */
      @media (max-width: 767px) {
        .preview-pane {
          min-height: 200px;
          max-height: 300px;
        }

        .preview-image {
          max-height: 250px;
        }

        .thumbnail-wrapper {
          height: 60px;
        }

        .thumbnail-description {
          width: 80px;
        }

        .add-image-button {
          width: 60px;
          height: 60px;
        }
      }

      @media (min-width: 768px) and (max-width: 1023px) {
        .preview-pane {
          min-height: 300px;
          max-height: 400px;
        }

        .preview-image {
          max-height: 350px;
        }

        .thumbnail-wrapper {
          height: 80px;
        }

        .thumbnail-description {
          width: 100px;
        }

        .add-image-button {
          width: 80px;
          height: 80px;
        }
      }
    `,
  ],
})
export class ImageGallerySelectorComponent {
  /** Array of images to display in the gallery */
  images = input.required<GalleryImage[]>();

  /** Key of the currently selected image */
  selectedImageKey = input<string | null>(null);

  /** Number of grid columns (default: responsive based on viewport) */
  columns = input<typeof COLUMNS_MOBILE | typeof COLUMNS_TABLET | typeof COLUMNS_DESKTOP>(
    COLUMNS_DESKTOP,
  );

  /** Aspect ratio for images */
  aspectRatio = input<'square' | '16:9' | 'auto'>('square');

  /** Aria label for the gallery */
  ariaLabel = input<string>('Image gallery selector');

  /** Layout mode: 'grid' (default) or 'preview-gallery' */
  layoutMode = input<'grid' | 'preview-gallery'>('grid');

  /** Edit mode: enables add button and description inputs in preview-gallery layout */
  editMode = input<boolean>(false);

  /** Maximum number of images allowed (used for add button disabling) */
  maxImages = input<number>(10);

  /** Event emitted when user selects an image */
  selectionChange = output<string>();

  /** Event emitted when user requests to upload a new image (edit mode only) */
  imageUploadRequested = output<void>();

  /** Event emitted when user changes an image description (edit mode only) */
  imageDescriptionChanged = output<{ key: string; description: string }>();

  /** Event emitted when user deletes an image (edit mode only) */
  imageDeleted = output<string>();

  /** Internal state: Index of the currently focused image for keyboard navigation */
  protected focusedIndex = signal<number>(0);

  /** Internal state: Window width for responsive column calculation */
  private windowWidth = signal<number>(
    typeof window !== 'undefined' ? window.innerWidth : DEFAULT_WINDOW_WIDTH,
  );

  /** Computed: Effective number of columns based on responsive breakpoints */
  protected effectiveColumns = computed(() => {
    const width = this.windowWidth();
    if (width < BREAKPOINT_MOBILE) return COLUMNS_MOBILE;
    if (width < BREAKPOINT_TABLET) return COLUMNS_TABLET;
    return this.columns();
  });

  /**
   * Computed: Preview image for preview-gallery layout.
   * Returns the selected image or the first image if none selected.
   */
  protected previewImage = computed(() => {
    const selectedKey = this.selectedImageKey();
    const images = this.images();
    if (!images || images.length === 0) return null;
    return images.find((img) => img.key === selectedKey) ?? images[0] ?? null;
  });

  /**
   * Constructor - initializes focus tracking effect
   */
  constructor() {
    // Sync focusedIndex with selectedImageKey on initialization
    effect(() => {
      const selectedKey = this.selectedImageKey();
      const images = this.images();
      if (selectedKey !== null && selectedKey !== '') {
        const idx = images.findIndex((img) => img.key === selectedKey);
        if (idx !== -1) {
          this.focusedIndex.set(idx);
        }
      }
    });
  }

  /**
   * Selects an image and emits the selection change event.
   * Implements radio button behavior (only one selection at a time).
   *
   * @param key - Unique key of the image to select
   */
  selectImage(key: string): void {
    this.selectionChange.emit(key);
  }

  /**
   * Handles keyboard navigation within the gallery.
   * Supports arrow keys (Up/Down/Left/Right) for navigation.
   *
   * @param event - Keyboard event
   */
  onKeyDown(event: KeyboardEvent): void {
    const totalImages = this.images().length;
    const currentIndex = this.focusedIndex();
    const cols = this.effectiveColumns();

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        newIndex = Math.min(currentIndex + 1, totalImages - 1);
        event.preventDefault();
        break;
      case 'ArrowLeft':
        newIndex = Math.max(currentIndex - 1, 0);
        event.preventDefault();
        break;
      case 'ArrowDown':
        newIndex = Math.min(currentIndex + cols, totalImages - 1);
        event.preventDefault();
        break;
      case 'ArrowUp':
        newIndex = Math.max(currentIndex - cols, 0);
        event.preventDefault();
        break;
    }

    if (newIndex !== currentIndex) {
      this.focusedIndex.set(newIndex);
      // Focus the element programmatically
      this.focusImageElement();
    }
  }

  /**
   * Handles focus event on an image item.
   * Updates the focused index for keyboard navigation.
   *
   * @param index - Index of the focused image
   */
  onImageFocus(index: number): void {
    this.focusedIndex.set(index);
  }

  /**
   * Programmatically focuses an image element.
   * Used for keyboard navigation to ensure visual focus follows keyboard focus.
   * The element to focus is determined by tabindex="0" (set based on focusedIndex).
   */
  private focusImageElement(): void {
    setTimeout(() => {
      const element = document.querySelector('.image-item[tabindex="0"]') as HTMLElement;
      element?.focus();
    });
  }

  /**
   * Gets the alt text of the currently selected image for screen readers.
   * Used in the aria-live region to announce selection changes.
   *
   * @returns Alt text of the selected image or fallback text
   */
  getSelectedImageAlt(): string {
    const selected = this.images().find((img) => img.key === this.selectedImageKey());
    return selected?.alt ?? 'Selected image';
  }

  /**
   * Handles window resize events to update responsive column layout.
   * Updates the windowWidth signal which triggers effectiveColumns recomputation.
   */
  @HostListener('window:resize')
  onWindowResize(): void {
    if (typeof window !== 'undefined') {
      this.windowWidth.set(window.innerWidth);
    }
  }

  /**
   * Requests image upload in edit mode.
   * Emits imageUploadRequested event for parent component to handle file dialog.
   */
  requestImageUpload(): void {
    this.imageUploadRequested.emit();
  }

  /**
   * Handles image description change in edit mode.
   * Emits imageDescriptionChanged event with image key and new description.
   *
   * @param key - Unique key of the image whose description changed
   * @param description - New description text
   */
  onDescriptionChange(key: string, description: string): void {
    this.imageDescriptionChanged.emit({ key, description });
  }

  /**
   * Handles image deletion in edit mode.
   * Emits imageDeleted event with image key for parent component to remove.
   *
   * @param key - Unique key of the image to delete
   */
  deleteImageHandler(key: string): void {
    this.imageDeleted.emit(key);
  }
}
