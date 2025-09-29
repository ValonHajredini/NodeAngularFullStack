import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiClientService } from '../../../core/api/api-client.service';
import { ToolsService } from '../../../core/services/tools.service';
import { environment } from '@env/environment';
import {
  CreateShortLinkRequest,
  CreateShortLinkResponse,
  ResolveShortLinkResponse,
  ShortLink,
} from '@nodeangularfullstack/shared';

/**
 * Response wrapper for short link API operations.
 * Matches backend API response format.
 */
export interface ShortLinkApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/**
 * Error response interface for short link operations.
 */
export interface ShortLinkErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

/**
 * URL preview information.
 */
export interface UrlPreview {
  valid: boolean;
  sanitizedUrl: string;
  domain: string;
  isSecure: boolean;
}

/**
 * Short link service for URL shortening operations.
 * Provides methods for creating, resolving, and managing short links
 * with proper validation and error handling.
 */
@Injectable({ providedIn: 'root' })
export class ShortLinkService {
  private readonly apiClient = inject(ApiClientService);
  private readonly toolsService = inject(ToolsService);

  // Internal state management with signals
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly recentLinksSignal = signal<ShortLink[]>([]);

  // Public readonly signals for component consumption
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly recentLinks = this.recentLinksSignal.asReadonly();

  // Computed signal for tool availability
  readonly isToolEnabled = computed(() => this.toolsService.isToolEnabled('short-link'));

  // Environment-specific base URL for short links
  private readonly shortLinkBaseUrl = this.resolveShortLinkBaseUrl();

  constructor() {
    // Initialize recent links if needed
    this.loadRecentLinks();
  }

  /**
   * Creates a new short link.
   * @param request - Short link creation request
   * @returns Observable containing the created short link and full URL
   * @throws {HttpErrorResponse} When creation fails or tool is disabled
   * @example
   * shortLinkService.createShortLink({
   *   originalUrl: 'https://example.com',
   *   expiresAt: new Date('2025-12-31')
   * }).subscribe({
   *   next: (response) => console.log('Short URL:', response.data.shortUrl),
   *   error: (error) => console.error('Creation failed:', error)
   * });
   */
  createShortLink(request: CreateShortLinkRequest): Observable<CreateShortLinkResponse> {
    if (!this.isToolEnabled()) {
      return throwError(() => new Error('Short link tool is currently disabled'));
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.apiClient
      .post<ShortLinkApiResponse<CreateShortLinkResponse['data']>>('/tools/short-links', request)
      .pipe(
        map((response) => ({
          success: response.success,
          data: response.data,
        })),
        tap((response) => {
          if (response.success) {
            // Add to recent links cache
            this.addToRecentLinks(response.data.shortLink);
          }
        }),
        catchError((error) => {
          const errorMessage = this.extractErrorMessage(error);
          this.errorSignal.set(errorMessage);
          return throwError(() => error);
        }),
        tap(() => this.loadingSignal.set(false)),
      );
  }

  /**
   * Resolves a short code to get detailed information about the short link.
   * Note: This is for informational purposes, actual redirects happen server-side.
   * @param code - Short code to resolve
   * @returns Observable containing the resolved short link information
   * @throws {HttpErrorResponse} When resolution fails
   * @example
   * shortLinkService.resolveShortLink('abc123').subscribe({
   *   next: (response) => console.log('Original URL:', response.data.originalUrl),
   *   error: (error) => console.error('Resolution failed:', error)
   * });
   */
  resolveShortLink(code: string): Observable<ResolveShortLinkResponse> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.apiClient
      .get<ShortLinkApiResponse<ResolveShortLinkResponse['data']>>(`/tools/short-links/${code}`)
      .pipe(
        map((response) => ({
          success: response.success,
          data: response.data,
        })),
        catchError((error) => {
          const errorMessage = this.extractErrorMessage(error);
          this.errorSignal.set(errorMessage);
          return throwError(() => error);
        }),
        tap(() => this.loadingSignal.set(false)),
      );
  }

  /**
   * Retrieves short links created by the current user.
   * @param limit - Maximum number of results (default: 20)
   * @param offset - Number of results to skip (default: 0)
   * @returns Observable containing array of user's short links
   * @throws {HttpErrorResponse} When retrieval fails
   * @example
   * shortLinkService.getUserShortLinks(10, 0).subscribe({
   *   next: (links) => console.log('User links:', links.length),
   *   error: (error) => console.error('Retrieval failed:', error)
   * });
   */
  getUserShortLinks(limit = 20, offset = 0): Observable<ShortLink[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const params = { limit: limit.toString(), offset: offset.toString() };

    return this.apiClient
      .get<ShortLinkApiResponse<{ shortLinks: ShortLink[] }>>('/tools/short-links', { params })
      .pipe(
        map((response) => response.data.shortLinks),
        tap((links) => {
          // Update recent links cache
          this.recentLinksSignal.set(links);
        }),
        catchError((error) => {
          const errorMessage = this.extractErrorMessage(error);
          this.errorSignal.set(errorMessage);
          return throwError(() => error);
        }),
        tap(() => this.loadingSignal.set(false)),
      );
  }

  /**
   * Previews URL information without creating a short link.
   * @param url - URL to preview
   * @returns Observable containing URL preview information
   * @throws {HttpErrorResponse} When preview fails
   * @example
   * shortLinkService.previewUrl('https://example.com').subscribe({
   *   next: (preview) => console.log('Domain:', preview.domain),
   *   error: (error) => console.error('Preview failed:', error)
   * });
   */
  previewUrl(url: string): Observable<UrlPreview> {
    return this.apiClient
      .post<ShortLinkApiResponse<UrlPreview>>('/tools/short-links/preview', { url })
      .pipe(
        map((response) => response.data),
        catchError((error) => {
          const errorMessage = this.extractErrorMessage(error);
          this.errorSignal.set(errorMessage);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Generates the full short URL for a given code.
   * @param code - Short code
   * @returns Full short URL string
   * @example
   * const shortUrl = shortLinkService.generateShortUrl('abc123');
   * // Returns: "https://example.com/s/abc123"
   */
  generateShortUrl(code: string): string {
    return `${this.shortLinkBaseUrl}/s/${code}`;
  }

  /**
   * Validates URL format on the client side.
   * @param url - URL to validate
   * @returns boolean indicating if URL format is valid
   * @example
   * const isValid = shortLinkService.isValidUrl('https://example.com');
   */
  isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url.trim());
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Validates short code format.
   * @param code - Short code to validate
   * @returns boolean indicating if code format is valid
   * @example
   * const isValid = shortLinkService.isValidCode('abc123');
   */
  isValidCode(code: string): boolean {
    return (
      code.length >= 6 && code.length <= 8 && /^[a-zA-Z0-9]+$/.test(code) && !/[0oO1lI]/.test(code) // No confusing characters
    );
  }

  /**
   * Copies text to clipboard with fallback support.
   * @param text - Text to copy
   * @returns Promise indicating success/failure
   * @example
   * shortLinkService.copyToClipboard('https://example.com/s/abc123')
   *   .then(() => console.log('Copied!'))
   *   .catch(() => console.log('Copy failed'));
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      return successful;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Clears any error state in the service.
   * @example
   * shortLinkService.clearError();
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Refreshes the recent links cache.
   * @example
   * shortLinkService.refreshRecentLinks();
   */
  refreshRecentLinks(): void {
    this.getUserShortLinks(20, 0).subscribe({
      error: () => {}, // Silent refresh
    });
  }

  /**
   * Extracts error message from HTTP error response.
   */
  private extractErrorMessage(error: any): string {
    if (error?.error?.error?.message) {
      return error.error.error.message;
    }
    if (error?.error?.message) {
      return error.error.message;
    }
    if (error?.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }

  /**
   * Adds a short link to the recent links cache.
   */
  private addToRecentLinks(shortLink: ShortLink): void {
    const current = this.recentLinksSignal();
    const updated = [shortLink, ...current.filter((link) => link.id !== shortLink.id)];
    this.recentLinksSignal.set(updated.slice(0, 20)); // Keep only 20 most recent
  }

  /**
   * Loads recent links from API (called on service initialization).
   */
  private loadRecentLinks(): void {
    if (this.isToolEnabled()) {
      this.getUserShortLinks(10, 0).subscribe({
        error: () => {}, // Silent initial load
      });
    }
  }

  /**
   * Determines the base URL for short links based on environment configuration.
   * Falls back to the current window origin if parsing fails.
   */
  private resolveShortLinkBaseUrl(): string {
    const configured = environment.shortLinkBaseUrl?.trim();
    if (configured) {
      return this.normalizeBaseUrl(configured);
    }

    try {
      const apiUrl = new URL(environment.apiUrl);
      return `${apiUrl.protocol}//${apiUrl.host}`;
    } catch (error) {
      console.warn('Unable to parse environment.apiUrl, falling back to window origin.', error);
      return this.normalizeBaseUrl(window.location.origin);
    }
  }

  /**
   * Ensures the base URL has no trailing slash to prevent double slashes.
   */
  private normalizeBaseUrl(url: string): string {
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }
}
