import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Password reset request component for initial email submission.
 * Allows users to request password reset by providing their email address.
 */
@Component({
  selector: 'app-password-reset-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <!-- Header -->
        <div>
          <div class="mx-auto h-12 w-12 flex items-center justify-center bg-primary-600 rounded-full">
            <i class="pi pi-key text-white text-xl"></i>
          </div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        @if (!emailSent()) {
          <!-- Password Reset Request Form -->
          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="mt-8 space-y-6" novalidate>
            <!-- Error Message -->
            @if (error()) {
              <div class="rounded-md bg-error-50 p-4 animate-fade-in">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <i class="pi pi-exclamation-triangle text-error-400"></i>
                  </div>
                  <div class="ml-3">
                    <h3 class="text-sm font-medium text-error-800">
                      Error
                    </h3>
                    <div class="mt-2 text-sm text-error-700">
                      {{ error() }}
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Email Field -->
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="Enter your email address"
                class="appearance-none relative block w-full px-3 py-2 border"
                [class.border-gray-300]="!resetForm.get('email')?.invalid || !resetForm.get('email')?.touched"
                [class.border-error-300]="resetForm.get('email')?.invalid && resetForm.get('email')?.touched"
                [class.focus:border-primary-500]="!resetForm.get('email')?.invalid"
                [class.focus:border-error-500]="resetForm.get('email')?.invalid"
                class="rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:z-10 sm:text-sm"
                [attr.aria-invalid]="resetForm.get('email')?.invalid && resetForm.get('email')?.touched"
                [attr.aria-describedby]="resetForm.get('email')?.invalid && resetForm.get('email')?.touched ? 'email-error' : null"
              />
              @if (resetForm.get('email')?.invalid && resetForm.get('email')?.touched) {
                <div id="email-error" class="mt-1 text-sm text-error-600" role="alert">
                  @if (resetForm.get('email')?.hasError('required')) {
                    Email address is required.
                  }
                  @if (resetForm.get('email')?.hasError('email')) {
                    Please enter a valid email address.
                  }
                </div>
              }
            </div>

            <!-- Submit Button -->
            <div>
              <button
                type="submit"
                [disabled]="resetForm.invalid || loading()"
                class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                @if (loading()) {
                  <div class="flex items-center">
                    <div class="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Sending Reset Link...
                  </div>
                } @else {
                  <span class="absolute left-0 inset-y-0 flex items-center pl-3">
                    <i class="pi pi-send text-primary-500 group-hover:text-primary-400 transition-colors"></i>
                  </span>
                  Send Reset Link
                }
              </button>
            </div>

            <!-- Back to Login -->
            <div class="text-center">
              <a routerLink="/auth/login"
                 class="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                <i class="pi pi-arrow-left mr-2"></i>
                Back to Sign In
              </a>
            </div>
          </form>
        } @else {
          <!-- Success Message -->
          <div class="text-center">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success-100 mb-4">
              <i class="pi pi-check text-success-600 text-2xl"></i>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">
              Reset link sent!
            </h3>
            <p class="text-sm text-gray-600 mb-6">
              We've sent a password reset link to <strong>{{ submittedEmail() }}</strong>.
              Please check your email and follow the instructions to reset your password.
            </p>
            <div class="space-y-3">
              <button
                (click)="resendEmail()"
                [disabled]="loading()"
                class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                @if (loading()) {
                  <div class="flex items-center">
                    <div class="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                    Resending...
                  </div>
                } @else {
                  <i class="pi pi-refresh mr-2"></i>
                  Resend Email
                }
              </button>
              <a routerLink="/auth/login"
                 class="block text-center font-medium text-primary-600 hover:text-primary-500 transition-colors">
                Back to Sign In
              </a>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PasswordResetRequestComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly resetForm: FormGroup;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly emailSent = signal(false);
  protected readonly submittedEmail = signal<string>('');

  constructor() {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  /**
   * Handles form submission for password reset request.
   * Validates email and sends reset request to backend.
   */
  protected onSubmit(): void {
    if (this.resetForm.valid && !this.loading()) {
      this.sendResetRequest();
    }
  }

  /**
   * Resends the password reset email.
   */
  protected resendEmail(): void {
    if (!this.loading()) {
      this.sendResetRequest();
    }
  }

  /**
   * Sends password reset request to the backend.
   */
  private sendResetRequest(): void {
    const email = this.resetForm.get('email')?.value;

    this.loading.set(true);
    this.error.set(null);

    this.authService.requestPasswordReset(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.submittedEmail.set(email);
        this.emailSent.set(true);
      },
      error: (error) => {
        this.loading.set(false);
        this.handleError(error);
      }
    });
  }

  /**
   * Handles API errors with user-friendly messages.
   */
  private handleError(error: any): void {
    if (error.status === 404) {
      this.error.set('No account found with this email address.');
    } else if (error.status === 429) {
      this.error.set('Too many reset requests. Please wait before trying again.');
    } else if (error.status === 0) {
      this.error.set('Network error. Please check your connection and try again.');
    } else {
      this.error.set('An unexpected error occurred. Please try again later.');
    }
  }
}