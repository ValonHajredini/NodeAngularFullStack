import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validates that min value is less than or equal to max value.
 * Works for both numeric values and length constraints.
 * @param minControlName - Name of min control (e.g., 'minLength', 'min')
 * @param maxControlName - Name of max control (e.g., 'maxLength', 'max')
 * @returns Validator function
 */
export function minMaxRangeValidator(minControlName: string, maxControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const minControl = control.get(minControlName);
    const maxControl = control.get(maxControlName);

    if (!minControl || !maxControl) return null;

    const minValue = minControl.value;
    const maxValue = maxControl.value;

    // If either is empty, no validation needed
    if (
      minValue === null ||
      minValue === undefined ||
      maxValue === null ||
      maxValue === undefined
    ) {
      return null;
    }

    // Check if min > max
    if (minValue > maxValue) {
      return {
        minMaxRange: {
          min: minValue,
          max: maxValue,
          message: 'Minimum must be less than or equal to maximum',
        },
      };
    }

    return null;
  };
}
