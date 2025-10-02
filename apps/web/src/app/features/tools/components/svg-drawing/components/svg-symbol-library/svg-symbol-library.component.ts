import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SvgSymbolLibraryService, SVGSymbol } from '../../services/svg-symbol-library.service';

/**
 * Component for displaying and managing the SVG symbol library.
 */
@Component({
  selector: 'app-svg-symbol-library',
  standalone: true,
  imports: [CommonModule, ButtonDirective],
  template: `
    <div class="svg-symbol-library-panel p-4">
      <!-- Header -->
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Symbol Library</h3>
        <p class="text-sm text-gray-600">
          Click a symbol to select it for placement on the canvas.
        </p>
      </div>

      <!-- Empty State -->
      @if (symbolLibrary.symbols().length === 0) {
        <div class="text-center py-8">
          <i class="pi pi-inbox text-4xl text-gray-300 mb-3 block"></i>
          <p class="text-gray-500 mb-2">No symbols in library</p>
          <p class="text-sm text-gray-400">Import SVG files to add symbols</p>
        </div>
      }

      <!-- Symbols Grid -->
      @if (symbolLibrary.symbols().length > 0) {
        <div class="mb-4">
          <div class="grid grid-cols-2 gap-3">
            @for (symbol of symbolLibrary.symbols(); track symbol.id) {
              <div
                class="symbol-card border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md"
                [class.border-blue-500]="symbolLibrary.selectedSymbolId() === symbol.id"
                [class.bg-blue-50]="symbolLibrary.selectedSymbolId() === symbol.id"
                [class.border-gray-200]="symbolLibrary.selectedSymbolId() !== symbol.id"
                (click)="onSelectSymbol(symbol)"
              >
                <!-- Preview -->
                <div
                  class="symbol-preview bg-white rounded border border-gray-200 p-2 mb-2 flex items-center justify-center h-24"
                >
                  <div [innerHTML]="getSymbolPreview(symbol)" class="max-w-full max-h-full"></div>
                </div>

                <!-- Info -->
                <div class="symbol-info">
                  <p class="text-sm font-semibold text-gray-800 truncate" [title]="symbol.name">
                    {{ symbol.name }}
                  </p>
                  <p class="text-xs text-gray-500">{{ symbol.width }}×{{ symbol.height }}</p>
                </div>

                <!-- Actions -->
                <div class="symbol-actions flex gap-1 mt-2">
                  <button
                    pButton
                    type="button"
                    icon="pi pi-pencil"
                    severity="secondary"
                    size="small"
                    [text]="true"
                    [rounded]="true"
                    (click)="onRenameSymbol($event, symbol)"
                    pTooltip="Rename"
                    tooltipPosition="top"
                  ></button>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-trash"
                    severity="danger"
                    size="small"
                    [text]="true"
                    [rounded]="true"
                    (click)="onDeleteSymbol($event, symbol)"
                    pTooltip="Delete"
                    tooltipPosition="top"
                  ></button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            pButton
            type="button"
            label="Clear Library"
            icon="pi pi-trash"
            severity="danger"
            [outlined]="true"
            (click)="onClearLibrary()"
            class="flex-1"
            size="small"
          ></button>
        </div>
      }

      <!-- Selected Symbol Info -->
      @if (symbolLibrary.selectedSymbolId()) {
        <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div class="flex items-center gap-2">
            <i class="pi pi-check-circle text-blue-600"></i>
            <div>
              <p class="text-sm font-semibold text-blue-900">
                {{ getSelectedSymbol()?.name }} selected
              </p>
              <p class="text-xs text-blue-700">Click on canvas to place this symbol</p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .symbol-card {
        position: relative;
      }

      .symbol-preview {
        min-height: 96px;
      }

      .symbol-preview :deep(svg) {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
      }

      .symbol-actions {
        opacity: 0;
        transition: opacity 0.2s;
      }

      .symbol-card:hover .symbol-actions {
        opacity: 1;
      }
    `,
  ],
})
export class SvgSymbolLibraryComponent {
  readonly symbolLibrary = inject(SvgSymbolLibraryService);
  private readonly messageService = inject(MessageService);
  private readonly sanitizer = inject(DomSanitizer);

  /**
   * Gets the currently selected symbol.
   */
  getSelectedSymbol(): SVGSymbol | null {
    return this.symbolLibrary.getSelectedSymbol();
  }

  /**
   * Handles symbol selection.
   */
  onSelectSymbol(symbol: SVGSymbol): void {
    const currentSelection = this.symbolLibrary.selectedSymbolId();

    if (currentSelection === symbol.id) {
      // Deselect if already selected
      this.symbolLibrary.selectSymbol(null);
    } else {
      // Select symbol
      this.symbolLibrary.selectSymbol(symbol.id);
      this.messageService.add({
        severity: 'info',
        summary: 'Symbol Selected',
        detail: `"${symbol.name}" is ready to place. Click on the canvas to add it.`,
        life: 3000,
      });
    }
  }

  /**
   * Handles symbol rename.
   */
  onRenameSymbol(event: Event, symbol: SVGSymbol): void {
    event.stopPropagation();

    const newName = prompt('Enter new name:', symbol.name);
    if (newName && newName.trim() !== symbol.name) {
      this.symbolLibrary.renameSymbol(symbol.id, newName.trim());
      this.messageService.add({
        severity: 'success',
        summary: 'Symbol Renamed',
        detail: `Symbol renamed to "${newName.trim()}"`,
      });
    }
  }

  /**
   * Handles symbol deletion.
   */
  onDeleteSymbol(event: Event, symbol: SVGSymbol): void {
    event.stopPropagation();

    const confirmed = confirm(`Are you sure you want to delete "${symbol.name}"?`);
    if (confirmed) {
      this.symbolLibrary.removeSymbol(symbol.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Symbol Deleted',
        detail: `"${symbol.name}" has been removed from the library`,
      });
    }
  }

  /**
   * Handles library clear.
   */
  onClearLibrary(): void {
    const confirmed = confirm(
      'Are you sure you want to delete all symbols from the library? This cannot be undone.',
    );

    if (confirmed) {
      this.symbolLibrary.clearLibrary();
      this.messageService.add({
        severity: 'success',
        summary: 'Library Cleared',
        detail: 'All symbols have been removed from the library',
      });
    }
  }

  /**
   * Gets sanitized SVG preview for a symbol.
   */
  getSymbolPreview(symbol: SVGSymbol): SafeHtml {
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbol.viewBox}" width="80" height="80">
        ${symbol.content}
      </svg>
    `;

    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  }
}
