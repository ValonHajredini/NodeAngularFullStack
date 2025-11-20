import {
  FormTemplate,
  TemplateCategory,
  CreateFormTemplateRequest,
  UpdateFormTemplateRequest,
} from '@nodeangularfullstack/shared';
import { BaseRepository } from './base.repository';
import { DatabaseType } from '../config/multi-database.config';

/**
 * Repository for form template database operations.
 * Handles template CRUD operations, usage tracking, and category-based filtering.
 * Uses FORMS database for read-write operations.
 */
export class TemplatesRepository extends BaseRepository<FormTemplate> {
  constructor() {
    super('form_templates', DatabaseType.FORMS);
  }

  /**
   * Creates a new form template.
   * @param templateData - Template data to create
   * @returns Promise containing the created template
   * @throws {Error} When creation fails or validation fails
   * @example
   * const template = await templatesRepository.create({
   *   name: 'Product Order Form',
   *   description: 'Standard product order form with inventory tracking',
   *   category: TemplateCategory.ECOMMERCE,
   *   templateSchema: { fields: [...] },
   *   businessLogicConfig: { type: 'inventory', ... }
   * });
   */
  async create(
    templateData: CreateFormTemplateRequest
  ): Promise<FormTemplate> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO form_templates (
          name,
          description,
          category,
          preview_image_url,
          template_schema,
          business_logic_config,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          name,
          description,
          category,
          preview_image_url as "previewImageUrl",
          template_schema as "templateSchema",
          business_logic_config as "businessLogicConfig",
          created_by as "createdBy",
          is_active as "isActive",
          usage_count as "usageCount",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const values = [
        templateData.name,
        templateData.description || null,
        templateData.category,
        templateData.previewImageUrl || null,
        JSON.stringify(templateData.templateSchema),
        templateData.businessLogicConfig
          ? JSON.stringify(templateData.businessLogicConfig)
          : null,
        null, // created_by will be set by service layer when available
      ];

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create template');
      }

      return result.rows[0] as FormTemplate;
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        throw new Error(
          `Template with name "${templateData.name}" already exists`
        );
      }
      // Handle check constraint violations
      if (error.code === '23514') {
        if (error.message.includes('category')) {
          throw new Error(
            `Invalid category "${templateData.category}". Must be one of: ecommerce, services, data_collection, events, quiz, polls`
          );
        }
        if (error.message.includes('template_schema')) {
          throw new Error(
            'Template schema exceeds maximum size of 100KB'
          );
        }
      }
      throw new Error(`Failed to create template: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds all templates with optional filtering and pagination.
   * @param filters - Optional filters (isActive, category)
   * @param pagination - Optional pagination (limit, offset)
   * @returns Promise containing array of templates sorted by usage_count DESC
   * @throws {Error} When database query fails
   * @example
   * // Get all active templates
   * const templates = await templatesRepository.findAll({ isActive: true });
   *
   * // Get ecommerce templates with pagination
   * const ecommerceTemplates = await templatesRepository.findAll(
   *   { category: 'ecommerce' },
   *   { limit: 10, offset: 0 }
   * );
   */
  async findAll(
    filters?: { isActive?: boolean; category?: string },
    pagination?: { limit: number; offset: number }
  ): Promise<FormTemplate[]> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          id,
          name,
          description,
          category,
          preview_image_url as "previewImageUrl",
          template_schema as "templateSchema",
          business_logic_config as "businessLogicConfig",
          created_by as "createdBy",
          is_active as "isActive",
          usage_count as "usageCount",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM form_templates
      `;

      const whereClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Build WHERE clauses dynamically
      if (filters?.isActive !== undefined) {
        whereClauses.push(`is_active = $${paramIndex++}`);
        params.push(filters.isActive);
      }

      if (filters?.category) {
        whereClauses.push(`category = $${paramIndex++}`);
        params.push(filters.category);
      }

      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }

      // Add sorting
      query += ' ORDER BY usage_count DESC, created_at DESC';

      // Add pagination
      if (pagination) {
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(pagination.limit, pagination.offset);
      }

      const result = await client.query(query, params);
      return result.rows as FormTemplate[];
    } catch (error: any) {
      throw new Error(`Failed to find templates: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a template by its ID.
   * @param id - Template ID to find
   * @returns Promise containing the template or null if not found
   * @throws {Error} When database query fails
   * @example
   * const template = await templatesRepository.findById('template-uuid');
   */
  async findById(id: string): Promise<FormTemplate | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          name,
          description,
          category,
          preview_image_url as "previewImageUrl",
          template_schema as "templateSchema",
          business_logic_config as "businessLogicConfig",
          created_by as "createdBy",
          is_active as "isActive",
          usage_count as "usageCount",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM form_templates
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as FormTemplate;
    } catch (error: any) {
      throw new Error(`Failed to find template by ID: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds all templates in a specific category.
   * Uses B-tree index on category column for efficient filtering.
   * @param category - Template category to filter by
   * @returns Promise containing array of templates sorted by usage_count DESC
   * @throws {Error} When database query fails
   * @example
   * const ecommerceTemplates = await templatesRepository.findByCategory(TemplateCategory.ECOMMERCE);
   */
  async findByCategory(category: TemplateCategory): Promise<FormTemplate[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id,
          name,
          description,
          category,
          preview_image_url as "previewImageUrl",
          template_schema as "templateSchema",
          business_logic_config as "businessLogicConfig",
          created_by as "createdBy",
          is_active as "isActive",
          usage_count as "usageCount",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM form_templates
        WHERE category = $1 AND is_active = true
        ORDER BY usage_count DESC
      `;

      const result = await client.query(query, [category]);
      return result.rows as FormTemplate[];
    } catch (error: any) {
      throw new Error(`Failed to find templates by category: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates an existing template.
   * @param id - Template ID to update
   * @param updates - Partial template data to update
   * @returns Promise containing the updated template
   * @throws {Error} When update fails or template not found
   * @example
   * const template = await templatesRepository.update('template-uuid', {
   *   name: 'Updated Template Name',
   *   description: 'New description'
   * });
   */
  async update(
    id: string,
    updates: UpdateFormTemplateRequest
  ): Promise<FormTemplate> {
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

      if (updates.category !== undefined) {
        updateFields.push(`category = $${paramIndex++}`);
        values.push(updates.category);
      }

      if (updates.previewImageUrl !== undefined) {
        updateFields.push(`preview_image_url = $${paramIndex++}`);
        values.push(updates.previewImageUrl);
      }

      if (updates.templateSchema !== undefined) {
        updateFields.push(`template_schema = $${paramIndex++}`);
        values.push(JSON.stringify(updates.templateSchema));
      }

      if (updates.businessLogicConfig !== undefined) {
        updateFields.push(`business_logic_config = $${paramIndex++}`);
        values.push(
          updates.businessLogicConfig
            ? JSON.stringify(updates.businessLogicConfig)
            : null
        );
      }

      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Always update the updated_at field
      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      values.push(id);
      const query = `
        UPDATE form_templates
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id,
          name,
          description,
          category,
          preview_image_url as "previewImageUrl",
          template_schema as "templateSchema",
          business_logic_config as "businessLogicConfig",
          created_by as "createdBy",
          is_active as "isActive",
          usage_count as "usageCount",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Template not found');
      }

      return result.rows[0] as FormTemplate;
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        throw new Error(
          `Template with name "${updates.name}" already exists`
        );
      }
      // Handle check constraint violations
      if (error.code === '23514') {
        if (error.message.includes('category')) {
          throw new Error(
            `Invalid category "${updates.category}". Must be one of: ecommerce, services, data_collection, events, quiz, polls`
          );
        }
        if (error.message.includes('template_schema')) {
          throw new Error(
            'Template schema exceeds maximum size of 100KB'
          );
        }
      }
      throw new Error(`Failed to update template: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Soft deletes a template by setting is_active to false.
   * @param id - Template ID to soft delete
   * @returns Promise containing boolean indicating success
   * @throws {Error} When deletion fails
   * @example
   * const success = await templatesRepository.delete('template-uuid');
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE form_templates
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error: any) {
      throw new Error(`Failed to delete template: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Atomically increments the usage count for a template.
   * Uses atomic SQL increment to prevent race conditions.
   * @param templateId - Template ID to increment usage count
   * @returns Promise resolving when increment completes
   * @throws {Error} When increment fails or template not found
   * @example
   * await templatesRepository.incrementUsageCount('template-uuid');
   */
  async incrementUsageCount(templateId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE form_templates
        SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      const result = await client.query(query, [templateId]);

      if (result.rowCount === null || result.rowCount === 0) {
        throw new Error('Template not found');
      }
    } catch (error: any) {
      throw new Error(`Failed to increment usage count: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const templatesRepository = new TemplatesRepository();
