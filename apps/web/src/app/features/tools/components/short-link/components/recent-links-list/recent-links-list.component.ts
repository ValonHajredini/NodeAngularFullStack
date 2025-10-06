import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import type { ShortLink } from '@nodeangularfullstack/shared';
import { LinkItemCardComponent } from '../link-item-card/link-item-card.component';

/**
 * Reusable component to display a list of recent short links.
 */
@Component({
  selector: 'app-recent-links-list',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, TooltipModule, LinkItemCardComponent],
  template: `
    <p-card class="mt-4">
      <ng-template pTemplate="header">
        <div class="flex justify-between align-items-center p-3">
          <h3 class="text-base font-semibold text-gray-800 m-0">
            <i class="pi pi-history text-primary mr-2"></i>
            {{ title }}
          </h3>
          <p-button
            icon="pi pi-refresh"
            size="small"
            severity="secondary"
            (onClick)="onRefresh()"
            [pTooltip]="refreshTooltip"
            outlined="true"
          />
        </div>
      </ng-template>

      @if (links.length > 0) {
        <div class="links-container space-y-3">
          @for (link of links; track link.id) {
            <app-link-item-card
              [link]="link"
              [shortUrl]="generateShortUrl(link.code)"
              (copyLink)="onCopyLink(link.code)"
            />
          }
        </div>
      } @else {
        <div class="text-center py-8">
          <i class="pi pi-info-circle text-4xl text-gray-400 mb-4"></i>
          <h3 class="text-lg font-semibold text-gray-600 mb-2">{{ emptyTitle }}</h3>
          <p class="text-gray-500 mb-4">{{ emptyMessage }}</p>
          <p-button
            [label]="refreshButtonLabel"
            icon="pi pi-refresh"
            severity="secondary"
            (onClick)="onRefresh()"
            outlined="true"
          />
        </div>
      }
    </p-card>
  `,
  styles: [
    `
      .links-container {
        width: 100%;
      }

      .space-y-3 > * + * {
        margin-top: 0.75rem;
      }
    `,
  ],
})
export class RecentLinksListComponent {
  @Input() links: ShortLink[] = [];
  @Input() title = 'Recent Short Links';
  @Input() emptyTitle = 'No Recent Short Links';
  @Input() emptyMessage = 'Create your first short link above, or refresh to load existing links.';
  @Input() refreshTooltip = 'Refresh list';
  @Input() refreshButtonLabel = 'Refresh';

  @Input() urlGenerator: ((code: string) => string) | null = null;

  @Output() refresh = new EventEmitter<void>();
  @Output() copyLink = new EventEmitter<string>();

  onRefresh(): void {
    this.refresh.emit();
  }

  onCopyLink(code: string): void {
    this.copyLink.emit(code);
  }

  generateShortUrl(code: string): string {
    return this.urlGenerator ? this.urlGenerator(code) : '';
  }
}
