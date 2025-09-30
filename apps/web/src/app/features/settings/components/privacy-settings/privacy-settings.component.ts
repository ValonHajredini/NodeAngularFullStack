import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Privacy settings component for managing data collection and profile visibility settings.
 * Currently displays a "Coming Soon" placeholder until full implementation.
 */
@Component({
  selector: 'app-privacy-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="privacy-settings">
      <!-- Header -->
      <div class="settings-header">
        <h1 class="settings-title">Privacy Settings</h1>
        <p class="settings-subtitle">Control your privacy and data sharing preferences.</p>
      </div>

      <!-- Coming Soon Card -->
      <div class="coming-soon-card">
        <div class="coming-soon-icon">
          <i class="pi pi-eye-slash"></i>
        </div>
        <h2 class="coming-soon-title">Coming Soon</h2>
        <p class="coming-soon-description">
          Privacy settings will be available in a future update.
        </p>
        <div class="coming-soon-features">
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Profile visibility controls</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Data collection preferences</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Activity tracking options</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Third-party data sharing</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Cookie preferences</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Search history controls</span>
          </div>
        </div>
      </div>

      <!-- Info Card -->
      <div class="info-card">
        <div class="info-icon">
          <i class="pi pi-shield"></i>
        </div>
        <div class="info-content">
          <h3 class="info-title">Your Privacy Matters</h3>
          <p class="info-text">
            We are committed to protecting your privacy and giving you control over your data.
            Privacy settings will allow you to customize what information you share and how it's
            used.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .privacy-settings {
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
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

      /* Info Card */
      .info-card {
        @apply flex gap-4 p-5 rounded-xl;
        background: linear-gradient(135deg, #e8eaf6 0%, #e3f2fd 100%);
        border: 1px solid #9fa8da;
      }

      .info-icon {
        @apply w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0;
        background: rgba(103, 58, 183, 0.15);
        color: #673ab7;
        font-size: 20px;
      }

      .info-content {
        @apply flex-1;
      }

      .info-title {
        @apply text-base font-semibold mb-2;
        color: #5e35b1;
      }

      .info-text {
        @apply text-sm;
        color: #673ab7;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .privacy-settings {
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

        .info-card {
          @apply flex-col;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacySettingsComponent {}
