import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validates regex pattern syntax.
 * Attempts to create RegExp and catches syntax errors.
 * @returns Validator function
 */
export function regexSyntaxValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const pattern = control.value;
    if (!pattern) return null; // Empty is valid (no pattern)

    try {
      new RegExp(pattern);
      return null; // Valid regex
    } catch (error) {
      return {
        invalidRegex: {
          message: error instanceof Error ? error.message : 'Invalid regex syntax',
        },
      };
    }
  };
}
