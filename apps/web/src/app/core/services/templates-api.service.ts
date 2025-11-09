import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import {
  FormTemplate,
  UpdateFormTemplateRequest,
  CreateFormTemplateRequest,
} from '@nodeangularfullstack/shared';
import { environment } from '../../../environments/environment';

/**
 * Response wrapper for API endpoints
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Service for interacting with the Form Templates backend API.
 *
 * Provides methods for fetching, creating, updating, and deleting form templates.
 * Implements client-side caching with shareReplay() to minimize HTTP requests.
 *
 * **Caching Strategy:**
 * - getAllTemplates() results cached using shareReplay(1)
 * - Cache cleared on refreshCache() after mutations
 *
 * **Error Handling:**
 * - Network errors return user-friendly messages
 * - 401/403 errors handled gracefully
 * - All errors logged to console
 *
 * @example Basic Usage
 * ```typescript
 * constructor(private templatesApi: TemplatesApiService) {}
 *
 * ngOnInit() {
 *   this.templatesApi.getAllTemplates().subscribe({
 *     next: (templates) => console.log('Templates:', templates),
 *     error: (err) => console.error('Error:', err),
 *   });
 * }
 * ```
 *
 * @example Create Template
 * ```typescript
 * const newTemplate: CreateFormTemplateRequest = {
 *   name: 'My Template',
 *   category: TemplateCategory.ECOMMERCE,
 *   templateSchema: { fields: [], settings: {} }
 * };
 * this.templatesApi.createTemplate(newTemplate).subscribe({
 *   next: (template) => console.log('Created:', template),
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class TemplatesApiService {
  private readonly baseUrl = `${environment.formsApiUrl}/api/templates`;
  private cache$: Observable<FormTemplate[]> | null = null;

  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch all form templates from the API.
   * Results are cached to reduce unnecessary HTTP requests.
   *
   * @returns Observable array of FormTemplate objects
   * @throws {Error} Network or server errors
   *
   * @example
   * ```typescript
   * this.templatesApi.getAllTemplates().subscribe({
   *   next: (templates) => this.templates = templates,
   *   error: (err) => console.error('Failed to fetch templates:', err)
   * });
   * ```
   */
  getAllTemplates(): Observable<FormTemplate[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<ApiResponse<FormTemplate[]>>(this.baseUrl).pipe(
        map((response) => response.data),
        catchError(this.handleError),
        shareReplay(1),
      );
    }
    return this.cache$;
  }

  /**
   * Fetch a single template by ID.
   *
   * @param id - Template UUID
   * @returns Observable of FormTemplate
   * @throws {Error} Network or server errors, 404 if not found
   *
   * @example
   * ```typescript
   * this.templatesApi.getTemplateById('123-uuid').subscribe({
   *   next: (template) => console.log('Template:', template),
   *   error: (err) => console.error('Template not found:', err)
   * });
   * ```
   */
  getTemplateById(id: string): Observable<FormTemplate> {
    return this.http.get<ApiResponse<FormTemplate>>(`${this.baseUrl}/${id}`).pipe(
      map((response) => response.data),
      catchError(this.handleError),
    );
  }

  /**
   * Create a new form template.
   * Clears cache after successful creation.
   *
   * @param template - Template creation data
   * @returns Observable of created FormTemplate
   * @throws {Error} Validation errors or server errors
   *
   * @example
   * ```typescript
   * const newTemplate: CreateFormTemplateRequest = {
   *   name: 'Product Order Form',
   *   category: TemplateCategory.ECOMMERCE,
   *   templateSchema: { fields: [], settings: {} },
   *   description: 'A form for ordering products'
   * };
   * this.templatesApi.createTemplate(newTemplate).subscribe({
   *   next: (created) => console.log('Created template:', created),
   *   error: (err) => console.error('Creation failed:', err)
   * });
   * ```
   */
  createTemplate(template: CreateFormTemplateRequest): Observable<FormTemplate> {
    return this.http.post<ApiResponse<FormTemplate>>(this.baseUrl, template).pipe(
      map((response) => response.data),
      catchError(this.handleError),
      map((createdTemplate) => {
        this.refreshCache();
        return createdTemplate;
      }),
    );
  }

  /**
   * Update an existing form template.
   * Clears cache after successful update.
   *
   * @param id - Template UUID
   * @param updates - Partial template data to update
   * @returns Observable of updated FormTemplate
   * @throws {Error} Validation errors, 404 if not found
   *
   * @example
   * ```typescript
   * this.templatesApi.updateTemplate('123-uuid', {
   *   name: 'Updated Name',
   *   isActive: false
   * }).subscribe({
   *   next: (updated) => console.log('Updated template:', updated),
   *   error: (err) => console.error('Update failed:', err)
   * });
   * ```
   */
  updateTemplate(id: string, updates: UpdateFormTemplateRequest): Observable<FormTemplate> {
    return this.http.patch<ApiResponse<FormTemplate>>(`${this.baseUrl}/${id}`, updates).pipe(
      map((response) => response.data),
      catchError(this.handleError),
      map((updatedTemplate) => {
        this.refreshCache();
        return updatedTemplate;
      }),
    );
  }

  /**
   * Delete a form template (soft delete - sets isActive to false).
   * Clears cache after successful deletion.
   *
   * @param id - Template UUID
   * @returns Observable of void (no response body)
   * @throws {Error} 404 if not found, server errors
   *
   * @example
   * ```typescript
   * this.templatesApi.deleteTemplate('123-uuid').subscribe({
   *   next: () => console.log('Template deleted'),
   *   error: (err) => console.error('Deletion failed:', err)
   * });
   * ```
   */
  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => {
        this.refreshCache();
        return;
      }),
      catchError(this.handleError),
    );
  }

  /**
   * Clear the templates cache.
   * Forces the next getAllTemplates() call to fetch fresh data.
   *
   * Call this method after mutations (create, update, delete) or when
   * you need to ensure fresh data.
   *
   * @example
   * ```typescript
   * // After external changes
   * this.templatesApi.refreshCache();
   * this.templatesApi.getAllTemplates().subscribe(...);
   * ```
   */
  refreshCache(): void {
    this.cache$ = null;
  }

  /**
   * Centralized error handler for HTTP requests.
   * Logs errors and returns user-friendly error messages.
   *
   * @param error - HTTP error response
   * @returns Observable error with user-friendly message
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Network error: ${error.error.message}`;
    } else {
      // Backend error
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Invalid request data';
          break;
        case 401:
          errorMessage = 'Unauthorized. Please log in.';
          break;
        case 403:
          errorMessage = 'Forbidden. You do not have permission.';
          break;
        case 404:
          errorMessage = 'Template not found';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.error?.message || error.message}`;
      }
    }

    console.error('TemplatesApiService error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
