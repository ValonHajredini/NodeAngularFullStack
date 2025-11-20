import { Response, NextFunction } from 'express';
import { ExportOrchestratorService } from '../services/export-orchestrator.service';
import { PreFlightValidator } from '../services/pre-flight-validator.service';
import { ExportJobRepository } from '../repositories/export-job.repository';
import { AuthRequest } from '../middleware/auth.middleware';
import { AsyncHandler } from '../utils/async-handler.utils';
import { createErrorResponse } from '../types/api-response.types';
import { Logger } from '../utils/logger.utils';
import { FileUtils } from '../utils/file.utils';
import {
  logIntegrityVerified,
  logLegacyDownload,
} from '../utils/security-events.utils';
import {
  ExportJobsListResponse,
  ListExportJobsOptions,
} from '@nodeangularfullstack/shared';
import NodeCache from 'node-cache';
import * as fs from 'fs';
import * as path from 'path';

/**
 * HTTP status codes used throughout the controller
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  PARTIAL_CONTENT: 206,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  GONE: 410,
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
   * @param exportJobRepository - Export job repository for data access
   */
  constructor(
    private readonly orchestratorService: ExportOrchestratorService,
    private readonly preFlightValidator: PreFlightValidator,
    private readonly exportJobRepository: ExportJobRepository
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
   * Get package checksum for verification.
   *
   * Returns SHA-256 checksum of the export package for integrity verification.
   * Clients can use this to verify package integrity after download.
   *
   * @route GET /api/tool-registry/export-jobs/:jobId/checksum
   * @access Protected - Requires JWT authentication
   * @param req - Express request object with jobId in params
   * @param res - Express response object
   * @param next - Express next function
   * @returns 200 OK with checksum metadata
   * @throws {Error} 404 - Export job not found or package not ready
   * @throws {Error} 400 - Job not completed or checksum not available
   * @throws {Error} 429 - Rate limit exceeded (max 10 req/min)
   * @throws {Error} 500 - Internal server error
   *
   * @example
   * GET /api/tool-registry/export-jobs/job-abc-123/checksum
   * Authorization: Bearer <jwt-token>
   *
   * Response 200:
   * {
   *   "jobId": "job-abc-123",
   *   "packageChecksum": "a3f5b1c2d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
   *   "algorithm": "sha256",
   *   "packageSizeBytes": 12582912,
   *   "packageSizeMB": "12.0 MB",
   *   "createdAt": "2025-10-26T10:30:00Z",
   *   "verifiedAt": "2025-10-26T10:35:00Z"
   * }
   *
   * @swagger
   * /api/tool-registry/export-jobs/{jobId}/checksum:
   *   get:
   *     summary: Get package checksum for verification
   *     description: Returns SHA-256 checksum of export package for integrity verification
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
   *         description: Package checksum retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 jobId:
   *                   type: string
   *                   format: uuid
   *                   description: Export job identifier
   *                 packageChecksum:
   *                   type: string
   *                   pattern: ^[0-9a-f]{64}$
   *                   description: SHA-256 checksum (64 lowercase hex characters)
   *                 algorithm:
   *                   type: string
   *                   enum: [sha256]
   *                   description: Hashing algorithm used
   *                 packageSizeBytes:
   *                   type: integer
   *                   description: Package size in bytes
   *                 packageSizeMB:
   *                   type: string
   *                   description: Human-readable package size
   *                 createdAt:
   *                   type: string
   *                   format: date-time
   *                   description: Package creation timestamp
   *                 verifiedAt:
   *                   type: string
   *                   format: date-time
   *                   description: Last verification timestamp
   *       400:
   *         description: Job not completed or checksum not available
   *       404:
   *         description: Export job not found
   *       429:
   *         description: Rate limit exceeded (max 10 req/min)
   *       500:
   *         description: Internal server error
   */
  getPackageChecksum = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { jobId } = req.params;

        this.logger.info('Retrieving package checksum', {
          jobId,
          userId: req.user!.userId,
        });

        // Get export job
        const job = await this.orchestratorService.getExportStatus(jobId);

        // Validate job is completed
        if (job.status !== 'completed') {
          this.logger.warn('Package checksum requested for non-completed job', {
            jobId,
            status: job.status,
            userId: req.user!.userId,
          });

          res
            .status(HTTP_STATUS.BAD_REQUEST)
            .json(
              createErrorResponse(
                `Cannot get checksum for job with status: ${job.status}. Job must be completed.`,
                'JOB_NOT_COMPLETED'
              )
            );
          return;
        }

        // Validate checksum is available
        if (!job.packageChecksum) {
          this.logger.error('Package checksum not available', {
            jobId,
            userId: req.user!.userId,
          });

          res
            .status(HTTP_STATUS.BAD_REQUEST)
            .json(
              createErrorResponse(
                'Package checksum not available. The package may have been generated before checksum support was added.',
                'CHECKSUM_NOT_AVAILABLE'
              )
            );
          return;
        }

        // Format package size as MB
        const packageSizeMB = job.packageSizeBytes
          ? (job.packageSizeBytes / (1024 * 1024)).toFixed(1)
          : 'Unknown';

        // Build response
        const response = {
          jobId: job.jobId,
          packageChecksum: job.packageChecksum,
          algorithm: job.packageAlgorithm,
          packageSizeBytes: job.packageSizeBytes,
          packageSizeMB: `${packageSizeMB} MB`,
          createdAt: job.completedAt,
          verifiedAt: job.checksumVerifiedAt,
        };

        this.logger.info('Package checksum retrieved successfully', {
          jobId,
          userId: req.user!.userId,
          algorithm: job.packageAlgorithm,
        });

        // Set cache control headers (checksum is immutable once generated)
        res.set('Cache-Control', 'public, max-age=31536000, immutable');

        res.status(HTTP_STATUS.OK).json(response);
      } catch (error: any) {
        // Handle job not found error
        if (
          error.message.includes('not found') ||
          error.message.includes('does not exist')
        ) {
          this.logger.warn('Export job not found for checksum request', {
            jobId: req.params.jobId,
            userId: req.user!.userId,
          });

          res
            .status(HTTP_STATUS.NOT_FOUND)
            .json(createErrorResponse(error.message, 'JOB_NOT_FOUND'));
          return;
        }

        // Log unexpected errors and pass to error middleware
        this.logger.error('Error retrieving package checksum', {
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
   * Set security headers for download responses.
   * Protects against XSS, clickjacking, MIME sniffing, and other vulnerabilities.
   *
   * Security Headers Applied:
   * - X-Content-Type-Options: nosniff (prevents MIME type sniffing)
   * - X-Frame-Options: DENY (prevents clickjacking via iframe embedding)
   * - X-Download-Options: noopen (IE-specific, prevents auto-opening downloads)
   * - X-XSS-Protection: 1; mode=block (legacy XSS filter for older browsers)
   * - Content-Security-Policy: default-src 'none' (restrictive CSP for downloads)
   * - Referrer-Policy: no-referrer (prevents referrer information leakage)
   *
   * @param res - Express response object
   * @private
   */
  private setSecurityHeaders(res: Response): void {
    // Prevent MIME type sniffing (forces browser to respect Content-Type)
    res.set('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking by blocking iframe embedding
    res.set('X-Frame-Options', 'DENY');

    // IE-specific: Prevent auto-opening downloaded files
    res.set('X-Download-Options', 'noopen');

    // Legacy XSS protection (deprecated but still useful for older browsers)
    res.set('X-XSS-Protection', '1; mode=block');

    // Restrictive Content Security Policy (no resource loading allowed)
    // This is safe for binary downloads (tar.gz files)
    res.set('Content-Security-Policy', "default-src 'none'");

    // Prevent referrer information leakage
    res.set('Referrer-Policy', 'no-referrer');
  }

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

  /**
   * List export jobs with pagination, filtering, and sorting.
   *
   * Returns user's export history with tool metadata, supporting pagination
   * and multiple filter/sort options. Admin users can see all jobs, while
   * regular users only see their own jobs.
   *
   * @route GET /api/tool-registry/export-jobs
   * @access Protected - Requires JWT authentication
   * @param req - Express request object with query parameters
   * @param res - Express response object
   * @param next - Express next function
   * @returns 200 OK with paginated export jobs list
   * @throws {Error} 400 - Invalid query parameters
   * @throws {Error} 500 - Internal server error
   *
   * @example
   * GET /api/tool-registry/export-jobs?limit=20&offset=0&sort_by=created_at&sort_order=desc&status_filter=completed
   * Authorization: Bearer <jwt-token>
   *
   * Response 200:
   * {
   *   "jobs": [
   *     {
   *       "jobId": "job-abc-123",
   *       "toolId": "tool-forms-456",
   *       "toolName": "Customer Registration Form",
   *       "toolType": "forms",
   *       "status": "completed",
   *       "stepsCompleted": 8,
   *       "stepsTotal": 8,
   *       "progressPercentage": 100,
   *       "packageSizeBytes": 12582912,
   *       "downloadCount": 5,
   *       "createdAt": "2025-10-24T10:00:00Z",
   *       "completedAt": "2025-10-24T10:02:30Z"
   *     }
   *   ],
   *   "total": 45,
   *   "limit": 20,
   *   "offset": 0,
   *   "page": 1,
   *   "totalPages": 3
   * }
   *
   * @swagger
   * /api/tool-registry/export-jobs:
   *   get:
   *     summary: List export jobs with pagination and filters
   *     description: Returns user's export history with tool metadata
   *     tags: [Export]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *           minimum: 1
   *           maximum: 100
   *         description: Number of jobs per page
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *           minimum: 0
   *         description: Number of jobs to skip
   *       - in: query
   *         name: sort_by
   *         schema:
   *           type: string
   *           enum: [created_at, completed_at, download_count, package_size_bytes]
   *           default: created_at
   *         description: Field to sort by
   *       - in: query
   *         name: sort_order
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort direction
   *       - in: query
   *         name: status_filter
   *         schema:
   *           type: string
   *         description: Filter by status (comma-separated, e.g., "completed,failed")
   *       - in: query
   *         name: tool_type_filter
   *         schema:
   *           type: string
   *         description: Filter by tool type (forms, workflows, themes)
   *       - in: query
   *         name: start_date
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Filter jobs created after this date
   *       - in: query
   *         name: end_date
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Filter jobs created before this date
   *     responses:
   *       200:
   *         description: Export jobs list retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ExportJobsListResponse'
   *       400:
   *         description: Invalid query parameters
   *       500:
   *         description: Internal server error
   */
  listExportJobs = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const userId = req.user!.userId;
        const isAdmin = req.user!.role === 'admin';

        // Extract query parameters
        const options: ListExportJobsOptions = {
          limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
          offset: req.query.offset
            ? parseInt(req.query.offset as string, 10)
            : 0,
          sortBy: (req.query.sort_by as any) || 'created_at',
          sortOrder: (req.query.sort_order as any) || 'desc',
          statusFilter: req.query.status_filter as string,
          toolTypeFilter: req.query.tool_type_filter as string,
          startDate: req.query.start_date as string,
          endDate: req.query.end_date as string,
        };

        // Validate limit and offset
        if (
          isNaN(options.limit!) ||
          options.limit! < 1 ||
          options.limit! > 100
        ) {
          res
            .status(HTTP_STATUS.BAD_REQUEST)
            .json(
              createErrorResponse(
                'Invalid limit parameter. Must be between 1 and 100.',
                'INVALID_LIMIT'
              )
            );
          return;
        }

        if (isNaN(options.offset!) || options.offset! < 0) {
          res
            .status(HTTP_STATUS.BAD_REQUEST)
            .json(
              createErrorResponse(
                'Invalid offset parameter. Must be >= 0.',
                'INVALID_OFFSET'
              )
            );
          return;
        }

        this.logger.info('Listing export jobs', {
          userId,
          isAdmin,
          options,
        });

        // Admin users can see all jobs (pass null), regular users see only their own
        const filterUserId = isAdmin ? null : userId;

        // Query repository
        const { jobs, total } = await this.exportJobRepository.list(
          filterUserId,
          options
        );

        // Calculate pagination metadata
        const page = Math.floor(options.offset! / options.limit!) + 1;
        const totalPages = Math.ceil(total / options.limit!);

        // Build response
        const response: ExportJobsListResponse = {
          jobs,
          total,
          limit: options.limit!,
          offset: options.offset!,
          page,
          totalPages,
        };

        this.logger.info('Export jobs list retrieved successfully', {
          userId,
          isAdmin,
          totalJobs: total,
          returnedJobs: jobs.length,
          page,
          totalPages,
        });

        res.status(HTTP_STATUS.OK).json(response);
      } catch (error: any) {
        // Handle validation errors from repository
        if (
          error.message.includes('Invalid sort') ||
          error.message.includes('Invalid limit') ||
          error.message.includes('Invalid offset')
        ) {
          this.logger.warn('Invalid query parameters', {
            userId: req.user!.userId,
            error: error.message,
          });

          res
            .status(HTTP_STATUS.BAD_REQUEST)
            .json(createErrorResponse(error.message, 'INVALID_PARAMETERS'));
          return;
        }

        // Log unexpected errors and pass to error middleware
        this.logger.error('Error listing export jobs', {
          userId: req.user!.userId,
          error: error.message,
          stack: error.stack,
        });

        next(error);
      }
    }
  );

  /**
   * Download completed export package.
   *
   * Streams .tar.gz package file to client with efficient streaming (no buffering).
   * Supports HTTP range requests for pause/resume capability.
   * Only job creator or admin users can download packages.
   *
   * @route GET /api/tool-registry/export-jobs/:jobId/download
   * @access Protected - Requires JWT authentication and job ownership or admin role
   * @param req - Express request object with jobId in params
   * @param res - Express response object (file stream)
   * @param next - Express next function
   * @returns 200 OK with file stream (206 for range requests)
   * @throws {Error} 403 - User unauthorized to download
   * @throws {Error} 404 - Package not found or not ready
   * @throws {Error} 410 - Package expired and deleted
   * @throws {Error} 500 - Internal server error
   *
   * @example
   * GET /api/tool-registry/export-jobs/job-abc-123/download
   * Authorization: Bearer <jwt-token>
   *
   * Response 200:
   * Headers:
   *   Content-Type: application/gzip
   *   Content-Disposition: attachment; filename="export-customer-form-2025-10-26.tar.gz"
   *   Content-Length: 12582912
   *   Cache-Control: private, max-age=3600
   *   Accept-Ranges: bytes
   *   X-Package-Size: 12 MB
   * Body: <binary file stream>
   *
   * @swagger
   * /api/tool-registry/export-jobs/{jobId}/download:
   *   get:
   *     summary: Download completed export package
   *     description: Streams .tar.gz package file with resume support
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
   *       - in: header
   *         name: Range
   *         schema:
   *           type: string
   *         description: HTTP range header for resume capability (e.g., "bytes=0-1023")
   *     responses:
   *       200:
   *         description: Export package downloaded successfully
   *         content:
   *           application/gzip:
   *             schema:
   *               type: string
   *               format: binary
   *       206:
   *         description: Partial content (range request)
   *       403:
   *         description: User unauthorized to download
   *       404:
   *         description: Package not found or not ready
   *       410:
   *         description: Package expired and deleted
   */
  downloadPackage = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const { jobId } = req.params;
        const userId = req.user!.id;
        const isAdmin = req.user!.role === 'admin';

        this.logger.info('Download request received', { jobId, userId });

        // Step 1: Retrieve export job
        const job = await this.orchestratorService.getExportStatus(jobId);

        // Step 2: Check job status
        if (job.status !== 'completed') {
          this.logger.warn('Package not ready', {
            jobId,
            userId,
            status: job.status,
          });

          res
            .status(HTTP_STATUS.NOT_FOUND)
            .json(
              createErrorResponse(
                `Export package not ready. Job status: ${job.status}`,
                'PACKAGE_NOT_READY'
              )
            );
          return;
        }

        // Step 3: Check package exists
        if (!job.packagePath) {
          this.logger.warn('Package expired or deleted', {
            jobId,
            userId,
            packageExpiresAt: job.packageExpiresAt,
          });

          res.status(HTTP_STATUS.GONE).json({
            status: 'error',
            message: 'Export package has expired and was deleted',
            code: 'PACKAGE_EXPIRED',
            timestamp: new Date().toISOString(),
            expiresAt: job.packageExpiresAt,
          });
          return;
        }

        // Step 4: Verify permission (job creator OR admin)
        if (job.userId !== userId && !isAdmin) {
          this.logger.warn('Unauthorized download attempt', {
            jobId,
            requestingUserId: userId,
            jobOwnerUserId: job.userId,
          });

          res
            .status(HTTP_STATUS.FORBIDDEN)
            .json(
              createErrorResponse(
                'Only job creator or admin can download this package',
                'DOWNLOAD_UNAUTHORIZED'
              )
            );
          return;
        }

        // Step 5: Check file exists on filesystem
        const filePath = job.packagePath;
        let fileStats: fs.Stats;
        try {
          fileStats = await fs.promises.stat(filePath);
        } catch (error) {
          this.logger.error('Package file not found on server', {
            jobId,
            userId,
            filePath,
            error: error instanceof Error ? error.message : String(error),
          });

          res
            .status(HTTP_STATUS.NOT_FOUND)
            .json(
              createErrorResponse(
                'Export package file not found on server',
                'FILE_NOT_FOUND'
              )
            );
          return;
        }

        // Step 5a: Verify package integrity (if checksum available)
        if (job.packageChecksum) {
          this.logger.info('Verifying package integrity before download', {
            jobId,
            userId,
            packagePath: filePath,
          });

          try {
            const isValid =
              await this.orchestratorService.verifyPackageIntegrity(
                jobId,
                filePath,
                job.packageChecksum,
                userId
              );

            if (!isValid) {
              this.logger.error('Package tampered - checksum mismatch', {
                jobId,
                userId,
                packagePath: filePath,
              });

              res
                .status(HTTP_STATUS.FORBIDDEN)
                .json(
                  createErrorResponse(
                    'Package integrity check failed. The export package has been tampered with or corrupted. Please contact support.',
                    'PACKAGE_TAMPERED'
                  )
                );
              return;
            }

            this.logger.info('Package integrity verified successfully', {
              jobId,
              userId,
              checksumVerifiedAt: new Date().toISOString(),
            });

            // Log security event for successful verification
            logIntegrityVerified(jobId, userId, filePath);
          } catch (error) {
            this.logger.error('Error during integrity verification', {
              jobId,
              userId,
              error: error instanceof Error ? error.message : String(error),
            });

            res
              .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
              .json(
                createErrorResponse(
                  'Failed to verify package integrity. Please try again later.',
                  'INTERNAL_ERROR'
                )
              );
            return;
          }
        } else {
          // Log warning for packages without checksums (legacy packages)
          this.logger.warn('Download requested for package without checksum', {
            jobId,
            userId,
            packagePath: filePath,
            completedAt: job.completedAt,
          });

          // Log security event for legacy download
          logLegacyDownload(jobId, userId, filePath, job.completedAt);
        }

        // Step 6: Generate filename from tool data
        // Extract tool name from packagePath or use default
        const packageFilename = path.basename(filePath);
        const toolName =
          packageFilename.replace(/^export-/, '').replace(/\.tar\.gz$/, '') ||
          'export';
        const timestamp = job.completedAt
          ? new Date(job.completedAt).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        const filename = `export-${toolName}-${timestamp}.tar.gz`;

        // Step 7: Handle range requests (resume capability)
        const range = req.headers.range;
        if (range) {
          this.logger.debug('Range request received', {
            jobId,
            userId,
            range,
          });

          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileStats.size - 1;
          const chunkSize = end - start + 1;

          // Validate range
          if (
            start >= fileStats.size ||
            end >= fileStats.size ||
            start < 0 ||
            end < start
          ) {
            this.logger.warn('Invalid range request', {
              jobId,
              userId,
              range,
              fileSize: fileStats.size,
            });

            res
              .status(HTTP_STATUS.BAD_REQUEST)
              .json(
                createErrorResponse('Invalid range request', 'INVALID_RANGE')
              );
            return;
          }

          // Set 206 Partial Content headers
          res.status(HTTP_STATUS.PARTIAL_CONTENT);

          // Apply security headers
          this.setSecurityHeaders(res);

          res.set('Content-Range', `bytes ${start}-${end}/${fileStats.size}`);
          res.set('Content-Length', chunkSize.toString());
          res.set('Content-Type', 'application/gzip');
          res.set('Content-Disposition', `attachment; filename="${filename}"`);
          res.set('Accept-Ranges', 'bytes');

          // Create read stream with range
          const stream = fs.createReadStream(filePath, { start, end });
          stream.pipe(res);

          stream.on('error', (error) => {
            this.logger.error('Stream error during download', {
              jobId,
              userId,
              error: error.message,
            });
            if (!res.headersSent) {
              res
                .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
                .json(createErrorResponse('Download failed', 'STREAM_ERROR'));
            }
          });

          stream.on('end', async () => {
            this.logger.info('Range download completed', {
              jobId,
              userId,
              range: `${start}-${end}`,
              chunkSize,
            });

            // Update download tracking (only on successful stream end)
            await this.orchestratorService.updateDownloadTracking(
              jobId,
              job.downloadCount
            );
          });

          return;
        }

        // Step 8: Set response headers for full download
        res.status(HTTP_STATUS.OK);

        // Apply security headers
        this.setSecurityHeaders(res);

        res.set('Content-Type', 'application/gzip');
        res.set('Content-Disposition', `attachment; filename="${filename}"`);
        res.set('Content-Length', fileStats.size.toString());
        res.set('Cache-Control', 'private, max-age=3600');
        res.set('Accept-Ranges', 'bytes');
        res.set('X-Package-Size', FileUtils.formatFileSize(fileStats.size));

        // Step 9: Stream file
        const stream = fs.createReadStream(filePath, {
          highWaterMark: 64 * 1024, // 64KB chunks
        });

        stream.pipe(res);

        stream.on('error', (error) => {
          this.logger.error('Stream error during download', {
            jobId,
            userId,
            error: error.message,
            stack: error.stack,
          });
          if (!res.headersSent) {
            res
              .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
              .json(createErrorResponse('Download failed', 'STREAM_ERROR'));
          }
        });

        stream.on('end', async () => {
          // Step 10: Update download tracking
          await this.orchestratorService.updateDownloadTracking(
            jobId,
            job.downloadCount
          );

          this.logger.info('Download completed successfully', {
            jobId,
            userId,
            fileSize: fileStats.size,
            filename,
          });
        });
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
        this.logger.error('Error during download', {
          jobId: req.params.jobId,
          userId: req.user!.userId,
          error: error.message,
          stack: error.stack,
        });

        next(error);
      }
    }
  );
}
