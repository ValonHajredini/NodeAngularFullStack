import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePicker } from 'primeng/datepicker';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';

/**
 * Date/DateTime picker preview component for DATE and DATETIME field types.
 * Renders a disabled PrimeNG calendar matching the published form appearance.
 */
@Component({
  selector: 'app-date-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePicker],
  template: `
    <div class="field-preview">
      <p-datepicker
        [showTime]="isDateTimeField()"
        [disabled]="true"
        [placeholder]="
          field.placeholder || (isDateTimeField() ? 'Select date and time' : 'Select date')
        "
        styleClass="w-full"
        [attr.aria-label]="field.label"
        [attr.aria-required]="field.required"
      ></p-datepicker>
    </div>
  `,
  styles: [
    `
      .field-preview {
        pointer-events: none;
      }
    `,
  ],
})
export class DatePreviewComponent {
  @Input({ required: true }) field!: FormField;

  /**
   * Checks if the field is a datetime type.
   * @returns true if field type is DATETIME
   */
  isDateTimeField(): boolean {
    return this.field.type === FormFieldType.DATETIME;
  }
}
