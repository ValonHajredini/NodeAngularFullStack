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
 * Inline text block content editor component.
 * Allows users to click and edit text block content directly using a textarea.
 */
@Component({
  selector: 'app-inline-text-block-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="inline-text-block-editor"
      [class.editing]="isEditing"
      [style.text-align]="alignment"
      (click)="enterEditMode()"
    >
      @if (isEditing) {
        <textarea
          #contentTextarea
          [(ngModel)]="editedContent"
          (blur)="saveContent()"
          (keydown.escape)="cancelEdit(); $event.preventDefault()"
          (click)="$event.stopPropagation()"
          class="inline-text-block-textarea"
          rows="5"
          [attr.aria-label]="'Edit text block content'"
        ></textarea>
      } @else {
        <div
          class="text-block-display border rounded p-3"
          [style.background-color]="backgroundColor"
          [class.p-0]="padding === 'none'"
          [class.p-2]="padding === 'small'"
          [class.p-3]="padding === 'medium'"
          [class.p-6]="padding === 'large'"
        >
          <div class="text-sm text-gray-700 whitespace-pre-wrap">{{ displayContent }}</div>
          @if (isTruncated) {
            <p class="text-xs text-gray-500 mt-2 mb-0 flex items-center gap-1">
              <i class="pi pi-pencil"></i>
              <span>Click to edit...</span>
            </p>
          } @else {
            <div
              class="edit-hint opacity-0 text-xs text-gray-500 mt-2 mb-0 flex items-center gap-1"
            >
              <i class="pi pi-pencil"></i>
              <span>Click to edit</span>
            </div>
          }
        </div>
      }
      @if (showError) {
        <small class="p-error block mt-1">Content cannot be empty</small>
      }
    </div>
  `,
  styles: [
    `
      .inline-text-block-editor {
        cursor: pointer;
        display: block;
        width: 100%;
      }

      .inline-text-block-editor.editing {
        cursor: text;
      }

      .inline-text-block-textarea {
        border: 2px solid #3b82f6;
        outline: none;
        padding: 0.75rem;
        border-radius: 0.375rem;
        width: 100%;
        font-size: 0.875rem;
        line-height: 1.5;
        resize: vertical;
        min-height: 100px;
        max-height: 400px;
        background: white;
        font-family: inherit;
      }

      .text-block-display {
        position: relative;
        min-height: 60px;
        transition: all 0.2s;
      }

      .text-block-display:hover {
        background-color: rgba(59, 130, 246, 0.05) !important;
        border-color: #3b82f6 !important;
      }

      .text-block-display:hover .edit-hint {
        opacity: 1;
      }

      .edit-hint {
        transition: opacity 0.2s;
      }
    `,
  ],
})
export class InlineTextBlockEditorComponent {
  @Input({ required: true }) content!: string;
  @Input({ required: true }) fieldId!: string;
  @Input() alignment: 'left' | 'center' | 'right' | 'justify' = 'left';
  @Input() backgroundColor?: string;
  @Input() padding: 'none' | 'small' | 'medium' | 'large' = 'medium';
  @Output() contentChanged = new EventEmitter<string>();
  @ViewChild('contentTextarea') contentTextarea?: ElementRef<HTMLTextAreaElement>;

  isEditing = false;
  editedContent = '';
  originalContent = '';
  showError = false;
  private readonly maxPreviewLength = 150;

  /**
   * Get display content (truncated if too long)
   */
  get displayContent(): string {
    if (this.content.length <= this.maxPreviewLength) {
      return this.content;
    }
    return this.content.substring(0, this.maxPreviewLength);
  }

  /**
   * Check if content is truncated
   */
  get isTruncated(): boolean {
    return this.content.length > this.maxPreviewLength;
  }

  /**
   * Enters edit mode for the text block content.
   * Stores the original content and focuses the textarea.
   */
  enterEditMode(): void {
    if (this.isEditing) return;
    this.isEditing = true;
    this.editedContent = this.content;
    this.originalContent = this.content;
    this.showError = false;
    // Focus textarea after view update and adjust height
    setTimeout(() => {
      if (this.contentTextarea) {
        const textarea = this.contentTextarea.nativeElement;
        textarea.focus();
        textarea.select();
        // Auto-adjust height based on content
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 100), 400)}px`;
      }
    }, 0);
  }

  /**
   * Saves the edited text block content.
   * Validates that the content is not empty before emitting the change.
   */
  saveContent(): void {
    if (!this.editedContent.trim()) {
      // Validation: content cannot be empty
      this.showError = true;
      return;
    }

    this.showError = false;
    if (this.editedContent !== this.originalContent) {
      this.contentChanged.emit(this.editedContent);
    }
    this.isEditing = false;
  }

  /**
   * Cancels the edit and reverts to the original content.
   */
  cancelEdit(): void {
    this.editedContent = this.originalContent;
    this.isEditing = false;
    this.showError = false;
  }
}
