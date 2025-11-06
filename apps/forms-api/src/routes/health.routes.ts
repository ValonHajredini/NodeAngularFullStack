import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

/**
 * Health check routes for monitoring and status endpoints.
 * Provides various health check endpoints for different monitoring needs.
 */
const router = Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Comprehensive health check
 *     description: Returns detailed health status including database connectivity and system metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Process uptime in seconds
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: connected
 *                     responseTime:
 *                       type: number
 *                       description: Database response time in ms
 *                 environment:
 *                   type: string
 *                   example: development
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/health', HealthController.getHealth);

/**
 * @swagger
 * /api/v1/health/readiness:
 *   get:
 *     summary: Kubernetes readiness probe
 *     description: Returns 200 if service is ready to accept traffic, 503 otherwise
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ready
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Service is not ready
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/health/readiness', HealthController.getReadiness);

/**
 * @swagger
 * /api/v1/health/liveness:
 *   get:
 *     summary: Kubernetes liveness probe
 *     description: Returns 200 if service is alive, used to determine if container should be restarted
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: alive
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health/liveness', HealthController.getLiveness);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Legacy health endpoint
 *     description: Backward compatibility health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: alive
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/', HealthController.getLiveness);

export default router;