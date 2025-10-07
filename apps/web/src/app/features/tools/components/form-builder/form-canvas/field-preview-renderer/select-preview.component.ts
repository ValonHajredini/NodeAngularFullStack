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
      <label class="block text-sm font-medium text-gray-700 mb-1">
        {{ field.label }}
        @if (field.required) {
          <span class="text-red-500 ml-1">*</span>
        }
      </label>
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
      @if (field.helpText) {
        <small class="block mt-1 text-gray-500">{{ field.helpText }}</small>
      }
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
export class SelectPreviewComponent {
  @Input({ required: true }) field!: FormField;
}
