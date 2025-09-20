import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable loading spinner component with accessibility features.
 * Supports different sizes, colors, and overlay modes.
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Overlay Mode -->
    @if (overlay) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
           role="dialog"
           aria-modal="true"
           aria-label="Loading content">
        <div class="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center space-y-3">
          <div [class]="spinnerClasses"
               role="status"
               [attr.aria-label]="ariaLabel">
            <div [class]="innerSpinnerClasses"></div>
          </div>
          @if (message) {
            <p class="text-gray-700 text-sm font-medium">{{ message }}</p>
          }
        </div>
      </div>
    } @else {
      <!-- Inline Mode -->
      <div [class]="containerClasses">
        <div [class]="spinnerClasses"
             role="status"
             [attr.aria-label]="ariaLabel">
          <div [class]="innerSpinnerClasses"></div>
        </div>
        @if (message) {
          <span [class]="messageClasses">{{ message }}</span>
        }
      </div>
    }
  `,
  styles: [`
    /* Custom spin animation */
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .animate-spin {
      animation: spin 1s linear infinite;
    }

    /* Pulse animation for overlay background */
    @keyframes pulse {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.6; }
    }

    .animate-pulse-bg {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .spinner-border {
        border-color: currentColor;
        border-top-color: transparent;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .animate-spin {
        animation: none;
      }

      .animate-spin::after {
        content: '⏳';
        display: block;
        font-size: inherit;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingSpinnerComponent {
  /**
   * Size of the spinner: 'sm', 'md', 'lg', 'xl'
   */
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  /**
   * Color variant: 'primary', 'secondary', 'success', 'warning', 'error', 'white'
   */
  @Input() color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'white' = 'primary';

  /**
   * Optional loading message to display
   */
  @Input() message?: string;

  /**
   * Whether to show as overlay (modal-like) or inline
   */
  @Input() overlay: boolean = false;

  /**
   * Whether to center the spinner in its container
   */
  @Input() centered: boolean = false;

  /**
   * Custom aria-label for accessibility
   */
  @Input() ariaLabel: string = 'Loading content, please wait';

  /**
   * Get CSS classes for the spinner container
   */
  get containerClasses(): string {
    const base = 'flex items-center';
    const direction = this.message ? 'space-x-2' : '';
    const centering = this.centered ? 'justify-center' : '';

    return `${base} ${direction} ${centering}`.trim();
  }

  /**
   * Get CSS classes for the spinner element
   */
  get spinnerClasses(): string {
    const base = 'animate-spin rounded-full border-2 border-solid';
    const sizes = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12'
    };
    const colors = {
      primary: 'border-primary-200 border-t-primary-600',
      secondary: 'border-gray-200 border-t-gray-600',
      success: 'border-green-200 border-t-green-600',
      warning: 'border-yellow-200 border-t-yellow-600',
      error: 'border-red-200 border-t-red-600',
      white: 'border-white/30 border-t-white'
    };

    return `${base} ${sizes[this.size]} ${colors[this.color]}`.trim();
  }

  /**
   * Get CSS classes for the inner spinner (for enhanced visual effect)
   */
  get innerSpinnerClasses(): string {
    return 'sr-only'; // Screen reader only - the spinner is purely visual
  }

  /**
   * Get CSS classes for the message text
   */
  get messageClasses(): string {
    const base = 'font-medium';
    const sizes = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg'
    };
    const colors = {
      primary: 'text-primary-700',
      secondary: 'text-gray-700',
      success: 'text-green-700',
      warning: 'text-yellow-700',
      error: 'text-red-700',
      white: 'text-white'
    };

    return `${base} ${sizes[this.size]} ${colors[this.color]}`.trim();
  }
}