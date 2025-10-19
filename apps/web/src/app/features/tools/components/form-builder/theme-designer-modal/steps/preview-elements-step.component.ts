import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorPickerModule } from 'primeng/colorpicker';
import { SliderModule } from 'primeng/slider';
import { ThemeDesignerModalService } from '../theme-designer-modal.service';

/**
 * Step: Preview Elements Styling
 * Allows users to customize the appearance of preview elements in the form builder.
 * Provides color pickers and sliders for text color, background, border, and border radius.
 */
@Component({
  selector: 'app-preview-elements-step',
  standalone: true,
  imports: [CommonModule, FormsModule, ColorPickerModule, SliderModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preview-elements-step">
      <div class="step-header">
        <h3 class="step-title">Preview Elements Styling</h3>
        <p class="step-description">
          Customize the appearance of preview elements in the form builder canvas.
        </p>
      </div>

      <div class="preview-elements-fields">
        <!-- Color Fields Row (2 columns) -->
        <div class="color-fields-row">
          <!-- Preview Text Color -->
          <div class="preview-field-group">
            <label for="previewTextColor" class="preview-label">
              <i class="pi pi-palette"></i>
              Text Color
            </label>
            <div class="preview-input-wrapper">
              <p-colorPicker
                [(ngModel)]="previewTextColorValue"
                inputId="previewTextColor"
                [inline]="false"
                [format]="'hex'"
                appendTo="body"
              ></p-colorPicker>
              <div class="color-preview" [style.background-color]="previewTextColorValue">
                <span class="color-hex">{{ previewTextColorValue }}</span>
              </div>
            </div>
            <small class="field-hint">Text color for preview elements in the form builder</small>
          </div>

          <!-- Preview Background Color -->
          <div class="preview-field-group">
            <label for="previewBackgroundColor" class="preview-label">
              <i class="pi pi-clone"></i>
              Background Color
            </label>
            <div class="preview-input-wrapper">
              <p-colorPicker
                [(ngModel)]="previewBackgroundColorValue"
                inputId="previewBackgroundColor"
                [inline]="false"
                [format]="'hex'"
                appendTo="body"
              ></p-colorPicker>
              <div class="color-preview" [style.background-color]="previewBackgroundColorValue">
                <span class="color-hex">{{ previewBackgroundColorValue }}</span>
              </div>
            </div>
            <small class="field-hint"
              >Background color for preview elements in the form builder</small
            >
          </div>

          <!-- Preview Border Color -->
          <div class="preview-field-group">
            <label for="previewBorderColor" class="preview-label">
              <i class="pi pi-stop"></i>
              Border Color
            </label>
            <div class="preview-input-wrapper">
              <p-colorPicker
                [(ngModel)]="previewBorderColorValue"
                inputId="previewBorderColor"
                [inline]="false"
                [format]="'hex'"
                appendTo="body"
              ></p-colorPicker>
              <div class="color-preview" [style.background-color]="previewBorderColorValue">
                <span class="color-hex">{{ previewBorderColorValue }}</span>
              </div>
            </div>
            <small class="field-hint">Border color for preview elements in the form builder</small>
          </div>
        </div>

        <!-- Border Radius Row -->
        <div class="preview-field-group">
          <label for="previewBorderRadius" class="preview-label">
            <i class="pi pi-stop"></i>
            Border Radius
            <span class="value-badge">{{ previewBorderRadiusValue }}px</span>
          </label>
          <p-slider
            [(ngModel)]="previewBorderRadiusValue"
            inputId="previewBorderRadius"
            [min]="0"
            [max]="24"
            [step]="1"
            class="field-slider"
          ></p-slider>
          <div class="slider-markers">
            <span class="marker">0px (Square)</span>
            <span class="marker">12px (Rounded)</span>
            <span class="marker">24px (Pill)</span>
          </div>
        </div>
      </div>

      <!-- Live Preview -->
      <div class="preview-demo">
        <h4 class="preview-title">Preview Demo</h4>
        <div class="preview-content">
          <div
            class="preview-element-sample"
            [style.color]="previewTextColorValue"
            [style.background-color]="previewBackgroundColorValue"
            [style.border]="'2px solid ' + previewBorderColorValue"
            [style.border-radius.px]="previewBorderRadiusValue"
          >
            <div class="sample-header">
              <span class="sample-badge">text</span>
              <span class="sample-title">Untitled Field</span>
              <i class="pi pi-cog sample-icon"></i>
            </div>
            <div class="sample-body">
              <input
                type="text"
                class="sample-input"
                placeholder="Sample preview element"
                readonly
              />
            </div>
            <div class="sample-footer">
              <small class="sample-hint">This is how preview elements will appear</small>
            </div>
          </div>

          <div class="preview-info">
            <i class="pi pi-info-circle"></i>
            <span>
              These styles are applied to field previews in the form builder canvas, helping you
              visualize how your theme will look during editing.
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .preview-elements-step {
        padding: 0 2rem 1rem 2rem;
      }

      .step-header {
        margin-bottom: 2rem;
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

      .preview-elements-fields {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        margin-bottom: 2rem;
      }

      .color-fields-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
      }

      @media (max-width: 767px) {
        .color-fields-row {
          grid-template-columns: 1fr;
        }
      }

      .preview-field-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .preview-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        font-size: 0.875rem;
        color: #374151;
      }

      .preview-label i {
        color: #6366f1;
      }

      .value-badge {
        margin-left: auto;
        background: #6366f1;
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        font-family: 'Courier New', monospace;
      }

      .preview-input-wrapper {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .color-preview {
        flex: 1;
        height: 40px;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      }

      .color-hex {
        font-size: 0.875rem;
        font-weight: 500;
        color: #1f2937;
        background: rgba(255, 255, 255, 0.9);
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
      }

      .field-hint {
        font-size: 0.75rem;
        color: #9ca3af;
      }

      .field-slider {
        width: 100%;
      }

      .slider-markers {
        display: flex;
        justify-content: space-between;
        padding: 0 0.25rem;
      }

      .marker {
        font-size: 0.7rem;
        color: #9ca3af;
      }

      .preview-demo {
        padding: 1.5rem;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }

      .preview-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 1rem 0;
      }

      .preview-content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .preview-element-sample {
        padding: 1rem;
        transition: all 0.2s ease;
      }

      .sample-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }

      .sample-badge {
        background: rgba(99, 102, 241, 0.1);
        color: #6366f1;
        padding: 0.125rem 0.5rem;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
      }

      .sample-title {
        flex: 1;
        font-weight: 500;
        font-size: 0.875rem;
      }

      .sample-icon {
        color: inherit;
        opacity: 0.5;
        cursor: pointer;
        transition: opacity 0.2s ease;

        &:hover {
          opacity: 1;
        }
      }

      .sample-body {
        margin-bottom: 0.5rem;
      }

      .sample-input {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.5);
        color: inherit;
        font-size: 0.875rem;
        font-family: inherit;

        &::placeholder {
          color: inherit;
          opacity: 0.5;
        }

        &:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
        }
      }

      .sample-footer {
        margin-top: 0.5rem;
      }

      .sample-hint {
        font-size: 0.7rem;
        opacity: 0.7;
      }

      .preview-info {
        padding: 0.75rem 1rem;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 6px;
        color: #1e40af;
        font-size: 0.875rem;
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .preview-info i {
        color: #3b82f6;
        margin-top: 0.125rem;
        flex-shrink: 0;
      }

      /* PrimeNG Slider overrides */
      :host ::ng-deep .p-slider .p-slider-handle {
        background: #6366f1;
        border-color: #6366f1;
      }

      :host ::ng-deep .p-slider .p-slider-range {
        background: #6366f1;
      }

      :host ::ng-deep .p-slider:not(.p-disabled) .p-slider-handle:hover {
        background: #4f46e5;
        border-color: #4f46e5;
      }

      /* Responsive adjustments */
      @media (max-width: 767px) {
        .preview-elements-step {
          padding: 1.5rem;
        }

        .preview-input-wrapper {
          flex-direction: column;
          align-items: stretch;
        }

        .slider-markers {
          flex-direction: column;
          gap: 0.25rem;
          margin-top: 0.5rem;
        }

        .marker {
          font-size: 0.65rem;
        }

        .value-badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.6rem;
        }
      }
    `,
  ],
})
export class PreviewElementsStepComponent {
  protected readonly modalService = inject(ThemeDesignerModalService);

  /**
   * Preview text color with two-way binding to service
   */
  get previewTextColorValue(): string {
    return this.modalService.getPreviewTextColor();
  }

  set previewTextColorValue(value: string) {
    this.modalService.setPreviewTextColor(value);
  }

  /**
   * Preview background color with two-way binding to service
   */
  get previewBackgroundColorValue(): string {
    return this.modalService.getPreviewBackgroundColor();
  }

  set previewBackgroundColorValue(value: string) {
    this.modalService.setPreviewBackgroundColor(value);
  }

  /**
   * Preview border color with two-way binding to service
   */
  get previewBorderColorValue(): string {
    return this.modalService.getPreviewBorderColor();
  }

  set previewBorderColorValue(value: string) {
    this.modalService.setPreviewBorderColor(value);
  }

  /**
   * Preview border radius with two-way binding to service
   */
  get previewBorderRadiusValue(): number {
    return this.modalService.getPreviewBorderRadius();
  }

  set previewBorderRadiusValue(value: number) {
    this.modalService.setPreviewBorderRadius(value);
  }
}
