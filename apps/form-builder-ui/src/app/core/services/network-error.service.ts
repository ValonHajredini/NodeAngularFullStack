import { Injectable, inject, signal } from '@angular/core';
import { Observable, timer, throwError, of } from 'rxjs';
import { retry, retryWhen, delayWhen, take, concatMap, tap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Interface for network error information
 */
export interface NetworkError {
  id: string;
  message: string;
  type: 'network' | 'server' | 'client' | 'timeout';
  statusCode?: number;
  timestamp: Date;
  retryCount: number;
  canRetry: boolean;
}

/**
 * Interface for retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  delayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

/**
 * Service for handling network errors, retry mechanisms, and connection monitoring.
 * Provides comprehensive error detection, automatic retries, and user-friendly error states.
 */
@Injectable({ providedIn: 'root' })
export class NetworkErrorService {
  // Network state signals
  private readonly isOnlineSignal = signal(navigator.onLine);
  private readonly networkErrorsSignal = signal<NetworkError[]>([]);
  private readonly retryingRequestsSignal = signal<Set<string>>(new Set());

  // Public readonly signals
  readonly isOnline = this.isOnlineSignal.asReadonly();
  readonly networkErrors = this.networkErrorsSignal.asReadonly();
  readonly retryingRequests = this.retryingRequestsSignal.asReadonly();

  // Default retry configuration
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    retryableStatusCodes: [0, 408, 429, 500, 502, 503, 504]
  };

  constructor() {
    this.initializeNetworkMonitoring();
  }

  /**
   * Wraps an HTTP observable with retry logic and error handling.
   * @param request$ - The HTTP request observable
   * @param config - Optional retry configuration
   * @param requestId - Optional request identifier for tracking
   * @returns Observable with retry logic applied
   */
  withRetry<T>(
    request$: Observable<T>,
    config?: Partial<RetryConfig>,
    requestId?: string
  ): Observable<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    const id = requestId || this.generateRequestId();

    return request$.pipe(
      retryWhen(errors$ =>
        errors$.pipe(
          concatMap((error: HttpErrorResponse, index: number) => {
            const retryCount = index + 1;
            const networkError = this.createNetworkError(error, retryCount);

            // Check if we should retry
            if (!this.shouldRetry(error, retryCount, retryConfig)) {
              this.addNetworkError(networkError);
              return throwError(() => error);
            }

            // Add to retrying requests
            this.addRetryingRequest(id);

            // Calculate delay with exponential backoff
            const delay = retryConfig.delayMs * Math.pow(retryConfig.backoffMultiplier, index);

            console.warn(`Retrying request (${retryCount}/${retryConfig.maxRetries}) after ${delay}ms:`, error.message);

            return timer(delay).pipe(
              tap(() => {
                // Update retry count in our tracking
                networkError.retryCount = retryCount;
              })
            );
          }),
          take(retryConfig.maxRetries)
        )
      ),
      tap({
        next: () => {
          // Remove from retrying requests on success
          this.removeRetryingRequest(id);
        },
        error: (error) => {
          // Remove from retrying requests on final failure
          this.removeRetryingRequest(id);
          this.addNetworkError(this.createNetworkError(error, retryConfig.maxRetries));
        }
      })
    );
  }

  /**
   * Implements optimistic updates with rollback on failure.
   * @param optimisticUpdate - Function to apply optimistic changes
   * @param serverRequest$ - Observable for the actual server request
   * @param rollbackUpdate - Function to rollback changes on failure
   * @returns Observable with optimistic update logic
   */
  withOptimisticUpdate<T>(
    optimisticUpdate: () => void,
    serverRequest$: Observable<T>,
    rollbackUpdate: () => void,
    config?: Partial<RetryConfig>
  ): Observable<T> {
    // Apply optimistic update immediately
    optimisticUpdate();

    return this.withRetry(serverRequest$, config).pipe(
      tap({
        error: () => {
          // Rollback on failure
          rollbackUpdate();
        }
      })
    );
  }

  /**
   * Gets user-friendly error message for display.
   * @param error - The error object
   * @returns User-friendly error message
   */
  getErrorMessage(error: any): string {
    if (!this.isOnline()) {
      return 'You appear to be offline. Please check your internet connection and try again.';
    }

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
          return 'Unable to connect to the server. Please check your internet connection.';
        case 400:
          return error.error?.message || 'The request was invalid. Please check your input and try again.';
        case 401:
          return 'Your session has expired. Please log in again.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 408:
          return 'The request timed out. Please try again.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'A server error occurred. Please try again later.';
        case 502:
        case 503:
        case 504:
          return 'The server is temporarily unavailable. Please try again in a few moments.';
        default:
          return error.error?.message || 'An unexpected error occurred. Please try again.';
      }
    }

    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Clears a specific network error.
   * @param errorId - The error ID to clear
   */
  clearError(errorId: string): void {
    const currentErrors = this.networkErrorsSignal();
    const updatedErrors = currentErrors.filter(error => error.id !== errorId);
    this.networkErrorsSignal.set(updatedErrors);
  }

  /**
   * Clears all network errors.
   */
  clearAllErrors(): void {
    this.networkErrorsSignal.set([]);
  }

  /**
   * Checks if there are any active network errors.
   * @returns True if there are active errors
   */
  hasActiveErrors(): boolean {
    return this.networkErrorsSignal().length > 0;
  }

  /**
   * Gets the most recent network error.
   * @returns The most recent error or null
   */
  getLatestError(): NetworkError | null {
    const errors = this.networkErrorsSignal();
    return errors.length > 0 ? errors[errors.length - 1] : null;
  }

  /**
   * Retries a failed request manually.
   * @param request$ - The request to retry
   * @param errorId - The error ID to retry
   * @returns Observable for the retry attempt
   */
  retryRequest<T>(request$: Observable<T>, errorId: string): Observable<T> {
    this.clearError(errorId);
    return this.withRetry(request$);
  }

  /**
   * Initializes network monitoring for online/offline detection.
   */
  private initializeNetworkMonitoring(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnlineSignal.set(true);
      console.log('Network connection restored');
    });

    window.addEventListener('offline', () => {
      this.isOnlineSignal.set(false);
      console.warn('Network connection lost');
    });
  }

  /**
   * Creates a network error object from an HTTP error.
   * @param error - The HTTP error response
   * @param retryCount - Current retry count
   * @returns NetworkError object
   */
  private createNetworkError(error: HttpErrorResponse, retryCount: number): NetworkError {
    let type: NetworkError['type'] = 'server';

    if (error.status === 0 || !this.isOnline()) {
      type = 'network';
    } else if (error.status === 408) {
      type = 'timeout';
    } else if (error.status >= 400 && error.status < 500) {
      type = 'client';
    }

    return {
      id: this.generateRequestId(),
      message: this.getErrorMessage(error),
      type,
      statusCode: error.status,
      timestamp: new Date(),
      retryCount,
      canRetry: this.shouldRetry(error, retryCount, this.defaultRetryConfig)
    };
  }

  /**
   * Determines if an error should be retried.
   * @param error - The HTTP error response
   * @param retryCount - Current retry count
   * @param config - Retry configuration
   * @returns True if should retry
   */
  private shouldRetry(error: HttpErrorResponse, retryCount: number, config: RetryConfig): boolean {
    // Don't retry if max retries exceeded
    if (retryCount >= config.maxRetries) {
      return false;
    }

    // Don't retry if offline
    if (!this.isOnline()) {
      return false;
    }

    // Check if status code is retryable
    return config.retryableStatusCodes.includes(error.status);
  }

  /**
   * Adds a network error to the list.
   * @param error - The network error to add
   */
  private addNetworkError(error: NetworkError): void {
    const currentErrors = this.networkErrorsSignal();
    const updatedErrors = [...currentErrors, error];

    // Keep only the last 10 errors to prevent memory issues
    if (updatedErrors.length > 10) {
      updatedErrors.splice(0, updatedErrors.length - 10);
    }

    this.networkErrorsSignal.set(updatedErrors);
  }

  /**
   * Adds a request to the retrying requests set.
   * @param requestId - The request ID
   */
  private addRetryingRequest(requestId: string): void {
    const current = this.retryingRequestsSignal();
    const updated = new Set(current);
    updated.add(requestId);
    this.retryingRequestsSignal.set(updated);
  }

  /**
   * Removes a request from the retrying requests set.
   * @param requestId - The request ID
   */
  private removeRetryingRequest(requestId: string): void {
    const current = this.retryingRequestsSignal();
    const updated = new Set(current);
    updated.delete(requestId);
    this.retryingRequestsSignal.set(updated);
  }

  /**
   * Generates a unique request ID.
   * @returns Unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}