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
        INNER JOIN forms f ON fsch.form_id = f.id
        WHERE fs.form_schema_id = $1
      `;

      const values: (string | null)[] = [formSchemaId];

      // Add tenant filter if multi-tenancy is enabled
      if (tenantId !== null) {
        query += ` AND f.tenant_id = $2`;
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
        firstSubmissionAt: row.first_submission_at !== null
          ? row.first_submission_at.toISOString()
          : null,
        lastSubmissionAt: row.last_submission_at !== null
          ? row.last_submission_at.toISOString()
          : null,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('[AnalyticsRepository] Error fetching submission counts:', error);
      throw new Error(`Failed to fetch submission counts: ${errorMessage}`);
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
        INNER JOIN forms f ON fsch.form_id = f.id
        WHERE fs.form_schema_id = $1
          AND fs.values_json ? $2
      `;

      const values: any[] = [formSchemaId, fieldKey];

      // Add tenant filter if multi-tenancy is enabled
      if (tenantId !== null) {
        query += ` AND f.tenant_id = $3`;
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
        INNER JOIN forms f ON fsch.form_id = f.id
        WHERE fs.form_schema_id = $1
      `;

      const values: any[] = [formSchemaId];

      // Add tenant filter if multi-tenancy is enabled
      if (tenantId !== null) {
        query += ` AND f.tenant_id = $2`;
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
        INNER JOIN forms f ON fsch.form_id = f.id
        WHERE fs.form_schema_id = $1
      `;

      const values: any[] = [formSchemaId];

      // Add tenant filter if multi-tenancy is enabled
      if (tenantId !== null) {
        query += ` AND f.tenant_id = $2`;
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

  /**
   * Gets poll option counts for a specific form.
   *
   * Aggregates poll submissions to count votes per option.
   * Designed for Poll template category analytics.
   *
   * Uses JSONB operators to efficiently extract and count poll votes.
   * Query optimized with indexes on form_schema_id and JSONB GIN indexes.
   *
   * Returns empty array if no submissions exist (allowing strategies to
   * populate zero-vote default metrics).
   *
   * @param formSchemaId - UUID of the poll form schema to analyze
   * @param fieldKey - JSONB field key containing the poll option (e.g., 'poll_option')
   * @param tenantId - Optional tenant ID for filtering (null for non-tenant mode)
   * @returns Promise containing array of option counts sorted by count descending
   * @throws {Error} When database query fails
   *
   * @example
   * ```typescript
   * const pollCounts = await analyticsRepository.getPollOptionCounts(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   'poll_option',
   *   'tenant-abc'
   * );
   * // [
   * //   { option: 'Option A', count: 75 },
   * //   { option: 'Option B', count: 45 },
   * //   { option: 'Option C', count: 30 }
   * // ]
   * ```
   */
  async getPollOptionCounts(
    formSchemaId: string,
    fieldKey: string,
    tenantId: string | null
  ): Promise<Array<{ option: string; count: number }>> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          fs.values_json ->> $2 as option,
          COUNT(*) as count
        FROM form_submissions fs
        INNER JOIN form_schemas fsch ON fs.form_schema_id = fsch.id
        INNER JOIN forms f ON fsch.form_id = f.id
        WHERE fs.form_schema_id = $1
          AND fs.values_json ? $2
      `;

      const values: any[] = [formSchemaId, fieldKey];

      // Add tenant filter if multi-tenancy is enabled
      if (tenantId !== null) {
        query += ` AND f.tenant_id = $3`;
        values.push(tenantId);
      }

      query += `
        GROUP BY fs.values_json ->> $2
        ORDER BY count DESC
      `;

      const result = await client.query(query, values);

      return result.rows.map((row) => ({
        option: row.option,
        count: parseInt(row.count, 10),
      }));
    } catch (error: any) {
      console.error('[AnalyticsRepository] Error fetching poll option counts:', error);
      throw new Error(`Failed to fetch poll option counts: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Gets quiz score distribution grouped into histogram buckets.
   *
   * Aggregates quiz submissions to create score distribution histogram.
   * Designed for Quiz template category analytics.
   *
   * Groups scores into predefined buckets (0-20, 21-40, 41-60, 61-80, 81-100)
   * using SQL CASE expressions for efficient server-side aggregation.
   *
   * Filters out null/invalid scores and returns empty array if no valid
   * scores exist (allowing strategies to populate default metrics).
   *
   * @param formSchemaId - UUID of the quiz form schema to analyze
   * @param scoreFieldKey - JSONB field key containing the quiz score (e.g., 'score', 'quiz_score')
   * @param tenantId - Optional tenant ID for filtering (null for non-tenant mode)
   * @returns Promise containing score buckets with counts
   * @throws {Error} When database query fails
   *
   * @example
   * ```typescript
   * const scoreBuckets = await analyticsRepository.getQuizScoreBuckets(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   'score',
   *   'tenant-abc'
   * );
   * // [
   * //   { bucket: '0-20', count: 10 },
   * //   { bucket: '21-40', count: 15 },
   * //   { bucket: '41-60', count: 25 },
   * //   { bucket: '61-80', count: 80 },
   * //   { bucket: '81-100', count: 70 }
   * // ]
   * ```
   */
  async getQuizScoreBuckets(
    formSchemaId: string,
    scoreFieldKey: string,
    tenantId: string | null
  ): Promise<Array<{ bucket: string; count: number }>> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          CASE
            WHEN (fs.values_json ->> $2)::numeric BETWEEN 0 AND 20 THEN '0-20'
            WHEN (fs.values_json ->> $2)::numeric BETWEEN 21 AND 40 THEN '21-40'
            WHEN (fs.values_json ->> $2)::numeric BETWEEN 41 AND 60 THEN '41-60'
            WHEN (fs.values_json ->> $2)::numeric BETWEEN 61 AND 80 THEN '61-80'
            WHEN (fs.values_json ->> $2)::numeric BETWEEN 81 AND 100 THEN '81-100'
          END as bucket,
          COUNT(*) as count
        FROM form_submissions fs
        INNER JOIN form_schemas fsch ON fs.form_schema_id = fsch.id
        INNER JOIN forms f ON fsch.form_id = f.id
        WHERE fs.form_schema_id = $1
          AND fs.values_json ? $2
          AND fs.values_json ->> $2 ~ '^[0-9]+(\\.[0-9]+)?$'
      `;

      const values: any[] = [formSchemaId, scoreFieldKey];

      // Add tenant filter if multi-tenancy is enabled
      if (tenantId !== null) {
        query += ` AND f.tenant_id = $3`;
        values.push(tenantId);
      }

      query += `
        GROUP BY bucket
        ORDER BY bucket ASC
      `;

      const result = await client.query(query, values);

      return result.rows
        .filter((row) => row.bucket !== null) // Filter out scores outside 0-100 range
        .map((row) => ({
          bucket: row.bucket,
          count: parseInt(row.count, 10),
        }));
    } catch (error: any) {
      console.error('[AnalyticsRepository] Error fetching quiz score buckets:', error);
      throw new Error(`Failed to fetch quiz score buckets: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Gets product sales aggregation (revenue, quantities, top products).
   * Aggregates JSONB fields: quantity, price, product_id, product_name.
   *
   * @param formSchemaId - UUID of the form schema
   * @param tenantId - Optional tenant ID for filtering
   * @returns Promise with product sales data
   */
  async getProductSalesData(
    formSchemaId: string,
    tenantId: string | null
  ): Promise<{
    totalRevenue: number;
    totalItemsSold: number;
    productBreakdown: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
  }> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT
          COALESCE(SUM((fs.values_json->>'quantity')::numeric * (fs.values_json->>'price')::numeric), 0) as total_revenue,
          COALESCE(SUM((fs.values_json->>'quantity')::numeric), 0) as total_items_sold,
          json_agg(
            json_build_object(
              'productId', fs.values_json->>'product_id',
              'name', fs.values_json->>'product_name',
              'quantity', COALESCE((fs.values_json->>'quantity')::numeric, 0),
              'revenue', COALESCE((fs.values_json->>'quantity')::numeric * (fs.values_json->>'price')::numeric, 0)
            )
          ) FILTER (WHERE fs.values_json->>'product_id' IS NOT NULL) as product_breakdown
        FROM form_submissions fs
        INNER JOIN form_schemas fsch ON fs.form_schema_id = fsch.id
        INNER JOIN forms f ON fsch.form_id = f.id
        WHERE fs.form_schema_id = $1
      `;

      const values: any[] = [formSchemaId];

      // Add tenant filter if multi-tenancy is enabled
      if (tenantId !== null) {
        query += ` AND f.tenant_id = $2`;
        values.push(tenantId);
      }

      const result = await client.query(query, values);
      const row = result.rows[0];

      return {
        totalRevenue: parseFloat(row.total_revenue) || 0,
        totalItemsSold: parseFloat(row.total_items_sold) || 0,
        productBreakdown: row.product_breakdown || [],
      };
    } finally {
      client.release();
    }
  }

  /**
   * Gets appointment booking time slot aggregation for heatmap.
   * Groups bookings by time slot and day of week.
   *
   * @param formSchemaId - UUID of the form schema
   * @param tenantId - Optional tenant ID for filtering
   * @returns Promise with time slot booking counts
   */
  async getAppointmentTimeSlots(
    formSchemaId: string,
    tenantId: string | null
  ): Promise<Array<{ timeSlot: string; dayOfWeek: string; bookings: number }>> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT
          fs.values_json->>'time_slot' as time_slot,
          TO_CHAR((fs.values_json->>'booking_date')::date, 'Day') as day_of_week,
          COUNT(*) as bookings
        FROM form_submissions fs
        INNER JOIN form_schemas fsch ON fs.form_schema_id = fsch.id
        INNER JOIN forms f ON fsch.form_id = f.id
        WHERE fs.form_schema_id = $1
          AND fs.values_json->>'time_slot' IS NOT NULL
      `;

      const values: any[] = [formSchemaId];

      // Add tenant filter if multi-tenancy is enabled
      if (tenantId !== null) {
        query += ` AND f.tenant_id = $2`;
        values.push(tenantId);
      }

      query += `
        GROUP BY fs.values_json->>'time_slot', TO_CHAR((fs.values_json->>'booking_date')::date, 'Day')
        ORDER BY bookings DESC
      `;

      const result = await client.query(query, values);
      return result.rows.map((row) => ({
        timeSlot: row.time_slot,
        dayOfWeek: row.day_of_week.trim(),
        bookings: parseInt(row.bookings, 10),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Gets restaurant menu item popularity aggregation.
   * Aggregates quantities and revenue per menu item.
   *
   * @param formSchemaId - UUID of the form schema
   * @param tenantId - Optional tenant ID for filtering
   * @returns Promise with menu item popularity data
   */
  async getRestaurantItemPopularity(
    formSchemaId: string,
    tenantId: string | null
  ): Promise<{
    totalRevenue: number;
    totalItemsOrdered: number;
    itemBreakdown: Array<{ itemName: string; quantity: number; revenue: number }>;
  }> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT
          COALESCE(SUM((fs.values_json->>'quantity')::numeric * (fs.values_json->>'price')::numeric), 0) as total_revenue,
          COALESCE(SUM((fs.values_json->>'quantity')::numeric), 0) as total_items_ordered,
          json_agg(
            json_build_object(
              'itemName', fs.values_json->>'item_name',
              'quantity', COALESCE((fs.values_json->>'quantity')::numeric, 0),
              'revenue', COALESCE((fs.values_json->>'quantity')::numeric * (fs.values_json->>'price')::numeric, 0)
            )
          ) FILTER (WHERE fs.values_json->>'item_name' IS NOT NULL) as item_breakdown
        FROM form_submissions fs
        INNER JOIN form_schemas fsch ON fs.form_schema_id = fsch.id
        INNER JOIN forms f ON fsch.form_id = f.id
        WHERE fs.form_schema_id = $1
      `;

      const values: any[] = [formSchemaId];

      // Add tenant filter if multi-tenancy is enabled
      if (tenantId !== null) {
        query += ` AND f.tenant_id = $2`;
        values.push(tenantId);
      }

      const result = await client.query(query, values);
      const row = result.rows[0];

      return {
        totalRevenue: parseFloat(row.total_revenue) || 0,
        totalItemsOrdered: parseFloat(row.total_items_ordered) || 0,
        itemBreakdown: row.item_breakdown || [],
      };
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
