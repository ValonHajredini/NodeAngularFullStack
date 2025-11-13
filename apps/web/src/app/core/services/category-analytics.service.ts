/**
 * Category Analytics Service
 *
 * Provides methods for fetching category-specific analytics metrics from the backend API.
 * Integrates with the analytics endpoint to retrieve poll, quiz, ecommerce, services,
 * data collection, and events metrics.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.6: Frontend Category Detection and Analytics Service
 *
 * @since 2025-01-27
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  CategoryMetrics,
  FormSchema,
  TemplateCategory,
  detectTemplateCategory,
} from '@nodeangularfullstack/shared';
import { environment } from '../../../environments/environment';

/**
 * Response wrapper for API endpoints
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

/**
 * Service for interacting with the Category Analytics backend API.
 *
 * Provides methods for:
 * - Fetching category-specific analytics metrics
 * - Detecting template categories from form schemas
 * - Handling errors with user-friendly messages
 *
 * **Error Handling:**
 * - Network errors return user-friendly messages
 * - 401/403 errors handled gracefully
 * - 404 errors for non-existent forms
 * - All errors logged to console
 *
 * **API Integration:**
 * - Endpoint: GET /api/analytics/:formId/category-metrics
 * - Returns: CategoryMetrics (discriminated union)
 * - Auth: JWT bearer token required (handled by HttpInterceptor)
 *
 * @example Basic Usage
 * ```typescript
 * constructor(private analyticsService: CategoryAnalyticsService) {}
 *
 * ngOnInit() {
 *   const formId = '123e4567-e89b-12d3-a456-426614174000';
 *   this.analyticsService.getCategoryMetrics(formId).subscribe({
 *     next: (metrics) => {
 *       if (metrics.category === 'polls') {
 *         console.log('Poll metrics:', metrics.voteCounts);
 *       } else if (metrics.category === 'quiz') {
 *         console.log('Quiz metrics:', metrics.averageScore);
 *       }
 *     },
 *     error: (err) => console.error('Error:', err),
 *   });
 * }
 * ```
 *
 * @example Category Detection
 * ```typescript
 * const schema: FormSchema = getFormSchema();
 * const category = this.analyticsService.detectTemplateCategory(schema);
 * if (category === TemplateCategory.POLLS) {
 *   // Render poll-specific UI
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class CategoryAnalyticsService {
  private readonly baseUrl = `${environment.formsApiUrl}/api/analytics`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch category-specific analytics metrics for a form.
   * Returns specialized metrics based on the form's template category.
   *
   * **Supported Categories:**
   * - polls: Vote counts, percentages, most popular option
   * - quiz: Score distribution, average/median, pass rate, question accuracy
   * - ecommerce: Revenue, top products, inventory levels
   * - services: Bookings, cancellations, popular time slots
   * - data_collection: Order totals, popular items (restaurant/menu forms)
   * - events: RSVP counts, ticket sales, attendance rate
   *
   * @param formId - UUID of the form to fetch analytics for
   * @returns Observable containing category-specific metrics
   * @throws {Error} Network or server errors with user-friendly messages
   *
   * @example Poll Metrics
   * ```typescript
   * this.getCategoryMetrics(formId).subscribe({
   *   next: (metrics) => {
   *     if (metrics.category === 'polls') {
   *       console.log('Vote counts:', metrics.voteCounts);
   *       console.log('Percentages:', metrics.votePercentages);
   *       console.log('Most popular:', metrics.mostPopularOption);
   *     }
   *   },
   *   error: (err) => console.error('Failed to fetch analytics:', err)
   * });
   * ```
   *
   * @example Quiz Metrics
   * ```typescript
   * this.getCategoryMetrics(formId).subscribe({
   *   next: (metrics) => {
   *     if (metrics.category === 'quiz') {
   *       console.log('Average score:', metrics.averageScore);
   *       console.log('Pass rate:', metrics.passRate);
   *       console.log('Score distribution:', metrics.scoreDistribution);
   *     }
   *   }
   * });
   * ```
   */
  getCategoryMetrics(formId: string): Observable<CategoryMetrics> {
    const url = `${this.baseUrl}/${formId}/category-metrics`;
    return this.http.get<ApiResponse<CategoryMetrics>>(url).pipe(
      map((response) => response.data),
      catchError(this.handleError),
    );
  }

  /**
   * Detect the template category from a form schema.
   * Uses shared utility functions to inspect form metadata, business logic config,
   * and template references to determine the category.
   *
   * **Detection Strategy:**
   * 1. Check for explicit category in schema settings
   * 2. Detect from embedded template metadata
   * 3. Infer from business logic config type
   * 4. Check metadata hints
   * 5. Return null if category cannot be determined (generic form)
   *
   * @param formSchema - Form schema to analyze
   * @returns Template category enum value or null if not detectable
   *
   * @example
   * ```typescript
   * const schema: FormSchema = getFormSchema();
   * const category = this.detectTemplateCategory(schema);
   *
   * if (category === TemplateCategory.POLLS) {
   *   // Render poll-specific analytics
   *   this.renderPollAnalytics();
   * } else if (category === TemplateCategory.QUIZ) {
   *   // Render quiz-specific analytics
   *   this.renderQuizAnalytics();
   * } else {
   *   // Fallback to generic analytics
   *   this.renderGenericAnalytics();
   * }
   * ```
   *
   * @example Type Narrowing
   * ```typescript
   * const category = this.detectTemplateCategory(schema);
   * if (category) {
   *   // TypeScript knows category is TemplateCategory (not null)
   *   const label = getCategoryLabel(category);
   *   const icon = getCategoryIcon(category);
   * }
   * ```
   */
  detectTemplateCategory(formSchema: FormSchema): TemplateCategory | null {
    return detectTemplateCategory(formSchema);
  }

  /**
   * Centralized error handler for HTTP requests.
   * Logs errors and returns user-friendly error messages.
   *
   * @param error - HTTP error response
   * @returns Observable error with user-friendly message
   *
   * @example
   * ```typescript
   * // Error handling is automatic via pipe(catchError(this.handleError))
   * this.getCategoryMetrics(formId).subscribe({
   *   error: (err) => {
   *     // err.message contains user-friendly error message
   *     console.error('Error:', err.message);
   *     this.showErrorToast(err.message);
   *   }
   * });
   * ```
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
          errorMessage = 'Forbidden. You do not have permission to view this analytics data.';
          break;
        case 404:
          errorMessage = 'Form not found or no submissions available';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = `Error ${error.status}: ${error.error?.message || error.message}`;
      }
    }

    console.error('CategoryAnalyticsService error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
