import {
  FormTemplate,
  FormSchema,
  TemplateCategory,
  TemplateBusinessLogicConfig,
  InventoryConfig,
  QuizConfig,
  CreateFormTemplateRequest,
  UpdateFormTemplateRequest,
} from '@nodeangularfullstack/shared';
import { templatesRepository } from '../repositories/templates.repository';
import { ApiError } from './forms.service';

/**
 * Template service for business logic operations.
 * Handles template CRUD operations, schema validation, business logic config validation,
 * and template application to new forms.
 *
 * @example
 * ```typescript
 * // Create a new template
 * const template = await templatesService.createTemplate({
 *   name: 'Product Order Form',
 *   category: TemplateCategory.ECOMMERCE,
 *   templateSchema: { fields: [...], settings: {...} },
 *   businessLogicConfig: { type: 'inventory', ... }
 * });
 *
 * // Apply template to create a new form
 * const formSchema = await templatesService.applyTemplateToForm(template.id);
 * ```
 */
export class TemplatesService {
  /** Maximum size for template schema JSONB in bytes (100KB) */
  private readonly MAX_SCHEMA_SIZE = 102400; // 100KB in bytes

  constructor(private readonly templatesRepo = templatesRepository) {}

  /**
   * Creates a new form template with validation.
   * Validates schema size (100KB limit) and business logic configuration.
   *
   * @param templateData - Template data to create
   * @returns Promise containing the created template
   * @throws {ApiError} 400 - When validation fails (VALIDATION_ERROR)
   * @throws {ApiError} 400 - When schema exceeds size limit (SIZE_LIMIT_EXCEEDED)
   * @throws {ApiError} 400 - When business logic config is invalid (INVALID_CONFIG)
   * @throws {ApiError} 500 - When creation fails (CREATE_TEMPLATE_ERROR)
   *
   * @example
   * ```typescript
   * const template = await templatesService.createTemplate({
   *   name: 'Customer Survey',
   *   description: 'Standard customer feedback survey',
   *   category: TemplateCategory.DATA_COLLECTION,
   *   templateSchema: {
   *     fields: [{ id: '1', label: 'Name', fieldName: 'name', type: 'text' }],
   *     settings: { layout: { columns: 1 }, submission: {...} }
   *   }
   * });
   * ```
   */
  async createTemplate(
    templateData: CreateFormTemplateRequest
  ): Promise<FormTemplate> {
    try {
      // Validate required fields
      if (!templateData.name || templateData.name.trim().length === 0) {
        throw new ApiError(
          'Template name is required',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (!templateData.category) {
        throw new ApiError(
          'Template category is required',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (!templateData.templateSchema) {
        throw new ApiError(
          'Template schema is required',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Validate schema size (100KB limit)
      const schemaSize = JSON.stringify(templateData.templateSchema).length;
      if (schemaSize > this.MAX_SCHEMA_SIZE) {
        throw new ApiError(
          `Template schema exceeds 100KB limit. Current size: ${Math.round(schemaSize / 1024)}KB`,
          400,
          'SIZE_LIMIT_EXCEEDED'
        );
      }

      // Validate business logic config matches category (if provided)
      if (templateData.businessLogicConfig) {
        this.validateBusinessLogicConfig(
          templateData.category,
          templateData.businessLogicConfig
        );
      }

      // Validate template schema structure
      this.validateTemplateSchema(templateData.templateSchema);

      // Create template via repository
      return await this.templatesRepo.create(templateData);
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to create template: ${error.message}`,
        500,
        'CREATE_TEMPLATE_ERROR'
      );
    }
  }

  /**
   * Retrieves all templates with optional filtering and sorting.
   * Returns templates sorted by usage_count DESC by default (most popular first).
   *
   * @param filters - Optional filters (category, isActive)
   * @returns Promise containing array of templates
   * @throws {ApiError} 500 - When retrieval fails (GET_TEMPLATES_ERROR)
   *
   * @example
   * ```typescript
   * // Get all active templates
   * const templates = await templatesService.getTemplates({ isActive: true });
   *
   * // Get ecommerce templates only
   * const ecommerceTemplates = await templatesService.getTemplates({
   *   category: TemplateCategory.ECOMMERCE
   * });
   *
   * // Get all templates (no filtering)
   * const allTemplates = await templatesService.getTemplates();
   * ```
   */
  async getTemplates(filters?: {
    category?: TemplateCategory;
    isActive?: boolean;
  }): Promise<FormTemplate[]> {
    try {
      // Convert string category to proper type if needed
      const normalizedFilters = filters
        ? {
            category: filters.category,
            isActive: filters.isActive,
          }
        : undefined;

      return await this.templatesRepo.findAll(normalizedFilters);
    } catch (error: any) {
      throw new ApiError(
        `Failed to retrieve templates: ${error.message}`,
        500,
        'GET_TEMPLATES_ERROR'
      );
    }
  }

  /**
   * Retrieves templates with pagination support.
   * Uses database-level LIMIT/OFFSET for efficient data transfer.
   *
   * @param filters - Optional filters (isActive, category)
   * @param pagination - Pagination parameters (page, limit)
   * @returns Promise containing templates array and total count
   * @throws {ApiError} 500 - When retrieval fails (GET_TEMPLATES_ERROR)
   *
   * @example
   * ```typescript
   * // Get first page of active templates (20 per page)
   * const result = await templatesService.getTemplatesWithPagination(
   *   { isActive: true },
   *   { page: 1, limit: 20 }
   * );
   * console.log(result.templates); // Array of 20 templates
   * console.log(result.total);     // Total count of matching templates
   * ```
   */
  async getTemplatesWithPagination(
    filters?: {
      category?: TemplateCategory;
      isActive?: boolean;
    },
    pagination?: { page: number; limit: number }
  ): Promise<{ templates: FormTemplate[]; total: number }> {
    try {
      // Convert string category to proper type if needed
      const normalizedFilters = filters
        ? {
            category: filters.category,
            isActive: filters.isActive,
          }
        : undefined;

      // Calculate offset from page and limit
      const offset = pagination
        ? (pagination.page - 1) * pagination.limit
        : 0;
      const limit = pagination?.limit || 20;

      // Fetch paginated templates from repository
      const templates = await this.templatesRepo.findAll(normalizedFilters, {
        limit,
        offset,
      });

      // Fetch total count (without pagination)
      const allTemplates = await this.templatesRepo.findAll(normalizedFilters);
      const total = allTemplates.length;

      return { templates, total };
    } catch (error: any) {
      throw new ApiError(
        `Failed to retrieve templates: ${error.message}`,
        500,
        'GET_TEMPLATES_ERROR'
      );
    }
  }

  /**
   * Retrieves a single template by ID.
   *
   * @param templateId - Template ID to retrieve
   * @returns Promise containing the template or null if not found
   * @throws {ApiError} 404 - When template not found (NOT_FOUND)
   * @throws {ApiError} 500 - When retrieval fails (GET_TEMPLATE_ERROR)
   *
   * @example
   * ```typescript
   * const template = await templatesService.getTemplateById('template-uuid');
   * if (template) {
   *   console.log('Template found:', template.name);
   * }
   * ```
   */
  async getTemplateById(templateId: string): Promise<FormTemplate | null> {
    try {
      const template = await this.templatesRepo.findById(templateId);

      if (!template) {
        throw new ApiError('Template not found', 404, 'NOT_FOUND');
      }

      return template;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to retrieve template: ${error.message}`,
        500,
        'GET_TEMPLATE_ERROR'
      );
    }
  }

  /**
   * Updates an existing template with validation.
   * Validates schema size and business logic configuration for updates.
   *
   * @param templateId - Template ID to update
   * @param updateData - Partial template data to update
   * @returns Promise containing the updated template
   * @throws {ApiError} 400 - When validation fails (VALIDATION_ERROR)
   * @throws {ApiError} 400 - When schema exceeds size limit (SIZE_LIMIT_EXCEEDED)
   * @throws {ApiError} 404 - When template not found (NOT_FOUND)
   * @throws {ApiError} 500 - When update fails (UPDATE_TEMPLATE_ERROR)
   *
   * @example
   * ```typescript
   * const updated = await templatesService.updateTemplate('template-uuid', {
   *   name: 'Updated Template Name',
   *   description: 'New description'
   * });
   * ```
   */
  async updateTemplate(
    templateId: string,
    updateData: UpdateFormTemplateRequest
  ): Promise<FormTemplate> {
    try {
      // Validate schema size if templateSchema is being updated
      if (updateData.templateSchema) {
        const schemaSize = JSON.stringify(updateData.templateSchema).length;
        if (schemaSize > this.MAX_SCHEMA_SIZE) {
          throw new ApiError(
            `Template schema exceeds 100KB limit. Current size: ${Math.round(schemaSize / 1024)}KB`,
            400,
            'SIZE_LIMIT_EXCEEDED'
          );
        }

        // Validate template schema structure
        this.validateTemplateSchema(updateData.templateSchema);
      }

      // Validate business logic config matches category (if both are provided or updating config)
      if (updateData.businessLogicConfig) {
        // If category is being updated, use new category; otherwise fetch existing template
        let category = updateData.category;

        if (!category) {
          const existingTemplate = await this.templatesRepo.findById(
            templateId
          );
          if (!existingTemplate) {
            throw new ApiError('Template not found', 404, 'NOT_FOUND');
          }
          category = existingTemplate.category;
        }

        this.validateBusinessLogicConfig(
          category,
          updateData.businessLogicConfig
        );
      }

      // Update template via repository
      return await this.templatesRepo.update(templateId, updateData);
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to update template: ${error.message}`,
        500,
        'UPDATE_TEMPLATE_ERROR'
      );
    }
  }

  /**
   * Soft deletes a template by setting isActive to false.
   *
   * @param templateId - Template ID to delete
   * @returns Promise containing boolean indicating success
   * @throws {ApiError} 404 - When template not found (NOT_FOUND)
   * @throws {ApiError} 500 - When deletion fails (DELETE_TEMPLATE_ERROR)
   *
   * @example
   * ```typescript
   * const success = await templatesService.deleteTemplate('template-uuid');
   * console.log('Template deleted:', success);
   * ```
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const success = await this.templatesRepo.delete(templateId);

      if (!success) {
        throw new ApiError('Template not found', 404, 'NOT_FOUND');
      }

      return success;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to delete template: ${error.message}`,
        500,
        'DELETE_TEMPLATE_ERROR'
      );
    }
  }

  /**
   * Applies a template to create a new form schema.
   * Deep-clones the template schema to avoid mutation and increments usage count atomically.
   *
   * @param templateId - Template ID to apply
   * @returns Promise containing the generated FormSchema ready for form creation
   * @throws {ApiError} 404 - When template not found (NOT_FOUND)
   * @throws {ApiError} 400 - When template is inactive (TEMPLATE_INACTIVE)
   * @throws {ApiError} 500 - When application fails (APPLY_TEMPLATE_ERROR)
   *
   * @example
   * ```typescript
   * const formSchema = await templatesService.applyTemplateToForm('template-uuid');
   * // Use formSchema to create a new form
   * const form = await formsService.createForm(userId, tenantId, {
   *   title: 'My New Form',
   *   schema: formSchema
   * });
   * ```
   */
  async applyTemplateToForm(templateId: string): Promise<FormSchema> {
    try {
      // Fetch template
      const template = await this.templatesRepo.findById(templateId);

      if (!template) {
        throw new ApiError('Template not found', 404, 'NOT_FOUND');
      }

      // Check if template is active
      if (!template.isActive) {
        throw new ApiError(
          'Template is not active and cannot be used',
          400,
          'TEMPLATE_INACTIVE'
        );
      }

      // Deep clone template schema to avoid mutation
      const formSchema: FormSchema = JSON.parse(
        JSON.stringify(template.templateSchema)
      );

      // Merge businessLogicConfig from template into schema settings
      // Story 29.13: Quiz Field Configuration
      console.log('[DEBUG] Template business_logic_config:', template.businessLogicConfig);
      console.log('[DEBUG] formSchema.settings BEFORE merge:', formSchema.settings);

      if (template.businessLogicConfig) {
        console.log('[DEBUG] Merging businessLogicConfig into formSchema.settings');
        formSchema.settings = {
          ...formSchema.settings,
          businessLogicConfig: template.businessLogicConfig,
        };
        console.log('[DEBUG] formSchema.settings AFTER merge:', formSchema.settings);

        // Migrate quiz scoring rules to field metadata (if quiz template)
        // Quiz templates store correctAnswer in businessLogicConfig.scoringRules,
        // but field quiz settings modal expects field.metadata.correctAnswer
        if (template.businessLogicConfig.type === 'quiz') {
          const scoringRules = (template.businessLogicConfig as QuizConfig).scoringRules || [];
          console.log('[DEBUG] Migrating quiz scoring rules to field metadata:', scoringRules);

          // For each scoring rule, find the field and add quiz metadata
          formSchema.fields = formSchema.fields.map((field: any) => {
            const scoringRule = scoringRules.find((rule: any) => rule.fieldId === field.id);

            if (scoringRule) {
              console.log(`[DEBUG] Adding quiz metadata to field ${field.id}:`, scoringRule);
              return {
                ...field,
                metadata: {
                  ...(field.metadata || {}),
                  correctAnswer: scoringRule.correctAnswer,
                  points: scoringRule.points || 1,
                  excludeFromQuiz: false,
                },
              };
            }

            return field;
          });
        }
      } else {
        console.log('[DEBUG] No businessLogicConfig found in template');
      }

      // Increment usage count atomically
      await this.templatesRepo.incrementUsageCount(templateId);

      return formSchema;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to apply template: ${error.message}`,
        500,
        'APPLY_TEMPLATE_ERROR'
      );
    }
  }

  /**
   * Validates that business logic configuration matches the template category.
   * Ensures config type is appropriate for the category.
   *
   * @param category - Template category
   * @param config - Business logic configuration to validate
   * @throws {ApiError} 400 - When config doesn't match category (INVALID_CONFIG)
   *
   * @example
   * ```typescript
   * // Valid: inventory config for ecommerce category
   * templatesService.validateBusinessLogicConfig(
   *   TemplateCategory.ECOMMERCE,
   *   { type: 'inventory', ... }
   * ); // No error
   *
   * // Invalid: quiz config for ecommerce category
   * templatesService.validateBusinessLogicConfig(
   *   TemplateCategory.ECOMMERCE,
   *   { type: 'quiz', ... }
   * ); // Throws ApiError
   * ```
   */
  private validateBusinessLogicConfig(
    category: TemplateCategory,
    config: TemplateBusinessLogicConfig
  ): void {
    // Map categories to allowed config types
    const categoryConfigMap: Record<
      TemplateCategory,
      TemplateBusinessLogicConfig['type'][]
    > = {
      [TemplateCategory.ECOMMERCE]: ['inventory', 'order'],
      [TemplateCategory.SERVICES]: ['appointment'],
      [TemplateCategory.QUIZ]: ['quiz'],
      [TemplateCategory.POLLS]: ['poll'],
      [TemplateCategory.EVENTS]: ['appointment'],
      [TemplateCategory.DATA_COLLECTION]: ['order'], // Generic order calculations
    };

    const allowedTypes = categoryConfigMap[category];

    if (!allowedTypes || !allowedTypes.includes(config.type)) {
      throw new ApiError(
        `Invalid business logic config type "${config.type}" for category "${category}". ` +
          `Allowed types: ${allowedTypes ? allowedTypes.join(', ') : 'none'}`,
        400,
        'INVALID_CONFIG'
      );
    }

    // Validate required fields for specific config types
    switch (config.type) {
      case 'inventory':
        this.validateInventoryConfig(config);
        break;
      case 'quiz':
        this.validateQuizConfig(config);
        break;
      case 'appointment':
        this.validateAppointmentConfig(config);
        break;
      case 'poll':
        this.validatePollConfig(config);
        break;
      case 'order':
        this.validateOrderConfig(config);
        break;
    }
  }

  /**
   * Validates inventory configuration has required fields.
   * @private
   */
  private validateInventoryConfig(config: InventoryConfig): void {
    if (!config.stockField || !config.variantField || !config.quantityField) {
      throw new ApiError(
        'Inventory config must have stockField, variantField, and quantityField',
        400,
        'INVALID_CONFIG'
      );
    }

    if (!config.stockTable) {
      throw new ApiError(
        'Inventory config must have stockTable',
        400,
        'INVALID_CONFIG'
      );
    }

    if (config.decrementOnSubmit === undefined) {
      throw new ApiError(
        'Inventory config must specify decrementOnSubmit',
        400,
        'INVALID_CONFIG'
      );
    }
  }

  /**
   * Validates quiz configuration has required fields.
   * @private
   */
  private validateQuizConfig(config: QuizConfig): void {
    if (!config.scoringRules || Object.keys(config.scoringRules).length === 0) {
      throw new ApiError(
        'Quiz config must have scoringRules with at least one question',
        400,
        'INVALID_CONFIG'
      );
    }

    if (
      config.passingScore !== undefined &&
      (config.passingScore < 0 || config.passingScore > 100)
    ) {
      throw new ApiError(
        'Quiz config passingScore must be between 0 and 100',
        400,
        'INVALID_CONFIG'
      );
    }
  }

  /**
   * Validates appointment configuration has required fields.
   * @private
   */
  private validateAppointmentConfig(config: any): void {
    if (!config.timeSlotField || !config.dateField) {
      throw new ApiError(
        'Appointment config must have timeSlotField and dateField',
        400,
        'INVALID_CONFIG'
      );
    }

    if (!config.bookingsTable) {
      throw new ApiError(
        'Appointment config must have bookingsTable',
        400,
        'INVALID_CONFIG'
      );
    }

    if (
      config.maxBookingsPerSlot === undefined ||
      config.maxBookingsPerSlot < 1
    ) {
      throw new ApiError(
        'Appointment config must have maxBookingsPerSlot >= 1',
        400,
        'INVALID_CONFIG'
      );
    }
  }

  /**
   * Validates poll configuration has required fields.
   * @private
   */
  private validatePollConfig(config: any): void {
    if (!config.voteField) {
      throw new ApiError(
        'Poll config must have voteField',
        400,
        'INVALID_CONFIG'
      );
    }

    if (config.preventDuplicates === undefined) {
      throw new ApiError(
        'Poll config must specify preventDuplicates',
        400,
        'INVALID_CONFIG'
      );
    }

    if (config.showResultsAfterVote === undefined) {
      throw new ApiError(
        'Poll config must specify showResultsAfterVote',
        400,
        'INVALID_CONFIG'
      );
    }

    const validTrackingMethods = ['session', 'user', 'ip'];
    if (!validTrackingMethods.includes(config.trackingMethod)) {
      throw new ApiError(
        `Poll config trackingMethod must be one of: ${validTrackingMethods.join(', ')}`,
        400,
        'INVALID_CONFIG'
      );
    }
  }

  /**
   * Validates order configuration has required fields.
   * @private
   */
  private validateOrderConfig(config: any): void {
    if (!config.itemFields || config.itemFields.length === 0) {
      throw new ApiError(
        'Order config must have at least one itemField',
        400,
        'INVALID_CONFIG'
      );
    }

    if (config.calculateTotal === undefined) {
      throw new ApiError(
        'Order config must specify calculateTotal',
        400,
        'INVALID_CONFIG'
      );
    }

    if (config.taxRate !== undefined && (config.taxRate < 0 || config.taxRate > 1)) {
      throw new ApiError(
        'Order config taxRate must be between 0 and 1 (e.g., 0.08 for 8%)',
        400,
        'INVALID_CONFIG'
      );
    }
  }

  /**
   * Validates template schema structure.
   * Ensures schema has required properties for FormSchema interface.
   *
   * @param schema - Template schema to validate
   * @throws {ApiError} 400 - When schema is invalid (VALIDATION_ERROR)
   * @private
   */
  private validateTemplateSchema(schema: FormSchema): void {
    if (!schema.fields || !Array.isArray(schema.fields)) {
      throw new ApiError(
        'Template schema must have fields array',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (schema.fields.length === 0) {
      throw new ApiError(
        'Template schema must have at least one field',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!schema.settings) {
      throw new ApiError(
        'Template schema must have settings',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!schema.settings.layout) {
      throw new ApiError(
        'Template schema settings must have layout configuration',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!schema.settings.submission) {
      throw new ApiError(
        'Template schema settings must have submission configuration',
        400,
        'VALIDATION_ERROR'
      );
    }

    // Validate each field has required properties
    schema.fields.forEach((field, index) => {
      if (!field.label || !field.fieldName) {
        throw new ApiError(
          `Field at index ${index} must have label and fieldName`,
          400,
          'VALIDATION_ERROR'
        );
      }
    });

    // Validate no duplicate field IDs
    const fieldIds = new Set<string>();
    schema.fields.forEach((field, index) => {
      if (field.id) {
        if (fieldIds.has(field.id)) {
          throw new ApiError(
            `Duplicate field ID "${field.id}" found at index ${index}`,
            400,
            'VALIDATION_ERROR'
          );
        }
        fieldIds.add(field.id);
      }
    });

    // Validate no duplicate fieldNames
    const fieldNames = new Set<string>();
    schema.fields.forEach((field, index) => {
      if (fieldNames.has(field.fieldName)) {
        throw new ApiError(
          `Duplicate fieldName "${field.fieldName}" found at index ${index}`,
          400,
          'VALIDATION_ERROR'
        );
      }
      fieldNames.add(field.fieldName);
    });
  }
}

// Export singleton instance
export const templatesService = new TemplatesService();
