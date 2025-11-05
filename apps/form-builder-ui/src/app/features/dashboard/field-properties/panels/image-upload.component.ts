import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Message } from 'primeng/message';
import { environment } from '@env/environment';

interface ImageUploadResponseData {
  imageUrl: string;
  fileName: string;
  size?: number;
  mimeType?: string;
}

interface ImageUploadResponse {
  success?: boolean;
  message?: string;
  data?: ImageUploadResponseData;
  imageUrl?: string;
  fileName?: string;
  fileSize?: number;
  timestamp?: string;
}

/**
 * Standalone image upload component with drag-and-drop and click-to-upload.
 * Displays image preview that can be clicked to trigger upload.
 * Provides drag-and-drop zone for intuitive file uploads.
 */
@Component({
  selector: 'app-image-upload',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Message],
  template: `
    <div class="image-upload-container">
      <!-- Warning message if form not saved -->
      @if (!formId) {
        <p-message
          severity="warn"
          text="Save the form first to enable image uploads"
          styleClass="w-full mb-3"
        />
      }

      <!-- Image Preview (clickable) or Drag-Drop Zone -->
      <div
        class="upload-zone"
        [class.has-image]="imageUrl()"
        [class.is-dragging]="isDragging()"
        [class.disabled]="!formId"
        (click)="onZoneClick()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        [attr.tabindex]="formId ? 0 : -1"
        [attr.role]="'button'"
        [attr.aria-label]="imageUrl() ? 'Click to change image' : 'Click or drag to upload image'"
        (keydown.enter)="onZoneClick()"
        (keydown.space)="onZoneClick()"
      >
        @if (imageUrl()) {
          <!-- Image Preview (clickable to change) -->
          <div class="image-preview-wrapper">
            <img [src]="imageUrl()!" [alt]="'Preview'" class="preview-image" />
            <div class="overlay">
              <i class="pi pi-upload text-3xl text-white mb-2"></i>
              <p class="text-white text-sm font-medium">Click to change image</p>
              <p class="text-white text-xs opacity-80">or drag and drop</p>
            </div>
          </div>
        } @else {
          <!-- Empty State (drag-drop zone) -->
          <div class="empty-state">
            <i class="pi pi-cloud-upload text-5xl text-gray-400 mb-3"></i>
            <p class="text-gray-700 text-sm font-medium mb-1">Drop image here or click to upload</p>
            <p class="text-gray-500 text-xs">Max 5MB (JPG, PNG, GIF, WebP)</p>
          </div>
        }
      </div>

      <!-- Hidden file input -->
      <input
        #fileInput
        type="file"
        accept="image/*"
        class="hidden"
        (change)="onFileSelected($event)"
        [disabled]="!formId"
      />

      <!-- Upload Error -->
      @if (uploadError()) {
        <p-message severity="error" [text]="uploadError()!" styleClass="w-full mt-3" />
      }

      <!-- Upload Progress -->
      @if (isUploading()) {
        <div class="mt-3 flex items-center gap-2 text-sm text-blue-600">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Uploading image...</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .image-upload-container {
        width: 100%;
      }

      .upload-zone {
        position: relative;
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        overflow: hidden;
        background: #f9fafb;
      }

      .upload-zone:not(.disabled):hover {
        border-color: #3b82f6;
        background: #eff6ff;
      }

      .upload-zone:not(.disabled):focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      .upload-zone.is-dragging {
        border-color: #3b82f6;
        background: #dbeafe;
        border-style: solid;
      }

      .upload-zone.disabled {
        cursor: not-allowed;
        opacity: 0.6;
        background: #f3f4f6;
      }

      /* Empty state (no image) */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        min-height: 200px;
      }

      /* Image preview (has image) */
      .upload-zone.has-image {
        border-style: solid;
        border-color: #e5e7eb;
        background: white;
        padding: 0;
      }

      .image-preview-wrapper {
        position: relative;
        width: 100%;
        max-height: 300px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .preview-image {
        width: 100%;
        height: auto;
        max-height: 300px;
        object-fit: contain;
        display: block;
      }

      /* Hover overlay on image */
      .overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .upload-zone.has-image:hover .overlay {
        opacity: 1;
      }

      .hidden {
        display: none !important;
      }
    `,
  ],
})
export class ImageUploadComponent {
  @Input() formId!: string | null;
  @Input() imageUrl = signal<string | null>(null);

  @Output() imageUploaded = new EventEmitter<string>();
  @Output() uploadErrorEvent = new EventEmitter<string>();
  @Output() uploadingChange = new EventEmitter<boolean>();

  private readonly http = inject(HttpClient);

  protected readonly isDragging = signal(false);
  protected readonly isUploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);

  /**
   * Handle click on upload zone (triggers file picker)
   */
  protected onZoneClick(): void {
    if (!this.formId) {
      this.uploadError.set(
        'Please save the form first before uploading images. Click "Save Form" in the toolbar.',
      );
      return;
    }

    // Trigger hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  /**
   * Handle file selection from file input
   */
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.uploadFile(file);
    }

    // Reset input value to allow re-uploading same file
    input.value = '';
  }

  /**
   * Handle drag over event
   */
  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.formId) return;

    this.isDragging.set(true);
  }

  /**
   * Handle drag leave event
   */
  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDragging.set(false);
  }

  /**
   * Handle drop event
   */
  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDragging.set(false);

    if (!this.formId) {
      this.uploadError.set(
        'Please save the form first before uploading images. Click "Save Form" in the toolbar.',
      );
      return;
    }

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.uploadError.set('Please upload an image file (JPG, PNG, GIF, WebP)');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.uploadError.set('Image size must be less than 5MB');
        return;
      }

      this.uploadFile(file);
    }
  }

  /**
   * Upload file to backend
   */
  private uploadFile(file: File): void {
    this.uploadError.set(null);
    this.isUploading.set(true);
    this.uploadingChange.emit(true);

    const formData = new FormData();
    formData.append('image', file);

    this.http
      .post<ImageUploadResponse>(
        `${environment.apiUrl}/forms/${this.formId}/upload-image`,
        formData,
      )
      .subscribe({
        next: (response) => {
          this.isUploading.set(false);
          this.uploadingChange.emit(false);

          const uploadedImageUrl = response?.data?.imageUrl ?? response?.imageUrl ?? null;

          if (!uploadedImageUrl) {
            console.error('Image upload succeeded but imageUrl missing in response', response);
            this.uploadError.set('Image upload failed. No image URL returned from server.');
            this.uploadErrorEvent.emit('Image upload failed. No image URL returned from server.');
            return;
          }

          this.imageUrl.set(uploadedImageUrl);
          this.imageUploaded.emit(uploadedImageUrl);
          this.uploadError.set(null);
        },
        error: (err) => {
          this.isUploading.set(false);
          this.uploadingChange.emit(false);
          console.error('Image upload failed:', err);
          const errorMessage = err.error?.message || 'Image upload failed. Please try again.';
          this.uploadError.set(errorMessage);
          this.uploadErrorEvent.emit(errorMessage);
        },
      });
  }
}
