import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioButton } from 'primeng/radiobutton';
import { FormField } from '@nodeangularfullstack/shared';

/**
 * Radio button group preview component for RADIO field type.
 * Renders disabled PrimeNG radio buttons matching the published form appearance.
 */
@Component({
  selector: 'app-radio-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RadioButton],
  template: `
    <div class="field-preview">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        {{ field.label }}
        @if (field.required) {
          <span class="text-red-500 ml-1">*</span>
        }
      </label>
      <div class="flex flex-col gap-2">
        @if (!field.options || field.options.length === 0) {
          <p class="text-sm text-gray-400 italic">No options defined</p>
        } @else {
          @for (option of field.options; track option.value) {
            <div class="flex items-center">
              <p-radioButton
                [name]="field.fieldName"
                [value]="option.value"
                [disabled]="true"
                [inputId]="'radio-' + field.id + '-' + option.value"
                [attr.aria-label]="option.label"
              ></p-radioButton>
              <label
                [for]="'radio-' + field.id + '-' + option.value"
                class="ml-2 text-sm text-gray-700"
              >
                {{ option.label }}
              </label>
            </div>
          }
        }
      </div>
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
export class RadioPreviewComponent {
  @Input({ required: true }) field!: FormField;
}
