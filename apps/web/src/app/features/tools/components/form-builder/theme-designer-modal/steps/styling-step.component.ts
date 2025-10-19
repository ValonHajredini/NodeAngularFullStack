import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SliderModule } from 'primeng/slider';
import { InputNumberModule } from 'primeng/inputnumber';
import { ColorPickerModule } from 'primeng/colorpicker';
import { SelectModule } from 'primeng/select';
import { ThemeDesignerModalService } from '../theme-designer-modal.service';

/**
 * Step 4: Field Styling
 * Allows users to customize field borders, spacing, and padding.
 * Provides sliders and numeric inputs for precise control over field appearance.
 */
@Component({
  selector: 'app-styling-step',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SliderModule,
    InputNumberModule,
    ColorPickerModule,
    SelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="styling-step">
      <div class="step-header">
        <h3 class="step-title">Field Styling</h3>
        <p class="step-description">Customize borders, spacing, and padding for form fields.</p>
      </div>

      <div class="styling-fields">
        <!-- Border Radius -->
        <div class="styling-field-group">
          <label for="borderRadius" class="styling-label">
            <i class="pi pi-stop"></i>
            Border Radius
            <span class="value-badge">{{ borderRadiusValue }}px</span>
          </label>
          <p-slider
            [(ngModel)]="borderRadiusValue"
            inputId="borderRadius"
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

        <!-- Field Padding -->
        <div class="styling-field-group">
          <label for="fieldPadding" class="styling-label">
            <i class="pi pi-arrows-alt"></i>
            Field Padding
            <span class="value-badge">{{ fieldPaddingValue }}px</span>
          </label>
          <p-slider
            [(ngModel)]="fieldPaddingValue"
            inputId="fieldPadding"
            [min]="8"
            [max]="24"
            [step]="1"
            class="field-slider"
          ></p-slider>
          <div class="slider-markers">
            <span class="marker">8px (Compact)</span>
            <span class="marker">16px (Standard)</span>
            <span class="marker">24px (Spacious)</span>
          </div>
        </div>

        <!-- Field Spacing (Margin) -->
        <div class="styling-field-group">
          <label for="fieldSpacing" class="styling-label">
            <i class="pi pi-th-large"></i>
            Field Spacing
            <span class="value-badge">{{ fieldSpacingValue }}px</span>
          </label>
          <p-slider
            [(ngModel)]="fieldSpacingValue"
            inputId="fieldSpacing"
            [min]="8"
            [max]="32"
            [step]="2"
            class="field-slider"
          ></p-slider>
          <div class="slider-markers">
            <span class="marker">8px (Tight)</span>
            <span class="marker">16px (Normal)</span>
            <span class="marker">32px (Loose)</span>
          </div>
        </div>

        <!-- Border Width -->
        <div class="styling-field-group">
          <label for="borderWidth" class="styling-label">
            <i class="pi pi-minus"></i>
            Border Width
            <span class="value-badge">{{ borderWidthValue }}px</span>
          </label>
          <p-slider
            [(ngModel)]="borderWidthValue"
            inputId="borderWidth"
            [min]="1"
            [max]="4"
            [step]="1"
            class="field-slider"
          ></p-slider>
          <div class="slider-markers">
            <span class="marker">1px (Thin)</span>
            <span class="marker">2px (Medium)</span>
            <span class="marker">4px (Bold)</span>
          </div>
        </div>

        <!-- Advanced Controls -->
        <div class="advanced-controls">
          <h4 class="advanced-title">
            <i class="pi pi-cog"></i>
            Advanced Controls
          </h4>
          <div class="advanced-grid">
            <!-- Label Spacing -->
            <div class="advanced-field">
              <label for="labelSpacing" class="advanced-label">Label Spacing</label>
              <p-inputNumber
                [(ngModel)]="labelSpacingValue"
                inputId="labelSpacing"
                [min]="4"
                [max]="16"
                [step]="1"
                suffix=" px"
                [showButtons]="true"
                buttonLayout="horizontal"
                incrementButtonIcon="pi pi-plus"
                decrementButtonIcon="pi pi-minus"
                [style]="{ width: '100%' }"
              ></p-inputNumber>
            </div>

            <!-- Focus Border Width -->
            <div class="advanced-field">
              <label for="focusBorderWidth" class="advanced-label">Focus Border</label>
              <p-inputNumber
                [(ngModel)]="focusBorderWidthValue"
                inputId="focusBorderWidth"
                [min]="1"
                [max]="4"
                [step]="1"
                suffix=" px"
                [showButtons]="true"
                buttonLayout="horizontal"
                incrementButtonIcon="pi pi-plus"
                decrementButtonIcon="pi pi-minus"
                [style]="{ width: '100%' }"
              ></p-inputNumber>
            </div>
          </div>
        </div>

        <!-- Container Controls -->
        <div class="advanced-controls">
          <h4 class="advanced-title">
            <i class="pi pi-box"></i>
            Form Container
          </h4>
          <div class="advanced-grid">
            <!-- Container Background -->
            <div class="advanced-field">
              <label for="containerBackground" class="advanced-label">Background Color</label>
              <p-colorPicker
                [(ngModel)]="containerBackgroundValue"
                inputId="containerBackground"
                format="hex"
                [inline]="false"
                [showTransitionOptions]="'0ms'"
                appendTo="body"
              ></p-colorPicker>
            </div>

            <!-- Container Position -->
            <div class="advanced-field">
              <label for="containerPosition" class="advanced-label">Position</label>
              <p-select
                [(ngModel)]="containerPositionValue"
                inputId="containerPosition"
                [options]="containerPositionOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select position"
                [style]="{ width: '100%' }"
              ></p-select>
            </div>
          </div>

          <!-- Container Opacity Slider -->
          <div class="styling-field-group" style="margin-top: 1rem;">
            <label for="containerOpacity" class="styling-label">
              <i class="pi pi-circle"></i>
              Container Opacity
              <span class="value-badge">{{ (containerOpacityValue * 100).toFixed(0) }}%</span>
            </label>
            <p-slider
              [(ngModel)]="containerOpacityValue"
              inputId="containerOpacity"
              [min]="0"
              [max]="1"
              [step]="0.05"
              class="field-slider"
            ></p-slider>
            <div class="slider-markers">
              <span class="marker">0% (Transparent)</span>
              <span class="marker">50% (Semi)</span>
              <span class="marker">100% (Solid)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Styling Preview -->
      <div class="styling-preview">
        <h4 class="preview-title">Field Preview</h4>
        <div class="preview-content">
          <!-- Form Field Preview -->
          <div class="preview-field-container" [style.margin-bottom.px]="fieldSpacingValue">
            <label class="preview-label" [style.margin-bottom.px]="labelSpacingValue">
              Sample Field Label
            </label>
            <input
              type="text"
              class="preview-input"
              placeholder="Enter text here..."
              [style.border-radius.px]="borderRadiusValue"
              [style.padding.px]="fieldPaddingValue"
              [style.border-width.px]="borderWidthValue"
            />
            <small class="preview-hint">This is how your form fields will appear</small>
          </div>

          <!-- Multiple Fields Preview -->
          <div class="preview-multi-fields">
            <div class="preview-field-container" [style.margin-bottom.px]="fieldSpacingValue">
              <label class="preview-label" [style.margin-bottom.px]="labelSpacingValue">
                First Name
              </label>
              <input
                type="text"
                class="preview-input"
                placeholder="John"
                [style.border-radius.px]="borderRadiusValue"
                [style.padding.px]="fieldPaddingValue"
                [style.border-width.px]="borderWidthValue"
              />
            </div>

            <div class="preview-field-container" [style.margin-bottom.px]="fieldSpacingValue">
              <label class="preview-label" [style.margin-bottom.px]="labelSpacingValue">
                Email Address
              </label>
              <input
                type="email"
                class="preview-input"
                placeholder="john@example.com"
                [style.border-radius.px]="borderRadiusValue"
                [style.padding.px]="fieldPaddingValue"
                [style.border-width.px]="borderWidthValue"
              />
            </div>

            <div class="preview-field-container">
              <label class="preview-label" [style.margin-bottom.px]="labelSpacingValue">
                Message
              </label>
              <textarea
                class="preview-textarea"
                placeholder="Enter your message..."
                rows="3"
                [style.border-radius.px]="borderRadiusValue"
                [style.padding.px]="fieldPaddingValue"
                [style.border-width.px]="borderWidthValue"
              ></textarea>
            </div>
          </div>

          <!-- Focus State Preview -->
          <div class="focus-state-info">
            <i class="pi pi-info-circle"></i>
            <span
              >Focus border width: <strong>{{ focusBorderWidthValue }}px</strong> (applied when
              field is active)</span
            >
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .styling-step {
        padding: 2rem;
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

      .styling-fields {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        margin-bottom: 2rem;
      }

      .styling-field-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .styling-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        font-size: 0.875rem;
        color: #374151;
      }

      .styling-label i {
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

      .advanced-controls {
        padding: 1.5rem;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }

      .advanced-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 1rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .advanced-title i {
        color: #6366f1;
      }

      .advanced-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .advanced-field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .advanced-label {
        font-size: 0.8rem;
        font-weight: 500;
        color: #4b5563;
      }

      .styling-preview {
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

      .preview-field-container {
        display: flex;
        flex-direction: column;
      }

      .preview-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
      }

      .preview-input,
      .preview-textarea {
        width: 100%;
        border: 1px solid #d1d5db;
        font-size: 0.875rem;
        transition: all 0.2s ease;
        background: white;
        color: #1f2937;
        font-family: inherit;
      }

      .preview-input:focus,
      .preview-textarea:focus {
        outline: none;
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }

      .preview-textarea {
        resize: vertical;
        min-height: 80px;
      }

      .preview-hint {
        font-size: 0.75rem;
        color: #9ca3af;
        margin-top: 0.25rem;
      }

      .preview-multi-fields {
        padding: 1.25rem;
        background: white;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
      }

      .focus-state-info {
        padding: 0.75rem 1rem;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 6px;
        color: #1e40af;
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .focus-state-info i {
        color: #3b82f6;
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

      /* PrimeNG InputNumber overrides */
      :host ::ng-deep .p-inputnumber .p-inputtext {
        border-radius: 6px;
        font-size: 0.875rem;
      }

      :host ::ng-deep .p-inputnumber:not(.p-disabled):hover .p-inputtext {
        border-color: #6366f1;
      }

      :host ::ng-deep .p-inputnumber.p-inputnumber-buttons-horizontal .p-button {
        background: #f3f4f6;
        border-color: #d1d5db;
        color: #374151;
      }

      :host ::ng-deep .p-inputnumber.p-inputnumber-buttons-horizontal .p-button:hover {
        background: #e5e7eb;
        border-color: #6366f1;
        color: #6366f1;
      }

      /* Responsive adjustments */
      @media (max-width: 767px) {
        .styling-step {
          padding: 1.5rem;
        }

        .slider-markers {
          flex-direction: column;
          gap: 0.25rem;
          margin-top: 0.5rem;
        }

        .marker {
          font-size: 0.65rem;
        }

        .advanced-grid {
          grid-template-columns: 1fr;
        }

        .value-badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.6rem;
        }
      }
    `,
  ],
})
export class StylingStepComponent {
  protected readonly modalService = inject(ThemeDesignerModalService);

  /**
   * Container position options for dropdown
   */
  containerPositionOptions = [
    { label: 'Center', value: 'center' },
    { label: 'Left', value: 'left' },
    { label: 'Full Width', value: 'full-width' },
  ];

  /**
   * Border radius value with two-way binding to service.
   * Controls the roundness of field corners (0-24px).
   */
  get borderRadiusValue(): number {
    return this.modalService.getBorderRadius();
  }

  set borderRadiusValue(value: number) {
    this.modalService.setBorderRadius(value);
  }

  /**
   * Field padding value with two-way binding to service.
   * Controls internal spacing within fields (8-24px).
   */
  get fieldPaddingValue(): number {
    return this.modalService.getFieldPadding();
  }

  set fieldPaddingValue(value: number) {
    this.modalService.setFieldPadding(value);
  }

  /**
   * Field spacing (margin) value with two-way binding to service.
   * Controls vertical spacing between fields (8-32px).
   */
  get fieldSpacingValue(): number {
    return this.modalService.getFieldSpacing();
  }

  set fieldSpacingValue(value: number) {
    this.modalService.setFieldSpacing(value);
  }

  /**
   * Border width value with two-way binding to service.
   * Controls the thickness of field borders (1-4px).
   */
  get borderWidthValue(): number {
    return this.modalService.getBorderWidth();
  }

  set borderWidthValue(value: number) {
    this.modalService.setBorderWidth(value);
  }

  /**
   * Label spacing value with two-way binding to service.
   * Controls vertical spacing between label and field (4-16px).
   */
  get labelSpacingValue(): number {
    return this.modalService.getLabelSpacing();
  }

  set labelSpacingValue(value: number) {
    this.modalService.setLabelSpacing(value);
  }

  /**
   * Focus border width value with two-way binding to service.
   * Controls border thickness when field is focused (1-4px).
   */
  get focusBorderWidthValue(): number {
    return this.modalService.getFocusBorderWidth();
  }

  set focusBorderWidthValue(value: number) {
    this.modalService.setFocusBorderWidth(value);
  }

  /**
   * Container background color value with two-way binding to service.
   * Controls the background color of the form container.
   */
  get containerBackgroundValue(): string {
    return this.modalService.getContainerBackground();
  }

  set containerBackgroundValue(value: string) {
    this.modalService.setContainerBackground(value);
  }

  /**
   * Container opacity value with two-way binding to service.
   * Controls the transparency of the form container (0-1).
   */
  get containerOpacityValue(): number {
    return this.modalService.getContainerOpacity();
  }

  set containerOpacityValue(value: number) {
    this.modalService.setContainerOpacity(value);
  }

  /**
   * Container position value with two-way binding to service.
   * Controls the alignment of the form container.
   */
  get containerPositionValue(): 'center' | 'top' | 'left' | 'full-width' {
    return this.modalService.getContainerPosition();
  }

  set containerPositionValue(value: 'center' | 'top' | 'left' | 'full-width') {
    this.modalService.setContainerPosition(value);
  }
}
