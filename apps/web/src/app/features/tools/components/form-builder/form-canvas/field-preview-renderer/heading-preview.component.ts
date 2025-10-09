import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormField, HeadingMetadata } from '@nodeangularfullstack/shared';

/**
 * Heading preview component for form builder canvas.
 * Renders a heading with configurable level, alignment, color, and weight.
 */
@Component({
  selector: 'app-heading-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="heading-preview" [style.text-align]="metadata.alignment || 'left'">
      @switch (metadata.headingLevel || 'h2') {
        @case ('h1') {
          <h1
            class="text-4xl mb-0"
            [style.color]="metadata.color || 'inherit'"
            [style.font-weight]="metadata.fontWeight || 'bold'"
          >
            {{ field.label }}
          </h1>
        }
        @case ('h2') {
          <h2
            class="text-3xl mb-0"
            [style.color]="metadata.color || 'inherit'"
            [style.font-weight]="metadata.fontWeight || 'bold'"
          >
            {{ field.label }}
          </h2>
        }
        @case ('h3') {
          <h3
            class="text-2xl mb-0"
            [style.color]="metadata.color || 'inherit'"
            [style.font-weight]="metadata.fontWeight || 'bold'"
          >
            {{ field.label }}
          </h3>
        }
        @case ('h4') {
          <h4
            class="text-xl mb-0"
            [style.color]="metadata.color || 'inherit'"
            [style.font-weight]="metadata.fontWeight || 'bold'"
          >
            {{ field.label }}
          </h4>
        }
        @case ('h5') {
          <h5
            class="text-lg mb-0"
            [style.color]="metadata.color || 'inherit'"
            [style.font-weight]="metadata.fontWeight || 'bold'"
          >
            {{ field.label }}
          </h5>
        }
        @case ('h6') {
          <h6
            class="text-base mb-0"
            [style.color]="metadata.color || 'inherit'"
            [style.font-weight]="metadata.fontWeight || 'bold'"
          >
            {{ field.label }}
          </h6>
        }
      }
    </div>
  `,
  styles: [
    `
      .heading-preview {
        padding: 0.5rem 0;
      }

      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        margin: 0;
        line-height: 1.2;
      }
    `,
  ],
})
export class HeadingPreviewComponent {
  @Input({ required: true }) field!: FormField;

  /**
   * Get heading metadata with type safety
   */
  get metadata(): HeadingMetadata {
    return (
      (this.field.metadata as HeadingMetadata) || {
        headingLevel: 'h2',
        alignment: 'left',
        fontWeight: 'bold',
      }
    );
  }
}
