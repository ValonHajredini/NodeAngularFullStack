import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService, LoginCredentials } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { environment } from '@env/environment';

/**
 * Login component with reactive forms and comprehensive validation.
 * Handles user authentication with proper error handling and loading states.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 auth-container">
      <div class="max-w-md w-full space-y-8">
        <!-- Back button -->
        <div class="text-left">
          <a routerLink="/welcome" class="inline-flex items-center text-sm auth-back-link">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Back to home
          </a>
        </div>

        <!-- Header -->
        <div>
          <div class="mx-auto h-12 w-12 flex items-center justify-center bg-primary-600 rounded-full">
            <i class="pi pi-user text-white text-xl"></i>
          </div>
          <h2 class="mt-6 text-center text-3xl font-extrabold auth-title">
            Sign in to your account
          </h2>
          <p class="mt-2 text-center text-sm auth-subtitle">
            Or
            <a routerLink="/auth/register" class="font-medium auth-link">
              create a new account
            </a>
          </p>
        </div>

        <!-- Login Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-6" novalidate>
          <!-- Error Message -->
          @if (error()) {
            <div class="rounded-md bg-error-50 p-4 animate-fade-in">
              <div class="flex">
                <div class="flex-shrink-0">
                  <i class="pi pi-exclamation-triangle text-error-400"></i>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-error-800">
                    Authentication Error
                  </h3>
                  <div class="mt-2 text-sm text-error-700">
                    {{ error() }}
                  </div>
                </div>
              </div>
            </div>
          }

          <div class="space-y-4">
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
                  [class.error]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                  placeholder="Enter your email"
                  aria-describedby="email-error">
                @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                  <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <i class="pi pi-exclamation-circle text-error-500"></i>
                  </div>
                }
              </div>
              @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                <p class="mt-2 text-sm text-error-600" id="email-error">
                  @if (loginForm.get('email')?.hasError('required')) {
                    Email is required
                  } @else if (loginForm.get('email')?.hasError('email')) {
                    Please enter a valid email address
                  }
                </p>
              }
            </div>

            <!-- Password Field -->
            <div>
              <label for="password" class="block text-sm font-medium auth-label">
                Password
              </label>
              <div class="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  autocomplete="current-password"
                  formControlName="password"
                  class="appearance-none relative block w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:z-10 sm:text-sm auth-input"
                  [class.error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                  placeholder="Enter your password"
                  aria-describedby="password-error">
                <button
                  type="button"
                  (click)="togglePasswordVisibility()"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label="Toggle password visibility">
                  <i [class]="showPassword() ? 'pi pi-eye-slash' : 'pi pi-eye'"
                     class="text-gray-400 hover:text-gray-600 transition-colors"></i>
                </button>
              </div>
              @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
                <p class="mt-2 text-sm text-error-600" id="password-error">
                  @if (loginForm.get('password')?.hasError('required')) {
                    Password is required
                  } @else if (loginForm.get('password')?.hasError('minlength')) {
                    Password must be at least 8 characters long
                  }
                </p>
              }
            </div>
          </div>

          <!-- Remember me and Forgot password -->
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                formControlName="rememberMe"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded">
              <label for="remember-me" class="ml-2 block text-sm auth-checkbox-label">
                Remember me
              </label>
            </div>

            <div class="text-sm">
              <a routerLink="/auth/password-reset" class="font-medium auth-link">
                Forgot your password?
              </a>
            </div>
          </div>

          <!-- Submit Button -->
          <div>
            <button
              type="submit"
              [disabled]="loginForm.invalid || loading()"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              @if (loading()) {
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              } @else {
                <i class="pi pi-sign-in mr-2"></i>
                Sign in
              }
            </button>
          </div>

          <!-- Development Environment Test Users -->
          @if (isDevelopment()) {
            <div class="mt-6 p-4 rounded-md demo-section">
              <h4 class="text-sm font-medium mb-3 demo-title">
                <i class="pi pi-users mr-1"></i>
                Demo Users - Click email to auto-fill
              </h4>
              <div class="space-y-3">
                <!-- Admin User -->
                <div class="p-3 rounded border demo-card">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="text-sm font-medium demo-user-title">
                        <i class="pi pi-shield text-red-500 mr-1"></i>
                        Administrator
                      </div>
                      <button
                        type="button"
                        (click)="fillTestCredentials('admin')"
                        class="text-xs hover:underline demo-email-button">
                        admin@example.com
                      </button>
                      <div class="text-xs mt-1 demo-user-description">
                        Full system access • Can manage users and settings
                      </div>
                    </div>
                    <button
                      type="button"
                      (click)="fillTestCredentials('admin')"
                      class="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded transition-colors">
                      Use Account
                    </button>
                  </div>
                </div>

                <!-- Regular User -->
                <div class="p-3 rounded border demo-card">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="text-sm font-medium demo-user-title">
                        <i class="pi pi-user text-green-500 mr-1"></i>
                        Regular User
                      </div>
                      <button
                        type="button"
                        (click)="fillTestCredentials('user')"
                        class="text-xs hover:underline demo-email-button">
                        user@example.com
                      </button>
                      <div class="text-xs mt-1 demo-user-description">
                        Standard access • Can view reports and manage own data
                      </div>
                    </div>
                    <button
                      type="button"
                      (click)="fillTestCredentials('user')"
                      class="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded transition-colors">
                      Use Account
                    </button>
                  </div>
                </div>

                <!-- Readonly User -->
                <div class="p-3 rounded border demo-card">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="text-sm font-medium demo-user-title">
                        <i class="pi pi-eye text-gray-500 mr-1"></i>
                        Read-Only User
                      </div>
                      <button
                        type="button"
                        (click)="fillTestCredentials('readonly')"
                        class="text-xs hover:underline demo-email-button">
                        readonly@example.com
                      </button>
                      <div class="text-xs mt-1 demo-user-description">
                        View-only access • Can browse data but cannot modify
                      </div>
                    </div>
                    <button
                      type="button"
                      (click)="fillTestCredentials('readonly')"
                      class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded transition-colors">
                      Use Account
                    </button>
                  </div>
                </div>
              </div>

              <div class="mt-3 text-xs p-2 rounded demo-note">
                <i class="pi pi-info-circle mr-1"></i>
                All demo accounts use the shared password <code>User123!@#</code>
              </div>
            </div>
          }
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

      .auth-checkbox-label {
        color: var(--color-text-primary);
      }

      .auth-link {
        color: var(--color-primary-600);
        transition: var(--transition-colors);
      }

      .auth-link:hover {
        color: var(--color-primary-500);
      }

      .demo-section {
        background-color: var(--color-info-50);
        border-color: var(--color-info-200);
      }

      .demo-title {
        color: var(--color-info-800);
      }

      .demo-card {
        background-color: var(--color-surface);
        border-color: var(--color-info-100);
      }

      .demo-user-title {
        color: var(--color-text-primary);
      }

      .demo-email-button {
        color: var(--color-info-600);
        transition: var(--transition-colors);
      }

      .demo-email-button:hover {
        color: var(--color-info-800);
      }

      .demo-user-description {
        color: var(--color-text-muted);
      }

      .demo-note {
        color: var(--color-info-700);
        background-color: var(--color-info-100);
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
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);

  private returnUrl = '/app/dashboard';

  protected readonly loginForm: FormGroup;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false],
    });
  }

  ngOnInit(): void {
    // Get return URL from query parameters or default to form-builder
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/app/dashboard';

    // If user is already authenticated, redirect to return URL
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  /**
   * Handles form submission and authentication.
   */
  onSubmit(): void {
    if (this.loginForm.valid && !this.loading()) {
      const credentials: LoginCredentials = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password,
      };

      this.loading.set(true);
      this.error.set(null);

      this.authService.login(credentials).subscribe({
        next: () => {
          this.loading.set(false);
          // Navigate to return URL after successful login
          this.router.navigate([this.returnUrl]);
        },
        error: (error) => {
          this.loading.set(false);
          this.handleError(error);
        },
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
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
   * Fills form with test credentials for development.
   * @param role - User role for test credentials
   */
  fillTestCredentials(role: 'admin' | 'user' | 'readonly'): void {
    const credentials = {
      admin: { email: 'admin@example.com', password: 'User123!@#' },
      user: { email: 'user@example.com', password: 'User123!@#' },
      readonly: { email: 'readonly@example.com', password: 'User123!@#' },
    };

    this.loginForm.patchValue(credentials[role]);
  }

  /**
   * Checks if running in development environment.
   * @returns True if in development mode
   */
  isDevelopment(): boolean {
    return !environment.production;
  }

  /**
   * Handles authentication errors with user-friendly messages.
   * @param error - HTTP error response
   */
  private handleError(error: any): void {
    if (error.status === 401) {
      this.error.set('Invalid email or password. Please check your credentials and try again.');
    } else if (error.status === 429) {
      this.error.set('Too many login attempts. Please wait a few minutes before trying again.');
    } else if (error.status === 0) {
      this.error.set('Unable to connect to the server. Please check your internet connection.');
    } else {
      this.error.set('An unexpected error occurred. Please try again later.');
    }

    // Clear error after 5 seconds
    setTimeout(() => {
      this.error.set(null);
    }, 5000);
  }
}
