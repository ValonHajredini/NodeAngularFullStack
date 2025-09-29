import { Pool } from 'pg';
import { databaseService } from '../services/database.service';
import { BaseRepository } from './base.repository';
import { DisplayMode, LayoutSettings } from '@nodeangularfullstack/shared';

/**
 * Tool config database entity interface matching the database schema.
 */
export interface ToolConfigEntity {
  id: string;
  toolId: string;
  version: string;
  displayMode: DisplayMode;
  layoutSettings: LayoutSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tool config creation interface for new configurations.
 */
export interface CreateToolConfigData {
  toolId: string;
  version: string;
  displayMode: DisplayMode;
  layoutSettings?: LayoutSettings;
  isActive?: boolean;
}

/**
 * Tool config update interface for modifications.
 */
export interface UpdateToolConfigData {
  version?: string;
  displayMode?: DisplayMode;
  layoutSettings?: LayoutSettings;
  isActive?: boolean;
}

/**
 * Tool configs repository for database operations.
 * Handles all tool configuration-related database queries with proper error handling.
 */
export class ToolConfigsRepository extends BaseRepository<ToolConfigEntity> {
  constructor() {
    super('tool_configs');
  }

  protected get pool(): Pool {
    return databaseService.getPool();
  }

  /**
   * Retrieves all configurations for a specific tool.
   * @param toolId - Tool ID to fetch configs for
   * @returns Promise containing array of tool configurations
   * @throws {Error} When database query fails
   * @example
   * const configs = await toolConfigsRepository.findByToolId('tool-uuid');
   * console.log(`Found ${configs.length} configurations`);
   */
  async findByToolId(toolId: string): Promise<ToolConfigEntity[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          tool_id as "toolId",
          version,
          display_mode as "displayMode",
          layout_settings as "layoutSettings",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tool_configs
        WHERE tool_id = $1
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, [toolId]);
      return result.rows;
    } catch (error) {
      console.error(`Error fetching configs for tool ${toolId}:`, error);
      throw new Error('Failed to retrieve tool configurations from database');
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves the active configuration for a specific tool.
   * @param toolId - Tool ID to fetch active config for
   * @returns Promise containing the active configuration or null if none
   * @throws {Error} When database query fails
   * @example
   * const activeConfig = await toolConfigsRepository.findActiveByToolId('tool-uuid');
   * if (activeConfig) console.log(`Active config version: ${activeConfig.version}`);
   */
  async findActiveByToolId(toolId: string): Promise<ToolConfigEntity | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          tool_id as "toolId",
          version,
          display_mode as "displayMode",
          layout_settings as "layoutSettings",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tool_configs
        WHERE tool_id = $1 AND is_active = true
      `;

      const result = await client.query(query, [toolId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error fetching active config for tool ${toolId}:`, error);
      throw new Error('Failed to retrieve active configuration from database');
    } finally {
      client.release();
    }
  }

  /**
   * Finds a configuration by its ID.
   * @param id - Configuration ID
   * @returns Promise containing the configuration or null if not found
   * @throws {Error} When database query fails
   * @example
   * const config = await toolConfigsRepository.findById('config-uuid');
   * if (config) console.log(`Config version: ${config.version}`);
   */
  async findById(id: string): Promise<ToolConfigEntity | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          tool_id as "toolId",
          version,
          display_mode as "displayMode",
          layout_settings as "layoutSettings",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tool_configs
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error fetching config ${id}:`, error);
      throw new Error('Failed to retrieve configuration from database');
    } finally {
      client.release();
    }
  }

  /**
   * Creates a new tool configuration.
   * @param configData - Configuration data for creation
   * @returns Promise containing the created configuration
   * @throws {Error} When configuration creation fails or version already exists
   * @example
   * const config = await toolConfigsRepository.create({
   *   toolId: 'tool-uuid',
   *   version: '1.1.0',
   *   displayMode: 'full-width',
   *   isActive: true
   * });
   */
  async create(configData: CreateToolConfigData): Promise<ToolConfigEntity> {
    const client = await this.pool.connect();

    try {
      const {
        toolId,
        version,
        displayMode,
        layoutSettings = {},
        isActive = false,
      } = configData;

      const query = `
        INSERT INTO tool_configs (
          tool_id, version, display_mode, layout_settings, is_active,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING
          id,
          tool_id as "toolId",
          version,
          display_mode as "displayMode",
          layout_settings as "layoutSettings",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const values = [
        toolId,
        version,
        displayMode,
        JSON.stringify(layoutSettings),
        isActive,
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating tool config:', error);
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new Error(
          `Configuration with version '${configData.version}' already exists for this tool`
        );
      }
      throw new Error('Failed to create tool configuration in database');
    } finally {
      client.release();
    }
  }

  /**
   * Updates a tool configuration.
   * @param id - Configuration ID to update
   * @param updateData - Configuration data to update
   * @returns Promise containing the updated configuration
   * @throws {Error} When configuration not found or database query fails
   * @example
   * const updatedConfig = await toolConfigsRepository.update('config-uuid', {
   *   displayMode: 'full-width',
   *   layoutSettings: { maxWidth: '100%' }
   * });
   */
  async update(
    id: string,
    updateData: UpdateToolConfigData
  ): Promise<ToolConfigEntity> {
    const client = await this.pool.connect();

    try {
      const updateFields: string[] = [];
      const values: any[] = [id];
      let paramCounter = 2;

      if (updateData.version !== undefined) {
        updateFields.push(`version = $${paramCounter++}`);
        values.push(updateData.version);
      }

      if (updateData.displayMode !== undefined) {
        updateFields.push(`display_mode = $${paramCounter++}`);
        values.push(updateData.displayMode);
      }

      if (updateData.layoutSettings !== undefined) {
        updateFields.push(`layout_settings = $${paramCounter++}`);
        values.push(JSON.stringify(updateData.layoutSettings));
      }

      if (updateData.isActive !== undefined) {
        updateFields.push(`is_active = $${paramCounter++}`);
        values.push(updateData.isActive);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields provided for update');
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE tool_configs
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING
          id,
          tool_id as "toolId",
          version,
          display_mode as "displayMode",
          layout_settings as "layoutSettings",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Configuration with id '${id}' not found`);
      }

      return result.rows[0];
    } catch (error) {
      console.error(`Error updating tool config ${id}:`, error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Failed to update tool configuration in database');
    } finally {
      client.release();
    }
  }

  /**
   * Sets a configuration as active and deactivates all others for the same tool.
   * @param id - Configuration ID to activate
   * @returns Promise containing the activated configuration
   * @throws {Error} When configuration not found or database query fails
   * @example
   * const activeConfig = await toolConfigsRepository.setActive('config-uuid');
   * console.log(`Activated config version: ${activeConfig.version}`);
   */
  async setActive(id: string): Promise<ToolConfigEntity> {
    const client = await this.pool.connect();

    try {
      // The trigger will handle deactivating other configs
      const query = `
        UPDATE tool_configs
        SET is_active = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
          id,
          tool_id as "toolId",
          version,
          display_mode as "displayMode",
          layout_settings as "layoutSettings",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        throw new Error(`Configuration with id '${id}' not found`);
      }

      return result.rows[0];
    } catch (error) {
      console.error(`Error setting config ${id} as active:`, error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Failed to set configuration as active in database');
    } finally {
      client.release();
    }
  }

  /**
   * Deletes a configuration from the database.
   * @param id - Configuration ID to delete
   * @returns Promise that resolves to true if deleted, false otherwise
   * @throws {Error} When database query fails
   * @example
   * await toolConfigsRepository.delete('config-uuid');
   * console.log('Configuration deleted successfully');
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = 'DELETE FROM tool_configs WHERE id = $1';
      const result = await client.query(query, [id]);

      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error(`Error deleting tool config ${id}:`, error);
      throw new Error('Failed to delete tool configuration from database');
    } finally {
      client.release();
    }
  }

  /**
   * Checks if a version already exists for a tool.
   * @param toolId - Tool ID
   * @param version - Version to check
   * @returns Promise that resolves to true if version exists
   * @throws {Error} When database query fails
   * @example
   * const exists = await toolConfigsRepository.versionExists('tool-uuid', '1.0.0');
   * if (exists) console.log('Version already exists');
   */
  async versionExists(toolId: string, version: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT EXISTS(
          SELECT 1 FROM tool_configs
          WHERE tool_id = $1 AND version = $2
        ) as exists
      `;

      const result = await client.query(query, [toolId, version]);
      return result.rows[0].exists;
    } catch (error) {
      console.error(
        `Error checking version existence for tool ${toolId}:`,
        error
      );
      throw new Error('Failed to check version existence in database');
    } finally {
      client.release();
    }
  }
}
