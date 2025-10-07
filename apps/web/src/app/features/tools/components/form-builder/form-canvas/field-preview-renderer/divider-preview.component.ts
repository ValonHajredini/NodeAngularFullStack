import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Divider } from 'primeng/divider';
import { FormField } from '@nodeangularfullstack/shared';

/**
 * Divider preview component for DIVIDER field type.
 * Renders a PrimeNG divider matching the published form appearance.
 */
@Component({
  selector: 'app-divider-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Divider],
  template: `
    <div class="field-preview">
      @if (field.label) {
        <p-divider align="left" type="solid">
          <div class="inline-flex items-center">
            <span class="text-sm font-medium text-gray-700">{{ field.label }}</span>
          </div>
        </p-divider>
      } @else {
        <p-divider></p-divider>
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
export class DividerPreviewComponent {
  @Input({ required: true }) field!: FormField;
}
