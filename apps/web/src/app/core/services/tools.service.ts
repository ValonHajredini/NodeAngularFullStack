import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { Observable, throwError, BehaviorSubject, timer, EMPTY } from 'rxjs';
import { map, catchError, tap, switchMap, takeUntil, shareReplay, startWith } from 'rxjs/operators';
import { ApiClientService } from '../api/api-client.service';
import {
  Tool,
  GetToolsResponse,
  ToolCacheEntry,
  ToolStatusChangeEvent,
} from '@nodeangularfullstack/shared';

/**
 * Response wrapper for tools API operations.
 * Matches backend API response format.
 */
export interface ToolsApiResponse<T> {
  success: boolean;
  data: T;
  timestamp?: string;
}

/**
 * Simple response format for public tools API.
 */
export interface PublicToolsResponse {
  tools: Tool[];
}

/**
 * Configuration for tools service caching and polling.
 */
export interface ToolsServiceConfig {
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTtl: number;
  /** Polling interval for status updates in milliseconds (default: 30 seconds) */
  pollingInterval: number;
  /** Maximum number of retry attempts for failed API calls */
  maxRetries: number;
  /** Enable WebSocket updates (future enhancement) */
  enableWebSocket: boolean;
}

/**
 * Tools service managing tool registry status with client-side caching.
 * Provides reactive access to tool status with automatic cache invalidation
 * and real-time updates via polling. Implements graceful fallback for API failures.
 */
@Injectable({ providedIn: 'root' })
export class ToolsService implements OnDestroy {
  private readonly apiClient = inject(ApiClientService);

  // Service configuration with defaults
  private readonly config: ToolsServiceConfig = {
    cacheTtl: 5 * 60 * 1000, // 5 minutes
    pollingInterval: 30 * 1000, // 30 seconds
    maxRetries: 3,
    enableWebSocket: false, // Will be implemented in future story
  };

  // Internal state management with signals
  private readonly toolsCache = signal<Map<string, ToolCacheEntry>>(new Map());
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly lastFetchSignal = signal<number>(0);

  // Destroy subject for cleanup
  private readonly destroy$ = new BehaviorSubject<void>(undefined);

  // Computed properties for component consumption
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly lastFetch = this.lastFetchSignal.asReadonly();

  // Computed signal for all cached tools
  readonly tools = computed(() => {
    const cache = this.toolsCache();
    const validEntries = Array.from(cache.values())
      .filter((entry) => this.isCacheEntryValid(entry))
      .map((entry) => entry.tool);
    return validEntries;
  });

  // Computed signal for enabled tools count
  readonly enabledToolsCount = computed(() => {
    return this.tools().filter((tool) => tool.active).length;
  });

  constructor() {
    this.initializePolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Gets the status of a specific tool by its key.
   * Returns cached data if available and valid, otherwise fetches from API.
   * @param toolKey - Unique key identifier for the tool
   * @returns Observable containing the tool status or null if not found
   * @throws {HttpErrorResponse} When tool retrieval fails
   * @example
   * toolsService.getToolStatus('short-link').subscribe({
   *   next: (tool) => tool ? console.log('Tool found:', tool.name) : console.log('Tool not found'),
   *   error: (error) => console.error('Failed to get tool status:', error)
   * });
   */
  getToolStatus(toolKey: string): Observable<Tool | null> {
    const cached = this.getCachedTool(toolKey);

    if (cached && this.isCacheEntryValid(cached)) {
      // Return cached data as observable
      return new Observable((observer) => {
        observer.next(cached.tool);
        observer.complete();
      });
    }

    // Fetch from API if not cached or expired
    return this.fetchToolFromApi(toolKey);
  }

  /**
   * Checks if a tool is currently enabled.
   * Uses cached data for immediate response with background refresh if needed.
   * @param toolKey - Unique key identifier for the tool
   * @returns Boolean indicating if tool is enabled, false if not found or disabled
   * @example
   * const isEnabled = toolsService.isToolEnabled('short-link');
   * if (isEnabled) {
   *   // Show tool UI
   * }
   */
  isToolEnabled(toolKey: string): boolean {
    const cached = this.getCachedTool(toolKey);

    if (!cached) {
      // Trigger background fetch for future requests
      this.fetchToolFromApi(toolKey).subscribe({
        error: () => {}, // Silent background fetch
      });
      return false;
    }

    // Return cached status even if expired (stale-while-revalidate)
    if (!this.isCacheEntryValid(cached)) {
      // Trigger background refresh
      this.fetchToolFromApi(toolKey).subscribe({
        error: () => {}, // Silent background refresh
      });
    }

    return cached.tool.active;
  }

  /**
   * Forces a refresh of all tools from the API.
   * Clears cache and fetches fresh data.
   * @returns Observable containing array of all tools
   * @throws {HttpErrorResponse} When tools refresh fails
   * @example
   * toolsService.refreshAllTools().subscribe({
   *   next: (tools) => console.log('Refreshed tools:', tools.length),
   *   error: (error) => console.error('Refresh failed:', error)
   * });
   */
  refreshAllTools(): Observable<Tool[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.apiClient.get<ToolsApiResponse<PublicToolsResponse>>('/tools').pipe(
      map((response: ToolsApiResponse<PublicToolsResponse>) => response.data.tools),
      tap((tools: Tool[]) => {
        this.updateCache(tools);
        this.lastFetchSignal.set(Date.now());
      }),
      catchError((error: unknown) => {
        const errorMessage = this.extractErrorMessage(error);
        this.errorSignal.set(errorMessage);
        this.loadingSignal.set(false);

        // Return cached tools as fallback
        const cachedTools = this.tools();
        if (cachedTools.length > 0) {
          // eslint-disable-next-line no-console
          console.warn('API failed, using cached tools as fallback');
          return new Observable<Tool[]>((observer) => {
            observer.next(cachedTools);
            observer.complete();
          });
        }

        return throwError(() => error);
      }),
      tap(() => this.loadingSignal.set(false)),
    );
  }

  /**
   * Extracts error message from unknown error type.
   */
  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const errorObj = error as { error?: { error?: { message?: string } } };
      return errorObj.error?.error?.message || 'Failed to refresh tools';
    }
    return 'Failed to refresh tools';
  }

  /**
   * Gets all cached tools without making API calls.
   * Returns empty array if no tools are cached.
   * @returns Array of cached tools (may include expired entries)
   * @example
   * const cachedTools = toolsService.getCachedTools();
   * console.log('Currently cached:', cachedTools.length);
   */
  getCachedTools(): Tool[] {
    return Array.from(this.toolsCache().values()).map((entry) => entry.tool);
  }

  /**
   * Checks if the tools cache has any valid (non-expired) entries.
   * @returns Boolean indicating if cache contains valid data
   * @example
   * if (toolsService.hasFreshCache()) {
   *   // Use cached data
   * } else {
   *   // Need to fetch from API
   * }
   */
  hasFreshCache(): boolean {
    const cache = this.toolsCache();
    return Array.from(cache.values()).some((entry) => this.isCacheEntryValid(entry));
  }

  /**
   * Manually invalidates cache for a specific tool or all tools.
   * @param toolKey - Optional tool key to invalidate, omit to clear all cache
   * @example
   * toolsService.invalidateCache('short-link'); // Clear specific tool
   * toolsService.invalidateCache(); // Clear all tools
   */
  invalidateCache(toolKey?: string): void {
    if (toolKey) {
      const cache = new Map(this.toolsCache());
      cache.delete(toolKey);
      this.toolsCache.set(cache);
    } else {
      this.toolsCache.set(new Map());
    }
  }

  /**
   * Clears any error state in the service.
   * Used to reset error messages after user acknowledgment.
   * @example
   * toolsService.clearError();
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Updates service configuration at runtime.
   * @param config - Partial configuration to update
   * @example
   * toolsService.updateConfig({ cacheTtl: 10 * 60 * 1000 }); // 10 minutes
   */
  updateConfig(config: Partial<ToolsServiceConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Gets a cached tool entry by key.
   */
  private getCachedTool(toolKey: string): ToolCacheEntry | null {
    const cache = this.toolsCache();
    return cache.get(toolKey) || null;
  }

  /**
   * Checks if a cache entry is still valid (not expired).
   */
  private isCacheEntryValid(entry: ToolCacheEntry): boolean {
    const now = Date.now();
    return now - entry.cachedAt < entry.ttl;
  }

  /**
   * Fetches a specific tool from the API and updates cache.
   */
  private fetchToolFromApi(toolKey: string): Observable<Tool | null> {
    return this.apiClient.get<ToolsApiResponse<PublicToolsResponse>>('/tools').pipe(
      map((response: ToolsApiResponse<PublicToolsResponse>) => {
        const tools = response.data.tools;
        const tool = tools.find((t: Tool) => t.key === toolKey);

        if (tool) {
          this.cacheToolEntry(tool);
        }

        return tool || null;
      }),
      catchError((error: unknown) => {
        // Try to return cached data even if expired as last resort
        const cached = this.getCachedTool(toolKey);
        if (cached) {
          // eslint-disable-next-line no-console
          console.warn(`API failed for tool ${toolKey}, using stale cache`);
          return new Observable<Tool | null>((observer) => {
            observer.next(cached.tool);
            observer.complete();
          });
        }

        return throwError(() => error);
      }),
    );
  }

  /**
   * Updates the cache with multiple tools.
   */
  private updateCache(tools: Tool[]): void {
    const cache = new Map(this.toolsCache());

    tools.forEach((tool) => {
      cache.set(tool.key, {
        tool,
        cachedAt: Date.now(),
        ttl: this.config.cacheTtl,
      });
    });

    this.toolsCache.set(cache);
  }

  /**
   * Caches a single tool entry.
   */
  private cacheToolEntry(tool: Tool): void {
    const cache = new Map(this.toolsCache());
    cache.set(tool.key, {
      tool,
      cachedAt: Date.now(),
      ttl: this.config.cacheTtl,
    });
    this.toolsCache.set(cache);
  }

  /**
   * Initializes polling for tool status updates.
   * Uses configurable interval to check for changes.
   */
  private initializePolling(): void {
    // Only start polling if service is actually being used
    timer(0, this.config.pollingInterval)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          // Only poll if we have cached data or are explicitly requested
          if (this.toolsCache().size === 0) {
            return EMPTY;
          }

          return this.refreshAllTools().pipe(
            catchError(() => EMPTY), // Silent polling failures
          );
        }),
      )
      .subscribe();
  }
}
