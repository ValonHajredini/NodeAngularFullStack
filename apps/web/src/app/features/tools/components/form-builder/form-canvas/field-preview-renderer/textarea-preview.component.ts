import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormField } from '@nodeangularfullstack/shared';

/**
 * Textarea preview component for TEXTAREA field type.
 * Renders a disabled textarea matching the published form appearance.
 */
@Component({
  selector: 'app-textarea-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="field-preview">
      <textarea
        [placeholder]="field.placeholder || ''"
        [disabled]="true"
        rows="4"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
        [attr.aria-label]="field.label"
        [attr.aria-required]="field.required"
      ></textarea>
      @if (field.validation && field.validation.maxLength) {
        <div class="mt-1 text-xs text-gray-400">
          Max length: {{ field.validation.maxLength }} characters
        </div>
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
export class TextareaPreviewComponent {
  @Input({ required: true }) field!: FormField;
}
