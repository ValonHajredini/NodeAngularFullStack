import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Inline heading text editor component.
 * Allows users to click and edit heading text directly in the form canvas.
 */
@Component({
  selector: 'app-inline-heading-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="inline-heading-editor"
      [class.editing]="isEditing"
      [style.text-align]="alignment"
      (click)="enterEditMode()"
    >
      @if (isEditing) {
        <input
          #headingInput
          type="text"
          [(ngModel)]="editedText"
          (blur)="saveText()"
          (keydown.enter)="saveText(); $event.preventDefault()"
          (keydown.escape)="cancelEdit(); $event.preventDefault()"
          (click)="$event.stopPropagation()"
          class="inline-heading-input"
          [class]="getInputClass()"
          [attr.aria-label]="'Edit heading text'"
        />
      } @else {
        <div class="heading-text-display" [class]="getDisplayClass()">
          <span>{{ text }}</span>
          <i class="pi pi-pencil text-xs ml-2 text-gray-400 edit-icon"></i>
        </div>
      }
      @if (showError) {
        <small class="p-error block mt-1">Heading text cannot be empty</small>
      }
    </div>
  `,
  styles: [
    `
      .inline-heading-editor {
        cursor: pointer;
        display: block;
        width: 100%;
      }

      .inline-heading-editor.editing {
        cursor: text;
      }

      .inline-heading-input {
        border: 2px solid #3b82f6;
        outline: none;
        padding: 0.5rem;
        border-radius: 0.375rem;
        width: 100%;
        font-weight: bold;
        background: white;
      }

      .inline-heading-input.h1-input {
        font-size: 2.25rem;
        line-height: 1.2;
      }

      .inline-heading-input.h2-input {
        font-size: 1.875rem;
        line-height: 1.2;
      }

      .inline-heading-input.h3-input {
        font-size: 1.5rem;
        line-height: 1.2;
      }

      .inline-heading-input.h4-input {
        font-size: 1.25rem;
        line-height: 1.2;
      }

      .inline-heading-input.h5-input {
        font-size: 1.125rem;
        line-height: 1.2;
      }

      .inline-heading-input.h6-input {
        font-size: 1rem;
        line-height: 1.2;
      }

      .heading-text-display {
        font-weight: bold;
        margin: 0;
        padding: 0.5rem 0;
        line-height: 1.2;
        display: flex;
        align-items: center;
      }

      .heading-text-display.h1-display {
        font-size: 2.25rem;
      }

      .heading-text-display.h2-display {
        font-size: 1.875rem;
      }

      .heading-text-display.h3-display {
        font-size: 1.5rem;
      }

      .heading-text-display.h4-display {
        font-size: 1.25rem;
      }

      .heading-text-display.h5-display {
        font-size: 1.125rem;
      }

      .heading-text-display.h6-display {
        font-size: 1rem;
      }

      .edit-icon {
        opacity: 0;
        transition: opacity 0.2s;
      }

      .heading-text-display:hover .edit-icon {
        opacity: 1;
        color: #3b82f6;
      }
    `,
  ],
})
export class InlineHeadingEditorComponent {
  @Input({ required: true }) text!: string;
  @Input({ required: true }) fieldId!: string;
  @Input() headingLevel: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' = 'h2';
  @Input() alignment: 'left' | 'center' | 'right' = 'left';
  @Output() textChanged = new EventEmitter<string>();
  @ViewChild('headingInput') headingInput?: ElementRef<HTMLInputElement>;

  isEditing = false;
  editedText = '';
  originalText = '';
  showError = false;

  /**
   * Get CSS class for input based on heading level
   */
  getInputClass(): string {
    return `${this.headingLevel}-input`;
  }

  /**
   * Get CSS class for display text based on heading level
   */
  getDisplayClass(): string {
    return `${this.headingLevel}-display`;
  }

  /**
   * Enters edit mode for the heading text.
   * Stores the original text value and focuses the input.
   */
  enterEditMode(): void {
    if (this.isEditing) return;
    this.isEditing = true;
    this.editedText = this.text;
    this.originalText = this.text;
    this.showError = false;
    // Focus input after view update
    setTimeout(() => {
      this.headingInput?.nativeElement.focus();
      this.headingInput?.nativeElement.select();
    }, 0);
  }

  /**
   * Saves the edited heading text.
   * Validates that the text is not empty before emitting the change.
   */
  saveText(): void {
    if (!this.editedText.trim()) {
      // Validation: heading text cannot be empty
      this.showError = true;
      return;
    }

    this.showError = false;
    if (this.editedText !== this.originalText) {
      this.textChanged.emit(this.editedText);
    }
    this.isEditing = false;
  }

  /**
   * Cancels the edit and reverts to the original text.
   */
  cancelEdit(): void {
    this.editedText = this.originalText;
    this.isEditing = false;
    this.showError = false;
  }
}
