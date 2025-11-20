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
      <!-- Header -->
      <div class="settings-header">
        <h1 class="settings-title">General Settings</h1>
        <p class="settings-subtitle">Manage your basic preferences and account information.</p>
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

      <!-- Account Information Card -->
      <div class="settings-card">
        <h2 class="card-title">Account Information</h2>

        @if (user()) {
          <div class="account-info">
            <div class="account-avatar">
              <span>{{ getInitials(user()!.firstName, user()!.lastName) }}</span>
            </div>
            <div class="account-details">
              <h3 class="account-name">{{ user()!.firstName }} {{ user()!.lastName }}</h3>
              <p class="account-email">{{ user()!.email }}</p>
              <p class="account-meta">Member since {{ formatDate(user()!.createdAt) }}</p>
            </div>
          </div>
        }
      </div>

      <!-- Preferences Card -->
      <div class="settings-card">
        <h2 class="card-title">Preferences</h2>

        <form [formGroup]="preferencesForm" (ngSubmit)="onSubmit()" novalidate>
          <div class="form-grid">
            <!-- Language -->
            <div class="form-field">
              <label for="language" class="form-label">Language</label>
              <select id="language" formControlName="language" class="form-select">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
              </select>
            </div>

            <!-- Timezone -->
            <div class="form-field">
              <label for="timezone" class="form-label">Timezone</label>
              <select id="timezone" formControlName="timezone" class="form-select">
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
            <div class="form-field">
              <label for="dateFormat" class="form-label">Date Format</label>
              <select id="dateFormat" formControlName="dateFormat" class="form-select">
                <option value="MM/DD/YYYY">MM/DD/YYYY (12/25/2024)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (25/12/2024)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-25)</option>
                <option value="MMM DD, YYYY">MMM DD, YYYY (Dec 25, 2024)</option>
              </select>
            </div>

            <!-- Time Format -->
            <div class="form-field">
              <label for="timeFormat" class="form-label">Time Format</label>
              <select id="timeFormat" formControlName="timeFormat" class="form-select">
                <option value="12h">12-hour (2:30 PM)</option>
                <option value="24h">24-hour (14:30)</option>
              </select>
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
              [disabled]="preferencesForm.invalid || !hasChanges() || loading()"
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
    </div>
  `,
  styles: [
    `
      .general-settings {
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

      /* Account Info */
      .account-info {
        @apply flex items-center gap-4;
      }

      .account-avatar {
        @apply w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      .account-avatar span {
        @apply text-2xl font-bold text-white;
      }

      .account-details {
        @apply flex-1;
      }

      .account-name {
        @apply text-lg font-semibold mb-1;
        color: var(--color-text-primary);
      }

      .account-email {
        @apply text-sm mb-1;
        color: var(--color-text-secondary);
      }

      .account-meta {
        @apply text-xs;
        color: var(--color-text-muted);
      }

      /* Form */
      .form-grid {
        @apply grid grid-cols-1 md:grid-cols-2 gap-6 mb-6;
      }

      .form-field {
        @apply flex flex-col;
      }

      .form-label {
        @apply text-sm font-medium mb-2;
        color: var(--color-text-primary);
      }

      .form-select {
        @apply px-3 py-2.5 rounded-lg border transition-all;
        background-color: var(--color-surface);
        border-color: var(--color-border);
        color: var(--color-text-primary);
        font-size: 14px;
      }

      .form-select:hover {
        border-color: var(--color-border-dark);
      }

      .form-select:focus {
        @apply outline-none ring-2;
        border-color: var(--color-primary-500);
        ring-color: rgba(99, 102, 241, 0.1);
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
        .general-settings {
          @apply px-4 py-6;
        }

        .settings-title {
          @apply text-2xl;
        }

        .settings-card {
          @apply p-5;
        }

        .form-grid {
          @apply grid-cols-1;
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
