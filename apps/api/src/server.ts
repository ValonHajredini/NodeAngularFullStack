import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Express application server for the API.
 * Handles HTTP requests and middleware configuration.
 */
class Server {
  private app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initializes all middleware for the Express application.
   * Configures security, logging, and request processing.
   */
  private initializeMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:4200',
      credentials: true
    }));
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(morgan('dev'));
  }

  /**
   * Initializes API routes.
   * Sets up health check and future route handlers.
   */
  private initializeRoutes(): void {
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    this.app.get('/api', (req: Request, res: Response) => {
      res.json({
        message: 'NodeAngularFullStack API',
        version: '1.0.0'
      });
    });
  }

  /**
   * Initializes error handling middleware.
   * Handles 404 and general errors with proper responses.
   */
  private initializeErrorHandling(): void {
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Not Found' });
    });

    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error(err.stack);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });
  }

  /**
   * Starts the Express server.
   * @returns Promise that resolves when server is listening
   */
  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`Server is running on http://localhost:${this.port}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        resolve();
      });
    });
  }
}

const server = new Server();
server.start().catch(console.error);