import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import type { ShortLink } from '@nodeangularfullstack/shared';

/**
 * Reusable component to display a single short link item in a card format.
 */
@Component({
  selector: 'app-link-item-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, TooltipModule],
  template: `
    <div
      class="link-item bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div class="space-y-3">
        <!-- Short URL Section -->
        <div class="flex align-items-center justify-between gap-3">
          <div class="flex align-items-center gap-2 min-w-0 flex-1">
            <i class="pi pi-link text-blue-500 flex-shrink-0"></i>
            <code class="text-sm text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded truncate">
              {{ shortUrl }}
            </code>
          </div>
          <p-button
            icon="pi pi-copy"
            size="small"
            severity="secondary"
            (onClick)="onCopy()"
            pTooltip="Copy to clipboard"
            outlined="true"
          />
        </div>

        <!-- Original URL Section -->
        <div class="flex align-items-center gap-2">
          <i class="pi pi-external-link text-gray-400 flex-shrink-0"></i>
          <a
            [href]="link.originalUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-gray-600 hover:text-blue-600 transition-colors min-w-0 flex-1 truncate-url"
            [title]="link.originalUrl"
          >
            {{ getTruncatedUrl(link.originalUrl) }}
          </a>
        </div>

        <!-- Metadata Section -->
        <div class="flex align-items-center justify-between">
          <div class="flex align-items-center gap-4">
            <span class="text-xs text-gray-500">
              <i class="pi pi-calendar mr-1"></i>
              {{ link.createdAt | date: 'short' }}
            </span>
            <span class="text-xs text-gray-500">
              <i class="pi pi-eye mr-1"></i>
              {{ link.clickCount || 0 }} clicks
            </span>
          </div>
          @if (link.expiresAt) {
            <p-tag [value]="expirationStatus" [severity]="expirationSeverity" size="small" />
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .link-item {
        width: 100%;
        box-sizing: border-box;
      }

      .truncate {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .truncate-url {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-decoration: none;
      }

      .truncate-url:hover {
        text-decoration: underline;
      }

      .space-y-3 > * + * {
        margin-top: 0.75rem;
      }
    `,
  ],
})
export class LinkItemCardComponent {
  @Input() link!: ShortLink;
  @Input() shortUrl = '';
  @Input() maxUrlLength = 80;

  @Output() copyLink = new EventEmitter<void>();

  get expirationStatus(): string {
    if (!this.link.expiresAt) return 'Active';

    const expiry = new Date(this.link.expiresAt);
    const now = new Date();
    const isExpired = expiry < now;

    if (isExpired) {
      return 'Expired';
    }

    const diffHours = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours <= 24) {
      return 'Expires Soon';
    }

    return 'Active';
  }

  get expirationSeverity(): 'success' | 'warning' | 'danger' {
    if (!this.link.expiresAt) return 'success';

    const expiry = new Date(this.link.expiresAt);
    const now = new Date();
    const isExpired = expiry < now;

    if (isExpired) {
      return 'danger';
    }

    const diffHours = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours <= 24) {
      return 'warning';
    }

    return 'success';
  }

  getTruncatedUrl(url: string): string {
    if (url.length <= this.maxUrlLength) {
      return url;
    }
    return url.substring(0, this.maxUrlLength) + '...';
  }

  onCopy(): void {
    this.copyLink.emit();
  }
}
