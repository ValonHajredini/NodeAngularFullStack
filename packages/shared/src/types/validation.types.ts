/**
 * Validation types for pre-flight checks
 * Epic 33.1: Export Core Infrastructure
 */

/**
 * Validation result from pre-flight checks
 */
export interface ValidationResult {
  /** Overall validation success (true if no errors) */
  success: boolean;

  /** List of validation errors (block export) */
  errors: ValidationError[];

  /** List of validation warnings (allow export with notice) */
  warnings: ValidationWarning[];

  /** Informational messages about validation checks */
  info: string[];

  /** Timestamp when validation was performed */
  timestamp: Date;

  /** Estimated export duration in milliseconds (optional) */
  estimatedDurationMs?: number;
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Human-readable error message */
  message: string;

  /** Field or check that failed (e.g., 'disk_space', 'form_schema') */
  field: string;

  /** Error severity level */
  severity?: ValidationSeverity;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Human-readable warning message */
  message: string;

  /** Field or check that triggered warning */
  field: string;
}

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error', // Blocks export
  WARNING = 'warning', // Allows export but shows notice
  INFO = 'info', // Informational only
}

/**
 * Validation step interface
 * Each validation step implements this interface
 */
export interface ValidationStep {
  /** Step name for identification */
  name: string;

  /** Severity level of this step */
  severity: ValidationSeverity;

  /** Execute the validation step */
  validate(): Promise<void>;
}
