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
  ExportJobWithTool,
  ListExportJobsOptions,
} from '@nodeangularfullstack/shared';
import { dashboardPool as pool } from '../config/multi-database.config';

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
  download_count: number;
  last_downloaded_at: Date | null;
  package_expires_at: Date | null;
  package_retention_days: number;
  package_checksum: string | null;
  package_algorithm: string;
  checksum_verified_at: Date | null;
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
      WHERE created_at < NOW() - make_interval(days => $1)
        AND status IN ('completed', 'failed', 'cancelled', 'rolled_back')
      RETURNING job_id
    `;

    const result = await this.dbPool.query(query, [retentionDays]);
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
   * Find export jobs with expired packages.
   * Returns jobs where package_expires_at < NOW() and package_path is not null.
   * Used by package cleanup job to identify packages for deletion.
   * @returns Array of expired export jobs with packages
   * @example
   * const expiredJobs = await repository.findExpiredPackages();
   * console.log(`Found ${expiredJobs.length} expired packages`);
   */
  async findExpiredPackages(): Promise<ExportJob[]> {
    const query = `
      SELECT * FROM export_jobs
      WHERE package_expires_at < NOW()
        AND package_path IS NOT NULL
      ORDER BY package_expires_at ASC
    `;

    const result = await this.dbPool.query(query);
    return result.rows.map((row) => this.mapRowToJob(row));
  }

  /**
   * Increment download count and update last downloaded timestamp for an export job.
   * Atomically increments the download_count column by 1 and sets last_downloaded_at to NOW().
   * @param jobId - Unique identifier of the export job
   * @returns Updated export job with incremented download count
   * @example
   * const job = await repository.incrementDownloadCount('abc-123');
   * console.log(`Download count: ${job.downloadCount}`);
   */
  async incrementDownloadCount(jobId: string): Promise<ExportJob> {
    const query = `
      UPDATE export_jobs
      SET
        download_count = COALESCE(download_count, 0) + 1,
        last_downloaded_at = NOW(),
        updated_at = NOW()
      WHERE job_id = $1
      RETURNING *
    `;

    const result = await this.dbPool.query(query, [jobId]);
    if (!result.rows[0]) {
      throw new Error(`Export job not found: ${jobId}`);
    }
    return this.mapRowToJob(result.rows[0]);
  }

  /**
   * List export jobs with pagination, filtering, and sorting.
   * Joins with tool_registry table to include tool metadata.
   * Supports admin users seeing all jobs or regular users seeing only their own.
   *
   * @param userId - User ID to filter by (null for admin viewing all jobs)
   * @param options - Query options for filtering, sorting, and pagination
   * @returns Object with jobs array and total count
   * @throws Error if invalid sort field or order specified
   * @example
   * const result = await repository.list('user-123', {
   *   limit: 20,
   *   offset: 0,
   *   sortBy: 'created_at',
   *   sortOrder: 'desc',
   *   statusFilter: 'completed,failed'
   * });
   * console.log(`Found ${result.total} jobs, showing ${result.jobs.length}`);
   */
  async list(
    userId: string | null,
    options: ListExportJobsOptions = {}
  ): Promise<{ jobs: ExportJobWithTool[]; total: number }> {
    // Extract and validate options with defaults
    const limit = Math.min(options.limit || 20, 100); // Max 100 per page
    const offset = options.offset || 0;
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';

    // Validate sort parameters
    const validSortFields = [
      'created_at',
      'completed_at',
      'download_count',
      'package_size_bytes',
    ];
    if (!validSortFields.includes(sortBy)) {
      throw new Error(`Invalid sort field: ${sortBy}`);
    }
    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
      throw new Error(`Invalid sort order: ${sortOrder}`);
    }

    // Build WHERE clauses
    const whereClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Filter by user ID (null for admin viewing all jobs)
    if (userId !== null) {
      whereClauses.push(`ej.user_id = $${paramIndex}`);
      values.push(userId);
      paramIndex++;
    }

    // Filter by status (comma-separated list)
    if (options.statusFilter) {
      const statuses = options.statusFilter.split(',').map((s) => s.trim());
      const placeholders = statuses.map(() => `$${paramIndex++}`).join(', ');
      whereClauses.push(`ej.status IN (${placeholders})`);
      values.push(...statuses);
    }

    // Filter by tool ID (using tool_id since tool_type column doesn't exist)
    if (options.toolTypeFilter) {
      whereClauses.push(`tr.tool_id = $${paramIndex}`);
      values.push(options.toolTypeFilter);
      paramIndex++;
    }

    // Filter by date range
    if (options.startDate) {
      whereClauses.push(`ej.created_at >= $${paramIndex}`);
      values.push(options.startDate);
      paramIndex++;
    }
    if (options.endDate) {
      whereClauses.push(`ej.created_at <= $${paramIndex}`);
      values.push(options.endDate);
      paramIndex++;
    }

    // Build WHERE clause string
    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Query for total count (without LIMIT/OFFSET)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM export_jobs ej
      INNER JOIN tool_registry tr ON ej.tool_id = tr.tool_id
      ${whereClause}
    `;

    const countResult = await this.dbPool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    // Query for paginated results with tool metadata
    const dataQuery = `
      SELECT
        ej.*,
        tr.name as tool_name,
        tr.tool_id as tool_type,
        tr.description as tool_description
      FROM export_jobs ej
      INNER JOIN tool_registry tr ON ej.tool_id = tr.tool_id
      ${whereClause}
      ORDER BY ej.${sortBy} ${sortOrder}
      LIMIT $${paramIndex}
      OFFSET $${paramIndex + 1}
    `;

    const dataValues = [...values, limit, offset];
    const dataResult = await this.dbPool.query(dataQuery, dataValues);

    // Map results to ExportJobWithTool interface
    const jobs: ExportJobWithTool[] = dataResult.rows.map((row) => ({
      ...this.mapRowToJob(row),
      toolName: row.tool_name,
      toolType: row.tool_type,
      toolDescription: row.tool_description,
    }));

    return { jobs, total };
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
      downloadCount: row.download_count,
      lastDownloadedAt: row.last_downloaded_at,
      packageExpiresAt: row.package_expires_at,
      packageRetentionDays: row.package_retention_days,
      packageChecksum: row.package_checksum,
      packageAlgorithm: row.package_algorithm,
      checksumVerifiedAt: row.checksum_verified_at,
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
