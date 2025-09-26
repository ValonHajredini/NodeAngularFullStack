import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '@core/auth/auth.service';
import { SettingsService } from '../../settings.service';
import { GeneralSettings } from '../../types/settings.types';

/**
 * General settings component for basic user preferences and account information.
 * Handles language, timezone, date format, and other general preferences.
 */
@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="general-settings">
      <div class="max-w-4xl">
        <!-- Header -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900">General Settings</h2>
          <p class="mt-1 text-sm text-gray-600">
            Manage your basic preferences and account information.
          </p>
        </div>

        <!-- Success Message -->
        @if (settingsService.successMessage()) {
          <div class="mb-6 rounded-md bg-success-50 p-4 animate-fade-in">
            <div class="flex">
              <div class="flex-shrink-0">
                <i class="pi pi-check-circle text-success-400"></i>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-success-800">
                  {{ settingsService.successMessage() }}
                </p>
              </div>
              <div class="ml-auto pl-3">
                <button
                  type="button"
                  (click)="settingsService.clearMessages()"
                  class="text-success-400 hover:text-success-600"
                >
                  <i class="pi pi-times"></i>
                </button>
              </div>
            </div>
          </div>
        }

        <!-- Error Message -->
        @if (settingsService.error()) {
          <div class="mb-6 rounded-md bg-error-50 p-4 animate-fade-in">
            <div class="flex">
              <div class="flex-shrink-0">
                <i class="pi pi-exclamation-triangle text-error-400"></i>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-error-800">Update Failed</h3>
                <div class="mt-2 text-sm text-error-700">
                  {{ settingsService.error() }}
                </div>
              </div>
              <div class="ml-auto pl-3">
                <button
                  type="button"
                  (click)="settingsService.clearError()"
                  class="text-error-400 hover:text-error-600"
                >
                  <i class="pi pi-times"></i>
                </button>
              </div>
            </div>
          </div>
        }

        <div class="space-y-8">
          <!-- Account Information -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Account Information</h3>

              @if (user()) {
                <div class="space-y-4">
                  <div class="flex items-center space-x-4">
                    <div
                      class="h-16 w-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center"
                    >
                      <span class="text-xl font-bold text-white">
                        {{ getInitials(user()!.firstName, user()!.lastName) }}
                      </span>
                    </div>
                    <div>
                      <p class="text-lg font-medium text-gray-900">
                        {{ user()!.firstName }} {{ user()!.lastName }}
                      </p>
                      <p class="text-sm text-gray-500">{{ user()!.email }}</p>
                      <p class="text-xs text-gray-400 mt-1">
                        Member since {{ formatDate(user()!.createdAt) }}
                      </p>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Preferences Form -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Preferences</h3>

              <form
                [formGroup]="preferencesForm"
                (ngSubmit)="onSubmit()"
                class="space-y-6"
                novalidate
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Language -->
                  <div>
                    <label for="language" class="block text-sm font-medium text-gray-700 mb-1">
                      Language
                    </label>
                    <select
                      id="language"
                      formControlName="language"
                      class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="it">Italiano</option>
                    </select>
                  </div>

                  <!-- Timezone -->
                  <div>
                    <label for="timezone" class="block text-sm font-medium text-gray-700 mb-1">
                      Timezone
                    </label>
                    <select
                      id="timezone"
                      formControlName="timezone"
                      class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="UTC">UTC (Universal Time)</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                      <option value="Asia/Shanghai">Shanghai</option>
                      <option value="Australia/Sydney">Sydney</option>
                    </select>
                  </div>

                  <!-- Date Format -->
                  <div>
                    <label for="dateFormat" class="block text-sm font-medium text-gray-700 mb-1">
                      Date Format
                    </label>
                    <select
                      id="dateFormat"
                      formControlName="dateFormat"
                      class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY (12/25/2024)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (25/12/2024)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-25)</option>
                      <option value="MMM DD, YYYY">MMM DD, YYYY (Dec 25, 2024)</option>
                    </select>
                  </div>

                  <!-- Time Format -->
                  <div>
                    <label for="timeFormat" class="block text-sm font-medium text-gray-700 mb-1">
                      Time Format
                    </label>
                    <select
                      id="timeFormat"
                      formControlName="timeFormat"
                      class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="12h">12-hour (2:30 PM)</option>
                      <option value="24h">24-hour (14:30)</option>
                    </select>
                  </div>
                </div>

                <!-- Form Actions -->
                <div class="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    (click)="resetForm()"
                    [disabled]="!hasChanges() || loading()"
                    class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <i class="pi pi-refresh mr-2"></i>
                    Reset Changes
                  </button>

                  <button
                    type="submit"
                    [disabled]="preferencesForm.invalid || !hasChanges() || loading()"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    @if (loading()) {
                      <div class="flex items-center">
                        <div
                          class="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                        ></div>
                        Updating...
                      </div>
                    } @else {
                      <i class="pi pi-save mr-2"></i>
                      Save Changes
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .animate-fade-in {
        animation: fadeIn 0.3s ease-in-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  protected readonly settingsService = inject(SettingsService);

  // Reactive state
  protected readonly loading = this.settingsService.loading;
  protected readonly user = this.authService.user;

  // Form state
  public readonly preferencesForm: FormGroup;
  private originalFormValue: GeneralSettings | null = null;

  constructor() {
    this.preferencesForm = this.fb.group({
      language: ['en', [Validators.required]],
      timezone: ['UTC', [Validators.required]],
      dateFormat: ['MM/DD/YYYY', [Validators.required]],
      timeFormat: ['12h', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  /**
   * Load current settings into form
   */
  private loadSettings(): void {
    const settings = this.settingsService.settings();
    if (settings?.general) {
      this.preferencesForm.patchValue(settings.general);
      this.originalFormValue = { ...settings.general };
    }
  }

  /**
   * Handle form submission
   */
  public onSubmit(): void {
    if (this.preferencesForm.valid && this.hasChanges()) {
      const formValue = this.preferencesForm.value as GeneralSettings;
      this.settingsService.updateGeneralSettings(formValue).subscribe({
        next: (updatedSettings) => {
          this.originalFormValue = { ...updatedSettings };
        },
        error: (error) => {
          console.error('Failed to update general settings:', error);
        },
      });
    }
  }

  /**
   * Reset form to original values
   */
  public resetForm(): void {
    if (this.originalFormValue) {
      this.preferencesForm.patchValue(this.originalFormValue);
    }
  }

  /**
   * Check if form has changes from original values
   */
  public hasChanges(): boolean {
    if (!this.originalFormValue) return false;
    const currentValue = this.preferencesForm.value;
    return JSON.stringify(currentValue) !== JSON.stringify(this.originalFormValue);
  }

  /**
   * Get user initials for avatar display
   */
  public getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  }

  /**
   * Format date for display
   */
  public formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
