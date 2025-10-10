import { Injectable } from '@angular/core';

/**
 * Manages accordion panel expand/collapse state persistence in localStorage.
 * Stores state per field type to remember user preferences across sessions.
 */
@Injectable({ providedIn: 'root' })
export class AccordionStateService {
  private readonly STORAGE_KEY_PREFIX = 'field_properties_accordion_';

  /**
   * Saves the active panel indices for a specific field type.
   * @param fieldType - The field type (e.g., 'text', 'email', 'heading')
   * @param activeIndex - Array of active panel indices (e.g., [0, 2] = panels 0 and 2 expanded)
   * @example
   * accordionStateService.saveAccordionState('text', [0, 1]);
   */
  saveAccordionState(fieldType: string, activeIndex: number | number[]): void {
    const key = this.getStorageKey(fieldType);
    const value = Array.isArray(activeIndex) ? activeIndex : [activeIndex];
    localStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * Loads the stored accordion state for a specific field type.
   * @param fieldType - The field type (e.g., 'text', 'email', 'heading')
   * @returns Array of active panel indices, or [0] (Basic Properties expanded) if no state exists
   * @example
   * const state = accordionStateService.loadAccordionState('text'); // Returns [0, 1] or [0]
   */
  loadAccordionState(fieldType: string): number[] {
    const key = this.getStorageKey(fieldType);
    const stored = localStorage.getItem(key);

    if (!stored) {
      return [0]; // Default: Basic Properties panel expanded
    }

    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [0];
    } catch {
      return [0];
    }
  }

  /**
   * Clears all stored accordion states from localStorage.
   */
  clearAllStates(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  /**
   * Gets the localStorage key for a specific field type.
   * @param fieldType - The field type
   * @returns The storage key string
   */
  private getStorageKey(fieldType: string): string {
    return `${this.STORAGE_KEY_PREFIX}${fieldType}`;
  }
}
