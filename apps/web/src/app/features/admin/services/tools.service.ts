import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap, retry } from 'rxjs/operators';
import { ApiClientService } from '@core/api/api-client.service';
import {
  Tool,
  GetToolsResponse,
  UpdateToolStatusRequest,
  UpdateToolStatusResponse,
  CreateToolRequest,
} from '@nodeangularfullstack/shared';

/**
 * Error interface for tools API responses.
 */
export interface ToolsApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any[];
  };
  timestamp: string;
}

/**
 * Success interface for tools API responses.
 */
export interface ToolsApiResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * Tools service for managing tools registry operations.
 * Handles tools CRUD operations with caching, optimistic updates, and error handling.
 */
@Injectable({ providedIn: 'root' })
export class ToolsService {
  private readonly apiClient = inject(ApiClientService);

  // State signals for reactive management
  private readonly toolsSignal = signal<Tool[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly cacheTimestamp = signal<number>(0);

  // Cache configuration
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly BASE_URL = '/admin/tools';

  // Public computed properties
  public readonly tools = computed(() => this.toolsSignal());
  public readonly loading = computed(() => this.loadingSignal());
  public readonly error = computed(() => this.errorSignal());
  public readonly hasTools = computed(() => this.toolsSignal().length > 0);
  public readonly activeTools = computed(() => this.toolsSignal().filter((tool) => tool.active));
  public readonly inactiveTools = computed(() => this.toolsSignal().filter((tool) => !tool.active));

  /**
   * Checks if cached data is still valid.
   */
  private isCacheValid(): boolean {
    const now = Date.now();
    return now - this.cacheTimestamp() < this.CACHE_DURATION;
  }

  /**
   * Retrieves all tools from the API with caching support.
   * Uses ETag headers for efficient cache validation.
   * @param forceRefresh - Optional flag to bypass cache
   * @returns Observable of tools array
   * @example
   * toolsService.getTools().subscribe(tools => {
   *   console.log(`Loaded ${tools.length} tools`);
   * });
   */
  getTools(forceRefresh = false): Observable<Tool[]> {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && this.hasTools() && this.isCacheValid()) {
      return new BehaviorSubject(this.tools()).asObservable();
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.apiClient.get<ToolsApiResponse<{ tools: Tool[] }>>(this.BASE_URL).pipe(
      retry(2), // Retry up to 2 times on failure
      map((response) => {
        if (!response.success) {
          throw new Error('Failed to retrieve tools');
        }
        return response.data.tools;
      }),
      tap((tools) => {
        this.toolsSignal.set(tools);
        this.cacheTimestamp.set(Date.now());
        this.loadingSignal.set(false);
      }),
      catchError((error) => {
        console.error('Error fetching tools:', error);
        this.loadingSignal.set(false);
        this.errorSignal.set(error.error?.error?.message || 'Failed to load tools');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Retrieves only active tools from the API.
   * @returns Observable of active tools array
   * @example
   * toolsService.getActiveTools().subscribe(tools => {
   *   console.log(`Found ${tools.length} active tools`);
   * });
   */
  getActiveTools(): Observable<Tool[]> {
    return this.apiClient.get<ToolsApiResponse<{ tools: Tool[] }>>(`${this.BASE_URL}/active`).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error('Failed to retrieve active tools');
        }
        return response.data.tools;
      }),
      catchError((error) => {
        console.error('Error fetching active tools:', error);
        const message = error.error?.error?.message || 'Failed to load active tools';
        this.errorSignal.set(message);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Finds a specific tool by its key.
   * @param key - Tool key to search for
   * @returns Observable of tool or null if not found
   * @example
   * toolsService.getToolByKey('short-link').subscribe(tool => {
   *   if (tool) console.log(`Found tool: ${tool.name}`);
   * });
   */
  getToolByKey(key: string): Observable<Tool | null> {
    return this.apiClient.get<ToolsApiResponse<{ tool: Tool }>>(`${this.BASE_URL}/${key}`).pipe(
      map((response) => {
        if (!response.success) {
          return null;
        }
        return response.data.tool;
      }),
      catchError((error) => {
        if (error.status === 404) {
          return new BehaviorSubject(null).asObservable();
        }
        console.error('Error fetching tool by key:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Updates a tool's status (enable/disable) with optimistic updates.
   * @param key - Tool key to update
   * @param active - New active status
   * @returns Observable of updated tool
   * @example
   * toolsService.updateToolStatus('short-link', false).subscribe({
   *   next: (tool) => console.log(`Tool ${tool.name} is now disabled`),
   *   error: (error) => console.error('Update failed:', error)
   * });
   */
  updateToolStatus(key: string, active: boolean): Observable<Tool> {
    // Optimistic update - update UI immediately
    const currentTools = this.tools();
    const toolIndex = currentTools.findIndex((tool) => tool.key === key);

    if (toolIndex >= 0) {
      const updatedTools = [...currentTools];
      updatedTools[toolIndex] = {
        ...updatedTools[toolIndex],
        active,
        updatedAt: new Date(),
      };
      this.toolsSignal.set(updatedTools);
    }

    const request: UpdateToolStatusRequest = { active };

    return this.apiClient.patch<UpdateToolStatusResponse>(`${this.BASE_URL}/${key}`, request).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error('Failed to update tool status');
        }
        return response.data.tool;
      }),
      tap((updatedTool) => {
        // Update the tool in our cached data with the server response
        const tools = this.tools();
        const index = tools.findIndex((tool) => tool.key === key);
        if (index >= 0) {
          const newTools = [...tools];
          newTools[index] = updatedTool;
          this.toolsSignal.set(newTools);
        }
        this.errorSignal.set(null);
      }),
      catchError((error) => {
        // Rollback optimistic update on error
        this.getTools(true).subscribe(); // Force refresh to restore correct state

        console.error('Error updating tool status:', error);
        const message = error.error?.error?.message || 'Failed to update tool status';
        this.errorSignal.set(message);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Creates a new tool in the registry.
   * @param request - Tool creation data
   * @returns Observable of created tool
   * @example
   * const newTool = {
   *   key: 'new-tool',
   *   name: 'New Tool',
   *   description: 'A new tool for the system',
   *   active: true
   * };
   * toolsService.createTool(newTool).subscribe(tool => {
   *   console.log(`Created tool: ${tool.name}`);
   * });
   */
  createTool(request: CreateToolRequest): Observable<Tool> {
    return this.apiClient.post<UpdateToolStatusResponse>(this.BASE_URL, request).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error('Failed to create tool');
        }
        return response.data.tool;
      }),
      tap((newTool) => {
        // Add the new tool to our cached data
        const currentTools = this.tools();
        this.toolsSignal.set([...currentTools, newTool]);
        this.errorSignal.set(null);
      }),
      catchError((error) => {
        console.error('Error creating tool:', error);
        const message = error.error?.error?.message || 'Failed to create tool';
        this.errorSignal.set(message);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Deletes a tool from the registry.
   * @param key - Tool key to delete
   * @returns Observable that completes when deletion is successful
   * @example
   * toolsService.deleteTool('obsolete-tool').subscribe({
   *   next: () => console.log('Tool deleted successfully'),
   *   error: (error) => console.error('Deletion failed:', error)
   * });
   */
  deleteTool(key: string): Observable<void> {
    // Optimistic update - remove from UI immediately
    const currentTools = this.tools();
    const filteredTools = currentTools.filter((tool) => tool.key !== key);
    this.toolsSignal.set(filteredTools);

    return this.apiClient
      .delete<{ success: boolean; message: string }>(`${this.BASE_URL}/${key}`)
      .pipe(
        map((response) => {
          if (!response.success) {
            throw new Error('Failed to delete tool');
          }
          // Return void for successful deletion
        }),
        tap(() => {
          this.errorSignal.set(null);
        }),
        catchError((error) => {
          // Rollback optimistic update on error
          this.getTools(true).subscribe(); // Force refresh to restore correct state

          console.error('Error deleting tool:', error);
          const message = error.error?.error?.message || 'Failed to delete tool';
          this.errorSignal.set(message);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Clears any cached data and forces a fresh reload on next request.
   * Useful for ensuring data consistency after external changes.
   * @example
   * toolsService.clearCache();
   * toolsService.getTools().subscribe(); // Will fetch fresh data
   */
  clearCache(): void {
    this.cacheTimestamp.set(0);
  }

  /**
   * Clears any error state.
   * Useful for manually dismissing error messages in the UI.
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Gets the current error message if any.
   * @returns Current error message or null
   */
  getCurrentError(): string | null {
    return this.error();
  }

  /**
   * Validates if a tool key is unique and available.
   * @param key - Tool key to validate
   * @returns Observable indicating if key is available (true) or taken (false)
   * @example
   * toolsService.validateToolKey('new-tool').subscribe(isAvailable => {
   *   if (isAvailable) console.log('Key is available');
   * });
   */
  validateToolKey(key: string): Observable<boolean> {
    return this.apiClient
      .get<{ success: boolean; available: boolean }>(`${this.BASE_URL}/validate-key/${key}`)
      .pipe(
        map((response) => {
          return response.success && response.available;
        }),
        catchError((error) => {
          console.error('Error validating tool key:', error);
          // If validation fails, assume key is taken to be safe
          return new BehaviorSubject(false).asObservable();
        }),
      );
  }

  /**
   * Refreshes the tools data by clearing cache and fetching fresh data.
   * @returns Observable of updated tools array
   * @example
   * toolsService.refresh().subscribe(tools => {
   *   console.log(`Refreshed ${tools.length} tools`);
   * });
   */
  refresh(): Observable<Tool[]> {
    this.clearCache();
    return this.getTools(true);
  }
}
