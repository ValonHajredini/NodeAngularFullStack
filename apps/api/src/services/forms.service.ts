import * as jwt from 'jsonwebtoken';
import {
  FormMetadata,
  FormSchema,
  FormField,
  FormStatus,
} from '@nodeangularfullstack/shared';
import { formsRepository } from '../repositories/forms.repository';
import { formSchemasRepository } from '../repositories/form-schemas.repository';

/**
 * API Error class for form-related errors.
 */
export class ApiError extends Error {
  public statusCode: number;
  public code: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'API_ERROR'
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Schema validation result interface.
 */
export interface SchemaValidationResult {
  /** Whether the schema is valid */
  valid: boolean;
  /** Array of validation error messages */
  errors: string[];
}

/**
 * Form service for business logic operations.
 * Handles form creation, publishing, schema validation, and token generation.
 */
export class FormsService {
  constructor(
    private readonly formsRepo = formsRepository,
    private readonly formSchemasRepo = formSchemasRepository
  ) {}

  /**
   * Creates a new form.
   * @param userId - User ID creating the form
   * @param tenantId - Optional tenant ID for multi-tenant mode
   * @param formData - Form metadata
   * @returns Promise containing the created form
   * @throws {ApiError} 400 - When validation fails
   * @throws {ApiError} 500 - When creation fails
   * @example
   * const form = await formsService.createForm(
   *   'user-uuid',
   *   'tenant-uuid',
   *   { title: 'Contact Form', description: 'Customer feedback', status: FormStatus.DRAFT }
   * );
   */
  async createForm(
    userId: string,
    tenantId: string | undefined,
    formData: Partial<FormMetadata>
  ): Promise<FormMetadata> {
    try {
      // Validate required fields
      if (!formData.title) {
        throw new ApiError('Form title is required', 400, 'VALIDATION_ERROR');
      }

      // Prepare form data with user and tenant context
      const formToCreate: Partial<FormMetadata> = {
        userId,
        tenantId,
        title: formData.title,
        description: formData.description,
        status: formData.status || FormStatus.DRAFT,
      };

      // Create form using repository
      const tenantContext = tenantId ? { id: tenantId, slug: '' } : undefined;
      const form = await this.formsRepo.create(formToCreate, tenantContext);

      return form;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to create form: ${error.message}`,
        500,
        'CREATE_FORM_ERROR'
      );
    }
  }

  /**
   * Publishes a form with generated render token.
   * @param formId - Form ID to publish
   * @param userId - User ID requesting publish (must be owner)
   * @param expiresInDays - Number of days until token expires
   * @returns Promise containing form, schema, and render URL
   * @throws {ApiError} 400 - When validation fails
   * @throws {ApiError} 404 - When form or schema not found
   * @throws {ApiError} 403 - When user is not the owner
   * @throws {ApiError} 500 - When publish fails
   * @example
   * const result = await formsService.publishForm('form-uuid', 'user-uuid', 30);
   */
  async publishForm(
    formId: string,
    userId: string,
    expiresInDays: number
  ): Promise<{
    form: FormMetadata;
    schema: FormSchema;
    renderUrl: string;
  }> {
    try {
      // Find the form
      const form = await this.formsRepo.findFormById(formId);
      if (!form) {
        throw new ApiError('Form not found', 404, 'FORM_NOT_FOUND');
      }

      // Verify ownership
      if (form.userId !== userId) {
        throw new ApiError(
          'You do not have permission to publish this form',
          403,
          'FORBIDDEN'
        );
      }

      // Get latest schema for this form
      const schemas = await this.formSchemasRepo.findByFormId(formId);
      if (schemas.length === 0) {
        throw new ApiError(
          'Form has no schema versions',
          400,
          'NO_SCHEMA_ERROR'
        );
      }

      const latestSchema = schemas[0]; // Schemas are ordered by version DESC

      // Validate the schema
      const validation = await this.validateFormSchema(latestSchema);
      if (!validation.valid) {
        throw new ApiError(
          `Schema validation failed: ${validation.errors.join(', ')}`,
          400,
          'SCHEMA_VALIDATION_ERROR'
        );
      }

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Generate render token
      const renderToken = this.generateRenderToken(latestSchema.id, expiresAt);

      // Publish the schema
      const publishedSchema = await this.formSchemasRepo.publishSchema(
        latestSchema.id,
        renderToken,
        expiresAt
      );

      // Update form status to published
      const updatedForm = await this.formsRepo.update(formId, {
        status: FormStatus.PUBLISHED,
      });

      // Generate render URL (base URL would come from config in production)
      const renderUrl = `/forms/render/${renderToken}`;

      return {
        form: updatedForm,
        schema: publishedSchema,
        renderUrl,
      };
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to publish form: ${error.message}`,
        500,
        'PUBLISH_FORM_ERROR'
      );
    }
  }

  /**
   * Validates a form schema.
   * @param schema - Form schema to validate
   * @returns Promise containing validation result with errors array
   * @example
   * const result = await formsService.validateFormSchema(schema);
   * if (!result.valid) {
   *   console.log('Validation errors:', result.errors);
   * }
   */
  async validateFormSchema(
    schema: FormSchema
  ): Promise<SchemaValidationResult> {
    const errors: string[] = [];

    // Validate that schema has fields
    if (!schema.fields || schema.fields.length === 0) {
      errors.push('Schema must have at least one field');
    }

    if (schema.fields && schema.fields.length > 0) {
      // Check for duplicate field names
      const fieldNames = new Set<string>();
      const duplicates = new Set<string>();

      schema.fields.forEach((field: FormField) => {
        // Validate required field properties
        if (!field.label) {
          errors.push(`Field ${field.id} is missing a label`);
        }
        if (!field.fieldName) {
          errors.push(`Field ${field.id} is missing a fieldName`);
        }

        // Check for duplicates
        if (field.fieldName) {
          if (fieldNames.has(field.fieldName)) {
            duplicates.add(field.fieldName);
          } else {
            fieldNames.add(field.fieldName);
          }
        }

        // Validate regex patterns
        if (field.validation?.pattern) {
          try {
            new RegExp(field.validation.pattern);
          } catch (regexError) {
            errors.push(
              `Field ${field.fieldName} has invalid regex pattern: ${field.validation.pattern}`
            );
          }
        }
      });

      // Report duplicate field names
      if (duplicates.size > 0) {
        duplicates.forEach((name) => {
          errors.push(`Duplicate field name found: ${name}`);
        });
      }
    }

    // Validate settings
    if (!schema.settings) {
      errors.push('Schema must have settings defined');
    } else {
      if (!schema.settings.layout) {
        errors.push('Schema settings must include layout configuration');
      }
      if (!schema.settings.submission) {
        errors.push('Schema settings must include submission configuration');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generates a JWT render token for public form access.
   * @param formSchemaId - Form schema ID to embed in token
   * @param expiresAt - Token expiration date
   * @returns JWT token string
   * @throws {ApiError} 500 - When token generation fails or secret not configured
   * @example
   * const token = formsService.generateRenderToken('schema-uuid', new Date('2025-12-31'));
   */
  generateRenderToken(formSchemaId: string, expiresAt: Date): string {
    try {
      const secret = process.env.FORM_RENDER_TOKEN_SECRET;

      if (!secret) {
        throw new ApiError(
          'FORM_RENDER_TOKEN_SECRET is not configured',
          500,
          'CONFIG_ERROR'
        );
      }

      const payload = {
        formSchemaId,
        expiresAt: expiresAt.toISOString(),
        iss: 'form-builder',
        iat: Math.floor(Date.now() / 1000),
      };

      const token = jwt.sign(payload, secret, {
        expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      });

      return token;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to generate render token: ${error.message}`,
        500,
        'TOKEN_GENERATION_ERROR'
      );
    }
  }

  /**
   * Unpublishes a form and invalidates the render token.
   * @param formId - Form ID to unpublish
   * @param userId - User ID requesting unpublish (must be owner)
   * @returns Promise containing updated form
   * @throws {ApiError} 404 - When form or schema not found
   * @throws {ApiError} 403 - When user is not the owner
   * @throws {ApiError} 500 - When unpublish fails
   * @example
   * const form = await formsService.unpublishForm('form-uuid', 'user-uuid');
   */
  async unpublishForm(formId: string, userId: string): Promise<FormMetadata> {
    try {
      // Find the form
      const form = await this.formsRepo.findFormById(formId);
      if (!form) {
        throw new ApiError('Form not found', 404, 'FORM_NOT_FOUND');
      }

      // Verify ownership
      if (form.userId !== userId) {
        throw new ApiError(
          'You do not have permission to unpublish this form',
          403,
          'FORBIDDEN'
        );
      }

      // Get published schema for this form
      const schemas = await this.formSchemasRepo.findByFormId(formId);
      const publishedSchema = schemas.find((s) => s.isPublished);

      if (publishedSchema) {
        // Unpublish the schema
        await this.formSchemasRepo.unpublishSchema(publishedSchema.id);
      }

      // Update form status to draft
      const updatedForm = await this.formsRepo.update(formId, {
        status: FormStatus.DRAFT,
      });

      return updatedForm;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to unpublish form: ${error.message}`,
        500,
        'UNPUBLISH_FORM_ERROR'
      );
    }
  }
}

// Export singleton instance
export const formsService = new FormsService();
