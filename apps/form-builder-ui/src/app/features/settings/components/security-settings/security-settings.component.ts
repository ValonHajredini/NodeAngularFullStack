import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Security settings component for password and authentication management.
 * Handles security notifications and authentication preferences.
 */
@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="security-settings">
      <!-- Header -->
      <div class="settings-header">
        <h1 class="settings-title">Security Settings</h1>
        <p class="settings-subtitle">
          Manage your password, authentication, and API access tokens.
        </p>
      </div>

      <!-- Password & Authentication Card -->
      <div class="settings-card">
        <h2 class="card-title">Password & Authentication</h2>

        <div class="security-options">
          <!-- Password -->
          <div class="security-option">
            <div class="option-icon">
              <i class="pi pi-key"></i>
            </div>
            <div class="option-content">
              <h3 class="option-title">Password</h3>
              <p class="option-description">Change your account password</p>
            </div>
            <a routerLink="/auth/password-reset" class="btn btn-secondary">
              <i class="pi pi-arrow-right"></i>
              Change
            </a>
          </div>

          <!-- Two-Factor Authentication -->
          <div class="security-option">
            <div class="option-icon option-icon-disabled">
              <i class="pi pi-shield"></i>
            </div>
            <div class="option-content">
              <h3 class="option-title">Two-Factor Authentication</h3>
              <p class="option-description">Add an extra layer of security to your account</p>
            </div>
            <button type="button" disabled class="btn btn-disabled" title="Coming soon">
              <i class="pi pi-lock"></i>
              Enable 2FA
            </button>
          </div>

          <!-- Active Sessions -->
          <div class="security-option">
            <div class="option-icon option-icon-disabled">
              <i class="pi pi-desktop"></i>
            </div>
            <div class="option-content">
              <h3 class="option-title">Active Sessions</h3>
              <p class="option-description">Manage devices and browser sessions</p>
            </div>
            <button type="button" disabled class="btn btn-disabled" title="Coming soon">
              <i class="pi pi-arrow-right"></i>
              View
            </button>
          </div>
        </div>
      </div>

      <!-- Security Notifications Card -->
      <div class="settings-card">
        <h2 class="card-title">Security Notifications</h2>

        <div class="notification-options">
          <!-- Login Alerts -->
          <div class="notification-item">
            <div class="notification-content">
              <h3 class="notification-title">Login Alerts</h3>
              <p class="notification-description">
                Get notified when someone logs into your account from a new device
              </p>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="login-alerts" checked disabled class="toggle-input" />
              <label for="login-alerts" class="toggle-label"></label>
            </div>
          </div>

          <!-- Password Changes -->
          <div class="notification-item">
            <div class="notification-content">
              <h3 class="notification-title">Password Changes</h3>
              <p class="notification-description">Get notified when your password is changed</p>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="password-changes" checked disabled class="toggle-input" />
              <label for="password-changes" class="toggle-label"></label>
            </div>
          </div>

          <!-- Suspicious Activity -->
          <div class="notification-item">
            <div class="notification-content">
              <h3 class="notification-title">Suspicious Activity</h3>
              <p class="notification-description">Get notified of unusual account activity</p>
            </div>
            <div class="toggle-switch">
              <input
                type="checkbox"
                id="suspicious-activity"
                checked
                disabled
                class="toggle-input"
              />
              <label for="suspicious-activity" class="toggle-label"></label>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .security-settings {
        @apply max-w-4xl mx-auto px-6 py-8;
      }

      /* Header */
      .settings-header {
        @apply mb-8;
      }

      .settings-title {
        @apply text-3xl font-bold mb-2;
        color: var(--color-text-primary);
      }

      .settings-subtitle {
        @apply text-base;
        color: var(--color-text-secondary);
      }

      /* Cards */
      .settings-card {
        @apply rounded-xl p-6 mb-6;
        background-color: var(--color-surface);
        border: 1px solid var(--color-border-light);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .card-title {
        @apply text-xl font-semibold mb-6;
        color: var(--color-text-primary);
      }

      /* Security Options */
      .security-options {
        @apply space-y-4;
      }

      .security-option {
        @apply flex items-center gap-4 p-4 rounded-lg transition-all;
        background-color: var(--color-background);
        border: 1px solid var(--color-border-light);
      }

      .security-option:hover {
        border-color: var(--color-border);
      }

      .option-icon {
        @apply w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-size: 20px;
      }

      .option-icon-disabled {
        background: var(--color-gray-200);
        color: var(--color-text-muted);
      }

      .option-content {
        @apply flex-1 min-w-0;
      }

      .option-title {
        @apply text-sm font-semibold mb-1;
        color: var(--color-text-primary);
      }

      .option-description {
        @apply text-xs;
        color: var(--color-text-secondary);
      }

      /* Notification Options */
      .notification-options {
        @apply space-y-4;
      }

      .notification-item {
        @apply flex items-center gap-4 p-4 rounded-lg;
        background-color: var(--color-background);
      }

      .notification-content {
        @apply flex-1 min-w-0;
      }

      .notification-title {
        @apply text-sm font-semibold mb-1;
        color: var(--color-text-primary);
      }

      .notification-description {
        @apply text-xs;
        color: var(--color-text-secondary);
      }

      /* Toggle Switch */
      .toggle-switch {
        @apply relative;
      }

      .toggle-input {
        @apply sr-only;
      }

      .toggle-label {
        @apply block w-11 h-6 rounded-full cursor-pointer transition-colors;
        background-color: var(--color-gray-300);
        position: relative;
      }

      .toggle-label::after {
        content: '';
        @apply absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform;
      }

      .toggle-input:checked + .toggle-label {
        background-color: var(--color-primary-600);
      }

      .toggle-input:checked + .toggle-label::after {
        transform: translateX(20px);
      }

      .toggle-input:disabled + .toggle-label {
        @apply opacity-50 cursor-not-allowed;
      }

      /* Buttons */
      .btn {
        @apply inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all flex-shrink-0;
      }

      .btn-secondary {
        background-color: var(--color-surface);
        border: 1px solid var(--color-border);
        color: var(--color-text-secondary);
      }

      .btn-secondary:hover {
        background-color: var(--color-gray-50);
        border-color: var(--color-border-dark);
      }

      .btn-disabled {
        @apply opacity-50 cursor-not-allowed;
        background-color: var(--color-gray-100);
        border: 1px solid var(--color-border-light);
        color: var(--color-text-muted);
      }

      /* Responsive */
      @media (max-width: 768px) {
        .security-settings {
          @apply px-4 py-6;
        }

        .settings-title {
          @apply text-2xl;
        }

        .settings-card {
          @apply p-5;
        }

        .security-option {
          @apply flex-col items-start;
        }

        .btn {
          @apply w-full justify-center;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecuritySettingsComponent {}
