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
      <!-- Header -->
      <div class="settings-header">
        <h1 class="settings-title">Appearance Settings</h1>
        <p class="settings-subtitle">Customize the look and feel of your workspace.</p>
      </div>

      <!-- Success Message -->
      @if (settingsService.successMessage()) {
        <div class="alert alert-success">
          <div class="alert-icon">
            <i class="pi pi-check-circle"></i>
          </div>
          <div class="alert-content">
            <p>{{ settingsService.successMessage() }}</p>
          </div>
          <button type="button" (click)="settingsService.clearMessages()" class="alert-close">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }

      <!-- Error Message -->
      @if (settingsService.error()) {
        <div class="alert alert-error">
          <div class="alert-icon">
            <i class="pi pi-exclamation-triangle"></i>
          </div>
          <div class="alert-content">
            <h4>Update Failed</h4>
            <p>{{ settingsService.error() }}</p>
          </div>
          <button type="button" (click)="settingsService.clearError()" class="alert-close">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }

      <!-- Theme Card -->
      <div class="settings-card">
        <h2 class="card-title">Theme</h2>

        <div class="theme-option">
          <div class="option-content">
            <h3 class="option-title">Color Theme</h3>
            <p class="option-description">Choose your preferred color scheme</p>
          </div>
          <app-theme-toggle></app-theme-toggle>
        </div>
      </div>

      <!-- Display Preferences Card -->
      <div class="settings-card">
        <h2 class="card-title">Display Preferences</h2>

        <form [formGroup]="appearanceForm" (ngSubmit)="onSubmit()" novalidate>
          <div class="form-content">
            <!-- Font Size -->
            <div class="form-section">
              <label class="form-section-label">Font Size</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input
                    type="radio"
                    value="small"
                    formControlName="fontSize"
                    class="radio-input"
                  />
                  <span class="radio-label">Small</span>
                </label>
                <label class="radio-option">
                  <input
                    type="radio"
                    value="medium"
                    formControlName="fontSize"
                    class="radio-input"
                  />
                  <span class="radio-label">Medium (Recommended)</span>
                </label>
                <label class="radio-option">
                  <input
                    type="radio"
                    value="large"
                    formControlName="fontSize"
                    class="radio-input"
                  />
                  <span class="radio-label">Large</span>
                </label>
              </div>
            </div>

            <!-- Toggle Options -->
            <div class="toggle-options">
              <!-- Compact Mode -->
              <div class="toggle-item">
                <div class="toggle-content">
                  <h3 class="toggle-title">Compact Mode</h3>
                  <p class="toggle-description">
                    Reduce spacing and padding for a more condensed interface
                  </p>
                </div>
                <div class="toggle-switch">
                  <input
                    type="checkbox"
                    id="compact-mode"
                    formControlName="compactMode"
                    class="toggle-input"
                  />
                  <label for="compact-mode" class="toggle-label"></label>
                </div>
              </div>

              <!-- Sidebar Collapsed -->
              <div class="toggle-item">
                <div class="toggle-content">
                  <h3 class="toggle-title">Collapsed Sidebar</h3>
                  <p class="toggle-description">Keep the navigation sidebar collapsed by default</p>
                </div>
                <div class="toggle-switch">
                  <input
                    type="checkbox"
                    id="sidebar-collapsed"
                    formControlName="sidebarCollapsed"
                    class="toggle-input"
                  />
                  <label for="sidebar-collapsed" class="toggle-label"></label>
                </div>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button
              type="button"
              (click)="resetForm()"
              [disabled]="!hasChanges() || loading()"
              class="btn btn-secondary"
            >
              <i class="pi pi-refresh"></i>
              Reset Changes
            </button>

            <button
              type="submit"
              [disabled]="appearanceForm.invalid || !hasChanges() || loading()"
              class="btn btn-primary"
            >
              @if (loading()) {
                <div class="btn-spinner"></div>
                Updating...
              } @else {
                <i class="pi pi-check"></i>
                Save Changes
              }
            </button>
          </div>
        </form>
      </div>

      <!-- Info Card -->
      <div class="info-card">
        <div class="info-icon">
          <i class="pi pi-info-circle"></i>
        </div>
        <p class="info-text">
          Changes to theme and display preferences will be applied immediately as you make them.
          Other settings will be saved when you click "Save Changes".
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .appearance-settings {
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

      /* Alerts */
      .alert {
        @apply flex items-start gap-3 p-4 rounded-lg mb-6;
        animation: slideIn 0.3s ease-out;
      }

      .alert-success {
        background-color: #d1f4e0;
        border: 1px solid #a3e4c1;
      }

      .alert-error {
        background-color: #ffe0e0;
        border: 1px solid #ffb3b3;
      }

      .alert-icon {
        @apply flex-shrink-0 w-5 h-5 flex items-center justify-center;
      }

      .alert-success .alert-icon {
        color: #0f9960;
      }

      .alert-error .alert-icon {
        color: #d32f2f;
      }

      .alert-content {
        @apply flex-1;
      }

      .alert-content h4 {
        @apply font-semibold mb-1;
        color: #d32f2f;
      }

      .alert-content p {
        @apply text-sm;
      }

      .alert-success .alert-content p {
        color: #0a5c3c;
      }

      .alert-error .alert-content p {
        color: #9a2020;
      }

      .alert-close {
        @apply flex-shrink-0 p-1 rounded transition-colors;
      }

      .alert-close:hover {
        background: rgba(0, 0, 0, 0.05);
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

      /* Theme Option */
      .theme-option {
        @apply flex items-center justify-between p-4 rounded-lg;
        background-color: var(--color-background);
        border: 1px solid var(--color-border-light);
      }

      .option-content {
        @apply flex-1;
      }

      .option-title {
        @apply text-sm font-semibold mb-1;
        color: var(--color-text-primary);
      }

      .option-description {
        @apply text-xs;
        color: var(--color-text-secondary);
      }

      /* Form */
      .form-content {
        @apply space-y-6;
      }

      .form-section {
        @apply space-y-3;
      }

      .form-section-label {
        @apply block text-sm font-semibold;
        color: var(--color-text-primary);
      }

      .radio-group {
        @apply space-y-2;
      }

      .radio-option {
        @apply flex items-center p-3 rounded-lg cursor-pointer transition-all;
        background-color: var(--color-background);
        border: 1px solid var(--color-border-light);
      }

      .radio-option:hover {
        border-color: var(--color-border);
      }

      .radio-input {
        @apply w-4 h-4 cursor-pointer;
        accent-color: var(--color-primary-600);
      }

      .radio-label {
        @apply ml-3 text-sm;
        color: var(--color-text-primary);
      }

      /* Toggle Options */
      .toggle-options {
        @apply space-y-4;
      }

      .toggle-item {
        @apply flex items-center gap-4 p-4 rounded-lg;
        background-color: var(--color-background);
      }

      .toggle-content {
        @apply flex-1 min-w-0;
      }

      .toggle-title {
        @apply text-sm font-semibold mb-1;
        color: var(--color-text-primary);
      }

      .toggle-description {
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

      /* Form Actions */
      .form-actions {
        @apply flex items-center justify-end gap-3 pt-6 border-t;
        border-color: var(--color-border-light);
      }

      /* Buttons */
      .btn {
        @apply inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all;
      }

      .btn:disabled {
        @apply opacity-50 cursor-not-allowed;
      }

      .btn-secondary {
        background-color: var(--color-surface);
        border: 1px solid var(--color-border);
        color: var(--color-text-secondary);
      }

      .btn-secondary:hover:not(:disabled) {
        background-color: var(--color-gray-50);
        border-color: var(--color-border-dark);
      }

      .btn-primary {
        background-color: var(--color-primary-600);
        color: white;
        border: 1px solid transparent;
      }

      .btn-primary:hover:not(:disabled) {
        background-color: var(--color-primary-700);
        box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
      }

      .btn-spinner {
        @apply w-4 h-4 border-2 border-white border-t-transparent rounded-full;
        animation: spin 0.6s linear infinite;
      }

      /* Info Card */
      .info-card {
        @apply flex gap-3 p-4 rounded-lg;
        background-color: var(--color-primary-50);
        border: 1px solid var(--color-primary-200);
      }

      .info-icon {
        @apply flex-shrink-0 w-5 h-5 flex items-center justify-center;
        color: var(--color-primary-600);
      }

      .info-text {
        @apply text-sm flex-1;
        color: var(--color-primary-800);
      }

      /* Animations */
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .appearance-settings {
          @apply px-4 py-6;
        }

        .settings-title {
          @apply text-2xl;
        }

        .settings-card {
          @apply p-5;
        }

        .theme-option {
          @apply flex-col items-start gap-3;
        }

        .form-actions {
          @apply flex-col;
        }

        .btn {
          @apply w-full justify-center;
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
