import { Pool } from 'pg';
import {
  DatabaseType,
  getPoolForDatabase,
} from '../config/multi-database.config';

/**
 * Tenant context interface for multi-tenant operations.
 */
export interface TenantContext {
  id: string;
  slug: string;
  features?: string[];
  limits?: Record<string, number>;
}

/**
 * Base repository class providing common database operations with tenant awareness
 * and multi-database support.
 *
 * Supports two database types:
 * - AUTH: Read-only access to user/tenant data
 * - FORMS: Read-write access to forms-specific tables (forms, themes, submissions)
 *
 * All repositories should extend this class to inherit tenant isolation capabilities
 * and proper database pool selection.
 */
export abstract class BaseRepository<T> {
  protected readonly tableName: string;
  protected readonly databaseType: DatabaseType;
  private readonly poolInstance: Pool;

  /**
   * Creates a new BaseRepository instance.
   * @param tableName - The database table name
   * @param databaseType - The database type (auth or forms)
   */
  constructor(tableName: string, databaseType: DatabaseType) {
    this.tableName = tableName;
    this.databaseType = databaseType;
    this.poolInstance = getPoolForDatabase(databaseType);
  }

  /**
   * Gets the database connection pool for this repository.
   * Uses the pool specified by databaseType in constructor.
   * @returns PostgreSQL connection pool
   */
  protected get pool(): Pool {
    return this.poolInstance;
  }

  /**
   * Determines if the table supports multi-tenancy based on table name.
   * @returns boolean indicating if table has tenant_id column
   */
  protected supportsTenancy(): boolean {
    return [
      'users',
      'audit_logs',
      'sessions',
      'api_tokens',
      'api_token_usage',
    ].includes(this.tableName);
  }

  /**
   * Finds a record by ID with optional tenant filtering.
   * @param id - Record ID to find
   * @param tenantContext - Optional tenant context for isolation
   * @returns Promise containing the record or null if not found
   * @throws {Error} When database query fails
   * @example
   * const user = await repository.findById('user-uuid', tenantContext);
   */
  async findById(id: string, tenantContext?: TenantContext): Promise<T | null> {
    const client = await this.pool.connect();

    try {
      let query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
      const params: any[] = [id];

      // Apply tenant filtering if multi-tenancy is enabled and supported
      if (tenantContext && this.supportsTenancy()) {
        query += ' AND tenant_id = $2';
        params.push(tenantContext.id);
      }

      const result = await client.query(query, params);
      return result.rows.length > 0 ? (result.rows[0] as T) : null;
    } catch (error: any) {
      throw new Error(
        `Failed to find ${this.tableName} by ID: ${error.message}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Finds multiple records with optional tenant filtering and conditions.
   * @param filters - Filter conditions
   * @param tenantContext - Optional tenant context for isolation
   * @param options - Query options (limit, offset, orderBy)
   * @returns Promise containing array of records
   * @throws {Error} When database query fails
   * @example
   * const users = await repository.findMany({ role: 'user' }, tenantContext, { limit: 10 });
   */
  async findMany(
    filters: Record<string, any> = {},
    tenantContext?: TenantContext,
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'ASC' | 'DESC';
    } = {}
  ): Promise<T[]> {
    const client = await this.pool.connect();

    try {
      let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
      const params: any[] = [];
      let paramCount = 0;

      // Apply tenant filtering first
      if (tenantContext && this.supportsTenancy()) {
        paramCount++;
        query += ` AND tenant_id = $${paramCount}`;
        params.push(tenantContext.id);
      }

      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          paramCount++;
          query += ` AND ${key} = $${paramCount}`;
          params.push(value);
        }
      });

      // Add ordering
      const { orderBy = 'created_at', orderDirection = 'DESC' } = options;
      query += ` ORDER BY ${orderBy} ${orderDirection}`;

      // Add pagination
      if (options.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(options.limit);

        if (options.offset) {
          paramCount++;
          query += ` OFFSET $${paramCount}`;
          params.push(options.offset);
        }
      }

      const result = await client.query(query, params);
      return result.rows as T[];
    } catch (error: any) {
      throw new Error(
        `Failed to find ${this.tableName} records: ${error.message}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Creates a new record with automatic tenant association.
   * @param data - Record data to create
   * @param tenantContext - Optional tenant context for multi-tenant mode
   * @returns Promise containing the created record
   * @throws {Error} When creation fails
   */
  async create(data: Partial<T>, tenantContext?: TenantContext): Promise<T> {
    const client = await this.pool.connect();

    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = fields.map((_, i) => `$${i + 1}`);

      // Add tenant_id if multi-tenancy is supported and context is provided
      if (tenantContext && this.supportsTenancy()) {
        fields.push('tenant_id');
        values.push(tenantContext.id);
        placeholders.push(`$${fields.length}`);
      }

      const query = `
        INSERT INTO ${this.tableName} (${fields.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Failed to create ${this.tableName} record`);
      }

      return result.rows[0] as T;
    } catch (error: any) {
      throw new Error(`Failed to create ${this.tableName}: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates a record by ID with tenant validation.
   * @param id - Record ID to update
   * @param updateData - Data to update
   * @param tenantContext - Optional tenant context for validation
   * @returns Promise containing the updated record
   * @throws {Error} When update fails or record not found
   */
  async update(
    id: string,
    updateData: Partial<T>,
    tenantContext?: TenantContext
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Always update the updated_at field if it exists
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      let whereClause = `WHERE id = $${paramIndex}`;
      values.push(id);

      // Add tenant validation if multi-tenancy is supported
      if (tenantContext && this.supportsTenancy()) {
        paramIndex++;
        whereClause += ` AND tenant_id = $${paramIndex}`;
        values.push(tenantContext.id);
      }

      const query = `
        UPDATE ${this.tableName}
        SET ${updateFields.join(', ')}
        ${whereClause}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`${this.tableName} not found or access denied`);
      }

      return result.rows[0] as T;
    } catch (error: any) {
      throw new Error(`Failed to update ${this.tableName}: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Soft deletes a record by ID with tenant validation.
   * @param id - Record ID to delete
   * @param tenantContext - Optional tenant context for validation
   * @returns Promise containing boolean indicating success
   * @throws {Error} When deletion fails
   */
  async delete(id: string, tenantContext?: TenantContext): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      let whereClause = `WHERE id = $1`;
      const params = [id];

      // Add tenant validation if multi-tenancy is supported
      if (tenantContext && this.supportsTenancy()) {
        whereClause += ` AND tenant_id = $2`;
        params.push(tenantContext.id);
      }

      // Check if table has is_active column for soft delete
      const hasIsActiveQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'is_active'
      `;

      const columnResult = await client.query(hasIsActiveQuery, [
        this.tableName,
      ]);

      let query: string;
      if (columnResult.rows.length > 0) {
        // Soft delete using is_active flag
        query = `
          UPDATE ${this.tableName}
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
          ${whereClause}
        `;
      } else {
        // Hard delete if no is_active column
        query = `DELETE FROM ${this.tableName} ${whereClause}`;
      }

      const result = await client.query(query, params);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error: any) {
      throw new Error(`Failed to delete ${this.tableName}: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Counts records with optional tenant filtering and conditions.
   * @param filters - Filter conditions
   * @param tenantContext - Optional tenant context for isolation
   * @returns Promise containing record count
   * @throws {Error} When count query fails
   */
  async count(
    filters: Record<string, any> = {},
    tenantContext?: TenantContext
  ): Promise<number> {
    const client = await this.pool.connect();

    try {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE 1=1`;
      const params: any[] = [];
      let paramCount = 0;

      // Apply tenant filtering first
      if (tenantContext && this.supportsTenancy()) {
        paramCount++;
        query += ` AND tenant_id = $${paramCount}`;
        params.push(tenantContext.id);
      }

      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          paramCount++;
          query += ` AND ${key} = $${paramCount}`;
          params.push(value);
        }
      });

      const result = await client.query(query, params);
      return parseInt(result.rows[0].count, 10);
    } catch (error: any) {
      throw new Error(
        `Failed to count ${this.tableName} records: ${error.message}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Validates tenant access to a record.
   * @param id - Record ID to validate
   * @param tenantContext - Tenant context for validation
   * @returns Promise containing boolean indicating access allowed
   * @throws {Error} When validation fails
   */
  async validateTenantAccess(
    id: string,
    tenantContext: TenantContext
  ): Promise<boolean> {
    if (!this.supportsTenancy()) {
      return true; // No tenant isolation needed
    }

    const client = await this.pool.connect();

    try {
      const query = `
        SELECT 1 FROM ${this.tableName}
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await client.query(query, [id, tenantContext.id]);
      return result.rows.length > 0;
    } catch (error: any) {
      throw new Error(`Failed to validate tenant access: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Executes a raw SQL query with tenant context injection.
   * @param query - SQL query to execute
   * @param params - Query parameters
   * @param tenantContext - Optional tenant context
   * @returns Promise containing query result
   * @throws {Error} When query execution fails
   */
  protected async executeQuery(
    query: string,
    params: any[] = [],
    tenantContext?: TenantContext
  ): Promise<any> {
    const client = await this.pool.connect();

    try {
      // Set tenant context for RLS policies if applicable
      if (tenantContext && this.supportsTenancy()) {
        await client.query(`SET app.current_tenant_id = '${tenantContext.id}'`);
      }

      return await client.query(query, params);
    } catch (error: any) {
      throw new Error(`Query execution failed: ${error.message}`);
    } finally {
      // Reset tenant context
      if (tenantContext && this.supportsTenancy()) {
        try {
          await client.query(`RESET app.current_tenant_id`);
        } catch {
          // Ignore reset errors
        }
      }
      client.release();
    }
  }
}
