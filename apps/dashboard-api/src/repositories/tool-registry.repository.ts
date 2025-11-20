import { Pool } from 'pg';
import {
  ToolRegistryRecord,
  CreateToolInput,
  UpdateToolInput,
  ToolStatus,
} from '@nodeangularfullstack/shared';
import { dashboardPool } from '../config/multi-database.config';

/**
 * Repository for tool registry data access.
 * Provides CRUD operations and specialized queries for tool discovery.
 *
 * @example
 * const repository = new ToolRegistryRepository();
 * const tools = await repository.findAll();
 */
export class ToolRegistryRepository {
  /**
   * Gets the dashboard database connection pool.
   * Tool registry table is in the dashboard database.
   * @returns PostgreSQL connection pool
   */
  protected get pool(): Pool {
    return dashboardPool;
  }

  /**
   * Retrieves all tools ordered by creation date (newest first).
   *
   * @returns Promise containing array of all tool records
   * @throws {Error} If database query fails
   *
   * @example
   * const tools = await repository.findAll();
   * console.log(`Found ${tools.length} tools`);
   */
  async findAll(): Promise<ToolRegistryRecord[]> {
    const client = await this.pool.connect();

    try {
      const query = 'SELECT * FROM tool_registry ORDER BY created_at DESC';
      const result = await client.query(query);
      return result.rows.map(this.mapRowToRecord);
    } catch (error: any) {
      throw new Error(`Failed to find all tools: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a tool by its unique tool ID.
   *
   * @param toolId - The tool's unique identifier (e.g., "form-builder")
   * @returns The tool record if found, null otherwise
   * @throws {Error} If database query fails
   *
   * @example
   * const tool = await repository.findById('form-builder');
   * if (tool) {
   *   console.log(`Found tool: ${tool.name}`);
   * }
   */
  async findById(toolId: string): Promise<ToolRegistryRecord | null> {
    const client = await this.pool.connect();

    try {
      const query = 'SELECT * FROM tool_registry WHERE tool_id = $1';
      const result = await client.query(query, [toolId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToRecord(result.rows[0]);
    } catch (error: any) {
      throw new Error(`Failed to find tool by ID: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Creates a new tool registration.
   *
   * @param input - Tool registration data
   * @returns Promise containing the created tool record
   * @throws {Error} If required fields are missing or database insert fails
   *
   * @example
   * const tool = await repository.create({
   *   tool_id: 'inventory-tracker',
   *   name: 'Inventory Tracker',
   *   version: '1.0.0',
   *   route: '/tools/inventory',
   *   api_base: '/api/inventory',
   *   created_by: 'user-uuid'
   * });
   */
  async create(input: CreateToolInput): Promise<ToolRegistryRecord> {
    // Validate required fields
    if (
      !input.tool_id ||
      !input.name ||
      !input.version ||
      !input.route ||
      !input.api_base
    ) {
      throw new Error(
        'Missing required fields: tool_id, name, version, route, and api_base are required'
      );
    }

    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO tool_registry (
          tool_id, name, description, version, icon, route, api_base,
          permissions, status, manifest_json, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        input.tool_id,
        input.name,
        input.description || null,
        input.version,
        input.icon || null,
        input.route,
        input.api_base,
        input.permissions || null,
        input.status || ToolStatus.BETA,
        input.manifest_json ? JSON.stringify(input.manifest_json) : null,
        input.created_by || null,
      ];

      const result = await client.query(query, values);
      return this.mapRowToRecord(result.rows[0]);
    } catch (error: any) {
      // Check for duplicate tool_id constraint violation
      if (error.code === '23505') {
        throw new Error(`Tool with ID '${input.tool_id}' already exists`);
      }
      throw new Error(`Failed to create tool: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates an existing tool registration.
   * Only provided fields will be updated.
   *
   * @param toolId - The tool's unique identifier
   * @param input - Partial tool data to update
   * @returns Promise containing the updated tool record
   * @throws {Error} If tool not found or database update fails
   *
   * @example
   * const tool = await repository.update('form-builder', {
   *   version: '2.0.0',
   *   status: ToolStatus.ACTIVE
   * });
   */
  async update(
    toolId: string,
    input: UpdateToolInput
  ): Promise<ToolRegistryRecord> {
    const client = await this.pool.connect();

    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Build dynamic SET clause for provided fields only
      if (input.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(input.name);
      }
      if (input.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(input.description);
      }
      if (input.version !== undefined) {
        updates.push(`version = $${paramCount++}`);
        values.push(input.version);
      }
      if (input.icon !== undefined) {
        updates.push(`icon = $${paramCount++}`);
        values.push(input.icon);
      }
      if (input.route !== undefined) {
        updates.push(`route = $${paramCount++}`);
        values.push(input.route);
      }
      if (input.api_base !== undefined) {
        updates.push(`api_base = $${paramCount++}`);
        values.push(input.api_base);
      }
      if (input.permissions !== undefined) {
        updates.push(`permissions = $${paramCount++}`);
        values.push(input.permissions);
      }
      if (input.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(input.status);
      }
      if (input.is_exported !== undefined) {
        updates.push(`is_exported = $${paramCount++}`);
        values.push(input.is_exported);
      }
      if (input.exported_at !== undefined) {
        updates.push(`exported_at = $${paramCount++}`);
        values.push(input.exported_at);
      }
      if (input.service_url !== undefined) {
        updates.push(`service_url = $${paramCount++}`);
        values.push(input.service_url);
      }
      if (input.database_name !== undefined) {
        updates.push(`database_name = $${paramCount++}`);
        values.push(input.database_name);
      }
      if (input.manifest_json !== undefined) {
        updates.push(`manifest_json = $${paramCount++}`);
        values.push(JSON.stringify(input.manifest_json));
      }

      if (updates.length === 0) {
        throw new Error('No fields provided for update');
      }

      // Always update the updated_at timestamp (handled by trigger, but explicit is better)
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(toolId);

      const query = `
        UPDATE tool_registry
        SET ${updates.join(', ')}
        WHERE tool_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Tool '${toolId}' not found`);
      }

      return this.mapRowToRecord(result.rows[0]);
    } catch (error: any) {
      throw new Error(`Failed to update tool: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes a tool registration (hard delete).
   *
   * @param toolId - The tool's unique identifier
   * @returns Promise resolving when deletion is complete
   * @throws {Error} If tool not found or database delete fails
   *
   * @example
   * await repository.delete('old-tool');
   */
  async delete(toolId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query =
        'DELETE FROM tool_registry WHERE tool_id = $1 RETURNING tool_id';
      const result = await client.query(query, [toolId]);

      if (result.rows.length === 0) {
        throw new Error(`Tool '${toolId}' not found`);
      }
    } catch (error: any) {
      throw new Error(`Failed to delete tool: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds tools by their status.
   *
   * @param status - Tool status to filter by (beta, active, deprecated)
   * @returns Promise containing array of matching tool records ordered by name
   * @throws {Error} If database query fails
   *
   * @example
   * const activeTools = await repository.findByStatus(ToolStatus.ACTIVE);
   */
  async findByStatus(status: string): Promise<ToolRegistryRecord[]> {
    const client = await this.pool.connect();

    try {
      const query =
        'SELECT * FROM tool_registry WHERE status = $1 ORDER BY name ASC';
      const result = await client.query(query, [status]);
      return result.rows.map(this.mapRowToRecord);
    } catch (error: any) {
      throw new Error(`Failed to find tools by status: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds all tools that have been exported as microservices.
   *
   * @returns Promise containing array of exported tool records
   * @throws {Error} If database query fails
   *
   * @example
   * const exportedTools = await repository.findExported();
   * console.log(`${exportedTools.length} tools are exported`);
   */
  async findExported(): Promise<ToolRegistryRecord[]> {
    const client = await this.pool.connect();

    try {
      const query =
        'SELECT * FROM tool_registry WHERE is_exported = true ORDER BY name ASC';
      const result = await client.query(query);
      return result.rows.map(this.mapRowToRecord);
    } catch (error: any) {
      throw new Error(`Failed to find exported tools: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds all tools that have NOT been exported (remain in monolith).
   * Used by dashboard to show available tools for export.
   *
   * @returns Promise containing array of non-exported tool records
   * @throws {Error} If database query fails
   *
   * @example
   * const availableTools = await repository.findNonExported();
   * console.log(`${availableTools.length} tools available for export`);
   */
  async findNonExported(): Promise<ToolRegistryRecord[]> {
    const client = await this.pool.connect();

    try {
      const query =
        'SELECT * FROM tool_registry WHERE is_exported = false ORDER BY name ASC';
      const result = await client.query(query);
      return result.rows.map(this.mapRowToRecord);
    } catch (error: any) {
      throw new Error(`Failed to find non-exported tools: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Searches tools by name or description using case-insensitive pattern matching.
   *
   * @param searchTerm - Search term to match against name and description
   * @returns Promise containing array of matching tool records
   * @throws {Error} If database query fails
   *
   * @example
   * const tools = await repository.search('form');
   * // Returns tools with 'form' in name or description (case-insensitive)
   */
  async search(searchTerm: string): Promise<ToolRegistryRecord[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT * FROM tool_registry
        WHERE name ILIKE $1 OR description ILIKE $1
        ORDER BY name ASC
      `;
      const searchPattern = `%${searchTerm}%`;
      const result = await client.query(query, [searchPattern]);
      return result.rows.map(this.mapRowToRecord);
    } catch (error: any) {
      throw new Error(`Failed to search tools: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Maps a database row to a ToolRegistryRecord.
   * Handles type conversions for dates and JSONB fields.
   *
   * @param row - Raw database row
   * @returns Typed ToolRegistryRecord object
   * @private
   */
  private mapRowToRecord(row: any): ToolRegistryRecord {
    return {
      id: row.id,
      tool_id: row.tool_id,
      name: row.name,
      description: row.description,
      version: row.version,
      icon: row.icon,
      route: row.route,
      api_base: row.api_base,
      permissions: row.permissions,
      status: row.status,
      toolType: row.manifest_json?.toolType || null,
      toolMetadata: row.manifest_json?.toolMetadata || {},
      is_exported: row.is_exported,
      exported_at: row.exported_at,
      service_url: row.service_url,
      database_name: row.database_name,
      manifest_json: row.manifest_json,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
    };
  }
}
