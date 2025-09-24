import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

/**
 * Password reset confirmation component for token-based password reset.
 * Handles token validation and new password submission.
 */
@Component({
  selector: 'app-password-reset-confirm',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div
      class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 auth-container"
    >
      <div class="max-w-md w-full space-y-8">
        <!-- Header -->
        <div>
          <div
            class="mx-auto h-12 w-12 flex items-center justify-center bg-primary-600 rounded-full"
          >
            <i class="pi pi-lock text-white text-xl"></i>
          </div>
          <h2 class="mt-6 text-center text-3xl font-extrabold auth-title">Set new password</h2>
          <p class="mt-2 text-center text-sm auth-subtitle">
            Enter your new password below to complete the reset process.
          </p>
        </div>

        @if (!resetSuccess()) {
          <!-- Password Reset Confirmation Form -->
          <form [formGroup]="confirmForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-6" novalidate>
            <!-- Error Message -->
            @if (error()) {
              <div class="rounded-md bg-error-50 p-4 animate-fade-in">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <i class="pi pi-exclamation-triangle text-error-400"></i>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-sm font-medium text-error-800">Reset Failed</h3>
                    <div class="mt-2 text-sm text-error-700">
                      {{ error() }}
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- New Password Field -->
            <div>
              <label for="password" class="block text-sm font-medium mb-1 auth-label">
                New Password
              </label>
              <input
                id="password"
                type="password"
                formControlName="password"
                placeholder="Enter your new password"
                class="appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:z-10 sm:text-sm auth-input"
                [class.error]="
                  confirmForm.get('password')?.invalid && confirmForm.get('password')?.touched
                "
                [attr.aria-invalid]="
                  confirmForm.get('password')?.invalid && confirmForm.get('password')?.touched
                "
                [attr.aria-describedby]="
                  confirmForm.get('password')?.invalid && confirmForm.get('password')?.touched
                    ? 'password-error'
                    : null
                "
              />
              @if (confirmForm.get('password')?.invalid && confirmForm.get('password')?.touched) {
                <div id="password-error" class="mt-1 text-sm text-error-600" role="alert">
                  @if (confirmForm.get('password')?.hasError('required')) {
                    Password is required.
                  }
                  @if (confirmForm.get('password')?.hasError('minlength')) {
                    Password must be at least 8 characters long.
                  }
                  @if (confirmForm.get('password')?.hasError('pattern')) {
                    Password must contain at least one uppercase letter, one lowercase letter, one
                    number, and one special character.
                  }
                </div>
              }

              <!-- Password Strength Indicator -->
              @if (confirmForm.get('password')?.value) {
                <div class="mt-2">
                  <div class="flex items-center space-x-2">
                    <div class="flex space-x-1 flex-1">
                      @for (strength of [1, 2, 3, 4]; track strength) {
                        <div
                          class="h-2 flex-1 rounded-full"
                          [class.bg-gray-200]="passwordStrength() < strength"
                          [class.bg-error-400]="
                            passwordStrength() >= strength && passwordStrength() <= 2
                          "
                          [class.bg-warning-400]="
                            passwordStrength() >= strength && passwordStrength() === 3
                          "
                          [class.bg-success-400]="
                            passwordStrength() >= strength && passwordStrength() === 4
                          "
                        ></div>
                      }
                    </div>
                    <span
                      class="text-xs font-medium strength-text"
                      [class.weak]="passwordStrength() <= 1"
                      [class.fair]="passwordStrength() === 2"
                      [class.good]="passwordStrength() === 3"
                      [class.strong]="passwordStrength() === 4"
                    >
                      {{ getStrengthText() }}
                    </span>
                  </div>
                </div>
              }
            </div>

            <!-- Confirm Password Field -->
            <div>
              <label for="confirmPassword" class="block text-sm font-medium mb-1 auth-label">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                formControlName="confirmPassword"
                placeholder="Confirm your new password"
                class="appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:z-10 sm:text-sm auth-input"
                [class.error]="
                  confirmForm.get('confirmPassword')?.invalid &&
                  confirmForm.get('confirmPassword')?.touched
                "
                [attr.aria-invalid]="
                  confirmForm.get('confirmPassword')?.invalid &&
                  confirmForm.get('confirmPassword')?.touched
                "
                [attr.aria-describedby]="
                  confirmForm.get('confirmPassword')?.invalid &&
                  confirmForm.get('confirmPassword')?.touched
                    ? 'confirm-password-error'
                    : null
                "
              />
              @if (
                confirmForm.get('confirmPassword')?.invalid &&
                confirmForm.get('confirmPassword')?.touched
              ) {
                <div id="confirm-password-error" class="mt-1 text-sm text-error-600" role="alert">
                  @if (confirmForm.get('confirmPassword')?.hasError('required')) {
                    Password confirmation is required.
                  }
                  @if (confirmForm.hasError('passwordMismatch')) {
                    Passwords do not match.
                  }
                </div>
              }
            </div>

            <!-- Submit Button -->
            <div>
              <button
                type="submit"
                [disabled]="confirmForm.invalid || loading()"
                class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                @if (loading()) {
                  <div class="flex items-center">
                    <div
                      class="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                    ></div>
                    Resetting Password...
                  </div>
                } @else {
                  <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                    <i
                      class="pi pi-check text-primary-500 group-hover:text-primary-400 transition-colors"
                    ></i>
                  </span>
                  Reset Password
                }
              </button>
            </div>

            <!-- Back to Login -->
            <div class="text-center">
              <a routerLink="/auth/login" class="font-medium auth-link">
                <i class="pi pi-arrow-left mr-2"></i>
                Back to Sign In
              </a>
            </div>
          </form>
        } @else {
          <!-- Success Message -->
          <div class="text-center">
            <div
              class="mx-auto flex items-center justify-center h-16 w-16 rounded-full success-container mb-4"
            >
              <i class="pi pi-check success-icon text-2xl"></i>
            </div>
            <h3 class="text-lg font-medium mb-2 success-title">Password reset successful!</h3>
            <p class="text-sm mb-6 success-text">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <a
              routerLink="/auth/login"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
            >
              <i class="pi pi-sign-in mr-2"></i>
              Sign In Now
            </a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      /* Theme-aware color overrides */
      .auth-container {
        background-color: var(--color-background);
        color: var(--color-text-primary);
      }

      .auth-title {
        color: var(--color-text-primary);
      }

      .auth-subtitle {
        color: var(--color-text-secondary);
      }

      .auth-label {
        color: var(--color-text-primary);
      }

      .auth-input {
        background-color: var(--color-surface);
        color: var(--color-text-primary);
        border-color: var(--color-border);
        transition: var(--transition-colors);
      }

      .auth-input::placeholder {
        color: var(--color-text-muted);
      }

      .auth-input:focus {
        border-color: var(--color-primary-500);
        box-shadow: 0 0 0 3px var(--color-primary-100);
      }

      .auth-input.error {
        border-color: var(--color-error-500);
      }

      .auth-link {
        color: var(--color-primary-600);
        transition: var(--transition-colors);
      }

      .auth-link:hover {
        color: var(--color-primary-500);
      }

      .strength-text {
        transition: var(--transition-colors);
      }

      .strength-text.weak {
        color: var(--color-error-600);
      }

      .strength-text.fair {
        color: var(--color-warning-600);
      }

      .strength-text.good {
        color: var(--color-warning-600);
      }

      .strength-text.strong {
        color: var(--color-success-600);
      }

      .success-container {
        background-color: var(--color-success-100);
        border: var(--border-width-1) solid var(--color-success-200);
      }

      .success-icon {
        color: var(--color-success-600);
      }

      .success-title {
        color: var(--color-text-primary);
      }

      .success-text {
        color: var(--color-text-secondary);
      }

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
export class PasswordResetConfirmComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);

  protected readonly confirmForm: FormGroup;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resetSuccess = signal(false);
  protected readonly passwordStrength = signal(0);

  private resetToken: string = '';

  constructor() {
    this.confirmForm = this.fb.group(
      {
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator },
    );

    // Monitor password changes for strength calculation
    this.confirmForm.get('password')?.valueChanges.subscribe((password) => {
      this.passwordStrength.set(this.calculatePasswordStrength(password));
    });
  }

  ngOnInit(): void {
    // Get reset token from route parameters
    this.resetToken = this.route.snapshot.paramMap.get('token') || '';

    if (!this.resetToken) {
      this.error.set('Invalid or missing reset token.');
      return;
    }

    // Validate token on component initialization
    this.validateToken();
  }

  /**
   * Handles form submission for password reset confirmation.
   */
  protected onSubmit(): void {
    if (this.confirmForm.valid && !this.loading() && this.resetToken) {
      this.resetPassword();
    }
  }

  /**
   * Returns the password strength text based on current strength level.
   */
  protected getStrengthText(): string {
    switch (this.passwordStrength()) {
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return '';
    }
  }

  /**
   * Validates the reset token with the backend.
   */
  private validateToken(): void {
    this.loading.set(true);
    this.error.set(null);

    this.authService.validatePasswordResetToken(this.resetToken).subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.handleTokenError(error);
      },
    });
  }

  /**
   * Submits the new password to complete the reset process.
   */
  private resetPassword(): void {
    const newPassword = this.confirmForm.get('password')?.value;

    this.loading.set(true);
    this.error.set(null);

    this.authService.confirmPasswordReset(this.resetToken, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.resetSuccess.set(true);
      },
      error: (error) => {
        this.loading.set(false);
        this.handleResetError(error);
      },
    });
  }

  /**
   * Calculates password strength based on various criteria.
   */
  private calculatePasswordStrength(password: string): number {
    if (!password) return 0;

    let strength = 0;

    // Length check
    if (password.length >= 8) strength++;

    // Character variety checks
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;

    // Bonus for longer passwords
    if (password.length >= 12) strength++;

    return Math.min(strength, 4);
  }

  /**
   * Custom validator to check if passwords match.
   */
  private passwordMatchValidator(control: AbstractControl): { [key: string]: any } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  /**
   * Handles token validation errors.
   */
  private handleTokenError(error: any): void {
    if (error.status === 400) {
      this.error.set('Invalid or expired reset token. Please request a new password reset.');
    } else if (error.status === 404) {
      this.error.set('Reset token not found. Please request a new password reset.');
    } else if (error.status === 0) {
      this.error.set('Network error. Please check your connection and try again.');
    } else {
      this.error.set('An unexpected error occurred. Please try again later.');
    }
  }

  /**
   * Handles password reset errors.
   */
  private handleResetError(error: any): void {
    if (error.status === 400) {
      this.error.set('Invalid password format or expired token.');
    } else if (error.status === 422) {
      this.error.set('Password does not meet security requirements.');
    } else if (error.status === 0) {
      this.error.set('Network error. Please check your connection and try again.');
    } else {
      this.error.set('Failed to reset password. Please try again.');
    }
  }
}
