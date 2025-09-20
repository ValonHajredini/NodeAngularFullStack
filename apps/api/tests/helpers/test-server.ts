/**
 * @fileoverview Test server helper for creating Express app instances for testing
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from '../../src/utils/config.utils';
import healthRoutes from '../../src/routes/health.routes';

/**
 * Creates an Express application configured for testing.
 * This mimics the server setup but returns the app instance for supertest.
 */
export function createTestApp(): express.Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // Rate limiting (more lenient for testing)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // High limit for testing
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);

  // CORS configuration
  app.use(cors({
    origin: config.FRONTEND_URL,
    credentials: true,
    optionsSuccessStatus: 200,
  }));

  // Request parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression middleware
  app.use(compression());

  // Logging middleware (silent in test)
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // Health routes
  app.use(healthRoutes);

  // Global error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('❌ Test app error:', err);

    const isDevelopment = config.NODE_ENV === 'development';
    const statusCode = (err as any).statusCode || (err as any).status || 500;

    res.status(statusCode).json({
      success: false,
      error: statusCode >= 500 ? 'Internal Server Error' : err.message || 'Bad Request',
      timestamp: new Date().toISOString(),
      ...(isDevelopment && { stack: err.stack }),
    });
  });

  return app;
}

/**
 * Creates a server instance for testing that mimics the production createServer pattern.
 * Returns both app and server for compatibility with existing tests.
 */
export async function createServer() {
  const app = createTestApp();

  // For testing, we return a mock server object
  const server = {
    listening: true,
    close: () => {},
    address: () => ({ port: 3000 })
  };

  return { app, server };
}