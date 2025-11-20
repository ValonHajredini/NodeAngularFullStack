import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorPicker } from 'primeng/colorpicker';
import { Slider } from 'primeng/slider';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { RadioButton } from 'primeng/radiobutton';
import { Tooltip } from 'primeng/tooltip';
import { Message } from 'primeng/message';
import { ThemeDesignerModalService } from '../theme-designer-modal.service';

/**
 * Step 6: Container Styling
 * Allows users to customize form container appearance including background,
 * borders, shadows, layout alignment, and transparency effects.
 * Provides real-time preview of container styling changes.
 */
@Component({
  selector: 'app-container-styling-step',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ColorPicker,
    Slider,
    ToggleSwitch,
    InputNumber,
    Select,
    RadioButton,
    Tooltip,
    Message,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-styling-step p-6">
      <div class="step-header mb-6">
        <h3 class="text-2xl font-semibold text-gray-800">Form Container Styling</h3>
        <p class="text-gray-600 mt-2">
          Customize the visual appearance of your form's container element.
        </p>
      </div>

      <!-- Main Content Grid: 2 columns on desktop, 1 column on mobile -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Left Column -->
        <div class="space-y-6">
          <!-- Container Background Section -->
          <div class="section-group">
            <h4 class="section-title">
              <i class="pi pi-image"></i>
              Container Background
            </h4>
            <div class="divider"></div>

            <!-- Solid Color -->
            <div class="field-group">
              <label for="containerBgColor" class="field-label"> Background Color </label>
              <div class="flex items-center gap-3">
                <p-colorPicker
                  [(ngModel)]="containerBackgroundColorValue"
                  inputId="containerBgColor"
                  [format]="'hex'"
                  appendTo="body"
                  aria-label="Container background color"
                ></p-colorPicker>
                <div
                  class="color-preview-box"
                  [style.background-color]="containerBackgroundColorValue()"
                >
                  <span class="color-hex-text">{{ containerBackgroundColorValue() }}</span>
                </div>
              </div>
              <small class="field-hint">Primary background color for the form container</small>
            </div>

            <!-- Background Image Upload -->
            <div class="field-group">
              <label for="containerBgImage" class="field-label"> Background Image </label>
              <input
                type="file"
                id="containerBgImage"
                accept="image/jpeg,image/png,image/webp"
                (change)="handleImageUpload($event)"
                class="file-input"
                aria-label="Upload background image"
              />
              @if (containerBackgroundImageUrlValue()) {
                <div class="image-preview-container mt-3">
                  <img
                    [src]="containerBackgroundImageUrlValue()"
                    alt="Background image preview"
                    class="image-preview-thumbnail"
                  />
                  <button
                    type="button"
                    class="remove-image-btn"
                    (click)="removeBackgroundImage()"
                    aria-label="Remove background image"
                  >
                    <i class="pi pi-times"></i>
                  </button>
                </div>
              }
              <small class="field-hint">Upload JPEG, PNG, or WebP (max 5MB)</small>
            </div>

            <!-- Background Size -->
            @if (containerBackgroundImageUrlValue()) {
              <div class="field-group">
                <label for="bgSize" class="field-label">Background Size</label>
                <p-select
                  [(ngModel)]="containerBackgroundSizeValue"
                  [options]="backgroundSizeOptions"
                  inputId="bgSize"
                  [style]="{ width: '100%' }"
                  aria-label="Background image size"
                ></p-select>
              </div>

              <!-- Background Position -->
              <div class="field-group">
                <label class="field-label">Background Position</label>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label for="bgPosX" class="text-sm text-gray-600">Horizontal (%)</label>
                    <p-slider
                      [(ngModel)]="containerBackgroundPositionXValue"
                      [min]="0"
                      [max]="100"
                      [step]="5"
                      inputId="bgPosX"
                      aria-label="Background horizontal position"
                    ></p-slider>
                    <span class="text-xs text-gray-500"
                      >{{ containerBackgroundPositionXValue() }}%</span
                    >
                  </div>
                  <div>
                    <label for="bgPosY" class="text-sm text-gray-600">Vertical (%)</label>
                    <p-slider
                      [(ngModel)]="containerBackgroundPositionYValue"
                      [min]="0"
                      [max]="100"
                      [step]="5"
                      inputId="bgPosY"
                      aria-label="Background vertical position"
                    ></p-slider>
                    <span class="text-xs text-gray-500"
                      >{{ containerBackgroundPositionYValue() }}%</span
                    >
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Border Controls Section -->
          <div class="section-group">
            <h4 class="section-title">
              <i class="pi pi-stop"></i>
              Border Controls
            </h4>
            <div class="divider"></div>

            <!-- Border Enable/Disable -->
            <div class="field-group">
              <label for="borderToggle" class="field-label">Enable Border</label>
              <p-toggleSwitch
                [(ngModel)]="containerBorderEnabledValue"
                inputId="borderToggle"
                aria-label="Enable or disable container border"
              ></p-toggleSwitch>
            </div>

            <!-- Border controls (only shown when enabled) -->
            @if (containerBorderEnabledValue()) {
              <!-- Border Width -->
              <div class="field-group">
                <label for="borderWidth" class="field-label">
                  Border Width: {{ containerBorderWidthValue() }}px
                </label>
                <p-slider
                  [(ngModel)]="containerBorderWidthValue"
                  [min]="0"
                  [max]="10"
                  [step]="1"
                  inputId="borderWidth"
                  aria-label="Border width in pixels"
                ></p-slider>
              </div>

              <!-- Border Color -->
              <div class="field-group">
                <label for="borderColor" class="field-label">Border Color</label>
                <div class="flex items-center gap-3">
                  <p-colorPicker
                    [(ngModel)]="containerBorderColorValue"
                    inputId="borderColor"
                    [format]="'hex'"
                    appendTo="body"
                    aria-label="Border color"
                  ></p-colorPicker>
                  <div
                    class="color-preview-box"
                    [style.background-color]="containerBorderColorValue()"
                  >
                    <span class="color-hex-text">{{ containerBorderColorValue() }}</span>
                  </div>
                </div>
              </div>

              <!-- Border Radius -->
              <div class="field-group">
                <label for="borderRadius" class="field-label">
                  Border Radius: {{ containerBorderRadiusValue() }}px
                </label>
                <p-slider
                  [(ngModel)]="containerBorderRadiusValue"
                  [min]="0"
                  [max]="50"
                  [step]="1"
                  inputId="borderRadius"
                  aria-label="Border radius in pixels"
                ></p-slider>
              </div>

              <!-- Border Style -->
              <div class="field-group">
                <label for="borderStyle" class="field-label">Border Style</label>
                <p-select
                  [(ngModel)]="containerBorderStyleValue"
                  [options]="borderStyleOptions"
                  inputId="borderStyle"
                  [style]="{ width: '100%' }"
                  aria-label="Border style"
                ></p-select>
              </div>
            }
          </div>

          <!-- Box Shadow Section -->
          <div class="section-group">
            <h4 class="section-title">
              <i class="pi pi-box"></i>
              Box Shadow
            </h4>
            <div class="divider"></div>

            <!-- Shadow Enable/Disable -->
            <div class="field-group">
              <label for="shadowToggle" class="field-label">Enable Shadow</label>
              <p-toggleSwitch
                [(ngModel)]="containerShadowEnabledValue"
                inputId="shadowToggle"
                aria-label="Enable or disable box shadow"
              ></p-toggleSwitch>
            </div>

            @if (containerShadowEnabledValue()) {
              <!-- Shadow Presets -->
              <div class="field-group">
                <label class="field-label">Shadow Preset</label>
                <div class="preset-buttons">
                  <button
                    type="button"
                    class="preset-btn"
                    [class.preset-btn-active]="containerShadowPresetValue() === 'subtle'"
                    (click)="setShadowPreset('subtle')"
                    aria-label="Apply subtle shadow preset"
                  >
                    Subtle
                  </button>
                  <button
                    type="button"
                    class="preset-btn"
                    [class.preset-btn-active]="containerShadowPresetValue() === 'medium'"
                    (click)="setShadowPreset('medium')"
                    aria-label="Apply medium shadow preset"
                  >
                    Medium
                  </button>
                  <button
                    type="button"
                    class="preset-btn"
                    [class.preset-btn-active]="containerShadowPresetValue() === 'strong'"
                    (click)="setShadowPreset('strong')"
                    aria-label="Apply strong shadow preset"
                  >
                    Strong
                  </button>
                  <button
                    type="button"
                    class="preset-btn"
                    [class.preset-btn-active]="containerShadowPresetValue() === 'custom'"
                    (click)="setShadowPreset('custom')"
                    aria-label="Use custom shadow settings"
                  >
                    Custom
                  </button>
                </div>
              </div>

              <!-- Custom Shadow Controls (shown when Custom preset selected) -->
              @if (containerShadowPresetValue() === 'custom') {
                <div class="field-group">
                  <label for="shadowIntensity" class="field-label">
                    Shadow Intensity: {{ containerShadowIntensityValue() }}px
                  </label>
                  <p-slider
                    [(ngModel)]="containerShadowIntensityValue"
                    [min]="0"
                    [max]="30"
                    [step]="1"
                    inputId="shadowIntensity"
                    aria-label="Shadow intensity in pixels"
                  ></p-slider>
                </div>

                <div class="field-group">
                  <label for="shadowColor" class="field-label">Shadow Color</label>
                  <p-colorPicker
                    [(ngModel)]="containerShadowColorValue"
                    inputId="shadowColor"
                    [format]="'hex'"
                    appendTo="body"
                    aria-label="Shadow color with opacity"
                  ></p-colorPicker>
                  <small class="field-hint">Adjust opacity for subtle shadows</small>
                </div>
              }

              <!-- Shadow Preview Box -->
              <div class="field-group">
                <label class="field-label">Shadow Preview</label>
                <div class="shadow-preview-box" [style.box-shadow]="computedShadow()">
                  <span class="text-sm text-gray-600">Preview Container</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Right Column -->
        <div class="space-y-6">
          <!-- Container Layout Section -->
          <div class="section-group">
            <h4 class="section-title">
              <i class="pi pi-align-center"></i>
              Container Layout
            </h4>
            <div class="divider"></div>

            <!-- Horizontal Alignment -->
            <div class="field-group">
              <label class="field-label">Horizontal Alignment</label>
              <div class="radio-group">
                <div class="radio-item">
                  <p-radioButton
                    name="halign"
                    value="left"
                    [(ngModel)]="containerAlignmentHorizontalValue"
                    inputId="halign-left"
                  ></p-radioButton>
                  <label for="halign-left">Left</label>
                </div>
                <div class="radio-item">
                  <p-radioButton
                    name="halign"
                    value="center"
                    [(ngModel)]="containerAlignmentHorizontalValue"
                    inputId="halign-center"
                  ></p-radioButton>
                  <label for="halign-center">Center</label>
                </div>
                <div class="radio-item">
                  <p-radioButton
                    name="halign"
                    value="right"
                    [(ngModel)]="containerAlignmentHorizontalValue"
                    inputId="halign-right"
                  ></p-radioButton>
                  <label for="halign-right">Right</label>
                </div>
              </div>
            </div>

            <!-- Vertical Alignment -->
            <div class="field-group">
              <label class="field-label">Vertical Alignment</label>
              <div class="radio-group">
                <div class="radio-item">
                  <p-radioButton
                    name="valign"
                    value="top"
                    [(ngModel)]="containerAlignmentVerticalValue"
                    inputId="valign-top"
                  ></p-radioButton>
                  <label for="valign-top">Top</label>
                </div>
                <div class="radio-item">
                  <p-radioButton
                    name="valign"
                    value="center"
                    [(ngModel)]="containerAlignmentVerticalValue"
                    inputId="valign-center"
                  ></p-radioButton>
                  <label for="valign-center">Center</label>
                </div>
                <div class="radio-item">
                  <p-radioButton
                    name="valign"
                    value="bottom"
                    [(ngModel)]="containerAlignmentVerticalValue"
                    inputId="valign-bottom"
                  ></p-radioButton>
                  <label for="valign-bottom">Bottom</label>
                </div>
              </div>
            </div>

            <!-- Container Max Width -->
            <div class="field-group">
              <label for="maxWidth" class="field-label">Container Max Width (px)</label>
              <p-inputNumber
                [(ngModel)]="containerMaxWidthValue"
                inputId="maxWidth"
                [min]="300"
                [max]="1200"
                [step]="10"
                [showButtons]="true"
                mode="decimal"
                [style]="{ width: '100%' }"
                aria-label="Container maximum width in pixels"
              ></p-inputNumber>
            </div>

            <!-- Responsive Presets -->
            <div class="field-group">
              <label class="field-label">Responsive Presets</label>
              <div class="preset-buttons">
                <button
                  type="button"
                  class="preset-btn-small"
                  (click)="setMaxWidth(480)"
                  aria-label="Set mobile width (480px)"
                >
                  Mobile (480px)
                </button>
                <button
                  type="button"
                  class="preset-btn-small"
                  (click)="setMaxWidth(768)"
                  aria-label="Set tablet width (768px)"
                >
                  Tablet (768px)
                </button>
                <button
                  type="button"
                  class="preset-btn-small"
                  (click)="setMaxWidth(1024)"
                  aria-label="Set desktop width (1024px)"
                >
                  Desktop (1024px)
                </button>
                <button
                  type="button"
                  class="preset-btn-small"
                  (click)="setMaxWidth(1200)"
                  aria-label="Set full width (1200px)"
                >
                  Full Width
                </button>
              </div>
            </div>
          </div>

          <!-- Transparency & Effects Section -->
          <div class="section-group">
            <h4 class="section-title">
              <i class="pi pi-eye"></i>
              Transparency & Effects
            </h4>
            <div class="divider"></div>

            <!-- Container Opacity -->
            <div class="field-group">
              <label for="opacity" class="field-label">
                Container Opacity: {{ containerOpacityValue() }}%
              </label>
              <p-slider
                [(ngModel)]="containerOpacityValue"
                [min]="0"
                [max]="100"
                [step]="5"
                inputId="opacity"
                aria-label="Container opacity percentage"
              ></p-slider>
            </div>

            <!-- Backdrop Blur Enable/Disable -->
            <div class="field-group">
              <label for="blurToggle" class="field-label">
                Enable Backdrop Blur
                <i
                  class="pi pi-info-circle text-blue-500 ml-2"
                  pTooltip="Backdrop blur requires a modern browser (Chrome 76+, Firefox 103+, Safari 9+)"
                  tooltipPosition="top"
                ></i>
              </label>
              <p-toggleSwitch
                [(ngModel)]="containerBackdropBlurEnabledValue"
                inputId="blurToggle"
                aria-label="Enable backdrop blur effect"
              ></p-toggleSwitch>
            </div>

            @if (containerBackdropBlurEnabledValue()) {
              <!-- Backdrop Blur Intensity -->
              <div class="field-group">
                <label for="blurIntensity" class="field-label">
                  Blur Intensity: {{ containerBackdropBlurIntensityValue() }}px
                </label>
                <p-slider
                  [(ngModel)]="containerBackdropBlurIntensityValue"
                  [min]="0"
                  [max]="20"
                  [step]="1"
                  inputId="blurIntensity"
                  aria-label="Backdrop blur intensity in pixels"
                ></p-slider>
              </div>

              <!-- Browser Compatibility Warning -->
              <p-message
                severity="info"
                text="Backdrop blur requires a modern browser (Chrome 76+, Firefox 103+, Safari 9+)"
                [style]="{ width: '100%' }"
              ></p-message>
            }
          </div>
        </div>
      </div>

      <!-- Full-width Live Preview Section -->
      <div class="mt-8 pt-6 border-t border-gray-200">
        <h4 class="section-title mb-4">
          <i class="pi pi-eye"></i>
          Live Preview
        </h4>

        <div class="preview-wrapper" [style]="previewWrapperStyles()">
          <div class="preview-container" [style]="previewContainerStyles()">
            <h5 class="text-xl font-semibold mb-3">Sample Form Container</h5>
            <p class="text-gray-600">
              This preview demonstrates how your container styling will appear. Adjust the controls
              above to see changes in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .container-styling-step {
        max-width: 100%;
      }

      .step-header {
        margin-bottom: 1.5rem;
      }

      .section-group {
        background: #f9fafb;
        border-radius: 8px;
        padding: 1.25rem;
      }

      .section-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: #374151;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }

      .divider {
        height: 1px;
        background: #e5e7eb;
        margin-bottom: 1rem;
      }

      .field-group {
        margin-bottom: 1.25rem;
      }

      .field-group:last-child {
        margin-bottom: 0;
      }

      .field-label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.5rem;
      }

      .field-hint {
        display: block;
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: 0.25rem;
      }

      .color-preview-box {
        width: 100px;
        height: 38px;
        border-radius: 4px;
        border: 1px solid #d1d5db;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 500;
      }

      .color-hex-text {
        text-shadow: 0 0 2px rgba(255, 255, 255, 0.8);
      }

      .file-input {
        display: block;
        width: 100%;
        padding: 0.5rem;
        font-size: 0.875rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        cursor: pointer;
      }

      .image-preview-container {
        position: relative;
        display: inline-block;
      }

      .image-preview-thumbnail {
        max-width: 150px;
        max-height: 100px;
        border-radius: 4px;
        border: 1px solid #d1d5db;
      }

      .remove-image-btn {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 0.75rem;
      }

      .remove-image-btn:hover {
        background: #dc2626;
      }

      .preset-buttons {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .preset-btn {
        flex: 1;
        min-width: 80px;
        padding: 0.5rem 1rem;
        background: white;
        border: 2px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .preset-btn:hover {
        border-color: #3b82f6;
        color: #3b82f6;
      }

      .preset-btn-active {
        background: #3b82f6;
        border-color: #3b82f6;
        color: white;
      }

      .preset-btn-small {
        padding: 0.5rem 0.75rem;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .preset-btn-small:hover {
        border-color: #3b82f6;
        color: #3b82f6;
      }

      .radio-group {
        display: flex;
        gap: 1rem;
      }

      .radio-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .shadow-preview-box {
        width: 100%;
        height: 80px;
        background: white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: box-shadow 0.3s;
      }

      .preview-wrapper {
        min-height: 200px;
        padding: 2rem;
        background: #f3f4f6;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .preview-container {
        padding: 2rem;
        transition: all 0.3s;
      }
    `,
  ],
})
export class ContainerStylingStepComponent {
  private readonly themeService = inject(ThemeDesignerModalService);

  // ===== Background Properties =====
  // These writable signals proxy to the service's signals for two-way binding with ngModel

  /** Container background color - writable signal proxy to service */
  protected readonly containerBackgroundColorValue = (() => {
    const s = signal(this.themeService.getContainerBackgroundColor());
    effect(() => s.set(this.themeService.getContainerBackgroundColor()), {
      allowSignalWrites: true,
    });
    return s;
  })();

  /** Container background image URL - writable signal proxy to service */
  protected readonly containerBackgroundImageUrlValue = (() => {
    const s = signal(this.themeService.getContainerBackgroundImageUrl());
    effect(() => s.set(this.themeService.getContainerBackgroundImageUrl()), {
      allowSignalWrites: true,
    });
    return s;
  })();

  /** Container background size - writable signal proxy to service */
  protected readonly containerBackgroundSizeValue = (() => {
    const s = signal(this.themeService.getContainerBackgroundSize());
    effect(() => s.set(this.themeService.getContainerBackgroundSize()), {
      allowSignalWrites: true,
    });
    return s;
  })();

  /** Container background position X - writable signal proxy to service */
  protected readonly containerBackgroundPositionXValue = (() => {
    const s = signal(this.themeService.getContainerBackgroundPositionX());
    effect(() => s.set(this.themeService.getContainerBackgroundPositionX()), {
      allowSignalWrites: true,
    });
    return s;
  })();

  /** Container background position Y - writable signal proxy to service */
  protected readonly containerBackgroundPositionYValue = (() => {
    const s = signal(this.themeService.getContainerBackgroundPositionY());
    effect(() => s.set(this.themeService.getContainerBackgroundPositionY()), {
      allowSignalWrites: true,
    });
    return s;
  })();

  // ===== Border Properties =====

  /** Container border enabled - writable signal proxy to service */
  protected readonly containerBorderEnabledValue = (() => {
    const s = signal(this.themeService.getContainerBorderEnabled());
    effect(() => s.set(this.themeService.getContainerBorderEnabled()), { allowSignalWrites: true });
    return s;
  })();

  /** Container border width - writable signal proxy to service */
  protected readonly containerBorderWidthValue = (() => {
    const s = signal(this.themeService.getContainerBorderWidth());
    effect(() => s.set(this.themeService.getContainerBorderWidth()), { allowSignalWrites: true });
    return s;
  })();

  /** Container border color - writable signal proxy to service */
  protected readonly containerBorderColorValue = (() => {
    const s = signal(this.themeService.getContainerBorderColor());
    effect(() => s.set(this.themeService.getContainerBorderColor()), { allowSignalWrites: true });
    return s;
  })();

  /** Container border radius - writable signal proxy to service */
  protected readonly containerBorderRadiusValue = (() => {
    const s = signal(this.themeService.getContainerBorderRadius());
    effect(() => s.set(this.themeService.getContainerBorderRadius()), { allowSignalWrites: true });
    return s;
  })();

  /** Container border style - writable signal proxy to service */
  protected readonly containerBorderStyleValue = (() => {
    const s = signal(this.themeService.getContainerBorderStyle());
    effect(() => s.set(this.themeService.getContainerBorderStyle()), { allowSignalWrites: true });
    return s;
  })();

  // ===== Shadow Properties =====

  /** Container shadow enabled - writable signal proxy to service */
  protected readonly containerShadowEnabledValue = (() => {
    const s = signal(this.themeService.getContainerShadowEnabled());
    effect(() => s.set(this.themeService.getContainerShadowEnabled()), { allowSignalWrites: true });
    return s;
  })();

  /** Container shadow preset - writable signal proxy to service */
  protected readonly containerShadowPresetValue = (() => {
    const s = signal(this.themeService.getContainerShadowPreset());
    effect(() => s.set(this.themeService.getContainerShadowPreset()), { allowSignalWrites: true });
    return s;
  })();

  /** Container shadow intensity - writable signal proxy to service */
  protected readonly containerShadowIntensityValue = (() => {
    const s = signal(this.themeService.getContainerShadowIntensity());
    effect(() => s.set(this.themeService.getContainerShadowIntensity()), {
      allowSignalWrites: true,
    });
    return s;
  })();

  /** Container shadow color - writable signal proxy to service */
  protected readonly containerShadowColorValue = (() => {
    const s = signal(this.themeService.getContainerShadowColor());
    effect(() => s.set(this.themeService.getContainerShadowColor()), { allowSignalWrites: true });
    return s;
  })();

  // ===== Layout Properties =====

  /** Container horizontal alignment - writable signal proxy to service */
  protected readonly containerAlignmentHorizontalValue = (() => {
    const s = signal(this.themeService.getContainerAlignmentHorizontal());
    effect(() => s.set(this.themeService.getContainerAlignmentHorizontal()), {
      allowSignalWrites: true,
    });
    return s;
  })();

  /** Container vertical alignment - writable signal proxy to service */
  protected readonly containerAlignmentVerticalValue = (() => {
    const s = signal(this.themeService.getContainerAlignmentVertical());
    effect(() => s.set(this.themeService.getContainerAlignmentVertical()), {
      allowSignalWrites: true,
    });
    return s;
  })();

  /** Container max width - writable signal proxy to service */
  protected readonly containerMaxWidthValue = (() => {
    const s = signal(this.themeService.getContainerMaxWidth());
    effect(() => s.set(this.themeService.getContainerMaxWidth()), { allowSignalWrites: true });
    return s;
  })();

  // ===== Effects Properties =====

  /** Container opacity - writable signal proxy to service */
  protected readonly containerOpacityValue = (() => {
    const s = signal(this.themeService.getContainerOpacity());
    effect(() => s.set(this.themeService.getContainerOpacity()), { allowSignalWrites: true });
    return s;
  })();

  /** Container backdrop blur enabled - writable signal proxy to service */
  protected readonly containerBackdropBlurEnabledValue = (() => {
    const s = signal(this.themeService.getContainerBackdropBlurEnabled());
    effect(() => s.set(this.themeService.getContainerBackdropBlurEnabled()), {
      allowSignalWrites: true,
    });
    return s;
  })();

  /** Container backdrop blur intensity - writable signal proxy to service */
  protected readonly containerBackdropBlurIntensityValue = (() => {
    const s = signal(this.themeService.getContainerBackdropBlurIntensity());
    effect(() => s.set(this.themeService.getContainerBackdropBlurIntensity()), {
      allowSignalWrites: true,
    });
    return s;
  })();

  constructor() {
    // Set up reverse synchronization: when local signals change, update service
    effect(() =>
      this.themeService.setContainerBackgroundColor(this.containerBackgroundColorValue()),
    );
    effect(() =>
      this.themeService.setContainerBackgroundImageUrl(this.containerBackgroundImageUrlValue()),
    );
    effect(() => this.themeService.setContainerBackgroundSize(this.containerBackgroundSizeValue()));
    effect(() =>
      this.themeService.setContainerBackgroundPositionX(this.containerBackgroundPositionXValue()),
    );
    effect(() =>
      this.themeService.setContainerBackgroundPositionY(this.containerBackgroundPositionYValue()),
    );
    effect(() => this.themeService.setContainerBorderEnabled(this.containerBorderEnabledValue()));
    effect(() => this.themeService.setContainerBorderWidth(this.containerBorderWidthValue()));
    effect(() => this.themeService.setContainerBorderColor(this.containerBorderColorValue()));
    effect(() => this.themeService.setContainerBorderRadius(this.containerBorderRadiusValue()));
    effect(() => this.themeService.setContainerBorderStyle(this.containerBorderStyleValue()));
    effect(() => this.themeService.setContainerShadowEnabled(this.containerShadowEnabledValue()));
    effect(() => this.themeService.setContainerShadowPreset(this.containerShadowPresetValue()));
    effect(() =>
      this.themeService.setContainerShadowIntensity(this.containerShadowIntensityValue()),
    );
    effect(() => this.themeService.setContainerShadowColor(this.containerShadowColorValue()));
    effect(() =>
      this.themeService.setContainerAlignmentHorizontal(this.containerAlignmentHorizontalValue()),
    );
    effect(() =>
      this.themeService.setContainerAlignmentVertical(this.containerAlignmentVerticalValue()),
    );
    effect(() => this.themeService.setContainerMaxWidth(this.containerMaxWidthValue()));
    effect(() => this.themeService.setContainerOpacity(this.containerOpacityValue()));
    effect(() =>
      this.themeService.setContainerBackdropBlurEnabled(this.containerBackdropBlurEnabledValue()),
    );
    effect(() =>
      this.themeService.setContainerBackdropBlurIntensity(
        this.containerBackdropBlurIntensityValue(),
      ),
    );
  }

  // Dropdown options
  protected readonly backgroundSizeOptions = [
    { label: 'Cover', value: 'cover' },
    { label: 'Contain', value: 'contain' },
    { label: 'Repeat', value: 'repeat' },
  ];

  protected readonly borderStyleOptions = [
    { label: 'Solid', value: 'solid' },
    { label: 'Dashed', value: 'dashed' },
    { label: 'Dotted', value: 'dotted' },
    { label: 'Double', value: 'double' },
    { label: 'Groove', value: 'groove' },
    { label: 'Ridge', value: 'ridge' },
  ];

  /**
   * Shadow preset definitions with predefined CSS values.
   */
  private readonly shadowPresets = {
    subtle: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
    strong: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
  };

  /**
   * Computed shadow CSS value based on current preset or custom settings.
   */
  protected readonly computedShadow = computed(() => {
    if (!this.containerShadowEnabledValue()) {
      return 'none';
    }

    const preset = this.containerShadowPresetValue();

    // Handle 'none' preset explicitly
    if (preset === 'none') {
      return 'none';
    }

    // Handle 'custom' preset with user-defined values
    if (preset === 'custom') {
      const intensity = this.containerShadowIntensityValue();
      const color = this.containerShadowColorValue();
      return `0 ${intensity / 2}px ${intensity}px ${color}`;
    }

    // TypeScript now knows preset is 'subtle' | 'medium' | 'strong'
    return this.shadowPresets[preset];
  });

  /**
   * Computed styles for preview wrapper (handles alignment).
   */
  protected readonly previewWrapperStyles = computed(() => {
    const halign = this.containerAlignmentHorizontalValue();
    const valign = this.containerAlignmentVerticalValue();

    const justifyContent =
      halign === 'left' ? 'flex-start' : halign === 'right' ? 'flex-end' : 'center';
    const alignItems =
      valign === 'top' ? 'flex-start' : valign === 'bottom' ? 'flex-end' : 'center';

    return {
      display: 'flex',
      'justify-content': justifyContent,
      'align-items': alignItems,
    };
  });

  /**
   * Computed styles for preview container element.
   */
  protected readonly previewContainerStyles = computed(() => {
    const styles: Record<string, string> = {
      'max-width': `${this.containerMaxWidthValue()}px`,
      'background-color': this.containerBackgroundColorValue(),
      opacity: (this.containerOpacityValue() / 100).toString(),
    };

    // Background image
    if (this.containerBackgroundImageUrlValue()) {
      styles['background-image'] = `url(${this.containerBackgroundImageUrlValue()})`;
      styles['background-size'] = this.containerBackgroundSizeValue();
      styles['background-position'] =
        `${this.containerBackgroundPositionXValue()}% ${this.containerBackgroundPositionYValue()}%`;
      styles['background-repeat'] = 'no-repeat';
    }

    // Border
    if (this.containerBorderEnabledValue()) {
      styles['border'] =
        `${this.containerBorderWidthValue()}px ${this.containerBorderStyleValue()} ${this.containerBorderColorValue()}`;
      styles['border-radius'] = `${this.containerBorderRadiusValue()}px`;
    }

    // Shadow
    if (this.containerShadowEnabledValue()) {
      styles['box-shadow'] = this.computedShadow();
    }

    // Backdrop blur
    if (this.containerBackdropBlurEnabledValue()) {
      styles['backdrop-filter'] = `blur(${this.containerBackdropBlurIntensityValue()}px)`;
      styles['-webkit-backdrop-filter'] = `blur(${this.containerBackdropBlurIntensityValue()}px)`;
    }

    return styles;
  });

  /**
   * Handles background image file upload.
   * Validates file size (max 5MB) and converts to base64 data URI.
   * @param event - File input change event
   */
  handleImageUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      alert('File size exceeds 5MB. Please choose a smaller image.');
      // Reset input
      (event.target as HTMLInputElement).value = '';
      return;
    }

    // Convert to base64 and update signal
    const reader = new FileReader();
    reader.onload = () => {
      this.containerBackgroundImageUrlValue.set(reader.result as string);
    };
    reader.onerror = () => {
      alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
  }

  /**
   * Removes the currently uploaded background image.
   */
  removeBackgroundImage(): void {
    this.containerBackgroundImageUrlValue.set('');
  }

  /**
   * Sets the shadow preset and updates intensity accordingly.
   * @param preset - Shadow preset name
   */
  setShadowPreset(preset: 'subtle' | 'medium' | 'strong' | 'custom'): void {
    this.containerShadowPresetValue.set(preset);

    // Set default intensity values for non-custom presets
    if (preset === 'subtle') {
      this.containerShadowIntensityValue.set(3);
    } else if (preset === 'medium') {
      this.containerShadowIntensityValue.set(10);
    } else if (preset === 'strong') {
      this.containerShadowIntensityValue.set(20);
    }
    // For 'custom', keep current intensity value
  }

  /**
   * Sets the container max width to a preset value.
   * @param width - Width in pixels
   */
  setMaxWidth(width: number): void {
    this.containerMaxWidthValue.set(width);
  }
}
