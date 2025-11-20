import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Notifications settings component for managing email, push, and in-app notification preferences.
 * Currently displays a "Coming Soon" placeholder until full implementation.
 */
@Component({
  selector: 'app-notifications-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-settings">
      <!-- Header -->
      <div class="settings-header">
        <h1 class="settings-title">Notifications</h1>
        <p class="settings-subtitle">Email, push, and in-app notification preferences.</p>
      </div>

      <!-- Coming Soon Card -->
      <div class="coming-soon-card">
        <div class="coming-soon-icon">
          <i class="pi pi-bell"></i>
        </div>
        <h2 class="coming-soon-title">Coming Soon</h2>
        <p class="coming-soon-description">
          Notification preferences will be available in a future update.
        </p>
        <div class="coming-soon-features">
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Email notifications</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Push notifications</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>In-app notifications</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-check-circle"></i>
            <span>Custom notification rules</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .notifications-settings {
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
        @apply rounded-xl p-12 text-center;
        background-color: var(--color-surface);
        border: 1px solid var(--color-border-light);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .coming-soon-icon {
        @apply w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center;
        background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
        color: #667eea;
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
        @apply grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto;
      }

      .feature-item {
        @apply flex items-center gap-3 p-3 rounded-lg;
        background-color: var(--color-background);
        border: 1px solid var(--color-border-light);
      }

      .feature-item i {
        @apply text-lg;
        color: var(--color-primary-500);
      }

      .feature-item span {
        @apply text-sm font-medium;
        color: var(--color-text-primary);
      }

      /* Responsive */
      @media (max-width: 768px) {
        .notifications-settings {
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
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsSettingsComponent {}
