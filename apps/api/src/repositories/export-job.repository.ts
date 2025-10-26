/**
 * Export Job Repository
 * Data access layer for export job operations
 * Epic 33.1: Export Core Infrastructure
 * Story: 33.1.2 Export Jobs Database Schema
 *
 * Provides CRUD operations and query methods for the export_jobs table.
 * Maps between database snake_case columns and TypeScript camelCase properties.
 */

import { Pool } from 'pg';
import {
  ExportJob,
  CreateExportJobDto,
  UpdateExportJobDto,
  ExportJobStatus,
} from '@nodeangularfullstack/shared';
import { pool } from '../config/database.config';

/**
 * Database row structure for export_jobs table.
 * Represents raw PostgreSQL query result with snake_case columns.
 */
interface ExportJobRow {
  job_id: string;
  tool_id: string;
  user_id: string | null;
  status: string;
  steps_completed: number;
  steps_total: number;
  current_step: string | null;
  progress_percentage: number;
  package_path: string | null;
  package_size_bytes: string | null; // PostgreSQL BIGINT returns as string
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
}

/**
 * Repository for export_jobs table.
 * Provides CRUD operations and query methods for export job tracking.
 */
export class ExportJobRepository {
  constructor(private readonly dbPool: Pool = pool) {}

  /**
   * Create a new export job.
   * @param jobData - Export job creation data
   * @returns Created export job record
   * @throws Error if foreign key constraint fails (invalid tool_id or user_id)
   * @example
   * const job = await repository.create({
   *   jobId: 'abc-123',
   *   toolId: 'tool-456',
   *   userId: 'user-789',
   *   status: ExportJobStatus.PENDING,
   *   stepsTotal: 8,
   *   currentStep: 'Initializing...'
   * });
   */
  async create(jobData: CreateExportJobDto): Promise<ExportJob> {
    const query = `
      INSERT INTO export_jobs (
        job_id, tool_id, user_id, status,
        steps_completed, steps_total, current_step
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      jobData.jobId,
      jobData.toolId,
      jobData.userId,
      jobData.status || ExportJobStatus.PENDING,
      jobData.stepsCompleted || 0,
      jobData.stepsTotal || 0,
      jobData.currentStep || null,
    ];

    const result = await this.dbPool.query(query, values);
    return this.mapRowToJob(result.rows[0]);
  }

  /**
   * Find export job by job ID.
   * @param jobId - Export job UUID
   * @returns Export job record or null if not found
   * @example
   * const job = await repository.findById('abc-123');
   * if (job) {
   *   console.log(`Job status: ${job.status}`);
   * }
   */
  async findById(jobId: string): Promise<ExportJob | null> {
    const query = 'SELECT * FROM export_jobs WHERE job_id = $1';
    const result = await this.dbPool.query(query, [jobId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToJob(result.rows[0]);
  }

  /**
   * Update export job.
   * Automatically updates the updated_at timestamp.
   * @param jobId - Export job UUID
   * @param updates - Partial job data to update
   * @returns Updated export job record
   * @throws Error if job not found
   * @example
   * const job = await repository.update('abc-123', {
   *   status: ExportJobStatus.IN_PROGRESS,
   *   stepsCompleted: 3,
   *   progressPercentage: 37,
   *   currentStep: 'Generating boilerplate...'
   * });
   */
  async update(jobId: string, updates: UpdateExportJobDto): Promise<ExportJob> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Build dynamic SET clause
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const columnName = this.camelToSnake(key);
        setClauses.push(`${columnName} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    const query = `
      UPDATE export_jobs
      SET ${setClauses.join(', ')}
      WHERE job_id = $${paramIndex}
      RETURNING *
    `;

    values.push(jobId);

    const result = await this.dbPool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Export job not found: ${jobId}`);
    }

    return this.mapRowToJob(result.rows[0]);
  }

  /**
   * Find export jobs by user ID.
   * Returns jobs sorted by creation date (most recent first).
   * @param userId - User UUID
   * @param limit - Maximum number of jobs to return (default: 50)
   * @returns Array of export jobs
   * @example
   * const userJobs = await repository.findByUserId('user-123', 10);
   * console.log(`User has ${userJobs.length} recent jobs`);
   */
  async findByUserId(userId: string, limit: number = 50): Promise<ExportJob[]> {
    const query = `
      SELECT * FROM export_jobs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await this.dbPool.query(query, [userId, limit]);
    return result.rows.map((row) => this.mapRowToJob(row));
  }

  /**
   * Find export jobs by status.
   * Returns jobs sorted by creation date (oldest first for queues).
   * @param status - Export job status
   * @returns Array of export jobs with matching status
   * @example
   * const pendingJobs = await repository.findByStatus(ExportJobStatus.PENDING);
   * console.log(`${pendingJobs.length} jobs in queue`);
   */
  async findByStatus(status: ExportJobStatus): Promise<ExportJob[]> {
    const query =
      'SELECT * FROM export_jobs WHERE status = $1 ORDER BY created_at ASC';
    const result = await this.dbPool.query(query, [status]);
    return result.rows.map((row) => this.mapRowToJob(row));
  }

  /**
   * Find export jobs by tool ID.
   * Returns all export jobs for a specific tool.
   * @param toolId - Tool UUID
   * @returns Array of export jobs for the tool
   * @example
   * const toolJobs = await repository.findByToolId('tool-123');
   */
  async findByToolId(toolId: string): Promise<ExportJob[]> {
    const query =
      'SELECT * FROM export_jobs WHERE tool_id = $1 ORDER BY created_at DESC';
    const result = await this.dbPool.query(query, [toolId]);
    return result.rows.map((row) => this.mapRowToJob(row));
  }

  /**
   * Delete export jobs older than retention period.
   * Only deletes completed, failed, cancelled, or rolled_back jobs.
   * Keeps in_progress jobs indefinitely to prevent data loss.
   * @param retentionDays - Number of days to retain jobs
   * @returns Number of deleted jobs
   * @example
   * const deletedCount = await repository.deleteOldJobs(30);
   * console.log(`Deleted ${deletedCount} old export jobs`);
   */
  async deleteOldJobs(retentionDays: number): Promise<number> {
    const query = `
      DELETE FROM export_jobs
      WHERE created_at < NOW() - INTERVAL $1
        AND status IN ('completed', 'failed', 'cancelled', 'rolled_back')
      RETURNING job_id
    `;

    const result = await this.dbPool.query(query, [`${retentionDays} days`]);
    return result.rowCount || 0;
  }

  /**
   * Delete export job by ID.
   * Use with caution - prefer soft delete via status update.
   * @param jobId - Export job UUID
   * @returns True if job was deleted, false if not found
   * @example
   * const deleted = await repository.delete('abc-123');
   */
  async delete(jobId: string): Promise<boolean> {
    const result = await this.dbPool.query(
      'DELETE FROM export_jobs WHERE job_id = $1',
      [jobId]
    );
    return (result.rowCount || 0) > 0;
  }

  /**
   * Map database row to ExportJob interface.
   * Converts snake_case database columns to camelCase TypeScript properties.
   * @param row - Database row from pg query result
   * @returns Export job object with camelCase properties
   */
  private mapRowToJob(row: ExportJobRow): ExportJob {
    return {
      jobId: row.job_id,
      toolId: row.tool_id,
      userId: row.user_id,
      status: row.status as ExportJobStatus,
      stepsCompleted: row.steps_completed,
      stepsTotal: row.steps_total,
      currentStep: row.current_step,
      progressPercentage: row.progress_percentage,
      packagePath: row.package_path,
      packageSizeBytes: row.package_size_bytes
        ? parseInt(row.package_size_bytes, 10)
        : null,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  }

  /**
   * Convert camelCase to snake_case.
   * Used for building dynamic UPDATE queries.
   * @param str - camelCase string
   * @returns snake_case string
   * @example
   * camelToSnake('progressPercentage') // returns 'progress_percentage'
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}

// Export singleton instance
export default new ExportJobRepository();
