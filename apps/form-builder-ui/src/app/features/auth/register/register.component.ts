import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { environment } from '@env/environment';

interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}

/**
 * Registration component with advanced validation and password strength indicator.
 * Handles new user registration with comprehensive form validation.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div
      class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 auth-container"
    >
      <div class="max-w-md w-full space-y-8">
        <!-- Back button -->
        <div class="text-left">
          <a routerLink="/welcome" class="inline-flex items-center text-sm auth-back-link">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              ></path>
            </svg>
            Back to home
          </a>
        </div>

        <!-- Header -->
        <div>
          <div
            class="mx-auto h-12 w-12 flex items-center justify-center bg-primary-600 rounded-full"
          >
            <i class="pi pi-user-plus text-white text-xl"></i>
          </div>
          <h2 class="mt-6 text-center text-3xl font-extrabold auth-title">Create your account</h2>
          <p class="mt-2 text-center text-sm auth-subtitle">
            Or
            <a routerLink="/auth/login" class="font-medium auth-link">
              sign in to your existing account
            </a>
          </p>
        </div>

        <!-- Registration Form -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-6" novalidate>
          <!-- Error Message -->
          @if (error()) {
            <div class="rounded-md bg-error-50 p-4 animate-fade-in">
              <div class="flex">
                <div class="flex-shrink-0">
                  <i class="pi pi-exclamation-triangle text-error-400"></i>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-error-800">Registration Error</h3>
                  <div class="mt-2 text-sm text-error-700">
                    {{ error() }}
                  </div>
                </div>
              </div>
            </div>
          }

          <div class="space-y-4">
            <!-- Name Fields Row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- First Name -->
              <div>
                <label for="firstName" class="block text-sm font-medium auth-label">
                  First Name
                </label>
                <div class="mt-1 relative">
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autocomplete="given-name"
                    formControlName="firstName"
                    class="appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:z-10 sm:text-sm auth-input"
                    [class.error]="
                      registerForm.get('firstName')?.invalid &&
                      registerForm.get('firstName')?.touched
                    "
                    placeholder="First name"
                    aria-describedby="firstName-error"
                  />
                  @if (
                    registerForm.get('firstName')?.invalid && registerForm.get('firstName')?.touched
                  ) {
                    <div
                      class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
                    >
                      <i class="pi pi-exclamation-circle text-error-500"></i>
                    </div>
                  }
                </div>
                @if (
                  registerForm.get('firstName')?.invalid && registerForm.get('firstName')?.touched
                ) {
                  <p class="mt-2 text-sm text-error-600" id="firstName-error">
                    @if (registerForm.get('firstName')?.hasError('required')) {
                      First name is required
                    } @else if (registerForm.get('firstName')?.hasError('minlength')) {
                      First name must be at least 2 characters
                    }
                  </p>
                }
              </div>

              <!-- Last Name -->
              <div>
                <label for="lastName" class="block text-sm font-medium auth-label">
                  Last Name
                </label>
                <div class="mt-1 relative">
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autocomplete="family-name"
                    formControlName="lastName"
                    class="appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:z-10 sm:text-sm auth-input"
                    [class.error]="
                      registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched
                    "
                    placeholder="Last name"
                    aria-describedby="lastName-error"
                  />
                  @if (
                    registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched
                  ) {
                    <div
                      class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
                    >
                      <i class="pi pi-exclamation-circle text-error-500"></i>
                    </div>
                  }
                </div>
                @if (
                  registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched
                ) {
                  <p class="mt-2 text-sm text-error-600" id="lastName-error">
                    @if (registerForm.get('lastName')?.hasError('required')) {
                      Last name is required
                    } @else if (registerForm.get('lastName')?.hasError('minlength')) {
                      Last name must be at least 2 characters
                    }
                  </p>
                }
              </div>
            </div>

            <!-- Email Field -->
            <div>
              <label for="email" class="block text-sm font-medium auth-label">
                Email address
              </label>
              <div class="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  formControlName="email"
                  class="appearance-none relative block w-full px-3 py-2 border rounded-md focus:outline-none focus:z-10 sm:text-sm auth-input"
                  [class.error]="
                    registerForm.get('email')?.invalid && registerForm.get('email')?.touched
                  "
                  placeholder="Enter your email"
                  aria-describedby="email-error"
                />
                @if (registerForm.get('email')?.invalid && registerForm.get('email')?.touched) {
                  <div
                    class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
                  >
                    <i class="pi pi-exclamation-circle text-error-500"></i>
                  </div>
                }
              </div>
              @if (registerForm.get('email')?.invalid && registerForm.get('email')?.touched) {
                <p class="mt-2 text-sm text-error-600" id="email-error">
                  @if (registerForm.get('email')?.hasError('required')) {
                    Email is required
                  } @else if (registerForm.get('email')?.hasError('email')) {
                    Please enter a valid email address
                  }
                </p>
              }
            </div>

            <!-- Password Field -->
            <div>
              <label for="password" class="block text-sm font-medium auth-label"> Password </label>
              <div class="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  autocomplete="new-password"
                  formControlName="password"
                  class="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                  [class.error]="
                    registerForm.get('password')?.invalid && registerForm.get('password')?.touched
                  "
                  placeholder="Create a strong password"
                  aria-describedby="password-error password-strength"
                />
                <button
                  type="button"
                  (click)="togglePasswordVisibility()"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label="Toggle password visibility"
                >
                  <i
                    [class]="showPassword() ? 'pi pi-eye-slash' : 'pi pi-eye'"
                    class="text-gray-400 hover:text-gray-600 transition-colors"
                  ></i>
                </button>
              </div>

              <!-- Password Strength Indicator -->
              @if (registerForm.get('password')?.value) {
                <div class="mt-2" id="password-strength">
                  <div class="flex items-center space-x-2 text-xs">
                    <span style="color: var(--color-text-secondary)">Strength:</span>
                    <div class="flex space-x-1">
                      @for (level of passwordStrengthLevels; track level; let i = $index) {
                        <div
                          class="h-1.5 w-6 rounded-full transition-colors"
                          [class]="getPasswordStrengthColor(i)"
                        ></div>
                      }
                    </div>
                    <span [class]="getPasswordStrengthTextColor()">
                      {{ passwordStrengthText() }}
                    </span>
                  </div>

                  <!-- Password Requirements -->
                  <div class="mt-2 space-y-1">
                    <div class="flex items-center space-x-2 text-xs">
                      <i
                        [class]="
                          hasMinLength()
                            ? 'pi pi-check text-success-600'
                            : 'pi pi-times text-error-500'
                        "
                      ></i>
                      <span
                        [class]="
                          hasMinLength() ? 'password-requirement valid' : 'password-requirement'
                        "
                      >
                        At least 8 characters
                      </span>
                    </div>
                    <div class="flex items-center space-x-2 text-xs">
                      <i
                        [class]="
                          hasUppercase()
                            ? 'pi pi-check text-success-600'
                            : 'pi pi-times text-error-500'
                        "
                      ></i>
                      <span
                        [class]="
                          hasUppercase() ? 'password-requirement valid' : 'password-requirement'
                        "
                      >
                        One uppercase letter
                      </span>
                    </div>
                    <div class="flex items-center space-x-2 text-xs">
                      <i
                        [class]="
                          hasLowercase()
                            ? 'pi pi-check text-success-600'
                            : 'pi pi-times text-error-500'
                        "
                      ></i>
                      <span
                        [class]="
                          hasLowercase() ? 'password-requirement valid' : 'password-requirement'
                        "
                      >
                        One lowercase letter
                      </span>
                    </div>
                    <div class="flex items-center space-x-2 text-xs">
                      <i
                        [class]="
                          hasNumber()
                            ? 'pi pi-check text-success-600'
                            : 'pi pi-times text-error-500'
                        "
                      ></i>
                      <span
                        [class]="
                          hasNumber() ? 'password-requirement valid' : 'password-requirement'
                        "
                      >
                        One number
                      </span>
                    </div>
                    <div class="flex items-center space-x-2 text-xs">
                      <i
                        [class]="
                          hasSpecialChar()
                            ? 'pi pi-check text-success-600'
                            : 'pi pi-times text-error-500'
                        "
                      ></i>
                      <span
                        [class]="
                          hasSpecialChar() ? 'password-requirement valid' : 'password-requirement'
                        "
                      >
                        One special character
                      </span>
                    </div>
                  </div>
                </div>
              }

              @if (registerForm.get('password')?.invalid && registerForm.get('password')?.touched) {
                <p class="mt-2 text-sm text-error-600" id="password-error">
                  @if (registerForm.get('password')?.hasError('required')) {
                    Password is required
                  } @else if (registerForm.get('password')?.hasError('passwordStrength')) {
                    Password does not meet security requirements
                  }
                </p>
              }
            </div>

            <!-- Confirm Password Field -->
            <div>
              <label for="confirmPassword" class="block text-sm font-medium auth-label">
                Confirm Password
              </label>
              <div class="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  [type]="showConfirmPassword() ? 'text' : 'password'"
                  autocomplete="new-password"
                  formControlName="confirmPassword"
                  class="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                  [class.error]="
                    registerForm.get('confirmPassword')?.invalid &&
                    registerForm.get('confirmPassword')?.touched
                  "
                  placeholder="Confirm your password"
                  aria-describedby="confirmPassword-error"
                />
                <button
                  type="button"
                  (click)="toggleConfirmPasswordVisibility()"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label="Toggle confirm password visibility"
                >
                  <i
                    [class]="showConfirmPassword() ? 'pi pi-eye-slash' : 'pi pi-eye'"
                    class="text-gray-400 hover:text-gray-600 transition-colors"
                  ></i>
                </button>
              </div>
              @if (
                registerForm.get('confirmPassword')?.invalid &&
                registerForm.get('confirmPassword')?.touched
              ) {
                <p class="mt-2 text-sm text-error-600" id="confirmPassword-error">
                  @if (registerForm.get('confirmPassword')?.hasError('required')) {
                    Please confirm your password
                  } @else if (registerForm.hasError('passwordMismatch')) {
                    Passwords do not match
                  }
                </p>
              }
            </div>

            <!-- Terms Acceptance -->
            <div class="flex items-start">
              <div class="flex items-center h-5">
                <input
                  id="acceptTerms"
                  name="acceptTerms"
                  type="checkbox"
                  formControlName="acceptTerms"
                  class="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                  aria-describedby="acceptTerms-error"
                />
              </div>
              <div class="ml-3 text-sm">
                <label for="acceptTerms" class="terms-label">
                  I agree to the
                  <a href="#" class="font-medium auth-link"> Terms of Service </a>
                  and
                  <a href="#" class="font-medium auth-link"> Privacy Policy </a>
                </label>
                @if (
                  registerForm.get('acceptTerms')?.invalid &&
                  registerForm.get('acceptTerms')?.touched
                ) {
                  <p class="mt-1 text-sm text-error-600" id="acceptTerms-error">
                    You must accept the terms and conditions
                  </p>
                }
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div>
            <button
              type="submit"
              [disabled]="registerForm.invalid || loading()"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              @if (loading()) {
                <svg
                  class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating account...
              } @else {
                <i class="pi pi-user-plus mr-2"></i>
                Create Account
              }
            </button>
          </div>
        </form>
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

      .auth-back-link {
        color: var(--color-text-secondary);
        transition: var(--transition-colors);
      }

      .auth-back-link:hover {
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

      .terms-label {
        color: var(--color-text-secondary);
      }

      .password-strength-text {
        transition: var(--transition-colors);
      }

      .password-requirement {
        color: var(--color-text-secondary);
        transition: var(--transition-colors);
      }

      .password-requirement.valid {
        color: var(--color-success-700);
      }

      /* Custom animations */
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .animate-fade-in {
        animation: fadeIn 0.3s ease-in-out;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);

  protected readonly registerForm: FormGroup;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  // Password strength tracking
  protected readonly passwordStrengthLevels = [1, 2, 3, 4];

  // Computed password strength indicators
  protected readonly hasMinLength = computed(() => {
    const password = this.registerForm?.get('password')?.value || '';
    return password.length >= 8;
  });

  protected readonly hasUppercase = computed(() => {
    const password = this.registerForm?.get('password')?.value || '';
    return /[A-Z]/.test(password);
  });

  protected readonly hasLowercase = computed(() => {
    const password = this.registerForm?.get('password')?.value || '';
    return /[a-z]/.test(password);
  });

  protected readonly hasNumber = computed(() => {
    const password = this.registerForm?.get('password')?.value || '';
    return /\d/.test(password);
  });

  protected readonly hasSpecialChar = computed(() => {
    const password = this.registerForm?.get('password')?.value || '';
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  });

  protected readonly passwordStrength = computed(() => {
    let strength = 0;
    if (this.hasMinLength()) strength++;
    if (this.hasUppercase()) strength++;
    if (this.hasLowercase()) strength++;
    if (this.hasNumber()) strength++;
    if (this.hasSpecialChar()) strength++;
    return strength;
  });

  protected readonly passwordStrengthText = computed(() => {
    const strength = this.passwordStrength();
    if (strength <= 1) return 'Weak';
    if (strength <= 2) return 'Fair';
    if (strength <= 3) return 'Good';
    if (strength <= 4) return 'Strong';
    return 'Very Strong';
  });

  constructor() {
    this.registerForm = this.fb.group(
      {
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, this.passwordStrengthValidator]],
        confirmPassword: ['', [Validators.required]],
        acceptTerms: [false, [Validators.requiredTrue]],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  /**
   * Handles form submission and user registration.
   */
  onSubmit(): void {
    if (this.registerForm.valid && !this.loading()) {
      const formData = this.registerForm.value;
      const registerData: RegisterData = {
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
        acceptTerms: formData.acceptTerms,
      };

      this.loading.set(true);
      this.error.set(null);

      this.authService.register(registerData).subscribe({
        next: () => {
          // Navigation handled by AuthService
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.handleError(error);
        },
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.registerForm.controls).forEach((key) => {
        this.registerForm.get(key)?.markAsTouched();
      });
    }
  }

  /**
   * Toggles password visibility.
   */
  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  /**
   * Toggles confirm password visibility.
   */
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  /**
   * Gets the color class for password strength level indicators.
   */
  getPasswordStrengthColor(index: number): string {
    const strength = this.passwordStrength();
    if (index < strength) {
      if (strength <= 1) return 'bg-error-500';
      if (strength <= 2) return 'bg-warning-500';
      if (strength <= 3) return 'bg-yellow-500';
      if (strength <= 4) return 'bg-success-500';
      return 'bg-success-600';
    }
    return 'bg-gray-200';
  }

  /**
   * Gets the text color class for password strength text.
   */
  getPasswordStrengthTextColor(): string {
    const strength = this.passwordStrength();
    if (strength <= 1) return 'text-error-600';
    if (strength <= 2) return 'text-warning-600';
    if (strength <= 3) return 'text-yellow-600';
    if (strength <= 4) return 'text-success-600';
    return 'text-success-700';
  }

  /**
   * Custom validator for password strength requirements.
   */
  private passwordStrengthValidator = (control: AbstractControl): ValidationErrors | null => {
    const password = control.value || '';

    if (password.length === 0) return null; // Let required handle empty passwords

    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

    return isValid ? null : { passwordStrength: true };
  };

  /**
   * Custom validator to check if passwords match.
   */
  private passwordMatchValidator = (form: AbstractControl): ValidationErrors | null => {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  };

  /**
   * Handles registration errors with user-friendly messages.
   */
  private handleError(error: any): void {
    if (error.status === 409) {
      this.error.set(
        'An account with this email already exists. Please use a different email or try signing in.',
      );
    } else if (error.status === 400) {
      this.error.set('Please check your information and try again.');
    } else if (error.status === 0) {
      this.error.set('Unable to connect to the server. Please check your internet connection.');
    } else {
      this.error.set('An unexpected error occurred. Please try again later.');
    }

    // Clear error after 8 seconds
    setTimeout(() => {
      this.error.set(null);
    }, 8000);
  }
}
