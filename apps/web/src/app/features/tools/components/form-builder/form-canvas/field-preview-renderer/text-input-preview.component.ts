import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputText } from 'primeng/inputtext';
import { FormField } from '@nodeangularfullstack/shared';

/**
 * Text input preview component for TEXT, EMAIL, and NUMBER field types.
 * Renders a disabled PrimeNG input text field matching the published form appearance.
 */
@Component({
  selector: 'app-text-input-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, InputText],
  template: `
    <div class="field-preview">
      <input
        pInputText
        [type]="getInputType()"
        [placeholder]="field.placeholder || ''"
        [disabled]="true"
        class="w-full"
        [attr.aria-label]="field.label"
        [attr.aria-required]="field.required"
      />
    </div>
  `,
  styles: [
    `
      ::ng-deep .field-preview input.p-inputtext {
        background-color: var(--theme-input-background, #ffffff);
        border: 1px solid var(--theme-input-border-color, #d1d5db);
        border-radius: var(--theme-border-radius, 0.375rem);
        font-family: var(--theme-body-font, system-ui);
        color: var(--theme-input-text-color, #1f2937);
        transition:
          border-color 0.2s ease,
          box-shadow 0.2s ease;
        padding: 0.5rem 0.75rem;
        width: 100%;

        &:focus {
          outline: none;
          border-color: var(--theme-primary-color, #3b82f6);
          box-shadow: 0 0 0 3px rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
        }

        &::placeholder {
          color: var(--theme-help-text-color, #9ca3af);
        }
      }
    `,
  ],
})
export class TextInputPreviewComponent {
  @Input({ required: true }) field!: FormField;

  /**
   * Gets the HTML input type based on the field type.
   * @returns 'text', 'email', or 'number'
   */
  getInputType(): string {
    switch (this.field.type) {
      case 'email':
        return 'email';
      case 'number':
        return 'number';
      default:
        return 'text';
    }
  }
}
