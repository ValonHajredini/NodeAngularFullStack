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

      // PrimeNG ToggleSwitch theme overrides for preview
      :host ::ng-deep p-toggleswitch {
        .p-toggleswitch {
          .p-toggleswitch-slider {
            background-color: var(--theme-input-border-color, #cbd5e0);
            border-radius: 0.75rem;
            transition: background-color 0.2s ease;

            &::before {
              background-color: white;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
          }

          &.p-toggleswitch-checked .p-toggleswitch-slider {
            background-color: var(--theme-primary-color, #3b82f6);
          }

          &:focus-visible {
            outline: 2px solid var(--theme-primary-color, #3b82f6);
            outline-offset: 2px;
          }
        }
      }

      // Toggle label styling
      label {
        color: var(--theme-label-color, #374151);
        font-family: var(--theme-body-font, system-ui);
        font-size: 0.875rem;
      }

      small {
        color: var(--theme-help-text-color, #6b7280);
        font-family: var(--theme-body-font, system-ui);
      }
    `,
  ],
})
export class TogglePreviewComponent {
  @Input({ required: true }) field!: FormField;
}
