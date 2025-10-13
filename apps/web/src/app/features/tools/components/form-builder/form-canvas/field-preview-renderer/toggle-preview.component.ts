import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { FormField } from '@nodeangularfullstack/shared';

/**
 * Toggle switch preview component for TOGGLE field type.
 * Renders a disabled PrimeNG input switch matching the published form appearance.
 */
@Component({
  selector: 'app-toggle-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ToggleSwitch],
  template: `
    <div class="field-preview">
      <div class="flex items-center">
        <p-toggleswitch
          [disabled]="true"
          inputId="toggle-preview"
          [attr.aria-label]="field.label"
          [attr.aria-required]="field.required"
        ></p-toggleswitch>
        <label for="toggle-preview" class="ml-3 text-sm font-medium text-gray-700">
          {{ field.label }}
          @if (field.required) {
            <span class="text-red-500 ml-1">*</span>
          }
        </label>
      </div>
      @if (field.helpText) {
        <small class="block mt-1 ml-14 text-gray-500">{{ field.helpText }}</small>
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
export class TogglePreviewComponent {
  @Input({ required: true }) field!: FormField;
}
