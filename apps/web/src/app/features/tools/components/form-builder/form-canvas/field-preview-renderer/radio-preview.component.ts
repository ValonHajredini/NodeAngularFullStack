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
