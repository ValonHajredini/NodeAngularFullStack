import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SettingsService } from '../../settings.service';
import { AppearanceSettings } from '../../types/settings.types';
import { ThemeToggleComponent } from '@shared/components';

/**
 * Appearance settings component for theme, layout, and display preferences.
 * Integrates with the existing theme system.
 */
@Component({
  selector: 'app-appearance-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ThemeToggleComponent],
  template: `
    <div class="appearance-settings">
      <div class="max-w-4xl">
        <!-- Header -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900">Appearance Settings</h2>
          <p class="mt-1 text-sm text-gray-600">Customize the look and feel of your workspace.</p>
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
          <!-- Theme Selection -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Theme</h3>

              <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 class="text-sm font-medium text-gray-900">Color Theme</h4>
                  <p class="text-sm text-gray-500">Choose your preferred color scheme</p>
                </div>
                <app-theme-toggle></app-theme-toggle>
              </div>
            </div>
          </div>

          <!-- Display Preferences -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Display Preferences</h3>

              <form
                [formGroup]="appearanceForm"
                (ngSubmit)="onSubmit()"
                class="space-y-6"
                novalidate
              >
                <div class="space-y-6">
                  <!-- Font Size -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-3"> Font Size </label>
                    <div class="space-y-3">
                      <label class="flex items-center">
                        <input
                          type="radio"
                          value="small"
                          formControlName="fontSize"
                          class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span class="ml-3 block text-sm text-gray-700">Small</span>
                      </label>
                      <label class="flex items-center">
                        <input
                          type="radio"
                          value="medium"
                          formControlName="fontSize"
                          class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span class="ml-3 block text-sm text-gray-700">Medium (Recommended)</span>
                      </label>
                      <label class="flex items-center">
                        <input
                          type="radio"
                          value="large"
                          formControlName="fontSize"
                          class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span class="ml-3 block text-sm text-gray-700">Large</span>
                      </label>
                    </div>
                  </div>

                  <!-- Compact Mode -->
                  <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0">
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" formControlName="compactMode" class="sr-only peer" />
                        <div
                          class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"
                        ></div>
                      </label>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-gray-900">Compact Mode</p>
                      <p class="text-sm text-gray-500">
                        Reduce spacing and padding for a more condensed interface
                      </p>
                    </div>
                  </div>

                  <!-- Sidebar Collapsed -->
                  <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0">
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          formControlName="sidebarCollapsed"
                          class="sr-only peer"
                        />
                        <div
                          class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"
                        ></div>
                      </label>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-gray-900">Collapsed Sidebar</p>
                      <p class="text-sm text-gray-500">
                        Keep the navigation sidebar collapsed by default
                      </p>
                    </div>
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
                    [disabled]="appearanceForm.invalid || !hasChanges() || loading()"
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

          <!-- Preview Section -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Preview</h3>

              <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p class="text-sm text-gray-600">
                  <i class="pi pi-info-circle mr-2"></i>
                  Changes to theme and display preferences will be applied immediately as you make
                  them. Other settings will be saved when you click "Save Changes".
                </p>
              </div>
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
export class AppearanceSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly settingsService = inject(SettingsService);

  // Reactive state
  protected readonly loading = this.settingsService.loading;

  // Form state
  public readonly appearanceForm: FormGroup;
  private originalFormValue: AppearanceSettings | null = null;

  constructor() {
    this.appearanceForm = this.fb.group({
      fontSize: ['medium', [Validators.required]],
      compactMode: [false],
      sidebarCollapsed: [false],
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
    if (settings?.appearance) {
      const { theme, ...formSettings } = settings.appearance;
      this.appearanceForm.patchValue(formSettings);
      this.originalFormValue = { ...settings.appearance };
    }
  }

  /**
   * Handle form submission
   */
  public onSubmit(): void {
    if (this.appearanceForm.valid && this.hasChanges() && this.originalFormValue) {
      const formValue = this.appearanceForm.value;
      const appearanceSettings: AppearanceSettings = {
        ...this.originalFormValue,
        ...formValue,
      };

      this.settingsService.updateAppearanceSettings(appearanceSettings).subscribe({
        next: (updatedSettings) => {
          this.originalFormValue = { ...updatedSettings };
        },
        error: (error) => {
          console.error('Failed to update appearance settings:', error);
        },
      });
    }
  }

  /**
   * Reset form to original values
   */
  public resetForm(): void {
    if (this.originalFormValue) {
      const { theme, ...formSettings } = this.originalFormValue;
      this.appearanceForm.patchValue(formSettings);
    }
  }

  /**
   * Check if form has changes from original values
   */
  public hasChanges(): boolean {
    if (!this.originalFormValue) return false;
    const currentValue = this.appearanceForm.value;
    const { theme, ...originalFormSettings } = this.originalFormValue;
    return JSON.stringify(currentValue) !== JSON.stringify(originalFormSettings);
  }
}
