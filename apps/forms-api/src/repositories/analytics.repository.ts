/**
 * Analytics Repository
 *
 * Provides reusable JSONB aggregation helpers for form submission analytics.
 * All queries target the FORMS database (form_submissions table).
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.2: Backend Analytics Strategy Pattern and Base Infrastructure
 *
 * @since 2025-01-27
 */

import { Pool } from 'pg';
import { formsPool } from '../config/multi-database.config';

/**
 * Submission count aggregation result.
 * Used by generic analytics and as base for category-specific strategies.
 */
export interface SubmissionCountResult {
  /** Total number of submissions for the form */
  totalSubmissions: number;
  /** ISO timestamp of first submission (null if no submissions) */
  firstSubmissionAt: string | null;
  /** ISO timestamp of last submission (null if no submissions) */
  lastSubmissionAt: string | null;
}

/**
 * Choice field breakdown result.
 * Aggregates JSONB field values into counts per option.
 */
export interface ChoiceBreakdownResult {
  /** Field key in JSONB */
  fieldKey: string;
  /** Option value (choice text) */
  optionValue: string;
  /** Number of submissions with this choice */
  count: number;
}

/**
 * Time window aggregation result.
 * Groups submissions by date/hour for time-series analytics.
 */
export interface TimeWindowResult {
  /** Time bucket (date or hour) */
  timeBucket: string;
  /** Number of submissions in this bucket */
  count: number;
}

/**
 * Repository for analytics database operations.
 *
 * Provides category-agnostic aggregation primitives that strategies
 * can compose for specialized analytics.
 *
 * All methods:
 * - Use parameterized queries to prevent SQL injection
 * - Support tenant isolation (filter by tenantId when provided)
 * - Return empty/default results when no data exists
 * - Log errors and rethrow with context
 *
 * @example
 * ```typescript
 * const repo = new AnalyticsRepository();
 * const counts = await repo.getSubmissionCounts(formId, tenantId);
 * console.log(`Total submissions: ${counts.totalSubmissions}`);
 * ```
 */
export class AnalyticsRepository {
  /**
   * PostgreSQL connection pool for FORMS database.
   * Shared across all repository methods.
   */
  private get pool(): Pool {
    return formsPool;
  }

  /**
   * Gets submission counts and time range for a form.
   *
   * Returns:
   * - Total number of submissions
   * - Timestamp of first submission
   * - Timestamp of most recent submission
   *
   * Handles tenant isolation by joining with form_schemas table.
   *
   * @param formSchemaId - UUID of the form schema to analyze
   * @param tenantId - Optional tenant ID for filtering (null for non-tenant mode)
   * @returns Promise containing submission counts and time range
   * @throws {Error} When database query fails
   *
   * @example
   * ```typescript
   * const counts = await analyticsRepository.getSubmissionCounts(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   'tenant-abc'
   * );
   * // { totalSubmissions: 150, firstSubmissionAt: '2025-01-01T...', lastSubmissionAt: '2025-01-15T...' }
   * ```
   */
  async getSubmissionCounts(
    formSchemaId: string,
    tenantId: string | null
  ): Promise<SubmissionCountResult> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          COUNT(*) as total_submissions,
          MIN(fs.submitted_at) as first_submission_at,
          MAX(fs.submitted_at) as last_submission_at
        FROM form_submissions fs
        INNER JOIN form_schemas fsch ON fs.form_schema_id = fsch.id
        WHERE fs.form_schema_id = $1
      `;

      const values: any[] = [formSchemaId];

      // Add tenant filter if multi-tenancy is enabled
      if (tenantId !== null) {
        query += ` AND fsch.tenant_id = $2`;
        values.push(tenantId);
      }

      const result = await client.query(query, values);

      if (result.rows.length === 0 || result.rows[0].total_submissions === '0') {
        return {
          totalSubmissions: 0,
          firstSubmissionAt: null,
          lastSubmissionAt: null,
        };
      }

      const row = result.rows[0];
      return {
        totalSubmissions: parseInt(row.total_submissions, 10),
        firstSubmissionAt: row.first_submission_at?.toISOString() || null,
        lastSubmissionAt: row.last_submission_at?.toISOString() || null,
      };
    } catch (error: any) {
      console.error('[AnalyticsRepository] Error fetching submission counts:', error);
      throw new Error(`Failed to fetch submission counts: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Gets breakdown of choices for a specific JSONB field.
   *
   * Aggregates JSONB values into counts per option.
   * Useful for poll voting, quiz question analysis, and choice field statistics.
   *
   * Uses PostgreSQL JSONB operators:
   * - `->>` for text extraction
   * - `->` for nested object navigation
   *
   * @param formSchemaId - UUID of the form schema to analyze
   * @param fieldKey - JSONB field key to aggregate (e.g., 'poll_option', 'question_1')
   * @param tenantId - Optional tenant ID for filtering (null for non-tenant mode)
   * @returns Promise containing array of choice breakdowns sorted by count descending
   * @throws {Error} When database query fails
   *
   * @example
   * ```typescript
   * const breakdown = await analyticsRepository.getChoiceBreakdown(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   'poll_option',
   *   'tenant-abc'
   * );
   * // [
   * //   { fieldKey: 'poll_option', optionValue: 'Option A', count: 75 },
   * //   { fieldKey: 'poll_option', optionValue: 'Option B', count: 45 }
   * // ]
   * ```
   */
  async getChoiceBreakdown(
    formSchemaId: string,
    fieldKey: string,
    tenantId: string | null
  ): Promise<ChoiceBreakdownResult[]> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          $2 as field_key,
          fs.values_json ->> $2 as option_value,
          COUNT(*) as count
        FROM form_submissions fs
        INNER JOIN form_schemas fsch ON fs.form_schema_id = fsch.id
        WHERE fs.form_schema_id = $1
          AND fs.values_json ? $2
      `;

      const values: any[] = [formSchemaId, fieldKey];

      // Add tenant filter if multi-tenancy is enabled
      if (tenantId !== null) {
        query += ` AND fsch.tenant_id = $3`;
        values.push(tenantId);
      }

      query += `
        GROUP BY fs.values_json ->> $2
        ORDER BY count DESC
      `;

      const result = await client.query(query, values);

      return result.rows.map((row) => ({
        fieldKey: row.field_key,
        optionValue: row.option_value,
        count: parseInt(row.count, 10),
      }));
    } catch (error: any) {
      console.error('[AnalyticsRepository] Error fetching choice breakdown:', error);
      throw new Error(`Failed to fetch choice breakdown: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Gets submissions grouped by time windows.
   *
   * Supports different granularities:
   * - 'day': Groups by date (YYYY-MM-DD)
   * - 'hour': Groups by hour (YYYY-MM-DD HH:00)
   * - 'week': Groups by week start date
   *
   * Useful for time-series charts and trend analysis.
   *
   * @param formSchemaId - UUID of the form schema to analyze
   * @param granularity - Time window granularity ('day', 'hour', 'week')
   * @param tenantId - Optional tenant ID for filtering (null for non-tenant mode)
   * @returns Promise containing array of time window results sorted by time ascending
   * @throws {Error} When database query fails or invalid granularity
   *
   * @example
   * ```typescript
   * const timeline = await analyticsRepository.getSubmissionsByTimeWindow(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   'day',
   *   'tenant-abc'
   * );
   * // [
   * //   { timeBucket: '2025-01-01', count: 12 },
   * //   { timeBucket: '2025-01-02', count: 18 },
   * //   { timeBucket: '2025-01-03', count: 15 }
   * // ]
   * ```
   */
  async getSubmissionsByTimeWindow(
    formSchemaId: string,
    granularity: 'day' | 'hour' | 'week',
    tenantId: string | null
  ): Promise<TimeWindowResult[]> {
    const client = await this.pool.connect();

    try {
      // Select appropriate date truncation function
      let dateTrunc: string;
      switch (granularity) {
        case 'day':
          dateTrunc = "DATE(fs.submitted_at)";
          break;
        case 'hour':
          dateTrunc = "DATE_TRUNC('hour', fs.submitted_at)";
          break;
        case 'week':
          dateTrunc = "DATE_TRUNC('week', fs.submitted_at)";
          break;
        default:
          throw new Error(`Invalid granularity: ${granularity}`);
      }

      let query = `
        SELECT
          ${dateTrunc} as time_bucket,
          COUNT(*) as count
        FROM form_submissions fs
        INNER JOIN form_schemas fsch ON fs.form_schema_id = fsch.id
        WHERE fs.form_schema_id = $1
      `;

      const values: any[] = [formSchemaId];

      // Add tenant filter if multi-tenancy is enabled
      if (tenantId !== null) {
        query += ` AND fsch.tenant_id = $2`;
        values.push(tenantId);
      }

      query += `
        GROUP BY time_bucket
        ORDER BY time_bucket ASC
      `;

      const result = await client.query(query, values);

      return result.rows.map((row) => ({
        timeBucket: row.time_bucket instanceof Date
          ? row.time_bucket.toISOString()
          : row.time_bucket,
        count: parseInt(row.count, 10),
      }));
    } catch (error: any) {
      console.error('[AnalyticsRepository] Error fetching time window data:', error);
      throw new Error(`Failed to fetch time window data: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Gets all submission values as JSONB for custom aggregation.
   *
   * Low-level method for strategies that need full access to submission data.
   * Use higher-level methods (getChoiceBreakdown, etc.) when possible for performance.
   *
   * Warning: Can return large result sets. Consider adding limit parameter for production use.
   *
   * @param formSchemaId - UUID of the form schema to analyze
   * @param tenantId - Optional tenant ID for filtering (null for non-tenant mode)
   * @returns Promise containing array of JSONB values
   * @throws {Error} When database query fails
   *
   * @example
   * ```typescript
   * const submissions = await analyticsRepository.getAllSubmissionValues(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   'tenant-abc'
   * );
   * // Custom aggregation logic here
   * const averageScore = submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length;
   * ```
   */
  async getAllSubmissionValues(
    formSchemaId: string,
    tenantId: string | null
  ): Promise<Record<string, any>[]> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT fs.values_json
        FROM form_submissions fs
        INNER JOIN form_schemas fsch ON fs.form_schema_id = fsch.id
        WHERE fs.form_schema_id = $1
      `;

      const values: any[] = [formSchemaId];

      // Add tenant filter if multi-tenancy is enabled
      if (tenantId !== null) {
        query += ` AND fsch.tenant_id = $2`;
        values.push(tenantId);
      }

      query += ` ORDER BY fs.submitted_at DESC`;

      const result = await client.query(query, values);

      return result.rows.map((row) => row.values_json);
    } catch (error: any) {
      console.error('[AnalyticsRepository] Error fetching submission values:', error);
      throw new Error(`Failed to fetch submission values: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

/**
 * Singleton instance for use across the application.
 * Strategies should import this instance rather than creating new ones.
 */
export const analyticsRepository = new AnalyticsRepository();
