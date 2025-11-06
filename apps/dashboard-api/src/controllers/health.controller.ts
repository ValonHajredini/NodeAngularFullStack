import { Request, Response } from 'express';
import { databaseService } from '../services/database.service';
import { config } from '../utils/config.utils';

/**
 * Health check response interface
 */
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'error';
      connections?: {
        total: number;
        idle: number;
        waiting: number;
      };
      latency?: number;
      error?: string;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

/**
 * Health controller for system status endpoints.
 * Provides comprehensive health checks for the API and its dependencies.
 */
export class HealthController {
  /**
   * Comprehensive health check endpoint.
   * Returns system status, database connectivity, and resource usage.
   * @param req - Express request
   * @param res - Express response
   */
  public static async getHealth(_req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Get memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

      // Initialize response
      const healthResponse: HealthCheckResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: config.NODE_ENV,
        version: '1.0.0',
        services: {
          database: {
            status: 'disconnected',
          },
          memory: {
            used: memoryUsedMB,
            total: memoryTotalMB,
            percentage: Math.round((memoryUsedMB / memoryTotalMB) * 100),
          },
        },
      };

      // Test database connectivity
      try {
        const dbStart = Date.now();
        await databaseService.testConnection();
        const dbLatency = Date.now() - dbStart;

        const dbStatus = databaseService.getStatus();
        healthResponse.services.database = {
          status: 'connected',
          latency: dbLatency,
          connections: {
            total: dbStatus.totalConnections || 0,
            idle: dbStatus.idleConnections || 0,
            waiting: dbStatus.waitingClients || 0,
          },
        };
      } catch (error) {
        healthResponse.status = 'unhealthy';
        healthResponse.services.database = {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown database error',
        };
      }

      // Determine overall status
      const isHealthy = healthResponse.services.database.status === 'connected';
      healthResponse.status = isHealthy ? 'healthy' : 'unhealthy';

      const statusCode = isHealthy ? 200 : 503;
      res.status(statusCode).json(healthResponse);

      // Log health check performance
      const totalLatency = Date.now() - startTime;
      if (config.NODE_ENV === 'development') {
        console.log(`🔍 Health check completed in ${totalLatency}ms - Status: ${healthResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);

      const errorResponse: HealthCheckResponse = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: config.NODE_ENV,
        version: '1.0.0',
        services: {
          database: {
            status: 'error',
            error: 'Health check failed',
          },
          memory: {
            used: 0,
            total: 0,
            percentage: 0,
          },
        },
      };

      res.status(500).json(errorResponse);
    }
  }

  /**
   * Simple readiness check endpoint.
   * Returns basic server status without detailed checks.
   * @param req - Express request
   * @param res - Express response
   */
  public static async getReadiness(_req: Request, res: Response): Promise<void> {
    try {
      const dbStatus = databaseService.getStatus();
      const isReady = dbStatus.isConnected;

      res.status(isReady ? 200 : 503).json({
        status: isReady ? 'ready' : 'not ready',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus.isConnected ? 'ready' : 'not ready',
        },
      });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Simple liveness check endpoint.
   * Returns basic server status to indicate the server is alive.
   * @param req - Express request
   * @param res - Express response
   */
  public static async getLiveness(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    });
  }
}