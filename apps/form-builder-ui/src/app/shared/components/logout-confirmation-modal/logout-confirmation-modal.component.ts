import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Logout type enum for clarity
 */
export enum LogoutType {
  SERVICE_ONLY = 'service_only',
  COMPLETE = 'complete',
}

/**
 * Logout Confirmation Modal Component
 *
 * A modal dialog that asks users whether they want to logout from:
 * - Current service only (redirects to dashboard on port 4200)
 * - All services (complete logout, redirects to login page)
 *
 * Features:
 * - Theme-aware styling with CSS variables
 * - Two distinct logout options with clear descriptions
 * - Icon-based visual distinction
 * - Keyboard navigation support (ESC to cancel)
 * - Backdrop click to close
 * - Accessible ARIA labels
 *
 * @example
 * ```html
 * @if (showLogoutModal()) {
 *   <app-logout-confirmation-modal
 *     (logoutConfirmed)="handleLogoutConfirmed($event)"
 *     (cancelled)="handleLogoutCancelled()"
 *   />
 * }
 * ```
 */
@Component({
  selector: 'app-logout-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 z-[10000] overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      (keydown.escape)="handleCancel()"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop"
        (click)="handleCancel()"
      ></div>

      <!-- Modal container -->
      <div class="flex min-h-full items-center justify-center p-4">
        <div
          class="modal-container relative transform overflow-hidden rounded-lg shadow-xl transition-all w-full max-w-lg animate-fade-in"
        >
          <!-- Modal header -->
          <div class="modal-header px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0">
                <i class="pi pi-sign-out text-2xl text-orange-600"></i>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-primary" id="modal-title">
                  Sign Out Confirmation
                </h3>
                <p class="text-sm text-secondary mt-1">
                  Choose how you want to sign out of the application
                </p>
              </div>
            </div>
          </div>

          <!-- Modal body -->
          <div class="modal-body px-6 py-4">
            <div class="space-y-3">
              <!-- Service-only logout option -->
              <button
                type="button"
                (click)="handleLogout(LogoutTypeEnum.SERVICE_ONLY)"
                class="logout-option w-full text-left p-4 rounded-lg border-2 transition-all hover:border-primary-500 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 mt-1">
                    <i class="pi pi-arrow-left text-xl text-primary-600"></i>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-semibold text-primary text-base">Return to Dashboard</h4>
                    <p class="text-sm text-secondary mt-1">
                      Sign out from this service only and return to the main dashboard. You'll
                      remain signed in to other services.
                    </p>
                  </div>
                </div>
              </button>

              <!-- Complete logout option -->
              <button
                type="button"
                (click)="handleLogout(LogoutTypeEnum.COMPLETE)"
                class="logout-option w-full text-left p-4 rounded-lg border-2 transition-all hover:border-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 mt-1">
                    <i class="pi pi-power-off text-xl text-red-600"></i>
                  </div>
                  <div class="flex-1">
                    <h4 class="font-semibold text-primary text-base">Complete Sign Out</h4>
                    <p class="text-sm text-secondary mt-1">
                      Sign out from all services and end your session completely. You'll need to
                      sign in again to access any service.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Modal footer -->
          <div class="modal-footer px-6 py-4">
            <button
              type="button"
              (click)="handleCancel()"
              class="cancel-button w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* Backdrop */
      .backdrop {
        animation: fadeIn 0.2s ease-out;
      }

      /* Modal container */
      .modal-container {
        background-color: var(--color-surface);
        border: var(--border-width-1) solid var(--color-border);
      }

      /* Modal sections */
      .modal-header {
        border-bottom: var(--border-width-1) solid var(--color-border-light);
      }

      .modal-body {
        background-color: var(--color-background);
      }

      .modal-footer {
        border-top: var(--border-width-1) solid var(--color-border-light);
        background-color: var(--color-surface);
      }

      /* Text colors */
      .text-primary {
        color: var(--color-text-primary);
      }

      .text-secondary {
        color: var(--color-text-secondary);
      }

      /* Logout option button */
      .logout-option {
        background-color: var(--color-surface);
        border-color: var(--color-border);
      }

      .logout-option:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      .logout-option:active {
        transform: translateY(0);
      }

      /* Cancel button */
      .cancel-button {
        background-color: var(--color-gray-100);
        color: var(--color-text-secondary);
      }

      .cancel-button:hover {
        background-color: var(--color-gray-200);
        color: var(--color-text-primary);
      }

      /* Animations */
      .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      /* Dark theme adjustments */
      [data-theme='dark'] .cancel-button {
        background-color: var(--color-gray-700);
      }

      [data-theme='dark'] .cancel-button:hover {
        background-color: var(--color-gray-600);
      }

      [data-theme='dark'] .logout-option:hover {
        background-color: var(--color-gray-800);
      }

      /* Accessibility */
      @media (prefers-reduced-motion: reduce) {
        .animate-fade-in,
        .backdrop {
          animation: none;
        }

        .logout-option:hover {
          transform: none;
        }
      }
    `,
  ],
})
export class LogoutConfirmationModalComponent {
  // Expose enum to template
  protected readonly LogoutTypeEnum = LogoutType;

  // Output events
  public readonly logoutConfirmed = output<LogoutType>();
  public readonly cancelled = output<void>();

  /**
   * Handles logout confirmation with the selected type.
   */
  protected handleLogout(type: LogoutType): void {
    this.logoutConfirmed.emit(type);
  }

  /**
   * Handles modal cancellation.
   */
  protected handleCancel(): void {
    this.cancelled.emit();
  }
}
