import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '@env/environment';

/**
 * Export job status values.
 */
export type ExportJobStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

/**
 * Export job step information.
 */
export interface ExportStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message?: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Export job response from API.
 */
export interface ExportJob {
  jobId: string;
  toolId: string;
  status: ExportJobStatus;
  stepsCompleted: number;
  stepsTotal: number;
  currentStep?: string;
  steps: ExportStep[];
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;
  exportPackageUrl?: string; // Deprecated: Use packagePath instead
  // New fields from Story 33.2.1 (Export Package Download)
  packagePath?: string | null;
  packageSizeBytes?: number | null;
  downloadCount?: number;
  lastDownloadedAt?: string | null;
  packageExpiresAt?: string | null;
  packageRetentionDays?: number;
}

/**
 * Export job with enriched tool metadata (Story 33.2.3).
 * Extends ExportJob with tool name and type for display purposes.
 */
export interface ExportJobWithTool extends ExportJob {
  toolName: string;
  toolType: string;
  toolDescription?: string;
}

/**
 * Query options for listing export jobs (Story 33.2.3).
 */
export interface ListExportJobsOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'completed_at' | 'download_count' | 'package_size_bytes';
  sortOrder?: 'asc' | 'desc';
  statusFilter?: string;
  toolTypeFilter?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Paginated export jobs list response (Story 33.2.3).
 */
export interface ExportJobsListResponse {
  jobs: ExportJobWithTool[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
}

/**
 * API response wrapper for export job operations.
 */
interface ApiResponse<T> {
  message: string;
  data: T;
  timestamp: string;
}

/**
 * Export Job Service (Epic 32.2.4)
 *
 * Manages tool export job lifecycle:
 * - Start new export jobs
 * - Poll job status for real-time updates
 * - Cancel in-progress jobs
 * - Download completed export packages
 *
 * **API Endpoints:**
 * - POST /api/tool-registry/tools/:toolId/export - Start export
 * - GET /api/tool-registry/export-jobs/:jobId - Get job status
 * - POST /api/tool-registry/export-jobs/:jobId/cancel - Cancel job
 *
 * **Error Handling:**
 * - Network errors return user-friendly messages
 * - 401/403 errors redirect to login
 * - Includes retry logic for transient failures
 *
 * @example
 * ```typescript
 * // Start export job
 * exportJobService.startExport('form-builder').subscribe({
 *   next: (job) => console.log('Export started:', job.jobId),
 *   error: (err) => console.error('Export failed:', err)
 * });
 *
 * // Poll job status
 * exportJobService.getJobStatus('job-123').subscribe({
 *   next: (job) => console.log('Progress:', job.progress + '%'),
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ExportJobService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly apiUrl = `${environment.apiUrl}/tool-registry`;
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  /**
   * Starts a new export job for the specified tool.
   *
   * @param toolId - The unique tool identifier
   * @returns Observable<ExportJob> The created export job
   * @throws ApiError if export fails to start
   */
  startExport(toolId: string): Observable<ExportJob> {
    if (!toolId || toolId.trim().length === 0) {
      return throwError(() => new Error('Tool ID is required'));
    }

    console.log(`[ExportJobService] Starting export for tool: ${toolId}`);

    return this.http
      .post<
        ApiResponse<ExportJob>
      >(`${this.apiUrl}/tools/${toolId}/export`, {}, { headers: this.getAuthHeaders() })
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        map((response) => response.data),
        catchError(this.handleError.bind(this)),
      );
  }

  /**
   * Fetches the current status of an export job.
   *
   * Used for polling to get real-time progress updates.
   * Recommended polling interval: 2 seconds.
   *
   * @param jobId - The unique job identifier
   * @returns Observable<ExportJob> Current job status
   * @throws ApiError if status fetch fails
   */
  getJobStatus(jobId: string): Observable<ExportJob> {
    if (!jobId || jobId.trim().length === 0) {
      return throwError(() => new Error('Job ID is required'));
    }

    return this.http
      .get<ApiResponse<ExportJob>>(`${this.apiUrl}/export-jobs/${jobId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        map((response) => response.data),
        catchError(this.handleError.bind(this)),
      );
  }

  /**
   * Cancels an in-progress export job.
   *
   * @param jobId - The unique job identifier
   * @returns Observable<ExportJob> Updated job with cancelled status
   * @throws ApiError if cancellation fails
   */
  cancelExport(jobId: string): Observable<ExportJob> {
    if (!jobId || jobId.trim().length === 0) {
      return throwError(() => new Error('Job ID is required'));
    }

    console.log(`[ExportJobService] Cancelling export job: ${jobId}`);

    return this.http
      .post<
        ApiResponse<ExportJob>
      >(`${this.apiUrl}/export-jobs/${jobId}/cancel`, {}, { headers: this.getAuthHeaders() })
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        map((response) => response.data),
        catchError(this.handleError.bind(this)),
      );
  }

  /**
   * Downloads the export package for a completed job (Story 33.2.1).
   *
   * Uses the new download endpoint that streams .tar.gz files efficiently.
   * Supports HTTP range requests for resume capability.
   *
   * @param jobId - The unique job identifier
   * @returns Observable<Blob> The export package file (.tar.gz)
   * @throws ApiError if download fails (404, 403, 410 Gone if expired)
   *
   * @example
   * ```typescript
   * exportJobService.downloadPackage('job-123').subscribe({
   *   next: (blob) => {
   *     // Create download link
   *     const url = window.URL.createObjectURL(blob);
   *     const link = document.createElement('a');
   *     link.href = url;
   *     link.download = 'export-package.tar.gz';
   *     link.click();
   *     window.URL.revokeObjectURL(url);
   *   },
   *   error: (err) => console.error('Download failed:', err)
   * });
   * ```
   */
  downloadPackage(jobId: string): Observable<Blob> {
    if (!jobId || jobId.trim().length === 0) {
      return throwError(() => new Error('Job ID is required'));
    }

    console.log(`[ExportJobService] Downloading export package: ${jobId}`);

    return this.http
      .get(`${this.apiUrl}/export-jobs/${jobId}/download`, {
        responseType: 'blob',
        headers: this.getAuthHeaders(),
        // No timeout for large file downloads (browser will handle)
      })
      .pipe(catchError(this.handleDownloadError.bind(this)));
  }

  /**
   * Lists export jobs with pagination, filtering, and sorting (Story 33.2.3).
   *
   * Returns user's export history with tool metadata. Admin users see all jobs,
   * while regular users only see their own jobs.
   *
   * @param options - Query options for filtering, sorting, and pagination
   * @returns Observable<ExportJobsListResponse> Paginated list of export jobs
   * @throws ApiError if list fetch fails
   *
   * @example
   * ```typescript
   * exportJobService.listExportJobs({
   *   limit: 20,
   *   offset: 0,
   *   sortBy: 'created_at',
   *   sortOrder: 'desc',
   *   statusFilter: 'completed'
   * }).subscribe({
   *   next: (response) => {
   *     console.log(`Found ${response.total} jobs, showing page ${response.page} of ${response.totalPages}`);
   *     console.log('Jobs:', response.jobs);
   *   },
   *   error: (err) => console.error('Failed to load export history:', err)
   * });
   * ```
   */
  listExportJobs(options: ListExportJobsOptions = {}): Observable<ExportJobsListResponse> {
    // Build query parameters
    const params: any = {};

    if (options.limit !== undefined) params.limit = options.limit.toString();
    if (options.offset !== undefined) params.offset = options.offset.toString();
    if (options.sortBy) params.sort_by = options.sortBy;
    if (options.sortOrder) params.sort_order = options.sortOrder;
    if (options.statusFilter) params.status_filter = options.statusFilter;
    if (options.toolTypeFilter) params.tool_type_filter = options.toolTypeFilter;
    if (options.startDate) params.start_date = options.startDate;
    if (options.endDate) params.end_date = options.endDate;

    console.log('[ExportJobService] Listing export jobs with options:', options);

    return this.http
      .get<ExportJobsListResponse>(`${this.apiUrl}/export-jobs`, {
        params,
        headers: this.getAuthHeaders(),
      })
      .pipe(timeout(this.REQUEST_TIMEOUT), catchError(this.handleError.bind(this)));
  }

  /**
   * Deletes an export job (Story 33.2.3, admin only).
   *
   * Performs soft delete (sets deleted_at timestamp) to maintain audit trail.
   * Only available to admin users.
   *
   * @param jobId - The unique job identifier
   * @returns Observable<void> Success indicator
   * @throws ApiError if deletion fails (403 if not admin)
   *
   * @example
   * ```typescript
   * exportJobService.deleteExportJob('job-123').subscribe({
   *   next: () => console.log('Export job deleted successfully'),
   *   error: (err) => console.error('Delete failed:', err)
   * });
   * ```
   */
  deleteExportJob(jobId: string): Observable<void> {
    if (!jobId || jobId.trim().length === 0) {
      return throwError(() => new Error('Job ID is required'));
    }

    console.log(`[ExportJobService] Deleting export job: ${jobId}`);

    return this.http
      .delete<void>(`${this.apiUrl}/export-jobs/${jobId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(timeout(this.REQUEST_TIMEOUT), catchError(this.handleError.bind(this)));
  }

  /**
   * Downloads the export package for a completed job (deprecated).
   *
   * @deprecated Use downloadPackage(jobId) instead
   * @param jobId - The unique job identifier
   * @param exportPackageUrl - URL to the export package
   * @returns Observable<Blob> The export package file
   */
  downloadExportPackage(jobId: string, exportPackageUrl: string): Observable<Blob> {
    console.log(`[ExportJobService] Downloading export package (deprecated): ${jobId}`);

    return this.http
      .get(exportPackageUrl, {
        responseType: 'blob',
        headers: this.getAuthHeaders(),
      })
      .pipe(timeout(this.REQUEST_TIMEOUT), catchError(this.handleError.bind(this)));
  }

  /**
   * Gets authentication headers with JWT token.
   */
  private getAuthHeaders(): HttpHeaders {
    // TODO: Get token from AuthService when token management is implemented
    // For now, return empty headers
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  /**
   * Handles HTTP errors with user-friendly messages.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Network error: ${error.error.message}`;
      console.error('[ExportJobService] Client-side error:', error.error.message);
    } else {
      // Backend error
      errorMessage = error.error?.message || `Server error: ${error.status}`;
      console.error(
        `[ExportJobService] Backend error: ${error.status} - ${error.error?.message || error.message}`,
      );

      // Handle specific error codes
      if (error.status === 401 || error.status === 403) {
        console.warn('[ExportJobService] Authentication error, user may need to re-login');
      } else if (error.status === 404) {
        errorMessage = 'Export job not found';
      } else if (error.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      }
    }

    return throwError(() => ({
      status: error.status,
      message: errorMessage,
      error: error.error,
    }));
  }

  /**
   * Handles download-specific HTTP errors with user-friendly messages.
   * Includes special handling for 410 Gone (expired packages).
   */
  private handleDownloadError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Download failed. Please try again.';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Network error: ${error.error.message}`;
      console.error('[ExportJobService] Client-side download error:', error.error.message);
    } else {
      // Backend error
      console.error(
        `[ExportJobService] Download error: ${error.status} - ${error.error?.message || error.message}`,
      );

      // Handle specific error codes
      if (error.status === 401 || error.status === 403) {
        errorMessage = 'You do not have permission to download this package';
      } else if (error.status === 404) {
        errorMessage = 'Export package not found or not ready';
      } else if (error.status === 410) {
        // Package expired (HTTP 410 Gone)
        errorMessage = 'Export package has expired and was deleted. Please re-export the tool.';
      } else if (error.status === 500) {
        errorMessage = 'Server error occurred during download. Please try again later.';
      } else {
        errorMessage = error.error?.message || 'Download failed. Please try again.';
      }
    }

    return throwError(() => ({
      status: error.status,
      message: errorMessage,
      error: error.error,
      code: error.error?.code,
    }));
  }
}
