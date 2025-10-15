import {
  FormTheme,
  CreateThemeRequest,
  UpdateThemeRequest,
} from '@nodeangularfullstack/shared';
import { BaseRepository } from './base.repository';

/**
 * Repository for form theme database operations.
 * Handles theme CRUD operations, usage tracking, and soft deletion.
 */
export class ThemesRepository extends BaseRepository<FormTheme> {
  constructor() {
    super('form_themes');
  }

  /**
   * Finds all themes with optional active filtering.
   * @param activeOnly - If true, returns only active themes
   * @returns Promise containing array of themes ordered by usage_count DESC
   * @throws {Error} When database query fails
   * @example
   * const activeThemes = await themesRepository.findAll(true);
   * const allThemes = await themesRepository.findAll(false);
   */
  async findAll(activeOnly: boolean = true): Promise<FormTheme[]> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          id,
          name,
          description,
          thumbnail_url as "thumbnailUrl",
          theme_config as "themeConfig",
          usage_count as "usageCount",
          is_active as "isActive",
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM form_themes
      `;
      const params: any[] = [];

      if (activeOnly) {
        query += ' WHERE is_active = $1';
        params.push(true);
      }

      query += ' ORDER BY usage_count DESC';

      const result = await client.query(query, params);
      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        themeConfig: row.themeConfig,
        usageCount: row.usageCount,
        isActive: row.isActive,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })) as FormTheme[];
    } catch (error: any) {
      throw new Error(`Failed to find themes: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a theme by its ID.
   * @param id - Theme ID to find
   * @returns Promise containing the theme or null if not found
   * @throws {Error} When database query fails
   * @example
   * const theme = await themesRepository.findById('theme-uuid');
   */
  async findById(id: string): Promise<FormTheme | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          name,
          description,
          thumbnail_url as "thumbnailUrl",
          theme_config as "themeConfig",
          usage_count as "usageCount",
          is_active as "isActive",
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM form_themes
        WHERE id = $1 AND is_active = true
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        themeConfig: row.themeConfig,
        usageCount: row.usageCount,
        isActive: row.isActive,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      } as FormTheme;
    } catch (error: any) {
      throw new Error(`Failed to find theme by ID: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Creates a new theme.
   * @param themeData - Theme data to create
   * @returns Promise containing the created theme
   * @throws {Error} When creation fails
   * @example
   * const theme = await themesRepository.create({
   *   name: 'Modern Blue',
   *   description: 'Clean modern theme with blue accents',
   *   thumbnailUrl: 'https://spaces.example.com/theme-thumb.jpg',
   *   themeConfig: { desktop: { primaryColor: '#007bff', ... } }
   * });
   */
  async create(themeData: CreateThemeRequest): Promise<FormTheme> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO form_themes (
          name,
          description,
          thumbnail_url,
          theme_config,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          name,
          description,
          thumbnail_url as "thumbnailUrl",
          theme_config as "themeConfig",
          usage_count as "usageCount",
          is_active as "isActive",
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const values = [
        themeData.name,
        themeData.description || null,
        themeData.thumbnailUrl,
        JSON.stringify(themeData.themeConfig),
        themeData.createdBy || null,
      ];

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create theme');
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        themeConfig: row.themeConfig,
        usageCount: row.usageCount,
        isActive: row.isActive,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      } as FormTheme;
    } catch (error: any) {
      throw new Error(`Failed to create theme: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates an existing theme.
   * @param id - Theme ID to update
   * @param updates - Partial theme data to update
   * @returns Promise containing the updated theme
   * @throws {Error} When update fails or theme not found
   * @example
   * const theme = await themesRepository.update('theme-uuid', {
   *   name: 'Updated Theme Name',
   *   description: 'New description'
   * });
   */
  async update(id: string, updates: UpdateThemeRequest): Promise<FormTheme> {
    const client = await this.pool.connect();

    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }

      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }

      if (updates.thumbnailUrl !== undefined) {
        updateFields.push(`thumbnail_url = $${paramIndex++}`);
        values.push(updates.thumbnailUrl);
      }

      if (updates.themeConfig !== undefined) {
        updateFields.push(`theme_config = $${paramIndex++}`);
        values.push(JSON.stringify(updates.themeConfig));
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Always update the updated_at field
      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      values.push(id);
      const query = `
        UPDATE form_themes
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id,
          name,
          description,
          thumbnail_url as "thumbnailUrl",
          theme_config as "themeConfig",
          usage_count as "usageCount",
          is_active as "isActive",
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Theme not found');
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        themeConfig: row.themeConfig,
        usageCount: row.usageCount,
        isActive: row.isActive,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      } as FormTheme;
    } catch (error: any) {
      throw new Error(`Failed to update theme: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Soft deletes a theme by setting is_active to false.
   * @param id - Theme ID to soft delete
   * @returns Promise containing boolean indicating success
   * @throws {Error} When deletion fails
   * @example
   * const success = await themesRepository.softDelete('theme-uuid');
   */
  async softDelete(id: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE form_themes
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error: any) {
      throw new Error(`Failed to soft delete theme: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Atomically increments the usage count for a theme.
   * @param id - Theme ID to increment usage count
   * @returns Promise containing the updated theme
   * @throws {Error} When increment fails or theme not found
   * @example
   * const theme = await themesRepository.incrementUsageCount('theme-uuid');
   */
  async incrementUsageCount(id: string): Promise<FormTheme> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE form_themes
        SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
          id,
          name,
          description,
          thumbnail_url as "thumbnailUrl",
          theme_config as "themeConfig",
          usage_count as "usageCount",
          is_active as "isActive",
          created_by as "createdBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        throw new Error('Theme not found');
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        thumbnailUrl: row.thumbnailUrl,
        themeConfig: row.themeConfig,
        usageCount: row.usageCount,
        isActive: row.isActive,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      } as FormTheme;
    } catch (error: any) {
      throw new Error(`Failed to increment usage count: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const themesRepository = new ThemesRepository();
