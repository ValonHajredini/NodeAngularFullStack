import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ExportController } from '../controllers/export.controller';
import { ExportOrchestratorService } from '../services/export-orchestrator.service';
import { PreFlightValidator } from '../services/pre-flight-validator.service';
import { ExportJobRepository } from '../repositories/export-job.repository';
import { ToolRegistryRepository } from '../repositories/tool-registry.repository';
import { FormSchemasRepository } from '../repositories/form-schemas.repository';
import { FormSubmissionsRepository } from '../repositories/form-submissions.repository';
import { ThemesRepository } from '../repositories/themes.repository';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ExportPermissionMiddleware } from '../middleware/export-permission.middleware';
import {
  validateExportStart,
  validateJobId,
} from '../validators/export.validator';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { createErrorResponse } from '../types/api-response.types';

/**
 * Export Routes
 *
 * Provides REST API endpoints for export job management.
 * Handles job creation, status tracking, and cancellation.
 *
 * Security Features:
 * - JWT Authentication: All endpoints require valid bearer token
 * - Permission Checks: Export operations require admin role or 'export' permission
 * - Rate Limiting: Status endpoint limited to 10 requests per second per user
 * - Input Validation: UUID validation for toolId and jobId parameters
 * - Owner Verification: Only job creator or admin can cancel jobs
 *
 * Dependency Injection Pattern:
 * Routes file initializes the full dependency chain:
 * Repositories → Service → Controller
 *
 * This ensures proper separation of concerns and testability.
 *
 * Story 33.1.3: Export Job Status Tracking
 *
 * Endpoints:
 * - POST   /api/tool-registry/tools/:toolId/export       - Start export job
 * - GET    /api/tool-registry/export-jobs/:jobId         - Get job status (rate limited)
 * - POST   /api/tool-registry/export-jobs/:jobId/cancel  - Cancel export job
 *
 * @example
 * // Import in server.ts
 * import { exportRoutes } from './routes/export.routes.js';
 * app.use('/api/tool-registry', exportRoutes);
 */

// ============================================================================
// Dependency Injection Setup
// ============================================================================

/**
 * Initialize dependency chain:
 * ToolRegistryRepository → Used by orchestrator and validator
 * FormSchemasRepository → Used by validator for form integrity checks
 * FormSubmissionsRepository → Used by validator for submission counting
 * ThemesRepository → Used by validator for theme integrity checks
 * ExportJobRepository → Used by orchestrator for job persistence
 * PreFlightValidator → Pre-flight validation service
 * ExportOrchestratorService → Business logic for export operations
 * ExportController → HTTP request handlers
 */
const toolRegistryRepository = new ToolRegistryRepository();
const formSchemasRepository = new FormSchemasRepository();
const formSubmissionsRepository = new FormSubmissionsRepository();
const themesRepository = new ThemesRepository();
const exportJobRepository = new ExportJobRepository();

const preFlightValidator = new PreFlightValidator(
  toolRegistryRepository,
  formSchemasRepository,
  formSubmissionsRepository,
  themesRepository
);

const orchestratorService = new ExportOrchestratorService(
  toolRegistryRepository,
  exportJobRepository,
  preFlightValidator
);

const controller = new ExportController(
  orchestratorService,
  preFlightValidator
);

// ============================================================================
// Router Configuration
// ============================================================================

/**
 * Create router instance for export endpoints.
 * All routes are mounted under /api/tool-registry prefix in server.ts
 */
const router = Router();

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

/**
 * Rate Limiter for Export Status Endpoint
 *
 * Protects status endpoint from polling abuse by limiting
 * request frequency to 10 requests per second per user.
 *
 * Why Only Status Endpoint:
 * - Status polling is the most frequent operation (every 2 seconds)
 * - Start/cancel operations are infrequent (one-time per job)
 * - Prevents excessive database queries from rapid polling
 *
 * Configuration:
 * - Window: 1 second (1,000 ms)
 * - Max Requests: 10 per window per user
 * - Response: 429 Too Many Requests with retry-after header
 * - Skip: OPTIONS requests (CORS preflight)
 *
 * Security Note:
 * Rate limiting is applied after authentication to prevent
 * resource exhaustion from repeated authenticated polling.
 *
 * @example
 * // Client polling pattern (respects rate limit):
 * setInterval(async () => {
 *   const status = await fetch(`/api/tool-registry/export-jobs/${jobId}`, {
 *     headers: { Authorization: `Bearer ${token}` }
 *   });
 * }, 2000); // Poll every 2 seconds (well within 10 req/sec limit)
 */
const SECONDS_PER_WINDOW = 1; // 1 second window
const MILLISECONDS_PER_SECOND = 1000;
const RATE_LIMIT_WINDOW_MS = SECONDS_PER_WINDOW * MILLISECONDS_PER_SECOND;
const RATE_LIMIT_MAX_REQUESTS = 10; // Maximum 10 requests per second

const exportStatusRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: createErrorResponse(
    'Rate limit exceeded. Please wait before retrying.',
    'RATE_LIMIT_EXCEEDED',
    { retryAfter: 1 }
  ),
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Skip rate limiting for successful OPTIONS requests (CORS preflight)
  skip: (req) => req.method === 'OPTIONS',
  // Uses default IP-based rate limiting with IPv6 support
  // Note: For per-user rate limiting in future, use express-rate-limit's ipKeyGenerator helper
});

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * @route POST /api/tool-registry/tools/:toolId/export/validate
 * @description Validate tool before export (pre-flight checks)
 * @access Protected - Requires JWT authentication
 * @middleware
 *   1. AuthMiddleware.authenticate - Validates JWT token
 *   2. validateExportStart - Validates toolId is UUID
 *   3. validationMiddleware - Processes validation errors
 * @param {string} toolId - Tool registry ID (UUID)
 * @returns {Object} 200 OK with validation result (422 if validation failed)
 * @example
 * POST /api/tool-registry/tools/tool-forms-123/export/validate
 * Authorization: Bearer <jwt-token>
 *
 * Response 200 (validation passed):
 * {
 *   "success": true,
 *   "errors": [],
 *   "warnings": [{ "message": "Form has no submissions yet", "field": "form_submissions" }],
 *   "info": ["Tool 'Customer Form' (forms) found", "Form has 5 fields"],
 *   "timestamp": "2025-10-26T10:30:00Z",
 *   "estimatedDurationMs": 35000
 * }
 */
router.post(
  '/tools/:toolId/export/validate',
  AuthMiddleware.authenticate,
  validateExportStart,
  ValidationMiddleware.handleValidationErrors,
  controller.validateExport
);

/**
 * @route POST /api/tool-registry/tools/:toolId/export
 * @description Start export job for a tool
 * @access Protected - Requires JWT authentication and export permission
 * @middleware
 *   1. AuthMiddleware.authenticate - Validates JWT token
 *   2. ExportPermissionMiddleware.requireExportPermission - Checks admin or export permission
 *   3. validateExportStart - Validates toolId is UUID
 *   4. validationMiddleware - Processes validation errors
 * @param {string} toolId - Tool registry ID (UUID)
 * @returns {Object} 201 Created with export job record
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
 *   "createdAt": "2025-10-26T10:30:00Z"
 * }
 */
router.post(
  '/tools/:toolId/export',
  AuthMiddleware.authenticate,
  ExportPermissionMiddleware.requireExportPermission,
  validateExportStart,
  ValidationMiddleware.handleValidationErrors,
  controller.startExport
);

/**
 * @route GET /api/tool-registry/export-jobs/:jobId
 * @description Get export job status
 * @access Protected - Requires JWT authentication
 * @middleware
 *   1. AuthMiddleware.authenticate - Validates JWT token
 *   2. exportStatusRateLimiter - Limits to 10 req/sec per user
 *   3. validateJobId - Validates jobId is UUID
 *   4. validationMiddleware - Processes validation errors
 * @param {string} jobId - Export job ID (UUID)
 * @returns {Object} 200 OK with export job record including progress
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
 *   "createdAt": "2025-10-26T10:30:00Z",
 *   "updatedAt": "2025-10-26T10:32:15Z",
 *   "startedAt": "2025-10-26T10:30:05Z"
 * }
 */
router.get(
  '/export-jobs/:jobId',
  AuthMiddleware.authenticate,
  exportStatusRateLimiter,
  validateJobId,
  ValidationMiddleware.handleValidationErrors,
  controller.getExportStatus
);

/**
 * @route POST /api/tool-registry/export-jobs/:jobId/cancel
 * @description Cancel export job
 * @access Protected - Requires JWT authentication and job ownership or admin role
 * @middleware
 *   1. AuthMiddleware.authenticate - Validates JWT token
 *   2. validateJobId - Validates jobId is UUID
 *   3. validationMiddleware - Processes validation errors
 * @param {string} jobId - Export job ID (UUID)
 * @returns {Object} 200 OK with cancellation confirmation
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
 */
router.post(
  '/export-jobs/:jobId/cancel',
  AuthMiddleware.authenticate,
  validateJobId,
  ValidationMiddleware.handleValidationErrors,
  controller.cancelExport
);

// ============================================================================
// Export Router
// ============================================================================

/**
 * Export router with descriptive name.
 * Mount in server.ts at /api/tool-registry prefix.
 */
export { router as exportRoutes };
