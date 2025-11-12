import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FormSchema,
  FormSettings,
  FormTheme,
  AvailableSlot,
  QuizResultMetadata,
} from '@nodeangularfullstack/shared';
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
    theme?: FormTheme | null;
  };
  timestamp: string;
}

/**
 * API response structure for form submission
 * Story 29.13: Includes optional metadata for quiz results
 */
interface FormSubmissionResponse {
  success: boolean;
  message: string;
  data: {
    submissionId: string;
    message?: string;
    metadata?: QuizResultMetadata;
  };
  timestamp: string;
}

/**
 * API response structure for available slots retrieval
 */
interface AvailableSlotsResponse {
  success: boolean;
  message: string;
  data: {
    slots: AvailableSlot[];
    dateRange: {
      startDate: string;
      endDate: string;
    };
    maxBookingsPerSlot: number;
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
   * @returns Observable with form schema, settings, and optional theme
   * @throws {FormRenderError} Various error types based on failure reason
   * @example
   * formRendererService.getFormSchema(token).subscribe({
   *   next: (result) => console.log('Schema:', result.schema, 'Theme:', result.theme),
   *   error: (err) => console.error('Error:', err.type, err.message)
   * });
   */
  getFormSchema(
    token: string,
  ): Observable<{ schema: FormSchema; settings: FormSettings; theme?: FormTheme | null }> {
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
   * Retrieves form schema using a short code.
   * @param shortCode - Short code for form access (e.g., 'abc123')
   * @returns Observable with form schema, settings, optional theme, and short code
   * @throws {FormRenderError} Various error types based on failure reason
   * @example
   * formRendererService.getFormByShortCode('abc123').subscribe({
   *   next: (result) => console.log('Schema:', result.schema, 'Theme:', result.theme),
   *   error: (err) => console.error('Error:', err.type, err.message)
   * });
   */
  getFormByShortCode(
    shortCode: string,
  ): Observable<{
    schema: FormSchema;
    settings: FormSettings;
    theme?: FormTheme | null;
    shortCode: string;
    renderToken: string;
  }> {
    const url = `${environment.apiUrl}/public/forms/${shortCode}`;
    console.log('FormRendererService: Fetching form schema by short code from:', url);
    return this.http
      .get<{ success: boolean; message: string; form: any; timestamp: string }>(url)
      .pipe(
        map((response) => {
          console.log('FormRendererService: Successfully received schema by short code:', response);
          return {
            schema: response.form.schema,
            settings: response.form.settings,
            theme: response.form.theme,
            shortCode: response.form.shortCode,
            renderToken: response.form.renderToken,
          };
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('FormRendererService: Error fetching schema by short code:', error);
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
  ): Observable<{ submissionId: string; message?: string; metadata?: QuizResultMetadata }> {
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
   * Retrieves available appointment slots for a form using short code.
   * @param shortCode - Short code for form access (e.g., 'abc123')
   * @param startDate - Start date for availability query (YYYY-MM-DD)
   * @param endDate - End date for availability query (YYYY-MM-DD)
   * @returns Observable with array of available slots
   * @throws {FormRenderError} Various error types based on failure reason
   * @example
   * formRendererService.getAvailableSlots('abc123', '2025-12-15', '2025-12-22').subscribe({
   *   next: (slots) => console.log('Available slots:', slots),
   *   error: (err) => console.error('Error:', err.type, err.message)
   * });
   */
  getAvailableSlots(
    shortCode: string,
    startDate: string,
    endDate: string,
  ): Observable<AvailableSlot[]> {
    const url = `${environment.apiUrl}/public/forms/${shortCode}/available-slots`;
    const params = {
      startDate,
      endDate,
    };

    console.log('FormRendererService: Fetching available slots from:', url, 'Params:', params);
    return this.http.get<AvailableSlotsResponse>(url, { params }).pipe(
      map((response) => {
        console.log('FormRendererService: Successfully received available slots:', response);
        return response.data.slots;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('FormRendererService: Error fetching available slots:', error);
        return throwError(() => this.handleError(error));
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
