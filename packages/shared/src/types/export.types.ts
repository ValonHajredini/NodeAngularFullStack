/**
 * Export System Type Definitions
 * Shared types for tool export orchestration and job management
 * Epic 33: Tool Export System
 * Story: 33.1.2 Export Jobs Database Schema
 */

/**
 * Export job status lifecycle states.
 * Represents all possible states an export job can be in during its lifecycle.
 */
export enum ExportJobStatus {
  /** Job created, not yet started */
  PENDING = 'pending',
  /** Job actively executing steps */
  IN_PROGRESS = 'in_progress',
  /** Job finished successfully */
  COMPLETED = 'completed',
  /** Job failed with error */
  FAILED = 'failed',
  /** Job cancelled by user */
  CANCELLED = 'cancelled',
  /** Job cancellation in progress */
  CANCELLING = 'cancelling',
  /** Job rolled back after failure */
  ROLLED_BACK = 'rolled_back',
}

/**
 * Complete export job record.
 * Matches the database schema for the export_jobs table.
 * Uses camelCase for TypeScript conventions (repository maps to/from snake_case).
 */
export interface ExportJob {
  /** Unique export job identifier (UUID) */
  jobId: string;

  /** Tool being exported (foreign key to tool_registry) */
  toolId: string;

  /** User who initiated export (nullable if user deleted) */
  userId: string | null;

  /** Current job status */
  status: ExportJobStatus;

  /** Number of export steps completed */
  stepsCompleted: number;

  /** Total number of export steps */
  stepsTotal: number;

  /** Description of current export step */
  currentStep: string | null;

  /** Calculated progress percentage (0-100) */
  progressPercentage: number;

  /** Filesystem path to generated export package (.tar.gz) */
  packagePath: string | null;

  /** Size of export package in bytes */
  packageSizeBytes: number | null;

  /** Number of times package has been downloaded */
  downloadCount: number;

  /** Timestamp of most recent download */
  lastDownloadedAt: Date | null;

  /** Package expiration timestamp (for automatic cleanup) */
  packageExpiresAt: Date | null;

  /** Number of days to retain package after completion */
  packageRetentionDays: number;

  /** SHA-256 checksum of export package (64 lowercase hex characters) */
  packageChecksum: string | null;

  /** Hashing algorithm used for checksum generation (default: sha256) */
  packageAlgorithm: string;

  /** Timestamp of last successful integrity verification */
  checksumVerifiedAt: Date | null;

  /** Error details if job failed */
  errorMessage: string | null;

  /** Job creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Job start timestamp */
  startedAt: Date | null;

  /** Job completion timestamp */
  completedAt: Date | null;
}

/**
 * Export job creation DTO.
 * Fields required to create a new export job.
 * Omits auto-generated fields and calculated values.
 */
export interface CreateExportJobDto {
  /** Export job identifier (UUID) */
  jobId: string;

  /** Tool being exported */
  toolId: string;

  /** User initiating the export */
  userId: string;

  /** Initial job status (default: pending) */
  status?: ExportJobStatus;

  /** Number of completed steps (default: 0) */
  stepsCompleted?: number;

  /** Total number of export steps */
  stepsTotal?: number;

  /** Current step description */
  currentStep?: string;
}

/**
 * Export job update DTO.
 * Fields that can be updated on an existing export job.
 * All fields are optional to support partial updates.
 */
export interface UpdateExportJobDto {
  /** Current job status */
  status?: ExportJobStatus;

  /** Number of completed steps */
  stepsCompleted?: number;

  /** Total number of steps */
  stepsTotal?: number;

  /** Current step description */
  currentStep?: string;

  /** Progress percentage */
  progressPercentage?: number;

  /** Package file path (null to clear) */
  packagePath?: string | null;

  /** Package file size in bytes (null to clear) */
  packageSizeBytes?: number | null;

  /** Number of times package has been downloaded */
  downloadCount?: number;

  /** Timestamp of most recent download */
  lastDownloadedAt?: Date;

  /** Package expiration timestamp */
  packageExpiresAt?: Date;

  /** Number of days to retain package after completion */
  packageRetentionDays?: number;

  /** SHA-256 checksum of export package */
  packageChecksum?: string | null;

  /** Hashing algorithm used for checksum generation */
  packageAlgorithm?: string;

  /** Timestamp of last successful integrity verification */
  checksumVerifiedAt?: Date | null;

  /** Error message */
  errorMessage?: string;

  /** Job start timestamp */
  startedAt?: Date;

  /** Job completion timestamp */
  completedAt?: Date;
}

/**
 * Export job with enriched tool metadata.
 * Extends ExportJob with denormalized tool data from tool_registry table.
 * Used by list endpoints to avoid N+1 query problems.
 */
export interface ExportJobWithTool extends ExportJob {
  /** Tool name from tool_registry */
  toolName: string;

  /** Tool type (forms, workflows, themes) from tool_registry */
  toolType: string;

  /** Tool description from tool_registry */
  toolDescription?: string;
}

/**
 * Export jobs list query options.
 * Parameters for filtering, sorting, and pagination.
 */
export interface ListExportJobsOptions {
  /** Maximum number of jobs to return (default: 20, max: 100) */
  limit?: number;

  /** Number of jobs to skip (default: 0) */
  offset?: number;

  /** Field to sort by (default: created_at) */
  sortBy?: 'created_at' | 'completed_at' | 'download_count' | 'package_size_bytes';

  /** Sort order (default: desc) */
  sortOrder?: 'asc' | 'desc';

  /** Filter by job status (comma-separated for multiple: "completed,failed") */
  statusFilter?: string;

  /** Filter by tool type (forms, workflows, themes) */
  toolTypeFilter?: string;

  /** Filter by date range - start date (ISO 8601) */
  startDate?: string;

  /** Filter by date range - end date (ISO 8601) */
  endDate?: string;

  /** Filter by user ID (admin only, regular users always filtered to their own jobs) */
  userId?: string;
}

/**
 * Paginated export jobs list response.
 * Contains jobs array, total count, and pagination metadata.
 */
export interface ExportJobsListResponse {
  /** Array of export jobs with tool metadata */
  jobs: ExportJobWithTool[];

  /** Total number of jobs matching filters (not just current page) */
  total: number;

  /** Number of jobs per page */
  limit: number;

  /** Number of jobs skipped */
  offset: number;

  /** Current page number (1-indexed) */
  page: number;

  /** Total number of pages */
  totalPages: number;
}
