import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';
import { FormTheme } from '@nodeangularfullstack/shared';

/**
 * Component for displaying individual theme cards in the theme dropdown.
 * Shows theme thumbnail, name, and usage count with lazy loading support.
 */
@Component({
  selector: 'app-theme-card',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="theme-card"
      [class.active]="isActive"
      (click)="selected.emit(theme)"
      role="button"
      tabindex="0"
      [attr.aria-label]="'Select ' + theme.name + ' theme'"
    >
      <div class="theme-thumbnail">
        <img
          *ngIf="imageLoaded; else skeleton"
          [src]="theme.thumbnailUrl"
          [alt]="theme.name"
          (load)="imageLoaded = true"
          loading="lazy"
        />
        <ng-template #skeleton>
          <p-skeleton width="100%" height="160px" />
        </ng-template>
      </div>
      <div class="theme-info">
        <h4 class="theme-name">{{ theme.name }}</h4>
        <span class="theme-usage"> <i class="pi pi-star"></i> {{ theme.usageCount }} </span>
      </div>
    </div>
  `,
  styles: [
    `
      .theme-card {
        @apply cursor-pointer rounded-lg border-2 border-gray-300 p-3 transition-all;
        @apply hover:scale-105 hover:shadow-lg;
      }
      .theme-card.active {
        @apply border-blue-500 shadow-md;
      }
      .theme-thumbnail {
        @apply rounded-md overflow-hidden mb-2;
        height: 160px;
      }
      .theme-thumbnail img {
        @apply w-full h-full object-cover;
      }
      .theme-name {
        @apply text-sm font-semibold mb-1;
      }
      .theme-usage {
        @apply text-xs text-gray-600 flex items-center gap-1;
      }
    `,
  ],
})
export class ThemeCardComponent {
  /** Theme data to display */
  @Input() theme!: FormTheme;

  /** Whether this theme is currently active/selected */
  @Input() isActive = false;

  /** Event emitted when theme card is clicked */
  @Output() selected = new EventEmitter<FormTheme>();

  /** Flag to track if image has loaded */
  imageLoaded = false;
}
