import { Component, ChangeDetectionStrategy, Input, OnInit, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField, ImageGalleryMetadata, ImageVariantMetadata } from '@nodeangularfullstack/shared';
import {
  ImageGallerySelectorComponent,
  GalleryImage,
} from '../../../shared/components/image-gallery-selector/image-gallery-selector.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

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
      <label [for]="field.fieldName" class="gallery-label">
        {{ field.label }}
        @if (field.required) {
          <span class="text-red-500 ml-1" aria-label="required">*</span>
        }
      </label>

      <!-- Help Text -->
      @if (field.helpText) {
        <p class="gallery-help-text">{{ field.helpText }}</p>
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

      <!-- Stock Badge (AC10) -->
      @if (stockInfo(); as stock) {
        <div class="stock-badge mt-3" [class]="getStockBadgeClass()">
          <i class="pi pi-box"></i>
          <span class="stock-text">{{ stock.stock_quantity }} units available</span>
        </div>
      }

      <!-- Out of Stock Message (AC10) -->
      @if (stockInfo() && !stockInfo()!.available) {
        <div class="out-of-stock-message mt-2">
          <i class="pi pi-times-circle"></i>
          <span>Out of Stock</span>
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

      .gallery-label {
        display: block;
        color: var(--theme-label-color, #374151);
        font-family: var(--theme-body-font, system-ui);
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
      }

      .gallery-help-text {
        color: var(--theme-text-secondary, #6b7280);
        font-family: var(--theme-body-font, system-ui);
        font-size: 0.75rem;
        margin-bottom: 0.5rem;
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

      /* Stock Badge Styles (AC10) */
      .stock-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-weight: 500;
        animation: fadeIn 0.3s ease-out;
      }

      .stock-badge i {
        font-size: 1rem;
      }

      .stock-badge-green {
        background-color: #d1fae5;
        color: #065f46;
        border: 1px solid #10b981;
      }

      .stock-badge-yellow {
        background-color: #fef3c7;
        color: #92400e;
        border: 1px solid #f59e0b;
      }

      .stock-badge-red {
        background-color: #fee2e2;
        color: #991b1b;
        border: 1px solid #ef4444;
      }

      /* Out of Stock Message */
      .out-of-stock-message {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background-color: #fee2e2;
        border: 2px solid #ef4444;
        border-radius: 0.5rem;
        color: #991b1b;
        font-weight: 600;
        font-size: 0.875rem;
        animation: shake 0.5s ease-in-out;
      }

      .out-of-stock-message i {
        font-size: 1.25rem;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes shake {
        0%, 100% {
          transform: translateX(0);
        }
        10%, 30%, 50%, 70%, 90% {
          transform: translateX(-5px);
        }
        20%, 40%, 60%, 80% {
          transform: translateX(5px);
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
   * Event emitter for stock availability changes.
   * Emits true when item is in stock, false when out of stock, null when no variant selected.
   */
  @Output() stockAvailabilityChange = new EventEmitter<boolean | null>();

  /**
   * Tracks the selected image key for UI preview.
   * Separate from FormControl value which stores numeric index.
   */
  protected selectedImageKeyForUI: string | null = null;

  /**
   * Stock information signal for the selected variant (AC9 format).
   * Stores real-time inventory data fetched from stock API.
   */
  protected readonly stockInfo = signal<{ sku: string; stock_quantity: number; available: boolean } | null>(null);

  constructor(private http: HttpClient) {}

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
   * Fetches stock information if variant metadata is present (Story 29.11 Task 8).
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

      // Fetch stock information if variant metadata exists (AC10)
      this.fetchStockForVariant(imageIndex);
    } else {
      this.control.setValue(null);
      this.stockInfo.set(null);
      this.stockAvailabilityChange.emit(null);
    }
    this.control.markAsTouched();
    this.control.markAsDirty();
  }

  /**
   * Fetches stock information for a selected variant (Story 29.11 AC9/AC10).
   * Calls GET /api/inventory/:sku to retrieve real-time stock availability.
   * Updates stockInfo signal and emits stockAvailabilityChange event.
   *
   * @param imageIndex - Zero-based index of selected image
   */
  private fetchStockForVariant(imageIndex: number): void {
    // Check if field has variant metadata
    if (!this.field.variantMetadata || imageIndex >= this.field.variantMetadata.length) {
      // No variant metadata or index out of bounds - clear stock info
      this.stockInfo.set(null);
      this.stockAvailabilityChange.emit(null);
      return;
    }

    // Get variant metadata for selected image
    const variant = this.field.variantMetadata[imageIndex];
    if (!variant || !variant.sku) {
      // No SKU for this variant - clear stock info
      this.stockInfo.set(null);
      this.stockAvailabilityChange.emit(null);
      return;
    }

    // Fetch stock from API (AC9 endpoint)
    const apiUrl = `${environment.apiUrl}/api/v1/inventory/${variant.sku}`;
    this.http.get<{ success: boolean; data: { sku: string; stock_quantity: number; available: boolean } }>(apiUrl)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.stockInfo.set(response.data);
            this.stockAvailabilityChange.emit(response.data.available);
          } else {
            this.stockInfo.set(null);
            this.stockAvailabilityChange.emit(null);
          }
        },
        error: (error) => {
          console.error('Failed to fetch stock information:', error);
          // On error, assume not available to prevent overselling
          this.stockInfo.set(null);
          this.stockAvailabilityChange.emit(false);
        }
      });
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

  /**
   * Determines stock badge color class based on quantity (AC10).
   * - Green: > 10 units (good availability)
   * - Yellow: 1-10 units (low stock warning)
   * - Red: 0 units (out of stock)
   *
   * @returns CSS class name for stock badge
   */
  protected getStockBadgeClass(): string {
    const qty = this.stockInfo()?.stock_quantity ?? 0;
    if (qty === 0) return 'stock-badge-red';
    if (qty <= 10) return 'stock-badge-yellow';
    return 'stock-badge-green';
  }
}
