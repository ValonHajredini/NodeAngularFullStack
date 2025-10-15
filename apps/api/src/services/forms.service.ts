import * as jwt from 'jsonwebtoken';
import {
  FormMetadata,
  FormSchema,
  FormField,
  FormStatus,
  FormBackgroundSettings,
} from '@nodeangularfullstack/shared';
import { formsRepository } from '../repositories/forms.repository';
import { formSchemasRepository } from '../repositories/form-schemas.repository';
import { themesRepository } from '../repositories/themes.repository';

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
    private readonly formSchemasRepo = formSchemasRepository,
    private readonly themesRepo = themesRepository
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

      // Validate theme ID if provided
      if (formData.schema?.themeId) {
        await this.validateThemeId(formData.schema.themeId);
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

      let savedSchema: FormSchema | undefined;
      if (formData.schema) {
        savedSchema = await this.createSchemaVersion(form.id, formData.schema);
      }

      return {
        ...form,
        schema: savedSchema,
      };
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

    // Step form validation (Story 19.1)
    if (this.isStepFormEnabled(schema)) {
      this.validateStepFormConfiguration(schema, errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if step form mode is enabled for a given schema.
   * @param schema - Form schema to check
   * @returns True if step form is enabled, false otherwise
   * @example
   * if (formsService.isStepFormEnabled(schema)) {
   *   console.log('This is a multi-step form');
   * }
   */
  isStepFormEnabled(schema: FormSchema): boolean {
    return schema.settings?.stepForm?.enabled === true;
  }

  /**
   * Validates step form configuration.
   * Checks step count, step properties, and field-step references.
   * @param schema - Form schema with step configuration
   * @param errors - Array to collect validation errors
   * @throws Does not throw - adds errors to the errors array
   * @example
   * const errors: string[] = [];
   * formsService.validateStepFormConfiguration(schema, errors);
   * if (errors.length > 0) {
   *   console.log('Step validation errors:', errors);
   * }
   */
  validateStepFormConfiguration(schema: FormSchema, errors: string[]): void {
    const stepFormConfig = schema.settings?.stepForm;

    // Should not reach here if stepForm is undefined (checked by isStepFormEnabled)
    if (!stepFormConfig || !stepFormConfig.steps) {
      errors.push('Step form configuration is missing or invalid');
      return;
    }

    const steps = stepFormConfig.steps;

    // Validate step count (2-10 when enabled)
    if (steps.length < 2 || steps.length > 10) {
      errors.push(
        `Step form must have between 2 and 10 steps. Found: ${steps.length} steps`
      );
    }

    // Collect step IDs for field reference validation
    const stepIds = new Set<string>();

    // Validate each step
    steps.forEach((step, index) => {
      // Validate step has required properties
      if (!step.id) {
        errors.push(`Step at index ${index} is missing required 'id' property`);
      } else {
        stepIds.add(step.id);
      }

      if (!step.title || step.title.trim().length === 0) {
        errors.push(
          `Step '${step.id || index}' is missing required 'title' property or title is empty`
        );
      }

      if (step.title && (step.title.length < 1 || step.title.length > 100)) {
        errors.push(
          `Step '${step.id || index}' title must be between 1 and 100 characters`
        );
      }

      if (step.description !== undefined && step.description.length > 500) {
        errors.push(
          `Step '${step.id || index}' description exceeds 500 characters`
        );
      }

      if (step.order === undefined || step.order < 0) {
        errors.push(
          `Step '${step.id || index}' has invalid order (must be non-negative)`
        );
      }
    });

    // Validate field position.stepId references
    if (schema.fields && schema.fields.length > 0) {
      schema.fields.forEach((field) => {
        if (field.position?.stepId) {
          if (!stepIds.has(field.position.stepId)) {
            errors.push(
              `Field '${field.fieldName || field.id}' references non-existent step ID: ${field.position.stepId}`
            );
          }
        }
      });
    }
  }

  /**
   * Validates a theme ID and ensures the theme exists and is active.
   * @param themeId - Theme ID to validate
   * @returns Promise containing validation result
   * @throws {ApiError} 400 - When theme is invalid, not found, or inactive
   * @example
   * await formsService.validateThemeId('theme-uuid');
   */
  async validateThemeId(themeId: string): Promise<void> {
    if (!themeId) {
      return; // null/undefined themeId is allowed
    }

    const theme = await this.themesRepo.findById(themeId);
    if (!theme) {
      throw new ApiError('Theme not found or inactive', 400, 'INVALID_THEME');
    }

    if (!theme.isActive) {
      throw new ApiError('Theme is not active', 400, 'INVALID_THEME');
    }
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

  /**
   * Updates an existing form and optionally persists a new schema version.
   */
  async updateForm(
    formId: string,
    updateData: Partial<FormMetadata>,
    schemaData?: Partial<FormSchema>
  ): Promise<FormMetadata> {
    try {
      // Validate theme ID if provided in schema data
      if (schemaData?.themeId !== undefined) {
        await this.validateThemeId(schemaData.themeId);
      }

      const hasMetadataChanges =
        updateData.title !== undefined ||
        updateData.description !== undefined ||
        updateData.status !== undefined;

      let updatedForm: FormMetadata | null = null;

      if (hasMetadataChanges) {
        updatedForm = await this.formsRepo.update(formId, updateData);
      } else {
        updatedForm = await this.formsRepo.findFormById(formId);
      }

      if (!updatedForm) {
        throw new ApiError('Form not found', 404, 'FORM_NOT_FOUND');
      }

      const existingSchemas = await this.formSchemasRepo.findByFormId(formId);
      let latestSchema = existingSchemas[0];

      if (schemaData) {
        latestSchema = await this.createSchemaVersion(
          formId,
          schemaData,
          latestSchema
        );
      }

      return {
        ...updatedForm,
        schema: latestSchema,
      };
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to update form: ${error.message}`,
        500,
        'UPDATE_FORM_ERROR'
      );
    }
  }

  /**
   * Retrieves a form with the latest schema attached and embedded theme data.
   */
  async getFormWithSchema(id: string): Promise<FormMetadata | null> {
    const form = await this.formsRepo.findFormById(id);
    if (!form) {
      return null;
    }

    const schemas = await this.formSchemasRepo.findByFormId(id);
    const latestSchema = schemas[0];

    // If schema has themeId, fetch the schema with embedded theme
    if (latestSchema?.themeId) {
      const schemaWithTheme = await this.formSchemasRepo.findById(
        latestSchema.id
      );
      return {
        ...form,
        schema: schemaWithTheme || undefined,
      };
    }

    return {
      ...form,
      schema: latestSchema,
    };
  }

  private async createSchemaVersion(
    formId: string,
    schemaData: Partial<FormSchema>,
    currentSchema?: FormSchema
  ): Promise<FormSchema> {
    const nextVersion = schemaData.version
      ? schemaData.version
      : currentSchema
        ? currentSchema.version + 1
        : 1;

    const normalizedSettings = this.normalizeSchemaSettings(
      schemaData.settings ?? currentSchema?.settings
    );

    const fields = schemaData.fields ?? currentSchema?.fields ?? [];
    const themeId = schemaData.themeId ?? currentSchema?.themeId;

    return this.formSchemasRepo.createSchema(formId, {
      formId,
      version: nextVersion,
      fields,
      settings: normalizedSettings,
      isPublished: false,
      renderToken: undefined,
      expiresAt: undefined,
      themeId,
    });
  }

  private normalizeSchemaSettings(
    settings?: FormSchema['settings']
  ): FormSchema['settings'] {
    const defaultSubmission = {
      showSuccessMessage: true,
      successMessage: 'Thank you for your submission!',
      redirectUrl: undefined,
      allowMultipleSubmissions: true,
      sendEmailNotification: false,
      notificationEmails: undefined,
    } as FormSchema['settings']['submission'];

    const defaultLayout = {
      columns: 1,
      spacing: 'medium',
    } as FormSchema['settings']['layout'];

    const result: FormSchema['settings'] = {
      layout: {
        ...defaultLayout,
        ...(settings?.layout ?? {}),
      },
      submission: {
        ...defaultSubmission,
        ...(settings?.submission ?? {}),
      },
    };

    const normalizedBackground = this.normalizeBackgroundSettings(
      settings?.background
    );
    if (normalizedBackground) {
      result.background = normalizedBackground;
    }

    // Preserve row layout configuration if present
    if (settings?.rowLayout) {
      result.rowLayout = settings.rowLayout;
    }

    // Preserve step form configuration if present (Story 19.1)
    if (settings?.stepForm) {
      result.stepForm = settings.stepForm;
    }

    return result;
  }

  private normalizeBackgroundSettings(
    background?: FormBackgroundSettings
  ): FormBackgroundSettings | undefined {
    if (!background) {
      return undefined;
    }

    const type: FormBackgroundSettings['type'] = background.type ?? 'none';

    if (type === 'none') {
      return {
        type: 'none',
        imageUrl: '',
        imagePosition: 'cover',
        imageOpacity: 100,
        imageAlignment: 'center',
        imageBlur: 0,
        customHtml: '',
        customCss: '',
      };
    }

    const clamp = (value: number, min: number, max: number) =>
      Math.min(max, Math.max(min, value));

    const normalized: FormBackgroundSettings = {
      type,
      imageUrl: background.imageUrl?.trim() ?? '',
      imagePosition: background.imagePosition ?? 'cover',
      imageOpacity:
        background.imageOpacity !== undefined
          ? clamp(background.imageOpacity, 0, 100)
          : 100,
      imageAlignment: background.imageAlignment ?? 'center',
      imageBlur:
        background.imageBlur !== undefined
          ? clamp(background.imageBlur, 0, 100)
          : 0,
      customHtml: background.customHtml ?? '',
      customCss: background.customCss ?? '',
    };

    if (normalized.type !== 'image') {
      normalized.imageUrl = '';
      normalized.imageBlur = 0;
      normalized.imageOpacity = 100;
      normalized.imagePosition = 'cover';
      normalized.imageAlignment = 'center';
    }

    if (normalized.type !== 'custom') {
      normalized.customHtml = '';
      normalized.customCss = '';
    }

    return normalized;
  }
}

// Export singleton instance
export const formsService = new FormsService();
