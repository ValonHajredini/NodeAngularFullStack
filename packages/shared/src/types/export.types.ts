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

  /** Package file path */
  packagePath?: string;

  /** Package file size in bytes */
  packageSizeBytes?: number;

  /** Error message */
  errorMessage?: string;

  /** Job start timestamp */
  startedAt?: Date;

  /** Job completion timestamp */
  completedAt?: Date;
}
