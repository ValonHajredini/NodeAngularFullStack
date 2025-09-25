/**
 * API Token Usage Tracking Interface
 *
 * Represents usage data for API tokens including request metadata,
 * performance metrics, and client information.
 */

/**
 * Core token usage record interface.
 */
export interface TokenUsage {
  /** Unique identifier for the usage record */
  id: string;

  /** Foreign key reference to api_tokens table */
  tokenId: string;

  /** API endpoint that was accessed */
  endpoint: string;

  /** HTTP method used (GET, POST, etc.) */
  method: string;

  /** When the API request was made */
  timestamp: Date;

  /** Request processing time in milliseconds */
  processingTime?: number;

  /** HTTP response status code */
  responseStatus: number;

  /** Client IP address */
  ipAddress?: string;

  /** Client user agent string */
  userAgent?: string;

  /** Optional tenant context for multi-tenancy */
  tenantId?: string;

  /** Record creation timestamp */
  createdAt: Date;
}

/**
 * Filters for querying token usage records.
 */
export interface TokenUsageFilters {
  /** Filter by date range - start date */
  from?: Date;

  /** Filter by date range - end date */
  to?: Date;

  /** Filter by HTTP status codes */
  status?: number[];

  /** Filter by endpoint (partial match) */
  endpoint?: string;

  /** Filter by HTTP method */
  method?: string;
}

/**
 * Paginated response for token usage queries.
 */
export interface TokenUsageResponse {
  /** Array of usage records */
  usage: TokenUsage[];

  /** Pagination metadata */
  pagination: {
    /** Current page number */
    page: number;

    /** Items per page */
    limit: number;

    /** Total number of records */
    total: number;

    /** Total number of pages */
    totalPages: number;
  };
}

/**
 * Token usage statistics interface.
 */
export interface TokenUsageStats {
  /** Total number of requests */
  totalRequests: number;

  /** Number of successful requests (status < 400) */
  successfulRequests: number;

  /** Number of failed requests (status >= 400) */
  failedRequests: number;

  /** Average response time in milliseconds */
  averageResponseTime: number;

  /** Most frequently accessed endpoints */
  topEndpoints: Array<{
    endpoint: string;
    count: number;
  }>;

  /** Request count by status code */
  requestsByStatus: Array<{
    status: number;
    count: number;
  }>;
}

/**
 * Time-series usage data for charts and analytics.
 */
export interface TokenUsageTimeSeries {
  /** Array of time-series data points */
  data: Array<{
    /** Time period (ISO string) */
    period: string;

    /** Number of requests in this period */
    requests: number;

    /** Average response time in this period */
    averageResponseTime: number;
  }>;

  /** Period type used for aggregation */
  period: 'hour' | 'day';
}

/**
 * Request interface for creating usage records.
 */
export interface CreateTokenUsageRequest {
  /** API token ID */
  tokenId: string;

  /** API endpoint accessed */
  endpoint: string;

  /** HTTP method used */
  method: string;

  /** HTTP response status code */
  responseStatus: number;

  /** Request processing time in milliseconds */
  processingTime?: number;

  /** Client IP address */
  ipAddress?: string;

  /** Client user agent */
  userAgent?: string;

  /** Optional tenant ID for multi-tenancy */
  tenantId?: string;
}

// All types are already exported with the interface/type declarations above