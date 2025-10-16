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
        border: 2px solid var(--theme-primary-color, #3b82f6);
        border-radius: var(--theme-field-radius, 4px);
        font-family: var(--theme-font-body, inherit);
        color: var(--theme-text-primary, #111827);
        transition: border-color 0.2s ease;
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
