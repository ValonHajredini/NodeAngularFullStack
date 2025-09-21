import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { config } from './config.utils';

/**
 * Monitoring and error tracking utilities for production deployment.
 * Integrates with Sentry for error tracking and performance monitoring.
 */

/**
 * Initialize Sentry for error tracking and performance monitoring.
 * Should be called at the very beginning of the application startup.
 */
export const initializeSentry = (): void => {
  if (!config.SENTRY_DSN) {
    if (config.NODE_ENV === 'production') {
      console.warn('⚠️  SENTRY_DSN not configured for production environment');
    }
    return;
  }

  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    release: config.APP_VERSION || '1.0.0',

    // Performance monitoring
    tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Integrations
    integrations: [
      // Enable profiling
      nodeProfilingIntegration(),

      // Database monitoring
      new Sentry.Integrations.Postgres(),

      // HTTP requests monitoring
      new Sentry.Integrations.Http({
        tracing: true,
        breadcrumbs: true,
      }),

      // Console logs as breadcrumbs
      new Sentry.Integrations.Console({
        levels: ['error', 'warn'],
      }),
    ],

    // Sampling configuration
    beforeSend(event) {
      // Filter out health check errors
      if (event.request?.url?.includes('/health')) {
        return null;
      }

      // Filter out specific error types in production
      if (config.NODE_ENV === 'production') {
        // Don't send validation errors to Sentry
        if (event.exception?.values?.[0]?.type === 'ValidationError') {
          return null;
        }
      }

      return event;
    },

    // Tag all events with deployment info
    initialScope: {
      tags: {
        component: 'api',
        deployment: 'digitalocean',
        version: config.APP_VERSION || '1.0.0',
      },
      extra: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    },
  });

  console.log('📊 Sentry monitoring initialized');
};

/**
 * Custom error types for better error tracking and categorization.
 */
export enum ErrorCategory {
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  EXTERNAL_SERVICE = 'external_service',
  FILE_SYSTEM = 'file_system',
  NETWORK = 'network',
  CONFIGURATION = 'configuration',
  BUSINESS_LOGIC = 'business_logic',
}

/**
 * Enhanced error class with additional metadata for monitoring.
 */
export class MonitoredError extends Error {
  public readonly category: ErrorCategory;
  public readonly metadata: Record<string, any>;
  public readonly timestamp: Date;
  public readonly correlationId?: string;

  constructor(
    message: string,
    category: ErrorCategory,
    metadata: Record<string, any> = {},
    correlationId?: string
  ) {
    super(message);
    this.name = 'MonitoredError';
    this.category = category;
    this.metadata = metadata;
    this.timestamp = new Date();
    this.correlationId = correlationId;

    // Ensure stack trace points to where error was thrown
    Error.captureStackTrace(this, MonitoredError);
  }
}

/**
 * Capture error with enhanced context for monitoring.
 */
export const captureError = (
  error: Error | MonitoredError,
  context: {
    user?: { id: string; email?: string };
    tenant?: { id: string; name?: string };
    request?: { url: string; method: string; ip?: string };
    additional?: Record<string, any>;
  } = {}
): string => {
  const eventId = Sentry.captureException(error, {
    tags: {
      category: error instanceof MonitoredError ? error.category : 'unknown',
      correlationId:
        error instanceof MonitoredError ? error.correlationId : undefined,
    },
    user: context.user,
    contexts: {
      tenant: context.tenant,
      request: context.request,
      metadata: error instanceof MonitoredError ? error.metadata : undefined,
      additional: context.additional,
    },
  });

  return eventId;
};

/**
 * Capture message with context for monitoring.
 */
export const captureMessage = (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context: Record<string, any> = {}
): string => {
  const eventId = Sentry.captureMessage(message, level);

  Sentry.setContext('message_context', context);

  return eventId;
};

/**
 * Add user context to current Sentry scope.
 */
export const setUserContext = (user: {
  id: string;
  email?: string;
  role?: string;
  tenantId?: string;
}): void => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  });
};

/**
 * Add request context to current Sentry scope.
 */
export const setRequestContext = (req: any): void => {
  Sentry.setContext('request', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    correlationId: req.headers['x-correlation-id'],
    tenantId: req.headers['x-tenant-id'],
  });
};

/**
 * Performance monitoring utilities.
 */
export class PerformanceMonitor {
  private static timers: Map<string, Date> = new Map();

  /**
   * Start timing an operation.
   */
  static startTimer(operation: string, correlationId?: string): void {
    const key = correlationId ? `${operation}:${correlationId}` : operation;
    this.timers.set(key, new Date());
  }

  /**
   * End timing an operation and send to Sentry.
   */
  static endTimer(operation: string, correlationId?: string): number {
    const key = correlationId ? `${operation}:${correlationId}` : operation;
    const startTime = this.timers.get(key);

    if (!startTime) {
      console.warn(`Timer not found for operation: ${operation}`);
      return 0;
    }

    const duration = Date.now() - startTime.getTime();
    this.timers.delete(key);

    // Send performance data to Sentry
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `Operation ${operation} completed`,
      level: 'info',
      data: {
        operation,
        duration,
        correlationId,
      },
    });

    return duration;
  }

  /**
   * Measure function execution time.
   */
  static async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    correlationId?: string
  ): Promise<T> {
    this.startTimer(operation, correlationId);
    try {
      const result = await fn();
      this.endTimer(operation, correlationId);
      return result;
    } catch (error) {
      this.endTimer(operation, correlationId);
      throw error;
    }
  }
}

/**
 * Health metrics collection for monitoring.
 */
export class HealthMetrics {
  private static metrics: Map<string, any> = new Map();

  /**
   * Record a metric value.
   */
  static recordMetric(
    name: string,
    value: number,
    tags: Record<string, string> = {}
  ): void {
    this.metrics.set(name, {
      value,
      tags,
      timestamp: new Date(),
    });

    // Send to Sentry as breadcrumb
    Sentry.addBreadcrumb({
      category: 'metric',
      message: `Metric recorded: ${name}`,
      level: 'info',
      data: {
        name,
        value,
        tags,
      },
    });
  }

  /**
   * Get current metrics snapshot.
   */
  static getMetrics(): Record<string, any> {
    const snapshot: Record<string, any> = {};
    this.metrics.forEach((value, key) => {
      snapshot[key] = value;
    });
    return snapshot;
  }

  /**
   * Clear old metrics (cleanup).
   */
  static cleanupMetrics(maxAge: number = 3600000): void {
    // 1 hour default
    const now = Date.now();
    this.metrics.forEach((value, key) => {
      if (now - value.timestamp.getTime() > maxAge) {
        this.metrics.delete(key);
      }
    });
  }
}

/**
 * Business metrics for application monitoring.
 */
export const BusinessMetrics = {
  /**
   * Track user authentication events.
   */
  trackAuthEvent(
    event: 'login' | 'logout' | 'failed_login',
    userId?: string
  ): void {
    HealthMetrics.recordMetric('auth_events', 1, {
      event,
      userId: userId || 'anonymous',
    });

    Sentry.addBreadcrumb({
      category: 'auth',
      message: `Authentication event: ${event}`,
      level: event === 'failed_login' ? 'warning' : 'info',
      data: { event, userId },
    });
  },

  /**
   * Track API endpoint usage.
   */
  trackApiUsage(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number
  ): void {
    HealthMetrics.recordMetric('api_requests', 1, {
      endpoint,
      method,
      status: statusCode.toString(),
    });

    HealthMetrics.recordMetric('api_response_time', duration, {
      endpoint,
      method,
    });
  },

  /**
   * Track database operations.
   */
  trackDatabaseOperation(
    operation: string,
    table: string,
    duration: number
  ): void {
    HealthMetrics.recordMetric('db_operations', 1, {
      operation,
      table,
    });

    HealthMetrics.recordMetric('db_response_time', duration, {
      operation,
      table,
    });
  },

  /**
   * Track file operations.
   */
  trackFileOperation(
    operation: 'upload' | 'download' | 'delete',
    size?: number
  ): void {
    HealthMetrics.recordMetric('file_operations', 1, { operation });

    if (size) {
      HealthMetrics.recordMetric('file_size', size, { operation });
    }
  },
};

/**
 * Monitoring middleware for Express.js.
 */
export const monitoringMiddleware = (req: any, res: any, next: any): void => {
  const startTime = Date.now();
  const correlationId =
    req.headers['x-correlation-id'] ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add correlation ID to request
  req.correlationId = correlationId;

  // Set request context for Sentry
  setRequestContext(req);

  // Track the request
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    BusinessMetrics.trackApiUsage(
      req.route?.path || req.path,
      req.method,
      res.statusCode,
      duration
    );

    // Log slow requests
    if (duration > 5000) {
      // 5 seconds
      captureMessage(`Slow request detected`, 'warning', {
        url: req.url,
        method: req.method,
        duration,
        correlationId,
      });
    }
  });

  next();
};
