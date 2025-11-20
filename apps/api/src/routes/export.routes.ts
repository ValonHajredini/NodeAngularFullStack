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
  preFlightValidator,
  exportJobRepository
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

/**
 * Rate Limiter for Package Checksum Endpoint
 *
 * Protects checksum endpoint from abuse by limiting request frequency
 * to 10 requests per minute per user.
 *
 * Why Rate Limit:
 * - Checksum requests are infrequent (typically once per export)
 * - Prevents excessive database queries from rapid polling
 * - Checksum is immutable once generated (can be cached client-side)
 *
 * Configuration:
 * - Window: 60 seconds (1 minute)
 * - Max Requests: 10 per window per user
 * - Response: 429 Too Many Requests with retry-after header
 * - Skip: OPTIONS requests (CORS preflight)
 *
 * @example
 * // Client pattern (respects rate limit):
 * const checksum = await fetch(`/api/tool-registry/export-jobs/${jobId}/checksum`, {
 *   headers: { Authorization: `Bearer ${token}` }
 * });
 * // Cache checksum client-side for future verifications
 */
const CHECKSUM_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const CHECKSUM_RATE_LIMIT_MAX_REQUESTS = 10; // Maximum 10 requests per minute

const checksumRateLimiter = rateLimit({
  windowMs: CHECKSUM_RATE_LIMIT_WINDOW_MS,
  max: CHECKSUM_RATE_LIMIT_MAX_REQUESTS,
  message: createErrorResponse(
    'Rate limit exceeded for checksum endpoint. Please wait before retrying.',
    'RATE_LIMIT_EXCEEDED',
    { retryAfter: 60 }
  ),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * @route GET /api/tool-registry/export-jobs
 * @description List export jobs with pagination, filtering, and sorting
 * @access Protected - Requires JWT authentication
 * @middleware
 *   1. AuthMiddleware.authenticate - Validates JWT token
 * @query {number} limit - Number of jobs per page (default: 20, max: 100)
 * @query {number} offset - Number of jobs to skip (default: 0)
 * @query {string} sort_by - Field to sort by (default: created_at)
 * @query {string} sort_order - Sort direction asc/desc (default: desc)
 * @query {string} status_filter - Filter by status (comma-separated)
 * @query {string} tool_type_filter - Filter by tool type
 * @query {string} start_date - Filter by start date (ISO 8601)
 * @query {string} end_date - Filter by end date (ISO 8601)
 * @returns {Object} 200 OK with paginated export jobs list
 * @example
 * GET /api/tool-registry/export-jobs?limit=20&offset=0&sort_by=created_at&sort_order=desc
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
 */
router.get(
  '/export-jobs',
  AuthMiddleware.authenticate,
  controller.listExportJobs
);

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
 * @route GET /api/tool-registry/export-jobs/:jobId/checksum
 * @description Get package checksum for verification
 * @access Protected - Requires JWT authentication
 * @middleware
 *   1. AuthMiddleware.authenticate - Validates JWT token
 *   2. checksumRateLimiter - Limits to 10 req/min per user
 *   3. validateJobId - Validates jobId is UUID
 *   4. validationMiddleware - Processes validation errors
 * @param {string} jobId - Export job ID (UUID)
 * @returns {Object} 200 OK with checksum metadata
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
 * Response 400 (Job not completed):
 * {
 *   "status": "error",
 *   "message": "Cannot get checksum for job with status: in_progress. Job must be completed.",
 *   "code": "JOB_NOT_COMPLETED"
 * }
 *
 * Response 400 (Checksum not available):
 * {
 *   "status": "error",
 *   "message": "Package checksum not available. The package may have been generated before checksum support was added.",
 *   "code": "CHECKSUM_NOT_AVAILABLE"
 * }
 */
router.get(
  '/export-jobs/:jobId/checksum',
  AuthMiddleware.authenticate,
  checksumRateLimiter,
  validateJobId,
  ValidationMiddleware.handleValidationErrors,
  controller.getPackageChecksum
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

/**
 * @route GET /api/tool-registry/export-jobs/:jobId/download
 * @description Download completed export package
 * @access Protected - Requires JWT authentication and job ownership or admin role
 * @middleware
 *   1. AuthMiddleware.authenticate - Validates JWT token
 *   2. validateJobId - Validates jobId is UUID
 *   3. validationMiddleware - Processes validation errors
 * @param {string} jobId - Export job ID (UUID)
 * @returns {Stream} 200 OK with .tar.gz file stream
 * @returns {Object} 403 Forbidden if user unauthorized
 * @returns {Object} 404 Not Found if package not found or not ready
 * @returns {Object} 410 Gone if package expired
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
 *   X-Package-Size: 12 MB
 * Body: <binary file stream>
 *
 * Response 403:
 * { "status": "error", "message": "Only job creator or admin can download this package", "code": "DOWNLOAD_UNAUTHORIZED" }
 */
router.get(
  '/export-jobs/:jobId/download',
  AuthMiddleware.authenticate,
  validateJobId,
  ValidationMiddleware.handleValidationErrors,
  controller.downloadPackage
);

// ============================================================================
// Export Router
// ============================================================================

/**
 * Export router with descriptive name.
 * Mount in server.ts at /api/tool-registry prefix.
 */
export { router as exportRoutes };
