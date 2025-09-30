import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiTokenGeneratorComponent } from '@shared/components';

/**
 * API tokens settings component for managing API access tokens.
 * Provides dedicated interface for API token creation, management, and revocation.
 */
@Component({
  selector: 'app-api-tokens-settings',
  standalone: true,
  imports: [CommonModule, ApiTokenGeneratorComponent],
  template: `
    <div class="api-tokens-settings">
      <!-- Header -->
      <div class="settings-header">
        <h1 class="settings-title">API Tokens</h1>
        <p class="settings-subtitle">
          Create and manage API access tokens for programmatic access to your account.
        </p>
      </div>

      <!-- API Token Generator Card -->
      <div class="settings-card">
        <app-api-token-generator></app-api-token-generator>
      </div>

      <!-- Security Information Card -->
      <div class="info-card">
        <div class="info-icon">
          <i class="pi pi-shield"></i>
        </div>
        <div class="info-content">
          <h3 class="info-title">Important Security Information</h3>
          <ul class="info-list">
            <li>Keep your API tokens secure and never share them publicly</li>
            <li>Revoke tokens that are no longer needed or may have been compromised</li>
            <li>Use specific tokens for different applications or services</li>
            <li>Monitor token usage regularly for any suspicious activity</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .api-tokens-settings {
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

      /* Info Card */
      .info-card {
        @apply flex gap-4 p-5 rounded-xl;
        background: linear-gradient(135deg, #e3f2fd 0%, #e8eaf6 100%);
        border: 1px solid #90caf9;
      }

      .info-icon {
        @apply w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0;
        background: rgba(33, 150, 243, 0.15);
        color: #1976d2;
        font-size: 20px;
      }

      .info-content {
        @apply flex-1;
      }

      .info-title {
        @apply text-base font-semibold mb-3;
        color: #1565c0;
      }

      .info-list {
        @apply space-y-2;
      }

      .info-list li {
        @apply text-sm pl-5 relative;
        color: #1976d2;
      }

      .info-list li::before {
        content: '•';
        @apply absolute left-0 font-bold;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .api-tokens-settings {
          @apply px-4 py-6;
        }

        .settings-title {
          @apply text-2xl;
        }

        .settings-card {
          @apply p-5;
        }

        .info-card {
          @apply flex-col;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiTokensSettingsComponent {}
