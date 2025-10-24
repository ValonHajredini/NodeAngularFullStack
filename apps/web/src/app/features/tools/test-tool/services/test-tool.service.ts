import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TestToolRecord } from '@nodeangularfullstack/shared';

/**
 * Test Tool Service
 *
 * Provides data access methods for Test Tool operations.
 * Communicates with backend API at /api/tools/test-tool.
 */
@Injectable({
  providedIn: 'root',
})
export class TestToolService {
  private readonly apiUrl = '/api/tools/test-tool';

  constructor(private http: HttpClient) {}

  /**
   * Get all Test Tool records.
   * @returns Observable of Test Tool records array
   */
  getAll(): Observable<TestToolRecord[]> {
    return this.http.get<{ data: TestToolRecord[] }>(`${this.apiUrl}`).pipe(
      map((response) => response.data),
      catchError(this.handleError),
    );
  }

  /**
   * Get single Test Tool record by ID.
   * @param id - Record ID
   * @returns Observable of Test Tool record
   */
  getById(id: string): Observable<TestToolRecord> {
    return this.http.get<{ data: TestToolRecord }>(`${this.apiUrl}/${id}`).pipe(
      map((response) => response.data),
      catchError(this.handleError),
    );
  }

  /**
   * Create new Test Tool record.
   * @param data - Record data
   * @returns Observable of created record
   */
  create(data: Partial<TestToolRecord>): Observable<TestToolRecord> {
    return this.http.post<{ data: TestToolRecord }>(this.apiUrl, data).pipe(
      map((response) => response.data),
      catchError(this.handleError),
    );
  }

  /**
   * Update existing Test Tool record.
   * @param id - Record ID
   * @param data - Updated data
   * @returns Observable of updated record
   */
  update(id: string, data: Partial<TestToolRecord>): Observable<TestToolRecord> {
    return this.http.put<{ data: TestToolRecord }>(`${this.apiUrl}/${id}`, data).pipe(
      map((response) => response.data),
      catchError(this.handleError),
    );
  }

  /**
   * Delete Test Tool record.
   * @param id - Record ID
   * @returns Observable of void
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError));
  }

  /**
   * Handle HTTP errors.
   * @param error - HTTP error response
   * @returns Observable error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('TestTool Service Error:', error);
    return throwError(() => new Error(error.message || 'Server error'));
  }
}
