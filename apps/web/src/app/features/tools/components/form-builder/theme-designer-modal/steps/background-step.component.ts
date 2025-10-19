import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RadioButton } from 'primeng/radiobutton';
import { ColorPicker } from 'primeng/colorpicker';
import { Slider } from 'primeng/slider';
import { Select } from 'primeng/select';
import { ThemeDesignerModalService } from '../theme-designer-modal.service';

interface GradientPosition {
  label: string;
  value: string;
}

/**
 * Step 2: Background Selection
 * Allows users to configure form background with solid color, gradients, or images.
 * Supports linear gradients, radial gradients, and image uploads with preview.
 */
@Component({
  selector: 'app-background-step',
  standalone: true,
  imports: [CommonModule, FormsModule, RadioButton, ColorPicker, Slider, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="background-step">
      <div class="step-header">
        <h3 class="step-title">Configure Background</h3>
        <p class="step-description">Choose a background style for your form.</p>
      </div>

      <!-- Background Type Selection -->
      <div class="background-type-selection">
        <h4 class="section-title">Background Type</h4>
        <div class="radio-group">
          <div class="radio-item">
            <p-radioButton
              name="backgroundType"
              value="solid"
              [(ngModel)]="backgroundTypeValue"
              inputId="bg-solid"
            />
            <label for="bg-solid" class="radio-label">
              <i class="pi pi-stop"></i>
              <span>Solid Color</span>
            </label>
          </div>
          <div class="radio-item">
            <p-radioButton
              name="backgroundType"
              value="linear"
              [(ngModel)]="backgroundTypeValue"
              inputId="bg-linear"
            />
            <label for="bg-linear" class="radio-label">
              <i class="pi pi-angle-double-right"></i>
              <span>Linear Gradient</span>
            </label>
          </div>
          <div class="radio-item">
            <p-radioButton
              name="backgroundType"
              value="radial"
              [(ngModel)]="backgroundTypeValue"
              inputId="bg-radial"
            />
            <label for="bg-radial" class="radio-label">
              <i class="pi pi-circle"></i>
              <span>Radial Gradient</span>
            </label>
          </div>
          <div class="radio-item">
            <p-radioButton
              name="backgroundType"
              value="image"
              [(ngModel)]="backgroundTypeValue"
              inputId="bg-image"
            />
            <label for="bg-image" class="radio-label">
              <i class="pi pi-image"></i>
              <span>Image Upload</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Background Configuration based on type -->
      <div class="background-config">
        <!-- Solid Color -->
        @if (backgroundTypeValue === 'solid') {
          <div class="config-section">
            <label class="config-label">
              <i class="pi pi-palette"></i>
              Background Color
            </label>
            <div class="color-input-wrapper">
              <p-colorPicker
                [(ngModel)]="backgroundColorValue"
                [inline]="false"
                [format]="'hex'"
                appendTo="body"
              ></p-colorPicker>
              <div class="color-preview-box" [style.background-color]="backgroundColorValue">
                <span class="color-hex">{{ backgroundColorValue }}</span>
              </div>
            </div>
          </div>
        }

        <!-- Linear Gradient -->
        @if (backgroundTypeValue === 'linear') {
          <div class="config-section">
            <div class="gradient-colors">
              <div class="gradient-color-input">
                <label class="config-label">
                  <i class="pi pi-palette"></i>
                  Start Color
                </label>
                <p-colorPicker
                  [(ngModel)]="gradientColor1Value"
                  [inline]="false"
                  [format]="'hex'"
                  appendTo="body"
                ></p-colorPicker>
                <span class="color-code">{{ gradientColor1Value }}</span>
              </div>
              <div class="gradient-color-input">
                <label class="config-label">
                  <i class="pi pi-palette"></i>
                  End Color
                </label>
                <p-colorPicker
                  [(ngModel)]="gradientColor2Value"
                  [inline]="false"
                  [format]="'hex'"
                  appendTo="body"
                ></p-colorPicker>
                <span class="color-code">{{ gradientColor2Value }}</span>
              </div>
            </div>

            <div class="gradient-angle">
              <label class="config-label">
                <i class="pi pi-replay"></i>
                Gradient Angle: {{ gradientAngleValue }}°
              </label>
              <p-slider
                [(ngModel)]="gradientAngleValue"
                [min]="0"
                [max]="360"
                [step]="15"
                styleClass="w-full"
              ></p-slider>
            </div>
          </div>
        }

        <!-- Radial Gradient -->
        @if (backgroundTypeValue === 'radial') {
          <div class="config-section">
            <div class="gradient-colors">
              <div class="gradient-color-input">
                <label class="config-label">
                  <i class="pi pi-palette"></i>
                  Center Color
                </label>
                <p-colorPicker
                  [(ngModel)]="gradientColor1Value"
                  [inline]="false"
                  [format]="'hex'"
                  appendTo="body"
                ></p-colorPicker>
                <span class="color-code">{{ gradientColor1Value }}</span>
              </div>
              <div class="gradient-color-input">
                <label class="config-label">
                  <i class="pi pi-palette"></i>
                  Outer Color
                </label>
                <p-colorPicker
                  [(ngModel)]="gradientColor2Value"
                  [inline]="false"
                  [format]="'hex'"
                  appendTo="body"
                ></p-colorPicker>
                <span class="color-code">{{ gradientColor2Value }}</span>
              </div>
            </div>

            <div class="gradient-position">
              <label class="config-label">
                <i class="pi pi-map-marker"></i>
                Gradient Position
              </label>
              <p-select
                [(ngModel)]="gradientPositionValue"
                [options]="gradientPositions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select position"
                styleClass="w-full"
              ></p-select>
            </div>
          </div>
        }
      </div>

      <!-- Live Preview -->
      <div class="background-preview">
        <h4 class="preview-title">Background Preview</h4>
        <div class="preview-box-wrapper">
          <!-- Drag and Drop Zone (only for image type) -->
          @if (backgroundTypeValue === 'image') {
            <div
              class="image-dropzone"
              [class.dragover]="isDragOverImage()"
              (click)="fileInputImage.click()"
              (dragover)="onImageDragOver($event)"
              (dragleave)="onImageDragLeave($event)"
              (drop)="onImageDrop($event)"
              [style.--bg-image]="getBackgroundPreview()"
              [style.--bg-opacity]="backgroundImageOpacityValue"
              [style.--bg-blur]="backgroundImageBlurValue + 'px'"
            >
              @if (backgroundImageUrlValue) {
                <div class="preview-content">
                  <i class="pi pi-eye preview-icon"></i>
                  <span class="preview-text">Form Background</span>
                </div>
              } @else {
                <div class="upload-placeholder">
                  <i class="pi pi-image"></i>
                  <span>Drop image here or click to browse</span>
                  <small>JPG, PNG, GIF (max 2MB)</small>
                </div>
              }
            </div>

            @if (backgroundImageUrlValue) {
              <!-- Image Controls: Blur and Opacity inside preview -->
              <div class="image-controls-inline">
                <!-- Image Blur Control -->
                <div class="image-control">
                  <label class="config-label">
                    <i class="pi pi-filter"></i>
                    Image Blur: {{ backgroundImageBlurValue }}px
                  </label>
                  <p-slider
                    [(ngModel)]="backgroundImageBlurValue"
                    [min]="0"
                    [max]="20"
                    [step]="1"
                    styleClass="w-full"
                  ></p-slider>
                </div>

                <!-- Image Opacity Control -->
                <div class="image-control">
                  <label class="config-label">
                    <i class="pi pi-eye"></i>
                    Image Opacity: {{ (backgroundImageOpacityValue * 100).toFixed(0) }}%
                  </label>
                  <p-slider
                    [(ngModel)]="backgroundImageOpacityValue"
                    [min]="0"
                    [max]="1"
                    [step]="0.05"
                    styleClass="w-full"
                  ></p-slider>
                </div>
              </div>
            }
          } @else {
            <!-- Regular preview for non-image types -->
            <div
              class="preview-box"
              [attr.data-background]="getBackgroundPreview()"
              [style.--bg-image]="getBackgroundPreview()"
            >
              <div class="preview-content">
                <i class="pi pi-eye preview-icon"></i>
                <span class="preview-text">Form Background</span>
              </div>
            </div>
          }

          @if (backgroundTypeValue === 'image' && backgroundImageUrlValue) {
            <button
              type="button"
              class="remove-image-btn"
              (click)="removeImage()"
              title="Remove image"
            >
              <i class="pi pi-times"></i>
            </button>
          }
        </div>
      </div>

      <!-- Hidden file input -->
      <input
        #fileInputImage
        type="file"
        accept="image/*"
        (change)="onImageUpload($event)"
        style="display: none"
      />
    </div>
  `,
  styles: [
    `
      .background-step {
        padding: 2rem;
      }

      .step-header {
        margin-bottom: 1rem;
      }

      .step-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 0.5rem 0;
      }

      .step-description {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
      }

      .background-type-selection {
        margin-bottom: 2rem;
      }

      .section-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 1rem 0;
      }

      .radio-group {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.75rem;
      }

      .radio-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 0.75rem 0.75rem 0.375rem;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .radio-item:hover {
        border-color: #6366f1;
        background: #f9fafb;
      }

      .radio-item:has(input:checked) {
        border-color: #6366f1;
        background: #eef2ff;
      }

      /* Fix PrimeNG radio button alignment and shape */
      .radio-item ::ng-deep .p-radiobutton {
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }

      .radio-item ::ng-deep .p-radiobutton .p-radiobutton-box {
        width: 20px !important;
        height: 20px !important;
        min-width: 20px !important;
        min-height: 20px !important;
        max-width: 20px !important;
        max-height: 20px !important;
        border-radius: 50% !important;
        border: 2px solid #d1d5db;
        background: #ffffff;
        transition: all 0.2s ease;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 0 !important;
        aspect-ratio: 1 / 1;
      }

      .radio-item ::ng-deep .p-radiobutton .p-radiobutton-box .p-radiobutton-icon {
        width: 10px !important;
        height: 10px !important;
        min-width: 10px !important;
        min-height: 10px !important;
        border-radius: 50% !important;
        background-color: #6366f1;
        aspect-ratio: 1 / 1;
      }

      .radio-item ::ng-deep .p-radiobutton:hover .p-radiobutton-box {
        border-color: #6366f1;
      }

      .radio-item ::ng-deep .p-radiobutton .p-radiobutton-box.p-highlight {
        border-color: #6366f1;
        background: #ffffff;
      }

      .radio-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        flex: 1;
        margin: 0;
      }

      .radio-label i {
        color: #6366f1;
        font-size: 1rem;
      }

      .background-config {
        margin-bottom: 2rem;
      }

      .config-section {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }

      .config-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        font-size: 0.875rem;
        color: #374151;
        margin-bottom: 0.5rem;
      }

      .config-label i {
        color: #6366f1;
      }

      .color-input-wrapper {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .color-preview-box {
        flex: 1;
        height: 48px;
        border-radius: 8px;
        border: 2px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .color-hex {
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 4px;
        color: #1f2937;
      }

      .gradient-colors {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }

      .gradient-color-input {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .color-code {
        font-family: 'Courier New', monospace;
        font-size: 0.75rem;
        color: #6b7280;
        text-align: center;
      }

      .gradient-angle,
      .gradient-position {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .field-hint {
        font-size: 0.75rem;
        color: #9ca3af;
        margin-top: 0.5rem;
        display: block;
      }

      .image-controls-inline {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
        margin-top: 1rem;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 8px;
        border-top: 1px solid #e5e7eb;
      }

      .image-control {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .background-preview {
        padding: 1.5rem;
        background: #ffffff;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }

      .preview-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 1rem 0;
      }

      .preview-box-wrapper {
        position: relative;
      }

      .preview-box {
        position: relative;
        width: 100%;
        height: 150px;
        border-radius: 8px;
        border: 2px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      /* Background layer with blur and opacity */
      .preview-box::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--bg-image, #f3f4f6);
        opacity: var(--bg-opacity, 1);
        filter: blur(var(--bg-blur, 0px));
        z-index: 0;
      }

      .remove-image-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.9);
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        z-index: 10;
      }

      .remove-image-btn:hover {
        background: rgba(220, 38, 38, 1);
        transform: scale(1.1);
      }

      .preview-content {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .preview-icon {
        font-size: 2rem;
        color: #6366f1;
      }

      .preview-text {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
      }

      /* Image Dropzone Styling */
      .image-dropzone {
        width: 100%;
        height: 150px;
        border-radius: 8px;
        border: 2px solid #e5e7eb;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        position: relative;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      /* Background layer with blur and opacity */
      .image-dropzone::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--bg-image, #f3f4f6);
        opacity: var(--bg-opacity, 1);
        filter: blur(var(--bg-blur, 0px));
        z-index: 0;
      }

      .image-dropzone:hover {
        border-color: #6366f1;
        background: #f5f3ff;
      }

      .image-dropzone.dragover {
        border-color: #6366f1;
        background: #eef2ff;
        transform: scale(1.02);
      }

      .image-dropzone .preview-content {
        position: relative;
        z-index: 1;
      }

      .upload-placeholder {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        color: #9ca3af;
        padding: 1rem;
        text-align: center;
      }

      .upload-placeholder i {
        font-size: 2rem;
        color: #d1d5db;
      }

      .upload-placeholder span {
        font-size: 0.875rem;
        font-weight: 500;
      }

      .upload-placeholder small {
        font-size: 0.75rem;
        color: #d1d5db;
      }

      /* Responsive adjustments */
      @media (max-width: 767px) {
        .background-step {
          padding: 1.5rem;
        }

        .radio-group {
          grid-template-columns: 1fr;
        }

        .gradient-colors {
          grid-template-columns: 1fr;
        }

        .color-input-wrapper {
          flex-direction: column;
          align-items: stretch;
        }

        .image-controls-inline {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
      }
    `,
  ],
})
export class BackgroundStepComponent {
  protected readonly modalService = inject(ThemeDesignerModalService);
  protected readonly isDragOverImage = signal(false);

  protected readonly gradientPositions: GradientPosition[] = [
    { label: 'Center', value: 'center' },
    { label: 'Top Left', value: 'top left' },
    { label: 'Top Center', value: 'top' },
    { label: 'Top Right', value: 'top right' },
    { label: 'Center Left', value: 'left' },
    { label: 'Center Right', value: 'right' },
    { label: 'Bottom Left', value: 'bottom left' },
    { label: 'Bottom Center', value: 'bottom' },
    { label: 'Bottom Right', value: 'bottom right' },
  ];

  get backgroundTypeValue(): 'solid' | 'linear' | 'radial' | 'image' {
    return this.modalService.getBackgroundType();
  }

  set backgroundTypeValue(value: 'solid' | 'linear' | 'radial' | 'image') {
    this.modalService.setBackgroundType(value);
  }

  get backgroundColorValue(): string {
    return this.modalService.getBackgroundColor();
  }

  set backgroundColorValue(value: string) {
    this.modalService.setBackgroundColor(value);
  }

  get gradientColor1Value(): string {
    return this.modalService.getGradientColor1();
  }

  set gradientColor1Value(value: string) {
    this.modalService.setGradientColor1(value);
  }

  get gradientColor2Value(): string {
    return this.modalService.getGradientColor2();
  }

  set gradientColor2Value(value: string) {
    this.modalService.setGradientColor2(value);
  }

  get gradientAngleValue(): number {
    return this.modalService.getGradientAngle();
  }

  set gradientAngleValue(value: number) {
    this.modalService.setGradientAngle(value);
  }

  get gradientPositionValue(): string {
    return this.modalService.getGradientPosition();
  }

  set gradientPositionValue(value: string) {
    this.modalService.setGradientPosition(value);
  }

  get backgroundImageUrlValue(): string {
    return this.modalService.getBackgroundImageUrl();
  }

  set backgroundImageUrlValue(value: string) {
    this.modalService.setBackgroundImageUrl(value);
  }

  get backgroundImageOpacityValue(): number {
    return this.modalService.getBackgroundImageOpacity();
  }

  set backgroundImageOpacityValue(value: number) {
    this.modalService.setBackgroundImageOpacity(value);
  }

  get backgroundImageBlurValue(): number {
    return this.modalService.getBackgroundImageBlur();
  }

  set backgroundImageBlurValue(value: number) {
    this.modalService.setBackgroundImageBlur(value);
  }

  /**
   * Handles drag over event for image dropzone.
   */
  protected onImageDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverImage.set(true);
  }

  /**
   * Handles drag leave event for image dropzone.
   */
  protected onImageDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverImage.set(false);
  }

  /**
   * Handles drop event for image dropzone.
   */
  protected onImageDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOverImage.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const fakeEvent = {
        target: {
          files: files,
        },
      } as any;
      this.onImageUpload(fakeEvent);
    }
  }

  /**
   * Handles image file upload and converts to base64 data URL.
   * @param event - File upload event containing the selected file
   */
  onImageUpload(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const base64 = e.target.result;
      this.backgroundImageUrlValue = base64;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Removes the uploaded background image.
   */
  removeImage(): void {
    this.backgroundImageUrlValue = '';
  }

  /**
   * Generates background CSS for live preview based on selected type.
   * @returns CSS background value
   */
  getBackgroundPreview(): string {
    const type = this.backgroundTypeValue;

    if (type === 'solid') {
      return this.backgroundColorValue;
    }

    if (type === 'linear') {
      return `linear-gradient(${this.gradientAngleValue}deg, ${this.gradientColor1Value}, ${this.gradientColor2Value})`;
    }

    if (type === 'radial') {
      return `radial-gradient(circle at ${this.gradientPositionValue}, ${this.gradientColor1Value}, ${this.gradientColor2Value})`;
    }

    if (type === 'image' && this.backgroundImageUrlValue) {
      return `url(${this.backgroundImageUrlValue}) center/cover no-repeat`;
    }

    return '#FFFFFF';
  }
}
