import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormField, TextBlockMetadata } from '@nodeangularfullstack/shared';
import { HtmlSanitizerService } from '../../../../../../shared/services/html-sanitizer.service';

/**
 * Text block preview component for form builder canvas.
 * Renders a truncated plain text preview of the HTML content.
 */
@Component({
  selector: 'app-text-block-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="text-block-preview border rounded p-3"
      [style.background-color]="metadata.backgroundColor || 'transparent'"
      [style.text-align]="metadata.alignment || 'left'"
      [class.p-0]="metadata.padding === 'none'"
      [class.p-2]="metadata.padding === 'small'"
      [class.p-3]="metadata.padding === 'medium'"
      [class.p-6]="metadata.padding === 'large'"
    >
      <div class="text-sm text-gray-700 whitespace-pre-wrap">{{ previewText }}</div>
      @if (isTruncated) {
        <p class="text-xs text-gray-500 mt-2 mb-0">... Click to edit</p>
      }
    </div>
  `,
  styles: [
    `
      .text-block-preview {
        position: relative;
        min-height: 60px;
        transition: all 0.2s;
      }

      .text-block-preview:hover {
        background-color: rgba(59, 130, 246, 0.05);
        border-color: #3b82f6;
      }
    `,
  ],
})
export class TextBlockPreviewComponent {
  @Input({ required: true }) field!: FormField;

  private readonly htmlSanitizer = inject(HtmlSanitizerService);
  private readonly maxPreviewLength = 150;

  /**
   * Get text block metadata with type safety
   */
  get metadata(): TextBlockMetadata {
    return (
      (this.field.metadata as TextBlockMetadata) || {
        content: '<p>Add your instructions here...</p>',
        alignment: 'left',
        padding: 'medium',
        collapsible: false,
        collapsed: false,
      }
    );
  }

  /**
   * Get plain text preview (stripped of HTML tags and truncated)
   */
  get previewText(): string {
    const plainText = this.htmlSanitizer.stripHtml(this.metadata.content || '');
    return this.htmlSanitizer.truncate(plainText, this.maxPreviewLength);
  }

  /**
   * Check if content is truncated
   */
  get isTruncated(): boolean {
    const plainText = this.htmlSanitizer.stripHtml(this.metadata.content || '');
    return plainText.length > this.maxPreviewLength;
  }
}
