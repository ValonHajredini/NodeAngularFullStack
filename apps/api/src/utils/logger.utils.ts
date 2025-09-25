import winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';
import { config } from './config.utils';

/**
 * Production-ready logging configuration with Winston and Logtail integration.
 * Provides structured logging for production deployment monitoring.
 */

// Log levels in order of severity
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

// Custom log format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logEntry: any = {
      timestamp,
      level,
      message,
      environment: config.NODE_ENV,
      service: 'api',
      version: config.APP_VERSION || '1.0.0',
      ...meta,
    };

    if (stack) {
      logEntry.stack = stack;
    }

    return JSON.stringify(logEntry);
  })
);

/**
 * Create console transport with appropriate formatting.
 */
const createConsoleTransport = () => {
  return new winston.transports.Console({
    level: String(config.LOG_LEVEL) || 'info',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss',
      }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr =
          Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} ${level}: ${message} ${metaStr}`;
      })
    ),
  });
};

/**
 * Create file transport for local logging.
 */
const createFileTransport = () => {
  return new winston.transports.File({
    filename: 'logs/app.log',
    level: String(config.LOG_LEVEL) || 'info',
    format: logFormat,
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    tailable: true,
  });
};

/**
 * Create error file transport for error-only logging.
 */
const createErrorFileTransport = () => {
  return new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: logFormat,
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    tailable: true,
  });
};

/**
 * Create Logtail transport for cloud logging.
 */
const createLogtailTransport = () => {
  if (!config.LOGTAIL_TOKEN) {
    if (config.NODE_ENV === 'production') {
      console.warn(
        '⚠️  LOGTAIL_TOKEN not configured for production environment'
      );
    }
    return null;
  }

  const logtail = new Logtail(String(config.LOGTAIL_TOKEN));
  return new LogtailTransport(logtail, {
    level: String(config.LOG_LEVEL) || 'info',
  });
};

/**
 * Configure and create the main logger instance.
 */
const createLogger = (): winston.Logger => {
  const transports: winston.transport[] = [];

  // Always include console transport
  transports.push(createConsoleTransport());

  // Add file transports in development and production
  if (config.NODE_ENV !== 'test') {
    transports.push(createFileTransport());
    transports.push(createErrorFileTransport());
  }

  // Add Logtail transport for production
  const logtailTransport = createLogtailTransport();
  if (logtailTransport) {
    transports.push(logtailTransport);
  }

  return winston.createLogger({
    levels: LOG_LEVELS,
    level: String(config.LOG_LEVEL) || 'info',
    format: logFormat,
    transports,
    exitOnError: false,
    rejectionHandlers: [
      new winston.transports.File({ filename: 'logs/rejections.log' }),
    ],
    exceptionHandlers: [
      new winston.transports.File({ filename: 'logs/exceptions.log' }),
    ],
  });
};

// Create the logger instance
export const logger = createLogger();

/**
 * Log correlation utilities for request tracing.
 */
export class LogContext {
  private static contexts = new Map<string, Record<string, any>>();

  /**
   * Set context for a correlation ID.
   */
  static setContext(correlationId: string, context: Record<string, any>): void {
    this.contexts.set(correlationId, {
      ...this.contexts.get(correlationId),
      ...context,
    });
  }

  /**
   * Get context for a correlation ID.
   */
  static getContext(correlationId: string): Record<string, any> {
    return this.contexts.get(correlationId) || {};
  }

  /**
   * Clear context for a correlation ID.
   */
  static clearContext(correlationId: string): void {
    this.contexts.delete(correlationId);
  }

  /**
   * Log with correlation context.
   */
  static log(
    level: string,
    message: string,
    correlationId?: string,
    additionalMeta: Record<string, any> = {}
  ): void {
    const context = correlationId ? this.getContext(correlationId) : {};
    const meta = {
      correlationId,
      ...context,
      ...additionalMeta,
    };

    logger.log(level, message, meta);
  }
}

/**
 * Structured logging helpers for common use cases.
 */
export const LogHelpers = {
  /**
   * Log authentication events.
   */
  auth: {
    login: (userId: string, email: string, correlationId?: string) => {
      LogContext.log('info', 'User login successful', correlationId, {
        event: 'auth.login',
        userId,
        email,
      });
    },

    logout: (userId: string, correlationId?: string) => {
      LogContext.log('info', 'User logout', correlationId, {
        event: 'auth.logout',
        userId,
      });
    },

    loginFailed: (email: string, reason: string, correlationId?: string) => {
      LogContext.log('warn', 'User login failed', correlationId, {
        event: 'auth.login_failed',
        email,
        reason,
      });
    },

    tokenRefresh: (userId: string, correlationId?: string) => {
      LogContext.log('info', 'Token refresh successful', correlationId, {
        event: 'auth.token_refresh',
        userId,
      });
    },
  },

  /**
   * Log database operations.
   */
  database: {
    query: (
      operation: string,
      table: string,
      duration: number,
      correlationId?: string
    ) => {
      LogContext.log('debug', 'Database query executed', correlationId, {
        event: 'db.query',
        operation,
        table,
        duration,
      });
    },

    error: (error: Error, query: string, correlationId?: string) => {
      LogContext.log('error', 'Database error', correlationId, {
        event: 'db.error',
        error: error.message,
        query,
        stack: error.stack || '',
      });
    },

    slowQuery: (query: string, duration: number, correlationId?: string) => {
      LogContext.log('warn', 'Slow database query detected', correlationId, {
        event: 'db.slow_query',
        query,
        duration,
      });
    },
  },

  /**
   * Log API operations.
   */
  api: {
    request: (
      method: string,
      url: string,
      statusCode: number,
      duration: number,
      correlationId?: string
    ) => {
      LogContext.log('http', 'API request processed', correlationId, {
        event: 'api.request',
        method,
        url,
        statusCode,
        duration,
      });
    },

    error: (
      error: Error,
      method: string,
      url: string,
      correlationId?: string
    ) => {
      LogContext.log('error', 'API error', correlationId, {
        event: 'api.error',
        method,
        url,
        error: error.message,
        stack: error.stack || '',
      });
    },

    slowRequest: (
      method: string,
      url: string,
      duration: number,
      correlationId?: string
    ) => {
      LogContext.log('warn', 'Slow API request detected', correlationId, {
        event: 'api.slow_request',
        method,
        url,
        duration,
      });
    },
  },

  /**
   * Log file operations.
   */
  file: {
    upload: (
      fileName: string,
      size: number,
      userId: string,
      correlationId?: string
    ) => {
      LogContext.log('info', 'File upload completed', correlationId, {
        event: 'file.upload',
        fileName,
        size,
        userId,
      });
    },

    download: (fileName: string, userId: string, correlationId?: string) => {
      LogContext.log('info', 'File download requested', correlationId, {
        event: 'file.download',
        fileName,
        userId,
      });
    },

    delete: (fileName: string, userId: string, correlationId?: string) => {
      LogContext.log('info', 'File deleted', correlationId, {
        event: 'file.delete',
        fileName,
        userId,
      });
    },

    error: (
      operation: string,
      fileName: string,
      error: Error,
      correlationId?: string
    ) => {
      LogContext.log('error', 'File operation error', correlationId, {
        event: 'file.error',
        operation,
        fileName,
        error: error.message,
        stack: error.stack || '',
      });
    },
  },

  /**
   * Log security events.
   */
  security: {
    rateLimitExceeded: (
      ip: string,
      endpoint: string,
      correlationId?: string
    ) => {
      LogContext.log('warn', 'Rate limit exceeded', correlationId, {
        event: 'security.rate_limit',
        ip,
        endpoint,
      });
    },

    unauthorizedAccess: (
      ip: string,
      endpoint: string,
      reason: string,
      correlationId?: string
    ) => {
      LogContext.log('warn', 'Unauthorized access attempt', correlationId, {
        event: 'security.unauthorized',
        ip,
        endpoint,
        reason,
      });
    },

    suspiciousActivity: (
      description: string,
      metadata: Record<string, any>,
      correlationId?: string
    ) => {
      LogContext.log('warn', 'Suspicious activity detected', correlationId, {
        event: 'security.suspicious',
        description,
        ...metadata,
      });
    },
  },

  /**
   * Log application events.
   */
  app: {
    startup: (port: number, environment: string) => {
      logger.info('Application started', {
        event: 'app.startup',
        port,
        environment,
        version: config.APP_VERSION || '1.0.0',
        nodeVersion: process.version,
      });
    },

    shutdown: (signal: string) => {
      logger.info('Application shutting down', {
        event: 'app.shutdown',
        signal,
      });
    },

    healthCheck: (
      status: string,
      checks: Record<string, any>,
      correlationId?: string
    ) => {
      LogContext.log('info', 'Health check performed', correlationId, {
        event: 'app.health_check',
        status,
        checks,
      });
    },
  },
};

/**
 * Express.js logging middleware.
 */
export const loggingMiddleware = (req: any, res: any, next: any): void => {
  const startTime = Date.now();
  const correlationId = req.correlationId || req.headers['x-correlation-id'];

  // Set request context
  if (correlationId) {
    LogContext.setContext(correlationId, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.url,
    });
  }

  // Log request start
  LogContext.log('http', 'Request started', correlationId, {
    method: req.method,
    url: req.url,
    ip: req.ip,
  });

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    LogHelpers.api.request(
      req.method,
      req.url,
      res.statusCode,
      duration,
      correlationId
    );

    // Clean up context
    if (correlationId) {
      LogContext.clearContext(correlationId);
    }
  });

  next();
};

// Export configured logger as default
export default logger;
