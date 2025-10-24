import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import { pool, testConnection } from './config/database';
import { LinksRepository } from './repositories/links.repository';
import { AnalyticsRepository } from './repositories/analytics.repository';
import { LinksService } from './services/links.service';
import { LinksController } from './controllers/links.controller';
import { createLinksRoutes } from './routes/links.routes';
import { errorHandler } from './middleware/error.middleware';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3003');
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';

/**
 * Create and configure Express application
 */
function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: CORS_ORIGIN,
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const dbHealthy = await testConnection();
      res.status(dbHealthy ? 200 : 503).json({
        status: dbHealthy ? 'healthy' : 'unhealthy',
        service: 'links-api',
        timestamp: new Date().toISOString(),
        database: dbHealthy ? 'connected' : 'disconnected',
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        service: 'links-api',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Initialize dependencies
  const linksRepo = new LinksRepository(pool);
  const analyticsRepo = new AnalyticsRepository(pool);
  const linksService = new LinksService(linksRepo, analyticsRepo, process.env.BASE_URL);
  const linksController = new LinksController(linksService);

  // Register routes
  app.use(createLinksRoutes(linksController));

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Test database connection
    console.log('🔍 Testing database connection...');
    const dbHealthy = await testConnection();

    if (!dbHealthy) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }

    // Create Express app
    const app = createApp();

    // Start listening
    app.listen(PORT, () => {
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚀 Links Service (Microservice POC)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log(`📡 Server:     http://localhost:${PORT}`);
      console.log(`💚 Health:     http://localhost:${PORT}/health`);
      console.log(`🌍 CORS:       ${CORS_ORIGIN}`);
      console.log(`🔧 Environment: ${NODE_ENV}`);
      console.log('');
      console.log('📋 Endpoints:');
      console.log('   POST   /api/links/generate   - Create short link');
      console.log('   GET    /api/links/me          - Get user links');
      console.log('   GET    /api/links/:shortCode  - Get link details');
      console.log('   PATCH  /api/links/:id         - Update link');
      console.log('   DELETE /api/links/:id         - Delete link');
      console.log('   GET    /:shortCode            - Public redirect');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Start the server
startServer();
