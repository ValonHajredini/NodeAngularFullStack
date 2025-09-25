import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User } from '@core/auth/auth.service';
import { ProfileService } from './profile.service';
import { TokenService } from '@core/services/token.service';
import {
  CreateApiTokenRequest,
  CreateApiTokenResponse,
  ApiTokenListResponse,
} from '@nodeangularfullstack/shared';

/**
 * User profile management component for displaying and editing user information.
 * Handles profile display, editing form, avatar management, and account status.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="py-8">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p class="mt-2 text-gray-600">Manage your account information and preferences.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Profile Overview Card -->
          <div class="lg:col-span-1">
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <!-- Avatar Section -->
                <div class="flex flex-col items-center">
                  <div class="relative">
                    <div
                      class="h-24 w-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center"
                    >
                      @if (user()?.firstName && user()?.lastName) {
                        <span class="text-2xl font-bold text-white">
                          {{ getInitials(user()!.firstName, user()!.lastName) }}
                        </span>
                      } @else {
                        <i class="pi pi-user text-2xl text-white"></i>
                      }
                    </div>
                    <button
                      type="button"
                      class="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      title="Upload avatar (coming soon)"
                    >
                      <i class="pi pi-camera text-gray-600 text-sm"></i>
                    </button>
                  </div>

                  @if (user()) {
                    <h3 class="mt-4 text-lg font-medium text-gray-900">
                      {{ user()!.firstName }} {{ user()!.lastName }}
                    </h3>
                    <p class="text-sm text-gray-500">{{ user()!.email }}</p>
                    <span
                      class="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      [class.bg-blue-100]="user()!.role === 'admin'"
                      [class.text-blue-800]="user()!.role === 'admin'"
                      [class.bg-green-100]="user()!.role === 'user'"
                      [class.text-green-800]="user()!.role === 'user'"
                      [class.bg-gray-100]="user()!.role === 'readonly'"
                      [class.text-gray-800]="user()!.role === 'readonly'"
                    >
                      <i
                        class="pi"
                        [class.pi-shield]="user()!.role === 'admin'"
                        [class.pi-user]="user()!.role === 'user'"
                        [class.pi-eye]="user()!.role === 'readonly'"
                        class="mr-1 text-xs"
                      ></i>
                      {{ getRoleDisplayName(user()!.role) }}
                    </span>
                  }
                </div>

                <!-- Account Status -->
                <div class="mt-6 border-t border-gray-200 pt-6">
                  <h4 class="text-sm font-medium text-gray-900 mb-3">Account Status</h4>
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-gray-600">Account Status</span>
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        <i class="pi pi-check-circle mr-1"></i>
                        Active
                      </span>
                    </div>
                    @if (user()) {
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-600">Member Since</span>
                        <span class="text-sm text-gray-900">{{
                          formatDate(user()!.createdAt)
                        }}</span>
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-600">Last Updated</span>
                        <span class="text-sm text-gray-900">{{
                          formatDate(user()!.updatedAt)
                        }}</span>
                      </div>
                    }
                    @if (lastLoginDate()) {
                      <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-600">Last Login</span>
                        <span class="text-sm text-gray-900">{{
                          formatDate(lastLoginDate()!)
                        }}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Profile Edit Form -->
          <div class="lg:col-span-2">
            <div class="bg-white shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-6">
                  Personal Information
                </h3>

                <!-- Success Message -->
                @if (successMessage()) {
                  <div class="mb-6 rounded-md bg-success-50 p-4 animate-fade-in">
                    <div class="flex">
                      <div class="flex-shrink-0">
                        <i class="pi pi-check-circle text-success-400"></i>
                      </div>
                      <div class="ml-3">
                        <p class="text-sm font-medium text-success-800">
                          {{ successMessage() }}
                        </p>
                      </div>
                      <div class="ml-auto pl-3">
                        <button
                          type="button"
                          (click)="successMessage.set(null)"
                          class="text-success-400 hover:text-success-600"
                        >
                          <i class="pi pi-times"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                }

                <!-- Error Message -->
                @if (error()) {
                  <div class="mb-6 rounded-md bg-error-50 p-4 animate-fade-in">
                    <div class="flex">
                      <div class="flex-shrink-0">
                        <i class="pi pi-exclamation-triangle text-error-400"></i>
                      </div>
                      <div class="ml-3">
                        <h3 class="text-sm font-medium text-error-800">Update Failed</h3>
                        <div class="mt-2 text-sm text-error-700">
                          {{ error() }}
                        </div>
                      </div>
                      <div class="ml-auto pl-3">
                        <button
                          type="button"
                          (click)="error.set(null)"
                          class="text-error-400 hover:text-error-600"
                        >
                          <i class="pi pi-times"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                }

                <form
                  [formGroup]="profileForm"
                  (ngSubmit)="onSubmit()"
                  class="space-y-6"
                  novalidate
                >
                  <!-- Personal Details Grid -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <!-- First Name -->
                    <div>
                      <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        formControlName="firstName"
                        class="appearance-none block w-full px-3 py-2 border"
                        [class.border-gray-300]="
                          !profileForm.get('firstName')?.invalid ||
                          !profileForm.get('firstName')?.touched
                        "
                        [class.border-error-300]="
                          profileForm.get('firstName')?.invalid &&
                          profileForm.get('firstName')?.touched
                        "
                        [class.focus:border-primary-500]="!profileForm.get('firstName')?.invalid"
                        [class.focus:border-error-500]="profileForm.get('firstName')?.invalid"
                        class="rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:z-10 sm:text-sm"
                        [attr.aria-invalid]="
                          profileForm.get('firstName')?.invalid &&
                          profileForm.get('firstName')?.touched
                        "
                        [attr.aria-describedby]="
                          profileForm.get('firstName')?.invalid &&
                          profileForm.get('firstName')?.touched
                            ? 'firstName-error'
                            : null
                        "
                      />
                      @if (
                        profileForm.get('firstName')?.invalid &&
                        profileForm.get('firstName')?.touched
                      ) {
                        <div id="firstName-error" class="mt-1 text-sm text-error-600" role="alert">
                          @if (profileForm.get('firstName')?.hasError('required')) {
                            First name is required.
                          }
                          @if (profileForm.get('firstName')?.hasError('minlength')) {
                            First name must be at least 2 characters long.
                          }
                        </div>
                      }
                    </div>

                    <!-- Last Name -->
                    <div>
                      <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        formControlName="lastName"
                        class="appearance-none block w-full px-3 py-2 border"
                        [class.border-gray-300]="
                          !profileForm.get('lastName')?.invalid ||
                          !profileForm.get('lastName')?.touched
                        "
                        [class.border-error-300]="
                          profileForm.get('lastName')?.invalid &&
                          profileForm.get('lastName')?.touched
                        "
                        [class.focus:border-primary-500]="!profileForm.get('lastName')?.invalid"
                        [class.focus:border-error-500]="profileForm.get('lastName')?.invalid"
                        class="rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:z-10 sm:text-sm"
                        [attr.aria-invalid]="
                          profileForm.get('lastName')?.invalid &&
                          profileForm.get('lastName')?.touched
                        "
                        [attr.aria-describedby]="
                          profileForm.get('lastName')?.invalid &&
                          profileForm.get('lastName')?.touched
                            ? 'lastName-error'
                            : null
                        "
                      />
                      @if (
                        profileForm.get('lastName')?.invalid && profileForm.get('lastName')?.touched
                      ) {
                        <div id="lastName-error" class="mt-1 text-sm text-error-600" role="alert">
                          @if (profileForm.get('lastName')?.hasError('required')) {
                            Last name is required.
                          }
                          @if (profileForm.get('lastName')?.hasError('minlength')) {
                            Last name must be at least 2 characters long.
                          }
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Email (Read-only) -->
                  <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      formControlName="email"
                      readonly
                      class="appearance-none block w-full px-3 py-2 border border-primary rounded-md bg-gray-100 text-muted sm:text-sm cursor-not-allowed"
                    />
                    <p class="mt-1 text-sm text-gray-500">
                      <i class="pi pi-info-circle mr-1"></i>
                      Email address cannot be changed. Contact support if you need to update your
                      email.
                    </p>
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
                      [disabled]="profileForm.invalid || !hasChanges() || loading()"
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

            <!-- Security Section -->
            <div class="mt-8 bg-white shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Security & Privacy</h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
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
                </div>
              </div>
            </div>

            <!-- API Tokens Section -->
            <div class="mt-8 bg-white shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h3 class="text-lg leading-6 font-medium text-gray-900">API Tokens</h3>
                    <p class="text-sm text-gray-500">
                      Generate and manage API tokens for external applications
                    </p>
                  </div>
                  <button
                    type="button"
                    (click)="showCreateTokenForm.set(!showCreateTokenForm())"
                    class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    <i class="pi pi-plus mr-2"></i>
                    Create Token
                  </button>
                </div>

                <!-- Token Creation Form -->
                @if (showCreateTokenForm()) {
                  <div class="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <!-- Token Success Message -->
                    @if (tokenSuccessMessage()) {
                      <div class="mb-4 rounded-md bg-success-50 p-4 animate-fade-in">
                        <div class="flex">
                          <div class="flex-shrink-0">
                            <i class="pi pi-check-circle text-success-400"></i>
                          </div>
                          <div class="ml-3 flex-1">
                            <h4 class="text-sm font-medium text-success-800 mb-2">
                              Token Created Successfully!
                            </h4>
                            <div class="bg-white border border-success-200 rounded p-3 mb-3">
                              <p class="text-sm text-gray-600 mb-2">
                                Your new API token (copy it now, it won't be shown again):
                              </p>
                              <div class="flex items-center space-x-2">
                                <code
                                  class="flex-1 text-sm bg-gray-100 px-2 py-1 rounded border font-mono break-all"
                                  >{{ createdToken() }}</code
                                >
                                <button
                                  type="button"
                                  (click)="copyToClipboard(createdToken()!)"
                                  class="flex-shrink-0 inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                                  title="Copy token"
                                >
                                  <i class="pi pi-copy"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                          <div class="ml-auto pl-3">
                            <button
                              type="button"
                              (click)="clearTokenSuccess()"
                              class="text-success-400 hover:text-success-600"
                            >
                              <i class="pi pi-times"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    }

                    <!-- Token Error Message -->
                    @if (tokenError()) {
                      <div class="mb-4 rounded-md bg-error-50 p-4 animate-fade-in">
                        <div class="flex">
                          <div class="flex-shrink-0">
                            <i class="pi pi-exclamation-triangle text-error-400"></i>
                          </div>
                          <div class="ml-3">
                            <h3 class="text-sm font-medium text-error-800">
                              Token Creation Failed
                            </h3>
                            <div class="mt-2 text-sm text-error-700">
                              {{ tokenError() }}
                            </div>
                          </div>
                          <div class="ml-auto pl-3">
                            <button
                              type="button"
                              (click)="tokenService.clearError()"
                              class="text-error-400 hover:text-error-600"
                            >
                              <i class="pi pi-times"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    }

                    <form
                      [formGroup]="tokenForm"
                      (ngSubmit)="onCreateToken()"
                      class="space-y-4"
                      novalidate
                    >
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <!-- Token Name -->
                        <div>
                          <label
                            for="tokenName"
                            class="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Token Name *
                          </label>
                          <input
                            id="tokenName"
                            type="text"
                            formControlName="name"
                            placeholder="e.g., Production API, Mobile App"
                            class="appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            [class.border-gray-300]="
                              !tokenForm.get('name')?.invalid || !tokenForm.get('name')?.touched
                            "
                            [class.border-error-300]="
                              tokenForm.get('name')?.invalid && tokenForm.get('name')?.touched
                            "
                            [attr.aria-invalid]="
                              tokenForm.get('name')?.invalid && tokenForm.get('name')?.touched
                            "
                            [attr.aria-describedby]="
                              tokenForm.get('name')?.invalid && tokenForm.get('name')?.touched
                                ? 'tokenName-error'
                                : null
                            "
                          />
                          @if (tokenForm.get('name')?.invalid && tokenForm.get('name')?.touched) {
                            <div
                              id="tokenName-error"
                              class="mt-1 text-sm text-error-600"
                              role="alert"
                            >
                              @if (tokenForm.get('name')?.hasError('required')) {
                                Token name is required.
                              }
                              @if (tokenForm.get('name')?.hasError('minlength')) {
                                Token name must be at least 3 characters long.
                              }
                              @if (tokenForm.get('name')?.hasError('maxlength')) {
                                Token name cannot exceed 100 characters.
                              }
                            </div>
                          }
                        </div>

                        <!-- Token Scopes -->
                        <div>
                          <label class="block text-sm font-medium text-gray-700 mb-1">
                            Permissions *
                          </label>
                          <div class="space-y-2">
                            <label class="inline-flex items-center">
                              <input
                                type="checkbox"
                                value="read"
                                formControlName="readScope"
                                class="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                              />
                              <span class="ml-2 text-sm text-gray-600">
                                <i class="pi pi-eye mr-1"></i>
                                Read access
                              </span>
                            </label>
                            <label class="inline-flex items-center">
                              <input
                                type="checkbox"
                                value="write"
                                formControlName="writeScope"
                                class="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                              />
                              <span class="ml-2 text-sm text-gray-600">
                                <i class="pi pi-pencil mr-1"></i>
                                Write access
                              </span>
                            </label>
                          </div>
                          @if (tokenForm.hasError('noScopes')) {
                            <div class="mt-1 text-sm text-error-600" role="alert">
                              At least one permission must be selected.
                            </div>
                          }
                        </div>
                      </div>

                      <!-- Form Actions -->
                      <div
                        class="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200"
                      >
                        <button
                          type="button"
                          (click)="cancelTokenCreation()"
                          class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          [disabled]="tokenForm.invalid || tokenLoading()"
                          class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          @if (tokenLoading()) {
                            <div class="flex items-center">
                              <div
                                class="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                              ></div>
                              Creating...
                            </div>
                          } @else {
                            <i class="pi pi-plus mr-2"></i>
                            Create Token
                          }
                        </button>
                      </div>
                    </form>
                  </div>
                }

                <!-- Token List -->
                @if (tokens().length > 0) {
                  <div class="overflow-hidden">
                    <div class="space-y-4">
                      @for (token of tokens(); track token.id) {
                        <div
                          class="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                        >
                          <div class="flex items-start justify-between">
                            <div class="flex-1">
                              <div class="flex items-center space-x-3">
                                <h4 class="text-sm font-medium text-gray-900">{{ token.name }}</h4>
                                @if (token.isActive) {
                                  <span
                                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                  >
                                    <i class="pi pi-circle-fill mr-1 text-xs"></i>
                                    Active
                                  </span>
                                } @else {
                                  <span
                                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                  >
                                    <i class="pi pi-circle mr-1 text-xs"></i>
                                    Inactive
                                  </span>
                                }
                              </div>
                              <div class="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                                <span>
                                  <i class="pi pi-shield mr-1"></i>
                                  {{ token.scopes.join(', ') }}
                                </span>
                                <span>
                                  <i class="pi pi-calendar mr-1"></i>
                                  Created {{ formatDateString(token.createdAt) }}
                                </span>
                                @if (token.lastUsedAt) {
                                  <span>
                                    <i class="pi pi-clock mr-1"></i>
                                    Last used {{ formatDateString(token.lastUsedAt) }}
                                  </span>
                                }
                              </div>
                              <div class="mt-1 text-xs text-gray-400">
                                <i class="pi pi-calendar-times mr-1"></i>
                                Expires {{ formatDateString(token.expiresAt) }}
                              </div>
                            </div>
                            <div class="flex items-center space-x-2">
                              <button
                                type="button"
                                (click)="confirmRevokeToken(token)"
                                [disabled]="tokenLoading()"
                                class="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Revoke token"
                              >
                                <i class="pi pi-trash mr-1"></i>
                                Revoke
                              </button>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                } @else {
                  @if (!tokenLoading()) {
                    <div class="text-center py-8">
                      <div class="text-gray-400">
                        <i class="pi pi-key text-4xl mb-4"></i>
                      </div>
                      <h3 class="text-sm font-medium text-gray-900 mb-2">No API tokens</h3>
                      <p class="text-sm text-gray-500 mb-4">
                        Get started by creating your first API token.
                      </p>
                      <button
                        type="button"
                        (click)="showCreateTokenForm.set(true)"
                        class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                      >
                        <i class="pi pi-plus mr-2"></i>
                        Create your first token
                      </button>
                    </div>
                  }
                }

                @if (tokenLoading() && tokens().length === 0) {
                  <div class="text-center py-8">
                    <div
                      class="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"
                    ></div>
                    <p class="text-sm text-gray-500">Loading tokens...</p>
                  </div>
                }
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
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  protected readonly tokenService = inject(TokenService);

  protected readonly user = this.authService.user;
  protected readonly loading = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly successMessage = signal<string | null>(null);
  protected readonly lastLoginDate = signal<Date | null>(null);

  // Token management signals
  protected readonly tokens = this.tokenService.tokens;
  protected readonly tokenLoading = this.tokenService.loading;
  protected readonly tokenError = this.tokenService.error;
  public readonly showCreateTokenForm = signal(false);
  public readonly tokenSuccessMessage = signal<string | null>(null);
  public readonly createdToken = signal<string | null>(null);

  public readonly profileForm: FormGroup;
  public readonly tokenForm: FormGroup;
  private originalFormValue: any = {};

  constructor() {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: [''],
    });

    this.tokenForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
        readScope: [true],
        writeScope: [false],
      },
      { validators: this.scopeValidator },
    );
  }

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadTokens();
  }

  /**
   * Handles form submission for profile updates.
   */
  public onSubmit(): void {
    if (this.profileForm.valid && this.hasChanges() && !this.loading()) {
      this.updateProfile();
    }
  }

  /**
   * Resets the form to original values.
   */
  public resetForm(): void {
    this.profileForm.patchValue(this.originalFormValue);
    this.error.set(null);
    this.successMessage.set(null);
  }

  /**
   * Checks if the form has any changes from original values.
   */
  public hasChanges(): boolean {
    const currentValue = this.profileForm.value;
    return JSON.stringify(currentValue) !== JSON.stringify(this.originalFormValue);
  }

  /**
   * Gets user initials for avatar display.
   */
  public getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  }

  /**
   * Gets display name for user role.
   */
  public getRoleDisplayName(role: string): string {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'user':
        return 'User';
      case 'readonly':
        return 'Read Only';
      default:
        return role;
    }
  }

  /**
   * Formats date for display.
   */
  public formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Formats date string for display in templates.
   */
  public formatDateString(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Loads user profile data and initializes form.
   */
  private loadUserProfile(): void {
    const currentUser = this.user();
    if (currentUser) {
      const formData = {
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
      };

      this.profileForm.patchValue(formData);
      this.originalFormValue = { ...formData };

      // Load last login date (simulate for now)
      this.lastLoginDate.set(new Date());
    }
  }

  /**
   * Updates user profile information.
   */
  private updateProfile(): void {
    const formValue = this.profileForm.value;
    const updateData = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
    };

    this.loading.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    this.profileService.updateProfile(updateData).subscribe({
      next: (updatedUser) => {
        this.loading.set(false);
        this.successMessage.set('Profile updated successfully!');

        // Update the original form value to reflect saved state
        this.originalFormValue = {
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
        };

        // Clear success message after 5 seconds
        setTimeout(() => {
          this.successMessage.set(null);
        }, 5000);
      },
      error: (error) => {
        this.loading.set(false);
        this.handleError(error);
      },
    });
  }

  /**
   * Handles API errors with user-friendly messages.
   */
  private handleError(error: any): void {
    if (error.status === 400) {
      this.error.set('Invalid profile data. Please check your information and try again.');
    } else if (error.status === 401) {
      this.error.set('You are not authorized to update this profile.');
    } else if (error.status === 422) {
      this.error.set('Profile data validation failed. Please check the required fields.');
    } else if (error.status === 0) {
      this.error.set('Network error. Please check your connection and try again.');
    } else {
      this.error.set('An unexpected error occurred. Please try again later.');
    }
  }

  // Token Management Methods

  /**
   * Custom validator to ensure at least one scope is selected.
   */
  private scopeValidator(control: any) {
    const readScope = control.get('readScope')?.value;
    const writeScope = control.get('writeScope')?.value;

    if (!readScope && !writeScope) {
      return { noScopes: true };
    }

    return null;
  }

  /**
   * Loads API tokens for the current user.
   */
  private loadTokens(): void {
    this.tokenService.getTokens().subscribe({
      error: (error) => {
        console.error('Failed to load tokens:', error);
      },
    });
  }

  /**
   * Handles token form submission.
   */
  public onCreateToken(): void {
    if (this.tokenForm.valid && !this.tokenLoading()) {
      const formValue = this.tokenForm.value;
      const scopes: string[] = [];

      if (formValue.readScope) {
        scopes.push('read');
      }
      if (formValue.writeScope) {
        scopes.push('write');
      }

      const request: CreateApiTokenRequest = {
        name: formValue.name,
        scopes: scopes,
      };

      this.tokenService.createToken(request).subscribe({
        next: (response: CreateApiTokenResponse) => {
          this.createdToken.set(response.token);
          this.tokenSuccessMessage.set('Token created successfully!');
          this.resetTokenForm();
        },
        error: (error) => {
          console.error('Token creation failed:', error);
        },
      });
    }
  }

  /**
   * Cancels token creation and hides the form.
   */
  public cancelTokenCreation(): void {
    this.showCreateTokenForm.set(false);
    this.resetTokenForm();
    this.clearTokenMessages();
  }

  /**
   * Resets the token form to initial values.
   */
  private resetTokenForm(): void {
    this.tokenForm.patchValue({
      name: '',
      readScope: true,
      writeScope: false,
    });
    this.tokenForm.markAsUntouched();
  }

  /**
   * Confirms token revocation with user confirmation.
   */
  public confirmRevokeToken(token: ApiTokenListResponse): void {
    if (
      confirm(
        `Are you sure you want to revoke the token "${token.name}"? This action cannot be undone.`,
      )
    ) {
      this.revokeToken(token.id);
    }
  }

  /**
   * Revokes an API token.
   */
  private revokeToken(tokenId: string): void {
    this.tokenService.revokeToken(tokenId).subscribe({
      next: () => {
        // Token removed from service signals automatically
      },
      error: (error) => {
        console.error('Token revocation failed:', error);
      },
    });
  }

  /**
   * Copies text to clipboard.
   */
  public copyToClipboard(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Could add a brief success indicator here
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      });
  }

  /**
   * Clears token success message and created token.
   */
  public clearTokenSuccess(): void {
    this.tokenSuccessMessage.set(null);
    this.createdToken.set(null);
    this.showCreateTokenForm.set(false);
  }

  /**
   * Clears all token-related messages.
   */
  private clearTokenMessages(): void {
    this.tokenSuccessMessage.set(null);
    this.createdToken.set(null);
    this.tokenService.clearError();
  }
}
