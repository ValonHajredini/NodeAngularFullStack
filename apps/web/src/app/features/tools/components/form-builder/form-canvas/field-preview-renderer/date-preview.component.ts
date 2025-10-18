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

      // PrimeNG DatePicker theme overrides for preview
      :host ::ng-deep .p-datepicker {
        background-color: var(--theme-input-background, #ffffff);
        border: 1px solid var(--theme-input-border-color, #d1d5db);
        border-radius: var(--theme-border-radius, 0.375rem);
        font-family: var(--theme-body-font, system-ui);

        .p-datepicker-header {
          background-color: var(--theme-primary-color, #3b82f6);
          color: white;

          .p-datepicker-title {
            color: white;
          }

          button {
            color: white;

            &:hover {
              background-color: rgba(255, 255, 255, 0.1);
            }
          }
        }

        .p-datepicker-calendar {
          td {
            > span {
              color: var(--theme-input-text-color, #1f2937);
              border-radius: var(--theme-border-radius, 0.375rem);
            }

            &.p-datepicker-today > span {
              background-color: var(--theme-secondary-color, #6b7280);
              color: white;
            }

            > span.p-highlight {
              background-color: var(--theme-primary-color, #3b82f6);
              color: white;
            }
          }

          th {
            color: var(--theme-label-color, #374151);
          }
        }

        .p-datepicker-time-picker {
          border-top: 1px solid var(--theme-input-border-color, #d1d5db);

          button {
            color: var(--theme-primary-color, #3b82f6);
          }

          span {
            color: var(--theme-input-text-color, #1f2937);
          }
        }
      }

      // DatePicker input field styling
      :host ::ng-deep .p-datepicker-input {
        background-color: var(--theme-input-background, #ffffff);
        border: 1px solid var(--theme-input-border-color, #d1d5db);
        color: var(--theme-input-text-color, #1f2937);
        font-family: var(--theme-body-font, system-ui);
        border-radius: var(--theme-border-radius, 0.375rem);
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
