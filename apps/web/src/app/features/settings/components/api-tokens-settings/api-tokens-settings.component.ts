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
      <div class="max-w-4xl">
        <!-- Header -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900">API Tokens</h2>
          <p class="mt-1 text-sm text-gray-600">
            Create and manage API access tokens for programmatic access to your account.
          </p>
        </div>

        <!-- API Token Generator Section -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <app-api-token-generator></app-api-token-generator>
          </div>
        </div>

        <!-- Information Section -->
        <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <i class="pi pi-info-circle text-blue-400 text-lg"></i>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-blue-800">Important Security Information</h3>
              <div class="mt-2 text-sm text-blue-700">
                <ul class="list-disc pl-5 space-y-1">
                  <li>Keep your API tokens secure and never share them publicly</li>
                  <li>Revoke tokens that are no longer needed or may have been compromised</li>
                  <li>Use specific tokens for different applications or services</li>
                  <li>Monitor token usage regularly for any suspicious activity</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .api-tokens-settings {
        /* Add any component-specific styles here if needed */
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApiTokensSettingsComponent {
  // No additional logic needed - all functionality is handled by the ApiTokenGeneratorComponent
}
