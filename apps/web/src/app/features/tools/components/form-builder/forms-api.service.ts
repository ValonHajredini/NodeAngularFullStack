import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiClientService } from '@core/api/api-client.service';
import {
  FormMetadata,
  FormSchema,
  FormSubmission,
  ApiResponse,
  PaginatedResponse,
} from '@nodeangularfullstack/shared';

/**
 * API service for form management operations.
 * Handles CRUD operations for form drafts and published forms.
 */
@Injectable({ providedIn: 'root' })
export class FormsApiService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Creates a new form draft.
   * @param formData - Partial form metadata to create
   * @returns Observable containing the created form
   * @throws {HttpErrorResponse} When creation fails
   * @example
   * formsApiService.createForm({ title: 'New Form', schema: {...} })
   *   .subscribe(form => console.log('Form created:', form));
   */
  createForm(formData: Partial<FormMetadata>): Observable<FormMetadata> {
    return this.apiClient.post<ApiResponse<FormMetadata>>('/forms', formData).pipe(
      map((response) => this.convertDates(response.data!)),
      catchError((error) => throwError(() => error)),
    );
  }

  /**
   * Updates an existing form.
   * @param id - Form ID to update
   * @param formData - Partial form metadata to update
   * @returns Observable containing the updated form
   * @throws {HttpErrorResponse} When update fails
   * @example
   * formsApiService.updateForm('form-123', { title: 'Updated Title' })
   *   .subscribe(form => console.log('Form updated:', form));
   */
  updateForm(id: string, formData: Partial<FormMetadata>): Observable<FormMetadata> {
    return this.apiClient.put<ApiResponse<FormMetadata>>(`/forms/${id}`, formData).pipe(
      map((response) => this.convertDates(response.data!)),
      catchError((error) => throwError(() => error)),
    );
  }

  /**
   * Retrieves a paginated list of user's forms.
   * @param page - Page number (1-indexed)
   * @param limit - Number of items per page
   * @returns Observable containing paginated forms
   * @example
   * formsApiService.getForms(1, 20)
   *   .subscribe(response => console.log('Forms:', response.data));
   */
  getForms(page = 1, limit = 20): Observable<PaginatedResponse<FormMetadata>> {
    return this.apiClient
      .get<PaginatedResponse<FormMetadata>>('/forms', {
        params: {
          page: page.toString(),
          limit: limit.toString(),
        },
      })
      .pipe(
        map((response) => ({
          ...response,
          data: response.data?.map((form) => this.convertDates(form)) || [],
        })),
        catchError((error) => throwError(() => error)),
      );
  }

  /**
   * Retrieves a single form by ID.
   * @param id - Form ID to retrieve
   * @returns Observable containing the form
   * @throws {HttpErrorResponse} When form not found or access denied
   * @example
   * formsApiService.getFormById('form-123')
   *   .subscribe(form => console.log('Form:', form));
   */
  getFormById(id: string): Observable<FormMetadata> {
    return this.apiClient.get<ApiResponse<FormMetadata>>(`/forms/${id}`).pipe(
      map((response) => this.convertDates(response.data!)),
      catchError((error) => throwError(() => error)),
    );
  }

  /**
   * Deletes a form by ID.
   * @param id - Form ID to delete
   * @returns Observable that completes on success
   * @throws {HttpErrorResponse} When deletion fails
   * @example
   * formsApiService.deleteForm('form-123')
   *   .subscribe(() => console.log('Form deleted'));
   */
  deleteForm(id: string): Observable<void> {
    return this.apiClient
      .delete<void>(`/forms/${id}`)
      .pipe(catchError((error) => throwError(() => error)));
  }

  /**
   * Publishes a form and generates a render token.
   * @param formId - Form ID to publish
   * @param expiresAt - Token expiration date
   * @returns Observable containing form, schema, and render URL
   * @throws {HttpErrorResponse} When publish fails or validation errors
   * @example
   * formsApiService.publishForm('form-123', new Date('2025-12-31'))
   *   .subscribe(result => console.log('Render URL:', result.renderUrl));
   */
  publishForm(
    formId: string,
    expiresAt: Date,
  ): Observable<{ form: FormMetadata; schema: FormSchema; renderUrl: string }> {
    // Calculate days until expiration
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const expiresInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return this.apiClient
      .post<ApiResponse<{ form: FormMetadata; schema: FormSchema; renderUrl: string }>>(
        `/forms/${formId}/publish`,
        {
          expiresInDays,
        },
      )
      .pipe(
        map((response) => ({
          form: this.convertDates(response.data!.form),
          schema: this.convertSchemaDate(response.data!.schema),
          renderUrl: response.data!.renderUrl,
        })),
        catchError((error) => throwError(() => error)),
      );
  }

  /**
   * Unpublishes a form and invalidates the render token.
   * @param formId - Form ID to unpublish
   * @returns Observable containing the unpublished form
   * @throws {HttpErrorResponse} When unpublish fails
   * @example
   * formsApiService.unpublishForm('form-123')
   *   .subscribe(form => console.log('Form unpublished:', form));
   */
  unpublishForm(formId: string): Observable<FormMetadata> {
    return this.apiClient.post<ApiResponse<FormMetadata>>(`/forms/${formId}/unpublish`, {}).pipe(
      map((response) => this.convertDates(response.data!)),
      catchError((error) => throwError(() => error)),
    );
  }

  /**
   * Converts date strings to Date objects for proper typing.
   * @param form - Form metadata with string dates
   * @returns Form metadata with Date objects
   */
  private convertDates(form: FormMetadata): FormMetadata {
    return {
      ...form,
      createdAt: new Date(form.createdAt),
      updatedAt: new Date(form.updatedAt),
      schema: form.schema ? this.convertSchemaDate(form.schema) : undefined,
    };
  }

  /**
   * Retrieves submissions for a specific form.
   * @param formId - Form ID to get submissions for
   * @param page - Page number (1-indexed)
   * @param limit - Number of items per page
   * @returns Observable containing paginated submissions
   * @throws {HttpErrorResponse} When retrieval fails or access denied
   * @example
   * formsApiService.getSubmissions('form-123', 1, 50)
   *   .subscribe(response => console.log('Submissions:', response.data));
   */
  getSubmissions(
    formId: string,
    page = 1,
    limit = 50,
  ): Observable<PaginatedResponse<FormSubmission>> {
    return this.apiClient
      .get<PaginatedResponse<FormSubmission>>(`/forms/${formId}/submissions`, {
        params: {
          page: page.toString(),
          limit: limit.toString(),
        },
      })
      .pipe(
        map((response) => ({
          ...response,
          data: response.data?.map((submission) => this.convertSubmissionDates(submission)) || [],
        })),
        catchError((error) => throwError(() => error)),
      );
  }

  /**
   * Exports form submissions as CSV with optional filtering.
   * @param formId - Form ID to export submissions for
   * @param params - Export parameters (fields, dateFrom, dateTo, filterField, filterValue)
   * @returns Observable containing CSV file as Blob
   * @throws {HttpErrorResponse} When export fails or access denied
   * @example
   * formsApiService.exportSubmissions('form-123', {
   *   fields: 'name,email',
   *   dateFrom: '2024-01-01',
   *   dateTo: '2024-12-31'
   * }).subscribe(blob => {
   *   const url = window.URL.createObjectURL(blob);
   *   const a = document.createElement('a');
   *   a.href = url;
   *   a.download = 'submissions.csv';
   *   a.click();
   * });
   */
  exportSubmissions(formId: string, params?: Record<string, string>): Observable<Blob> {
    return this.apiClient.get(`/forms/${formId}/submissions/export`, {
      params,
      responseType: 'blob',
    });
  }

  /**
   * Converts schema date strings to Date objects.
   * @param schema - Form schema with string dates
   * @returns Form schema with Date objects
   */
  private convertSchemaDate(schema: FormSchema): FormSchema {
    return {
      ...schema,
      createdAt: new Date(schema.createdAt),
      updatedAt: new Date(schema.updatedAt),
      expiresAt: schema.expiresAt ? new Date(schema.expiresAt) : undefined,
    };
  }

  /**
   * Converts submission date strings to Date objects.
   * @param submission - Form submission with string dates
   * @returns Form submission with Date objects
   */
  private convertSubmissionDates(submission: FormSubmission): FormSubmission {
    return {
      ...submission,
      submittedAt: new Date(submission.submittedAt),
    };
  }
}
