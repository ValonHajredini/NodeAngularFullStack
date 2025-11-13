import { FormMetadata } from '@nodeangularfullstack/shared';
import { BaseRepository, TenantContext } from './base.repository';
import { DatabaseType } from '../config/multi-database.config';

/**
 * Repository for form metadata database operations.
 * Handles CRUD operations for forms with tenant isolation support.
 * Uses FORMS database for read-write operations.
 */
export class FormsRepository extends BaseRepository<FormMetadata> {
  constructor() {
    super('forms', DatabaseType.FORMS);
  }

  /**
   * Creates a new form.
   * @param data - Form metadata to create
   * @param tenantContext - Optional tenant context for multi-tenant mode
   * @returns Promise containing the created form
   * @throws {Error} When form creation fails
   * @example
   * const form = await formsRepository.create({
   *   userId: 'user-uuid',
   *   title: 'Contact Form',
   *   description: 'Customer contact form',
   *   status: FormStatus.DRAFT
   * }, tenantContext);
   */
  async create(
    data: Partial<FormMetadata>,
    tenantContext?: TenantContext
  ): Promise<FormMetadata> {
    const client = await this.pool.connect();

    try {
      const fields: string[] = [];
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      // Build dynamic insert query
      if (data.userId !== undefined) {
        fields.push('user_id');
        values.push(data.userId);
        placeholders.push(`$${paramIndex++}`);
      }

      if (data.title !== undefined) {
        fields.push('title');
        values.push(data.title);
        placeholders.push(`$${paramIndex++}`);
      }

      if (data.description !== undefined) {
        fields.push('description');
        values.push(data.description);
        placeholders.push(`$${paramIndex++}`);
      }

      if (data.status !== undefined) {
        fields.push('status');
        values.push(data.status);
        placeholders.push(`$${paramIndex++}`);
      }

      // Add tenant_id if multi-tenancy is enabled
      if (tenantContext) {
        fields.push('tenant_id');
        values.push(tenantContext.id);
        placeholders.push(`$${paramIndex++}`);
      }

      // Add default timestamps
      fields.push('created_at', 'updated_at');
      placeholders.push('CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP');

      const query = `
        INSERT INTO forms (${fields.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING
          id,
          user_id as "userId",
          tenant_id as "tenantId",
          title,
          description,
          status,
          qr_code_url as "qrCodeUrl",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create form record');
      }

      return result.rows[0] as FormMetadata;
    } catch (error: any) {
      throw new Error(`Failed to create form: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a form by ID with optional tenant filtering.
   * @param id - Form ID to find
   * @param tenantId - Optional tenant ID for tenant isolation (as string)
   * @returns Promise containing the form or null if not found
   * @throws {Error} When database query fails
   * @example
   * const form = await formsRepository.findFormById('form-uuid', 'tenant-uuid');
   */
  async findFormById(
    id: string,
    tenantId?: string
  ): Promise<FormMetadata | null> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          id,
          user_id as "userId",
          tenant_id as "tenantId",
          title,
          description,
          status,
          qr_code_url as "qrCodeUrl",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM forms
        WHERE id = $1
      `;
      const params: any[] = [id];

      // Apply tenant filtering if provided
      if (tenantId) {
        query += ' AND tenant_id = $2';
        params.push(tenantId);
      }

      const result = await client.query(query, params);
      return result.rows.length > 0 ? (result.rows[0] as FormMetadata) : null;
    } catch (error: any) {
      throw new Error(`Failed to find form by ID: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a form by ID with its latest schema (includes category from schema_json).
   * This method JOINs with form_schemas to retrieve the form's category metadata.
   * Use this method when you need category detection for analytics or template selection.
   *
   * @param id - Form ID to find
   * @param tenantId - Optional tenant ID for tenant isolation (as string)
   * @returns Promise containing the form with schema or null if not found
   * @throws {Error} When database query fails
   * @example
   * const form = await formsRepository.findFormWithSchema('form-uuid', 'tenant-uuid');
   * const category = form?.schema?.schemaJson?.category; // Access category from schema
   *
   * @since Story 30.5 (QA Fix)
   */
  async findFormWithSchema(
    id: string,
    tenantId?: string
  ): Promise<FormMetadata | null> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          f.id,
          f.user_id as "userId",
          f.tenant_id as "tenantId",
          f.title,
          f.description,
          f.status,
          f.qr_code_url as "qrCodeUrl",
          f.created_at as "createdAt",
          f.updated_at as "updatedAt",
          fs.id as "schema.id",
          fs.schema_version as "schema.version",
          fs.schema_json as "schema.schemaJson",
          fs.is_published as "schema.isPublished",
          fs.render_token as "schema.renderToken",
          fs.expires_at as "schema.expiresAt",
          fs.created_at as "schema.createdAt",
          fs.updated_at as "schema.updatedAt"
        FROM forms f
        LEFT JOIN LATERAL (
          SELECT *
          FROM form_schemas
          WHERE form_id = f.id
          ORDER BY schema_version DESC
          LIMIT 1
        ) fs ON true
        WHERE f.id = $1
      `;
      const params: any[] = [id];

      // Apply tenant filtering if provided
      if (tenantId) {
        query += ' AND f.tenant_id = $2';
        params.push(tenantId);
      }

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      // Build form metadata object
      const form: FormMetadata = {
        id: row.id,
        userId: row.userId,
        tenantId: row.tenantId,
        title: row.title,
        description: row.description,
        status: row.status,
        qrCodeUrl: row.qrCodeUrl,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };

      // Add schema if it exists
      if (row['schema.id'] && row['schema.schemaJson']) {
        const schemaJson = row['schema.schemaJson'];
        form.schema = {
          id: row['schema.id'],
          formId: row.id,
          version: row['schema.version'],
          fields: schemaJson.fields || [],
          settings: schemaJson.settings || {},
          category: schemaJson.category, // ✅ Extract category from schema_json
          isPublished: row['schema.isPublished'],
          renderToken: row['schema.renderToken'],
          expiresAt: row['schema.expiresAt'],
          createdAt: row['schema.createdAt'],
          updatedAt: row['schema.updatedAt'],
        };
      }

      return form;
    } catch (error: any) {
      throw new Error(`Failed to find form with schema: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds all forms created by a specific user.
   * @param userId - User ID to filter by
   * @param tenantId - Optional tenant ID for tenant isolation
   * @returns Promise containing array of forms
   * @throws {Error} When database query fails
   * @example
   * const forms = await formsRepository.findByUserId('user-uuid', 'tenant-uuid');
   */
  async findByUserId(
    userId: string,
    tenantId?: string
  ): Promise<FormMetadata[]> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          f.id,
          f.user_id as "userId",
          f.tenant_id as "tenantId",
          f.title,
          f.description,
          f.status,
          f.qr_code_url as "qrCodeUrl",
          f.created_at as "createdAt",
          f.updated_at as "updatedAt",
          sl.code as "shortCode"
        FROM forms f
        LEFT JOIN form_schemas fs ON f.id = fs.form_id AND fs.is_published = true
        LEFT JOIN LATERAL (
          SELECT code
          FROM short_links
          WHERE form_schema_id = fs.id
          ORDER BY created_at DESC
          LIMIT 1
        ) sl ON true
        WHERE f.user_id = $1
      `;
      const params: any[] = [userId];

      // Apply tenant filtering if provided
      if (tenantId) {
        query += ' AND tenant_id = $2';
        params.push(tenantId);
      }

      query += ' ORDER BY f.created_at DESC';

      const result = await client.query(query, params);
      return result.rows as FormMetadata[];
    } catch (error: any) {
      throw new Error(`Failed to find forms by user ID: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates a form by ID.
   * @param id - Form ID to update
   * @param data - Data to update
   * @returns Promise containing the updated form
   * @throws {Error} When update fails or form not found
   * @example
   * const form = await formsRepository.update('form-uuid', {
   *   title: 'Updated Contact Form',
   *   status: FormStatus.PUBLISHED
   * });
   */
  async update(id: string, data: Partial<FormMetadata>): Promise<FormMetadata> {
    const client = await this.pool.connect();

    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (data.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(data.title);
      }

      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }

      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Always update the updated_at field
      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      values.push(id);
      const query = `
        UPDATE forms
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id,
          user_id as "userId",
          tenant_id as "tenantId",
          title,
          description,
          status,
          qr_code_url as "qrCodeUrl",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Form not found');
      }

      return result.rows[0] as FormMetadata;
    } catch (error: any) {
      throw new Error(`Failed to update form: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds all forms with optional user filtering and pagination.
   * @param userId - Optional user ID to filter by (undefined for admin to see all)
   * @param tenantContext - Optional tenant context for multi-tenant mode
   * @param page - Page number for pagination (default: 1)
   * @param limit - Number of items per page (default: 20)
   * @returns Promise containing array of forms
   * @throws {Error} When database query fails
   * @example
   * const forms = await formsRepository.findAll('user-uuid', tenantContext, 1, 20);
   */
  async findAll(
    userId?: string,
    tenantContext?: TenantContext,
    page: number = 1,
    limit: number = 20
  ): Promise<FormMetadata[]> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          f.id,
          f.user_id as "userId",
          f.tenant_id as "tenantId",
          f.title,
          f.description,
          f.status,
          f.qr_code_url as "qrCodeUrl",
          f.created_at as "createdAt",
          f.updated_at as "updatedAt",
          fs.id as "schema.id",
          fs.schema_version as "schema.version",
          fs.schema_json as "schema.schemaJson",
          fs.is_published as "schema.isPublished",
          fs.render_token as "schema.renderToken",
          fs.expires_at as "schema.expiresAt",
          fs.created_at as "schema.createdAt",
          fs.updated_at as "schema.updatedAt",
          sl.code as "shortCode"
        FROM forms f
        LEFT JOIN LATERAL (
          SELECT *
          FROM form_schemas
          WHERE form_id = f.id
          ORDER BY schema_version DESC
          LIMIT 1
        ) fs ON true
        LEFT JOIN LATERAL (
          SELECT code
          FROM short_links
          WHERE form_schema_id = fs.id
          ORDER BY created_at DESC
          LIMIT 1
        ) sl ON true
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      // Filter by user if provided (for non-admin users)
      if (userId) {
        query += ` AND f.user_id = $${paramIndex++}`;
        params.push(userId);
      }

      // Apply tenant filtering if provided
      if (tenantContext) {
        query += ` AND f.tenant_id = $${paramIndex++}`;
        params.push(tenantContext.id);
      }

      // Add ordering and pagination
      query += ' ORDER BY f.created_at DESC';
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, (page - 1) * limit);

      const result = await client.query(query, params);

      // Transform the flat result into nested FormMetadata structure
      return result.rows.map((row: any) => {
        const form: FormMetadata = {
          id: row.id,
          userId: row.userId,
          tenantId: row.tenantId,
          title: row.title,
          description: row.description,
          status: row.status,
          qrCodeUrl: row.qrCodeUrl,
          shortCode: row.shortCode,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };

        // Add schema if it exists
        if (row['schema.id'] && row['schema.schemaJson']) {
          const schemaJson = row['schema.schemaJson'];
          form.schema = {
            id: row['schema.id'],
            formId: row.id,
            version: row['schema.version'],
            fields: schemaJson.fields || [],
            settings: schemaJson.settings || {},
            isPublished: row['schema.isPublished'],
            renderToken: row['schema.renderToken'],
            expiresAt: row['schema.expiresAt'],
            createdAt: row['schema.createdAt'],
            updatedAt: row['schema.updatedAt'],
          };
        }

        return form;
      });
    } catch (error: any) {
      throw new Error(`Failed to find forms: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes a form by ID.
   * @param id - Form ID to delete
   * @returns Promise containing boolean indicating success
   * @throws {Error} When deletion fails
   * @example
   * const deleted = await formsRepository.delete('form-uuid');
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = `
        DELETE FROM forms
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error: any) {
      throw new Error(`Failed to delete form: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes a form by ID (ensures owner-only deletion).
   * @param id - Form ID to delete
   * @param userId - User ID to verify ownership
   * @returns Promise containing boolean indicating success
   * @throws {Error} When deletion fails or user is not the owner
   * @example
   * const deleted = await formsRepository.deleteByOwner('form-uuid', 'user-uuid');
   */
  async deleteByOwner(id: string, userId: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      // Delete only if user is the owner
      const query = `
        DELETE FROM forms
        WHERE id = $1 AND user_id = $2
      `;

      const result = await client.query(query, [id, userId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error: any) {
      throw new Error(`Failed to delete form: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates the QR code URL for a specific form.
   * Story 26.3: Integrated QR Code Generation and Display
   * @param formId - Form ID to update
   * @param qrCodeUrl - QR code storage URL from DigitalOcean Spaces
   * @returns Promise containing updated form metadata
   * @throws {Error} When update fails or form not found
   * @example
   * const updated = await formsRepository.updateQRCodeUrl('form-uuid', 'https://storage.url/qr.png');
   */
  async updateQRCodeUrl(
    formId: string,
    qrCodeUrl: string
  ): Promise<FormMetadata | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE forms
        SET qr_code_url = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING
          id,
          user_id as "userId",
          tenant_id as "tenantId",
          title,
          description,
          status,
          qr_code_url as "qrCodeUrl",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, [qrCodeUrl, formId]);
      return result.rows.length > 0 ? (result.rows[0] as FormMetadata) : null;
    } catch (error: any) {
      throw new Error(`Failed to update QR code URL: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const formsRepository = new FormsRepository();
