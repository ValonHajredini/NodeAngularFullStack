/**
 * Custom API Error class for standardized error handling
 *
 * Provides consistent error responses across the API with status codes,
 * error codes, and structured metadata.
 *
 * @since 2025-01-27
 */

/**
 * Custom error class for API errors with HTTP status codes
 */
export class ApiError extends Error {
  /**
   * HTTP status code for the error response
   */
  public readonly statusCode: number;

  /**
   * Machine-readable error code for client handling
   */
  public readonly code?: string;

  /**
   * Additional error metadata for debugging
   */
  public readonly metadata?: Record<string, any>;

  /**
   * Timestamp when error occurred
   */
  public readonly timestamp: string;

  /**
   * Creates a new API error
   *
   * @param statusCode - HTTP status code (400, 401, 403, 404, 500, etc.)
   * @param message - Human-readable error message
   * @param code - Optional machine-readable error code
   * @param metadata - Optional additional error information
   *
   * @example
   * throw new ApiError(404, 'Form not found', 'FORM_NOT_FOUND', { formId: '123' });
   */
  constructor(
    statusCode: number,
    message: string,
    code?: string,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Converts error to JSON response format
   *
   * @returns Structured error response object
   */
  toJSON() {
    return {
      error: {
        code: this.code || 'INTERNAL_ERROR',
        message: this.message,
        ...(this.metadata && { metadata: this.metadata }),
      },
      timestamp: this.timestamp,
    };
  }

  /**
   * Creates a 400 Bad Request error
   */
  static badRequest(message: string, metadata?: Record<string, any>): ApiError {
    return new ApiError(400, message, 'BAD_REQUEST', metadata);
  }

  /**
   * Creates a 401 Unauthorized error
   */
  static unauthorized(message: string = 'Unauthorized', metadata?: Record<string, any>): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED', metadata);
  }

  /**
   * Creates a 403 Forbidden error
   */
  static forbidden(message: string = 'Forbidden', metadata?: Record<string, any>): ApiError {
    return new ApiError(403, message, 'FORBIDDEN', metadata);
  }

  /**
   * Creates a 404 Not Found error
   */
  static notFound(message: string, metadata?: Record<string, any>): ApiError {
    return new ApiError(404, message, 'NOT_FOUND', metadata);
  }

  /**
   * Creates a 409 Conflict error
   */
  static conflict(message: string, metadata?: Record<string, any>): ApiError {
    return new ApiError(409, message, 'CONFLICT', metadata);
  }

  /**
   * Creates a 500 Internal Server Error
   */
  static internal(message: string = 'Internal server error', metadata?: Record<string, any>): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR', metadata);
  }
}
