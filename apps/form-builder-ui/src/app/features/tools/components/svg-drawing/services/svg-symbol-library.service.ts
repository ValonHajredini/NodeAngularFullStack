import { Injectable, signal } from '@angular/core';
import { ParsedSVG } from '../utils/svg-parser.util';

/**
 * Interface for a stored SVG symbol in the library.
 */
export interface SVGSymbol {
  /** Unique identifier for the symbol */
  id: string;
  /** Display name of the symbol */
  name: string;
  /** Parsed SVG content */
  content: string;
  /** Original viewBox string */
  viewBox: string;
  /** Width from viewBox */
  width: number;
  /** Height from viewBox */
  height: number;
  /** Whether the symbol has fills */
  hasFills: boolean;
  /** Whether the symbol has strokes */
  hasStrokes: boolean;
  /** Thumbnail/preview data URL */
  thumbnail?: string;
  /** When the symbol was added */
  createdAt: Date;
}

/**
 * Service for managing SVG symbol library.
 * Handles importing, storing, and retrieving SVG symbols.
 */
@Injectable({
  providedIn: 'root',
})
export class SvgSymbolLibraryService {
  private readonly STORAGE_KEY = 'svg-symbol-library';

  // Reactive state
  private readonly _symbols = signal<SVGSymbol[]>([]);
  private readonly _selectedSymbolId = signal<string | null>(null);

  // Public readonly signals
  readonly symbols = this._symbols.asReadonly();
  readonly selectedSymbolId = this._selectedSymbolId.asReadonly();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Adds a new symbol to the library.
   * @param name - Display name for the symbol
   * @param parsedSVG - Parsed SVG data
   * @returns The created symbol
   */
  addSymbol(name: string, parsedSVG: ParsedSVG): SVGSymbol {
    const symbol: SVGSymbol = {
      id: this.generateId(),
      name,
      content: parsedSVG.content,
      viewBox: parsedSVG.viewBox,
      width: parsedSVG.width,
      height: parsedSVG.height,
      hasFills: parsedSVG.hasFills,
      hasStrokes: parsedSVG.hasStrokes,
      createdAt: new Date(),
    };

    this._symbols.update((symbols) => [...symbols, symbol]);
    this.saveToStorage();

    return symbol;
  }

  /**
   * Removes a symbol from the library.
   * @param symbolId - ID of the symbol to remove
   */
  removeSymbol(symbolId: string): void {
    this._symbols.update((symbols) => symbols.filter((s) => s.id !== symbolId));

    if (this._selectedSymbolId() === symbolId) {
      this._selectedSymbolId.set(null);
    }

    this.saveToStorage();
  }

  /**
   * Selects a symbol from the library.
   * @param symbolId - ID of the symbol to select
   */
  selectSymbol(symbolId: string | null): void {
    this._selectedSymbolId.set(symbolId);
  }

  /**
   * Gets a symbol by ID.
   * @param symbolId - ID of the symbol to retrieve
   * @returns The symbol or undefined
   */
  getSymbol(symbolId: string): SVGSymbol | undefined {
    return this._symbols().find((s) => s.id === symbolId);
  }

  /**
   * Gets the currently selected symbol.
   * @returns The selected symbol or null
   */
  getSelectedSymbol(): SVGSymbol | null {
    const id = this._selectedSymbolId();
    return id ? this.getSymbol(id) || null : null;
  }

  /**
   * Updates a symbol's name.
   * @param symbolId - ID of the symbol to update
   * @param newName - New name for the symbol
   */
  renameSymbol(symbolId: string, newName: string): void {
    this._symbols.update((symbols) =>
      symbols.map((s) => (s.id === symbolId ? { ...s, name: newName } : s)),
    );

    this.saveToStorage();
  }

  /**
   * Clears all symbols from the library.
   */
  clearLibrary(): void {
    this._symbols.set([]);
    this._selectedSymbolId.set(null);
    this.saveToStorage();
  }

  /**
   * Generates a thumbnail for a symbol.
   * @param symbol - Symbol to generate thumbnail for
   * @returns Promise resolving to data URL
   */
  async generateThumbnail(symbol: SVGSymbol): Promise<string> {
    // Create SVG string
    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbol.viewBox}" width="100" height="100">
        ${symbol.content}
      </svg>
    `;

    // Convert to data URL
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    return URL.createObjectURL(blob);
  }

  /**
   * Generates a unique ID for a symbol.
   * @returns Unique identifier
   */
  private generateId(): string {
    return `symbol-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Saves symbols to localStorage.
   */
  private saveToStorage(): void {
    try {
      const data = {
        symbols: this._symbols(),
        version: '1.0',
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save symbol library to localStorage:', error);
    }
  }

  /**
   * Loads symbols from localStorage.
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);

      if (stored) {
        const data = JSON.parse(stored);

        // Restore dates from JSON strings
        const symbols = data.symbols.map((s: SVGSymbol) => ({
          ...s,
          createdAt: new Date(s.createdAt),
        }));

        this._symbols.set(symbols);
      }
    } catch (error) {
      console.error('Failed to load symbol library from localStorage:', error);
    }
  }
}
