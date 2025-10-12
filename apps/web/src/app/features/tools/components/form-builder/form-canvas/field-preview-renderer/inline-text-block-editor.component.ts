import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Inline text block content editor component.
 * Allows users to click and edit text block content directly using a rich text editor.
 */
@Component({
  selector: 'app-inline-text-block-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, QuillModule],
  template: `
    <div
      class="inline-text-block-editor"
      [class.editing]="isEditing()"
      [style.text-align]="alignment"
      (click)="enterEditMode()"
    >
      @if (isEditing()) {
        <div
          class="inline-editor-wrapper"
          (click)="$event.stopPropagation()"
          (mousedown)="preventDrag($event)"
          (dragstart)="preventDrag($event)"
          draggable="false"
        >
          <quill-editor
            [(ngModel)]="editedContent"
            [modules]="quillModules"
            [styles]="quillStyles"
            (click)="$event.stopPropagation()"
            (mousedown)="preventDrag($event)"
            (dragstart)="preventDrag($event)"
            placeholder="Write your text here..."
          ></quill-editor>
          <div class="editor-actions flex gap-2 mt-2">
            <button
              type="button"
              class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              (click)="saveContent(); $event.stopPropagation()"
            >
              Save
            </button>
            <button
              type="button"
              class="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              (click)="cancelEdit(); $event.stopPropagation()"
            >
              Cancel
            </button>
          </div>
        </div>
      } @else {
        <div
          class="text-block-display border rounded p-3"
          [style.background-color]="backgroundColor"
          [class.p-0]="padding === 'none'"
          [class.p-2]="padding === 'small'"
          [class.p-3]="padding === 'medium'"
          [class.p-6]="padding === 'large'"
        >
          <div
            class="text-sm text-gray-700 prose prose-sm max-w-none"
            [innerHTML]="sanitizedContent"
          ></div>
          <div class="edit-hint opacity-0 text-xs text-gray-500 mt-2 mb-0 flex items-center gap-1">
            <i class="pi pi-pencil"></i>
            <span>Click to edit</span>
          </div>
        </div>
      }
      @if (showError()) {
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
        cursor: default;
      }

      .inline-editor-wrapper {
        border: 2px solid #3b82f6;
        border-radius: 0.375rem;
        background: white;
        padding: 0;
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        cursor: text;
      }

      .inline-editor-wrapper * {
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
      }

      .text-block-display {
        position: relative;
        min-height: 60px;
        transition: all 0.2s;
        overflow: hidden;
        word-wrap: break-word;
        overflow-wrap: break-word;
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

      .editor-actions {
        padding: 0.5rem;
        border-top: 1px solid #e5e7eb;
      }

      .text-block-display .prose {
        overflow-wrap: break-word;
        word-break: break-word;
      }

      .text-block-display .prose * {
        max-width: 100%;
      }

      .text-block-display .prose p,
      .text-block-display .prose li,
      .text-block-display .prose div {
        overflow-wrap: break-word;
        word-break: break-word;
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

  protected readonly isEditing = signal(false);
  protected readonly showError = signal(false);
  protected editedContent = '';
  private originalContent = '';

  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Quill editor configuration with formatting toolbar
   */
  protected readonly quillModules = {
    toolbar: [
      [{ size: ['small', false, 'large', 'huge'] }], // Font Size
      ['bold', 'italic', 'underline', 'strike'], // Bold, Italic, Underline, Strikethrough
      ['link'], // Link
      [{ list: 'ordered' }, { list: 'bullet' }], // Ordered List, Bullet List
    ],
  };

  /**
   * Quill editor styles for inline editing
   */
  protected readonly quillStyles = {
    minHeight: '150px',
    maxHeight: '300px',
    overflowY: 'auto',
  };

  /**
   * Get sanitized HTML content for display
   */
  get sanitizedContent(): SafeHtml {
    return this.sanitizer.sanitize(1, this.content) || '';
  }

  /**
   * Enters edit mode for the text block content.
   * Stores the original content.
   */
  enterEditMode(): void {
    if (this.isEditing()) return;
    this.isEditing.set(true);
    this.editedContent = this.content;
    this.originalContent = this.content;
    this.showError.set(false);
  }

  /**
   * Saves the edited text block content.
   * Validates that the content is not empty before emitting the change.
   */
  saveContent(): void {
    // Remove HTML tags to check if there's actual content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.editedContent;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';

    if (!textContent.trim()) {
      // Validation: content cannot be empty
      this.showError.set(true);
      return;
    }

    this.showError.set(false);
    if (this.editedContent !== this.originalContent) {
      this.contentChanged.emit(this.editedContent);
    }
    this.isEditing.set(false);
  }

  /**
   * Cancels the edit and reverts to the original content.
   */
  cancelEdit(): void {
    this.editedContent = this.originalContent;
    this.isEditing.set(false);
    this.showError.set(false);
  }

  /**
   * Prevents drag events from interfering with text selection in the editor.
   * Stops propagation of mousedown and dragstart events.
   */
  preventDrag(event: Event): void {
    event.stopPropagation();
  }
}
