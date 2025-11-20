import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiClientService } from '../api/api-client.service';
import { environment } from '@env/environment';
// Use local types for now since shared package isn't configured
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'readonly';
  tenantId?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiAuthResponse {
  message: string;
  data: AuthResponse;
  timestamp: string;
}

export interface RefreshTokenApiResponse {
  message: string;
  data: TokenResponse;
  timestamp: string;
}

/**
 * Authentication service managing user login, logout, and JWT token lifecycle.
 * Uses Angular signals for reactive state management and provides token
 * refresh capabilities.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiClient = inject(ApiClientService);
  private readonly router = inject(Router);

  // Signals for reactive state management
  private readonly userSignal = signal<User | null>(null);
  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly refreshTokenSignal = signal<string | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  // Computed properties for component consumption
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.userSignal() && !!this.accessTokenSignal());
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  constructor() {
    this.initializeFromStorage();
  }

  /**
   * Authenticates a user with email and password.
   * @param credentials - User login credentials
   * @returns Observable containing authentication response
   * @throws {HttpErrorResponse} When authentication fails
   * @example
   * authService.login({ email: 'user@example.com', password: 'password123' })
   *   .subscribe({
   *     next: (response) => console.log('Login successful:', response.user),
   *     error: (error) => console.error('Login failed:', error)
   *   });
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.apiClient.post<ApiAuthResponse>('/auth/login', credentials).pipe(
      map((response: ApiAuthResponse) => response.data),
      tap((authData: AuthResponse) => {
        this.setAuthData(authData);
        this.router.navigate(['/app/dashboard']);
      }),
      catchError((error) => {
        this.errorSignal.set(error.error?.message || 'Login failed');
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
      tap(() => this.loadingSignal.set(false)),
    );
  }

  /**
   * Registers a new user account.
   * @param userData - New user registration data
   * @returns Observable containing registration response
   * @throws {HttpErrorResponse} When registration fails
   */
  register(userData: RegisterData): Observable<AuthResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.apiClient.post<ApiAuthResponse>('/auth/register', userData).pipe(
      map((response: ApiAuthResponse) => response.data),
      tap((authData: AuthResponse) => {
        this.setAuthData(authData);
        this.router.navigate(['/app/dashboard']);
      }),
      catchError((error) => {
        this.errorSignal.set(error.error?.message || 'Registration failed');
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
      tap(() => this.loadingSignal.set(false)),
    );
  }

  /**
   * Logs out the current user and clears all auth data.
   * @returns Observable that completes when logout is successful
   */
  logout(): Observable<void> {
    const refreshToken = this.refreshTokenSignal();

    if (refreshToken) {
      return this.apiClient.post<void>('/auth/logout', { refreshToken }).pipe(
        tap((_: void) => this.clearAuthData()),
        catchError(() => {
          // Even if the server logout fails, clear local data
          this.clearAuthData();
          return of(undefined);
        }),
      );
    } else {
      this.clearAuthData();
      return of(undefined);
    }
  }

  /**
   * Logs out from current service only and redirects to dashboard.
   * This clears local authentication data but user remains logged in to other services.
   * @returns Observable that completes when logout is successful
   */
  logoutFromService(): Observable<void> {
    const refreshToken = this.refreshTokenSignal();

    if (refreshToken) {
      return this.apiClient.post<void>('/auth/logout', { refreshToken }).pipe(
        tap((_: void) => this.clearAuthDataAndRedirectToDashboard()),
        catchError(() => {
          // Even if the server logout fails, clear local data
          this.clearAuthDataAndRedirectToDashboard();
          return of(undefined);
        }),
      );
    } else {
      this.clearAuthDataAndRedirectToDashboard();
      return of(undefined);
    }
  }

  /**
   * Complete logout from all services.
   * This clears authentication data from all services and redirects to login page.
   * Also triggers logout in form builder service via iframe.
   * @returns Observable that completes when logout is successful
   */
  logoutFromAllServices(): Observable<void> {
    const refreshToken = this.refreshTokenSignal();

    if (refreshToken) {
      return this.apiClient.post<void>('/auth/logout', { refreshToken }).pipe(
        tap((_: void) => {
          // Trigger logout on form builder service
          this.triggerFormBuilderLogout();
          // Clear local auth data and redirect
          this.clearAuthDataAndRedirectToLogin();
        }),
        catchError(() => {
          // Even if the server logout fails, clear local data
          this.triggerFormBuilderLogout();
          this.clearAuthDataAndRedirectToLogin();
          return of(undefined);
        }),
      );
    } else {
      this.triggerFormBuilderLogout();
      this.clearAuthDataAndRedirectToLogin();
      return of(undefined);
    }
  }

  /**
   * Triggers logout on form builder service using an invisible iframe.
   * This ensures tokens are cleared across all services.
   */
  private triggerFormBuilderLogout(): void {
    try {
      // Create invisible iframe to trigger form builder logout
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `${environment.formBuilderUrl}/welcome?logout=complete`;

      // Remove iframe after 2 seconds
      iframe.onload = () => {
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 2000);
      };

      document.body.appendChild(iframe);
      console.log('Triggered form builder logout via iframe');
    } catch (error) {
      console.error('Failed to trigger form builder logout:', error);
      // Continue with main app logout even if form builder logout fails
    }
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * @returns Observable containing new auth tokens
   * @throws {HttpErrorResponse} When token refresh fails
   */
  refreshAccessToken(): Observable<TokenResponse> {
    const refreshToken = this.refreshTokenSignal();

    if (!refreshToken) {
      this.clearAuthData();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.apiClient.post<RefreshTokenApiResponse>('/auth/refresh', { refreshToken }).pipe(
      map((response: RefreshTokenApiResponse) => response.data),
      tap((tokens: TokenResponse) => {
        this.accessTokenSignal.set(tokens.accessToken);
        if (tokens.refreshToken) {
          this.refreshTokenSignal.set(tokens.refreshToken);
        }
        this.saveTokensToStorage();
      }),
      catchError((error) => {
        this.clearAuthData();
        return throwError(() => error);
      }),
    );
  }

  /**
   * Gets the current access token.
   * @returns The access token string or null if not authenticated
   */
  getAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  /**
   * Gets the current refresh token.
   * @returns The refresh token string or null if not available
   */
  getRefreshToken(): string | null {
    return this.refreshTokenSignal();
  }

  /**
   * Checks if the current access token is expired or about to expire.
   * @returns True if token needs refresh, false otherwise
   */
  isTokenExpired(): boolean {
    const token = this.accessTokenSignal();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const buffer = environment.jwt.tokenExpirationBuffer;

      return currentTime >= expirationTime - buffer;
    } catch (error) {
      console.error('Error parsing token:', error);
      return true;
    }
  }

  /**
   * Requests a password reset for the given email address.
   * @param email - Email address to send reset instructions to
   * @returns Observable that completes when request is sent
   * @throws {HttpErrorResponse} When reset request fails
   * @example
   * authService.requestPasswordReset('user@example.com')
   *   .subscribe({
   *     next: () => console.log('Reset email sent'),
   *     error: (error) => console.error('Reset request failed:', error)
   *   });
   */
  requestPasswordReset(email: string): Observable<void> {
    return this.apiClient.post<void>('/auth/password-reset-request', { email }).pipe(
      catchError((error) => {
        console.error('Password reset request failed:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Validates a password reset token.
   * @param token - Reset token to validate
   * @returns Observable that completes if token is valid
   * @throws {HttpErrorResponse} When token validation fails
   */
  validatePasswordResetToken(token: string): Observable<void> {
    return this.apiClient.post<void>('/auth/password-reset-validate', { token }).pipe(
      catchError((error) => {
        console.error('Token validation failed:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Confirms password reset with new password using the reset token.
   * @param token - Reset token received via email
   * @param newPassword - New password to set
   * @returns Observable that completes when password is reset
   * @throws {HttpErrorResponse} When password reset fails
   * @example
   * authService.confirmPasswordReset('reset-token', 'newPassword123!')
   *   .subscribe({
   *     next: () => console.log('Password reset successful'),
   *     error: (error) => console.error('Password reset failed:', error)
   *   });
   */
  confirmPasswordReset(token: string, newPassword: string): Observable<void> {
    return this.apiClient
      .post<void>('/auth/password-reset-confirm', {
        token,
        newPassword,
      })
      .pipe(
        catchError((error) => {
          console.error('Password reset confirmation failed:', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Updates the current user data in the authentication service.
   * Used by other services (like ProfileService) to keep user data in sync.
   * @param updatedUser - Updated user data
   * @example
   * authService.updateUserData(updatedUserProfile);
   */
  updateUserData(updatedUser: User): void {
    this.userSignal.set(updatedUser);
    this.saveToStorage();
  }

  /**
   * Sets authentication data and stores it securely.
   */
  private setAuthData(authResponse: AuthResponse): void {
    this.userSignal.set(authResponse.user);
    this.accessTokenSignal.set(authResponse.accessToken);
    this.refreshTokenSignal.set(authResponse.refreshToken);

    this.saveToStorage();
  }

  /**
   * Clears all authentication data and redirects to login.
   */
  private clearAuthData(): void {
    this.userSignal.set(null);
    this.accessTokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.errorSignal.set(null);

    this.clearStorage();
    this.router.navigate(['/welcome']);
  }

  /**
   * Clears local auth data and redirects to dashboard (port 4200).
   * Used for service-specific logout.
   */
  private clearAuthDataAndRedirectToDashboard(): void {
    this.userSignal.set(null);
    this.accessTokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.errorSignal.set(null);

    this.clearStorage();
    this.router.navigate(['/app/dashboard']);
  }

  /**
   * Clears all auth data from all services and redirects to login.
   * Used for complete logout from all services.
   */
  private clearAuthDataAndRedirectToLogin(): void {
    this.userSignal.set(null);
    this.accessTokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.errorSignal.set(null);

    this.clearStorage();
    this.router.navigate(['/welcome']);
  }

  /**
   * Initializes auth state from localStorage on service creation.
   */
  private initializeFromStorage(): void {
    try {
      const storedUser = localStorage.getItem('user');
      const storedAccessToken = localStorage.getItem(environment.jwt.tokenKey);
      const storedRefreshToken = localStorage.getItem(environment.jwt.refreshTokenKey);

      if (storedUser && storedAccessToken && storedRefreshToken) {
        this.userSignal.set(JSON.parse(storedUser));
        this.accessTokenSignal.set(storedAccessToken);
        this.refreshTokenSignal.set(storedRefreshToken);
      }
    } catch (error) {
      console.error('Error loading auth data from storage:', error);
      this.clearStorage();
    }
  }

  /**
   * Saves authentication data to localStorage.
   */
  private saveToStorage(): void {
    const user = this.userSignal();
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    this.saveTokensToStorage();
  }

  /**
   * Saves tokens to localStorage.
   */
  private saveTokensToStorage(): void {
    const accessToken = this.accessTokenSignal();
    const refreshToken = this.refreshTokenSignal();

    if (accessToken) {
      localStorage.setItem(environment.jwt.tokenKey, accessToken);
    }
    if (refreshToken) {
      localStorage.setItem(environment.jwt.refreshTokenKey, refreshToken);
    }
  }

  /**
   * Clears all authentication data from localStorage.
   */
  private clearStorage(): void {
    localStorage.removeItem('user');
    localStorage.removeItem(environment.jwt.tokenKey);
    localStorage.removeItem(environment.jwt.refreshTokenKey);
  }
}

// Type definitions for local use
export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
}
