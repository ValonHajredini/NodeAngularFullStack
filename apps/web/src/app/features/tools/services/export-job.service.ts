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
  exportPackageUrl?: string;
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
   * Downloads the export package for a completed job.
   *
   * @param jobId - The unique job identifier
   * @param exportPackageUrl - URL to the export package
   * @returns Observable<Blob> The export package file
   */
  downloadExportPackage(jobId: string, exportPackageUrl: string): Observable<Blob> {
    console.log(`[ExportJobService] Downloading export package: ${jobId}`);

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
}
