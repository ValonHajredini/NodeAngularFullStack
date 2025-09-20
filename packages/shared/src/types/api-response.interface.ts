/**
 * Standard API response wrapper for all endpoints.
 * Provides consistent response structure across the application.
 */
export interface ApiResponse<T = any> {
  /** Indicates if the request was successful */
  success: boolean;
  /** Response data payload */
  data?: T;
  /** Error message if request failed */
  error?: string;
  /** Additional error details or validation errors */
  errors?: Record<string, string[]>;
  /** Response timestamp */
  timestamp: string;
  /** Optional request ID for tracking */
  requestId?: string;
}

/**
 * Paginated API response for list endpoints.
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  /** Pagination metadata */
  pagination: {
    /** Current page number (1-indexed) */
    page: number;
    /** Number of items per page */
    pageSize: number;
    /** Total number of items */
    totalItems: number;
    /** Total number of pages */
    totalPages: number;
    /** Indicates if there's a next page */
    hasNext: boolean;
    /** Indicates if there's a previous page */
    hasPrevious: boolean;
  };
}

/**
 * Standard error response structure.
 */
export interface ErrorResponse {
  /** HTTP status code */
  statusCode: number;
  /** Error message */
  message: string;
  /** Error code for client-side handling */
  errorCode?: string;
  /** Stack trace (only in development) */
  stack?: string;
  /** Validation errors for form fields */
  validationErrors?: Record<string, string[]>;
}