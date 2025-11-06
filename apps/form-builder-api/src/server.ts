import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:4200'],
  credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'form-builder-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Form Builder API',
    version: '1.0.0',
    description: 'Microservice for form management and rendering',
    endpoints: {
      health: '/health',
      forms: '/api/v1/forms (coming soon)',
      submissions: '/api/v1/submissions (coming soon)'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n=� Form Builder API Server Started`);
  console.log(`=� Server: http://localhost:${PORT}`);
  console.log(`=� Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`= CORS Origins: ${process.env.CORS_ORIGINS}`);
  console.log(`� Server time: ${new Date().toLocaleString()}`);
  console.log(`\n=� Available endpoints:`);
  console.log(`  GET  /              - API info`);
  console.log(`  GET  /health        - Health check`);
});

export default app;
