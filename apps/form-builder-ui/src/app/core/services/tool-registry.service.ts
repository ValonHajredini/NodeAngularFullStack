import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { map, catchError, shareReplay, retryWhen, tap, concatMap, timeout } from 'rxjs/operators';
import { ToolRegistryRecord } from '@nodeangularfullstack/shared';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

/**
 * Service for interacting with the Tool Registry backend API.
 *
 * Provides methods for fetching, searching, and managing registered tools.
 * Implements client-side caching with shareReplay() to minimize HTTP requests.
 * Includes retry logic with exponential backoff for transient failures.
 *
 * **Caching Strategy:**
 * - getAllTools() results cached for 5 minutes using shareReplay(1)
 * - getToolById() checks cache before making new requests
 * - searchTools() always fetches fresh data (no caching)
 * - Cache cleared on refreshCache() or after 5 minute expiration
 *
 * **Retry Logic:**
 * - Retries failed requests 3 times with exponential backoff (1s, 2s, 4s)
 * - Only retries on network errors (not 4xx client errors)
 * - Logs retry attempts for debugging
 *
 * **Error Handling:**
 * - Network errors return user-friendly messages
 * - 401/403 errors redirect to login page
 * - 404 errors handled gracefully
 * - All errors logged to console
 *
 * @example Basic Usage
 * ```typescript
 * constructor(private toolRegistry: ToolRegistryService) {}
 *
 * ngOnInit() {
 *   this.toolRegistry.getAllTools().subscribe({
 *     next: (tools) => console.log('Tools:', tools),
 *     error: (err) => console.error('Error:', err),
 *   });
 * }
 * ```
 *
 * @example Search Tools
 * ```typescript
 * this.toolRegistry.searchTools('form').subscribe({
 *   next: (results) => console.log('Search results:', results),
 * });
 * ```
 *
 * @example Refresh Cache
 * ```typescript
 * // Force refetch from server
 * this.toolRegistry.refreshCache();
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ToolRegistryService {
  private readonly apiUrl: string;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRIES = 3;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  private cache$: Observable<ToolRegistryRecord[]> | undefined;
  private cacheTimestamp: number | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
  ) {
    this.apiUrl = `${environment.apiUrl}/tools`;
  }

  /**
   * Fetches all registered tools from the API.
   *
   * Results are cached using shareReplay(1) for 5 minutes to minimize
   * unnecessary HTTP requests. Multiple subscriptions will receive the
   * cached data without triggering new API calls.
   *
   * @returns Observable<ToolRegistryRecord[]> Array of all tools
   * @throws ApiError if request fails after 3 retries
   *
   * @example
   * ```typescript
   * this.toolRegistry.getAllTools().subscribe({
   *   next: (tools) => {
   *     console.log(`Found ${tools.length} tools`);
   *   },
   *   error: (err) => {
   *     console.error('Failed to fetch tools:', err.message);
   *   },
   * });
   * ```
   */
  getAllTools(): Observable<ToolRegistryRecord[]> {
    // Check cache validity
    if (this.cache$ && this.isCacheValid()) {
      console.log('[ToolRegistryService] Returning cached data');
      return this.cache$;
    }

    console.log('[ToolRegistryService] Fetching tools from API');

    // Make API request with caching
    this.cache$ = this.http
      .get<{
        message: string;
        data: ToolRegistryRecord[];
      }>(`${this.apiUrl}/registry`, { headers: this.getAuthHeaders() })
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        tap(() => {
          this.cacheTimestamp = Date.now();
        }),
        map((response) => response.data),
        this.retryStrategy(),
        shareReplay(1), // Cache results
        catchError(this.handleError.bind(this)),
      );

    return this.cache$;
  }

  /**
   * Fetches a single tool by its unique tool ID.
   *
   * @param toolId - The unique tool identifier (e.g., "form-builder")
   * @returns Observable<ToolRegistryRecord> The requested tool
   * @throws ApiError if tool not found (404) or request fails
   *
   * @example
   * ```typescript
   * this.toolRegistry.getToolById('form-builder').subscribe({
   *   next: (tool) => {
   *     console.log('Tool:', tool.name);
   *   },
   *   error: (err) => {
   *     if (err.status === 404) {
   *       console.error('Tool not found');
   *     }
   *   },
   * });
   * ```
   */
  getToolById(toolId: string): Observable<ToolRegistryRecord> {
    if (!toolId || toolId.trim().length === 0) {
      return throwError(() => new Error('Tool ID is required'));
    }

    console.log(`[ToolRegistryService] Fetching tool: ${toolId}`);

    return this.http
      .get<{
        message: string;
        data: ToolRegistryRecord;
      }>(`${this.apiUrl}/registry/${toolId}`, { headers: this.getAuthHeaders() })
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        map((response) => response.data),
        this.retryStrategy(),
        catchError(this.handleError.bind(this)),
      );
  }

  /**
   * Searches for tools matching the provided query.
   *
   * Searches tool names and descriptions for the query string.
   * Results are NOT cached (always fresh from server).
   *
   * @param query - Search query (minimum 2 characters)
   * @returns Observable<ToolRegistryRecord[]> Array of matching tools
   * @throws Error if query is less than 2 characters
   *
   * @example
   * ```typescript
   * this.toolRegistry.searchTools('analytics').subscribe({
   *   next: (results) => {
   *     console.log(`Found ${results.length} matching tools`);
   *   },
   * });
   * ```
   */
  searchTools(query: string): Observable<ToolRegistryRecord[]> {
    if (!query || query.trim().length < 2) {
      return throwError(() => new Error('Search query must be at least 2 characters'));
    }

    console.log(`[ToolRegistryService] Searching tools: "${query}"`);

    return this.http
      .get<{ message: string; data: ToolRegistryRecord[] }>(`${this.apiUrl}/search`, {
        headers: this.getAuthHeaders(),
        params: { q: query.trim() },
      })
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        map((response) => response.data),
        this.retryStrategy(),
        catchError(this.handleError.bind(this)),
      );
  }

  /**
   * Clears the cached tool data and forces a fresh fetch from the server.
   *
   * Use this method when you know the tool data has changed on the server
   * (e.g., after creating, updating, or deleting a tool).
   *
   * @example
   * ```typescript
   * // After creating a new tool
   * this.createTool(newTool).subscribe(() => {
   *   this.toolRegistry.refreshCache(); // Refresh to include new tool
   * });
   * ```
   */
  refreshCache(): void {
    console.log('[ToolRegistryService] Clearing cache');
    this.cache$ = undefined;
    this.cacheTimestamp = null;

    // Immediately trigger refetch
    this.getAllTools().subscribe({
      next: () => console.log('[ToolRegistryService] Cache refreshed'),
      error: (err) => console.error('[ToolRegistryService] Refresh failed:', err),
    });
  }

  /**
   * Checks if the current cache is still valid (within CACHE_DURATION).
   *
   * @private
   * @returns true if cache exists and is less than 5 minutes old
   */
  private isCacheValid(): boolean {
    if (!this.cacheTimestamp) return false;

    const age = Date.now() - this.cacheTimestamp;
    const isValid = age < this.CACHE_DURATION;

    if (!isValid) {
      console.log(`[ToolRegistryService] Cache expired (age: ${age}ms)`);
    }

    return isValid;
  }

  /**
   * Gets HTTP headers with Authorization token.
   *
   * @private
   * @returns HttpHeaders with Bearer token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  /**
   * Custom retry strategy with exponential backoff.
   *
   * Retries failed requests up to 3 times with delays of 1s, 2s, 4s.
   * Only retries on network errors (not 4xx client errors).
   *
   * @private
   * @returns RxJS operator for retry logic
   */
  private retryStrategy<T>() {
    return retryWhen<T>((errors: Observable<any>) =>
      errors.pipe(
        concatMap((error, index) => {
          // Don't retry on 4xx errors (client errors)
          if (error.status >= 400 && error.status < 500) {
            return throwError(() => error);
          }

          const retryCount = index + 1;
          if (retryCount > this.MAX_RETRIES) {
            console.error(`[ToolRegistryService] Max retries (${this.MAX_RETRIES}) exceeded`);
            return throwError(() => error);
          }

          const delayMs = Math.pow(2, index) * 1000; // 1s, 2s, 4s
          console.log(
            `[ToolRegistryService] Retry ${retryCount}/${this.MAX_RETRIES} in ${delayMs}ms...`,
          );

          return timer(delayMs);
        }),
      ),
    );
  }

  /**
   * Handles HTTP errors and returns user-friendly messages.
   *
   * @private
   * @param error - HttpErrorResponse from failed request
   * @returns Observable that errors with user-friendly message
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage: string;

    if (error.status === 0) {
      // Network error
      errorMessage = 'Network error. Please check your connection.';
    } else if (error.status === 401 || error.status === 403) {
      // Unauthorized - redirect to login
      errorMessage = 'Session expired. Please log in again.';
      this.authService.logout();
      this.router.navigate(['/auth/login']);
    } else if (error.status === 404) {
      errorMessage = 'Tool not found.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else {
      errorMessage = error.error?.message || 'An unexpected error occurred.';
    }

    console.error('[ToolRegistryService] Error:', errorMessage, error);

    return throwError(() => ({
      message: errorMessage,
      status: error.status,
      error: error.error,
    }));
  }
}
