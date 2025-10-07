import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Reusable QR code display component with download functionality.
 * Supports both storage URLs and base64 data URLs for backwards compatibility.
 */
@Component({
  selector: 'app-qr-code-display',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  template: `
    @if (qrCodeUrl || qrCodeDataUrl) {
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="flex justify-between align-items-center mb-3">
          <label class="text-sm font-medium text-gray-600">{{ label }}</label>
          <p-button
            icon="pi pi-download"
            size="small"
            severity="secondary"
            (onClick)="onDownload()"
            [pTooltip]="downloadTooltip"
            outlined="true"
          />
        </div>
        <div class="flex justify-center">
          <img [src]="displayUrl" [alt]="altText" [class]="imageClass" />
        </div>
        <div class="mt-2 text-xs text-gray-500 text-center">
          {{ helperText }}
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class QrCodeDisplayComponent {
  @Input() qrCodeUrl: string | null = null; // Storage URL (preferred)
  @Input() qrCodeDataUrl: string | null = null; // Base64 data URL (backwards compatibility)
  @Input() label = 'QR Code:';
  @Input() altText = 'QR Code';
  @Input() helperText = 'Scan to open link';
  @Input() downloadTooltip = 'Download QR Code';
  @Input() imageClass = 'w-48 h-48 border border-gray-200 rounded';

  @Output() download = new EventEmitter<void>();

  /**
   * Returns the appropriate URL to display (prefers storage URL over data URL).
   */
  get displayUrl(): string | null {
    return this.qrCodeUrl || this.qrCodeDataUrl;
  }

  onDownload(): void {
    this.download.emit();
  }
}
