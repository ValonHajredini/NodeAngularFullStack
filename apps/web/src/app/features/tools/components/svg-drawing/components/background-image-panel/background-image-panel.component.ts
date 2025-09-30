import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { SliderModule } from 'primeng/slider';
import { InputNumber } from 'primeng/inputnumber';
import { Checkbox } from 'primeng/checkbox';
import { Message } from 'primeng/message';
import { SvgDrawingService } from '../../svg-drawing.service';

/**
 * Background image panel component for uploading and controlling reference images.
 * Allows users to upload an image to trace over in the SVG drawing tool.
 */
@Component({
  selector: 'app-background-image-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonDirective,
    SliderModule,
    InputNumber,
    Checkbox,
    Message,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="background-image-panel">
      @if (errorMessage()) {
        <p-message severity="error" [text]="errorMessage()!" styleClass="w-full mb-3"></p-message>
      }

      <!-- Upload Section -->
      <div class="upload-section">
        <h3 class="section-title">Background Image</h3>

        @if (!svgDrawingService.backgroundImage()) {
          <!-- Upload Area -->
          <div
            class="upload-area"
            [class.drag-over]="isDragging()"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
            (click)="fileInput.click()"
          >
            <i class="pi pi-cloud-upload text-4xl text-gray-400 mb-2"></i>
            <p class="text-sm text-gray-600 mb-1">Drag & drop image here</p>
            <p class="text-xs text-gray-500 mb-3">or click to browse</p>
            <button
              pButton
              type="button"
              label="Choose File"
              icon="pi pi-folder-open"
              size="small"
            ></button>
          </div>

          <input
            #fileInput
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml"
            (change)="onFileSelected($event)"
            class="hidden"
          />

          <p class="text-xs text-gray-500 mt-2">Accepted formats: PNG, JPG, GIF, SVG (max 10MB)</p>
        } @else {
          <!-- Image Preview -->
          <div class="image-preview">
            <img [src]="svgDrawingService.backgroundImage()!" alt="Background" />
            <div class="image-overlay">
              <button
                pButton
                type="button"
                icon="pi pi-times"
                severity="danger"
                [rounded]="true"
                (click)="onRemoveImage()"
                pTooltip="Remove Image"
              ></button>
            </div>
          </div>

          <!-- Controls Section -->
          <div class="controls-section">
            <!-- Opacity Control -->
            <div class="control-group">
              <label class="control-label">
                <i class="pi pi-eye"></i>
                <span>Opacity</span>
                <span class="control-value">{{ opacityPercent() }}%</span>
              </label>
              <p-slider
                [(ngModel)]="opacityValue"
                (ngModelChange)="onOpacityChange($event)"
                [min]="0"
                [max]="100"
                styleClass="w-full"
              ></p-slider>
            </div>

            <!-- Scale Control -->
            <div class="control-group">
              <label class="control-label">
                <i class="pi pi-search-plus"></i>
                <span>Scale</span>
                <span class="control-value">{{ scalePercent() }}%</span>
              </label>
              <p-slider
                [(ngModel)]="scaleValue"
                (ngModelChange)="onScaleChange($event)"
                [min]="10"
                [max]="500"
                styleClass="w-full"
              ></p-slider>
            </div>

            <!-- Position Controls -->
            <div class="control-group">
              <label class="control-label">
                <i class="pi pi-arrows-alt"></i>
                <span>Position</span>
              </label>
              <div class="position-controls">
                <div class="position-input">
                  <label>X</label>
                  <p-inputnumber
                    [(ngModel)]="positionX"
                    (ngModelChange)="onPositionChange()"
                    [showButtons]="true"
                    [step]="10"
                    buttonLayout="horizontal"
                    spinnerMode="horizontal"
                    [inputStyle]="{ width: '100px' }"
                  ></p-inputnumber>
                </div>
                <div class="position-input">
                  <label>Y</label>
                  <p-inputnumber
                    [(ngModel)]="positionY"
                    (ngModelChange)="onPositionChange()"
                    [showButtons]="true"
                    [step]="10"
                    buttonLayout="horizontal"
                    spinnerMode="horizontal"
                    [inputStyle]="{ width: '100px' }"
                  ></p-inputnumber>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons">
              <button
                pButton
                type="button"
                label="Reset Transform"
                icon="pi pi-refresh"
                severity="secondary"
                [outlined]="true"
                size="small"
                (click)="onResetTransform()"
                class="w-full"
              ></button>

              <div class="lock-control">
                <p-checkbox
                  [(ngModel)]="imageLocked"
                  (ngModelChange)="onLockToggle()"
                  [binary]="true"
                  inputId="lockImage"
                ></p-checkbox>
                <label for="lockImage" class="ml-2 text-sm cursor-pointer">
                  <i class="pi pi-lock mr-1"></i>
                  Lock Image
                </label>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Help Text -->
      <div class="help-text">
        <p class="text-xs text-gray-600">
          <i class="pi pi-info-circle mr-1"></i>
          The background image is for tracing only and will not be included in the exported SVG.
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .background-image-panel {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: 100%;
      }

      .section-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 0.75rem;
      }

      .upload-section {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .upload-area {
        border: 2px dashed #d1d5db;
        border-radius: 0.5rem;
        padding: 2rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        background: #f9fafb;
      }

      .upload-area:hover {
        border-color: #3b82f6;
        background: #eff6ff;
      }

      .upload-area.drag-over {
        border-color: #3b82f6;
        background: #dbeafe;
        transform: scale(1.02);
      }

      .hidden {
        display: none;
      }

      .image-preview {
        position: relative;
        border-radius: 0.5rem;
        overflow: hidden;
        border: 1px solid #e5e7eb;
        margin-bottom: 1rem;
      }

      .image-preview img {
        width: 100%;
        height: auto;
        display: block;
        max-height: 200px;
        object-fit: contain;
        background: repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 20px 20px;
      }

      .image-overlay {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
      }

      .controls-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .control-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .control-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
      }

      .control-label i {
        color: #6b7280;
      }

      .control-value {
        margin-left: auto;
        font-weight: 600;
        color: #3b82f6;
      }

      .position-controls {
        display: flex;
        gap: 0.75rem;
      }

      .position-input {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .position-input label {
        font-size: 0.75rem;
        font-weight: 500;
        color: #6b7280;
      }

      .action-buttons {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding-top: 0.5rem;
        border-top: 1px solid #e5e7eb;
      }

      .lock-control {
        display: flex;
        align-items: center;
        padding: 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.375rem;
        background: #f9fafb;
      }

      .help-text {
        padding: 0.75rem;
        background: #eff6ff;
        border-radius: 0.375rem;
        border: 1px solid #dbeafe;
      }
    `,
  ],
})
export class BackgroundImagePanelComponent {
  readonly svgDrawingService = inject(SvgDrawingService);

  // Component state
  readonly isDragging = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Form values
  opacityValue = 50;
  scaleValue = 100;
  positionX = 0;
  positionY = 0;
  imageLocked = false;

  readonly opacityPercent = () => Math.round(this.svgDrawingService.imageOpacity() * 100);
  readonly scalePercent = () => Math.round(this.svgDrawingService.imageScale() * 100);

  /**
   * Handles file selection from input.
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.loadImage(file);
    }
    // Reset input value to allow selecting the same file again
    input.value = '';
  }

  /**
   * Handles drag over event.
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  /**
   * Handles drag leave event.
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  /**
   * Handles file drop event.
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const file = event.dataTransfer?.files[0];
    if (file) {
      this.loadImage(file);
    }
  }

  /**
   * Loads and validates an image file.
   */
  private loadImage(file: File): void {
    this.errorMessage.set(null);

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      this.errorMessage.set('Invalid file type. Please upload PNG, JPG, GIF, or SVG.');
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.errorMessage.set('File size exceeds 10MB limit.');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.svgDrawingService.setBackgroundImage(result);
      this.syncFormValues();
    };
    reader.onerror = () => {
      this.errorMessage.set('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
  }

  /**
   * Removes the background image.
   */
  onRemoveImage(): void {
    this.svgDrawingService.setBackgroundImage(null);
    this.errorMessage.set(null);
  }

  /**
   * Handles opacity change.
   */
  onOpacityChange(value: number): void {
    this.svgDrawingService.setImageOpacity(value / 100);
  }

  /**
   * Handles scale change.
   */
  onScaleChange(value: number): void {
    this.svgDrawingService.setImageScale(value / 100);
  }

  /**
   * Handles position change.
   */
  onPositionChange(): void {
    this.svgDrawingService.setImagePosition(this.positionX, this.positionY);
  }

  /**
   * Resets image transform to defaults.
   */
  onResetTransform(): void {
    this.svgDrawingService.resetImageTransform();
    this.syncFormValues();
  }

  /**
   * Toggles image lock state.
   */
  onLockToggle(): void {
    this.svgDrawingService.setImageLocked(this.imageLocked);
  }

  /**
   * Syncs form values with service state.
   */
  private syncFormValues(): void {
    this.opacityValue = Math.round(this.svgDrawingService.imageOpacity() * 100);
    this.scaleValue = Math.round(this.svgDrawingService.imageScale() * 100);
    const position = this.svgDrawingService.imagePosition();
    this.positionX = position.x;
    this.positionY = position.y;
    this.imageLocked = this.svgDrawingService.imageLocked();
  }
}
