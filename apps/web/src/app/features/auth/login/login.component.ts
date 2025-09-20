import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService, LoginCredentials } from '../../../core/auth/auth.service';
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
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <!-- Back button -->
        <div class="text-left">
          <a routerLink="/welcome"
             class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors">
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
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Or
            <a routerLink="/auth/register"
               class="font-medium text-primary-600 hover:text-primary-500 transition-colors">
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
              <label for="email" class="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div class="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  formControlName="email"
                  class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                  [class.border-error-500]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
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
              <label for="password" class="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div class="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  autocomplete="current-password"
                  formControlName="password"
                  class="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                  [class.border-error-500]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
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
              <label for="remember-me" class="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div class="text-sm">
              <a routerLink="/auth/password-reset"
                 class="font-medium text-primary-600 hover:text-primary-500 transition-colors">
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

          <!-- Development Environment Test Credentials -->
          @if (isDevelopment()) {
            <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h4 class="text-sm font-medium text-yellow-800 mb-2">
                <i class="pi pi-info-circle mr-1"></i>
                Development Test Credentials
              </h4>
              <div class="text-xs text-yellow-700 space-y-1">
                <div><strong>Admin:</strong> admin&#64;example.com / Test123!&#64;#</div>
                <div><strong>User:</strong> user&#64;example.com / Test123!&#64;#</div>
                <div><strong>Readonly:</strong> readonly&#64;example.com / Test123!&#64;#</div>
              </div>
              <button
                type="button"
                (click)="fillTestCredentials('admin')"
                class="mt-2 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded transition-colors">
                Fill Admin Credentials
              </button>
            </div>
          }
        </form>
      </div>
    </div>
  `,
  styles: [`
    /* Custom animations */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .animate-fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }

    /* Focus styles for accessibility */
    input:focus {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    /* Smooth transitions */
    * {
      transition-property: color, background-color, border-color;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  private returnUrl: string = '/dashboard';

  protected readonly loginForm: FormGroup;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Get return URL from query parameters or default to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

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
        password: this.loginForm.value.password
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
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach(key => {
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
      admin: { email: 'admin@example.com', password: 'Test123!@#' },
      user: { email: 'user@example.com', password: 'Test123!@#' },
      readonly: { email: 'readonly@example.com', password: 'Test123!@#' }
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

