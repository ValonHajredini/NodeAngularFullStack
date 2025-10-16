import { Pool } from 'pg';
import { FormSchema } from '@nodeangularfullstack/shared';
import { databaseService } from '../services/database.service';

/**
 * Repository for form schema database operations.
 * Handles schema versioning, publishing, and token management.
 */
export class FormSchemasRepository {
  private get pool(): Pool {
    return databaseService.getPool();
  }

  /**
   * Creates a new form schema version.
   * @param formId - Parent form ID
   * @param schema - Form schema data
   * @returns Promise containing the created schema
   * @throws {Error} When schema creation fails
   * @example
   * const schema = await formSchemasRepository.createSchema('form-uuid', {
   *   version: 1,
   *   fields: [...],
   *   settings: {...},
   *   isPublished: false,
   *   themeId: 'theme-uuid'
   * });
   */
  async createSchema(
    formId: string,
    schema: Omit<FormSchema, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<FormSchema> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO form_schemas (
          form_id,
          schema_version,
          schema_json,
          is_published,
          render_token,
          expires_at,
          theme_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          form_id as "formId",
          schema_version as "version",
          schema_json,
          is_published as "isPublished",
          render_token as "renderToken",
          expires_at as "expiresAt",
          theme_id as "themeId",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      // Build schema JSON from fields and settings
      const schemaJson = {
        fields: schema.fields || [],
        settings: schema.settings || {},
      };

      const values = [
        formId,
        schema.version || 1,
        JSON.stringify(schemaJson),
        schema.isPublished || false,
        schema.renderToken || null,
        schema.expiresAt || null,
        schema.themeId || null,
      ];

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create form schema');
      }

      const row = result.rows[0];
      const parsedSchemaJson = row.schema_json;

      return {
        id: row.id,
        formId: row.formId,
        version: row.version,
        fields: parsedSchemaJson.fields || [],
        settings: {
          ...(parsedSchemaJson.settings || {}),
          // Copy themeId from DB column into settings for frontend compatibility
          themeId: row.themeId || parsedSchemaJson.settings?.themeId,
        },
        isPublished: row.isPublished,
        renderToken: row.renderToken,
        expiresAt: row.expiresAt,
        themeId: row.themeId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      } as FormSchema;
    } catch (error: any) {
      throw new Error(`Failed to create form schema: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a form schema by its ID with embedded theme data.
   * @param id - Schema ID to find
   * @returns Promise containing the schema with theme or null if not found
   * @throws {Error} When database query fails
   * @example
   * const schema = await formSchemasRepository.findById('schema-uuid');
   */
  async findById(id: string): Promise<FormSchema | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          form_schemas.id,
          form_schemas.form_id as "formId",
          form_schemas.schema_version as version,
          form_schemas.schema_json,
          form_schemas.is_published as "isPublished",
          form_schemas.render_token as "renderToken",
          form_schemas.expires_at as "expiresAt",
          form_schemas.theme_id as "themeId",
          form_schemas.created_at as "createdAt",
          form_schemas.updated_at as "updatedAt",
          form_themes.id as "theme.id",
          form_themes.name as "theme.name",
          form_themes.description as "theme.description",
          form_themes.thumbnail_url as "theme.thumbnailUrl",
          form_themes.theme_config as "theme.themeConfig",
          form_themes.usage_count as "theme.usageCount",
          form_themes.is_active as "theme.isActive",
          form_themes.created_at as "theme.createdAt",
          form_themes.updated_at as "theme.updatedAt"
        FROM form_schemas
        LEFT JOIN form_themes ON form_schemas.theme_id = form_themes.id
        WHERE form_schemas.id = $1
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const parsedSchemaJson = row.schema_json;

      const schema: FormSchema = {
        id: row.id,
        formId: row.formId,
        version: row.version,
        fields: parsedSchemaJson.fields || [],
        settings: {
          ...(parsedSchemaJson.settings || {}),
          // Copy themeId from DB column into settings for frontend compatibility
          themeId: row.themeId || parsedSchemaJson.settings?.themeId,
        },
        isPublished: row.isPublished,
        renderToken: row.renderToken,
        expiresAt: row.expiresAt,
        themeId: row.themeId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };

      // Add embedded theme object if theme exists
      if (row['theme.id']) {
        schema.theme = {
          id: row['theme.id'],
          name: row['theme.name'],
          description: row['theme.description'],
          thumbnailUrl: row['theme.thumbnailUrl'],
          themeConfig: row['theme.themeConfig'],
          usageCount: row['theme.usageCount'],
          isActive: row['theme.isActive'],
          createdBy: undefined, // Not included in this query
          createdAt: row['theme.createdAt'],
          updatedAt: row['theme.updatedAt'],
        };
      }

      return schema;
    } catch (error: any) {
      throw new Error(`Failed to find schema by ID: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds all schema versions for a specific form.
   * @param formId - Form ID to find schemas for
   * @returns Promise containing array of schemas ordered by version descending
   * @throws {Error} When database query fails
   * @example
   * const schemas = await formSchemasRepository.findByFormId('form-uuid');
   */
  async findByFormId(formId: string): Promise<FormSchema[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          form_id as "formId",
          schema_version as version,
          schema_json,
          is_published as "isPublished",
          render_token as "renderToken",
          expires_at as "expiresAt",
          theme_id as "themeId",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM form_schemas
        WHERE form_id = $1
        ORDER BY schema_version DESC
      `;

      const result = await client.query(query, [formId]);
      return result.rows.map((row) => {
        const parsedSchemaJson = row.schema_json;
        return {
          id: row.id,
          formId: row.formId,
          version: row.version,
          fields: parsedSchemaJson.fields || [],
          settings: {
            ...(parsedSchemaJson.settings || {}),
            // Copy themeId from DB column into settings for frontend compatibility
            themeId: row.themeId || parsedSchemaJson.settings?.themeId,
          },
          isPublished: row.isPublished,
          renderToken: row.renderToken,
          expiresAt: row.expiresAt,
          themeId: row.themeId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };
      }) as FormSchema[];
    } catch (error: any) {
      throw new Error(`Failed to find schemas by form ID: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a form schema by render token with embedded theme data.
   * @param token - Render token to search for
   * @returns Promise containing the schema with theme or null if not found
   * @throws {Error} When database query fails
   * @example
   * const schema = await formSchemasRepository.findByToken('jwt-token-here');
   */
  async findByToken(token: string): Promise<FormSchema | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          form_schemas.id,
          form_schemas.form_id as "formId",
          form_schemas.schema_version as version,
          form_schemas.schema_json,
          form_schemas.is_published as "isPublished",
          form_schemas.render_token as "renderToken",
          form_schemas.expires_at as "expiresAt",
          form_schemas.theme_id as "themeId",
          form_schemas.created_at as "createdAt",
          form_schemas.updated_at as "updatedAt",
          form_themes.id as "theme.id",
          form_themes.name as "theme.name",
          form_themes.description as "theme.description",
          form_themes.thumbnail_url as "theme.thumbnailUrl",
          form_themes.theme_config as "theme.themeConfig",
          form_themes.usage_count as "theme.usageCount",
          form_themes.is_active as "theme.isActive",
          form_themes.created_at as "theme.createdAt",
          form_themes.updated_at as "theme.updatedAt"
        FROM form_schemas
        LEFT JOIN form_themes ON form_schemas.theme_id = form_themes.id
        WHERE form_schemas.render_token = $1 AND form_schemas.is_published = true
      `;

      const result = await client.query(query, [token]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const parsedSchemaJson = row.schema_json;

      const schema: FormSchema = {
        id: row.id,
        formId: row.formId,
        version: row.version,
        fields: parsedSchemaJson.fields || [],
        settings: {
          ...(parsedSchemaJson.settings || {}),
          // Copy themeId from DB column into settings for frontend compatibility
          themeId: row.themeId || parsedSchemaJson.settings?.themeId,
        },
        isPublished: row.isPublished,
        renderToken: row.renderToken,
        expiresAt: row.expiresAt,
        themeId: row.themeId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };

      // Add embedded theme object if theme exists
      if (row['theme.id']) {
        schema.theme = {
          id: row['theme.id'],
          name: row['theme.name'],
          description: row['theme.description'],
          thumbnailUrl: row['theme.thumbnailUrl'],
          themeConfig: row['theme.themeConfig'],
          usageCount: row['theme.usageCount'],
          isActive: row['theme.isActive'],
          createdBy: undefined, // Not included in this query
          createdAt: row['theme.createdAt'],
          updatedAt: row['theme.updatedAt'],
        };
      }

      return schema;
    } catch (error: any) {
      throw new Error(`Failed to find schema by token: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates a form schema.
   * @param id - Schema ID to update
   * @param schema - Partial schema data to update
   * @returns Promise containing the updated schema
   * @throws {Error} When update fails or schema not found
   * @example
   * const schema = await formSchemasRepository.updateSchema('schema-uuid', {
   *   fields: [...],
   *   settings: {...},
   *   themeId: 'theme-uuid'
   * });
   */
  async updateSchema(
    id: string,
    schema: Partial<
      Omit<FormSchema, 'id' | 'formId' | 'createdAt' | 'updatedAt'>
    >
  ): Promise<FormSchema> {
    const client = await this.pool.connect();

    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Handle schema_json update if fields or settings changed
      if (schema.fields !== undefined || schema.settings !== undefined) {
        // Get current schema to merge with updates
        const currentResult = await client.query(
          'SELECT schema_json FROM form_schemas WHERE id = $1',
          [id]
        );
        if (currentResult.rows.length === 0) {
          throw new Error('Form schema not found');
        }

        const currentSchemaJson = currentResult.rows[0].schema_json;
        const updatedSchemaJson = {
          fields:
            schema.fields !== undefined
              ? schema.fields
              : currentSchemaJson.fields,
          settings:
            schema.settings !== undefined
              ? schema.settings
              : currentSchemaJson.settings,
        };

        updateFields.push(`schema_json = $${paramIndex++}`);
        values.push(JSON.stringify(updatedSchemaJson));
      }

      if (schema.version !== undefined) {
        updateFields.push(`schema_version = $${paramIndex++}`);
        values.push(schema.version);
      }

      if (schema.isPublished !== undefined) {
        updateFields.push(`is_published = $${paramIndex++}`);
        values.push(schema.isPublished);
      }

      if (schema.renderToken !== undefined) {
        updateFields.push(`render_token = $${paramIndex++}`);
        values.push(schema.renderToken);
      }

      if (schema.expiresAt !== undefined) {
        updateFields.push(`expires_at = $${paramIndex++}`);
        values.push(schema.expiresAt);
      }

      if (schema.themeId !== undefined) {
        updateFields.push(`theme_id = $${paramIndex++}`);
        values.push(schema.themeId);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Always update the updated_at field
      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      values.push(id);
      const query = `
        UPDATE form_schemas
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id,
          form_id as "formId",
          schema_version as version,
          schema_json,
          is_published as "isPublished",
          render_token as "renderToken",
          expires_at as "expiresAt",
          theme_id as "themeId",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Form schema not found');
      }

      const row = result.rows[0];
      const parsedSchemaJson = row.schema_json;

      return {
        id: row.id,
        formId: row.formId,
        version: row.version,
        fields: parsedSchemaJson.fields || [],
        settings: {
          ...(parsedSchemaJson.settings || {}),
          // Copy themeId from DB column into settings for frontend compatibility
          themeId: row.themeId || parsedSchemaJson.settings?.themeId,
        },
        isPublished: row.isPublished,
        renderToken: row.renderToken,
        expiresAt: row.expiresAt,
        themeId: row.themeId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      } as FormSchema;
    } catch (error: any) {
      throw new Error(`Failed to update form schema: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Publishes a form schema with render token.
   * @param id - Schema ID to publish
   * @param token - Render token for public access
   * @param expiresAt - Token expiration date
   * @returns Promise containing the published schema
   * @throws {Error} When publish fails or schema not found
   * @example
   * const schema = await formSchemasRepository.publishSchema(
   *   'schema-uuid',
   *   'jwt-token-here',
   *   new Date('2025-12-31')
   * );
   */
  async publishSchema(
    id: string,
    token: string,
    expiresAt: Date
  ): Promise<FormSchema> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE form_schemas
        SET
          is_published = true,
          render_token = $2,
          expires_at = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
          id,
          form_id as "formId",
          schema_version as version,
          schema_json,
          is_published as "isPublished",
          render_token as "renderToken",
          expires_at as "expiresAt",
          theme_id as "themeId",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, [id, token, expiresAt]);

      if (result.rows.length === 0) {
        throw new Error('Form schema not found');
      }

      const row = result.rows[0];
      const parsedSchemaJson = row.schema_json;

      return {
        id: row.id,
        formId: row.formId,
        version: row.version,
        fields: parsedSchemaJson.fields || [],
        settings: {
          ...(parsedSchemaJson.settings || {}),
          // Copy themeId from DB column into settings for frontend compatibility
          themeId: row.themeId || parsedSchemaJson.settings?.themeId,
        },
        isPublished: row.isPublished,
        renderToken: row.renderToken,
        expiresAt: row.expiresAt,
        themeId: row.themeId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      } as FormSchema;
    } catch (error: any) {
      throw new Error(`Failed to publish form schema: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Unpublishes a form schema (sets is_published to false).
   * @param id - Schema ID to unpublish
   * @returns Promise containing the unpublished schema
   * @throws {Error} When unpublish fails or schema not found
   * @example
   * const schema = await formSchemasRepository.unpublishSchema('schema-uuid');
   */
  async unpublishSchema(id: string): Promise<FormSchema> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE form_schemas
        SET
          is_published = false,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
          id,
          form_id as "formId",
          schema_version as version,
          schema_json,
          is_published as "isPublished",
          render_token as "renderToken",
          expires_at as "expiresAt",
          theme_id as "themeId",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        throw new Error('Form schema not found');
      }

      const row = result.rows[0];
      const parsedSchemaJson = row.schema_json;

      return {
        id: row.id,
        formId: row.formId,
        version: row.version,
        fields: parsedSchemaJson.fields || [],
        settings: {
          ...(parsedSchemaJson.settings || {}),
          // Copy themeId from DB column into settings for frontend compatibility
          themeId: row.themeId || parsedSchemaJson.settings?.themeId,
        },
        isPublished: row.isPublished,
        renderToken: row.renderToken,
        expiresAt: row.expiresAt,
        themeId: row.themeId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      } as FormSchema;
    } catch (error: any) {
      throw new Error(`Failed to unpublish form schema: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const formSchemasRepository = new FormSchemasRepository();
