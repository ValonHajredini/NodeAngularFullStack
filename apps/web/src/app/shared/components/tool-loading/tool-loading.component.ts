import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Loading component for tool-related operations.
 * Provides skeleton loading states while tool status is being verified
 * or tool content is being loaded.
 *
 * @example
 * <!-- Basic usage -->
 * <app-tool-loading></app-tool-loading>
 *
 * @example
 * <!-- With custom message -->
 * <app-tool-loading message="Checking tool availability..."></app-tool-loading>
 *
 * @example
 * <!-- Compact mode for inline usage -->
 * <app-tool-loading [compact]="true"></app-tool-loading>
 *
 * @example
 * <!-- Custom size -->
 * <app-tool-loading size="large"></app-tool-loading>
 */
@Component({
  selector: 'app-tool-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="tool-loading-container"
      [class.compact]="compact"
      [class.small]="size === 'small'"
      [class.large]="size === 'large'"
      [attr.aria-label]="ariaLabel"
      role="status"
    >
      <!-- Skeleton loader for tool content -->
      <div class="skeleton-wrapper" *ngIf="!compact">
        <!-- Header skeleton -->
        <div class="skeleton-header">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-subtitle"></div>
        </div>

        <!-- Content skeleton -->
        <div class="skeleton-content">
          <div class="skeleton-line skeleton-text" *ngFor="let line of skeletonLines"></div>
          <div class="skeleton-button"></div>
        </div>
      </div>

      <!-- Compact spinner for inline usage -->
      <div class="spinner-wrapper" *ngIf="compact">
        <div class="spinner" [attr.aria-hidden]="true"></div>
        <span class="spinner-text" *ngIf="message">{{ message }}</span>
      </div>

      <!-- Loading message -->
      <div class="loading-message" *ngIf="message && !compact">
        <span>{{ message }}</span>
      </div>

      <!-- Screen reader text -->
      <span class="sr-only">{{ ariaLabel }}</span>
    </div>
  `,
  styleUrls: ['./tool-loading.component.scss'],
})
export class ToolLoadingComponent {
  /**
   * Custom loading message to display.
   * @default "Loading..."
   */
  @Input() message = 'Loading...';

  /**
   * Whether to show compact loading indicator (spinner only).
   * @default false
   */
  @Input() compact = false;

  /**
   * Size variant for the loading component.
   * @default "medium"
   */
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  /**
   * Number of skeleton lines to show in content area.
   * @default 3
   */
  @Input() skeletonLines: number[] = [1, 2, 3];

  /**
   * Custom aria-label for accessibility.
   * If not provided, defaults to the message or "Loading content"
   */
  @Input() ariaLabel?: string;

  /**
   * Gets the appropriate aria-label for the loading component.
   */
  get computedAriaLabel(): string {
    return this.ariaLabel || this.message || 'Loading content';
  }
}
