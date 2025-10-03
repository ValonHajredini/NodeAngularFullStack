import { Component, EventEmitter, Output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { ButtonDirective } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { ExportOptions, OptimizationLevel, ExportFormat } from '@nodeangularfullstack/shared';
import { SvgDrawingService } from '../../svg-drawing.service';

/**
 * Component for configuring SVG export options.
 * Embedded inline in tab view for export configuration.
 */
@Component({
  selector: 'app-export-options',
  standalone: true,
  imports: [CommonModule, FormsModule, InputText, InputNumber, Select, ButtonDirective, Checkbox],
  template: `
    <div class="export-options-panel p-4">
      <!-- Header -->
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Export Drawing</h3>
        <p class="text-sm text-gray-600">
          Configure your export settings and download your drawing as
          {{
            exportOptions.format === 'svg'
              ? 'an SVG'
              : exportOptions.format === 'png'
                ? 'a PNG'
                : 'a JSON template'
          }}
          file.
        </p>
      </div>

      <!-- Format Selection -->
      <div class="flex flex-col gap-2 mb-4">
        <label for="format" class="font-semibold text-sm text-gray-700">Format</label>
        <p-select
          inputId="format"
          [options]="formatOptions"
          [(ngModel)]="exportOptions.format"
          (ngModelChange)="onFormatChange($event)"
          optionLabel="label"
          optionValue="value"
          [style]="{ width: '100%' }"
          placeholder="Select format"
        ></p-select>
      </div>

      <!-- Filename -->
      <div class="flex flex-col gap-2 mb-4">
        <label for="filename" class="font-semibold text-sm text-gray-700">Filename</label>
        <input
          id="filename"
          type="text"
          pInputText
          [(ngModel)]="exportOptions.filename"
          [placeholder]="
            exportOptions.format === 'svg'
              ? 'drawing.svg'
              : exportOptions.format === 'png'
                ? 'drawing.png'
                : 'drawing.json'
          "
          class="w-full"
        />
      </div>

      <!-- Dimensions (SVG and PNG only) -->
      <div class="grid grid-cols-2 gap-4 mb-4" *ngIf="exportOptions.format !== 'json'">
        <div class="flex flex-col gap-2">
          <label for="width" class="font-semibold text-sm text-gray-700">Width (px)</label>
          <p-inputNumber
            inputId="width"
            [(ngModel)]="exportOptions.width"
            (ngModelChange)="onWidthChange($event)"
            [min]="100"
            [max]="10000"
            [step]="100"
            [showButtons]="true"
            class="w-full"
          ></p-inputNumber>
        </div>
        <div class="flex flex-col gap-2">
          <label for="height" class="font-semibold text-sm text-gray-700">Height (px)</label>
          <p-inputNumber
            inputId="height"
            [(ngModel)]="exportOptions.height"
            (ngModelChange)="onHeightChange($event)"
            [min]="100"
            [max]="10000"
            [step]="100"
            [showButtons]="true"
            class="w-full"
          ></p-inputNumber>
        </div>
      </div>

      <!-- Padding (SVG and PNG only) -->
      <div class="flex flex-col gap-2 mb-4" *ngIf="exportOptions.format !== 'json'">
        <label for="padding" class="font-semibold text-sm text-gray-700">Padding (px)</label>
        <p-inputNumber
          inputId="padding"
          [(ngModel)]="exportOptions.padding"
          (ngModelChange)="onPaddingChange($event)"
          [min]="0"
          [max]="100"
          [step]="5"
          [showButtons]="true"
          class="w-full"
        ></p-inputNumber>
      </div>

      <!-- Optimization Level (SVG only) -->
      <div class="flex flex-col gap-2 mb-4" *ngIf="exportOptions.format === 'svg'">
        <label for="optimization" class="font-semibold text-sm text-gray-700">Optimization</label>
        <p-select
          inputId="optimization"
          [options]="optimizationLevels"
          [(ngModel)]="exportOptions.optimizationLevel"
          optionLabel="label"
          optionValue="value"
          [style]="{ width: '100%' }"
          placeholder="Select optimization level"
        ></p-select>
      </div>

      <!-- Preview Option -->
      <div class="flex align-items-center gap-2 mb-6">
        <p-checkbox inputId="preview" [(ngModel)]="showPreview" [binary]="true"></p-checkbox>
        <label for="preview" class="font-semibold text-sm cursor-pointer text-gray-700">
          Show preview before download
        </label>
      </div>

      <!-- Export Buttons -->
      <div class="flex gap-2">
        <button
          pButton
          type="button"
          label="Cancel"
          icon="pi pi-times"
          severity="secondary"
          [outlined]="true"
          (click)="onCancel()"
          [disabled]="isExporting()"
          class="flex-1"
        ></button>
        <button
          pButton
          type="button"
          [label]="isExporting() ? 'Exporting...' : 'Export ' + exportOptions.format.toUpperCase()"
          icon="pi pi-download"
          severity="primary"
          (click)="onExport()"
          [disabled]="!isValid() || isExporting()"
          class="flex-1"
        ></button>
      </div>
    </div>
  `,
  styles: [
    `
      .export-options-panel {
        max-width: 500px;
      }

      /* Dropdown (Select) Styling */
      :host ::ng-deep .p-select {
        width: 100%;
        min-width: 320px;
      }

      :host ::ng-deep .p-select-dropdown {
        border: 1.5px solid #cbd5e1;
        border-radius: 0.5rem;
        background: white;
        padding: 0.625rem 1rem;
        font-size: 0.9375rem;
        transition: all 0.2s;
      }

      :host ::ng-deep .p-select-dropdown:hover {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      :host ::ng-deep .p-select-dropdown:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }

      :host ::ng-deep .p-select-label {
        padding: 0.375rem 0;
        color: #1f2937;
        font-weight: 500;
      }

      :host ::ng-deep .p-select-overlay {
        border: 1.5px solid #e5e7eb;
        border-radius: 0.5rem;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        margin-top: 0.25rem;
      }

      :host ::ng-deep .p-select-option {
        padding: 0.75rem 1rem;
        font-size: 0.9375rem;
        transition: all 0.15s;
      }

      :host ::ng-deep .p-select-option:hover {
        background: #f0f9ff;
        color: #1e40af;
      }

      :host ::ng-deep .p-select-option.p-selected {
        background: #dbeafe;
        color: #1e40af;
        font-weight: 600;
      }

      /* Input Number Styling */
      :host ::ng-deep .p-inputnumber {
        width: 100%;
      }

      :host ::ng-deep .p-inputnumber-input {
        width: 100%;
        border: 1.5px solid #cbd5e1;
        border-radius: 0.5rem;
        padding: 0.625rem 1rem;
        font-size: 0.9375rem;
        font-weight: 500;
        color: #1f2937;
        transition: all 0.2s;
      }

      :host ::ng-deep .p-inputnumber-input:hover {
        border-color: #94a3b8;
      }

      :host ::ng-deep .p-inputnumber-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }

      /* Input Number Buttons (Spinners) */
      :host ::ng-deep .p-inputnumber-buttons-stacked .p-inputnumber-button-group {
        display: flex;
        flex-direction: column;
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
      }

      :host ::ng-deep .p-inputnumber-button {
        width: 2.5rem;
        height: 50%;
        border: 1.5px solid #cbd5e1;
        background: white;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      :host ::ng-deep .p-inputnumber-button:hover {
        background: #f0f9ff;
        border-color: #3b82f6;
        color: #3b82f6;
      }

      :host ::ng-deep .p-inputnumber-button:active {
        background: #dbeafe;
        color: #1e40af;
      }

      :host ::ng-deep .p-inputnumber-button-up {
        border-top-right-radius: 0.5rem;
        border-bottom: none;
      }

      :host ::ng-deep .p-inputnumber-button-down {
        border-bottom-right-radius: 0.5rem;
        border-top: 0.75px solid #cbd5e1;
      }

      :host ::ng-deep .p-inputnumber-button .p-icon {
        width: 0.875rem;
        height: 0.875rem;
        font-weight: bold;
      }

      /* Input Text Styling */
      :host ::ng-deep input[pInputText] {
        border: 1.5px solid #cbd5e1;
        border-radius: 0.5rem;
        padding: 0.625rem 1rem;
        font-size: 0.9375rem;
        font-weight: 500;
        color: #1f2937;
        transition: all 0.2s;
      }

      :host ::ng-deep input[pInputText]:hover {
        border-color: #94a3b8;
      }

      :host ::ng-deep input[pInputText]:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }

      /* Checkbox Styling */
      :host ::ng-deep .p-checkbox-box {
        width: 1.25rem;
        height: 1.25rem;
        border: 2px solid #cbd5e1;
        border-radius: 0.375rem;
        transition: all 0.2s;
      }

      :host ::ng-deep .p-checkbox-box:hover {
        border-color: #3b82f6;
        background: #f0f9ff;
      }

      :host ::ng-deep .p-checkbox-box.p-checked {
        background: #3b82f6;
        border-color: #2563eb;
      }

      /* Labels */
      label {
        font-weight: 600;
        color: #374151;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }
    `,
  ],
})
export class ExportOptionsComponent implements OnInit {
  /** Inject SVG Drawing Service */
  private readonly svgDrawingService = inject(SvgDrawingService);

  /** Event emitted when export is confirmed */
  @Output() export = new EventEmitter<ExportOptions>();

  /** Event emitted to close the dialog */
  @Output() closeDialog = new EventEmitter<void>();

  /** Export options configuration */
  exportOptions: ExportOptions = {
    filename: 'drawing.svg',
    width: 800,
    height: 600,
    format: 'svg',
    optimizationLevel: 'basic',
    padding: 20,
  };

  ngOnInit(): void {
    // Initialize with current service values
    this.exportOptions.width = this.svgDrawingService.exportWidth();
    this.exportOptions.height = this.svgDrawingService.exportHeight();
    this.exportOptions.padding = this.svgDrawingService.exportPadding();
  }

  /** Whether to show preview before download */
  showPreview = false;

  /** Loading state during export */
  isExporting = signal<boolean>(false);

  /** Available export formats */
  formatOptions = [
    { label: 'SVG (Vector)', value: 'svg' as ExportFormat },
    { label: 'PNG (Image)', value: 'png' as ExportFormat },
    { label: 'JSON (Template)', value: 'json' as ExportFormat },
  ];

  /** Available optimization levels */
  optimizationLevels = [
    { label: 'None', value: 'none' as OptimizationLevel },
    { label: 'Basic', value: 'basic' as OptimizationLevel },
    { label: 'Aggressive', value: 'aggressive' as OptimizationLevel },
  ];

  /**
   * Handles format change and updates filename extension.
   */
  onFormatChange(format: ExportFormat): void {
    const currentFilename = this.exportOptions.filename;
    const nameWithoutExt = currentFilename.replace(/\.(svg|png|json)$/i, '');
    this.exportOptions.filename = `${nameWithoutExt}.${format}`;
  }

  /**
   * Handles width change and updates service.
   */
  onWidthChange(width: number): void {
    if (width) {
      this.svgDrawingService.setExportWidth(width);
    }
  }

  /**
   * Handles height change and updates service.
   */
  onHeightChange(height: number): void {
    if (height) {
      this.svgDrawingService.setExportHeight(height);
    }
  }

  /**
   * Handles padding change and updates service.
   */
  onPaddingChange(padding: number): void {
    if (padding !== null && padding !== undefined) {
      this.svgDrawingService.setExportPadding(padding);
    }
  }

  /**
   * Validates export options.
   * @returns True if options are valid
   */
  isValid(): boolean {
    return (
      !!this.exportOptions.filename &&
      this.exportOptions.filename.trim().length > 0 &&
      this.exportOptions.width > 0 &&
      this.exportOptions.height > 0
    );
  }

  /**
   * Handles export button click.
   */
  onExport(): void {
    if (!this.isValid()) return;

    // Ensure filename has correct extension
    const expectedExt = `.${this.exportOptions.format}`;
    if (!this.exportOptions.filename.toLowerCase().endsWith(expectedExt)) {
      // Remove any existing extension and add the correct one
      const nameWithoutExt = this.exportOptions.filename.replace(/\.(svg|png|json)$/i, '');
      this.exportOptions.filename = `${nameWithoutExt}${expectedExt}`;
    }

    this.isExporting.set(true);

    // Emit export event with options
    this.export.emit({ ...this.exportOptions });

    // Reset loading state after a short delay
    setTimeout(() => {
      this.isExporting.set(false);
    }, 500);
  }

  /**
   * Handles cancel button click.
   */
  onCancel(): void {
    this.closeDialog.emit();
  }

  /**
   * Resets export options to defaults.
   */
  reset(): void {
    this.exportOptions = {
      filename: 'drawing.svg',
      width: 800,
      height: 600,
      format: 'svg',
      optimizationLevel: 'basic',
      padding: 20,
    };
    this.showPreview = false;
  }
}
