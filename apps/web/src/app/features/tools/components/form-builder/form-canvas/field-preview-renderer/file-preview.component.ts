import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUpload } from 'primeng/fileupload';
import { FormField } from '@nodeangularfullstack/shared';

/**
 * File upload preview component for FILE field type.
 * Renders a disabled PrimeNG file upload matching the published form appearance.
 */
@Component({
  selector: 'app-file-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FileUpload],
  template: `
    <div class="field-preview">
      <p-fileupload
        mode="basic"
        [disabled]="true"
        [chooseLabel]="field.placeholder || 'Choose File'"
        styleClass="w-full"
        [attr.aria-label]="field.label"
        [attr.aria-required]="field.required"
      ></p-fileupload>
      @if (field.validation) {
        <div class="mt-1 text-xs text-gray-400">
          @if (
            field.validation.acceptedFileTypes && field.validation.acceptedFileTypes.length > 0
          ) {
            <span>Accepted: {{ field.validation.acceptedFileTypes.join(', ') }}</span>
          }
          @if (field.validation.maxFileSize) {
            <span class="ml-2">Max size: {{ formatFileSize(field.validation.maxFileSize) }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .field-preview {
        pointer-events: none;
      }
    `,
  ],
})
export class FilePreviewComponent {
  @Input({ required: true }) field!: FormField;

  /**
   * Formats file size from bytes to human-readable format.
   * @param bytes - File size in bytes
   * @returns Formatted file size string (e.g., "2 MB")
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
