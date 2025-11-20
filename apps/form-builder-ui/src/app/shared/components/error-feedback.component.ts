import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Error severity levels for different types of errors
 */
export type ErrorSeverity = 'error' | 'warning' | 'info' | 'success';

/**
 * Error information structure
 */
export interface ErrorInfo {
  /** Error message to display */
  message: string;
  /** Error severity level */
  severity: ErrorSeverity;
  /** Optional detailed error information */
  details?: string;
  /** Optional action button text */
  actionText?: string;
  /** Whether error can be dismissed */
  dismissible?: boolean;
}

/**
 * User feedback error handling component for displaying errors, warnings, and success messages.
 * Supports different severity levels, dismissible messages, and custom actions.
 *
 * @example
 * <app-error-feedback
 *   [error]="errorInfo"
 *   (dismiss)="onDismissError()"
 *   (action)="onRetryAction()">
 * </app-error-feedback>
 */
@Component({
  selector: 'app-error-feedback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="error()"
      [class]="getContainerClasses()"
      role="alert"
      [attr.aria-live]="error()?.severity === 'error' ? 'assertive' : 'polite'"
    >
      <div class="flex items-start">
        <!-- Icon -->
        <div class="flex-shrink-0">
          <svg
            [class]="getIconClasses()"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              *ngIf="error()?.severity === 'error'"
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
            <path
              *ngIf="error()?.severity === 'warning'"
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
            <path
              *ngIf="error()?.severity === 'info'"
              fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clip-rule="evenodd"
            />
            <path
              *ngIf="error()?.severity === 'success'"
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
        </div>

        <!-- Content -->
        <div class="ml-3 flex-1">
          <h3 [class]="getTitleClasses()">
            {{ error()?.message }}
          </h3>
          <div *ngIf="error()?.details" [class]="getDetailsClasses()">
            <p>{{ error()?.details }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="ml-auto flex items-center space-x-2">
          <button
            *ngIf="error()?.actionText"
            type="button"
            [class]="getActionButtonClasses()"
            (click)="onAction()"
          >
            {{ error()?.actionText }}
          </button>
          <button
            *ngIf="error()?.dismissible !== false"
            type="button"
            [class]="getDismissButtonClasses()"
            (click)="onDismiss()"
            aria-label="Dismiss"
          >
            <span class="sr-only">Dismiss</span>
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorFeedbackComponent {
  /** Error information to display */
  error = input<ErrorInfo | null>();

  /** Emitted when user dismisses the error */
  dismiss = output<void>();

  /** Emitted when user clicks the action button */
  action = output<void>();

  /**
   * Handle dismiss button click
   */
  onDismiss(): void {
    this.dismiss.emit();
  }

  /**
   * Handle action button click
   */
  onAction(): void {
    this.action.emit();
  }

  /**
   * Get CSS classes for the container based on error severity
   */
  getContainerClasses(): string {
    const severity = this.error()?.severity || 'error';
    const baseClasses = 'rounded-md p-4 mb-4';

    const severityClasses = {
      error: 'bg-red-50 border border-red-200',
      warning: 'bg-yellow-50 border border-yellow-200',
      info: 'bg-blue-50 border border-blue-200',
      success: 'bg-green-50 border border-green-200'
    };

    return `${baseClasses} ${severityClasses[severity]}`;
  }

  /**
   * Get CSS classes for the icon based on error severity
   */
  getIconClasses(): string {
    const severity = this.error()?.severity || 'error';
    const baseClasses = 'w-5 h-5';

    const severityClasses = {
      error: 'text-red-400',
      warning: 'text-yellow-400',
      info: 'text-blue-400',
      success: 'text-green-400'
    };

    return `${baseClasses} ${severityClasses[severity]}`;
  }

  /**
   * Get CSS classes for the title based on error severity
   */
  getTitleClasses(): string {
    const severity = this.error()?.severity || 'error';
    const baseClasses = 'text-sm font-medium';

    const severityClasses = {
      error: 'text-red-800',
      warning: 'text-yellow-800',
      info: 'text-blue-800',
      success: 'text-green-800'
    };

    return `${baseClasses} ${severityClasses[severity]}`;
  }

  /**
   * Get CSS classes for the details text based on error severity
   */
  getDetailsClasses(): string {
    const severity = this.error()?.severity || 'error';
    const baseClasses = 'mt-2 text-sm';

    const severityClasses = {
      error: 'text-red-700',
      warning: 'text-yellow-700',
      info: 'text-blue-700',
      success: 'text-green-700'
    };

    return `${baseClasses} ${severityClasses[severity]}`;
  }

  /**
   * Get CSS classes for the action button based on error severity
   */
  getActionButtonClasses(): string {
    const severity = this.error()?.severity || 'error';
    const baseClasses = 'text-sm font-medium rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-offset-2';

    const severityClasses = {
      error: 'text-red-800 bg-red-100 hover:bg-red-200 focus:ring-red-500',
      warning: 'text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-500',
      info: 'text-blue-800 bg-blue-100 hover:bg-blue-200 focus:ring-blue-500',
      success: 'text-green-800 bg-green-100 hover:bg-green-200 focus:ring-green-500'
    };

    return `${baseClasses} ${severityClasses[severity]}`;
  }

  /**
   * Get CSS classes for the dismiss button based on error severity
   */
  getDismissButtonClasses(): string {
    const severity = this.error()?.severity || 'error';
    const baseClasses = 'rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2';

    const severityClasses = {
      error: 'text-red-400 hover:text-red-600 hover:bg-red-100 focus:ring-red-500',
      warning: 'text-yellow-400 hover:text-yellow-600 hover:bg-yellow-100 focus:ring-yellow-500',
      info: 'text-blue-400 hover:text-blue-600 hover:bg-blue-100 focus:ring-blue-500',
      success: 'text-green-400 hover:text-green-600 hover:bg-green-100 focus:ring-green-500'
    };

    return `${baseClasses} ${severityClasses[severity]}`;
  }
}