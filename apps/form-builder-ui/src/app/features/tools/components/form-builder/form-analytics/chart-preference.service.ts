import { Injectable } from '@angular/core';
import { ChartType } from '@nodeangularfullstack/shared';

/**
 * Service for managing chart type preferences in analytics dashboard.
 * Stores user preferences in localStorage for persistence across sessions.
 */
@Injectable({ providedIn: 'root' })
export class ChartPreferenceService {
  private readonly STORAGE_PREFIX = 'analytics-chart-type';

  /**
   * Retrieves the stored chart type preference for a specific field.
   * @param formId - Form identifier
   * @param fieldId - Field identifier
   * @returns Stored chart type or null if no preference exists
   * @example
   * const chartType = service.getChartType('form-123', 'field-456');
   * // Returns: 'bar' | 'line' | 'pie' | etc., or null
   */
  getChartType(formId: string, fieldId: string): ChartType | null {
    try {
      const key = `${this.STORAGE_PREFIX}-${formId}-${fieldId}`;
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as ChartType) : null;
    } catch (error) {
      console.error('Failed to retrieve chart preference:', error);
      return null;
    }
  }

  /**
   * Stores a chart type preference for a specific field.
   * @param formId - Form identifier
   * @param fieldId - Field identifier
   * @param chartType - Chart type to store
   * @throws {Error} When localStorage quota is exceeded
   * @example
   * service.setChartType('form-123', 'field-456', 'bar');
   */
  setChartType(formId: string, fieldId: string, chartType: ChartType): void {
    try {
      const key = `${this.STORAGE_PREFIX}-${formId}-${fieldId}`;
      localStorage.setItem(key, JSON.stringify(chartType));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded. Unable to save chart preference.');
        throw new Error('Storage quota exceeded. Please clear some preferences.');
      }
      console.error('Failed to save chart preference:', error);
      throw error;
    }
  }

  /**
   * Clears all chart type preferences for a specific form.
   * @param formId - Form identifier
   * @example
   * service.clearChartTypes('form-123');
   * // Removes all chart preferences for form-123
   */
  clearChartTypes(formId: string): void {
    try {
      const keys = Object.keys(localStorage);
      keys
        .filter((key) => key.startsWith(`${this.STORAGE_PREFIX}-${formId}-`))
        .forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear chart preferences for form:', error);
    }
  }

  /**
   * Clears all chart type preferences for all forms.
   * @example
   * service.clearAllChartTypes();
   * // Removes all chart preferences from localStorage
   */
  clearAllChartTypes(): void {
    try {
      const keys = Object.keys(localStorage);
      keys
        .filter((key) => key.startsWith(this.STORAGE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear all chart preferences:', error);
    }
  }
}
