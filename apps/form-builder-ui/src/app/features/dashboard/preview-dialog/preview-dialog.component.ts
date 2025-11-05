import { Component, Input, Output, EventEmitter, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { FormSchema, FormTheme } from '@nodeangularfullstack/shared';
import { FormRendererComponent } from '../../public/form-renderer/form-renderer.component';
import { ThemePreviewService } from '../theme-preview.service';
import { FormsApiService } from '../forms-api.service';

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
 * - Loads and applies theme from formSchema when dialog opens
 */
@Component({
  selector: 'app-preview-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, FormRendererComponent],
  templateUrl: './preview-dialog.component.html',
  styleUrls: ['./preview-dialog.component.scss'],
})
export class PreviewDialogComponent {
  private readonly themePreviewService = inject(ThemePreviewService);
  private readonly formsApiService = inject(FormsApiService);

  /**
   * Controls dialog visibility
   */
  @Input() visible = false;

  /**
   * Form schema to preview (in-memory, includes unsaved changes)
   */
  private readonly formSchemaSignal = signal<FormSchema | null>(null);

  @Input()
  set formSchema(value: FormSchema | null) {
    this.formSchemaSignal.set(value);
  }

  get formSchema(): FormSchema | null {
    return this.formSchemaSignal();
  }

  /**
   * Emitted when dialog is closed
   */
  @Output() onClose = new EventEmitter<void>();

  constructor() {
    // Watch for theme changes and apply when dialog opens
    effect(() => {
      const schema = this.formSchemaSignal();
      const themeId = schema?.settings?.themeId;

      if (this.visible && themeId) {
        this.loadAndApplyTheme(themeId);
      } else if (this.visible && !themeId) {
        // No theme selected - clear theme CSS to use defaults
        this.themePreviewService.clearThemeCss();
      }
    });
  }

  /**
   * Loads theme from API and applies CSS variables.
   * @param themeId - The ID of the theme to load
   * @private
   */
  private loadAndApplyTheme(themeId: string): void {
    this.formsApiService.getTheme(themeId).subscribe({
      next: (theme: FormTheme) => {
        this.themePreviewService.applyThemeCss(theme);
      },
      error: (err: Error) => {
        console.warn('Failed to load theme for preview, using defaults', err);
        this.themePreviewService.clearThemeCss();
      },
    });
  }
}
