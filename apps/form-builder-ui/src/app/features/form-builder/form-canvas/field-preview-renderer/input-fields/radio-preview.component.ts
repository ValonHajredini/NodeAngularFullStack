import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, RadioButton],
  template: `
    <div class="field-preview">
      <div class="flex flex-col gap-2">
        @if (!field.options || field.options.length === 0) {
          <p class="text-sm text-gray-400 italic">No options defined</p>
        } @else {
          @for (option of field.options; track option.value) {
            <div class="flex items-center">
              <p-radioButton
                [name]="field.fieldName"
                [value]="option.value"
                [(ngModel)]="previewValue"
                [disabled]="true"
                styleClass="theme-radio"
                [inputId]="'radio-' + field.id + '-' + option.value"
                [attr.aria-label]="option.label"
              ></p-radioButton>
              <label
                [for]="'radio-' + field.id + '-' + option.value"
                class="ml-2 text-sm theme-label"
              >
                {{ option.label }}
              </label>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [
    `
      .field-preview {
        pointer-events: none;
      }

      /* Apply theme colors to radio buttons */
      ::ng-deep .field-preview p-radioButton.theme-radio {
        .p-radiobutton {
          .p-radiobutton-box {
            background-color: var(--theme-input-background, #ffffff);
            border: 2px solid var(--theme-input-border-color, #d1d5db);
            border-radius: 50%;
            width: 1.25rem;
            height: 1.25rem;
            transition: border-color 0.2s ease;

            &:hover {
              border-color: var(--theme-primary-color, #3b82f6);
            }

            &.p-highlight {
              border-color: var(--theme-primary-color, #3b82f6);
              background-color: var(--theme-primary-color, #3b82f6);

              .p-radiobutton-icon {
                background-color: var(--theme-input-background, #ffffff);
                width: 0.625rem;
                height: 0.625rem;
                border-radius: 50%;
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
export class RadioPreviewComponent {
  @Input({ required: true }) field!: FormField;

  /**
   * Placeholder value for ngModel binding.
   * Required by PrimeNG RadioButton even when disabled.
   */
  protected previewValue: string | null = null;
}
