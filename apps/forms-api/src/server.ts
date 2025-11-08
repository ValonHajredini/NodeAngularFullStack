import dotenv from 'dotenv';

// Load environment-specific .env file
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: envFile });

import express, { Application, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import { config } from './utils/config.utils';
import { appConfig } from './config/app.config';
// DEPRECATED: Legacy monolithic database service - now using multi-database pools
// import { databaseService, DatabaseService } from './services/database.service';
import swaggerSpec from './config/swagger.config';
import healthRoutes from './routes/health.routes';
// REMOVED: Tools, drawing projects, tool registry, and exports belong in dashboard-api
// These routes query dashboard database tables, not forms database tables
// import { testToolRoutes } from './routes/test-tool.routes';
// import toolsRoutes from './routes/tools.routes';
// import publicToolsRoutes from './routes/public-tools.routes';
// import drawingProjectsRoutes from './routes/drawing-projects.routes';
// import { toolRegistryRoutes } from './routes/tool-registry.routes';
// import { exportRoutes } from './routes/export.routes';
import shortLinksRoutes from './routes/short-links.routes';
import { formsRoutes } from './routes/forms.routes';
import { publicFormsRoutes } from './routes/public-forms.routes';
import { themesRoutes } from './routes/themes.routes';
import { shortLinksController } from './controllers/short-links.controller';
import { resolveShortLinkValidator } from './validators/url.validators';

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
    this.app.use(
      helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            // Story 26.4: Allow iframe embedding for form publishing
            frameAncestors: ["'self'", '*'],
          },
        },
        // Story 26.4: Configure X-Frame-Options to allow iframe embedding
        frameguard: {
          action: 'sameorigin', // Allow same-origin framing, can be configured per route
        },
      })
    );

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
    this.app.use(
      cors({
        origin: appConfig.cors.origins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      })
    );

    // Body parsing and compression
    this.app.use(compression());

    // Apply JSON parsing to all routes except file uploads
    this.app.use((req, res, next) => {
      // Skip JSON parsing for file upload routes
      const skipJsonParsing =
        (req.path === '/api/v1/users/avatar' && req.method === 'POST') ||
        (req.path.includes('/upload-image') && req.method === 'POST') ||
        (req.path.includes('/upload-background') && req.method === 'POST');

      if (skipJsonParsing) {
        next();
      } else {
        express.json({ limit: '10mb' })(req, res, next);
      }
    });

    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  /**
   * Initializes API routes.
   * Sets up health check, authentication, and other route handlers.
   */
  private initializeRoutes(): void {
    // Swagger JSON endpoint (must be before the UI middleware)
    this.app.get('/api-docs/swagger.json', (_req, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // Swagger documentation
    this.app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'NodeAngularFullStack API Documentation',
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
          tryItOutEnabled: true,
        },
      })
    );

    // Serve uploaded files statically in development
    if (config.NODE_ENV === 'development') {
      this.app.use(
        '/uploads',
        express.static(path.join(process.cwd(), 'uploads'))
      );
    }

    // Legacy health check endpoint
    this.app.use('/health', healthRoutes);

    // Public redirect route (must be before API routes)
    this.app.get(
      '/s/:code',
      resolveShortLinkValidator,
      shortLinksController.redirectToOriginalUrl
    );

    // API v1 routes - Forms API (Forms, Themes, Short Links for Forms)
    // Multi-database architecture: Forms-API only serves forms database tables
    // Tools, drawing projects, registry, and exports are served by dashboard-api
    this.app.use('/api/v1/forms', formsRoutes);
    this.app.use('/api/v1/themes', themesRoutes);
    this.app.use('/api/v1/public', publicFormsRoutes);
    this.app.use('/api/v1/tools/short-links', shortLinksRoutes); // Form short links only
    this.app.use('/api/v1', healthRoutes);

    // API root endpoint
    this.app.get('/api', (_req, res: Response) => {
      res.json({
        message: 'NodeAngularFullStack API',
        version: '1.0.0',
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString(),
        documentation: '/api-docs',
      });
    });

    // Root endpoint
    this.app.get('/', (_req, res: Response) => {
      res.json({
        message: 'NodeAngularFullStack API',
        version: '1.0.0',
        status: 'running',
        docs: '/api-docs',
        api: '/api',
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
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found',
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.use((err: Error, _req: any, res: Response, _next: any) => {
      console.error('❌ Unhandled error:', err);

      const isDevelopment =
        config.NODE_ENV === 'development' || config.NODE_ENV === 'test';
      const statusCode = (err as any).statusCode || 500;

      res.status(statusCode).json({
        success: false,
        error: statusCode >= 500 ? 'Internal Server Error' : 'Bad Request',
        message: isDevelopment ? err.message : 'An error occurred',
        timestamp: new Date().toISOString(),
        ...((err as any).errors && { errors: (err as any).errors }),
        ...(isDevelopment && { stack: err.stack }),
      });
    });
  }

  /**
   * DEPRECATED: Legacy monolithic database initialization.
   * Multi-database pools (authPool, dashboardPool, formsPool) are now initialized
   * automatically via imports in multi-database.config.ts and used directly by repositories.
   */
  // private async initializeDatabase(): Promise<void> {
  //   try {
  //     const dbConfig = DatabaseService.parseConnectionUrl(config.DATABASE_URL);
  //     await databaseService.initialize(dbConfig);
  //   } catch (error) {
  //     console.error('❌ Failed to initialize database:', error);
  //     console.warn(
  //       '⚠️  Continuing without database for development testing...'
  //     );
  //     // In development, continue without database for Swagger testing
  //     if (config.NODE_ENV === 'development') {
  //       console.log(
  //         '🔧 Running in development mode without database connection'
  //       );
  //       return;
  //     }
  //     throw error;
  //   }
  // }

  /**
   * Starts the Express server.
   * Multi-database pools are initialized automatically via imports.
   * @returns Promise that resolves when server is listening
   */
  public async start(): Promise<void> {
    try {
      // DEPRECATED: Legacy database initialization - pools now auto-initialized via imports
      // await this.initializeDatabase();

      // Start the server
      return new Promise((resolve, reject) => {
        this.app
          .listen(this.port, () => {
            console.log('\n🚀 NodeAngularFullStack API Server Started');
            console.log(`📡 Server: http://localhost:${this.port}`);
            console.log(`📦 Environment: ${config.NODE_ENV}`);
            console.log(
              `🔗 CORS Origins: ${appConfig.cors.origins.join(', ')}`
            );
            console.log(`💾 Database: Connected`);

            if (config.NODE_ENV === 'production') {
              console.log('✅ Production mode - All validations passed');
            } else {
              console.log(
                '⚠️  Development mode - Additional debugging enabled'
              );
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
            console.log(
              '  GET  /api/v1/auth/profile   - Get profile (protected)'
            );
            console.log(
              '  PATCH /api/v1/auth/profile  - Update profile (protected)'
            );
            console.log(
              '  GET  /api/v1/auth/me        - Token info (protected)'
            );
            console.log('\n👥 User management endpoints:');
            console.log('  POST   /api/v1/users        - Create user (admin)');
            console.log(
              '  GET    /api/v1/users        - Get users with pagination (admin)'
            );
            console.log(
              '  GET    /api/v1/users/:id    - Get user by ID (protected)'
            );
            console.log('  PUT    /api/v1/users/:id    - Update user (admin)');
            console.log(
              '  PATCH  /api/v1/users/:id    - Partial update user (protected)'
            );
            console.log('  DELETE /api/v1/users/:id    - Delete user (admin)');
            console.log('\n🔑 API token endpoints:');
            console.log(
              '  POST   /api/v1/tokens      - Create API token (protected)'
            );
            console.log(
              '  GET    /api/v1/tokens      - List user tokens (protected)'
            );
            console.log(
              '  GET    /api/v1/tokens/:id  - Get token info (protected)'
            );
            console.log(
              '  PATCH  /api/v1/tokens/:id  - Update token (protected)'
            );
            console.log(
              '  DELETE /api/v1/tokens/:id  - Revoke token (protected)'
            );

            resolve();
          })
          .on('error', reject);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Gets the Express application instance for testing.
   * @returns Express application instance
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Gracefully shuts down the server and closes database connections.
   * @returns Promise that resolves when shutdown is complete
   */
  public async shutdown(): Promise<void> {
    console.log('\n🔄 Shutting down server...');
    // DEPRECATED: Legacy database service - pools will be closed by Node.js process exit
    // await databaseService.close();
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

// Export app for testing
export const app = server.getApp();

// Start the server
server.start().catch((error) => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});
