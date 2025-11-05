import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import {
  ToolConfig,
  CreateToolConfigRequest,
  UpdateToolConfigRequest,
  GetToolConfigResponse,
  GetToolConfigsResponse,
  SaveToolConfigResponse,
  ActivateToolConfigResponse,
  DeleteToolConfigResponse,
  CheckComponentResponse,
  ComponentExistenceCheck,
} from '@nodeangularfullstack/shared';
import { environment } from '../../../environments/environment';

/**
 * Cache entry for tool configurations.
 */
interface ConfigCacheEntry {
  configs: ToolConfig[];
  activeConfig: ToolConfig | null;
  cachedAt: number;
  ttl: number;
}

/**
 * Tool configuration service for managing tool display configurations.
 * Provides methods for CRUD operations on tool configs with caching.
 */
@Injectable({
  providedIn: 'root',
})
export class ToolConfigService {
  private readonly API_BASE = `${environment.apiUrl}/admin/tools`;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Cache for configurations by tool key
  private configCache = new Map<string, ConfigCacheEntry>();

  // Signals for reactive state
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Subject for config changes (for real-time updates)
  private configChanges$ = new BehaviorSubject<{
    toolKey: string;
    config: ToolConfig;
  } | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Checks if cached configs are still valid.
   */
  private isCacheValid(toolKey: string): boolean {
    const cached = this.configCache.get(toolKey);
    if (!cached) return false;

    const now = Date.now();
    return now - cached.cachedAt < cached.ttl;
  }

  /**
   * Invalidates cache for a specific tool.
   */
  private invalidateCache(toolKey: string): void {
    this.configCache.delete(toolKey);
  }

  /**
   * Invalidates all caches.
   */
  private invalidateAllCaches(): void {
    this.configCache.clear();
  }

  /**
   * Retrieves all configurations for a specific tool.
   * @param toolKey - Tool key to fetch configs for
   * @param skipCache - Whether to bypass cache
   * @returns Observable containing configs response
   */
  getToolConfigs(toolKey: string, skipCache = false): Observable<GetToolConfigsResponse> {
    // Check cache first
    if (!skipCache && this.isCacheValid(toolKey)) {
      const cached = this.configCache.get(toolKey)!;
      return new Observable((observer) => {
        observer.next({
          success: true,
          data: {
            configs: cached.configs,
            activeConfig: cached.activeConfig,
          },
        });
        observer.complete();
      });
    }

    this.loading.set(true);
    this.error.set(null);

    return this.http.get<GetToolConfigsResponse>(`${this.API_BASE}/${toolKey}/configs`).pipe(
      tap((response) => {
        // Update cache
        this.configCache.set(toolKey, {
          configs: response.data.configs,
          activeConfig: response.data.activeConfig,
          cachedAt: Date.now(),
          ttl: this.CACHE_TTL,
        });
        this.loading.set(false);
      }),
      catchError((error: HttpErrorResponse) => {
        this.loading.set(false);
        const errorMessage = this.handleError(error);
        this.error.set(errorMessage);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  /**
   * Retrieves the active configuration for a specific tool.
   * @param toolKey - Tool key to fetch active config for
   * @returns Observable containing active config response or null
   */
  getActiveConfig(toolKey: string): Observable<ToolConfig | null> {
    // Try cache first
    if (this.isCacheValid(toolKey)) {
      const cached = this.configCache.get(toolKey)!;
      return new Observable<ToolConfig | null>((observer) => {
        observer.next(cached.activeConfig);
        observer.complete();
      });
    }

    this.loading.set(true);
    this.error.set(null);

    return this.http.get<GetToolConfigResponse>(`${this.API_BASE}/${toolKey}/configs/active`).pipe(
      map((response) => response.data.config),
      tap(() => this.loading.set(false)),
      catchError((error: HttpErrorResponse) => {
        this.loading.set(false);
        if (error.status === 404) {
          // No active config found
          return new Observable<ToolConfig | null>((observer) => {
            observer.next(null);
            observer.complete();
          });
        }
        const errorMessage = this.handleError(error);
        this.error.set(errorMessage);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  /**
   * Creates a new tool configuration.
   * @param toolKey - Tool key to create config for
   * @param request - Configuration creation request
   * @returns Observable containing created config response
   */
  createConfig(
    toolKey: string,
    request: CreateToolConfigRequest,
  ): Observable<SaveToolConfigResponse> {
    this.loading.set(true);
    this.error.set(null);

    const url = `${this.API_BASE}/${toolKey}/configs`;

    // Debug logging
    console.log('[ToolConfigService] Creating config:', {
      toolKey,
      url,
      request,
      apiBase: this.API_BASE,
    });

    return this.http.post<SaveToolConfigResponse>(url, request).pipe(
      tap((response) => {
        console.log('[ToolConfigService] Config created successfully:', response);
        this.invalidateCache(toolKey);
        this.configChanges$.next({ toolKey, config: response.data.config });
        this.loading.set(false);
      }),
      catchError((error: HttpErrorResponse) => {
        this.loading.set(false);
        console.error('[ToolConfigService] Failed to create config:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          error: error.error,
          message: error.message,
        });
        const errorMessage = this.handleError(error);
        this.error.set(errorMessage);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  /**
   * Updates an existing tool configuration.
   * @param toolKey - Tool key
   * @param configId - Configuration ID to update
   * @param request - Configuration update request
   * @returns Observable containing updated config response
   */
  updateConfig(
    toolKey: string,
    configId: string,
    request: UpdateToolConfigRequest,
  ): Observable<SaveToolConfigResponse> {
    this.loading.set(true);
    this.error.set(null);

    return this.http
      .put<SaveToolConfigResponse>(`${this.API_BASE}/${toolKey}/configs/${configId}`, request)
      .pipe(
        tap((response) => {
          this.invalidateCache(toolKey);
          this.configChanges$.next({ toolKey, config: response.data.config });
          this.loading.set(false);
        }),
        catchError((error: HttpErrorResponse) => {
          this.loading.set(false);
          const errorMessage = this.handleError(error);
          this.error.set(errorMessage);
          return throwError(() => new Error(errorMessage));
        }),
      );
  }

  /**
   * Sets a configuration as active.
   * @param toolKey - Tool key
   * @param configId - Configuration ID to activate
   * @returns Observable containing activated config response
   */
  activateConfig(toolKey: string, configId: string): Observable<ActivateToolConfigResponse> {
    this.loading.set(true);
    this.error.set(null);

    return this.http
      .put<ActivateToolConfigResponse>(
        `${this.API_BASE}/${toolKey}/configs/${configId}/activate`,
        {},
      )
      .pipe(
        tap((response) => {
          this.invalidateCache(toolKey);
          this.configChanges$.next({ toolKey, config: response.data.config });
          this.loading.set(false);
        }),
        catchError((error: HttpErrorResponse) => {
          this.loading.set(false);
          const errorMessage = this.handleError(error);
          this.error.set(errorMessage);
          return throwError(() => new Error(errorMessage));
        }),
      );
  }

  /**
   * Deletes a tool configuration.
   * @param toolKey - Tool key
   * @param configId - Configuration ID to delete
   * @returns Observable containing delete response
   */
  deleteConfig(toolKey: string, configId: string): Observable<DeleteToolConfigResponse> {
    this.loading.set(true);
    this.error.set(null);

    return this.http
      .delete<DeleteToolConfigResponse>(`${this.API_BASE}/${toolKey}/configs/${configId}`)
      .pipe(
        tap(() => {
          this.invalidateCache(toolKey);
          this.loading.set(false);
        }),
        catchError((error: HttpErrorResponse) => {
          this.loading.set(false);
          const errorMessage = this.handleError(error);
          this.error.set(errorMessage);
          return throwError(() => new Error(errorMessage));
        }),
      );
  }

  /**
   * Observable for configuration changes.
   * Subscribe to this to get notified when configs change.
   */
  get configChanges(): Observable<{ toolKey: string; config: ToolConfig } | null> {
    return this.configChanges$.asObservable();
  }

  /**
   * Checks if a component exists for the given slug.
   * @param slug - Component slug to check
   * @returns Observable containing component existence check
   */
  checkComponentExists(slug: string): Observable<ComponentExistenceCheck> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<CheckComponentResponse>(`${this.API_BASE}/check-component/${slug}`).pipe(
      map((response) => response.data),
      tap(() => this.loading.set(false)),
      catchError((error: HttpErrorResponse) => {
        this.loading.set(false);
        const errorMessage = this.handleError(error);
        this.error.set(errorMessage);
        return throwError(() => new Error(errorMessage));
      }),
    );
  }

  /**
   * Clears the error state.
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Forces cache refresh for a tool.
   */
  refreshCache(toolKey: string): void {
    this.invalidateCache(toolKey);
  }

  /**
   * Handles HTTP errors and returns user-friendly messages.
   */
  private handleError(error: HttpErrorResponse): string {
    if (error.error?.message) {
      return error.error.message;
    }

    switch (error.status) {
      case 400:
        return 'Invalid configuration data provided';
      case 401:
        return 'Authentication required';
      case 403:
        return 'You do not have permission to manage tool configurations';
      case 404:
        return 'Tool or configuration not found';
      case 409:
        return 'Configuration version already exists';
      case 500:
        return 'Server error occurred. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}
