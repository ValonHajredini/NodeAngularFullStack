/**
 * Template Wizard Validators
 * Pure validator functions for category-specific wizard configurations.
 * Enforces business rules and data integrity for template creation.
 *
 * @since Epic 30, Story 30.9
 */

import { TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Array of validation error messages */
  errors: string[];
}

/**
 * Validates poll template configuration.
 * Enforces min/max option constraints and vote tracking method.
 *
 * @param config - Poll configuration data
 * @returns Validation result with errors if invalid
 *
 * @example
 * ```typescript
 * const result = validatePollConfig({
 *   minOptions: 2,
 *   maxOptions: 10,
 *   voteTracking: 'session'
 * });
 * if (!result.valid) {
 *   console.log(result.errors); // ["Max options must be greater than min options"]
 * }
 * ```
 */
export function validatePollConfig(config: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  // Validate min/max options
  const minOptions = config.minOptions as number | undefined;
  const maxOptions = config.maxOptions as number | undefined;
  const MIN_OPTIONS = 2;
  const MAX_ALLOWED_OPTIONS = 20;

  if (typeof minOptions !== 'number' || minOptions < MIN_OPTIONS) {
    errors.push('Minimum options must be at least 2');
  }

  if (typeof maxOptions !== 'number' || maxOptions < MIN_OPTIONS) {
    errors.push('Maximum options must be at least 2');
  }

  if (typeof minOptions === 'number' && typeof maxOptions === 'number' && minOptions > maxOptions) {
    errors.push('Maximum options must be greater than or equal to minimum options');
  }

  if (typeof maxOptions === 'number' && maxOptions > MAX_ALLOWED_OPTIONS) {
    errors.push('Maximum options cannot exceed 20');
  }

  // Validate vote tracking method
  const validTrackingMethods = ['session', 'ip', 'fingerprint'];
  const voteTracking = config.voteTracking as string | undefined;
  if (voteTracking !== undefined && !validTrackingMethods.includes(voteTracking)) {
    errors.push(`Vote tracking must be one of: ${validTrackingMethods.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates quiz template configuration.
 * Enforces question count, passing score, and retake settings.
 *
 * @param config - Quiz configuration data
 * @returns Validation result with errors if invalid
 *
 * @example
 * ```typescript
 * const result = validateQuizConfig({
 *   minQuestions: 1,
 *   passingScore: 70,
 *   allowRetakes: true
 * });
 * ```
 */
export function validateQuizConfig(config: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  // Validate min questions
  const minQuestions = config.minQuestions;
  if (typeof minQuestions !== 'number' || minQuestions < 1) {
    errors.push('Minimum questions must be at least 1');
  }

  if (minQuestions && minQuestions > 50) {
    errors.push('Minimum questions cannot exceed 50');
  }

  // Validate passing score
  const passingScore = config.passingScore;
  if (typeof passingScore !== 'number') {
    errors.push('Passing score is required');
  } else if (passingScore < 0 || passingScore > 100) {
    errors.push('Passing score must be between 0 and 100');
  }

  // Validate allow retakes (boolean)
  if ('allowRetakes' in config && typeof config.allowRetakes !== 'boolean') {
    errors.push('Allow retakes must be a boolean value');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates product/ecommerce template configuration.
 * Enforces inventory and tax settings.
 *
 * @param config - Product configuration data
 * @returns Validation result with errors if invalid
 *
 * @example
 * ```typescript
 * const result = validateProductConfig({
 *   enableInventory: true,
 *   enableTax: false
 * });
 * ```
 */
export function validateProductConfig(config: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  // Validate boolean flags
  if ('enableInventory' in config && typeof config.enableInventory !== 'boolean') {
    errors.push('Enable inventory must be a boolean value');
  }

  if ('enableTax' in config && typeof config.enableTax !== 'boolean') {
    errors.push('Enable tax must be a boolean value');
  }

  // Validate tax rate if tax is enabled
  if (config.enableTax && 'taxRate' in config) {
    const taxRate = config.taxRate;
    if (typeof taxRate !== 'number' || taxRate < 0 || taxRate > 1) {
      errors.push('Tax rate must be a number between 0 and 1 (e.g., 0.08 for 8%)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates appointment/services template configuration.
 * Enforces time slot intervals and booking capacity.
 *
 * @param config - Appointment configuration data
 * @returns Validation result with errors if invalid
 *
 * @example
 * ```typescript
 * const result = validateAppointmentConfig({
 *   slotInterval: 30,
 *   maxBookingsPerSlot: 1
 * });
 * ```
 */
export function validateAppointmentConfig(config: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  // Validate slot interval
  const slotInterval = config.slotInterval;
  const validIntervals = [15, 30, 60, 120]; // Common time intervals in minutes

  if (typeof slotInterval !== 'number') {
    errors.push('Slot interval is required');
  } else if (!validIntervals.includes(slotInterval)) {
    errors.push(`Slot interval must be one of: ${validIntervals.join(', ')} minutes`);
  }

  // Validate max bookings per slot
  const maxBookingsPerSlot = config.maxBookingsPerSlot;
  if (typeof maxBookingsPerSlot !== 'number' || maxBookingsPerSlot < 1) {
    errors.push('Max bookings per slot must be at least 1');
  }

  if (maxBookingsPerSlot && maxBookingsPerSlot > 100) {
    errors.push('Max bookings per slot cannot exceed 100');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates restaurant/menu template configuration.
 * Enforces menu item limits and category settings.
 *
 * @param config - Restaurant configuration data
 * @returns Validation result with errors if invalid
 *
 * @example
 * ```typescript
 * const result = validateRestaurantConfig({
 *   minItems: 1,
 *   enableCategories: false
 * });
 * ```
 */
export function validateRestaurantConfig(config: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  // Validate min items
  const minItems = config.minItems;
  if (typeof minItems !== 'number' || minItems < 1) {
    errors.push('Minimum items must be at least 1');
  }

  // Validate enable categories (boolean)
  if ('enableCategories' in config && typeof config.enableCategories !== 'boolean') {
    errors.push('Enable categories must be a boolean value');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates events template configuration.
 * Enforces guest count and ticket limits.
 *
 * @param config - Events configuration data
 * @returns Validation result with errors if invalid
 *
 * @example
 * ```typescript
 * const result = validateEventsConfig({
 *   allowGuestCount: true,
 *   maxTicketsPerOrder: 10
 * });
 * ```
 */
export function validateEventsConfig(config: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  // Validate allow guest count (boolean)
  if ('allowGuestCount' in config && typeof config.allowGuestCount !== 'boolean') {
    errors.push('Allow guest count must be a boolean value');
  }

  // Validate max tickets per order
  const maxTicketsPerOrder = config.maxTicketsPerOrder;
  if (typeof maxTicketsPerOrder !== 'number' || maxTicketsPerOrder < 1) {
    errors.push('Max tickets per order must be at least 1');
  }

  if (maxTicketsPerOrder && maxTicketsPerOrder > 100) {
    errors.push('Max tickets per order cannot exceed 100');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates category-specific configuration using appropriate validator.
 * Dispatches to category-specific validator based on discriminated union.
 *
 * @param category - Template category
 * @param config - Category configuration data
 * @returns Validation result with errors if invalid
 *
 * @example
 * ```typescript
 * const result = validateCategoryConfiguration(
 *   TemplateCategory.POLLS,
 *   { minOptions: 2, maxOptions: 10, voteTracking: 'session' }
 * );
 * if (!result.valid) {
 *   console.log('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateCategoryConfiguration(
  category: TemplateCategory,
  config: Record<string, unknown>,
): ValidationResult {
  switch (category) {
    case TemplateCategory.POLLS:
      return validatePollConfig(config);
    case TemplateCategory.QUIZ:
      return validateQuizConfig(config);
    case TemplateCategory.ECOMMERCE:
      return validateProductConfig(config);
    case TemplateCategory.SERVICES:
      return validateAppointmentConfig(config);
    case TemplateCategory.DATA_COLLECTION:
      return validateRestaurantConfig(config);
    case TemplateCategory.EVENTS:
      return validateEventsConfig(config);
    default:
      // Exhaustiveness check - TypeScript will error if new category added
      const _exhaustive: never = category;
      return { valid: false, errors: ['Unknown template category'] };
  }
}
