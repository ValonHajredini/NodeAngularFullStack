import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Select } from 'primeng/select';
import { FormField } from '@nodeangularfullstack/shared';

/**
 * Select dropdown preview component for SELECT field type.
 * Renders a disabled PrimeNG dropdown matching the published form appearance.
 */
@Component({
  selector: 'app-select-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Select],
  template: `
    <div class="field-preview">
      <p-select
        [options]="field.options || []"
        [placeholder]="field.placeholder || 'Select an option'"
        [disabled]="true"
        optionLabel="label"
        optionValue="value"
        styleClass="w-full"
        [attr.aria-label]="field.label"
        [attr.aria-required]="field.required"
      ></p-select>
    </div>
  `,
  styles: [
    `
      .field-preview {
        pointer-events: none;
      }

      /* Match select dropdown size to text input */
      ::ng-deep .p-select {
        height: 2.5rem;
        display: flex;
        align-items: center;
      }

      ::ng-deep .p-select .p-select-label {
        padding: 0.5rem 0.75rem;
        display: flex;
        align-items: center;
        line-height: 1.5rem;
      }

      ::ng-deep .p-select .p-select-dropdown {
        height: 2.5rem;
        display: flex;
        align-items: center;
      }
    `,
  ],
})
export class SelectPreviewComponent {
  @Input({ required: true }) field!: FormField;
}
