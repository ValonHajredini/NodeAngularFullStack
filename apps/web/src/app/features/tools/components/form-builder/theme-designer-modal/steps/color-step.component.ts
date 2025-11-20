import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ThemeDesignerModalService } from '../theme-designer-modal.service';

/**
 * Step 1: Color Selection
 * Allows users to choose primary and secondary colors for their theme.
 * Uses PrimeNG ColorPicker for color selection with live preview swatches.
 */
@Component({
  selector: 'app-color-step',
  standalone: true,
  imports: [CommonModule, FormsModule, ColorPickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="color-step">
      <div class="step-header">
        <h3 class="step-title">Select Colors</h3>
        <p class="step-description">Choose your theme's primary and secondary colors.</p>
      </div>

      <div class="color-fields">
        <!-- Primary Color -->
        <div class="color-field-group">
          <label for="primaryColor" class="color-label">
            <i class="pi pi-palette"></i>
            Primary Color
          </label>
          <div class="color-input-wrapper">
            <p-colorPicker
              [(ngModel)]="primaryColorValue"
              inputId="primaryColor"
              [inline]="false"
              [format]="'hex'"
              appendTo="body"
            ></p-colorPicker>
            <div class="color-preview" [style.background-color]="primaryColorValue">
              <span class="color-hex">{{ primaryColorValue }}</span>
            </div>
          </div>
          <small class="field-hint">Used for buttons, links, and primary actions</small>
        </div>

        <!-- Secondary Color -->
        <div class="color-field-group">
          <label for="secondaryColor" class="color-label">
            <i class="pi pi-palette"></i>
            Secondary Color
          </label>
          <div class="color-input-wrapper">
            <p-colorPicker
              [(ngModel)]="secondaryColorValue"
              inputId="secondaryColor"
              [inline]="false"
              [format]="'hex'"
              appendTo="body"
            ></p-colorPicker>
            <div class="color-preview" [style.background-color]="secondaryColorValue">
              <span class="color-hex">{{ secondaryColorValue }}</span>
            </div>
          </div>
          <small class="field-hint">Used for accents, highlights, and secondary actions</small>
        </div>

        <!-- Label Color -->
        <div class="color-field-group">
          <label for="labelColor" class="color-label">
            <i class="pi pi-tag"></i>
            Label Color
          </label>
          <div class="color-input-wrapper">
            <p-colorPicker
              [(ngModel)]="labelColorValue"
              inputId="labelColor"
              [inline]="false"
              [format]="'hex'"
              appendTo="body"
            ></p-colorPicker>
            <div class="color-preview" [style.background-color]="labelColorValue">
              <span class="color-hex">{{ labelColorValue }}</span>
            </div>
          </div>
          <small class="field-hint">Applied to field labels and helper headings</small>
        </div>

        <!-- Input Background Color -->
        <div class="color-field-group">
          <label for="inputBackgroundColor" class="color-label">
            <i class="pi pi-clone"></i>
            Input Background
          </label>
          <div class="color-input-wrapper">
            <p-colorPicker
              [(ngModel)]="inputBackgroundColorValue"
              inputId="inputBackgroundColor"
              [inline]="false"
              [format]="'hex'"
              appendTo="body"
            ></p-colorPicker>
            <div class="color-preview" [style.background-color]="inputBackgroundColorValue">
              <span class="color-hex">{{ inputBackgroundColorValue }}</span>
            </div>
          </div>
          <small class="field-hint"
            >Background fill for text inputs, textareas, and dropdowns</small
          >
        </div>

        <!-- Input Text Color -->
        <div class="color-field-group">
          <label for="inputTextColor" class="color-label">
            <i class="pi pi-pencil"></i>
            Input Text Color
          </label>
          <div class="color-input-wrapper">
            <p-colorPicker
              [(ngModel)]="inputTextColorValue"
              inputId="inputTextColor"
              [inline]="false"
              [format]="'hex'"
              appendTo="body"
            ></p-colorPicker>
            <div
              class="color-preview color-preview--text"
              [style.background-color]="inputBackgroundColorValue"
              [style.color]="inputTextColorValue"
            >
              <span class="color-hex">{{ inputTextColorValue }}</span>
            </div>
          </div>
          <small class="field-hint">Text color inside inputs, textareas, and dropdowns</small>
        </div>
      </div>

      <!-- Color Preview Swatches -->
      <div class="color-swatches">
        <h4 class="swatches-title">Color Preview</h4>
        <div class="swatches-grid">
          <div class="swatch-item">
            <div class="swatch" [style.background-color]="primaryColorValue"></div>
            <span class="swatch-label">Primary</span>
          </div>
          <div class="swatch-item">
            <div class="swatch" [style.background-color]="secondaryColorValue"></div>
            <span class="swatch-label">Secondary</span>
          </div>
          <div class="swatch-item">
            <div
              class="swatch swatch-combined"
              [style.background]="
                'linear-gradient(135deg, ' +
                primaryColorValue +
                ' 0%, ' +
                secondaryColorValue +
                ' 100%)'
              "
            ></div>
            <span class="swatch-label">Combined</span>
          </div>
          <div class="swatch-item">
            <div class="swatch" [style.background-color]="labelColorValue"></div>
            <span class="swatch-label">Label</span>
          </div>
          <div class="swatch-item">
            <div
              class="swatch swatch-input-preview"
              [style.background-color]="inputBackgroundColorValue"
              [style.color]="inputTextColorValue"
            >
              Aa
            </div>
            <span class="swatch-label">Input</span>
          </div>
        </div>
      </div>

      <!-- Validation Message -->
      @if (!modalService.canProceedToNextStep() && primaryColorValue && secondaryColorValue) {
        <div class="validation-message">
          <i class="pi pi-info-circle"></i>
          Please ensure both colors are selected
        </div>
      }
    </div>
  `,
  styles: [
    `
      .color-step {
        padding: 0rem 1rem 1rem 1rem;
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

      .color-fields {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .color-field-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .color-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        font-size: 0.875rem;
        color: #374151;
      }

      .color-label i {
        color: #6366f1;
      }

      .color-input-wrapper {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .color-preview {
        flex: 1;
        height: 48px;
        border-radius: 8px;
        border: 2px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;
      }

      .color-preview:hover {
        border-color: #d1d5db;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .color-preview--text {
        justify-content: flex-start;
        padding: 0 1rem;
      }

      .color-hex {
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 4px;
        color: #1f2937;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .field-hint {
        font-size: 0.75rem;
        color: #9ca3af;
        padding-left: 0.25rem;
      }

      .color-swatches {
        padding: 0 1.5rem;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }

      .swatches-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 1rem 0;
      }

      .swatches-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1rem;
      }

      .swatch-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .swatch {
        width: 100%;
        height: 40px;
        border-radius: 8px;
        border: 2px solid #e5e7eb;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s ease;
      }

      .swatch:hover {
        transform: scale(1.05);
      }

      .swatch-combined {
        border: 2px solid #d1d5db;
      }

      .swatch-input-preview {
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-family: 'Inter', system-ui;
        letter-spacing: 0.02em;
      }

      .swatch-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: #6b7280;
        text-align: center;
      }

      .validation-message {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: #fef3c7;
        border: 1px solid #fcd34d;
        border-radius: 6px;
        color: #92400e;
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .validation-message i {
        color: #f59e0b;
      }

      /* Responsive adjustments */
      @media (max-width: 767px) {
        .color-step {
          padding: 1.5rem;
        }

        .color-fields {
          grid-template-columns: 1fr;
        }

        .swatches-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .swatch {
          height: 48px;
        }

        .color-input-wrapper {
          flex-direction: column;
          align-items: stretch;
        }

        .color-preview {
          width: 100%;
        }
      }
    `,
  ],
})
export class ColorStepComponent {
  protected readonly modalService = inject(ThemeDesignerModalService);

  /**
   * Primary color value with two-way binding to service.
   * Updates trigger real-time preview in parent modal.
   */
  get primaryColorValue(): string {
    return this.modalService.getPrimaryColor();
  }

  set primaryColorValue(value: string) {
    this.modalService.setPrimaryColor(value);
  }

  /**
   * Secondary color value with two-way binding to service.
   * Updates trigger real-time preview in parent modal.
   */
  get secondaryColorValue(): string {
    return this.modalService.getSecondaryColor();
  }

  set secondaryColorValue(value: string) {
    this.modalService.setSecondaryColor(value);
  }

  get labelColorValue(): string {
    return this.modalService.getLabelColor();
  }

  set labelColorValue(value: string) {
    this.modalService.setLabelColor(value);
  }

  get inputBackgroundColorValue(): string {
    return this.modalService.getInputBackgroundColor();
  }

  set inputBackgroundColorValue(value: string) {
    this.modalService.setInputBackgroundColor(value);
  }

  get inputTextColorValue(): string {
    return this.modalService.getInputTextColor();
  }

  set inputTextColorValue(value: string) {
    this.modalService.setInputTextColor(value);
  }
}
