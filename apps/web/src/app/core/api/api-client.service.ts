import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout, retry } from 'rxjs/operators';
import { environment } from '@env/environment';

/**
 * Centralized API client service for making HTTP requests.
 * Provides a consistent interface for all API interactions with
 * automatic error handling, timeouts, and retry logic.
 */
@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Makes a GET request to the specified endpoint.
   * @param endpoint - API endpoint (relative to base URL)
   * @param options - Optional request configuration
   * @returns Observable containing the response data
   * @example
   * apiClient.get<User[]>('/users')
   *   .subscribe(users => console.log('Users:', users));
   */
  get<T>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('GET', endpoint, null, options);
  }

  /**
   * Makes a POST request to the specified endpoint.
   * @param endpoint - API endpoint (relative to base URL)
   * @param body - Request body data
   * @param options - Optional request configuration
   * @returns Observable containing the response data
   * @example
   * apiClient.post<AuthResponse>('/auth/login', credentials)
   *   .subscribe(response => console.log('Login successful:', response));
   */
  post<T>(endpoint: string, body: any, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('POST', endpoint, body, options);
  }

  /**
   * Makes a PATCH request to the specified endpoint.
   * @param endpoint - API endpoint (relative to base URL)
   * @param body - Request body data
   * @param options - Optional request configuration
   * @returns Observable containing the response data
   * @example
   * apiClient.patch<User>('/users/123', updates)
   *   .subscribe(user => console.log('User updated:', user));
   */
  patch<T>(endpoint: string, body: any, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  /**
   * Makes a PUT request to the specified endpoint.
   * @param endpoint - API endpoint (relative to base URL)
   * @param body - Request body data
   * @param options - Optional request configuration
   * @returns Observable containing the response data
   */
  put<T>(endpoint: string, body: any, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  /**
   * Makes a DELETE request to the specified endpoint.
   * @param endpoint - API endpoint (relative to base URL)
   * @param options - Optional request configuration
   * @returns Observable containing the response data
   * @example
   * apiClient.delete('/users/123')
   *   .subscribe(() => console.log('User deleted successfully'));
   */
  delete<T>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('DELETE', endpoint, null, options);
  }

  /**
   * Generic request method that handles all HTTP methods.
   * Includes automatic timeout, retry logic, and error handling.
   */
  private request<T>(
    method: string,
    endpoint: string,
    body: any,
    options?: ApiRequestOptions,
  ): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const requestOptions = this.buildRequestOptions(options, body);

    let request: Observable<T>;

    switch (method) {
      case 'GET':
        request = this.http.get<T>(url, requestOptions) as Observable<T>;
        break;
      case 'POST':
        request = this.http.post<T>(url, body, requestOptions) as Observable<T>;
        break;
      case 'PATCH':
        request = this.http.patch<T>(url, body, requestOptions) as Observable<T>;
        break;
      case 'PUT':
        request = this.http.put<T>(url, body, requestOptions) as Observable<T>;
        break;
      case 'DELETE':
        request = this.http.delete<T>(url, requestOptions) as Observable<T>;
        break;
      default:
        return throwError(() => new Error(`Unsupported HTTP method: ${method}`));
    }

    return request.pipe(
      timeout(environment.api.timeout),
      retry({ count: environment.api.retryAttempts, delay: environment.api.retryDelay }),
      catchError((error) => {
        console.error(`API Error [${method} ${url}]:`, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Builds HTTP request options from the provided configuration.
   */
  private buildRequestOptions(options?: ApiRequestOptions, body?: any): any {
    let headers = new HttpHeaders();

    // Only set Content-Type for non-FormData requests
    // FormData requires the browser to set its own Content-Type with boundary
    if (!(body instanceof FormData)) {
      headers = headers.set('Content-Type', 'application/json');
    }

    if (options?.headers) {
      Object.keys(options.headers).forEach((key) => {
        headers = headers.set(key, options.headers![key]);
      });
    }

    let params = new HttpParams();
    if (options?.params) {
      Object.keys(options.params).forEach((key) => {
        params = params.set(key, options.params![key]);
      });
    }

    return {
      headers,
      params,
      ...options,
    };
  }
}

/**
 * Configuration options for API requests.
 */
export interface ApiRequestOptions {
  /** Custom headers to include in the request */
  headers?: Record<string, string>;

  /** Query parameters to include in the request */
  params?: Record<string, string>;

  /** Whether to include credentials with the request */
  withCredentials?: boolean;

  /** Response type expected from the server */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
}
