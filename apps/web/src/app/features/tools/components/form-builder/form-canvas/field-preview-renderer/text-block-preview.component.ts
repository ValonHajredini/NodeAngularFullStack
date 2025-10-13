import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormField, TextBlockMetadata } from '@nodeangularfullstack/shared';
import { InlineTextBlockEditorComponent } from './inline-text-block-editor.component';

/**
 * Text block preview component for form builder canvas.
 * Renders HTML content with inline rich text editing support.
 */
@Component({
  selector: 'app-text-block-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, InlineTextBlockEditorComponent],
  template: `
    <div
      (mousedown)="$event.stopPropagation()"
      (dragstart)="$event.stopPropagation()"
      style="pointer-events: auto;"
    >
      <app-inline-text-block-editor
        [content]="htmlContent"
        [fieldId]="field.id"
        [alignment]="metadata.alignment || 'left'"
        [backgroundColor]="metadata.backgroundColor"
        [padding]="metadata.padding || 'medium'"
        (contentChanged)="onContentChanged($event)"
        (click)="$event.stopPropagation()"
      />
    </div>
  `,
  styles: [],
})
export class TextBlockPreviewComponent {
  @Input({ required: true }) field!: FormField;
  @Output() contentChanged = new EventEmitter<string>();

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
   * Get HTML content for rendering
   */
  get htmlContent(): string {
    return this.metadata.content || '<p>Add your instructions here...</p>';
  }

  /**
   * Handle content change from inline editor
   */
  onContentChanged(newContent: string): void {
    this.contentChanged.emit(newContent);
  }
}
