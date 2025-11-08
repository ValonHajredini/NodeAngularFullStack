import { BaseRepository, TenantContext } from './base.repository';
import { DatabaseType } from '../config/multi-database.config';
import { TokenUsage, TokenUsageFilters } from '@nodeangularfullstack/shared';

/**
 * Repository for managing API token usage records.
 * Provides database operations for token usage tracking and analytics.
 */
export class TokenUsageRepository extends BaseRepository<TokenUsage> {
  constructor() {
    super('api_token_usage', DatabaseType.AUTH);
  }

  /**
   * Finds token usage records for a specific token with pagination and filtering.
   * @param tokenId - API token ID to find usage for
   * @param filters - Optional filters for date range and status
   * @param tenantContext - Optional tenant context for isolation
   * @param pagination - Pagination options
   * @returns Promise containing paginated token usage records
   * @throws {Error} When query fails
   * @example
   * const usage = await repository.findUsageByTokenId('token-uuid', {
   *   from: new Date('2024-01-01'),
   *   to: new Date('2024-12-31'),
   *   status: [200, 201]
   * }, tenantContext, { page: 1, limit: 50 });
   */
  async findUsageByTokenId(
    tokenId: string,
    filters: TokenUsageFilters = {},
    tenantContext?: TenantContext,
    pagination: { page?: number; limit?: number } = {}
  ): Promise<{
    usage: TokenUsage[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const client = await this.pool.connect();

    try {
      const { page = 1, limit = 50 } = pagination;
      const offset = (page - 1) * limit;

      // Build the WHERE clause
      let whereClause = 'WHERE token_id = $1';
      const params: any[] = [tokenId];
      let paramCount = 1;

      // Add tenant filtering
      if (tenantContext) {
        paramCount++;
        whereClause += ` AND tenant_id = $${paramCount}`;
        params.push(tenantContext.id);
      }

      // Add date range filtering
      if (filters.from) {
        paramCount++;
        whereClause += ` AND timestamp >= $${paramCount}`;
        params.push(filters.from);
      }

      if (filters.to) {
        paramCount++;
        whereClause += ` AND timestamp <= $${paramCount}`;
        params.push(filters.to);
      }

      // Add status code filtering
      if (filters.status && filters.status.length > 0) {
        paramCount++;
        whereClause += ` AND response_status = ANY($${paramCount})`;
        params.push(filters.status);
      }

      // Add endpoint filtering
      if (filters.endpoint) {
        paramCount++;
        whereClause += ` AND endpoint ILIKE $${paramCount}`;
        params.push(`%${filters.endpoint}%`);
      }

      // Add method filtering
      if (filters.method) {
        paramCount++;
        whereClause += ` AND method = $${paramCount}`;
        params.push(filters.method);
      }

      // Count query for total records
      const countQuery = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count, 10);

      // Main query with pagination
      const query = `
        SELECT * FROM ${this.tableName}
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      params.push(limit, offset);

      const result = await client.query(query, params);
      const usage = result.rows as TokenUsage[];

      const totalPages = Math.ceil(total / limit);

      return {
        usage,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error: any) {
      throw new Error(`Failed to find token usage: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Gets usage statistics for a specific token.
   * @param tokenId - API token ID to get statistics for
   * @param tenantContext - Optional tenant context for isolation
   * @param dateRange - Optional date range for statistics
   * @returns Promise containing usage statistics
   * @throws {Error} When query fails
   */
  async getUsageStats(
    tokenId: string,
    tenantContext?: TenantContext,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    requestsByStatus: Array<{ status: number; count: number }>;
  }> {
    const client = await this.pool.connect();

    try {
      let whereClause = 'WHERE token_id = $1';
      const params: any[] = [tokenId];
      let paramCount = 1;

      // Add tenant filtering
      if (tenantContext) {
        paramCount++;
        whereClause += ` AND tenant_id = $${paramCount}`;
        params.push(tenantContext.id);
      }

      // Add date range filtering
      if (dateRange) {
        paramCount++;
        whereClause += ` AND timestamp >= $${paramCount}`;
        params.push(dateRange.from);

        paramCount++;
        whereClause += ` AND timestamp <= $${paramCount}`;
        params.push(dateRange.to);
      }

      // Get basic statistics
      const statsQuery = `
        SELECT
          COUNT(*) as total_requests,
          COUNT(CASE WHEN response_status < 400 THEN 1 END) as successful_requests,
          COUNT(CASE WHEN response_status >= 400 THEN 1 END) as failed_requests,
          COALESCE(AVG(processing_time), 0) as average_response_time
        FROM ${this.tableName}
        ${whereClause}
      `;

      const statsResult = await client.query(statsQuery, params);
      const stats = statsResult.rows[0];

      // Get top endpoints
      const endpointsQuery = `
        SELECT endpoint, COUNT(*) as count
        FROM ${this.tableName}
        ${whereClause}
        GROUP BY endpoint
        ORDER BY count DESC
        LIMIT 10
      `;

      const endpointsResult = await client.query(endpointsQuery, params);

      // Get requests by status code
      const statusQuery = `
        SELECT response_status as status, COUNT(*) as count
        FROM ${this.tableName}
        ${whereClause}
        GROUP BY response_status
        ORDER BY response_status
      `;

      const statusResult = await client.query(statusQuery, params);

      return {
        totalRequests: parseInt(stats.total_requests, 10),
        successfulRequests: parseInt(stats.successful_requests, 10),
        failedRequests: parseInt(stats.failed_requests, 10),
        averageResponseTime: parseFloat(stats.average_response_time),
        topEndpoints: endpointsResult.rows.map((row) => ({
          endpoint: row.endpoint,
          count: parseInt(row.count, 10),
        })),
        requestsByStatus: statusResult.rows.map((row) => ({
          status: parseInt(row.status, 10),
          count: parseInt(row.count, 10),
        })),
      };
    } catch (error: any) {
      throw new Error(`Failed to get usage statistics: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds the most recent usage record for a token.
   * Used to update the last_used_at field on the token record.
   * @param tokenId - API token ID
   * @param tenantContext - Optional tenant context for isolation
   * @returns Promise containing the most recent usage record or null
   * @throws {Error} When query fails
   */
  async findLastUsage(
    tokenId: string,
    tenantContext?: TenantContext
  ): Promise<TokenUsage | null> {
    const client = await this.pool.connect();

    try {
      let whereClause = 'WHERE token_id = $1';
      const params: any[] = [tokenId];
      let paramCount = 1;

      // Add tenant filtering
      if (tenantContext) {
        paramCount++;
        whereClause += ` AND tenant_id = $${paramCount}`;
        params.push(tenantContext.id);
      }

      const query = `
        SELECT * FROM ${this.tableName}
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      const result = await client.query(query, params);
      return result.rows.length > 0 ? (result.rows[0] as TokenUsage) : null;
    } catch (error: any) {
      throw new Error(`Failed to find last usage: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes old usage records for maintenance.
   * @param retentionDays - Number of days to retain usage records
   * @param tenantContext - Optional tenant context for isolation
   * @returns Promise containing number of records deleted
   * @throws {Error} When deletion fails
   */
  async cleanupOldUsage(
    retentionDays: number = 90,
    tenantContext?: TenantContext
  ): Promise<number> {
    const client = await this.pool.connect();

    try {
      let whereClause = `WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'`;
      const params: any[] = [];

      // Add tenant filtering
      if (tenantContext) {
        whereClause += ` AND tenant_id = $1`;
        params.push(tenantContext.id);
      }

      const query = `DELETE FROM ${this.tableName} ${whereClause}`;
      const result = await client.query(query, params);

      return result.rowCount || 0;
    } catch (error: any) {
      throw new Error(`Failed to cleanup old usage records: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Gets usage aggregated by time period (daily/hourly).
   * @param tokenId - API token ID
   * @param period - Aggregation period ('hour' | 'day')
   * @param tenantContext - Optional tenant context for isolation
   * @param dateRange - Optional date range for aggregation
   * @returns Promise containing time-series usage data
   * @throws {Error} When query fails
   */
  async getUsageTimeSeries(
    tokenId: string,
    period: 'hour' | 'day' = 'day',
    tenantContext?: TenantContext,
    dateRange?: { from: Date; to: Date }
  ): Promise<
    Array<{ period: string; requests: number; averageResponseTime: number }>
  > {
    const client = await this.pool.connect();

    try {
      let whereClause = 'WHERE token_id = $1';
      const params: any[] = [tokenId];
      let paramCount = 1;

      // Add tenant filtering
      if (tenantContext) {
        paramCount++;
        whereClause += ` AND tenant_id = $${paramCount}`;
        params.push(tenantContext.id);
      }

      // Add date range filtering
      if (dateRange) {
        paramCount++;
        whereClause += ` AND timestamp >= $${paramCount}`;
        params.push(dateRange.from);

        paramCount++;
        whereClause += ` AND timestamp <= $${paramCount}`;
        params.push(dateRange.to);
      }

      const truncFunc =
        period === 'hour'
          ? "date_trunc('hour', timestamp)"
          : "date_trunc('day', timestamp)";

      const query = `
        SELECT
          ${truncFunc} as period,
          COUNT(*) as requests,
          COALESCE(AVG(processing_time), 0) as average_response_time
        FROM ${this.tableName}
        ${whereClause}
        GROUP BY ${truncFunc}
        ORDER BY period DESC
        LIMIT 30
      `;

      const result = await client.query(query, params);

      return result.rows.map((row) => ({
        period: row.period.toISOString(),
        requests: parseInt(row.requests, 10),
        averageResponseTime: parseFloat(row.average_response_time),
      }));
    } catch (error: any) {
      throw new Error(`Failed to get usage time series: ${error.message}`);
    } finally {
      client.release();
    }
  }
}
