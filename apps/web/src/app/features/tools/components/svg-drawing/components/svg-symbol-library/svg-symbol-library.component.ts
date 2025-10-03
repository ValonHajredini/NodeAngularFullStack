import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SvgSymbolLibraryService, SVGSymbol } from '../../services/svg-symbol-library.service';

/**
 * Component for displaying and managing the SVG symbol library.
 */
@Component({
  selector: 'app-svg-symbol-library',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonDirective, InputText],
  templateUrl: './svg-symbol-library.component.html',
  styleUrl: './svg-symbol-library.component.scss',
})
export class SvgSymbolLibraryComponent {
  readonly symbolLibrary = inject(SvgSymbolLibraryService);
  private readonly messageService = inject(MessageService);
  private readonly sanitizer = inject(DomSanitizer);

  /** Search filter term */
  searchTerm = signal<string>('');

  /** Filtered symbols based on search term */
  filteredSymbols = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const symbols = this.symbolLibrary.symbols();

    if (!term) {
      return symbols;
    }

    return symbols.filter((symbol) => symbol.name.toLowerCase().includes(term));
  });

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
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbol.viewBox}" width="36" height="36">
        ${symbol.content}
      </svg>
    `;

    return this.sanitizer.bypassSecurityTrustHtml(svgString);
  }
}
