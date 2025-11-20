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

      ::ng-deep .field-preview textarea.theme-textarea {
        background-color: var(--theme-input-background, #ffffff);
        border: 1px solid var(--theme-input-border-color, #d1d5db);
        color: var(--theme-input-text-color, #1f2937);
        font-family: var(--theme-body-font, system-ui);
        border-radius: var(--theme-border-radius, 0.375rem);
        padding: 0.5rem 0.75rem;
        width: 100%;
        min-height: 100px;
        resize: vertical;
        transition:
          border-color 0.2s ease,
          box-shadow 0.2s ease;

        &:focus {
          outline: none;
          border-color: var(--theme-primary-color, #3b82f6);
          box-shadow: 0 0 0 3px rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
        }

        &::placeholder {
          color: var(--theme-help-text-color, #9ca3af);
        }
      }

      ::ng-deep .field-preview .theme-help-text {
        color: var(--theme-help-text-color, #6b7280);
        font-size: 0.875rem;
        margin-top: 0.25rem;
        font-family: var(--theme-body-font, system-ui);
      }
    `,
  ],
})
export class TextareaPreviewComponent {
  @Input({ required: true }) field!: FormField;
}
