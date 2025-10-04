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
   *   isPublished: false
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
          version,
          fields,
          settings,
          is_published,
          render_token,
          expires_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING
          id,
          form_id as "formId",
          version,
          fields,
          settings,
          is_published as "isPublished",
          render_token as "renderToken",
          expires_at as "expiresAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const values = [
        formId,
        schema.version,
        JSON.stringify(schema.fields),
        JSON.stringify(schema.settings),
        schema.isPublished || false,
        schema.renderToken || null,
        schema.expiresAt || null,
      ];

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create form schema');
      }

      const row = result.rows[0];
      return {
        ...row,
        fields: row.fields,
        settings: row.settings,
      } as FormSchema;
    } catch (error: any) {
      throw new Error(`Failed to create form schema: ${error.message}`);
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
          version,
          fields,
          settings,
          is_published as "isPublished",
          render_token as "renderToken",
          expires_at as "expiresAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM form_schemas
        WHERE form_id = $1
        ORDER BY version DESC
      `;

      const result = await client.query(query, [formId]);
      return result.rows.map((row) => ({
        ...row,
        fields: row.fields,
        settings: row.settings,
      })) as FormSchema[];
    } catch (error: any) {
      throw new Error(`Failed to find schemas by form ID: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a form schema by render token.
   * @param token - Render token to search for
   * @returns Promise containing the schema or null if not found
   * @throws {Error} When database query fails
   * @example
   * const schema = await formSchemasRepository.findByToken('jwt-token-here');
   */
  async findByToken(token: string): Promise<FormSchema | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          form_id as "formId",
          version,
          fields,
          settings,
          is_published as "isPublished",
          render_token as "renderToken",
          expires_at as "expiresAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM form_schemas
        WHERE render_token = $1 AND is_published = true
      `;

      const result = await client.query(query, [token]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        fields: row.fields,
        settings: row.settings,
      } as FormSchema;
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
   *   settings: {...}
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

      // Build dynamic update query
      if (schema.fields !== undefined) {
        updateFields.push(`fields = $${paramIndex++}`);
        values.push(JSON.stringify(schema.fields));
      }

      if (schema.settings !== undefined) {
        updateFields.push(`settings = $${paramIndex++}`);
        values.push(JSON.stringify(schema.settings));
      }

      if (schema.version !== undefined) {
        updateFields.push(`version = $${paramIndex++}`);
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
          version,
          fields,
          settings,
          is_published as "isPublished",
          render_token as "renderToken",
          expires_at as "expiresAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Form schema not found');
      }

      const row = result.rows[0];
      return {
        ...row,
        fields: row.fields,
        settings: row.settings,
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
          version,
          fields,
          settings,
          is_published as "isPublished",
          render_token as "renderToken",
          expires_at as "expiresAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, [id, token, expiresAt]);

      if (result.rows.length === 0) {
        throw new Error('Form schema not found');
      }

      const row = result.rows[0];
      return {
        ...row,
        fields: row.fields,
        settings: row.settings,
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
          version,
          fields,
          settings,
          is_published as "isPublished",
          render_token as "renderToken",
          expires_at as "expiresAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        throw new Error('Form schema not found');
      }

      const row = result.rows[0];
      return {
        ...row,
        fields: row.fields,
        settings: row.settings,
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
