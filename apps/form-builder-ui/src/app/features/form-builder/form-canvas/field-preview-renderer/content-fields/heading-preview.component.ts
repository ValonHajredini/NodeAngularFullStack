import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormField, HeadingMetadata } from '@nodeangularfullstack/shared';
import { InlineHeadingEditorComponent } from '../editors/inline-heading-editor.component';

/**
 * Heading preview component for form builder canvas.
 * Renders a heading with configurable level, alignment, color, and weight.
 * Supports inline editing of heading text.
 */
@Component({
  selector: 'app-heading-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, InlineHeadingEditorComponent],
  template: `
    <div
      class="heading-preview"
      [style.color]="metadata.color || 'inherit'"
      [style.font-weight]="metadata.fontWeight || 'bold'"
    >
      <app-inline-heading-editor
        [text]="field.label"
        [fieldId]="field.id"
        [headingLevel]="metadata.headingLevel || 'h2'"
        [alignment]="metadata.alignment || 'left'"
        (textChanged)="onHeadingTextChanged($event)"
        (click)="$event.stopPropagation()"
        style="pointer-events: auto;"
      />
    </div>
  `,
  styleUrls: ['./heading-preview.component.scss'],
})
export class HeadingPreviewComponent {
  @Input({ required: true }) field!: FormField;
  @Output() headingTextChanged = new EventEmitter<string>();

  /**
   * Get heading metadata with type safety
   */
  get metadata(): HeadingMetadata {
    return (
      (this.field.metadata as HeadingMetadata | undefined) ?? {
        headingLevel: 'h2',
        alignment: 'left',
        fontWeight: 'bold',
      }
    );
  }

  /**
   * Handle heading text change from inline editor
   */
  onHeadingTextChanged(newText: string): void {
    this.headingTextChanged.emit(newText);
  }
}
