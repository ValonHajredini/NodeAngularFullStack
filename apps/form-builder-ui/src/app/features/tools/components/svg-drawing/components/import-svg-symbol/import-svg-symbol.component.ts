import { Component, signal, inject, computed } from '@angular/core';
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
    <div class="import-svg-symbol-panel">
      <!-- Collapsible Header - Single Line -->
      <div
        class="upload-header mb-3 flex items-center justify-between gap-2 p-2 bg-gray-50 border border-gray-200 rounded cursor-pointer hover:bg-gray-100 transition-colors"
        (click)="toggleExpanded()"
      >
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <i
            class="pi"
            [class.pi-chevron-down]="isExpanded()"
            [class.pi-chevron-right]="!isExpanded()"
            class="text-xs text-gray-600"
          ></i>
          <span class="text-xs font-semibold text-gray-700">{{ uploadStatusText() }}</span>
        </div>
        <span class="text-[10px] text-gray-500 whitespace-nowrap">Max 2MB</span>
      </div>

      <!-- Expanded Content -->
      @if (isExpanded()) {
        <div class="upload-content">
          <!-- File Upload Button -->
          <div class="mb-2">
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
          </div>

          <!-- Symbol Name & Preview -->
          @if (selectedFile()) {
            <div class="mb-2">
              <input
                id="symbolName"
                type="text"
                pInputText
                [(ngModel)]="symbolName"
                placeholder="Symbol name"
                class="w-full text-sm py-1"
              />
            </div>

            <!-- Compact Preview -->
            @if (preview()) {
              <div class="mb-2 p-1.5 bg-gray-50 border border-gray-200 rounded">
                <div class="flex gap-1.5 items-center">
                  <div class="bg-white rounded border p-0.5 flex-shrink-0">
                    <div [innerHTML]="getSVGPreview()" class="w-12 h-12"></div>
                  </div>
                  <div class="text-[10px] text-gray-600 flex-1 leading-tight">
                    <div>{{ preview()!.width }}×{{ preview()!.height }}px</div>
                    <div class="text-gray-500 text-[9px] truncate">{{ preview()!.viewBox }}</div>
                  </div>
                </div>
              </div>
            }

            <!-- Import Button -->
            <div class="flex gap-1.5">
              <button
                pButton
                type="button"
                [label]="isImporting() ? 'Adding...' : 'Add'"
                icon="pi pi-plus"
                severity="success"
                size="small"
                (click)="onImport()"
                [disabled]="!canImport() || isImporting()"
                class="flex-1 !py-1 !text-xs"
              ></button>
              <button
                pButton
                type="button"
                icon="pi pi-times"
                severity="secondary"
                size="small"
                (click)="onClear()"
                [disabled]="isImporting()"
                [outlined]="true"
                class="!py-1"
              ></button>
            </div>
          }

          <!-- Error -->
          @if (selectedFile() && !preview()) {
            <div class="mt-1.5 p-1.5 bg-red-50 border border-red-200 rounded">
              <p class="text-[10px] text-red-800">
                <i class="pi pi-times-circle mr-1 text-xs"></i>Invalid SVG
              </p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .upload-button {
        flex: 1;
      }

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

  /** Expanded state for collapsible section */
  isExpanded = signal<boolean>(false);

  /** Upload status text */
  uploadStatusText = computed(() => {
    if (this.selectedFile()) {
      return this.selectedFile()!.name;
    }
    return 'Upload SVG Symbol';
  });

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

      // Auto-expand when file is selected
      this.isExpanded.set(true);

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
   * Toggles the expanded state.
   */
  toggleExpanded(): void {
    this.isExpanded.set(!this.isExpanded());
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
