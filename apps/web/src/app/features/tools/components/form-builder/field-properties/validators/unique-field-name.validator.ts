import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { FormBuilderService } from '../../form-builder.service';

/**
 * Validates that field name is unique within the form schema.
 * @param formBuilderService - Service to access current form schema
 * @param currentFieldId - ID of field being edited (excluded from uniqueness check)
 * @returns Validator function
 */
export function uniqueFieldNameValidator(
  formBuilderService: FormBuilderService,
  currentFieldId: string,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const fieldName = control.value;
    if (!fieldName) return null; // Empty is handled by required validator

    const allFields = formBuilderService.getAllFields();
    if (!allFields || allFields.length === 0) return null;

    // Check if any other field has same fieldName
    const isDuplicate = allFields.some(
      (field) => field.id !== currentFieldId && field.fieldName === fieldName,
    );

    return isDuplicate ? { duplicateFieldName: { value: fieldName } } : null;
  };
}
