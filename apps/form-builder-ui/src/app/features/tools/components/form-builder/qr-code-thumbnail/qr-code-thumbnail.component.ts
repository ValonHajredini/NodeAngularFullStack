import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

/**
 * QR code thumbnail click event interface
 */
export interface QrCodeThumbnailAction {
  type: 'view' | 'download';
  qrCodeUrl: string;
  formTitle: string;
}

/**
 * Reusable QR code thumbnail component for displaying small QR codes
 * in form cards with click-to-expand functionality.
 *
 * Features:
 * - 64x64px thumbnail display
 * - Lazy loading for performance
 * - Error handling with fallback placeholder
 * - Hover overlay with expand icon
 * - Accessible alt text and ARIA labels
 *
 * @example
 * ```html
 * <app-qr-code-thumbnail
 *   [qrCodeUrl]="form.qrCodeUrl"
 *   [formTitle]="form.title"
 *   (thumbnailClick)="openQrCodeModal($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-qr-code-thumbnail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule, TooltipModule],
  template: `
    <div
      class="qr-thumbnail-container relative group cursor-pointer"
      (click)="onThumbnailClick()"
      (keydown.enter)="onThumbnailClick()"
      (keydown.space)="onThumbnailClick()"
      tabindex="0"
      role="button"
      [attr.aria-label]="getAriaLabel()"
      [pTooltip]="getTooltipText()"
      tooltipPosition="top"
    >
      <!-- QR Code Image -->
      @if (!imageError() && qrCodeUrl) {
        <img
          [src]="qrCodeUrl"
          [alt]="'QR code for ' + formTitle"
          class="qr-thumbnail w-16 h-16 border border-gray-200 rounded object-contain bg-white"
          loading="lazy"
          (error)="onImageError()"
          aria-hidden="true"
        />
      }

      <!-- Error/Placeholder Icon -->
      @if (imageError() || !qrCodeUrl) {
        <div
          class="qr-thumbnail w-16 h-16 border border-gray-200 rounded bg-gray-50 flex items-center justify-center"
          aria-hidden="true"
        >
          <i class="pi pi-qrcode text-gray-400 text-lg" aria-hidden="true"></i>
        </div>
      }

      <!-- Hover Overlay -->
      <div
        class="qr-overlay absolute inset-0 bg-black bg-opacity-50 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        aria-hidden="true"
      >
        <i class="pi pi-expand text-white text-lg" aria-hidden="true"></i>
      </div>
    </div>
  `,
  styles: [
    `
      .qr-thumbnail-container {
        display: inline-block;
        position: relative;
      }

      .qr-thumbnail-container:hover .qr-overlay {
        opacity: 1;
      }

      .qr-thumbnail {
        display: block;
        transition: transform 0.2s ease;
      }

      .qr-thumbnail-container:hover .qr-thumbnail {
        transform: scale(1.02);
      }

      .qr-overlay {
        transition: opacity 0.2s ease;
        border-radius: inherit;
      }

      /* Focus styles for accessibility */
      .qr-thumbnail-container:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
        border-radius: 4px;
      }

      /* Screen reader only class */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `,
  ],
})
export class QrCodeThumbnailComponent {
  @Input({ required: true }) qrCodeUrl!: string;
  @Input({ required: true }) formTitle!: string;
  @Output() thumbnailClick = new EventEmitter<QrCodeThumbnailAction>();

  // Track image loading errors for fallback display
  readonly imageError = signal<boolean>(false);

  /**
   * Handles thumbnail click to emit view action
   */
  onThumbnailClick(): void {
    this.thumbnailClick.emit({
      type: 'view',
      qrCodeUrl: this.qrCodeUrl,
      formTitle: this.formTitle,
    });
  }

  /**
   * Handles image load errors by showing fallback placeholder
   */
  onImageError(): void {
    this.imageError.set(true);
  }

  /**
   * Gets appropriate tooltip text based on QR code availability
   */
  getTooltipText(): string {
    if (!this.qrCodeUrl || this.imageError()) {
      return 'QR code unavailable';
    }
    return `Click to view QR code for ${this.formTitle}`;
  }

  /**
   * Gets appropriate ARIA label for accessibility
   */
  getAriaLabel(): string {
    if (!this.qrCodeUrl || this.imageError()) {
      return `QR code unavailable for form: ${this.formTitle}`;
    }
    return `QR code for form: ${this.formTitle}. Click to view full size.`;
  }
}
