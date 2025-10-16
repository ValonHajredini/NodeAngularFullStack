import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';

/**
 * Interface for theme import validation result
 */
interface ImportValidationResult {
  success: boolean;
  error?: string;
  themesCount?: number;
}

/**
 * Interface for theme export data (for validation)
 */
interface ThemeExport {
  exportVersion: string;
  exportDate: string;
  themes: Array<{
    name: string;
    themeDefinition: any;
    metadata?: {
      description?: string;
      category?: string;
    };
  }>;
}

/**
 * Theme import dialog component for importing themes from JSON files
 */
@Component({
  selector: 'app-theme-import-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, FileUploadModule],
  template: `
    <p-dialog
      header="Import Themes"
      [modal]="true"
      [visible]="visible"
      (onHide)="onHide()"
      [style]="{ width: '600px' }"
    >
      <div class="mb-4">
        <p class="mb-3">Import themes from JSON files:</p>

        <p-fileUpload
          #fileUpload
          mode="basic"
          accept=".json"
          [multiple]="true"
          [auto]="false"
          chooseLabel="Select Files"
          class="mb-3"
          (onSelect)="onFilesSelect($event)"
        ></p-fileUpload>

        <div *ngIf="selectedFiles().length > 0" class="mt-3">
          <p class="text-sm text-gray-600 mb-2">Selected files:</p>
          <ul class="list-none p-0">
            <li *ngFor="let file of selectedFiles()" class="flex align-items-center gap-2 py-1">
              <i class="pi pi-file text-blue-500"></i>
              {{ file.name }}
              <span class="text-sm text-gray-500">({{ (file.size / 1024).toFixed(1) }} KB)</span>

              <!-- Validation status -->
              <div class="ml-auto">
                <i
                  *ngIf="getFileValidation(file.name)?.success === true"
                  class="pi pi-check-circle text-green-500"
                  title="Valid theme file"
                ></i>
                <i
                  *ngIf="getFileValidation(file.name)?.success === false"
                  class="pi pi-times-circle text-red-500"
                  [title]="getFileValidation(file.name)?.error"
                ></i>
                <i
                  *ngIf="!getFileValidation(file.name) && validating()"
                  class="pi pi-spin pi-spinner text-blue-500"
                  title="Validating..."
                ></i>
              </div>
            </li>
          </ul>
        </div>

        <!-- Validation Summary -->
        <div *ngIf="validationComplete() && selectedFiles().length > 0" class="mt-3">
          <div
            *ngIf="validFilesCount() > 0"
            class="bg-green-50 border-left-3 border-green-500 p-3 mb-2"
          >
            <p class="text-sm text-green-800 mb-0">
              <i class="pi pi-check mr-2"></i>
              {{ validFilesCount() }} valid theme file(s) ready for import
            </p>
          </div>

          <div
            *ngIf="invalidFilesCount() > 0"
            class="bg-red-50 border-left-3 border-red-500 p-3 mb-2"
          >
            <p class="text-sm text-red-800 mb-0">
              <i class="pi pi-times mr-2"></i>
              {{ invalidFilesCount() }} invalid file(s) - check file format and content
            </p>
          </div>
        </div>

        <!-- Import Requirements -->
        <div class="bg-blue-50 border-round p-3 mt-4">
          <p class="text-sm text-blue-800 mb-2">
            <i class="pi pi-info-circle mr-2"></i>
            Import Requirements:
          </p>
          <ul class="text-sm text-blue-700 list-disc list-inside ml-4">
            <li>JSON files exported from theme management</li>
            <li>Valid theme definition structure (primaryColor, secondaryColor required)</li>
            <li>Theme names must be unique</li>
            <li>Maximum 50KB per file</li>
            <li>No JavaScript or external imports in CSS</li>
          </ul>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button
          label="Cancel"
          icon="pi pi-times"
          [outlined]="true"
          (onClick)="onCancel()"
          [disabled]="importing()"
        ></p-button>
        <p-button
          label="Import"
          icon="pi pi-upload"
          [disabled]="selectedFiles().length === 0 || validFilesCount() === 0"
          (onClick)="onImport()"
          [loading]="importing()"
        ></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [
    `
      .border-left-3 {
        border-left-width: 3px;
        border-left-style: solid;
      }

      .pi-spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class ThemeImportDialogComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() import = new EventEmitter<File[]>();

  readonly selectedFiles = signal<File[]>([]);
  readonly validating = signal(false);
  readonly importing = signal(false);
  private readonly fileValidations = signal<Map<string, ImportValidationResult>>(new Map());

  // Computed properties
  readonly validationComplete = signal(false);
  readonly validFilesCount = signal(0);
  readonly invalidFilesCount = signal(0);

  /**
   * Handles file selection and starts validation
   */
  onFilesSelect(event: any): void {
    const files = event.files || event.currentFiles || [];
    const fileArray = Array.from(files) as File[];

    this.selectedFiles.set(fileArray);
    this.fileValidations.set(new Map());
    this.validationComplete.set(false);

    if (fileArray.length > 0) {
      this.validateFiles(fileArray);
    }
  }

  /**
   * Validates selected files
   */
  private async validateFiles(files: File[]): Promise<void> {
    this.validating.set(true);
    const validations = new Map<string, ImportValidationResult>();

    const promises = files.map((file) => this.validateFile(file));
    const results = await Promise.all(promises);

    files.forEach((file, index) => {
      validations.set(file.name, results[index]);
    });

    this.fileValidations.set(validations);
    this.updateValidationCounts(validations);
    this.validating.set(false);
    this.validationComplete.set(true);
  }

  /**
   * Validates a single file
   */
  private validateFile(file: File): Promise<ImportValidationResult> {
    return new Promise((resolve) => {
      // Check file size (50KB limit)
      if (file.size > 50 * 1024) {
        resolve({ success: false, error: 'File size exceeds 50KB limit' });
        return;
      }

      // Check file type
      if (!file.name.toLowerCase().endsWith('.json')) {
        resolve({ success: false, error: 'File must be JSON format' });
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content) as ThemeExport;

          // Validate export format
          if (!data.exportVersion || !data.themes || !Array.isArray(data.themes)) {
            resolve({ success: false, error: 'Invalid export format - missing required fields' });
            return;
          }

          // Validate each theme
          for (const themeData of data.themes) {
            if (!themeData.name || !themeData.themeDefinition) {
              resolve({ success: false, error: 'Invalid theme data - missing name or definition' });
              return;
            }

            // Validate theme definition structure
            const def = themeData.themeDefinition;
            if (!def.primaryColor || !def.secondaryColor) {
              resolve({
                success: false,
                error: 'Incomplete theme definition - missing required colors',
              });
              return;
            }

            // Validate color format (basic check)
            if (!this.isValidColor(def.primaryColor) || !this.isValidColor(def.secondaryColor)) {
              resolve({ success: false, error: 'Invalid color format in theme definition' });
              return;
            }

            // Check for security issues (no javascript:, @import, etc.)
            const definitionStr = JSON.stringify(def);
            if (this.containsSecurityRisk(definitionStr)) {
              resolve({ success: false, error: 'Theme contains potentially unsafe content' });
              return;
            }
          }

          resolve({ success: true, themesCount: data.themes.length });
        } catch (error) {
          resolve({ success: false, error: 'Invalid JSON format' });
        }
      };

      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read file' });
      };

      reader.readAsText(file);
    });
  }

  /**
   * Basic color validation (hex, rgb, named colors)
   */
  private isValidColor(color: string): boolean {
    // Hex colors
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      return true;
    }

    // RGB/RGBA colors
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(color)) {
      return true;
    }

    // HSL/HSLA colors
    if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/.test(color)) {
      return true;
    }

    // Named colors (basic check)
    const namedColors = [
      'red',
      'blue',
      'green',
      'black',
      'white',
      'gray',
      'yellow',
      'orange',
      'purple',
      'pink',
      'brown',
    ];
    if (namedColors.includes(color.toLowerCase())) {
      return true;
    }

    return false;
  }

  /**
   * Checks for potential security risks in theme content
   */
  private containsSecurityRisk(content: string): boolean {
    const dangerousPatterns = [
      'javascript:',
      '@import',
      'expression(',
      'eval(',
      'script:',
      'vbscript:',
      'data:text/html',
      '<script',
      '</script>',
    ];

    const lowerContent = content.toLowerCase();
    return dangerousPatterns.some((pattern) => lowerContent.includes(pattern));
  }

  /**
   * Updates validation count signals
   */
  private updateValidationCounts(validations: Map<string, ImportValidationResult>): void {
    let validCount = 0;
    let invalidCount = 0;

    validations.forEach((result) => {
      if (result.success) {
        validCount++;
      } else {
        invalidCount++;
      }
    });

    this.validFilesCount.set(validCount);
    this.invalidFilesCount.set(invalidCount);
  }

  /**
   * Gets validation result for a specific file
   */
  getFileValidation(fileName: string): ImportValidationResult | undefined {
    return this.fileValidations().get(fileName);
  }

  /**
   * Handles dialog hide event
   */
  onHide(): void {
    this.reset();
    this.visibleChange.emit(false);
  }

  /**
   * Handles cancel button
   */
  onCancel(): void {
    this.reset();
    this.visibleChange.emit(false);
  }

  /**
   * Handles import button
   */
  onImport(): void {
    const validFiles = this.selectedFiles().filter(
      (file) => this.getFileValidation(file.name)?.success === true,
    );

    if (validFiles.length === 0) {
      return;
    }

    this.importing.set(true);

    setTimeout(() => {
      this.import.emit(validFiles);
      this.importing.set(false);
      this.reset();
      this.visibleChange.emit(false);
    }, 1000);
  }

  /**
   * Resets component state
   */
  private reset(): void {
    this.selectedFiles.set([]);
    this.fileValidations.set(new Map());
    this.validationComplete.set(false);
    this.validFilesCount.set(0);
    this.invalidFilesCount.set(0);
  }
}
