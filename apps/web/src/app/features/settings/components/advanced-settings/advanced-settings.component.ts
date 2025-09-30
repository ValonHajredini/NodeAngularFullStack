import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Advanced settings component for data export, account deletion, and advanced options.
 * Currently displays a "Coming Soon" placeholder until full implementation.
 */
@Component({
  selector: 'app-advanced-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="advanced-settings">
      <!-- Header -->
      <div class="settings-header">
        <h1 class="settings-title">Advanced Settings</h1>
        <p class="settings-subtitle">Advanced options, data export, and account management.</p>
      </div>

      <!-- Coming Soon Card -->
      <div class="coming-soon-card">
        <div class="coming-soon-icon">
          <i class="pi pi-cog"></i>
        </div>
        <h2 class="coming-soon-title">Coming Soon</h2>
        <p class="coming-soon-description">
          Advanced settings will be available in a future update.
        </p>
        <div class="coming-soon-features">
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Export your data</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Import data from other services</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Developer mode settings</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Advanced customization</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Account deletion</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Data retention policies</span>
          </div>
        </div>
      </div>

      <!-- Warning Card -->
      <div class="warning-card">
        <div class="warning-icon">
          <i class="pi pi-exclamation-triangle"></i>
        </div>
        <div class="warning-content">
          <h3 class="warning-title">Handle with Care</h3>
          <p class="warning-text">
            Advanced settings provide powerful options for managing your account and data. Some
            actions, like account deletion, are irreversible. Always make sure you understand what
            you're changing before proceeding.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .advanced-settings {
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

      /* Coming Soon Card */
      .coming-soon-card {
        @apply rounded-xl p-12 text-center mb-6;
        background-color: var(--color-surface);
        border: 1px solid var(--color-border-light);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .coming-soon-icon {
        @apply w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        font-size: 40px;
      }

      .coming-soon-title {
        @apply text-2xl font-bold mb-3;
        color: var(--color-text-primary);
      }

      .coming-soon-description {
        @apply text-base mb-8;
        color: var(--color-text-secondary);
      }

      .coming-soon-features {
        @apply grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto;
      }

      .feature-item {
        @apply flex items-center gap-3 p-3 rounded-lg;
        background-color: var(--color-background);
        border: 1px solid var(--color-border-light);
      }

      .feature-item i {
        @apply text-lg flex-shrink-0;
        color: var(--color-primary-500);
      }

      .feature-item span {
        @apply text-sm font-medium text-left;
        color: var(--color-text-primary);
      }

      /* Warning Card */
      .warning-card {
        @apply flex gap-4 p-5 rounded-xl;
        background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        border: 1px solid #ffb74d;
      }

      .warning-icon {
        @apply w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0;
        background: rgba(255, 152, 0, 0.15);
        color: #f57c00;
        font-size: 20px;
      }

      .warning-content {
        @apply flex-1;
      }

      .warning-title {
        @apply text-base font-semibold mb-2;
        color: #e65100;
      }

      .warning-text {
        @apply text-sm;
        color: #ef6c00;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .advanced-settings {
          @apply px-4 py-6;
        }

        .settings-title {
          @apply text-2xl;
        }

        .coming-soon-card {
          @apply p-8;
        }

        .coming-soon-icon {
          @apply w-16 h-16;
          font-size: 32px;
        }

        .coming-soon-features {
          @apply grid-cols-1;
        }

        .warning-card {
          @apply flex-col;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedSettingsComponent {}
