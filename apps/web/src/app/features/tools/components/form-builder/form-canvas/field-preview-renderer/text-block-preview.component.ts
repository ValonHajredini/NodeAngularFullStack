import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormField, TextBlockMetadata } from '@nodeangularfullstack/shared';
import { HtmlSanitizerService } from '../../../../../../shared/services/html-sanitizer.service';
import { InlineTextBlockEditorComponent } from './inline-text-block-editor.component';

/**
 * Text block preview component for form builder canvas.
 * Renders plain text content with inline editing support.
 */
@Component({
  selector: 'app-text-block-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, InlineTextBlockEditorComponent],
  template: `
    <app-inline-text-block-editor
      [content]="plainTextContent"
      [fieldId]="field.id"
      [alignment]="metadata.alignment || 'left'"
      [backgroundColor]="metadata.backgroundColor"
      [padding]="metadata.padding || 'medium'"
      (contentChanged)="onContentChanged($event)"
      (click)="$event.stopPropagation()"
      style="pointer-events: auto;"
    />
  `,
  styles: [],
})
export class TextBlockPreviewComponent {
  @Input({ required: true }) field!: FormField;
  @Output() contentChanged = new EventEmitter<string>();

  private readonly htmlSanitizer = inject(HtmlSanitizerService);

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
   * Get plain text content (stripped of HTML tags)
   */
  get plainTextContent(): string {
    return this.htmlSanitizer.stripHtml(this.metadata.content || '');
  }

  /**
   * Handle content change from inline editor
   */
  onContentChanged(newContent: string): void {
    this.contentChanged.emit(newContent);
  }
}
