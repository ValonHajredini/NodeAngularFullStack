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
        class="theme-textarea w-full disabled:bg-gray-50 disabled:cursor-not-allowed"
        [attr.aria-label]="field.label"
        [attr.aria-required]="field.required"
      ></textarea>
      @if (field.validation && field.validation.maxLength) {
        <div class="mt-1 text-xs theme-help-text">
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
