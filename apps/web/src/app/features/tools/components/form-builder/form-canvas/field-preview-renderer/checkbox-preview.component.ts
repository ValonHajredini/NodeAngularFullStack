import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Checkbox } from 'primeng/checkbox';
import { FormField } from '@nodeangularfullstack/shared';

/**
 * Checkbox preview component for CHECKBOX field type.
 * Renders a disabled PrimeNG checkbox (single) or checkbox group (with options).
 */
@Component({
  selector: 'app-checkbox-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Checkbox],
  template: `
    <div class="field-preview">
      @if (!field.options || field.options.length === 0) {
        <!-- Single checkbox (binary) -->
        <div class="flex items-center">
          <p-checkbox
            [binary]="true"
            [disabled]="true"
            inputId="checkbox-preview"
            [attr.aria-label]="field.label"
            [attr.aria-required]="field.required"
          ></p-checkbox>
          <label for="checkbox-preview" class="ml-2 text-sm font-medium text-gray-700">
            {{ field.label }}
            @if (field.required) {
              <span class="text-red-500 ml-1">*</span>
            }
          </label>
        </div>
      } @else {
        <!-- Checkbox group with options -->
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ field.label }}
          @if (field.required) {
            <span class="text-red-500 ml-1">*</span>
          }
        </label>
        <div class="flex flex-col gap-2">
          @for (option of field.options; track option.value) {
            <div class="flex items-center">
              <p-checkbox
                [value]="option.value"
                [disabled]="true"
                [binary]="false"
                [inputId]="'checkbox-' + field.id + '-' + option.value"
                [attr.aria-label]="option.label"
              ></p-checkbox>
              <label
                [for]="'checkbox-' + field.id + '-' + option.value"
                class="ml-2 text-sm text-gray-700"
              >
                {{ option.label }}
              </label>
            </div>
          }
        </div>
      }
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
export class CheckboxPreviewComponent {
  @Input({ required: true }) field!: FormField;
}
