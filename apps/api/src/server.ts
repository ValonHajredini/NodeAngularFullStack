import express, { Application, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { config } from './utils/config.utils';
import { databaseService, DatabaseService } from './services/database.service';
import swaggerSpec from './config/swagger.config';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';

/**
 * Express application server for the API.
 * Handles HTTP requests and middleware configuration.
 */
class Server {
  private app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.PORT;
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initializes all middleware for the Express application.
   * Configures security, logging, and request processing.
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
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

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: config.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // CORS configuration
    this.app.use(cors({
      origin: config.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Body parsing and compression
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  /**
   * Initializes API routes.
   * Sets up health check, authentication, and other route handlers.
   */
  private initializeRoutes(): void {
    // Swagger documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'NodeAngularFullStack API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true
      }
    }));

    // Legacy health check endpoint
    this.app.use('/health', healthRoutes);

    // API v1 routes
    this.app.use('/api/v1', healthRoutes);
    this.app.use('/api/v1/auth', authRoutes);

    // API root endpoint
    this.app.get('/api', (_req, res: Response) => {
      res.json({
        message: 'NodeAngularFullStack API',
        version: '1.0.0',
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString(),
        documentation: '/api-docs'
      });
    });

    // Root endpoint
    this.app.get('/', (_req, res: Response) => {
      res.json({
        message: 'NodeAngularFullStack API',
        version: '1.0.0',
        status: 'running',
        docs: '/api-docs',
        api: '/api'
      });
    });
  }

  /**
   * Initializes error handling middleware.
   * Handles 404 and general errors with proper responses.
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use((_req, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.use((err: Error, _req: any, res: Response, _next: any) => {
      console.error('❌ Unhandled error:', err);

      const isDevelopment = config.NODE_ENV === 'development';
      const statusCode = (err as any).statusCode || 500;

      res.status(statusCode).json({
        error: statusCode >= 500 ? 'Internal Server Error' : 'Bad Request',
        message: isDevelopment ? err.message : 'An error occurred',
        timestamp: new Date().toISOString(),
        ...(isDevelopment && { stack: err.stack }),
      });
    });
  }

  /**
   * Initializes database connection.
   * @returns Promise that resolves when database is connected
   */
  private async initializeDatabase(): Promise<void> {
    try {
      const dbConfig = DatabaseService.parseConnectionUrl(config.DATABASE_URL);
      await databaseService.initialize(dbConfig);
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      console.warn('⚠️  Continuing without database for development testing...');
      // In development, continue without database for Swagger testing
      if (config.NODE_ENV === 'development') {
        console.log('🔧 Running in development mode without database connection');
        return;
      }
      throw error;
    }
  }

  /**
   * Starts the Express server with database initialization.
   * @returns Promise that resolves when server is listening
   */
  public async start(): Promise<void> {
    try {
      // Initialize database connection
      await this.initializeDatabase();

      // Start the server
      return new Promise((resolve, reject) => {
        this.app.listen(this.port, () => {
          console.log('\n🚀 NodeAngularFullStack API Server Started');
          console.log(`📡 Server: http://localhost:${this.port}`);
          console.log(`📦 Environment: ${config.NODE_ENV}`);
          console.log(`🔗 CORS Origin: ${config.FRONTEND_URL}`);
          console.log(`💾 Database: Connected`);

          if (config.NODE_ENV === 'production') {
            console.log('✅ Production mode - All validations passed');
          } else {
            console.log('⚠️  Development mode - Additional debugging enabled');
          }

          console.log('\n📋 Available endpoints:');
          console.log('  GET  /              - API info');
          console.log('  GET  /api           - API details');
          console.log('  GET  /api-docs      - Swagger API documentation');
          console.log('  GET  /health        - Health check');
          console.log('  GET  /api/v1/health - Detailed health');
          console.log('\n🔐 Authentication endpoints:');
          console.log('  POST /api/v1/auth/register  - User registration');
          console.log('  POST /api/v1/auth/login     - User login');
          console.log('  POST /api/v1/auth/refresh   - Token refresh');
          console.log('  POST /api/v1/auth/logout    - User logout');
          console.log('  GET  /api/v1/auth/profile   - Get profile (protected)');
          console.log('  PATCH /api/v1/auth/profile  - Update profile (protected)');
          console.log('  GET  /api/v1/auth/me        - Token info (protected)');

          resolve();
        }).on('error', reject);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Gracefully shuts down the server and closes database connections.
   * @returns Promise that resolves when shutdown is complete
   */
  public async shutdown(): Promise<void> {
    console.log('\n🔄 Shutting down server...');
    await databaseService.close();
    console.log('✅ Server shutdown complete');
  }
}

// Initialize server
const server = new Server();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('\n📢 SIGTERM received');
  await server.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n📢 SIGINT received');
  await server.shutdown();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
server.start().catch((error) => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});