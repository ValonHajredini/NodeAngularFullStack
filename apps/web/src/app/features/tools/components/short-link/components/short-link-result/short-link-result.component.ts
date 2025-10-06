import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import type { ShortLink } from '@nodeangularfullstack/shared';
import { QrCodeDisplayComponent } from '../qr-code-display/qr-code-display.component';

/**
 * Reusable component to display the created short link result with QR code.
 */
@Component({
  selector: 'app-short-link-result',
  standalone: true,
  imports: [CommonModule, ButtonModule, DividerModule, TooltipModule, QrCodeDisplayComponent],
  template: `
    @if (shortLink) {
      <p-divider />
      <div class="result-section">
        <h3 class="text-base font-semibold text-gray-800 mb-3">
          <i class="pi pi-check-circle text-green-500 mr-2"></i>
          {{ title }}
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Short URL Section -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between align-items-center mb-2">
              <label class="text-sm font-medium text-gray-600">Short URL:</label>
              <p-button
                icon="pi pi-copy"
                size="small"
                severity="secondary"
                (onClick)="onCopy()"
                pTooltip="Copy to clipboard"
                outlined="true"
              />
            </div>
            <div class="flex align-items-center gap-2">
              <code class="flex-1 text-sm bg-white p-2 rounded border text-blue-600 font-mono">
                {{ generatedShortUrl }}
              </code>
            </div>

            <div class="mt-3 text-xs text-gray-500">
              <div>Original: {{ shortLink.originalUrl }}</div>
              @if (shortLink.expiresAt) {
                <div>Expires: {{ shortLink.expiresAt | date: 'medium' }}</div>
              }
            </div>
          </div>

          <!-- QR Code Section -->
          <app-qr-code-display [qrCodeDataUrl]="qrCodeDataUrl" (download)="onDownloadQR()" />
        </div>
      </div>
    }
  `,
  styles: [
    `
      .result-section {
        margin-top: 1rem;
      }
    `,
  ],
})
export class ShortLinkResultComponent {
  @Input() shortLink: ShortLink | null = null;
  @Input() generatedShortUrl = '';
  @Input() qrCodeDataUrl: string | null = null;
  @Input() title = 'Short Link Created';

  @Output() copyToClipboard = new EventEmitter<void>();
  @Output() downloadQR = new EventEmitter<void>();

  onCopy(): void {
    this.copyToClipboard.emit();
  }

  onDownloadQR(): void {
    this.downloadQR.emit();
  }
}
