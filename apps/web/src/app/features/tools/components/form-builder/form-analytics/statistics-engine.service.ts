import { Injectable } from '@angular/core';
import {
  NumericStatistics,
  ChoiceDistribution,
  TimeSeriesData,
  FormFieldOption,
} from '@nodeangularfullstack/shared';

/**
 * Statistics engine service for calculating field-specific analytics.
 * Provides pure calculation methods for numeric, choice, and time series data.
 */
@Injectable({ providedIn: 'root' })
export class StatisticsEngineService {
  /**
   * Calculates numeric field statistics (mean, median, min, max, stdDev).
   * Filters out null and NaN values before calculation.
   *
   * @param values - Array of numeric values from submission data
   * @returns Statistics object with mean, median, min, max, stdDev, count
   *
   * @example
   * const stats = service.calculateNumericStats([10, 20, 30, 40, 50]);
   * // Returns: { mean: 30, median: 30, min: 10, max: 50, stdDev: 14.14, count: 5 }
   */
  calculateNumericStats(values: number[]): NumericStatistics {
    const filteredValues = values.filter((v) => v != null && !isNaN(v));

    if (filteredValues.length === 0) {
      return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0, count: 0 };
    }

    const sorted = [...filteredValues].sort((a, b) => a - b);
    const sum = filteredValues.reduce((acc, val) => acc + val, 0);
    const mean = sum / filteredValues.length;
    const median = this.calculateMedian(sorted);
    const stdDev = this.calculateStdDev(filteredValues, mean);

    return {
      mean: Number(mean.toFixed(2)),
      median: Number(median.toFixed(2)),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      stdDev: Number(stdDev.toFixed(2)),
      count: filteredValues.length,
    };
  }

  /**
   * Calculates option distribution for choice fields (select, radio, checkbox).
   * Initializes all options with 0 count and calculates percentages.
   *
   * @param values - Array of selected values from submissions
   * @param options - Available options from field schema
   * @returns Distribution array with counts and percentages
   *
   * @example
   * const dist = service.calculateChoiceDistribution(
   *   ['option1', 'option2', 'option1'],
   *   [{ label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' }]
   * );
   * // Returns: [{ label: 'Option 1', value: 'option1', count: 2, percentage: 66.67 }, ...]
   */
  calculateChoiceDistribution(
    values: (string | number | string[])[],
    options: FormFieldOption[],
  ): ChoiceDistribution[] {
    const counts = new Map<string | number, number>();

    // Initialize all options with 0 count
    options.forEach((opt) => counts.set(opt.value, 0));

    // Count occurrences (handle both single values and arrays for checkboxes)
    values.forEach((val) => {
      if (val != null) {
        if (Array.isArray(val)) {
          // Handle checkbox fields with multiple selections
          val.forEach((v) => {
            if (v != null) {
              counts.set(v, (counts.get(v) ?? 0) + 1);
            }
          });
        } else {
          counts.set(val, (counts.get(val) ?? 0) + 1);
        }
      }
    });

    // Calculate total for percentages (for checkboxes, each selection counts)
    const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);

    // Build distribution array
    return options.map((opt) => ({
      label: opt.label,
      value: opt.value,
      count: counts.get(opt.value) || 0,
      percentage: total > 0 ? Number((((counts.get(opt.value) || 0) / total) * 100).toFixed(1)) : 0,
    }));
  }

  /**
   * Generates time series data from date submissions.
   * Groups submissions by time interval and counts occurrences.
   *
   * @param dates - Array of submission dates
   * @param interval - Time interval: 'day' | 'week' | 'month'
   * @returns Time series data with counts per period
   *
   * @example
   * const series = service.generateTimeSeries([new Date('2025-01-01'), new Date('2025-01-01')], 'day');
   * // Returns: [{ label: '2025-01-01', count: 2 }]
   */
  generateTimeSeries(dates: Date[], interval: 'day' | 'week' | 'month' = 'day'): TimeSeriesData[] {
    const groupedData = new Map<string, number>();

    dates.forEach((date) => {
      if (date) {
        const key = this.formatDateByInterval(new Date(date), interval);
        groupedData.set(key, (groupedData.get(key) || 0) + 1);
      }
    });

    return Array.from(groupedData.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Calculates text field statistics (character count, word count).
   *
   * @param values - Array of text values from submission data
   * @returns Statistics about text length
   */
  calculateTextStats(values: string[]): { avgLength: number; maxLength: number; count: number } {
    const filteredValues = values.filter((v) => v != null && typeof v === 'string');

    if (filteredValues.length === 0) {
      return { avgLength: 0, maxLength: 0, count: 0 };
    }

    const lengths = filteredValues.map((v) => v.length);
    const totalLength = lengths.reduce((sum, len) => sum + len, 0);
    const avgLength = totalLength / filteredValues.length;
    const maxLength = Math.max(...lengths);

    return {
      avgLength: Number(avgLength.toFixed(1)),
      maxLength,
      count: filteredValues.length,
    };
  }

  /**
   * Calculates toggle/boolean field distribution.
   *
   * @param values - Array of boolean values from submission data
   * @returns Distribution of true/false values
   */
  calculateToggleDistribution(values: boolean[]): ChoiceDistribution[] {
    const trueCount = values.filter((v) => v === true).length;
    const falseCount = values.filter((v) => v === false).length;
    const total = trueCount + falseCount;

    return [
      {
        label: 'Yes',
        value: 'true',
        count: trueCount,
        percentage: total > 0 ? Number(((trueCount / total) * 100).toFixed(1)) : 0,
      },
      {
        label: 'No',
        value: 'false',
        count: falseCount,
        percentage: total > 0 ? Number(((falseCount / total) * 100).toFixed(1)) : 0,
      },
    ];
  }

  /**
   * Calculates median value from sorted array.
   *
   * @param sorted - Sorted array of numbers
   * @returns Median value
   */
  private calculateMedian(sorted: number[]): number {
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  /**
   * Calculates standard deviation.
   *
   * @param values - Array of numbers
   * @param mean - Pre-calculated mean value
   * @returns Standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    const variance =
      values.reduce((acc, val) => {
        return acc + Math.pow(val - mean, 2);
      }, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Formats date by interval for time series grouping.
   *
   * @param date - Date to format
   * @param interval - Time interval
   * @returns Formatted date string
   */
  private formatDateByInterval(date: Date, interval: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (interval) {
      case 'day':
        return `${year}-${month}-${day}`;
      case 'week':
        // Get week number
        const weekNum = this.getWeekNumber(date);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
      case 'month':
        return `${year}-${month}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * Gets ISO week number for a date.
   *
   * @param date - Date to get week number for
   * @returns Week number (1-53)
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
