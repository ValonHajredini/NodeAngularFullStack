import { BaseRepository } from './base.repository';
import { DatabaseType } from '../config/multi-database.config';

/**
 * Tool database entity interface matching the database schema.
 */
export interface ToolEntity {
  id: string;
  key: string;
  name: string;
  slug: string;
  description: string;
  codePath?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tool creation interface for new tools.
 */
export interface CreateToolData {
  key: string;
  name: string;
  slug?: string;
  description: string;
  codePath?: string;
  active?: boolean;
}

/**
 * Tool update interface for modifications.
 */
export interface UpdateToolData {
  name?: string;
  slug?: string;
  description?: string;
  codePath?: string;
  active?: boolean;
}

/**
 * Tools repository for database operations.
 * Handles all tool-related database queries with proper error handling.
 * Tools are global and not tenant-specific.
 */
export class ToolsRepository extends BaseRepository<ToolEntity> {
  constructor() {
    super('tools', DatabaseType.DASHBOARD);
  }

  /**
   * Retrieves all tools from the database.
   * @returns Promise containing array of all tools
   * @throws {Error} When database query fails
   * @example
   * const tools = await toolsRepository.findAll();
   * console.log(`Found ${tools.length} tools`);
   */
  async findAll(): Promise<ToolEntity[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          key,
          name,
          slug,
          description,
          code_path as "codePath",
          active,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tools
        ORDER BY name ASC
      `;

      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching all tools:', error);
      throw new Error('Failed to retrieve tools from database');
    } finally {
      client.release();
    }
  }

  /**
   * Finds a tool by its unique slug.
   * @param slug - Tool slug to search for (e.g., 'short-link-generator')
   * @returns Promise containing the tool or null if not found
   * @throws {Error} When database query fails
   * @example
   * const tool = await toolsRepository.findBySlug('short-link-generator');
   * if (tool) console.log(`Tool found: ${tool.name}`);
   */
  async findBySlug(slug: string): Promise<ToolEntity | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          key,
          name,
          slug,
          description,
          code_path as "codePath",
          active,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tools
        WHERE slug = $1
      `;

      const result = await client.query(query, [slug]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error finding tool by slug ${slug}:`, error);
      throw new Error('Failed to find tool in database');
    } finally {
      client.release();
    }
  }

  /**
   * Finds a tool by its unique key.
   * @param key - Tool key to search for
   * @returns Promise containing the tool or null if not found
   * @throws {Error} When database query fails
   * @example
   * const tool = await toolsRepository.findByKey('short-link');
   * if (tool) console.log(`Tool found: ${tool.name}`);
   */
  async findByKey(key: string): Promise<ToolEntity | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          key,
          name,
          slug,
          description,
          code_path as "codePath",
          active,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tools
        WHERE key = $1
      `;

      const result = await client.query(query, [key]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error finding tool by key ${key}:`, error);
      throw new Error('Failed to find tool in database');
    } finally {
      client.release();
    }
  }

  /**
   * Updates a tool's status (active/inactive) by its key.
   * @param key - Tool key to update
   * @param active - New active status
   * @returns Promise containing the updated tool
   * @throws {Error} When tool not found or database query fails
   * @example
   * const updatedTool = await toolsRepository.updateStatus('short-link', false);
   * console.log(`Tool ${updatedTool.name} is now ${updatedTool.active ? 'enabled' : 'disabled'}`);
   */
  async updateStatus(key: string, active: boolean): Promise<ToolEntity> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE tools
        SET
          active = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE key = $1
        RETURNING
          id,
          key,
          name,
          slug,
          description,
          code_path as "codePath",
          active,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, [key, active]);

      if (result.rows.length === 0) {
        throw new Error(`Tool with key '${key}' not found`);
      }

      return result.rows[0];
    } catch (error) {
      console.error(`Error updating tool status for key ${key}:`, error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Failed to update tool status in database');
    } finally {
      client.release();
    }
  }

  /**
   * Creates a new tool in the database.
   * @param toolData - Tool data for creation
   * @returns Promise containing the created tool
   * @throws {Error} When tool creation fails or key already exists
   * @example
   * const tool = await toolsRepository.create({
   *   key: 'new-tool',
   *   name: 'New Tool',
   *   description: 'A new tool for the system',
   *   active: true
   * });
   */
  async create(toolData: CreateToolData): Promise<ToolEntity> {
    const client = await this.pool.connect();

    try {
      const {
        key,
        name,
        slug,
        description,
        codePath,
        active = true,
      } = toolData;

      const query = `
        INSERT INTO tools (
          key, name, slug, description, code_path, active,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING
          id,
          key,
          name,
          slug,
          description,
          code_path as "codePath",
          active,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const values = [
        key,
        name,
        slug || null,
        description,
        codePath || null,
        active,
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating tool:', error);
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new Error(`Tool with key '${toolData.key}' already exists`);
      }
      throw new Error('Failed to create tool in database');
    } finally {
      client.release();
    }
  }

  /**
   * Updates tool information (excluding status, use updateStatus for that).
   * @param key - Tool key to update
   * @param updateData - Tool data to update
   * @returns Promise containing the updated tool
   * @throws {Error} When tool not found or database query fails
   * @example
   * const updatedTool = await toolsRepository.update('short-link', {
   *   name: 'Updated Short Link Tool',
   *   description: 'Updated description'
   * });
   */
  async update(key: string, updateData: UpdateToolData): Promise<ToolEntity> {
    const client = await this.pool.connect();

    try {
      const updateFields: string[] = [];
      const values: any[] = [key];
      let paramCounter = 2;

      if (updateData.name !== undefined) {
        updateFields.push(`name = $${paramCounter++}`);
        values.push(updateData.name);
      }

      if (updateData.slug !== undefined) {
        updateFields.push(`slug = $${paramCounter++}`);
        values.push(updateData.slug);
      }

      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramCounter++}`);
        values.push(updateData.description);
      }

      if (updateData.codePath !== undefined) {
        updateFields.push(`code_path = $${paramCounter++}`);
        values.push(updateData.codePath);
      }

      if (updateData.active !== undefined) {
        updateFields.push(`active = $${paramCounter++}`);
        values.push(updateData.active);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields provided for update');
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE tools
        SET ${updateFields.join(', ')}
        WHERE key = $1
        RETURNING
          id,
          key,
          name,
          slug,
          description,
          code_path as "codePath",
          active,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Tool with key '${key}' not found`);
      }

      return result.rows[0];
    } catch (error) {
      console.error(`Error updating tool ${key}:`, error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Failed to update tool in database');
    } finally {
      client.release();
    }
  }

  /**
   * Deletes a tool from the database.
   * @param key - Tool key to delete
   * @returns Promise that resolves when tool is deleted
   * @throws {Error} When tool not found or database query fails
   * @example
   * await toolsRepository.delete('obsolete-tool');
   * console.log('Tool deleted successfully');
   */
  async delete(key: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = 'DELETE FROM tools WHERE key = $1';
      const result = await client.query(query, [key]);

      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error(`Error deleting tool ${key}:`, error);
      throw new Error('Failed to delete tool from database');
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves only active tools from the database.
   * @returns Promise containing array of active tools
   * @throws {Error} When database query fails
   * @example
   * const activeTools = await toolsRepository.findAllActive();
   * console.log(`Found ${activeTools.length} active tools`);
   */
  async findAllActive(): Promise<ToolEntity[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          key,
          name,
          slug,
          description,
          code_path as "codePath",
          active,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tools
        WHERE active = true
        ORDER BY name ASC
      `;

      const result = await client.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching active tools:', error);
      throw new Error('Failed to retrieve active tools from database');
    } finally {
      client.release();
    }
  }
}
