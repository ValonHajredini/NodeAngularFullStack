import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { FileUpload } from 'primeng/fileupload';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { SvgSymbolLibraryService } from '../../services/svg-symbol-library.service';
import { parseSVG, validateSVGFile } from '../../utils/svg-parser.util';

/**
 * Component for importing SVG files as symbols into the library.
 */
@Component({
  selector: 'app-import-svg-symbol',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonDirective, FileUpload, InputText],
  template: `
    <div class="import-svg-symbol-panel p-4">
      <!-- Header -->
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Import SVG Symbol</h3>
        <p class="text-sm text-gray-600">
          Import an SVG file to use as a placeable symbol. You can resize and change colors after
          import.
        </p>
      </div>

      <!-- File Upload -->
      <div class="mb-4">
        <p-fileUpload
          #fileUpload
          mode="basic"
          chooseLabel="Choose SVG File"
          accept=".svg,image/svg+xml"
          [maxFileSize]="2097152"
          [auto]="false"
          (onSelect)="onFileSelect($event)"
          [showUploadButton]="false"
          [showCancelButton]="false"
          chooseIcon="pi pi-upload"
          class="w-full"
        ></p-fileUpload>
        <p class="text-xs text-gray-500 mt-2">Maximum file size: 2MB</p>
      </div>

      <!-- Symbol Name -->
      @if (selectedFile()) {
        <div class="mb-4">
          <label for="symbolName" class="block text-sm font-semibold text-gray-700 mb-2">
            Symbol Name
          </label>
          <input
            id="symbolName"
            type="text"
            pInputText
            [(ngModel)]="symbolName"
            placeholder="Enter a name for this symbol"
            class="w-full"
          />
        </div>

        <!-- Preview -->
        @if (preview()) {
          <div class="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <h4 class="text-sm font-semibold text-gray-700 mb-2">Preview</h4>
            <div class="flex justify-center items-center bg-white p-4 rounded border">
              <div [innerHTML]="getSVGPreview()" class="max-w-[200px] max-h-[200px]"></div>
            </div>
            <div class="mt-2 text-xs text-gray-600">
              <div>Size: {{ preview()!.width }}px × {{ preview()!.height }}px</div>
              <div>ViewBox: {{ preview()!.viewBox }}</div>
            </div>
          </div>
        }

        <!-- Import Button -->
        <div class="flex gap-2">
          <button
            pButton
            type="button"
            [label]="isImporting() ? 'Importing...' : 'Add to Library'"
            icon="pi pi-plus"
            severity="success"
            (click)="onImport()"
            [disabled]="!canImport() || isImporting()"
            class="flex-1"
          ></button>
          <button
            pButton
            type="button"
            label="Cancel"
            icon="pi pi-times"
            severity="secondary"
            (click)="onClear()"
            [disabled]="isImporting()"
            [outlined]="true"
          ></button>
        </div>
      }

      <!-- Info Messages -->
      @if (selectedFile() && !preview()) {
        <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div class="flex gap-2">
            <i class="pi pi-times-circle text-red-600"></i>
            <p class="text-sm text-red-800">Invalid SVG file. Please select a valid SVG.</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host ::ng-deep .p-fileupload-choose {
        width: 100%;
      }

      :host ::ng-deep svg {
        max-width: 100%;
        max-height: 100%;
      }
    `,
  ],
})
export class ImportSvgSymbolComponent {
  private readonly symbolLibrary = inject(SvgSymbolLibraryService);
  private readonly messageService = inject(MessageService);

  /** Selected file */
  selectedFile = signal<File | null>(null);

  /** Symbol name */
  symbolName = '';

  /** Preview of parsed SVG */
  preview = signal<{ content: string; viewBox: string; width: number; height: number } | null>(
    null,
  );

  /** Loading state during import */
  isImporting = signal<boolean>(false);

  /**
   * Whether import is possible.
   */
  canImport = (): boolean => {
    return !!this.selectedFile() && !!this.preview() && this.symbolName.trim().length > 0;
  };

  /**
   * Handles file selection event.
   * @param event - File upload event
   */
  async onFileSelect(event: { files: File[] }): Promise<void> {
    if (event.files && event.files.length > 0) {
      const file = event.files[0];

      // Validate file
      const isValid = await validateSVGFile(file);
      if (!isValid) {
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid File',
          detail: 'Please select a valid SVG file',
        });
        return;
      }

      this.selectedFile.set(file);

      // Set default name from filename
      this.symbolName = file.name.replace(/\.svg$/i, '');

      // Parse and preview
      try {
        const content = await file.text();
        const parsed = parseSVG(content);

        this.preview.set({
          content: parsed.content,
          viewBox: parsed.viewBox,
          width: parsed.width,
          height: parsed.height,
        });
      } catch (error) {
        console.error('Failed to parse SVG:', error);
        this.preview.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Parse Error',
          detail: 'Failed to parse SVG file',
        });
      }
    }
  }

  /**
   * Handles import button click.
   */
  async onImport(): Promise<void> {
    const file = this.selectedFile();
    const previewData = this.preview();

    if (!file || !previewData || !this.symbolName.trim()) {
      return;
    }

    this.isImporting.set(true);

    try {
      const content = await file.text();
      const parsed = parseSVG(content);

      // Add to library
      this.symbolLibrary.addSymbol(this.symbolName.trim(), parsed);

      this.messageService.add({
        severity: 'success',
        summary: 'Symbol Added',
        detail: `"${this.symbolName.trim()}" has been added to your symbol library`,
      });

      // Reset state
      this.onClear();
    } catch (error) {
      console.error('Failed to import symbol:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Import Failed',
        detail: 'Failed to import SVG symbol',
      });
    } finally {
      this.isImporting.set(false);
    }
  }

  /**
   * Clears the selected file and resets state.
   */
  onClear(): void {
    this.selectedFile.set(null);
    this.preview.set(null);
    this.symbolName = '';
  }

  /**
   * Gets SVG preview HTML.
   */
  getSVGPreview(): string {
    const previewData = this.preview();
    if (!previewData) return '';

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${previewData.viewBox}">
        ${previewData.content}
      </svg>
    `;
  }
}
