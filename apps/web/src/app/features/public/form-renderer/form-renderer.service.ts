import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FormSchema, FormSettings } from '@nodeangularfullstack/shared';
import { environment } from '@env/environment';

/**
 * API response structure for form schema retrieval
 */
interface FormSchemaResponse {
  success: boolean;
  message: string;
  data: {
    schema: FormSchema;
    settings: FormSettings;
  };
  timestamp: string;
}

/**
 * API response structure for form submission
 */
interface FormSubmissionResponse {
  success: boolean;
  message: string;
  data: {
    submissionId: string;
    message?: string;
  };
  timestamp: string;
}

/**
 * Error types for form rendering
 */
export enum FormRenderErrorType {
  NOT_FOUND = 'NOT_FOUND',
  EXPIRED = 'EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  RATE_LIMITED = 'RATE_LIMITED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SUBMISSION_ERROR = 'SUBMISSION_ERROR',
  FORM_NOT_FOUND = 'FORM_NOT_FOUND',
  PARSE_ERROR = 'PARSE_ERROR',
}

/**
 * Form render error with type information
 */
export class FormRenderError extends Error {
  constructor(
    public type: FormRenderErrorType,
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'FormRenderError';
  }
}

/**
 * Service for fetching form schemas for public rendering.
 * Handles token validation and error scenarios for public form access.
 */
@Injectable({
  providedIn: 'root',
})
export class FormRendererService {
  private readonly renderApiUrl = `${environment.apiUrl}/public/forms/render`;
  private readonly submitApiUrl = `${environment.apiUrl}/public/forms/submit`;

  constructor(private http: HttpClient) {}

  /**
   * Retrieves form schema using a JWT render token.
   * @param token - JWT token for form access
   * @returns Observable with form schema and settings
   * @throws {FormRenderError} Various error types based on failure reason
   * @example
   * formRendererService.getFormSchema(token).subscribe({
   *   next: (result) => console.log('Schema:', result.schema),
   *   error: (err) => console.error('Error:', err.type, err.message)
   * });
   */
  getFormSchema(token: string): Observable<{ schema: FormSchema; settings: FormSettings }> {
    const url = `${this.renderApiUrl}/${token}`;
    console.log('FormRendererService: Fetching form schema from:', url);
    return this.http.get<FormSchemaResponse>(url).pipe(
      map((response) => {
        console.log('FormRendererService: Successfully received schema:', response);
        return response.data;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('FormRendererService: Error fetching schema:', error);
        return throwError(() => this.handleError(error));
      }),
    );
  }

  /**
   * Submits form data using a JWT render token.
   * @param token - JWT token for form access
   * @param values - Form field values to submit
   * @param metadata - Optional submission metadata (e.g., step navigation events for analytics)
   * @returns Observable with submission result
   * @throws {FormRenderError} Various error types based on failure reason
   * @example
   * formRendererService.submitForm(token, { name: 'John', email: 'john@example.com' }).subscribe({
   *   next: (result) => console.log('Submission ID:', result.submissionId),
   *   error: (err) => console.error('Error:', err.type, err.message)
   * });
   */
  submitForm(
    token: string,
    values: Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ): Observable<{ submissionId: string; message?: string }> {
    const payload: any = { values };
    if (metadata) {
      payload.metadata = metadata;
    }

    return this.http.post<FormSubmissionResponse>(`${this.submitApiUrl}/${token}`, payload).pipe(
      map((response) => response.data),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => this.handleSubmitError(error));
      }),
    );
  }

  /**
   * Maps HTTP errors to user-friendly FormRenderError instances.
   * @param error - HTTP error response
   * @returns FormRenderError with appropriate type and message
   */
  private handleError(error: HttpErrorResponse): FormRenderError {
    // Network or client-side error
    if (error.error instanceof ErrorEvent) {
      return new FormRenderError(
        FormRenderErrorType.NETWORK_ERROR,
        'Network error occurred. Please check your connection.',
        0,
      );
    }

    // Server-side error
    switch (error.status) {
      case 404:
        return new FormRenderError(
          FormRenderErrorType.NOT_FOUND,
          error.error?.message || 'Form not found',
          404,
        );

      case 410:
        return new FormRenderError(
          FormRenderErrorType.EXPIRED,
          error.error?.message || 'This form has expired',
          410,
        );

      case 429:
        return new FormRenderError(
          FormRenderErrorType.RATE_LIMITED,
          'Too many requests. Please try again later.',
          429,
        );

      default:
        if (error.error?.message?.includes('Invalid')) {
          return new FormRenderError(
            FormRenderErrorType.INVALID_TOKEN,
            'Invalid form link',
            error.status,
          );
        }

        return new FormRenderError(
          FormRenderErrorType.NETWORK_ERROR,
          'An unexpected error occurred. Please try again later.',
          error.status,
        );
    }
  }

  /**
   * Maps HTTP submission errors to user-friendly FormRenderError instances.
   * @param error - HTTP error response
   * @returns FormRenderError with appropriate type and message
   */
  private handleSubmitError(error: HttpErrorResponse): FormRenderError {
    // Network or client-side error
    if (error.error instanceof ErrorEvent) {
      return new FormRenderError(
        FormRenderErrorType.NETWORK_ERROR,
        'Network error occurred. Please check your connection.',
        0,
      );
    }

    // Server-side error
    switch (error.status) {
      case 400:
        return new FormRenderError(
          FormRenderErrorType.VALIDATION_ERROR,
          error.error?.message || 'Validation failed. Please check your input.',
          400,
        );

      case 404:
        return new FormRenderError(
          FormRenderErrorType.NOT_FOUND,
          error.error?.message || 'Form not found',
          404,
        );

      case 410:
        return new FormRenderError(
          FormRenderErrorType.EXPIRED,
          error.error?.message || 'This form has expired',
          410,
        );

      case 429:
        return new FormRenderError(
          FormRenderErrorType.RATE_LIMITED,
          error.error?.message || 'Too many submissions. Please try again later.',
          429,
        );

      default:
        return new FormRenderError(
          FormRenderErrorType.SUBMISSION_ERROR,
          error.error?.message || 'Submission failed. Please try again.',
          error.status,
        );
    }
  }
}
