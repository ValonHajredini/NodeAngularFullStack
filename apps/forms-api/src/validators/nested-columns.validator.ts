/**
 * Nested Columns Validator
 * Validation functions for variable column widths and sub-column configurations
 * Epic 27: Nested Column Layout System
 */

import { SubColumnConfig } from '@nodeangularfullstack/shared';

/**
 * Validation result interface with success flag and optional error message
 */
export interface ValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  /** Optional error message describing the validation failure */
  error?: string;
}

/**
 * Validates fractional unit syntax for column/sub-column widths.
 * Ensures all width values match the pattern: positive integer followed by "fr" (e.g., "1fr", "2fr", "10fr")
 *
 * @param widths - Array of fractional unit strings (e.g., ["1fr", "2fr"])
 * @returns Validation result with success flag and error message
 *
 * @example
 * validateFractionalUnits(["1fr", "3fr"]) // { valid: true }
 * validateFractionalUnits(["1px", "2fr"]) // { valid: false, error: "Invalid unit '1px' at index 0. Expected format: '1fr', '2fr', etc." }
 * validateFractionalUnits(["-1fr", "2fr"]) // { valid: false, error: "Invalid unit '-1fr' at index 0. Expected format: '1fr', '2fr', etc." }
 */
export function validateFractionalUnits(widths: string[]): ValidationResult {
  // Check for empty array
  if (!widths || widths.length === 0) {
    return {
      valid: false,
      error: 'Width array cannot be empty',
    };
  }

  // Regex pattern: 1 or more digits followed by "fr"
  const frPattern = /^\d+fr$/;

  // Validate each width value
  for (let i = 0; i < widths.length; i++) {
    const width = widths[i];

    // Check for undefined or null
    if (width === undefined || width === null) {
      return {
        valid: false,
        error: `Width value at index ${i} is undefined or null`,
      };
    }

    // Trim whitespace and check syntax
    const trimmedWidth = width.trim();

    if (!frPattern.test(trimmedWidth)) {
      return {
        valid: false,
        error: `Invalid unit '${width}' at index ${i}. Expected format: '1fr', '2fr', etc.`,
      };
    }

    // Additional check: ensure no leading zeros (e.g., "01fr" should be invalid)
    const numericPart = trimmedWidth.replace('fr', '');
    if (numericPart.length > 1 && numericPart.startsWith('0')) {
      return {
        valid: false,
        error: `Invalid unit '${width}' at index ${i}. Leading zeros not allowed.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validates sub-column configuration consistency.
 * Ensures column index is valid, sub-column count matches array length, and widths (if provided) are valid.
 *
 * @param config - Sub-column configuration object
 * @param parentColumnCount - Number of columns in the parent row (to validate columnIndex)
 * @returns Validation result with success flag and error message
 *
 * @example
 * // Valid configuration
 * validateSubColumnStructure({
 *   columnIndex: 0,
 *   subColumnCount: 2,
 *   subColumnWidths: ["1fr", "2fr"]
 * }, 2) // { valid: true }
 *
 * // Invalid: columnIndex out of bounds
 * validateSubColumnStructure({
 *   columnIndex: 5,
 *   subColumnCount: 2
 * }, 2) // { valid: false, error: "columnIndex 5 exceeds parent row column count 2" }
 *
 * // Invalid: subColumnWidths length mismatch
 * validateSubColumnStructure({
 *   columnIndex: 0,
 *   subColumnCount: 3,
 *   subColumnWidths: ["1fr", "2fr"]
 * }, 2) // { valid: false, error: "subColumnWidths array length (2) does not match subColumnCount (3)" }
 */
export function validateSubColumnStructure(
  config: SubColumnConfig,
  parentColumnCount: number
): ValidationResult {
  // Validate required properties exist
  if (config.columnIndex === undefined || config.columnIndex === null) {
    return {
      valid: false,
      error: 'columnIndex is required in sub-column configuration',
    };
  }

  if (config.subColumnCount === undefined || config.subColumnCount === null) {
    return {
      valid: false,
      error: 'subColumnCount is required in sub-column configuration',
    };
  }

  // Validate columnIndex is within parent row bounds
  if (config.columnIndex < 0) {
    return {
      valid: false,
      error: `columnIndex cannot be negative (got ${config.columnIndex})`,
    };
  }

  if (config.columnIndex >= parentColumnCount) {
    return {
      valid: false,
      error: `columnIndex ${config.columnIndex} exceeds parent row column count ${parentColumnCount}`,
    };
  }

  // Validate subColumnCount is valid (1-4)
  const validCounts = [1, 2, 3, 4];
  if (!validCounts.includes(config.subColumnCount)) {
    return {
      valid: false,
      error: `subColumnCount must be 1, 2, 3, or 4 (got ${config.subColumnCount})`,
    };
  }

  // Validate subColumnWidths if provided
  if (config.subColumnWidths !== undefined && config.subColumnWidths !== null) {
    // Check array length matches subColumnCount
    if (config.subColumnWidths.length !== config.subColumnCount) {
      return {
        valid: false,
        error: `subColumnWidths array length (${config.subColumnWidths.length}) does not match subColumnCount (${config.subColumnCount})`,
      };
    }

    // Validate fractional unit syntax
    const widthValidation = validateFractionalUnits(config.subColumnWidths);
    if (!widthValidation.valid) {
      return {
        valid: false,
        error: `Invalid subColumnWidths: ${widthValidation.error}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validates column widths array for a row configuration.
 * Ensures widths array length matches column count and all values are valid fractional units.
 *
 * @param widths - Array of fractional unit strings
 * @param columnCount - Expected number of columns
 * @returns Validation result with success flag and error message
 *
 * @example
 * validateColumnWidths(["1fr", "3fr"], 2) // { valid: true }
 * validateColumnWidths(["1fr"], 2) // { valid: false, error: "..." }
 */
export function validateColumnWidths(
  widths: string[],
  columnCount: number
): ValidationResult {
  // Validate array length matches column count
  if (widths.length !== columnCount) {
    return {
      valid: false,
      error: `Column widths array length (${widths.length}) must match columnCount (${columnCount})`,
    };
  }

  // Validate fractional unit syntax
  return validateFractionalUnits(widths);
}
