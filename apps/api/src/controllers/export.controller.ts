import { Response, NextFunction } from 'express';
import { ExportOrchestratorService } from '../services/export-orchestrator.service';
import { PreFlightValidator } from '../services/pre-flight-validator.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { AsyncHandler } from '../utils/async-handler.utils';
import { createErrorResponse } from '../types/api-response.types';
import { Logger } from '../utils/logger.utils';
import NodeCache from 'node-cache';

/**
 * HTTP status codes used throughout the controller
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Export Controller
 * Handles HTTP requests for export job operations.
 *
 * Provides endpoints for:
 * - Starting export jobs
 * - Retrieving export job status
 * - Cancelling export jobs
 *
 * All endpoints require JWT authentication and enforce proper authorization.
 *
 * Story 33.1.3: Export Job Status Tracking
 *
 * @example
 * const orchestratorService = new ExportOrchestratorService(toolRepo, exportJobRepo);
 * const controller = new ExportController(orchestratorService);
 *
 * router.post('/tools/:toolId/export', authMiddleware, controller.startExport);
 */
export class ExportController {
  private readonly logger: Logger;
  private readonly validationCache: NodeCache;

  /**
   * Creates an instance of ExportController.
   * @param orchestratorService - Export orchestrator service for business logic
   * @param preFlightValidator - Pre-flight validation service
   */
  constructor(
    private readonly orchestratorService: ExportOrchestratorService,
    private readonly preFlightValidator: PreFlightValidator
  ) {
    this.logger = new Logger('ExportController');
    // Initialize validation cache with 5 minute TTL
    this.validationCache = new NodeCache({ stdTTL: 300 });
  }

  /**
   * Start export job for a tool.
   *
   * Creates a new export job and initiates asynchronous export process.
   * Returns job record immediately without waiting for completion.
   *
   * @route POST /api/tool-registry/tools/:toolId/export
   * @access Protected - Requires JWT authentication and export permission
   * @param req - Express request object with toolId in params
   * @param res - Express response object
   * @param next - Express next function
   * @returns 201 Created with export job record
   * @throws {Error} 404 - Tool not found
   * @throws {Error} 403 - User lacks export permission
   * @throws {Error} 500 - Internal server error
   *
   * @example
   * POST /api/tool-registry/tools/tool-forms-123/export
   * Authorization: Bearer <jwt-token>
   *
   * Response 201:
   * {
   *   "jobId": "job-abc-123",
   *   "toolId": "tool-forms-123",
   *   "userId": "user-456",
   *   "status": "pending",
   *   "stepsCompleted": 0,
   *   "stepsTotal": 0,
   *   "currentStep": "Initializing...",
   *   "createdAt": "2025-10-26T10:30:00Z",
   *   "updatedAt": "2025-10-26T10:30:00Z"
   * }
   *
   * @swagger
   * /api/tool-registry/tools/{toolId}/export:
   *   post:
   *     summary: Start export job for a tool
   *     description: Creates export job and initiates asynchronous package generation
   *     tags: [Export]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: toolId
   *         required: true
   *         schema:
   *           type: string
   *         description: Tool registry identifier (e.g., 'tool-forms-123')
   *     responses:
   *       201:
   *         description: Export job created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ExportJob'
   *       403:
   *         description: User does not have export permission
   *       404:
   *         description: Tool not found
   *       500:
   *         description: Internal server error
   */
  startExport = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { toolId } = req.params;
        const userId = req.user!.userId;

        this.logger.info('Starting export job', { toolId, userId });

        // Start export job (orchestrator handles all business logic)
        const job = await this.orchestratorService.startExport(toolId, userId);

        this.logger.info('Export job created successfully', {
          jobId: job.jobId,
          toolId,
          userId,
        });

        res.status(HTTP_STATUS.CREATED).json(job);
      } catch (error: any) {
        // Handle tool not found error
        if (
          error.message.includes('not found') ||
          error.message.includes('does not exist')
        ) {
          this.logger.warn('Tool not found for export', {
            toolId: req.params.toolId,
            userId: req.user!.userId,
            error: error.message,
          });

          res
            .status(HTTP_STATUS.NOT_FOUND)
            .json(createErrorResponse(error.message, 'TOOL_NOT_FOUND'));
          return;
        }

        // Log unexpected errors and pass to error middleware
        this.logger.error('Error starting export job', {
          toolId: req.params.toolId,
          userId: req.user!.userId,
          error: error.message,
          stack: error.stack,
        });

        next(error);
      }
    }
  );

  /**
   * Get export job status.
   *
   * Retrieves current status, progress, and metadata for an export job.
   * Supports polling for real-time updates.
   *
   * @route GET /api/tool-registry/export-jobs/:jobId
   * @access Protected - Requires JWT authentication
   * @param req - Express request object with jobId in params
   * @param res - Express response object
   * @param next - Express next function
   * @returns 200 OK with export job record
   * @throws {Error} 404 - Export job not found
   * @throws {Error} 429 - Rate limit exceeded (max 10 req/sec)
   * @throws {Error} 500 - Internal server error
   *
   * @example
   * GET /api/tool-registry/export-jobs/job-abc-123
   * Authorization: Bearer <jwt-token>
   *
   * Response 200:
   * {
   *   "jobId": "job-abc-123",
   *   "toolId": "tool-forms-123",
   *   "userId": "user-456",
   *   "status": "in_progress",
   *   "stepsCompleted": 5,
   *   "stepsTotal": 8,
   *   "currentStep": "Generating Docker configuration...",
   *   "progressPercentage": 62,
   *   "packagePath": null,
   *   "packageSizeBytes": null,
   *   "errorMessage": null,
   *   "createdAt": "2025-10-26T10:30:00Z",
   *   "updatedAt": "2025-10-26T10:32:15Z",
   *   "startedAt": "2025-10-26T10:30:05Z",
   *   "completedAt": null
   * }
   *
   * @swagger
   * /api/tool-registry/export-jobs/{jobId}:
   *   get:
   *     summary: Get export job status
   *     description: Retrieves current status and progress of an export job
   *     tags: [Export]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: jobId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Export job ID
   *     responses:
   *       200:
   *         description: Export job status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ExportJob'
   *       404:
   *         description: Export job not found
   *       429:
   *         description: Rate limit exceeded (max 10 req/sec)
   *       500:
   *         description: Internal server error
   */
  getExportStatus = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { jobId } = req.params;

        this.logger.debug('Retrieving export job status', {
          jobId,
          userId: req.user!.userId,
        });

        const job = await this.orchestratorService.getExportStatus(jobId);

        // Set cache control headers (no caching for real-time data)
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        // Calculate progress percentage if not already set
        const response = {
          ...job,
          progressPercentage:
            job.stepsTotal > 0
              ? Math.round((job.stepsCompleted / job.stepsTotal) * 100)
              : 0,
        };

        res.status(HTTP_STATUS.OK).json(response);
      } catch (error: any) {
        // Handle job not found error
        if (
          error.message.includes('not found') ||
          error.message.includes('does not exist')
        ) {
          this.logger.warn('Export job not found', {
            jobId: req.params.jobId,
            userId: req.user!.userId,
          });

          res
            .status(HTTP_STATUS.NOT_FOUND)
            .json(createErrorResponse(error.message, 'JOB_NOT_FOUND'));
          return;
        }

        // Log unexpected errors and pass to error middleware
        this.logger.error('Error retrieving export job status', {
          jobId: req.params.jobId,
          userId: req.user!.userId,
          error: error.message,
          stack: error.stack,
        });

        next(error);
      }
    }
  );

  /**
   * Cancel export job.
   *
   * Initiates graceful cancellation of an in-progress export job.
   * Only job creator or admin users can cancel jobs.
   * Jobs can only be cancelled if status is 'pending' or 'in_progress'.
   *
   * @route POST /api/tool-registry/export-jobs/:jobId/cancel
   * @access Protected - Requires JWT authentication and job ownership or admin role
   * @param req - Express request object with jobId in params
   * @param res - Express response object
   * @param next - Express next function
   * @returns 200 OK with cancellation confirmation
   * @throws {Error} 403 - Unauthorized to cancel this job
   * @throws {Error} 404 - Export job not found
   * @throws {Error} 409 - Job cannot be cancelled (already completed/failed)
   * @throws {Error} 500 - Internal server error
   *
   * @example
   * POST /api/tool-registry/export-jobs/job-abc-123/cancel
   * Authorization: Bearer <jwt-token>
   *
   * Response 200:
   * {
   *   "message": "Export job cancelled successfully",
   *   "jobId": "job-abc-123",
   *   "status": "cancelling"
   * }
   *
   * @swagger
   * /api/tool-registry/export-jobs/{jobId}/cancel:
   *   post:
   *     summary: Cancel export job
   *     description: Initiates graceful cancellation of an export job
   *     tags: [Export]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: jobId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Export job ID
   *     responses:
   *       200:
   *         description: Export job cancelled successfully
   *       403:
   *         description: Unauthorized to cancel this job
   *       404:
   *         description: Export job not found
   *       409:
   *         description: Job cannot be cancelled in current status
   *       500:
   *         description: Internal server error
   */
  cancelExport = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { jobId } = req.params;
        const userId = req.user!.userId;
        const isAdmin = req.user!.role === 'admin';

        this.logger.info('Attempting to cancel export job', {
          jobId,
          userId,
          isAdmin,
        });

        // Retrieve job to check ownership and status
        const job = await this.orchestratorService.getExportStatus(jobId);

        // Verify user is job creator or admin
        if (job.userId !== userId && !isAdmin) {
          this.logger.warn('Unauthorized cancellation attempt', {
            jobId,
            requestingUserId: userId,
            jobOwnerUserId: job.userId,
          });

          res
            .status(HTTP_STATUS.FORBIDDEN)
            .json(
              createErrorResponse(
                'Unauthorized to cancel this export job',
                'UNAUTHORIZED_CANCELLATION'
              )
            );
          return;
        }

        // Verify job can be cancelled (must be pending or in_progress)
        if (job.status !== 'pending' && job.status !== 'in_progress') {
          this.logger.warn('Cannot cancel job in current status', {
            jobId,
            currentStatus: job.status,
            userId,
          });

          res
            .status(HTTP_STATUS.CONFLICT)
            .json(
              createErrorResponse(
                `Cannot cancel job with status: ${job.status}`,
                'INVALID_JOB_STATUS'
              )
            );
          return;
        }

        // Cancel job via orchestrator
        await this.orchestratorService.cancelExport(jobId, userId);

        this.logger.info('Export job cancelled successfully', {
          jobId,
          userId,
        });

        res.status(HTTP_STATUS.OK).json({
          message: 'Export job cancelled successfully',
          jobId,
          status: 'cancelling',
        });
      } catch (error: any) {
        // Handle job not found error
        if (
          error.message.includes('not found') ||
          error.message.includes('does not exist')
        ) {
          this.logger.warn('Export job not found for cancellation', {
            jobId: req.params.jobId,
            userId: req.user!.userId,
          });

          res
            .status(HTTP_STATUS.NOT_FOUND)
            .json(createErrorResponse(error.message, 'JOB_NOT_FOUND'));
          return;
        }

        // Log unexpected errors and pass to error middleware
        this.logger.error('Error cancelling export job', {
          jobId: req.params.jobId,
          userId: req.user!.userId,
          error: error.message,
          stack: error.stack,
        });

        next(error);
      }
    }
  );

  /**
   * Validate tool before export.
   *
   * Runs pre-flight validation checks without creating an export job.
   * Returns validation report with errors, warnings, and info.
   * Results are cached for 5 minutes to reduce redundant checks.
   *
   * @route POST /api/tool-registry/tools/:toolId/export/validate
   * @access Protected - Requires JWT authentication
   * @param req - Express request object with toolId in params
   * @param res - Express response object
   * @param next - Express next function
   * @returns 200 OK if validation passed, 422 Unprocessable Entity if validation failed
   * @throws {Error} 404 - Tool not found
   * @throws {Error} 500 - Internal server error
   *
   * @example
   * POST /api/tool-registry/tools/tool-forms-123/export/validate
   * Authorization: Bearer <jwt-token>
   *
   * Response 200 (validation passed):
   * {
   *   "success": true,
   *   "errors": [],
   *   "warnings": [
   *     { "message": "Form has no submissions yet", "field": "form_submissions" }
   *   ],
   *   "info": [
   *     "Tool 'Customer Form' (forms) found",
   *     "Form has 5 fields",
   *     "Disk space: 1500MB available"
   *   ],
   *   "timestamp": "2025-10-26T10:30:00Z",
   *   "estimatedDurationMs": 35000
   * }
   *
   * Response 422 (validation failed):
   * {
   *   "success": false,
   *   "errors": [
   *     { "message": "Form schema abc-123 not found", "field": "form_schema" },
   *     { "message": "Insufficient disk space: 250MB available, 500MB required", "field": "disk_space" }
   *   ],
   *   "warnings": [],
   *   "info": ["Tool 'Test Form' (forms) found"],
   *   "timestamp": "2025-10-26T10:30:00Z"
   * }
   *
   * @swagger
   * /api/tool-registry/tools/{toolId}/export/validate:
   *   post:
   *     summary: Validate tool before export
   *     description: Runs pre-flight validation checks without creating export job
   *     tags: [Export]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: toolId
   *         required: true
   *         schema:
   *           type: string
   *         description: Tool registry identifier (e.g., 'tool-forms-123')
   *     responses:
   *       200:
   *         description: Validation completed (check success field)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ValidationResult'
   *       422:
   *         description: Validation failed with errors
   *       404:
   *         description: Tool not found
   *       500:
   *         description: Internal server error
   */
  validateExport = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { toolId } = req.params;
        const userId = req.user!.userId;

        this.logger.info('Running export validation', { toolId, userId });

        // Check cache first
        const cacheKey = `validation:${toolId}`;
        const cachedResult = this.validationCache.get(cacheKey);

        if (cachedResult) {
          this.logger.debug('Returning cached validation result', {
            toolId,
            userId,
          });
          res.status(HTTP_STATUS.OK).json(cachedResult);
          return;
        }

        // Run validation
        const result = await this.preFlightValidator.validate(toolId);

        // Cache for 5 minutes
        this.validationCache.set(cacheKey, result);

        // Log validation result
        this.logger.info('Validation completed', {
          toolId,
          userId,
          success: result.success,
          errorCount: result.errors.length,
          warningCount: result.warnings.length,
        });

        // Return 422 if validation failed, 200 if passed
        const statusCode = result.success
          ? HTTP_STATUS.OK
          : HTTP_STATUS.UNPROCESSABLE_ENTITY;

        res.status(statusCode).json(result);
      } catch (error: any) {
        // Handle tool not found error
        if (
          error.message.includes('not found') ||
          error.message.includes('does not exist')
        ) {
          this.logger.warn('Tool not found for validation', {
            toolId: req.params.toolId,
            userId: req.user!.userId,
            error: error.message,
          });

          res
            .status(HTTP_STATUS.NOT_FOUND)
            .json(createErrorResponse(error.message, 'TOOL_NOT_FOUND'));
          return;
        }

        // Log unexpected errors and pass to error middleware
        this.logger.error('Error during validation', {
          toolId: req.params.toolId,
          userId: req.user!.userId,
          error: error.message,
          stack: error.stack,
        });

        next(error);
      }
    }
  );
}
