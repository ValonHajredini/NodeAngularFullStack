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
    <div class="max-w-4xl">
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-gray-900">Advanced Settings</h2>
        <p class="mt-1 text-sm text-gray-600">
          Advanced options, data export, and account management.
        </p>
      </div>
      <div class="bg-white shadow rounded-lg p-8 text-center">
        <div class="text-gray-400 mb-4">
          <i class="pi pi-wrench text-4xl"></i>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
        <p class="text-gray-500">Advanced settings will be available in a future update.</p>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        @apply block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedSettingsComponent {}
