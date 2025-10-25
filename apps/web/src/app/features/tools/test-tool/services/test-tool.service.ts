import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry, shareReplay, tap, finalize } from 'rxjs/operators';
import { TestToolRecord } from '@nodeangularfullstack/shared';

/**
 * Test Tool Service
 *
 * Provides data access methods for Test Tool operations with signal-based state management.
 * Communicates with backend API at /api/tools/test-tool.
 *
 * **Features:**
 * - Signal-based reactive state (loading, error, cache)
 * - Automatic retry on failure (2 attempts)
 * - Response caching with shareReplay
 * - Computed signals for derived state
 * - Comprehensive error handling
 *
 * **Usage:**
 * ```typescript
 * constructor(private testToolService: TestToolService) {}
 *
 * ngOnInit() {
 *   // Subscribe to data
 *   this.testToolService.getAll().subscribe({
 *     next: (data) => console.log('Data:', data),
 *     error: (err) => console.error('Error:', err)
 *   });
 *
 *   // Access state signals
 *   console.log('Loading:', this.testToolService.loading$());
 *   console.log('Error:', this.testToolService.error$());
 *   console.log('Has Data:', this.testToolService.hasData$());
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class TestToolService {
  /** Backend API base URL */
  private readonly apiUrl = '/api/tools/test-tool';

  /** Loading state signal - true during HTTP requests */
  private readonly loading = signal<boolean>(false);

  /** Error message signal - null when no errors */
  private readonly error = signal<string | null>(null);

  /** Cached data signal - stores last successful response */
  private readonly cache = signal<TestToolRecord[]>([]);

  /** Public readonly loading state */
  readonly loading$ = this.loading.asReadonly();

  /** Public readonly error state */
  readonly error$ = this.error.asReadonly();

  /** Public readonly cached items */
  readonly items$ = this.cache.asReadonly();

  /** Computed signal - true if cache has data */
  readonly hasData$ = computed(() => this.cache().length > 0);

  /** Computed signal - count of cached items */
  readonly itemCount$ = computed(() => this.cache().length);

  /**
   * Constructor with HttpClient dependency injection.
   * @param http - Angular HttpClient for API requests
   */
  constructor(private http: HttpClient) {}

  /**
   * Get all Test Tool records.
   * Results are cached and replayed to new subscribers.
   * Automatically retries failed requests twice.
   *
   * @returns Observable of Test Tool records array
   *
   * @example
   * ```typescript
   * this.testToolService.getAll().subscribe({
   *   next: (items) => console.log('Items:', items),
   *   error: (err) => console.error('Error:', err)
   * });
   * ```
   */
  getAll(): Observable<TestToolRecord[]> {
    this.setLoading(true);
    this.clearError();

    return this.http.get<{ data: TestToolRecord[] }>(this.apiUrl).pipe(
      retry(2), // Retry failed requests twice
      map((response) => response.data),
      tap((data) => {
        this.cache.set(data);
        console.log('TestTool Service: Loaded', data.length, 'items');
      }),
      catchError((error) => this.handleError(error, 'fetch all test tool records')),
      finalize(() => this.setLoading(false)),
      shareReplay(1), // Cache latest emission
    );
  }

  /**
   * Get single Test Tool record by ID.
   *
   * @param id - Record UUID
   * @returns Observable of Test Tool record
   *
   * @example
   * ```typescript
   * this.testToolService.getById('123e4567-e89b-12d3-a456-426614174000')
   *   .subscribe(item => console.log('Item:', item));
   * ```
   */
  getById(id: string): Observable<TestToolRecord> {
    this.setLoading(true);
    this.clearError();

    return this.http.get<{ data: TestToolRecord }>(`${this.apiUrl}/${id}`).pipe(
      retry(2),
      map((response) => response.data),
      catchError((error) => this.handleError(error, `fetch test tool record ${id}`)),
      finalize(() => this.setLoading(false)),
      shareReplay(1),
    );
  }

  /**
   * Create new Test Tool record.
   * Updates cache with new record on success.
   *
   * @param data - Partial record data (id, createdAt, updatedAt auto-generated)
   * @returns Observable of created record
   *
   * @example
   * ```typescript
   * this.testToolService.create({
   *   name: 'New Item',
   *   description: 'Description here'
   * }).subscribe(created => console.log('Created:', created));
   * ```
   */
  create(data: Partial<TestToolRecord>): Observable<TestToolRecord> {
    this.setLoading(true);
    this.clearError();

    return this.http.post<{ data: TestToolRecord }>(this.apiUrl, data).pipe(
      map((response) => response.data),
      tap((created) => {
        // Add to cache
        const current = this.cache();
        this.cache.set([...current, created]);
        console.log('TestTool Service: Created record', created.id);
      }),
      catchError((error) => this.handleError(error, 'create test tool record')),
      finalize(() => this.setLoading(false)),
    );
  }

  /**
   * Update existing Test Tool record.
   * Updates cache with modified record on success.
   *
   * @param id - Record UUID
   * @param data - Partial record data to update
   * @returns Observable of updated record
   *
   * @example
   * ```typescript
   * this.testToolService.update('123e4567...', {
   *   name: 'Updated Name'
   * }).subscribe(updated => console.log('Updated:', updated));
   * ```
   */
  update(id: string, data: Partial<TestToolRecord>): Observable<TestToolRecord> {
    this.setLoading(true);
    this.clearError();

    return this.http.put<{ data: TestToolRecord }>(`${this.apiUrl}/${id}`, data).pipe(
      map((response) => response.data),
      tap((updated) => {
        // Update in cache
        const current = this.cache();
        const index = current.findIndex((item) => item.id === id);
        if (index !== -1) {
          const newCache = [...current];
          newCache[index] = updated;
          this.cache.set(newCache);
        }
        console.log('TestTool Service: Updated record', id);
      }),
      catchError((error) => this.handleError(error, `update test tool record ${id}`)),
      finalize(() => this.setLoading(false)),
    );
  }

  /**
   * Delete Test Tool record.
   * Removes record from cache on success.
   *
   * @param id - Record UUID
   * @returns Observable of void
   *
   * @example
   * ```typescript
   * this.testToolService.delete('123e4567...')
   *   .subscribe(() => console.log('Deleted successfully'));
   * ```
   */
  delete(id: string): Observable<void> {
    this.setLoading(true);
    this.clearError();

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Remove from cache
        const current = this.cache();
        this.cache.set(current.filter((item) => item.id !== id));
        console.log('TestTool Service: Deleted record', id);
      }),
      catchError((error) => this.handleError(error, `delete test tool record ${id}`)),
      finalize(() => this.setLoading(false)),
    );
  }

  /**
   * Clear cached data.
   * Resets cache to empty array.
   */
  clearCache(): void {
    this.cache.set([]);
    console.log('TestTool Service: Cache cleared');
  }

  /**
   * Set loading state.
   * @param isLoading - Loading state
   */
  private setLoading(isLoading: boolean): void {
    this.loading.set(isLoading);
  }

  /**
   * Clear error state.
   */
  private clearError(): void {
    this.error.set(null);
  }

  /**
   * Handle HTTP errors with user-friendly messages.
   *
   * @param error - HTTP error response
   * @param operation - Description of failed operation
   * @returns Observable error
   */
  private handleError(error: HttpErrorResponse, operation: string): Observable<never> {
    let errorMessage = `Failed to ${operation}`;

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Network error: ${error.error.message}`;
    } else {
      // Backend error
      errorMessage =
        error.error?.message ||
        error.message ||
        `Server error (${error.status}): ${error.statusText}`;
    }

    this.error.set(errorMessage);
    console.error(`TestTool Service Error [${operation}]:`, error);

    return throwError(() => new Error(errorMessage));
  }
}
