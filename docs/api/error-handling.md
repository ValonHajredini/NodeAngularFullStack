# Error Handling Guide

## Overview

The NodeAngularFullStack API implements a comprehensive error handling strategy with consistent
error responses, proper HTTP status codes, and detailed error information for debugging and user
feedback.

## Error Response Format

All API errors follow a consistent JSON structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error-specific details
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789",
    "path": "/api/v1/endpoint",
    "method": "POST"
  }
}
```

### Error Response Properties

| Property          | Type    | Description                             |
| ----------------- | ------- | --------------------------------------- |
| `success`         | boolean | Always `false` for error responses      |
| `error.code`      | string  | Machine-readable error identifier       |
| `error.message`   | string  | Human-readable error description        |
| `error.details`   | object  | Additional context-specific information |
| `error.timestamp` | string  | ISO 8601 timestamp when error occurred  |
| `error.requestId` | string  | Unique identifier for request tracing   |
| `error.path`      | string  | API endpoint where error occurred       |
| `error.method`    | string  | HTTP method used                        |

## HTTP Status Codes

### 2xx Success

| Code | Name       | Usage                                       |
| ---- | ---------- | ------------------------------------------- |
| 200  | OK         | Successful GET, PATCH, PUT requests         |
| 201  | Created    | Successful POST requests (resource created) |
| 204  | No Content | Successful DELETE requests                  |

### 4xx Client Errors

| Code | Name                 | Usage                                             |
| ---- | -------------------- | ------------------------------------------------- |
| 400  | Bad Request          | Invalid request data or malformed JSON            |
| 401  | Unauthorized         | Authentication required or invalid credentials    |
| 403  | Forbidden            | Valid authentication but insufficient permissions |
| 404  | Not Found            | Resource not found                                |
| 409  | Conflict             | Resource already exists or constraint violation   |
| 422  | Unprocessable Entity | Valid JSON but semantic validation errors         |
| 429  | Too Many Requests    | Rate limit exceeded                               |

### 5xx Server Errors

| Code | Name                  | Usage                           |
| ---- | --------------------- | ------------------------------- |
| 500  | Internal Server Error | Unexpected server error         |
| 502  | Bad Gateway           | Upstream service error          |
| 503  | Service Unavailable   | Service temporarily unavailable |
| 504  | Gateway Timeout       | Upstream service timeout        |

## Error Categories

### 1. Validation Errors (400)

**Common Scenarios:**

- Invalid JSON syntax
- Missing required fields
- Invalid data types
- Field length violations
- Format validation failures

**Example Response:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "errors": [
        {
          "field": "email",
          "value": "invalid-email",
          "message": "Email must be a valid email address",
          "constraint": "format"
        },
        {
          "field": "password",
          "value": "***",
          "message": "Password must be at least 8 characters long",
          "constraint": "minLength"
        }
      ]
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789",
    "path": "/api/v1/auth/register",
    "method": "POST"
  }
}
```

**Client Handling:**

```typescript
if (error.code === 'VALIDATION_ERROR') {
  error.details.errors.forEach((fieldError) => {
    // Show field-specific error messages
    showFieldError(fieldError.field, fieldError.message);
  });
}
```

### 2. Authentication Errors (401)

**Common Scenarios:**

- Missing Authorization header
- Invalid or expired JWT token
- Malformed token
- Wrong credentials

**Example Responses:**

**Invalid Credentials:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789"
  }
}
```

**Expired Token:**

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Access token has expired",
    "details": {
      "expiredAt": "2024-01-15T10:00:00.000Z",
      "refreshTokenRequired": true
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789"
  }
}
```

**Client Handling:**

```typescript
if (error.code === 'TOKEN_EXPIRED') {
  // Attempt to refresh token
  await authService.refreshToken();
  // Retry original request
  return retryRequest();
}
```

### 3. Authorization Errors (403)

**Common Scenarios:**

- Valid authentication but insufficient role
- Tenant isolation violations
- Resource access restrictions

**Example Response:**

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You don't have permission to perform this action",
    "details": {
      "requiredRole": "admin",
      "currentRole": "user",
      "requiredPermissions": ["users:write"]
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789"
  }
}
```

### 4. Not Found Errors (404)

**Common Scenarios:**

- Resource doesn't exist
- Resource exists but belongs to different tenant
- Invalid UUID format

**Example Response:**

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "User not found",
    "details": {
      "resourceType": "User",
      "resourceId": "123e4567-e89b-12d3-a456-426614174000"
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789"
  }
}
```

### 5. Conflict Errors (409)

**Common Scenarios:**

- Duplicate email registration
- Unique constraint violations
- Resource state conflicts

**Example Response:**

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "An account with this email already exists",
    "details": {
      "field": "email",
      "value": "user@example.com",
      "constraint": "unique"
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789"
  }
}
```

### 6. Rate Limiting Errors (429)

**Common Scenarios:**

- Too many login attempts
- API rate limits exceeded
- Burst limits hit

**Example Response:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 100,
      "windowMs": 900000,
      "remaining": 0,
      "resetTime": "2024-01-15T10:45:00.000Z",
      "retryAfter": 876
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789"
  }
}
```

**Client Handling:**

```typescript
if (error.code === 'RATE_LIMIT_EXCEEDED') {
  const retryAfter = error.details.retryAfter;
  // Show countdown timer or disable form
  showRateLimitMessage(retryAfter);
}
```

### 7. Server Errors (5xx)

**Example Response:**

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred. Please try again later.",
    "details": {
      "errorId": "err_567890123",
      "supportContact": "support@yourdomain.com"
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789"
  }
}
```

## Error Code Reference

### Authentication & Authorization

| Code                       | Status | Description                     |
| -------------------------- | ------ | ------------------------------- |
| `AUTHENTICATION_REQUIRED`  | 401    | No authentication provided      |
| `INVALID_CREDENTIALS`      | 401    | Wrong username/password         |
| `TOKEN_EXPIRED`            | 401    | JWT token has expired           |
| `TOKEN_INVALID`            | 401    | Malformed or invalid token      |
| `REFRESH_TOKEN_INVALID`    | 401    | Invalid refresh token           |
| `INSUFFICIENT_PERMISSIONS` | 403    | User lacks required permissions |
| `ACCOUNT_DISABLED`         | 403    | User account is disabled        |

### Validation & Data

| Code                     | Status | Description                        |
| ------------------------ | ------ | ---------------------------------- |
| `VALIDATION_ERROR`       | 400    | Request data validation failed     |
| `INVALID_JSON`           | 400    | Malformed JSON in request body     |
| `MISSING_REQUIRED_FIELD` | 400    | Required field not provided        |
| `INVALID_UUID`           | 400    | Invalid UUID format                |
| `INVALID_EMAIL_FORMAT`   | 400    | Invalid email address format       |
| `PASSWORD_TOO_WEAK`      | 400    | Password doesn't meet requirements |

### Resource & Conflicts

| Code                   | Status | Description                          |
| ---------------------- | ------ | ------------------------------------ |
| `RESOURCE_NOT_FOUND`   | 404    | Requested resource doesn't exist     |
| `EMAIL_ALREADY_EXISTS` | 409    | Email address already registered     |
| `USERNAME_TAKEN`       | 409    | Username already exists              |
| `DUPLICATE_RESOURCE`   | 409    | Resource with same identifier exists |

### Rate Limiting & Quotas

| Code                        | Status | Description                      |
| --------------------------- | ------ | -------------------------------- |
| `RATE_LIMIT_EXCEEDED`       | 429    | Too many requests in time window |
| `DAILY_QUOTA_EXCEEDED`      | 429    | Daily API quota exceeded         |
| `CONCURRENT_LIMIT_EXCEEDED` | 429    | Too many concurrent requests     |

### Server & System

| Code                     | Status | Description                |
| ------------------------ | ------ | -------------------------- |
| `INTERNAL_SERVER_ERROR`  | 500    | Unexpected server error    |
| `DATABASE_ERROR`         | 500    | Database operation failed  |
| `EXTERNAL_SERVICE_ERROR` | 502    | Third-party service error  |
| `SERVICE_UNAVAILABLE`    | 503    | Service temporarily down   |
| `REQUEST_TIMEOUT`        | 504    | Request processing timeout |

## Client Error Handling Strategies

### Frontend Error Handling

#### 1. Angular HTTP Interceptor

```typescript
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.error?.error) {
          return this.handleApiError(error.error.error, req);
        }
        return this.handleHttpError(error);
      })
    );
  }

  private handleApiError(apiError: any, originalRequest: HttpRequest<any>): Observable<never> {
    switch (apiError.code) {
      case 'TOKEN_EXPIRED':
        return this.handleTokenExpired(originalRequest);

      case 'INSUFFICIENT_PERMISSIONS':
        this.router.navigate(['/unauthorized']);
        break;

      case 'VALIDATION_ERROR':
        this.handleValidationError(apiError);
        break;

      case 'RATE_LIMIT_EXCEEDED':
        this.handleRateLimit(apiError);
        break;

      default:
        this.notificationService.showError(apiError.message);
    }

    return throwError(() => apiError);
  }

  private handleTokenExpired(originalRequest: HttpRequest<any>): Observable<HttpEvent<any>> {
    return this.authService.refreshToken().pipe(
      switchMap(() => {
        // Retry original request with new token
        const newRequest = originalRequest.clone({
          setHeaders: {
            Authorization: `Bearer ${this.authService.getAccessToken()}`,
          },
        });
        return next.handle(newRequest);
      }),
      catchError(() => {
        this.authService.logout();
        this.router.navigate(['/login']);
        return throwError(() => new Error('Session expired'));
      })
    );
  }

  private handleValidationError(error: any): void {
    if (error.details?.errors) {
      error.details.errors.forEach((fieldError: any) => {
        this.notificationService.showFieldError(fieldError.field, fieldError.message);
      });
    }
  }

  private handleRateLimit(error: any): void {
    const retryAfter = error.details?.retryAfter || 60;
    this.notificationService.showWarning(
      `Rate limit exceeded. Please wait ${retryAfter} seconds before retrying.`
    );
  }
}
```

#### 2. React Error Boundary

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

class ApiErrorBoundary extends Component<{}, ErrorBoundaryState> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('API Error Boundary caught an error:', error, errorInfo);

    // Log to error reporting service
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Send to Sentry, LogRocket, etc.
    console.error('Error logged:', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 3. API Client with Retry Logic

```typescript
class ApiClient {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  async makeRequest<T>(config: RequestConfig): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(config.url, {
          method: config.method,
          headers: config.headers,
          body: config.body,
        });

        if (response.ok) {
          return await response.json();
        }

        const error = await response.json();

        // Don't retry client errors (4xx) except 429
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new ApiError(error.error);
        }

        // Retry server errors and rate limits
        if (attempt < this.maxRetries) {
          const delay = this.calculateRetryDelay(attempt, error.error);
          await this.sleep(delay);
          continue;
        }

        throw new ApiError(error.error);
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.maxRetries && this.isRetryableError(error)) {
          await this.sleep(this.retryDelay * attempt);
          continue;
        }

        throw error;
      }
    }

    throw lastError!;
  }

  private calculateRetryDelay(attempt: number, error?: any): number {
    // Exponential backoff with jitter
    const baseDelay = this.retryDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;

    // Use retry-after header for rate limits
    if (error?.code === 'RATE_LIMIT_EXCEEDED' && error?.details?.retryAfter) {
      return error.details.retryAfter * 1000;
    }

    return baseDelay + jitter;
  }

  private isRetryableError(error: any): boolean {
    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    // Server errors
    if (error instanceof ApiError) {
      const code = error.code;
      return ['INTERNAL_SERVER_ERROR', 'SERVICE_UNAVAILABLE', 'REQUEST_TIMEOUT'].includes(code);
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

## Backend Error Handling Implementation

### 1. Global Error Handler

```typescript
// apps/api/src/middleware/error.middleware.ts

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const logger = Logger.create('ErrorHandler');

  // Log error details
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    requestId: req.id,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Determine error type and response
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId: req.id,
        path: req.path,
        method: req.method,
      },
    });
  } else if (error instanceof ValidationError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { errors: error.details },
        timestamp: new Date().toISOString(),
        requestId: req.id,
        path: req.path,
        method: req.method,
      },
    });
  } else {
    // Unexpected errors - don't expose internal details
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        details: {
          errorId: generateErrorId(),
          supportContact: process.env.SUPPORT_EMAIL,
        },
        timestamp: new Date().toISOString(),
        requestId: req.id,
        path: req.path,
        method: req.method,
      },
    });
  }
};
```

### 2. Custom Error Classes

```typescript
// apps/api/src/utils/errors.ts

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', details?: any) {
    super('RESOURCE_NOT_FOUND', message, 404, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super('RESOURCE_CONFLICT', message, 409, details);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Authentication required', details?: any) {
    super('AUTHENTICATION_REQUIRED', message, 401, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Insufficient permissions', details?: any) {
    super('INSUFFICIENT_PERMISSIONS', message, 403, details);
    this.name = 'ForbiddenError';
  }
}
```

## Monitoring and Debugging

### 1. Error Tracking Setup

```typescript
// apps/api/src/utils/error-tracking.ts

import * as Sentry from '@sentry/node';

export function initializeErrorTracking() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      beforeSend(event, hint) {
        // Filter out expected errors
        const error = hint.originalException;
        if (error instanceof ApiError && error.statusCode < 500) {
          return null; // Don't send client errors to Sentry
        }
        return event;
      },
    });
  }
}

export function captureError(error: Error, context?: any) {
  console.error('Error captured:', error, context);

  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}
```

### 2. Request Tracing

```typescript
// apps/api/src/middleware/request-tracing.middleware.ts

export const requestTracingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  req.id = req.get('X-Request-ID') || generateRequestId();

  // Add to response headers
  res.set('X-Request-ID', req.id);

  // Log request start
  const logger = Logger.create('RequestTracing');
  logger.info('Request started', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  next();
};
```

### 3. Health Check Endpoint

```typescript
// apps/api/src/controllers/health.controller.ts

export class HealthController {
  async checkHealth(req: Request, res: Response): Promise<void> {
    try {
      // Check database connectivity
      const dbStatus = await this.checkDatabase();

      // Check Redis connectivity
      const redisStatus = await this.checkRedis();

      // Check external services
      const externalServices = await this.checkExternalServices();

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.APP_VERSION,
        environment: process.env.NODE_ENV,
        services: {
          database: dbStatus,
          redis: redisStatus,
          ...externalServices,
        },
      };

      res.json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  }
}
```

## Best Practices

### 1. Error Message Guidelines

- **Be Clear**: Use specific, actionable error messages
- **Be Consistent**: Follow the same format across all endpoints
- **Be Secure**: Don't expose sensitive information in error messages
- **Be Helpful**: Include suggestions for fixing the error when possible

### 2. Logging Best Practices

- Log all 5xx errors with full stack traces
- Log 4xx errors with context but not stack traces
- Include request IDs for error correlation
- Use structured logging (JSON format)
- Don't log sensitive information (passwords, tokens)

### 3. Client Handling Best Practices

- Implement global error handling
- Provide user-friendly error messages
- Handle network failures gracefully
- Implement retry logic for transient errors
- Show loading states during retry attempts

### 4. Rate Limiting Strategy

- Use different limits for different endpoints
- Provide clear retry information
- Implement exponential backoff
- Consider user-specific rate limits
- Monitor and adjust limits based on usage patterns

This comprehensive error handling guide ensures consistent, secure, and user-friendly error
management across the entire NodeAngularFullStack application.
