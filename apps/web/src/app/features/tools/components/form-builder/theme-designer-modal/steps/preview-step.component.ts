import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { firstValueFrom } from 'rxjs';
import { ThemeDesignerModalService } from '../theme-designer-modal.service';

/**
 * Step 5: Preview & Save
 * Shows live preview of the theme and allows saving with a custom name.
 * Provides comprehensive theme summary and save functionality.
 */
@Component({
  selector: 'app-preview-step',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule, CardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preview-step">
      <div class="step-header">
        <h3 class="step-title">Preview & Save Theme</h3>
        <p class="step-description">Review your theme and save it for use in your forms.</p>
      </div>

      <!-- Theme Name Input -->
      <div class="theme-name-section">
        <label for="themeName" class="theme-name-label">
          <i class="pi pi-tag"></i>
          Theme Name
        </label>
        <input
          pInputText
          [(ngModel)]="themeNameValue"
          inputId="themeName"
          placeholder="e.g., Ocean Blue, Sunset Orange, Professional Gray"
          [maxlength]="50"
          class="theme-name-input"
        />
        <small class="theme-name-hint"
          >Give your theme a memorable name ({{ themeNameValue.length }}/50 characters)</small
        >

        @if (showNameError()) {
          <div class="error-message">
            <i class="pi pi-exclamation-circle"></i>
            <span>Theme name is required (minimum 3 characters)</span>
          </div>
        }
      </div>

      <!-- Theme Summary -->
      <div class="theme-summary">
        <h4 class="summary-title">
          <i class="pi pi-list"></i>
          Theme Summary
        </h4>

        <div class="summary-grid">
          <!-- Colors -->
          <div class="summary-card">
            <div class="summary-header">
              <i class="pi pi-palette"></i>
              <span>Colors</span>
            </div>
            <div class="summary-items">
              <div class="summary-item">
                <span class="item-label">Primary:</span>
                <div class="color-chip-wrapper">
                  <div
                    class="color-chip"
                    [style.background-color]="modalService.getPrimaryColor()"
                  ></div>
                  <span class="item-value">{{ modalService.getPrimaryColor() }}</span>
                </div>
              </div>
              <div class="summary-item">
                <span class="item-label">Secondary:</span>
                <div class="color-chip-wrapper">
                  <div
                    class="color-chip"
                    [style.background-color]="modalService.getSecondaryColor()"
                  ></div>
                  <span class="item-value">{{ modalService.getSecondaryColor() }}</span>
                </div>
              </div>
              <div class="summary-item">
                <span class="item-label">Label:</span>
                <div class="color-chip-wrapper">
                  <div
                    class="color-chip"
                    [style.background-color]="modalService.getLabelColor()"
                  ></div>
                  <span class="item-value">{{ modalService.getLabelColor() }}</span>
                </div>
              </div>
              <div class="summary-item">
                <span class="item-label">Input BG:</span>
                <div class="color-chip-wrapper">
                  <div
                    class="color-chip"
                    [style.background-color]="modalService.getInputBackgroundColor()"
                  ></div>
                  <span class="item-value">{{ modalService.getInputBackgroundColor() }}</span>
                </div>
              </div>
              <div class="summary-item">
                <span class="item-label">Input Text:</span>
                <div class="color-chip-wrapper color-chip-wrapper--text">
                  <div
                    class="color-chip color-chip--input-text"
                    [style.background-color]="modalService.getInputBackgroundColor()"
                    [style.color]="modalService.getInputTextColor()"
                  >
                    Aa
                  </div>
                  <span class="item-value">{{ modalService.getInputTextColor() }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Background -->
          <div class="summary-card">
            <div class="summary-header">
              <i class="pi pi-image"></i>
              <span>Background</span>
            </div>
            <div class="summary-items">
              <div class="summary-item">
                <span class="item-label">Type:</span>
                <span class="item-value">{{ formatBackgroundType() }}</span>
              </div>
              @if (modalService.getBackgroundType() !== 'solid') {
                <div class="summary-item">
                  <span class="item-label">Preview:</span>
                  <div class="background-preview" [style.background]="getBackgroundPreview()"></div>
                </div>
              }
            </div>
          </div>

          <!-- Typography -->
          <div class="summary-card">
            <div class="summary-header">
              <i class="pi pi-book"></i>
              <span>Typography</span>
            </div>
            <div class="summary-items">
              <div class="summary-item">
                <span class="item-label">Heading:</span>
                <span class="item-value"
                  >{{ extractFontName(modalService.getHeadingFont()) }} ({{
                    modalService.getHeadingFontSize()
                  }}px)</span
                >
              </div>
              <div class="summary-item">
                <span class="item-label">Body:</span>
                <span class="item-value"
                  >{{ extractFontName(modalService.getBodyFont()) }} ({{
                    modalService.getBodyFontSize()
                  }}px)</span
                >
              </div>
            </div>
          </div>

          <!-- Field Styling -->
          <div class="summary-card">
            <div class="summary-header">
              <i class="pi pi-stop"></i>
              <span>Field Styling</span>
            </div>
            <div class="summary-items">
              <div class="summary-item">
                <span class="item-label">Border Radius:</span>
                <span class="item-value">{{ modalService.getBorderRadius() }}px</span>
              </div>
              <div class="summary-item">
                <span class="item-label">Padding:</span>
                <span class="item-value">{{ modalService.getFieldPadding() }}px</span>
              </div>
              <div class="summary-item">
                <span class="item-label">Spacing:</span>
                <span class="item-value">{{ modalService.getFieldSpacing() }}px</span>
              </div>
              <div class="summary-item">
                <span class="item-label">Border Width:</span>
                <span class="item-value">{{ modalService.getBorderWidth() }}px</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Visual Theme Preview -->
      <div class="visual-preview">
        <h4 class="preview-title">
          <i class="pi pi-eye"></i>
          Visual Preview
        </h4>

        <div class="preview-container" [style.background]="getBackgroundPreview()">
          <div class="preview-form">
            <h2
              class="preview-form-title"
              [style.font-family]="modalService.getHeadingFont()"
              [style.font-size.px]="modalService.getHeadingFontSize()"
              [style.color]="modalService.getPrimaryColor()"
            >
              Sample Form Title
            </h2>

            <div
              class="preview-form-field"
              [style.margin-bottom.px]="modalService.getFieldSpacing()"
            >
              <label
                class="preview-form-label"
                [style.font-family]="modalService.getBodyFont()"
                [style.font-size.px]="modalService.getBodyFontSize()"
                [style.margin-bottom.px]="modalService.getLabelSpacing()"
                [style.color]="modalService.getLabelColor()"
              >
                Full Name
              </label>
              <input
                type="text"
                class="preview-form-input"
                placeholder="John Doe"
                [style.font-family]="modalService.getBodyFont()"
                [style.font-size.px]="modalService.getBodyFontSize()"
                [style.border-radius.px]="modalService.getBorderRadius()"
                [style.padding.px]="modalService.getFieldPadding()"
                [style.border-width.px]="modalService.getBorderWidth()"
                [style.background-color]="modalService.getInputBackgroundColor()"
                [style.color]="modalService.getInputTextColor()"
              />
            </div>

            <div class="preview-form-field">
              <label
                class="preview-form-label"
                [style.font-family]="modalService.getBodyFont()"
                [style.font-size.px]="modalService.getBodyFontSize()"
                [style.margin-bottom.px]="modalService.getLabelSpacing()"
                [style.color]="modalService.getLabelColor()"
              >
                Email Address
              </label>
              <input
                type="email"
                class="preview-form-input"
                placeholder="john@example.com"
                [style.font-family]="modalService.getBodyFont()"
                [style.font-size.px]="modalService.getBodyFontSize()"
                [style.border-radius.px]="modalService.getBorderRadius()"
                [style.padding.px]="modalService.getFieldPadding()"
                [style.border-width.px]="modalService.getBorderWidth()"
                [style.background-color]="modalService.getInputBackgroundColor()"
                [style.color]="modalService.getInputTextColor()"
              />
            </div>

            <button
              class="preview-form-button"
              [style.background-color]="modalService.getPrimaryColor()"
              [style.font-family]="modalService.getBodyFont()"
              [style.font-size.px]="modalService.getBodyFontSize()"
              [style.border-radius.px]="modalService.getBorderRadius()"
              [style.padding.px]="modalService.getFieldPadding()"
            >
              Submit
            </button>
          </div>
        </div>
      </div>

      <!-- Save Actions -->
      <div class="save-actions">
        <button
          pButton
          label="Save Theme"
          icon="pi pi-save"
          class="save-button"
          [disabled]="!canSave() || isSaving()"
          [loading]="isSaving()"
          (click)="handleSave()"
        ></button>

        @if (saveError()) {
          <div class="save-error">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ saveError() }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .preview-step {
        padding: 2rem;
        overflow-y: auto;
        max-height: calc(100vh - 250px);
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

      /* Theme Name Section */
      .theme-name-section {
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
      }

      .theme-name-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        font-size: 0.875rem;
        color: #374151;
        margin-bottom: 0.75rem;
      }

      .theme-name-label i {
        color: #6366f1;
      }

      .theme-name-input {
        width: 100%;
        font-size: 1rem;
        padding: 0.75rem;
      }

      .theme-name-hint {
        display: block;
        margin-top: 0.5rem;
        font-size: 0.75rem;
        color: #9ca3af;
      }

      .error-message {
        margin-top: 0.75rem;
        padding: 0.75rem 1rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        color: #991b1b;
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .error-message i {
        color: #dc2626;
      }

      /* Theme Summary */
      .theme-summary {
        margin-bottom: 2rem;
      }

      .summary-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 1rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .summary-title i {
        color: #6366f1;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
      }

      .summary-card {
        padding: 1rem;
        background: white;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .summary-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        font-size: 0.875rem;
        color: #1f2937;
        margin-bottom: 0.75rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .summary-header i {
        color: #6366f1;
      }

      .summary-items {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .summary-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.875rem;
      }

      .item-label {
        color: #6b7280;
        font-weight: 500;
      }

      .item-value {
        color: #1f2937;
        font-family: 'Courier New', monospace;
        font-size: 0.8rem;
      }

      .color-chip-wrapper {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .color-chip {
        width: 20px;
        height: 20px;
        border-radius: 4px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .color-chip-wrapper--text {
        gap: 0.75rem;
      }

      .color-chip--input-text {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 24px;
        border-radius: 4px;
        border: 1px solid #e5e7eb;
        font-weight: 600;
        font-size: 0.75rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .background-preview {
        width: 60px;
        height: 30px;
        border-radius: 4px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      /* Visual Preview */
      .visual-preview {
        margin-bottom: 2rem;
      }

      .preview-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 1rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .preview-title i {
        color: #6366f1;
      }

      .preview-container {
        padding: 2rem;
        border-radius: 8px;
        border: 2px solid #e5e7eb;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }

      .preview-form {
        max-width: 500px;
        margin: 0 auto;
        padding: 2rem;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .preview-form-title {
        margin: 0 0 1.5rem 0;
        font-weight: 700;
      }

      .preview-form-field {
        display: flex;
        flex-direction: column;
      }

      .preview-form-label {
        font-weight: 500;
        color: #374151;
      }

      .preview-form-input {
        width: 100%;
        border: 1px solid #d1d5db;
        background: white;
        color: #1f2937;
        transition: all 0.2s ease;
      }

      .preview-form-input:focus {
        outline: none;
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }

      .preview-form-button {
        width: 100%;
        margin-top: 1.5rem;
        color: white;
        border: none;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .preview-form-button:hover {
        opacity: 0.9;
        transform: translateY(-1px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
      }

      /* Save Actions */
      .save-actions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e5e7eb;
      }

      .save-button {
        width: 100%;
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        font-weight: 600;
      }

      .save-error {
        padding: 0.75rem 1rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        color: #991b1b;
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .save-error i {
        color: #dc2626;
      }

      /* PrimeNG overrides */
      :host ::ng-deep .p-inputtext {
        border-radius: 6px;
      }

      :host ::ng-deep .p-inputtext:enabled:hover {
        border-color: #6366f1;
      }

      :host ::ng-deep .p-inputtext:enabled:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 0.2rem rgba(99, 102, 241, 0.25);
      }

      :host ::ng-deep .p-button {
        background: #6366f1;
        border-color: #6366f1;
      }

      :host ::ng-deep .p-button:enabled:hover {
        background: #4f46e5;
        border-color: #4f46e5;
      }

      :host ::ng-deep .p-button:enabled:active {
        background: #4338ca;
        border-color: #4338ca;
      }

      /* Responsive adjustments */
      @media (max-width: 767px) {
        .preview-step {
          padding: 1.5rem;
        }

        .summary-grid {
          grid-template-columns: 1fr;
        }

        .preview-container {
          padding: 1rem;
        }

        .preview-form {
          padding: 1.5rem;
        }
      }
    `,
  ],
})
export class PreviewStepComponent {
  protected readonly modalService = inject(ThemeDesignerModalService);

  protected readonly isSaving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly showNameError = signal(false);

  /**
   * Theme name value with two-way binding to service.
   */
  get themeNameValue(): string {
    return this.modalService.getThemeName();
  }

  set themeNameValue(value: string) {
    this.modalService.setThemeName(value);
    if (this.showNameError()) {
      this.showNameError.set(value.trim().length < 3);
    }
  }

  /**
   * Computed signal to determine if the theme can be saved.
   * Requires a valid theme name (minimum 3 characters).
   */
  protected readonly canSave = computed(() => {
    return this.themeNameValue.trim().length >= 3;
  });

  /**
   * Formats the background type for display.
   */
  protected formatBackgroundType(): string {
    const type = this.modalService.getBackgroundType();
    const typeMap: Record<string, string> = {
      solid: 'Solid Color',
      linear: 'Linear Gradient',
      radial: 'Radial Gradient',
      image: 'Background Image',
    };
    return typeMap[type] || type;
  }

  /**
   * Extracts font name from font family value.
   */
  protected extractFontName(fontFamily: string): string {
    return fontFamily.split(',')[0].trim();
  }

  /**
   * Gets the background preview CSS for display.
   */
  protected getBackgroundPreview(): string {
    const type = this.modalService.getBackgroundType();

    if (type === 'solid') {
      return this.modalService.getBackgroundColor();
    } else if (type === 'linear') {
      const angle = this.modalService.getGradientAngle();
      const color1 = this.modalService.getGradientColor1();
      const color2 = this.modalService.getGradientColor2();
      return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
    } else if (type === 'radial') {
      const position = this.modalService.getGradientPosition();
      const color1 = this.modalService.getGradientColor1();
      const color2 = this.modalService.getGradientColor2();
      return `radial-gradient(circle at ${position}, ${color1}, ${color2})`;
    } else if (type === 'image') {
      const imageUrl = this.modalService.getBackgroundImageUrl();
      return imageUrl ? `url(${imageUrl})` : '#f3f4f6';
    }

    return '#f3f4f6';
  }

  /**
   * Handles the save button click.
   * Validates theme name, saves theme via service, and emits success event.
   */
  protected async handleSave(): Promise<void> {
    // Validate theme name
    if (!this.canSave()) {
      this.showNameError.set(true);
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);
    this.showNameError.set(false);

    try {
      // Save theme via service - convert Observable to Promise
      const savedTheme = await firstValueFrom(this.modalService.saveTheme());

      // Notify service that theme was saved (parent modal will handle closing)
      this.modalService.notifyThemeSaved(savedTheme.id);

      console.log('Theme saved successfully:', savedTheme.id);
    } catch (error) {
      console.error('Failed to save theme:', error);
      this.saveError.set(
        error instanceof Error ? error.message : 'Failed to save theme. Please try again.',
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}
