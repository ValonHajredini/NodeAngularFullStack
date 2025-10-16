import {
  FormTheme,
  CreateThemeRequest,
  UpdateThemeRequest,
  CreateCustomThemeRequest,
  ThemeValidationResult,
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
          updated_at as "updatedAt",
          is_custom as "isCustom",
          creator_id as "creatorId",
          theme_definition as "themeDefinition"
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
        isCustom: row.isCustom,
        creatorId: row.creatorId,
        themeDefinition: row.themeDefinition,
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
          updated_at as "updatedAt",
          is_custom as "isCustom",
          creator_id as "creatorId",
          theme_definition as "themeDefinition"
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
        isCustom: row.isCustom,
        creatorId: row.creatorId,
        themeDefinition: row.themeDefinition,
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
          created_by,
          is_custom,
          creator_id,
          theme_definition
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
          updated_at as "updatedAt",
          is_custom as "isCustom",
          creator_id as "creatorId",
          theme_definition as "themeDefinition",
          is_custom as "isCustom",
          creator_id as "creatorId",
          theme_definition as "themeDefinition"
      `;

      const values = [
        themeData.name,
        themeData.description || null,
        themeData.thumbnailUrl,
        JSON.stringify(themeData.themeConfig),
        themeData.createdBy || null,
        themeData.isCustom || false,
        themeData.creatorId || null,
        themeData.themeDefinition
          ? JSON.stringify(themeData.themeDefinition)
          : null,
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
        isCustom: row.isCustom,
        creatorId: row.creatorId,
        themeDefinition: row.themeDefinition,
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

      if (updates.themeDefinition !== undefined) {
        updateFields.push(`theme_definition = $${paramIndex++}`);
        values.push(
          updates.themeDefinition
            ? JSON.stringify(updates.themeDefinition)
            : null
        );
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
          updated_at as "updatedAt",
          is_custom as "isCustom",
          creator_id as "creatorId",
          theme_definition as "themeDefinition"
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
        isCustom: row.isCustom,
        creatorId: row.creatorId,
        themeDefinition: row.themeDefinition,
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
          updated_at as "updatedAt",
          is_custom as "isCustom",
          creator_id as "creatorId",
          theme_definition as "themeDefinition"
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
        isCustom: row.isCustom,
        creatorId: row.creatorId,
        themeDefinition: row.themeDefinition,
      } as FormTheme;
    } catch (error: any) {
      throw new Error(`Failed to increment usage count: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Validates theme definition size (max 50KB).
   * @param themeDefinition - Theme definition to validate
   * @returns Validation result with size information
   * @example
   * const validation = await themesRepository.validateThemeDefinitionSize({ customCss: '...' });
   */
  validateThemeDefinitionSize(themeDefinition: any): ThemeValidationResult {
    try {
      const jsonString = JSON.stringify(themeDefinition);
      const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
      const maxSizeInBytes = 51200; // 50KB

      if (sizeInBytes > maxSizeInBytes) {
        return {
          valid: false,
          error: `Theme definition exceeds maximum size of 50KB. Current size: ${Math.round(sizeInBytes / 1024)}KB`,
          sizeInBytes,
        };
      }

      return {
        valid: true,
        sizeInBytes,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: `Invalid theme definition: ${error.message}`,
      };
    }
  }

  /**
   * Creates a new custom theme with validation.
   * @param customThemeData - Custom theme data to create
   * @returns Promise containing the created custom theme
   * @throws {Error} When creation fails or validation fails
   * @example
   * const customTheme = await themesRepository.createCustomTheme({
   *   name: 'My Custom Theme',
   *   description: 'A personalized theme',
   *   thumbnailUrl: 'https://spaces.example.com/thumb.jpg',
   *   themeConfig: { desktop: { ... } },
   *   creatorId: 'user-uuid',
   *   themeDefinition: { customCss: '...' }
   * });
   */
  async createCustomTheme(
    customThemeData: CreateCustomThemeRequest
  ): Promise<FormTheme> {
    // Validate theme definition size
    const validation = this.validateThemeDefinitionSize(
      customThemeData.themeDefinition
    );
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Create theme with custom flag set
    const themeData: CreateThemeRequest = {
      ...customThemeData,
      isCustom: true,
      createdBy: customThemeData.creatorId, // Map to existing field for backward compatibility
    };

    return this.create(themeData);
  }

  /**
   * Finds all custom themes for a specific creator.
   * @param creatorId - Creator user ID to find themes for
   * @param activeOnly - If true, returns only active themes
   * @returns Promise containing array of custom themes ordered by creation date DESC
   * @throws {Error} When database query fails
   * @example
   * const userThemes = await themesRepository.findCustomThemesByCreator('user-uuid', true);
   */
  async findCustomThemesByCreator(
    creatorId: string,
    activeOnly: boolean = true
  ): Promise<FormTheme[]> {
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
          updated_at as "updatedAt",
          is_custom as "isCustom",
          creator_id as "creatorId",
          theme_definition as "themeDefinition"
        FROM form_themes
        WHERE creator_id = $1 AND is_custom = true
      `;
      const params: any[] = [creatorId];

      if (activeOnly) {
        query += ' AND is_active = $2';
        params.push(true);
      }

      query += ' ORDER BY created_at DESC';

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
        isCustom: row.isCustom,
        creatorId: row.creatorId,
        themeDefinition: row.themeDefinition,
      })) as FormTheme[];
    } catch (error: any) {
      throw new Error(
        `Failed to find custom themes by creator: ${error.message}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Finds all predefined themes (excludes custom themes).
   * @param activeOnly - If true, returns only active themes
   * @returns Promise containing array of predefined themes ordered by usage_count DESC
   * @throws {Error} When database query fails
   * @example
   * const predefinedThemes = await themesRepository.findPredefinedThemes(true);
   */
  async findPredefinedThemes(activeOnly: boolean = true): Promise<FormTheme[]> {
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
          updated_at as "updatedAt",
          is_custom as "isCustom",
          creator_id as "creatorId",
          theme_definition as "themeDefinition"
        FROM form_themes
        WHERE is_custom = false
      `;
      const params: any[] = [];

      if (activeOnly) {
        query += ' AND is_active = $1';
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
        isCustom: row.isCustom,
        creatorId: row.creatorId,
        themeDefinition: row.themeDefinition,
      })) as FormTheme[];
    } catch (error: any) {
      throw new Error(`Failed to find predefined themes: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const themesRepository = new ThemesRepository();
