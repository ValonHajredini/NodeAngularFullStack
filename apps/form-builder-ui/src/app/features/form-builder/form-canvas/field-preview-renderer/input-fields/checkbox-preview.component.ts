import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, Checkbox],
  template: `
    <div class="field-preview">
      @if (!field.options || field.options.length === 0) {
        <!-- Single checkbox (binary) -->
        <div class="flex items-center">
          <p-checkbox
            [binary]="true"
            [(ngModel)]="previewBinaryValue"
            [disabled]="true"
            inputId="checkbox-preview"
            styleClass="theme-checkbox"
            [attr.aria-label]="field.label"
            [attr.aria-required]="field.required"
          ></p-checkbox>
          <label for="checkbox-preview" class="ml-2 text-sm font-medium theme-label">
            {{ field.label }}
            @if (field.required) {
              <span class="text-red-500 ml-1">*</span>
            }
          </label>
        </div>
      } @else {
        <!-- Checkbox group with options -->
        <div class="flex flex-col gap-2">
          @for (option of field.options; track option.value) {
            <div class="flex items-center">
              <p-checkbox
                [value]="option.value"
                [(ngModel)]="previewArrayValue"
                [disabled]="true"
                [binary]="false"
                styleClass="theme-checkbox"
                [inputId]="'checkbox-' + field.id + '-' + option.value"
                [attr.aria-label]="option.label"
              ></p-checkbox>
              <label
                [for]="'checkbox-' + field.id + '-' + option.value"
                class="ml-2 text-sm theme-label"
              >
                {{ option.label }}
              </label>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .field-preview {
        pointer-events: none;
      }

      /* Apply theme colors to checkboxes */
      ::ng-deep .field-preview p-checkbox.theme-checkbox {
        .p-checkbox {
          .p-checkbox-box {
            background-color: var(--theme-input-background, #ffffff);
            border: 2px solid var(--theme-input-border-color, #d1d5db);
            border-radius: var(--theme-border-radius, 0.375rem);
            width: 1.25rem;
            height: 1.25rem;
            transition:
              border-color 0.2s ease,
              background-color 0.2s ease;

            &:hover {
              border-color: var(--theme-primary-color, #3b82f6);
            }

            &.p-highlight {
              border-color: var(--theme-primary-color, #3b82f6);
              background-color: var(--theme-primary-color, #3b82f6);

              .p-checkbox-icon {
                color: white;
                font-size: 1rem;
                font-weight: bold;
              }
            }
          }
        }
      }

      .theme-label {
        color: var(--theme-label-color, #374151);
        font-family: var(--theme-body-font, system-ui);
        font-size: 0.875rem;
      }
    `,
  ],
})
export class CheckboxPreviewComponent {
  @Input({ required: true }) field!: FormField;

  /**
   * Placeholder values for ngModel binding.
   * Required by PrimeNG Checkbox even when disabled.
   */
  protected previewBinaryValue = false;
  protected previewArrayValue: string[] = [];
}
