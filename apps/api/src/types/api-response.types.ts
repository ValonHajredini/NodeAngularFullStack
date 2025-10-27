/**
 * API Response Types
 *
 * Standardized response formats for REST API endpoints.
 * Ensures consistent error and success response structure across all controllers.
 *
 * Story 33.1.3: Export Job Status Tracking
 */

/**
 * Standard error codes used across the application.
 * Provides machine-readable error identification for client-side handling.
 */
export type ApiErrorCode =
  | 'TOOL_NOT_FOUND'
  | 'JOB_NOT_FOUND'
  | 'JOB_NOT_COMPLETED'
  | 'PERMISSION_DENIED'
  | 'UNAUTHORIZED_CANCELLATION'
  | 'INVALID_JOB_STATUS'
  | 'RATE_LIMIT_EXCEEDED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'AUTHENTICATION_REQUIRED'
  | 'UNKNOWN_ERROR'
  | 'PACKAGE_NOT_READY'
  | 'PACKAGE_EXPIRED'
  | 'DOWNLOAD_UNAUTHORIZED'
  | 'CHECKSUM_NOT_AVAILABLE'
  | 'PACKAGE_TAMPERED'
  | 'FILE_NOT_FOUND'
  | 'INVALID_RANGE'
  | 'STREAM_ERROR'
  | 'INVALID_LIMIT'
  | 'INVALID_OFFSET'
  | 'INVALID_PARAMETERS';

/**
 * Standardized error response format.
 * All API errors return this structure for consistent client-side error handling.
 *
 * @example
 * {
 *   "status": "error",
 *   "message": "Tool not found",
 *   "code": "TOOL_NOT_FOUND",
 *   "timestamp": "2025-10-26T10:30:00Z",
 *   "requestId": "req-abc-123"
 * }
 */
export interface ApiErrorResponse {
  /** Response status (always 'error' for errors) */
  status: 'error';

  /** Human-readable error message */
  message: string;

  /** Machine-readable error code for client-side handling */
  code: ApiErrorCode;

  /** ISO 8601 timestamp of when the error occurred */
  timestamp: string;

  /** Optional request correlation ID for debugging */
  requestId?: string;

  /** Optional validation errors array (for validation failures) */
  errors?: Array<{
    field: string;
    message: string;
  }>;

  /** Optional retry-after seconds (for rate limiting) */
  retryAfter?: number;
}

/**
 * Standardized success response format.
 * All successful API responses wrap data in this structure.
 *
 * @example
 * {
 *   "status": "success",
 *   "message": "Export job created successfully",
 *   "data": { jobId: "job-abc-123", ... }
 * }
 */
export interface ApiSuccessResponse<T = any> {
  /** Response status (always 'success' for successful responses) */
  status: 'success';

  /** Human-readable success message */
  message?: string;

  /** Response data payload (type varies by endpoint) */
  data: T;

  /** Optional metadata (pagination, counts, etc.) */
  meta?: Record<string, any>;
}

/**
 * Helper function to create standardized error response.
 *
 * @param message - Human-readable error message
 * @param code - Machine-readable error code
 * @param options - Optional properties (requestId, errors, retryAfter)
 * @returns Standardized error response object
 *
 * @example
 * return res.status(404).json(
 *   createErrorResponse('Tool not found', 'TOOL_NOT_FOUND')
 * );
 */
export function createErrorResponse(
  message: string,
  code: ApiErrorCode,
  options?: {
    requestId?: string;
    errors?: Array<{ field: string; message: string }>;
    retryAfter?: number;
  }
): ApiErrorResponse {
  return {
    status: 'error',
    message,
    code,
    timestamp: new Date().toISOString(),
    ...options,
  };
}

/**
 * Helper function to create standardized success response.
 *
 * @param data - Response data payload
 * @param message - Optional human-readable success message
 * @param meta - Optional metadata (pagination, counts, etc.)
 * @returns Standardized success response object
 *
 * @example
 * return res.status(200).json(
 *   createSuccessResponse(job, 'Export job created successfully')
 * );
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, any>
): ApiSuccessResponse<T> {
  const response: ApiSuccessResponse<T> = {
    status: 'success',
    data,
  };

  if (message) {
    response.message = message;
  }

  if (meta) {
    response.meta = meta;
  }

  return response;
}
