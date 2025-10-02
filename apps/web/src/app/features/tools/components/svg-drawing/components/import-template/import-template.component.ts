import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { FileUpload } from 'primeng/fileupload';

/**
 * Component for importing drawing templates from JSON files.
 * Provides file upload functionality with drag & drop support.
 */
@Component({
  selector: 'app-import-template',
  standalone: true,
  imports: [CommonModule, ButtonDirective, FileUpload],
  template: `
    <div class="import-template-panel p-4">
      <!-- Header -->
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Import Template</h3>
        <p class="text-sm text-gray-600">
          Load a previously saved drawing template from a JSON file.
        </p>
      </div>

      <!-- Warning -->
      <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <div class="flex gap-2">
          <i class="pi pi-exclamation-triangle text-yellow-600"></i>
          <p class="text-sm text-yellow-800">
            Importing a template will replace your current drawing. Make sure to save your work
            first.
          </p>
        </div>
      </div>

      <!-- File Upload -->
      <div class="mb-4">
        <p-fileUpload
          #fileUpload
          mode="basic"
          chooseLabel="Choose JSON File"
          accept=".json"
          [maxFileSize]="5242880"
          [auto]="false"
          (onSelect)="onFileSelect($event)"
          [showUploadButton]="false"
          [showCancelButton]="false"
          chooseIcon="pi pi-upload"
          class="w-full"
        ></p-fileUpload>
      </div>

      <!-- Template Info (shown after file selection) -->
      @if (selectedFile()) {
        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div class="flex flex-col gap-2">
            <div class="flex justify-between items-center">
              <span class="text-sm font-semibold text-blue-900">Selected File:</span>
              <span class="text-sm text-blue-700">{{ selectedFile()?.name }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm font-semibold text-blue-900">Size:</span>
              <span class="text-sm text-blue-700">{{
                formatFileSize(selectedFile()?.size || 0)
              }}</span>
            </div>
          </div>
        </div>
      }

      <!-- Import Button -->
      <div class="flex gap-2">
        <button
          pButton
          type="button"
          [label]="isImporting() ? 'Importing...' : 'Import Template'"
          icon="pi pi-file-import"
          severity="success"
          (click)="onImport()"
          [disabled]="!selectedFile() || isImporting()"
          class="flex-1"
        ></button>
        @if (selectedFile()) {
          <button
            pButton
            type="button"
            label="Clear"
            icon="pi pi-times"
            severity="secondary"
            (click)="onClear()"
            [disabled]="isImporting()"
            class="flex-1"
            [outlined]="true"
          ></button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .import-template-panel {
        max-width: 500px;
      }

      :host ::ng-deep .p-fileupload-choose {
        width: 100%;
      }

      :host ::ng-deep .p-button-label {
        flex: 1;
      }
    `,
  ],
})
export class ImportTemplateComponent {
  /** Event emitted when import is confirmed */
  @Output() import = new EventEmitter<File>();

  /** Selected file */
  selectedFile = signal<File | null>(null);

  /** Loading state during import */
  isImporting = signal<boolean>(false);

  /**
   * Handles file selection event.
   * @param event - File upload event
   */
  onFileSelect(event: { files: File[] }): void {
    if (event.files && event.files.length > 0) {
      const file = event.files[0];

      // Validate file type
      if (!file.name.toLowerCase().endsWith('.json')) {
        alert('Please select a valid JSON file');
        return;
      }

      this.selectedFile.set(file);
    }
  }

  /**
   * Handles import button click.
   */
  onImport(): void {
    const file = this.selectedFile();
    if (!file) return;

    // Confirm before importing
    const confirmed = confirm(
      'Are you sure you want to import this template? Your current drawing will be replaced.',
    );

    if (!confirmed) return;

    this.isImporting.set(true);

    // Emit import event with file
    this.import.emit(file);

    // Reset state after a short delay
    setTimeout(() => {
      this.isImporting.set(false);
      this.selectedFile.set(null);
    }, 1000);
  }

  /**
   * Clears the selected file.
   */
  onClear(): void {
    this.selectedFile.set(null);
  }

  /**
   * Formats file size for display.
   * @param bytes - File size in bytes
   * @returns Formatted string (e.g., "1.5 MB")
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  }
}
