import { Component, ChangeDetectionStrategy, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { ThemeDesignerModalService } from '../theme-designer-modal.service';

interface FontOption {
  label: string;
  value: string;
  category?: string;
}

/**
 * Step 3: Typography Selection
 * Allows users to choose fonts for headings and body text.
 * Integrates with Google Fonts API for dynamic font loading.
 */
@Component({
  selector: 'app-typography-step',
  standalone: true,
  imports: [CommonModule, FormsModule, Select, InputNumber],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="typography-step">
      <div class="step-header">
        <h3 class="step-title">Select Typography</h3>
        <p class="step-description">Choose fonts and sizes for your theme's text.</p>
      </div>

      <div class="typography-fields">
        <!-- Heading Font Selection -->
        <div class="font-field-group">
          <label for="headingFont" class="font-label">
            <i class="pi pi-book"></i>
            Heading Font
          </label>
          <p-select
            [(ngModel)]="headingFontValue"
            [options]="fontOptions"
            inputId="headingFont"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            filterBy="label"
            placeholder="Select heading font"
            appendTo="body"
            [style]="{ width: '100%' }"
          >
            <ng-template let-option pTemplate="item">
              <div class="font-dropdown-item" [style.font-family]="option.value">
                {{ option.label }}
              </div>
            </ng-template>
          </p-select>
          <small class="field-hint">Used for form titles and section headings</small>
        </div>

        <!-- Heading Font Size -->
        <div class="font-field-group">
          <label for="headingFontSize" class="font-label">
            <i class="pi pi-hashtag"></i>
            Heading Font Size
          </label>
          <div class="size-input-wrapper">
            <p-inputNumber
              [(ngModel)]="headingFontSizeValue"
              inputId="headingFontSize"
              [min]="16"
              [max]="48"
              [step]="1"
              suffix=" px"
              [showButtons]="true"
              buttonLayout="horizontal"
              incrementButtonIcon="pi pi-plus"
              decrementButtonIcon="pi pi-minus"
              [style]="{ width: '100%' }"
            ></p-inputNumber>
          </div>
          <small class="field-hint">Range: 16px - 48px</small>
        </div>

        <!-- Body Font Selection -->
        <div class="font-field-group">
          <label for="bodyFont" class="font-label">
            <i class="pi pi-align-left"></i>
            Body Font
          </label>
          <p-select
            [(ngModel)]="bodyFontValue"
            [options]="fontOptions"
            inputId="bodyFont"
            optionLabel="label"
            optionValue="value"
            [filter]="true"
            filterBy="label"
            placeholder="Select body font"
            appendTo="body"
            [style]="{ width: '100%' }"
          >
            <ng-template let-option pTemplate="item">
              <div class="font-dropdown-item" [style.font-family]="option.value">
                {{ option.label }}
              </div>
            </ng-template>
          </p-select>
          <small class="field-hint">Used for form fields, labels, and descriptions</small>
        </div>

        <!-- Body Font Size -->
        <div class="font-field-group">
          <label for="bodyFontSize" class="font-label">
            <i class="pi pi-hashtag"></i>
            Body Font Size
          </label>
          <div class="size-input-wrapper">
            <p-inputNumber
              [(ngModel)]="bodyFontSizeValue"
              inputId="bodyFontSize"
              [min]="12"
              [max]="24"
              [step]="1"
              suffix=" px"
              [showButtons]="true"
              buttonLayout="horizontal"
              incrementButtonIcon="pi pi-plus"
              decrementButtonIcon="pi pi-minus"
              [style]="{ width: '100%' }"
            ></p-inputNumber>
          </div>
          <small class="field-hint">Range: 12px - 24px</small>
        </div>
      </div>

      <!-- Typography Preview -->
      <div class="typography-preview">
        <h4 class="preview-title">Typography Preview</h4>
        <div class="preview-content">
          <!-- Heading Preview -->
          <div class="preview-section">
            <div
              class="preview-heading"
              [style.font-family]="headingFontValue"
              [style.font-size.px]="headingFontSizeValue"
            >
              This is a Heading
            </div>
            <span class="preview-meta">{{ headingFontValue }} • {{ headingFontSizeValue }}px</span>
          </div>

          <!-- Body Preview -->
          <div class="preview-section">
            <div
              class="preview-body"
              [style.font-family]="bodyFontValue"
              [style.font-size.px]="bodyFontSizeValue"
            >
              This is body text that will appear in your form fields, labels, and descriptions. It
              should be clear and readable at various sizes.
            </div>
            <span class="preview-meta">{{ bodyFontValue }} • {{ bodyFontSizeValue }}px</span>
          </div>

          <!-- Combined Preview -->
          <div class="preview-section preview-combined">
            <div
              class="preview-heading-small"
              [style.font-family]="headingFontValue"
              [style.font-size.px]="headingFontSizeValue * 0.8"
            >
              Sample Form Title
            </div>
            <div
              class="preview-body-small"
              [style.font-family]="bodyFontValue"
              [style.font-size.px]="bodyFontSizeValue"
            >
              Fill out the fields below to complete your submission.
            </div>
          </div>
        </div>
      </div>

      <!-- Font Loading Status -->
      @if (fontsLoading) {
        <div class="font-loading">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Loading fonts...</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .typography-step {
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

      .typography-fields {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .font-field-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .font-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        font-size: 0.875rem;
        color: #374151;
      }

      .font-label i {
        color: #6366f1;
      }

      .size-input-wrapper {
        width: 100%;
      }

      .field-hint {
        font-size: 0.75rem;
        color: #9ca3af;
        padding-left: 0.25rem;
      }

      .font-dropdown-item {
        padding: 0.5rem;
        transition: background-color 0.2s ease;
      }

      .typography-preview {
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

      .preview-section {
        padding: 1.25rem;
        background: white;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .preview-heading {
        font-weight: 700;
        color: #1f2937;
        line-height: 1.2;
      }

      .preview-body {
        color: #4b5563;
        line-height: 1.6;
      }

      .preview-meta {
        font-size: 0.75rem;
        color: #9ca3af;
        font-family: 'Courier New', monospace;
        padding: 0.25rem 0.5rem;
        background: #f3f4f6;
        border-radius: 4px;
        align-self: flex-start;
      }

      .preview-combined {
        background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
        border: 2px solid #e5e7eb;
      }

      .preview-heading-small {
        font-weight: 700;
        color: #1f2937;
        line-height: 1.2;
        margin-bottom: 0.5rem;
      }

      .preview-body-small {
        color: #6b7280;
        line-height: 1.5;
      }

      .font-loading {
        margin-top: 1rem;
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

      .font-loading i {
        color: #3b82f6;
      }

      /* PrimeNG overrides */
      :host ::ng-deep .p-dropdown {
        border-radius: 6px;
      }

      :host ::ng-deep .p-dropdown:not(.p-disabled):hover {
        border-color: #6366f1;
      }

      :host ::ng-deep .p-dropdown:not(.p-disabled).p-focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 0.2rem rgba(99, 102, 241, 0.25);
      }

      :host ::ng-deep .p-inputnumber {
        width: 100%;
      }

      :host ::ng-deep .p-inputnumber .p-inputtext {
        border-radius: 6px;
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
        .typography-step {
          padding: 1.5rem;
        }

        .preview-section {
          padding: 1rem;
        }

        .preview-heading {
          font-size: 1.25rem;
        }

        .preview-body {
          font-size: 0.875rem;
        }
      }
    `,
  ],
})
export class TypographyStepComponent implements OnInit {
  protected readonly modalService = inject(ThemeDesignerModalService);
  private readonly platformId = inject(PLATFORM_ID);

  protected fontsLoading = false;
  private loadedFonts = new Set<string>();

  /**
   * Available Google Fonts for selection.
   * Curated list of popular, readable fonts for form design.
   */
  protected readonly fontOptions: FontOption[] = [
    { label: 'Roboto', value: 'Roboto, sans-serif', category: 'Sans Serif' },
    { label: 'Open Sans', value: 'Open Sans, sans-serif', category: 'Sans Serif' },
    { label: 'Lato', value: 'Lato, sans-serif', category: 'Sans Serif' },
    { label: 'Montserrat', value: 'Montserrat, sans-serif', category: 'Sans Serif' },
    { label: 'Poppins', value: 'Poppins, sans-serif', category: 'Sans Serif' },
    { label: 'Inter', value: 'Inter, sans-serif', category: 'Sans Serif' },
    { label: 'Nunito', value: 'Nunito, sans-serif', category: 'Sans Serif' },
    { label: 'Raleway', value: 'Raleway, sans-serif', category: 'Sans Serif' },
    { label: 'Ubuntu', value: 'Ubuntu, sans-serif', category: 'Sans Serif' },
    { label: 'PT Sans', value: 'PT Sans, sans-serif', category: 'Sans Serif' },
    { label: 'Merriweather', value: 'Merriweather, serif', category: 'Serif' },
    { label: 'Playfair Display', value: 'Playfair Display, serif', category: 'Serif' },
    { label: 'Lora', value: 'Lora, serif', category: 'Serif' },
    { label: 'PT Serif', value: 'PT Serif, serif', category: 'Serif' },
    { label: 'Source Sans Pro', value: 'Source Sans Pro, sans-serif', category: 'Sans Serif' },
  ];

  ngOnInit(): void {
    // Load initial fonts on component init
    if (isPlatformBrowser(this.platformId)) {
      this.loadFont(this.headingFontValue);
      this.loadFont(this.bodyFontValue);
    }
  }

  /**
   * Heading font value with two-way binding to service.
   * Triggers Google Fonts loading when changed.
   */
  get headingFontValue(): string {
    return this.modalService.getHeadingFont();
  }

  set headingFontValue(value: string) {
    this.modalService.setHeadingFont(value);
    if (isPlatformBrowser(this.platformId)) {
      this.loadFont(value);
    }
  }

  /**
   * Body font value with two-way binding to service.
   * Triggers Google Fonts loading when changed.
   */
  get bodyFontValue(): string {
    return this.modalService.getBodyFont();
  }

  set bodyFontValue(value: string) {
    this.modalService.setBodyFont(value);
    if (isPlatformBrowser(this.platformId)) {
      this.loadFont(value);
    }
  }

  /**
   * Heading font size with two-way binding to service.
   */
  get headingFontSizeValue(): number {
    return this.modalService.getHeadingFontSize();
  }

  set headingFontSizeValue(value: number) {
    this.modalService.setHeadingFontSize(value);
  }

  /**
   * Body font size with two-way binding to service.
   */
  get bodyFontSizeValue(): number {
    return this.modalService.getBodyFontSize();
  }

  set bodyFontSizeValue(value: number) {
    this.modalService.setBodyFontSize(value);
  }

  /**
   * Dynamically loads Google Font by injecting a link tag into the document head.
   * Prevents duplicate loading by tracking loaded fonts.
   *
   * @param fontFamily - Font family value (e.g., "Roboto, sans-serif")
   */
  private loadFont(fontFamily: string): void {
    // Extract font name from family value
    const fontName = fontFamily.split(',')[0].trim();

    // Skip if already loaded
    if (this.loadedFonts.has(fontName)) {
      return;
    }

    this.fontsLoading = true;

    // Create Google Fonts link element
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(
      / /g,
      '+',
    )}:wght@400;700&display=swap`;

    link.onload = () => {
      this.loadedFonts.add(fontName);
      this.fontsLoading = false;
    };

    link.onerror = () => {
      console.warn(`Failed to load Google Font: ${fontName}`);
      this.fontsLoading = false;
    };

    document.head.appendChild(link);
  }
}
