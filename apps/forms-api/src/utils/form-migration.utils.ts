import { FormSchema, FormStep } from '@nodeangularfullstack/shared';
import * as crypto from 'crypto';

/**
 * Migration utilities for converting between form schema versions.
 * Provides helper functions for transforming single-page forms to multi-step forms
 * and other schema migration operations.
 */

/**
 * Converts a single-page form schema to a multi-step form structure.
 * Creates a default step and assigns all existing fields to that step.
 * Maintains existing row layout configurations and field positions.
 *
 * @param schema - The original single-page form schema to convert
 * @param stepTitle - Optional title for the default step (defaults to "Step 1")
 * @returns Updated schema with step form configuration enabled
 *
 * @example
 * ```typescript
 * const singlePageSchema: FormSchema = {
 *   id: 'schema-uuid',
 *   formId: 'form-uuid',
 *   version: 1,
 *   fields: [...],
 *   settings: { layout: {...}, submission: {...} },
 *   isPublished: false,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 *
 * const stepFormSchema = convertSinglePageToStepForm(
 *   singlePageSchema,
 *   'Contact Information'
 * );
 *
 * console.log(stepFormSchema.settings.stepForm.enabled); // true
 * console.log(stepFormSchema.settings.stepForm.steps.length); // 1
 * console.log(stepFormSchema.fields[0].position?.stepId); // default step ID
 * ```
 *
 * @remarks
 * - This function does NOT modify the original schema (creates a new copy)
 * - All fields are assigned to the single default step via `position.stepId`
 * - Existing row layout configurations are preserved
 * - If fields don't have a `position` property, one is created with the stepId
 * - The default step has order 0 and a UUID v4 identifier
 *
 * @throws Does not throw - returns the modified schema even if input is invalid
 */
export function convertSinglePageToStepForm(
  schema: FormSchema,
  stepTitle: string = 'Step 1'
): FormSchema {
  // Generate UUID v4 for the default step
  const defaultStepId = crypto.randomUUID();

  // Create the default step
  const defaultStep: FormStep = {
    id: defaultStepId,
    title: stepTitle,
    description: undefined,
    order: 0,
  };

  // Deep clone the schema to avoid mutating the original
  const updatedSchema: FormSchema = JSON.parse(JSON.stringify(schema));

  // Assign all fields to the default step
  if (updatedSchema.fields && updatedSchema.fields.length > 0) {
    updatedSchema.fields = updatedSchema.fields.map((field) => {
      // If field doesn't have a position, create one
      if (!field.position) {
        return {
          ...field,
          position: {
            rowId: 'default-row',
            columnIndex: 0,
            orderInColumn: 0,
            stepId: defaultStepId,
          },
        };
      }

      // If field has a position, add stepId to it
      return {
        ...field,
        position: {
          ...field.position,
          stepId: defaultStepId,
        },
      };
    });
  }

  // Enable step form mode and add the default step
  updatedSchema.settings = {
    ...updatedSchema.settings,
    stepForm: {
      enabled: true,
      steps: [defaultStep],
    },
  };

  return updatedSchema;
}

/**
 * Checks if a form schema has step form configuration enabled.
 *
 * @param schema - Form schema to check
 * @returns True if step form is enabled, false otherwise
 *
 * @example
 * ```typescript
 * if (isStepFormSchema(schema)) {
 *   console.log('This is a multi-step form');
 * } else {
 *   console.log('This is a single-page form');
 * }
 * ```
 */
export function isStepFormSchema(schema: FormSchema): boolean {
  return schema.settings?.stepForm?.enabled === true;
}

/**
 * Gets the step ID for a given field, if assigned.
 *
 * @param field - Form field to check
 * @returns Step ID if field is assigned to a step, undefined otherwise
 *
 * @example
 * ```typescript
 * const stepId = getFieldStepId(field);
 * if (stepId) {
 *   console.log(`Field belongs to step: ${stepId}`);
 * }
 * ```
 */
export function getFieldStepId(
  field: FormSchema['fields'][0]
): string | undefined {
  return field.position?.stepId;
}
