import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Inline label editor component for form fields.
 * Allows users to click and edit field labels directly in the form canvas.
 */
@Component({
  selector: 'app-inline-label-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="inline-label-editor" [class.editing]="isEditing" (click)="enterEditMode()">
      @if (isEditing) {
        <input
          #labelInput
          type="text"
          [(ngModel)]="editedLabel"
          (blur)="saveLabel()"
          (keydown.enter)="saveLabel(); $event.preventDefault()"
          (keydown.escape)="cancelEdit(); $event.preventDefault()"
          (click)="$event.stopPropagation()"
          class="inline-label-input theme-input"
          [attr.aria-label]="'Edit label for ' + originalLabel"
        />
      } @else {
        <label class="field-label theme-label">
          {{ label }}
          <i class="pi pi-pencil text-xs ml-2 text-gray-400"></i>
        </label>
      }
      @if (showError) {
        <small class="p-error block mt-1">Label cannot be empty</small>
      }
    </div>
  `,
  styles: [
    `
      .inline-label-editor {
        cursor: pointer;
        display: inline-block;
        width: 100%;
      }
      .inline-label-editor.editing {
        cursor: text;
      }
      .inline-label-input {
        outline: none;
        padding: 0.5rem;
        font-weight: 500;
        width: 100%;
        font-size: 0.875rem;
      }
      .field-label {
        display: block;
        font-weight: 500;
        padding: 0;
        font-size: 0.875rem;
      }
      .field-label:hover .pi-pencil {
        opacity: 0.7;
      }
    `,
  ],
})
export class InlineLabelEditorComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) fieldId!: string;
  @Output() labelChanged = new EventEmitter<string>();
  @ViewChild('labelInput') labelInput?: ElementRef<HTMLInputElement>;

  isEditing = false;
  editedLabel = '';
  originalLabel = '';
  showError = false;

  /**
   * Enters edit mode for the label.
   * Stores the original label value and focuses the input.
   */
  enterEditMode(): void {
    if (this.isEditing) return;
    this.isEditing = true;
    this.editedLabel = this.label;
    this.originalLabel = this.label;
    this.showError = false;
    // Focus input after view update
    setTimeout(() => {
      this.labelInput?.nativeElement.focus();
      this.labelInput?.nativeElement.select();
    }, 0);
  }

  /**
   * Saves the edited label.
   * Validates that the label is not empty before emitting the change.
   */
  saveLabel(): void {
    if (!this.editedLabel.trim()) {
      // Validation: label cannot be empty
      this.showError = true;
      return;
    }

    this.showError = false;
    if (this.editedLabel !== this.originalLabel) {
      this.labelChanged.emit(this.editedLabel);
    }
    this.isEditing = false;
  }

  /**
   * Cancels the edit and reverts to the original label.
   */
  cancelEdit(): void {
    this.editedLabel = this.originalLabel;
    this.isEditing = false;
    this.showError = false;
  }
}
