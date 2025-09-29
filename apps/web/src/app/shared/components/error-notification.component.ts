import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Interface for error notification data
 */
export interface ErrorNotification {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  persistent?: boolean;
  actionLabel?: string;
  action?: () => void;
}

/**
 * Accessible error notification component with auto-dismiss and user actions.
 * Provides comprehensive accessibility features including live regions and keyboard navigation.
 */
@Component({
  selector: 'app-error-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Main notification container -->
    <div
      [class]="containerClasses"
      role="alert"
      [attr.aria-live]="ariaLive"
      [attr.aria-atomic]="true"
      tabindex="0"
      [attr.aria-describedby]="'notification-content-' + notification.id"
    >
      <!-- Icon -->
      <div class="flex-shrink-0">
        <i [class]="iconClasses" [attr.aria-hidden]="true"></i>
      </div>

      <!-- Content -->
      <div class="ml-3 w-0 flex-1" [id]="'notification-content-' + notification.id">
        <p [class]="messageClasses">
          {{ notification.message }}
        </p>

        <!-- Action button -->
        @if (notification.actionLabel && notification.action) {
          <div class="mt-2">
            <button
              type="button"
              [class]="actionButtonClasses"
              (click)="handleAction()"
              [attr.aria-describedby]="'notification-content-' + notification.id"
            >
              {{ notification.actionLabel }}
            </button>
          </div>
        }
      </div>

      <!-- Dismiss button -->
      <div class="ml-4 flex-shrink-0 flex">
        <button
          type="button"
          [class]="dismissButtonClasses"
          (click)="dismiss()"
          [attr.aria-label]="'Dismiss ' + notification.type + ' notification'"
        >
          <span class="sr-only">Close</span>
          <i class="pi pi-times text-sm" aria-hidden="true"></i>
        </button>
      </div>

      <!-- Progress bar for auto-dismiss -->
      @if (!notification.persistent && autoDismissTime > 0) {
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-black/10 rounded-b-md overflow-hidden">
          <div
            class="h-full bg-white/50 transition-all duration-linear"
            [style.width.%]="progressWidth()"
            role="progressbar"
            [attr.aria-label]="'Auto-dismiss in ' + timeRemaining() + ' seconds'"
            [attr.aria-valuenow]="timeRemaining()"
            [attr.aria-valuemin]="0"
            [attr.aria-valuemax]="autoDismissTime / 1000"
          ></div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      /* Smooth transitions */
      .transition-all {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Custom focus styles for accessibility */
      [role='alert']:focus {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .bg-opacity-90 {
          background-color: var(--notification-bg);
          opacity: 1;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .transition-all {
          transition: none;
        }

        .duration-linear {
          animation: none;
        }
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .bg-white {
          background-color: #1f2937;
        }

        .text-gray-900 {
          color: #f9fafb;
        }

        .text-gray-500 {
          color: #9ca3af;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorNotificationComponent implements OnInit, OnDestroy {
  /**
   * The notification data to display
   */
  @Input({ required: true }) notification!: ErrorNotification;

  /**
   * Auto-dismiss time in milliseconds (0 = no auto-dismiss)
   */
  @Input() autoDismissTime = 5000;

  /**
   * Whether to show the notification with animation
   */
  @Input() animate = true;

  /**
   * Custom CSS classes to apply
   */
  @Input() customClasses = '';

  /**
   * Event emitted when notification is dismissed
   */
  @Output() dismissed = new EventEmitter<string>();

  /**
   * Event emitted when action button is clicked
   */
  @Output() actionClicked = new EventEmitter<string>();

  // Internal state
  private autoDismissTimer?: number;
  private readonly startTime = Date.now();
  private readonly timeRemainingSignal = signal(this.autoDismissTime / 1000);

  readonly timeRemaining = this.timeRemainingSignal.asReadonly();

  ngOnInit(): void {
    if (!this.notification.persistent && this.autoDismissTime > 0) {
      this.startAutoDismissTimer();
    }

    // Announce to screen readers
    this.announceToScreenReader();
  }

  ngOnDestroy(): void {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
    }
  }

  /**
   * Dismisses the notification
   */
  dismiss(): void {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
    }
    this.dismissed.emit(this.notification.id);
  }

  /**
   * Handles action button click
   */
  handleAction(): void {
    if (this.notification.action) {
      this.notification.action();
    }
    this.actionClicked.emit(this.notification.id);
  }

  /**
   * Calculates progress width for auto-dismiss progress bar
   */
  progressWidth(): number {
    if (!this.autoDismissTime || this.notification.persistent) {
      return 0;
    }

    const elapsed = Date.now() - this.startTime;
    const remaining = Math.max(0, this.autoDismissTime - elapsed);
    return (remaining / this.autoDismissTime) * 100;
  }

  /**
   * Gets the appropriate aria-live value based on notification type
   */
  get ariaLive(): 'polite' | 'assertive' {
    return this.notification.type === 'error' ? 'assertive' : 'polite';
  }

  /**
   * Gets CSS classes for the main container
   */
  get containerClasses(): string {
    const base =
      'relative max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden';
    const animation = this.animate ? 'transition-all duration-300 ease-in-out' : '';
    const typeClasses = {
      error: 'border-l-4 border-red-500',
      warning: 'border-l-4 border-yellow-500',
      info: 'border-l-4 border-blue-500',
      success: 'border-l-4 border-green-500',
    };

    return `${base} ${animation} ${typeClasses[this.notification.type]} ${this.customClasses} p-4`.trim();
  }

  /**
   * Gets CSS classes for the icon
   */
  get iconClasses(): string {
    const base = 'text-xl';
    const typeClasses = {
      error: 'pi pi-exclamation-triangle text-red-500',
      warning: 'pi pi-exclamation-triangle text-yellow-500',
      info: 'pi pi-info-circle text-blue-500',
      success: 'pi pi-check-circle text-green-500',
    };

    return `${base} ${typeClasses[this.notification.type]}`.trim();
  }

  /**
   * Gets CSS classes for the message text
   */
  get messageClasses(): string {
    return 'text-sm font-medium text-gray-900';
  }

  /**
   * Gets CSS classes for the action button
   */
  get actionButtonClasses(): string {
    const base =
      'inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2';
    const typeClasses = {
      error: 'text-red-700 bg-red-100 hover:bg-red-200 focus:ring-red-500',
      warning: 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-500',
      info: 'text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-blue-500',
      success: 'text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-500',
    };

    return `${base} ${typeClasses[this.notification.type]}`.trim();
  }

  /**
   * Gets CSS classes for the dismiss button
   */
  get dismissButtonClasses(): string {
    return 'inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-md p-1';
  }

  /**
   * Starts the auto-dismiss timer
   */
  private startAutoDismissTimer(): void {
    const updateInterval = 100; // Update every 100ms for smooth progress bar

    const updateTimer = () => {
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, this.autoDismissTime - elapsed);

      this.timeRemainingSignal.set(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        this.dismiss();
      } else {
        this.autoDismissTimer = window.setTimeout(updateTimer, updateInterval);
      }
    };

    this.autoDismissTimer = window.setTimeout(updateTimer, updateInterval);
  }

  /**
   * Announces the notification to screen readers
   */
  private announceToScreenReader(): void {
    // Create a temporary element for screen reader announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', this.ariaLive);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `${this.notification.type}: ${this.notification.message}`;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}
