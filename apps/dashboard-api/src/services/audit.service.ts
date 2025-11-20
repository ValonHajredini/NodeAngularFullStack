import { Pool } from 'pg';
import { databaseService } from './database.service';

/**
 * Audit log entry interface.
 */
export interface AuditLogEntry {
  tenantId?: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit log query options.
 */
export interface AuditLogQueryOptions {
  page?: number;
  limit?: number;
  userId?: string;
  resourceType?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  tenantId?: string;
}

/**
 * Audit service for tracking user modifications and system events.
 * Provides comprehensive logging for security and debugging purposes.
 */
export class AuditService {
  private get pool(): Pool {
    return databaseService.getPool();
  }

  /**
   * Logs an audit event to the database.
   * @param entry - Audit log entry data
   * @returns Promise resolving when log is saved
   * @throws {Error} When audit logging fails
   * @example
   * await auditService.log({
   *   userId: 'user-uuid',
   *   action: 'CREATE',
   *   resourceType: 'users',
   *   resourceId: 'new-user-uuid',
   *   changes: { email: 'user@example.com', role: 'user' },
   *   ipAddress: '192.168.1.1',
   *   userAgent: 'Mozilla/5.0...'
   * });
   */
  async log(entry: AuditLogEntry): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO audit_logs (
          tenant_id, user_id, action, resource_type, resource_id,
          changes, ip_address, user_agent, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `;

      const values = [
        entry.tenantId || null,
        entry.userId || null,
        entry.action,
        entry.resourceType,
        entry.resourceId || null,
        entry.changes ? JSON.stringify(entry.changes) : null,
        entry.ipAddress || null,
        entry.userAgent || null
      ];

      await client.query(query, values);
    } catch (error: any) {
      // Log audit failures but don't throw to avoid breaking main operations
      console.error('Failed to write audit log:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves audit logs with pagination and filtering.
   * @param options - Query options for filtering and pagination
   * @returns Promise containing paginated audit logs
   * @throws {Error} When query fails
   * @example
   * const logs = await auditService.getLogs({
   *   page: 1,
   *   limit: 20,
   *   userId: 'user-uuid',
   *   resourceType: 'users'
   * });
   */
  async getLogs(options: AuditLogQueryOptions): Promise<{
    logs: any[];
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const client = await this.pool.connect();

    try {
      const {
        page = 1,
        limit = 50,
        userId,
        resourceType,
        action,
        startDate,
        endDate,
        tenantId
      } = options;

      const offset = (page - 1) * limit;
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (tenantId !== undefined) {
        conditions.push(`tenant_id = $${paramIndex++}`);
        values.push(tenantId);
      } else {
        conditions.push(`tenant_id IS NULL`);
      }

      if (userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        values.push(userId);
      }

      if (resourceType) {
        conditions.push(`resource_type = $${paramIndex++}`);
        values.push(resourceType);
      }

      if (action) {
        conditions.push(`action = $${paramIndex++}`);
        values.push(action);
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex++}`);
        values.push(startDate);
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex++}`);
        values.push(endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as count
        FROM audit_logs
        ${whereClause}
      `;

      // Data query with user information
      const dataQuery = `
        SELECT
          al.id,
          al.tenant_id as "tenantId",
          al.user_id as "userId",
          al.action,
          al.resource_type as "resourceType",
          al.resource_id as "resourceId",
          al.changes,
          al.ip_address as "ipAddress",
          al.user_agent as "userAgent",
          al.created_at as "createdAt",
          u.email as "userEmail",
          u.first_name as "userFirstName",
          u.last_name as "userLastName"
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const countValues = values.slice();
      const dataValues = [...values, limit, offset];

      const [countResult, dataResult] = await Promise.all([
        client.query(countQuery, countValues),
        client.query(dataQuery, dataValues)
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
      const pages = Math.ceil(total / limit);

      // Parse JSON changes field
      const logs = dataResult.rows.map(row => ({
        ...row,
        changes: row.changes ? JSON.parse(row.changes) : null
      }));

      return {
        logs,
        total,
        page,
        limit,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      };
    } catch (error: any) {
      throw new Error(`Failed to retrieve audit logs: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Gets audit logs for a specific resource.
   * @param resourceType - Type of resource
   * @param resourceId - ID of the resource
   * @param tenantId - Optional tenant ID
   * @returns Promise containing audit logs for the resource
   * @example
   * const userLogs = await auditService.getResourceLogs('users', 'user-uuid');
   */
  async getResourceLogs(
    resourceType: string,
    resourceId: string,
    tenantId?: string
  ): Promise<any[]> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          al.id,
          al.tenant_id as "tenantId",
          al.user_id as "userId",
          al.action,
          al.resource_type as "resourceType",
          al.resource_id as "resourceId",
          al.changes,
          al.ip_address as "ipAddress",
          al.user_agent as "userAgent",
          al.created_at as "createdAt",
          u.email as "userEmail",
          u.first_name as "userFirstName",
          u.last_name as "userLastName"
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.resource_type = $1 AND al.resource_id = $2
      `;

      const values: any[] = [resourceType, resourceId];

      if (tenantId !== undefined) {
        query += ' AND al.tenant_id = $3';
        values.push(tenantId);
      } else {
        query += ' AND al.tenant_id IS NULL';
      }

      query += ' ORDER BY al.created_at DESC';

      const result = await client.query(query, values);

      // Parse JSON changes field
      return result.rows.map(row => ({
        ...row,
        changes: row.changes ? JSON.parse(row.changes) : null
      }));
    } catch (error: any) {
      throw new Error(`Failed to retrieve resource audit logs: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes old audit logs based on retention policy.
   * @param retentionDays - Number of days to retain logs
   * @returns Promise containing number of deleted logs
   * @throws {Error} When cleanup fails
   * @example
   * const deletedCount = await auditService.cleanupOldLogs(90); // Keep 90 days
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const client = await this.pool.connect();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const query = `
        DELETE FROM audit_logs
        WHERE created_at < $1
      `;

      const result = await client.query(query, [cutoffDate]);

      return result.rowCount || 0;
    } catch (error: any) {
      throw new Error(`Failed to cleanup old audit logs: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Gets audit statistics for dashboard/reporting.
   * @param tenantId - Optional tenant ID
   * @param days - Number of days to include in statistics
   * @returns Promise containing audit statistics
   * @example
   * const stats = await auditService.getAuditStats('tenant-uuid', 30);
   */
  async getAuditStats(tenantId?: string, days: number = 30): Promise<{
    totalEvents: number;
    eventsByAction: { action: string; count: number }[];
    eventsByResourceType: { resourceType: string; count: number }[];
    eventsByDay: { date: string; count: number }[];
    topUsers: { userId: string; userEmail: string; count: number }[];
  }> {
    const client = await this.pool.connect();

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let tenantCondition = '';
      const baseValues: any[] = [startDate];

      if (tenantId !== undefined) {
        tenantCondition = 'AND tenant_id = $2';
        baseValues.push(tenantId);
      } else {
        tenantCondition = 'AND tenant_id IS NULL';
      }

      // Total events
      const totalQuery = `
        SELECT COUNT(*) as total
        FROM audit_logs
        WHERE created_at >= $1 ${tenantCondition}
      `;

      // Events by action
      const actionQuery = `
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= $1 ${tenantCondition}
        GROUP BY action
        ORDER BY count DESC
      `;

      // Events by resource type
      const resourceQuery = `
        SELECT resource_type as "resourceType", COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= $1 ${tenantCondition}
        GROUP BY resource_type
        ORDER BY count DESC
      `;

      // Events by day
      const dailyQuery = `
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= $1 ${tenantCondition}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      // Top users
      const usersQuery = `
        SELECT
          al.user_id as "userId",
          u.email as "userEmail",
          COUNT(*) as count
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.created_at >= $1 ${tenantCondition}
          AND al.user_id IS NOT NULL
        GROUP BY al.user_id, u.email
        ORDER BY count DESC
        LIMIT 10
      `;

      const [totalResult, actionResult, resourceResult, dailyResult, usersResult] = await Promise.all([
        client.query(totalQuery, baseValues),
        client.query(actionQuery, baseValues),
        client.query(resourceQuery, baseValues),
        client.query(dailyQuery, baseValues),
        client.query(usersQuery, baseValues)
      ]);

      return {
        totalEvents: parseInt(totalResult.rows[0].total, 10),
        eventsByAction: actionResult.rows,
        eventsByResourceType: resourceResult.rows,
        eventsByDay: dailyResult.rows,
        topUsers: usersResult.rows
      };
    } catch (error: any) {
      throw new Error(`Failed to retrieve audit statistics: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const auditService = new AuditService();