/**
 * Category Field Validator
 *
 * Epic 29, Story 29.1: Backend Validation Engine
 *
 * Validates that form templates contain category-specific required fields
 * with correct field names and types. Provides actionable error messages
 * with auto-fix suggestions.
 *
 * @module CategoryFieldValidator
 * @since 2025-11-19
 */

import {
  TemplateCategory,
  FormSchema,
  FormField,
  FormFieldType,
  FieldMetadata,
  FieldRequirement,
  TemplateFieldValidationError,
  TemplateFieldValidationResult
} from '@nodeangularfullstack/shared';

/**
 * Category Field Validator
 *
 * Validates templates against category-specific field requirements.
 * Checks both field names and field types.
 *
 * @example
 * ```typescript
 * const result = CategoryFieldValidator.validateCategoryFields(
 *   TemplateCategory.POLLS,
 *   templateSchema
 * );
 *
 * if (!result.isValid) {
 *   console.log('Validation errors:', result.errors);
 *   // Show auto-fix suggestions to user
 * }
 * ```
 */
export class CategoryFieldValidator {
  /**
   * Validation rules for each template category
   * Maps category to required field definitions
   */
  private static readonly VALIDATION_RULES: Record<TemplateCategory, FieldRequirement[]> = {
    [TemplateCategory.POLLS]: [
      {
        fieldName: 'poll_option',
        allowedTypes: [FormFieldType.SELECT, FormFieldType.RADIO],
        message: 'Poll templates require a poll_option field (SELECT or RADIO) for vote tracking',
        autoFixSuggestion: 'Add a SELECT field named "poll_option" with vote options'
      }
    ],

    [TemplateCategory.QUIZ]: [
      {
        fieldNamePattern: /^question_\d+$/,
        allowedTypes: [FormFieldType.SELECT, FormFieldType.RADIO, FormFieldType.CHECKBOX],
        minimumCount: 1,
        requiresMetadata: { correctAnswer: true },
        message: 'Quiz templates require question fields (question_1, question_2, etc.) with correctAnswer metadata',
        autoFixSuggestion: 'Add SELECT/RADIO fields named "question_1", "question_2" with metadata.correctAnswer set'
      }
    ],

    [TemplateCategory.ECOMMERCE]: [
      {
        fieldName: 'product_id',
        allowedTypes: [FormFieldType.SELECT],
        message: 'E-commerce templates require a product_id field (SELECT) for product selection',
        autoFixSuggestion: 'Add a SELECT field named "product_id" with product options'
      },
      {
        fieldName: 'quantity',
        allowedTypes: [FormFieldType.NUMBER],
        message: 'E-commerce templates require a quantity field (NUMBER) for order amounts',
        autoFixSuggestion: 'Add a NUMBER field named "quantity"'
      },
      {
        fieldName: 'price',
        allowedTypes: [FormFieldType.NUMBER],
        message: 'E-commerce templates require a price field (NUMBER) for pricing',
        autoFixSuggestion: 'Add a NUMBER field named "price"'
      }
    ],

    [TemplateCategory.SERVICES]: [
      {
        fieldName: 'date',
        allowedTypes: [FormFieldType.DATE],
        message: 'Service templates require a date field (DATE) for appointment scheduling',
        autoFixSuggestion: 'Add a DATE field named "date"'
      },
      {
        fieldName: 'time_slot',
        allowedTypes: [FormFieldType.TIME_SLOT, FormFieldType.SELECT],
        message: 'Service templates require a time_slot field (TIME_SLOT or SELECT) for time selection',
        autoFixSuggestion: 'Add a TIME_SLOT or SELECT field named "time_slot"'
      }
    ],

    [TemplateCategory.DATA_COLLECTION]: [
      {
        fieldName: 'menu_item',
        allowedTypes: [FormFieldType.SELECT],
        message: 'Menu templates require a menu_item field (SELECT) for item selection',
        autoFixSuggestion: 'Add a SELECT field named "menu_item" with menu options'
      },
      {
        fieldName: 'quantity',
        allowedTypes: [FormFieldType.NUMBER],
        message: 'Menu templates require a quantity field (NUMBER) for order amounts',
        autoFixSuggestion: 'Add a NUMBER field named "quantity"'
      }
    ],

    [TemplateCategory.EVENTS]: [
      {
        fieldName: 'attendee_name',
        allowedTypes: [FormFieldType.TEXT],
        message: 'Event templates require an attendee_name field (TEXT) for registration',
        autoFixSuggestion: 'Add a TEXT field named "attendee_name"'
      },
      {
        fieldName: 'rsvp_status',
        allowedTypes: [FormFieldType.RADIO, FormFieldType.SELECT],
        message: 'Event templates require an rsvp_status field (RADIO or SELECT) for RSVP tracking',
        autoFixSuggestion: 'Add a RADIO field named "rsvp_status" with options like "Attending", "Not Attending", "Maybe"'
      }
    ]
  };

  /**
   * Validates a template schema against category-specific field requirements
   *
   * @param category - Template category to validate against
   * @param schema - Form schema to validate
   * @returns Validation result with errors and auto-fix suggestions
   *
   * @example
   * ```typescript
   * const result = CategoryFieldValidator.validateCategoryFields(
   *   TemplateCategory.POLLS,
   *   {
   *     fields: [
   *       { fieldName: 'poll_option', type: 'SELECT', ... }
   *     ],
   *     settings: { ... }
   *   }
   * );
   *
   * console.log(result.isValid); // true
   * console.log(result.errors);  // []
   * ```
   */
  public static validateCategoryFields(
    category: TemplateCategory,
    schema: FormSchema
  ): TemplateFieldValidationResult {
    const startTime = Date.now();

    // Get validation rules for category
    const requirements = this.VALIDATION_RULES[category];

    if (requirements === undefined || requirements === null || requirements.length === 0) {
      // No validation rules for this category (shouldn't happen with current categories)
      return {
        isValid: true,
        errors: [],
        satisfiedCount: 0,
        totalCount: 0
      };
    }

    const errors: TemplateFieldValidationError[] = [];
    let satisfiedCount = 0;

    // Validate each requirement
    for (const requirement of requirements) {
      const validationErrors = this.validateRequirement(requirement, schema.fields);

      if (validationErrors.length === 0) {
        satisfiedCount++;
      } else {
        errors.push(...validationErrors);
      }
    }

    const elapsedTime = Date.now() - startTime;

    // Log performance warning if validation takes too long
    if (elapsedTime > 50) {
      console.warn(
        `[CategoryFieldValidator] Validation took ${elapsedTime}ms (budget: 50ms) for category ${category}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      satisfiedCount,
      totalCount: requirements.length
    };
  }

  /**
   * Validates a single field requirement against form fields
   *
   * @param requirement - Field requirement to validate
   * @param fields - Form fields to check
   * @returns Array of validation errors (empty if valid)
   * @private
   */
  private static validateRequirement(
    requirement: FieldRequirement,
    fields: FormField[]
  ): TemplateFieldValidationError[] {
    const errors: TemplateFieldValidationError[] = [];

    // Find fields matching the requirement's name/pattern
    const matchingFields = fields.filter(field =>
      this.matchesFieldName(field.fieldName, requirement)
    );

    // Check minimum count requirement
    const minimumCount = requirement.minimumCount ?? 1;

    if (matchingFields.length === 0) {
      // No matching fields found - MISSING_FIELD error
      errors.push({
        field: requirement.fieldName ?? requirement.fieldNamePattern?.source ?? 'unknown',
        expectedType: requirement.allowedTypes,
        actualType: undefined,
        message: requirement.message,
        autoFixSuggestion: requirement.autoFixSuggestion,
        errorType: 'MISSING_FIELD'
      });
    } else if (matchingFields.length < minimumCount) {
      // Insufficient number of matching fields - INSUFFICIENT_COUNT error
      errors.push({
        field: requirement.fieldName ?? requirement.fieldNamePattern?.source ?? 'unknown',
        expectedType: requirement.allowedTypes,
        actualType: undefined,
        message: `${requirement.message} (found ${matchingFields.length}, need ${minimumCount})`,
        autoFixSuggestion: requirement.autoFixSuggestion,
        errorType: 'INSUFFICIENT_COUNT'
      });
    } else {
      // Fields exist - validate types and metadata
      for (const field of matchingFields) {
        // Validate field type
        if (!requirement.allowedTypes.includes(field.type)) {
          errors.push({
            field: field.fieldName,
            expectedType: requirement.allowedTypes,
            actualType: field.type,
            message: `Field '${field.fieldName}' is ${field.type} but should be ${this.formatTypeList(requirement.allowedTypes)}`,
            autoFixSuggestion: `Change field '${field.fieldName}' from ${field.type} to ${requirement.allowedTypes[0]} type`,
            errorType: 'WRONG_TYPE'
          });
        }

        // Validate metadata requirements (e.g., correctAnswer for quiz questions)
        if (requirement.requiresMetadata) {
          const metadataErrors = this.validateMetadata(field, requirement);
          errors.push(...metadataErrors);
        }
      }
    }

    return errors;
  }

  /**
   * Validates field metadata against requirements
   *
   * @param field - Form field to validate
   * @param requirement - Field requirement with metadata rules
   * @returns Array of validation errors (empty if valid)
   * @private
   */
  private static validateMetadata(
    field: FormField,
    requirement: FieldRequirement
  ): TemplateFieldValidationError[] {
    const errors: TemplateFieldValidationError[] = [];

    if (!requirement.requiresMetadata) {
      return errors;
    }

    const metadata = (field as FormField & { metadata?: FieldMetadata }).metadata ?? {};

    for (const key of Object.keys(requirement.requiresMetadata)) {
      const actualValue = metadata[key];

      // Check if metadata key exists
      if (actualValue === undefined || actualValue === null) {
        errors.push({
          field: field.fieldName,
          expectedType: requirement.allowedTypes,
          actualType: field.type,
          message: `Field '${field.fieldName}' is missing required metadata: ${key}`,
          autoFixSuggestion: `Add metadata.${key} to field '${field.fieldName}' (e.g., metadata: { ${key}: 'value' })`,
          errorType: 'MISSING_METADATA'
        });
      }
      // For boolean metadata requirements, just check presence
      // For other types, could add value validation here
    }

    return errors;
  }

  /**
   * Checks if a field name matches a requirement's name or pattern
   *
   * @param fieldName - Field name to check
   * @param requirement - Field requirement with name/pattern
   * @returns True if field name matches requirement
   * @private
   */
  private static matchesFieldName(
    fieldName: string,
    requirement: FieldRequirement
  ): boolean {
    // Exact name match
    if (requirement.fieldName !== undefined && requirement.fieldName !== null) {
      return fieldName === requirement.fieldName;
    }

    // Regex pattern match
    if (requirement.fieldNamePattern !== undefined && requirement.fieldNamePattern !== null) {
      return requirement.fieldNamePattern.test(fieldName);
    }

    return false;
  }

  /**
   * Formats a list of allowed types as a human-readable string
   *
   * @param types - Array of allowed field types
   * @returns Formatted string (e.g., "SELECT or RADIO")
   * @private
   */
  private static formatTypeList(types: string[]): string {
    if (types.length === 1) {
      return types[0];
    }

    if (types.length === 2) {
      return `${types[0]} or ${types[1]}`;
    }

    const lastType = types[types.length - 1];
    const otherTypes = types.slice(0, -1).join(', ');
    return `${otherTypes}, or ${lastType}`;
  }

  /**
   * Gets field requirements for a specific category
   * Useful for displaying requirements in UI
   *
   * @param category - Template category
   * @returns Array of field requirements
   *
   * @example
   * ```typescript
   * const requirements = CategoryFieldValidator.getRequirementsForCategory(
   *   TemplateCategory.POLLS
   * );
   * // [{ fieldName: 'poll_option', allowedTypes: ['SELECT', 'RADIO'], ... }]
   * ```
   */
  public static getRequirementsForCategory(
    category: TemplateCategory
  ): FieldRequirement[] {
    return this.VALIDATION_RULES[category] ?? [];
  }

  /**
   * Gets all validation rules (for testing/documentation)
   *
   * @returns Complete validation rules map
   * @internal
   */
  public static getAllRules(): Record<TemplateCategory, FieldRequirement[]> {
    return { ...this.VALIDATION_RULES };
  }
}
