import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { InputText } from 'primeng/inputtext';
import { FormMetadata, FormStatus } from '@nodeangularfullstack/shared';
import {
  QrCodeThumbnailComponent,
  QrCodeThumbnailAction,
} from '../qr-code-thumbnail/qr-code-thumbnail.component';

/**
 * Form card action events
 */
export interface FormCardAction {
  type: 'edit' | 'analytics' | 'delete' | 'copy-url' | 'view-qr';
  formId: string;
  renderToken?: string;
  qrCodeUrl?: string;
  formTitle?: string;
}

/**
 * Reusable form card component for displaying form metadata
 * with actions like edit, analytics, delete, copy URL, and QR code viewing.
 *
 * Features:
 * - Displays form title, description, and metadata
 * - Shows publication status and public URL for published forms
 * - Includes QR code thumbnail for published forms with QR codes
 * - Provides action buttons for editing, analytics, and deletion
 * - Responsive layout that adapts to different screen sizes
 *
 * @example
 * ```html
 * <app-form-card
 *   [form]="formMetadata"
 *   (action)="handleAction($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-form-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonDirective, Tag, InputText, DatePipe, QrCodeThumbnailComponent],
  template: `
    <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
      <!-- Status Badge -->
      <div class="flex items-center justify-between mb-3">
        <p-tag
          [value]="form.status === FormStatus.PUBLISHED ? 'Published' : 'Draft'"
          [severity]="form.status === FormStatus.PUBLISHED ? 'success' : 'warning'"
        ></p-tag>
        <span class="text-xs text-gray-500">
          {{ form.updatedAt | date: 'MMM d, yyyy' }}
        </span>
      </div>

      <!-- Form Title -->
      <h3 class="text-lg font-semibold text-gray-900 mb-2 truncate" [title]="form.title">
        {{ form.title }}
      </h3>

      <!-- Form Description -->
      <p class="text-sm text-gray-600 mb-4 line-clamp-2" [title]="form.description">
        {{ form.description || 'No description' }}
      </p>

      <!-- Form Stats -->
      <div class="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <span>
          <i class="pi pi-list mr-1"></i>
          {{ form.schema?.fields?.length || 0 }} fields
        </span>
        <span>
          <i class="pi pi-clock mr-1"></i>
          {{ form.createdAt | date: 'short' }}
        </span>
      </div>

      <!-- Publish URL and QR Code (for published forms) -->
      @if (form.status === FormStatus.PUBLISHED && form.schema?.renderToken) {
        <div class="mb-3">
          <label class="block text-xs font-semibold text-gray-700 mb-1"> Public Form URL </label>
          <div class="flex gap-2 items-center">
            <input
              type="text"
              pInputText
              [value]="getPublishUrl(form.schema?.renderToken ?? '')"
              readonly
              class="flex-1 text-xs"
            />
            <button
              pButton
              icon="pi pi-copy"
              size="small"
              severity="secondary"
              [outlined]="true"
              (click)="onCopyUrl(form.schema?.renderToken ?? '')"
              title="Copy URL"
            ></button>
            <!-- QR Code Thumbnail -->
            @if (form.qrCodeUrl) {
              <app-qr-code-thumbnail
                [qrCodeUrl]="form.qrCodeUrl"
                [formTitle]="form.title"
                (thumbnailClick)="onQrCodeThumbnailClick($event)"
              />
            }
          </div>
        </div>
      }

      <!-- Actions -->
      <div class="flex gap-2 justify-end">
        <button
          pButton
          icon="pi pi-chart-bar"
          size="small"
          severity="info"
          [outlined]="true"
          (click)="onAnalytics()"
          [disabled]="form.status !== FormStatus.PUBLISHED"
          [attr.data-testid]="'analytics-btn'"
          title="Analytics"
        ></button>
        <button
          pButton
          icon="pi pi-pencil"
          size="small"
          severity="secondary"
          [outlined]="true"
          (click)="onEdit()"
          title="Edit"
        ></button>
        <button
          pButton
          icon="pi pi-trash"
          size="small"
          severity="danger"
          [outlined]="true"
          (click)="onDelete()"
          [disabled]="form.status === FormStatus.PUBLISHED"
          title="Delete"
        ></button>
      </div>

      @if (form.status === FormStatus.PUBLISHED) {
        <small class="text-xs text-gray-500 mt-2 block"> Published forms cannot be deleted </small>
      }
    </div>
  `,
  styles: [
    `
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class FormCardComponent {
  @Input({ required: true }) form!: FormMetadata;
  @Output() action = new EventEmitter<FormCardAction>();

  readonly FormStatus = FormStatus;

  /**
   * Gets the full publish URL for a given render token.
   * Prefers short URL over JWT token URL for better user experience.
   */
  getPublishUrl(renderToken: string): string {
    const baseUrl = window.location.origin;

    // If form has a short code, use the short URL
    if (this.form.shortCode) {
      return `${baseUrl}/public/form/${this.form.shortCode}`;
    }

    // Fallback to JWT token URL for backward compatibility
    return `${baseUrl}/forms/render/${renderToken}`;
  }

  /**
   * Emits edit action
   */
  onEdit(): void {
    this.action.emit({ type: 'edit', formId: this.form.id });
  }

  /**
   * Emits analytics action
   */
  onAnalytics(): void {
    this.action.emit({ type: 'analytics', formId: this.form.id });
  }

  /**
   * Emits delete action
   */
  onDelete(): void {
    this.action.emit({ type: 'delete', formId: this.form.id });
  }

  /**
   * Emits copy URL action with the displayed URL (prefers short URL)
   */
  onCopyUrl(renderToken: string): void {
    // Get the actual URL displayed in the input (prefers short URL over JWT token URL)
    const urlToCopy = this.getPublishUrl(renderToken);

    this.action.emit({
      type: 'copy-url',
      formId: this.form.id,
      renderToken: urlToCopy, // Send the full URL instead of just the token
    });
  }

  /**
   * Handles QR code thumbnail click to emit view-qr action
   */
  onQrCodeThumbnailClick(action: QrCodeThumbnailAction): void {
    this.action.emit({
      type: 'view-qr',
      formId: this.form.id,
      qrCodeUrl: action.qrCodeUrl,
      formTitle: action.formTitle,
    });
  }
}
