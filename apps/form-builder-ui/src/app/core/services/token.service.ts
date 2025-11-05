import { Injectable, inject, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiClientService } from '../api/api-client.service';
import {
  CreateApiTokenRequest,
  CreateApiTokenResponse,
  ApiTokenListResponse,
  UpdateApiTokenRequest,
} from '@nodeangularfullstack/shared';

/**
 * Response wrapper for API token operations.
 * Matches backend API response format.
 */
export interface ApiTokenResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/**
 * Response for token list operations with metadata.
 */
export interface TokenListResponse {
  success: boolean;
  data: ApiTokenListResponse[];
  meta: {
    total: number;
  };
  timestamp: string;
}

/**
 * Response for token deletion operations.
 */
export interface DeleteTokenResponse {
  success: boolean;
  data: {
    message: string;
  };
  timestamp: string;
}

/**
 * Token service managing API token operations.
 * Provides CRUD operations for user API tokens with proper error handling
 * and response typing following existing service patterns.
 */
@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly apiClient = inject(ApiClientService);

  // Signals for reactive state management
  private readonly tokensSignal = signal<ApiTokenListResponse[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  // Computed properties for component consumption
  readonly tokens = this.tokensSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /**
   * Creates a new API token for the authenticated user.
   * @param request - Token creation data including name and scopes
   * @returns Observable containing the created token with plaintext value
   * @throws {HttpErrorResponse} When token creation fails
   * @example
   * tokenService.createToken({
   *   name: 'Production API',
   *   scopes: ['read', 'write']
   * }).subscribe({
   *   next: (response) => console.log('Token created:', response.token),
   *   error: (error) => console.error('Creation failed:', error)
   * });
   */
  createToken(request: CreateApiTokenRequest): Observable<CreateApiTokenResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.apiClient.post<ApiTokenResponse<CreateApiTokenResponse>>('/tokens', request).pipe(
      map((response: ApiTokenResponse<CreateApiTokenResponse>) => response.data),
      tap(() => {
        // Refresh token list after creation
        this.loadTokens().subscribe();
      }),
      catchError((error) => {
        this.errorSignal.set(error.error?.error?.message || 'Token creation failed');
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
      tap(() => this.loadingSignal.set(false)),
    );
  }

  /**
   * Retrieves all API tokens for the authenticated user.
   * @returns Observable containing array of user's tokens (without token values)
   * @throws {HttpErrorResponse} When token retrieval fails
   * @example
   * tokenService.getTokens().subscribe({
   *   next: (tokens) => console.log('User tokens:', tokens),
   *   error: (error) => console.error('Failed to load tokens:', error)
   * });
   */
  getTokens(): Observable<ApiTokenListResponse[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.apiClient.get<TokenListResponse>('/tokens').pipe(
      map((response: TokenListResponse) => response.data),
      tap((tokens: ApiTokenListResponse[]) => {
        this.tokensSignal.set(tokens);
      }),
      catchError((error) => {
        this.errorSignal.set(error.error?.error?.message || 'Failed to load tokens');
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
      tap(() => this.loadingSignal.set(false)),
    );
  }

  /**
   * Revokes (deletes) an API token by ID.
   * @param tokenId - Unique identifier of the token to revoke
   * @returns Observable that completes when token is successfully revoked
   * @throws {HttpErrorResponse} When token revocation fails
   * @example
   * tokenService.revokeToken('token-uuid').subscribe({
   *   next: () => console.log('Token revoked successfully'),
   *   error: (error) => console.error('Revocation failed:', error)
   * });
   */
  revokeToken(tokenId: string): Observable<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.apiClient.delete<DeleteTokenResponse>(`/tokens/${tokenId}`).pipe(
      map(() => void 0), // Convert to void return
      tap(() => {
        // Remove token from local state
        const currentTokens = this.tokensSignal();
        const updatedTokens = currentTokens.filter((token) => token.id !== tokenId);
        this.tokensSignal.set(updatedTokens);
      }),
      catchError((error) => {
        this.errorSignal.set(error.error?.error?.message || 'Token revocation failed');
        this.loadingSignal.set(false);
        return throwError(() => error);
      }),
      tap(() => this.loadingSignal.set(false)),
    );
  }

  /**
   * Updates an existing API token's metadata.
   * @param tokenId - Unique identifier of the token to update
   * @param updates - Token update data (name, scopes, or active status)
   * @returns Observable containing the updated token information
   * @throws {HttpErrorResponse} When token update fails
   * @example
   * tokenService.updateToken('token-uuid', {
   *   name: 'Updated Token Name',
   *   isActive: false
   * }).subscribe({
   *   next: (token) => console.log('Token updated:', token),
   *   error: (error) => console.error('Update failed:', error)
   * });
   */
  updateToken(tokenId: string, updates: UpdateApiTokenRequest): Observable<ApiTokenListResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.apiClient
      .patch<ApiTokenResponse<ApiTokenListResponse>>(`/tokens/${tokenId}`, updates)
      .pipe(
        map((response: ApiTokenResponse<ApiTokenListResponse>) => response.data),
        tap((updatedToken: ApiTokenListResponse) => {
          // Update token in local state
          const currentTokens = this.tokensSignal();
          const updatedTokens = currentTokens.map((token) =>
            token.id === tokenId ? updatedToken : token,
          );
          this.tokensSignal.set(updatedTokens);
        }),
        catchError((error) => {
          this.errorSignal.set(error.error?.error?.message || 'Token update failed');
          this.loadingSignal.set(false);
          return throwError(() => error);
        }),
        tap(() => this.loadingSignal.set(false)),
      );
  }

  /**
   * Gets a specific API token by ID from the cached tokens.
   * @param tokenId - Unique identifier of the token to retrieve
   * @returns The token if found, null otherwise
   * @example
   * const token = tokenService.getTokenById('token-uuid');
   * if (token) {
   *   console.log('Found token:', token.name);
   * }
   */
  getTokenById(tokenId: string): ApiTokenListResponse | null {
    const tokens = this.tokensSignal();
    return tokens.find((token) => token.id === tokenId) || null;
  }

  /**
   * Clears any error state in the service.
   * Used to reset error messages after user acknowledgment.
   * @example
   * tokenService.clearError();
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Refreshes the token list from the server.
   * @returns Observable containing the updated token list
   * @example
   * tokenService.refreshTokens().subscribe();
   */
  refreshTokens(): Observable<ApiTokenListResponse[]> {
    return this.getTokens();
  }

  /**
   * Private method to load tokens without exposing loading state externally.
   */
  private loadTokens(): Observable<ApiTokenListResponse[]> {
    return this.apiClient.get<TokenListResponse>('/tokens').pipe(
      map((response: TokenListResponse) => response.data),
      tap((tokens: ApiTokenListResponse[]) => {
        this.tokensSignal.set(tokens);
      }),
      catchError(() => {
        // Silent failure for internal refreshes
        return [];
      }),
    );
  }
}
