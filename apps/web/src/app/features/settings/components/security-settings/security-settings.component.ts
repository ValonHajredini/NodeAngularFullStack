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
      <div class="max-w-4xl">
        <!-- Header -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900">Security Settings</h2>
          <p class="mt-1 text-sm text-gray-600">
            Manage your password, authentication, and API access tokens.
          </p>
        </div>

        <div class="space-y-8">
          <!-- Password & Authentication -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                Password & Authentication
              </h3>

              <div class="space-y-4">
                <div
                  class="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div>
                    <h4 class="text-sm font-medium text-gray-900">Password</h4>
                    <p class="text-sm text-gray-500">Change your account password</p>
                  </div>
                  <a
                    routerLink="/auth/password-reset"
                    class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    <i class="pi pi-key mr-2"></i>
                    Change Password
                  </a>
                </div>

                <div
                  class="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div>
                    <h4 class="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                    <p class="text-sm text-gray-500">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled
                    class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-400 bg-gray-50 cursor-not-allowed"
                    title="Coming soon"
                  >
                    <i class="pi pi-shield mr-2"></i>
                    Enable 2FA
                  </button>
                </div>

                <div
                  class="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div>
                    <h4 class="text-sm font-medium text-gray-900">Active Sessions</h4>
                    <p class="text-sm text-gray-500">Manage devices and browser sessions</p>
                  </div>
                  <button
                    type="button"
                    disabled
                    class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-400 bg-gray-50 cursor-not-allowed"
                    title="Coming soon"
                  >
                    <i class="pi pi-desktop mr-2"></i>
                    View Sessions
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Security Notifications -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                Security Notifications
              </h3>

              <div class="space-y-4">
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0">
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked class="sr-only peer" disabled />
                      <div
                        class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"
                      ></div>
                    </label>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900">Login Alerts</p>
                    <p class="text-sm text-gray-500">
                      Get notified when someone logs into your account from a new device
                    </p>
                  </div>
                </div>

                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0">
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked class="sr-only peer" disabled />
                      <div
                        class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"
                      ></div>
                    </label>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900">Password Changes</p>
                    <p class="text-sm text-gray-500">Get notified when your password is changed</p>
                  </div>
                </div>

                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0">
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked class="sr-only peer" disabled />
                      <div
                        class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"
                      ></div>
                    </label>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900">Suspicious Activity</p>
                    <p class="text-sm text-gray-500">Get notified of unusual account activity</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* Toggle switch styles are handled by Tailwind classes above */
      .cursor-not-allowed {
        cursor: not-allowed;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecuritySettingsComponent {}
