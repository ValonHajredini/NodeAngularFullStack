import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { FormSchema } from '@nodeangularfullstack/shared';
import { FormRendererComponent } from '../../../../public/form-renderer/form-renderer.component';

/**
 * Preview Dialog Component
 *
 * Wrapper component that embeds FormRendererComponent in preview mode.
 * Displays form preview in a modal dialog without saving or navigating away.
 *
 * Features:
 * - Shows "Preview Mode" badge with helpful hint
 * - Passes in-memory schema (includes unsaved changes)
 * - Prevents form submission in preview mode
 * - Close button returns to builder
 */
@Component({
  selector: 'app-preview-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, FormRendererComponent],
  templateUrl: './preview-dialog.component.html',
  styleUrls: ['./preview-dialog.component.scss'],
})
export class PreviewDialogComponent {
  /**
   * Controls dialog visibility
   */
  @Input() visible = false;

  /**
   * Form schema to preview (in-memory, includes unsaved changes)
   */
  @Input() formSchema: FormSchema | null = null;

  /**
   * Emitted when dialog is closed
   */
  @Output() onClose = new EventEmitter<void>();
}
