import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiClientService } from '@core/api/api-client.service';
import { AuthService, User } from '@core/auth/auth.service';
import { NetworkErrorService } from '@core/services/network-error.service';

/**
 * Interface for profile update request data.
 */
export interface ProfileUpdateRequest {
  firstName: string;
  lastName: string;
}

/**
 * Profile service for managing user profile operations.
 * Handles profile retrieval, updates, and integration with authentication service.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly apiClient = inject(ApiClientService);
  private readonly authService = inject(AuthService);
  private readonly networkErrorService = inject(NetworkErrorService);

  /**
   * Gets the current user's profile information.
   * @returns Observable containing user profile data
   * @throws {HttpErrorResponse} When profile retrieval fails
   * @example
   * profileService.getProfile()
   *   .subscribe({
   *     next: (profile) => console.log('Profile loaded:', profile),
   *     error: (error) => console.error('Failed to load profile:', error)
   *   });
   */
  getProfile(): Observable<User> {
    return this.apiClient.get<User>('/auth/profile').pipe(
      catchError((error) => {
        console.error('Profile retrieval failed:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Updates the current user's profile information.
   * Also updates the user data in the authentication service.
   * @param profileData - Profile data to update
   * @returns Observable containing updated user profile
   * @throws {HttpErrorResponse} When profile update fails
   * @example
   * profileService.updateProfile({ firstName: 'John', lastName: 'Doe' })
   *   .subscribe({
   *     next: (user) => console.log('Profile updated:', user),
   *     error: (error) => console.error('Update failed:', error)
   *   });
   */
  updateProfile(profileData: ProfileUpdateRequest): Observable<User> {
    return this.apiClient
      .patch<{ message: string; data: User; timestamp: string }>('/auth/profile', profileData)
      .pipe(
        map((response) => response.data),
        tap((updatedUser: User) => {
          // Update the user data in the authentication service
          this.updateAuthUserData(updatedUser);
        }),
        catchError((error) => {
          console.error('Profile update failed:', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Uploads user avatar image.
   * @param avatarFile - Image file to upload
   * @returns Observable containing updated user profile with new avatar
   * @throws {HttpErrorResponse} When avatar upload fails
   * @example
   * profileService.uploadAvatar(file)
   *   .subscribe({
   *     next: (user) => console.log('Avatar updated:', user),
   *     error: (error) => console.error('Upload failed:', error)
   *   });
   */
  uploadAvatar(avatarFile: File): Observable<User> {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    return this.apiClient.post<User>('/users/avatar', formData).pipe(
      tap((updatedUser: User) => {
        // Update the user data in the authentication service
        this.updateAuthUserData(updatedUser);
      }),
      catchError((error) => {
        console.error('Avatar upload failed:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Deletes the user's avatar image.
   * @returns Observable containing updated user profile without avatar
   * @throws {HttpErrorResponse} When avatar deletion fails
   */
  deleteAvatar(): Observable<User> {
    return this.apiClient.delete<User>('/users/avatar').pipe(
      tap((updatedUser: User) => {
        // Update the user data in the authentication service
        this.updateAuthUserData(updatedUser);
      }),
      catchError((error) => {
        console.error('Avatar deletion failed:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Gets user account activity and login history.
   * @returns Observable containing account activity data
   * @throws {HttpErrorResponse} When activity retrieval fails
   */
  getAccountActivity(): Observable<AccountActivity> {
    return this.apiClient.get<AccountActivity>('/auth/profile/activity').pipe(
      catchError((error) => {
        console.error('Account activity retrieval failed:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Updates user preferences and settings.
   * @param preferences - User preference settings
   * @returns Observable containing updated preferences
   * @throws {HttpErrorResponse} When preferences update fails
   */
  updatePreferences(preferences: UserPreferences): Observable<UserPreferences> {
    return this.apiClient.patch<UserPreferences>('/auth/profile/preferences', preferences).pipe(
      catchError((error) => {
        console.error('Preferences update failed:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Updates user profile with optimistic UI updates.
   * Applies changes immediately and reverts if the server update fails.
   * @param profileData - Profile data to update
   * @returns Observable containing updated user profile
   */
  updateProfileOptimistic(profileData: ProfileUpdateRequest): Observable<User> {
    const currentUser = this.authService.user();
    if (!currentUser) {
      return throwError(() => new Error('No authenticated user'));
    }

    // Store current user data for potential rollback
    const originalUser = { ...currentUser };

    // Create optimistic user data
    const optimisticUser: User = {
      ...currentUser,
      ...profileData,
      updatedAt: new Date(),
    };

    const serverRequest$ = this.apiClient
      .patch<{ message: string; data: User; timestamp: string }>('/auth/profile', profileData)
      .pipe(
        map((response) => response.data),
        tap((updatedUser: User) => {
          // Update with actual server response
          this.updateAuthUserData(updatedUser);
        }),
        catchError((error) => {
          console.error('Profile update failed:', error);
          return throwError(() => error);
        }),
      );

    return this.networkErrorService.withOptimisticUpdate(
      () => this.updateAuthUserData(optimisticUser),
      serverRequest$,
      () => this.updateAuthUserData(originalUser),
      {
        maxRetries: 3,
        delayMs: 1500,
      },
    );
  }

  /**
   * Validates profile data before submission.
   * @param profileData - Profile data to validate
   * @returns True if valid, throws error if invalid
   */
  validateProfileData(profileData: ProfileUpdateRequest): boolean {
    if (!profileData.firstName || profileData.firstName.trim().length < 2) {
      throw new Error('First name must be at least 2 characters long');
    }

    if (!profileData.lastName || profileData.lastName.trim().length < 2) {
      throw new Error('Last name must be at least 2 characters long');
    }

    return true;
  }

  /**
   * Updates the user data in the authentication service.
   * This ensures the auth service stays in sync with profile changes.
   */
  private updateAuthUserData(updatedUser: User): void {
    this.authService.updateUserData(updatedUser);
  }
}

/**
 * Interface for account activity data.
 */
export interface AccountActivity {
  lastLogin: Date;
  loginHistory: LoginEntry[];
  sessionCount: number;
  accountCreated: Date;
  lastProfileUpdate: Date;
}

/**
 * Interface for individual login entries.
 */
export interface LoginEntry {
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  location?: string;
  successful: boolean;
}

/**
 * Interface for user preferences.
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    email: boolean;
    browser: boolean;
    mobile: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    showEmail: boolean;
    showLastLogin: boolean;
  };
}
