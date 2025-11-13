import * as jwt from 'jsonwebtoken';
import { customAlphabet } from 'nanoid';
import {
  FormMetadata,
  FormSchema,
  FormField,
  FormStatus,
  FormBackgroundSettings,
  TokenStatusResponse,
  PublishFormResponse,
  IframeEmbedOptions,
  CategoryMetrics,
  TemplateWizardConfig,
  detectTemplateCategory,
} from '@nodeangularfullstack/shared';
import { SharedAuthService } from '@nodeangularfullstack/shared/dist/services/shared-auth.service';
import { formsRepository } from '../repositories/forms.repository';
import { formSchemasRepository } from '../repositories/form-schemas.repository';
import { themesRepository } from '../repositories/themes.repository';
import { formQrCodeService } from './form-qr-code.service';
import { shortLinksRepository } from '../repositories/short-links.repository';
import { authPool } from '../config/multi-database.config';

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
 * Custom alphabet for short codes excluding confusing characters.
 * Excludes: 0, O, o, 1, l, I to prevent confusion.
 */
const SHORT_CODE_ALPHABET =
  '23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';

/**
 * Custom nanoid generator for form short codes.
 */
const generateShortCode = customAlphabet(SHORT_CODE_ALPHABET, 7);

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
 * Uses SharedAuthService for cross-database user/tenant validation.
 */
export class FormsService {
  private readonly sharedAuthService: SharedAuthService;

  constructor(
    private readonly formsRepo = formsRepository,
    private readonly formSchemasRepo = formSchemasRepository,
    private readonly themesRepo = themesRepository
  ) {
    this.sharedAuthService = new SharedAuthService(authPool);
  }

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

      // Validate user exists and is active (cross-database validation)
      const isValidUser = await this.sharedAuthService.validateUser(userId);
      if (!isValidUser) {
        throw new ApiError(
          'Invalid or inactive user',
          403,
          'INVALID_USER'
        );
      }

      // Validate tenant if provided (cross-database validation)
      if (tenantId) {
        const tenant = await this.sharedAuthService.getTenant(tenantId);
        if (!tenant || !tenant.isActive) {
          throw new ApiError(
            'Invalid or inactive tenant',
            403,
            'INVALID_TENANT'
          );
        }
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
   * Publishes a form with generated render token and optional iframe embed configuration.
   * @param formId - Form ID to publish
   * @param userId - User ID requesting publish (must be owner)
   * @param expirationDate - Optional expiration date for token (null for permanent)
   * @param iframeEmbedOptions - Optional iframe embed configuration
   * @returns Promise containing form, schema, and render URL
   * @throws {ApiError} 400 - When validation fails
   * @throws {ApiError} 404 - When form or schema not found
   * @throws {ApiError} 403 - When user is not the owner
   * @throws {ApiError} 500 - When publish fails
   * @example
   * const result = await formsService.publishForm('form-uuid', 'user-uuid', new Date('2025-12-31'));
   * @example
   * const result = await formsService.publishForm('form-uuid', 'user-uuid', null);
   * @example
   * const result = await formsService.publishForm('form-uuid', 'user-uuid', null, { width: '600px', height: '800px' });
   */
  async publishForm(
    formId: string,
    userId: string,
    expirationDate: Date | null,
    iframeEmbedOptions?: IframeEmbedOptions
  ): Promise<PublishFormResponse> {
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

      // Use provided expiration date or null for no expiration
      const expiresAt = expirationDate;

      // Generate render token
      const renderToken = this.generateRenderToken(latestSchema.id, expiresAt);

      // Publish the schema
      let publishedSchema = await this.formSchemasRepo.publishSchema(
        latestSchema.id,
        renderToken,
        expiresAt
      );

      // Save iframe embed options if provided
      if (iframeEmbedOptions) {
        publishedSchema = await this.formSchemasRepo.updateSchemaIframeOptions(
          latestSchema.id,
          iframeEmbedOptions
        );
      }

      // Update form status to published
      const updatedForm = await this.formsRepo.update(formId, {
        status: FormStatus.PUBLISHED,
      });

      // Generate full render URL (use frontend URL for public forms)
      // Public forms are rendered by the Angular frontend, not the API backend
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      const renderUrl = `${baseUrl}/forms/render/${renderToken}`;

      // Generate or reuse short link for easy sharing
      let shortCode = '';
      let shortUrl = renderUrl; // Fallback to JWT token URL
      const maxAttempts = 10;
      let attempts = 0;

      try {
        // Check if a short link already exists for this form schema
        const existingShortLink = await shortLinksRepository.findByFormSchemaId(
          latestSchema.id
        );

        if (existingShortLink) {
          // Reuse existing short link code
          shortCode = existingShortLink.code;
          shortUrl = `${baseUrl}/public/form/${shortCode}`;
          console.log(
            `♻️ Reusing existing short link for form ${formId}: ${shortUrl}`
          );
        } else {
          // Generate unique short code for new form
          while (attempts < maxAttempts) {
            shortCode = generateShortCode();
            const exists = await shortLinksRepository.codeExists(shortCode);
            if (!exists) {
              break;
            }
            attempts++;
          }

          if (attempts >= maxAttempts) {
            throw new Error(
              'Unable to generate unique short code after maximum attempts'
            );
          }

          // Create new short link in database
          await shortLinksRepository.create({
            code: shortCode,
            originalUrl: renderUrl,
            expiresAt,
            createdBy: userId,
            formSchemaId: latestSchema.id,
          });

          // Generate short URL
          shortUrl = `${baseUrl}/public/form/${shortCode}`;
          console.log(`✅ Short link created for form ${formId}: ${shortUrl}`);
        }
      } catch (shortLinkError) {
        // Short link generation failure should not prevent successful publishing
        console.error(
          `⚠️ Short link generation failed for form ${formId}:`,
          shortLinkError
        );
        // Fallback: Use renderUrl as shortUrl and empty shortCode
        shortUrl = renderUrl;
        shortCode = '';
      }

      // Story 26.3: Generate QR code asynchronously (non-blocking)
      // Use short URL for QR code generation (preferred over JWT token URL)
      let qrCodeUrl: string | undefined;
      let qrCodeGenerated = false;

      try {
        // Generate and store QR code using short URL
        qrCodeUrl = await formQrCodeService.generateAndStoreQRCode(
          formId,
          shortUrl
        );

        // Update form with QR code URL
        const formWithQRCode = await this.formsRepo.updateQRCodeUrl(
          formId,
          qrCodeUrl
        );
        if (formWithQRCode) {
          updatedForm.qrCodeUrl = qrCodeUrl;
        }

        qrCodeGenerated = true;
        console.log(`✅ QR code generated for form ${formId}: ${qrCodeUrl}`);
      } catch (qrError) {
        // QR code generation failure should not prevent successful publishing
        console.error(
          `⚠️ QR code generation failed for form ${formId}:`,
          qrError
        );
        qrCodeGenerated = false;
      }

      return {
        form: updatedForm,
        formSchema: publishedSchema,
        renderUrl,
        shortUrl,
        shortCode,
        qrCodeUrl,
        qrCodeGenerated,
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
    if (!stepFormConfig?.steps) {
      errors.push('Step form configuration is missing or invalid');
      return;
    }

    const steps = stepFormConfig.steps;

    // Validate minimum step count (at least 2 steps required)
    if (steps.length < 2) {
      errors.push(
        `Step form must have at least 2 steps. Found: ${steps.length} step(s)`
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
   * Checks for existing valid tokens for a form.
   * @param formId - Form ID to check tokens for
   * @param userId - User ID requesting the check (must be owner)
   * @returns Promise containing token status information
   * @throws {ApiError} 404 - When form not found
   * @throws {ApiError} 403 - When user is not the owner
   * @throws {ApiError} 500 - When check fails
   * @example
   * const tokenStatus = await formsService.checkExistingTokens('form-uuid', 'user-uuid');
   */
  async checkExistingTokens(
    formId: string,
    userId: string
  ): Promise<TokenStatusResponse> {
    try {
      // Find the form and verify ownership
      const form = await this.formsRepo.findFormById(formId);
      if (!form) {
        throw new ApiError('Form not found', 404, 'FORM_NOT_FOUND');
      }

      // Verify ownership
      if (form.userId !== userId) {
        throw new ApiError(
          'You do not have permission to check tokens for this form',
          403,
          'FORBIDDEN'
        );
      }

      // Get form schemas for this form
      const schemas = await this.formSchemasRepo.findByFormId(formId);
      if (schemas.length === 0) {
        // No schemas exist, no valid tokens
        return {
          hasValidToken: false,
          tokenExpiration: null,
          tokenCreatedAt: new Date(),
          formUrl: '',
        };
      }

      // Find the most recent published schema with valid token
      const now = new Date();
      const validSchema = schemas.find((schema) => {
        return (
          schema.isPublished &&
          schema.renderToken &&
          (schema.expiresAt === null ||
            schema.expiresAt === undefined ||
            schema.expiresAt > now)
        );
      });

      if (!validSchema) {
        // No valid tokens found
        return {
          hasValidToken: false,
          tokenExpiration: null,
          tokenCreatedAt: new Date(),
          formUrl: '',
        };
      }

      // Return valid token information
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      const formUrl = `${baseUrl}/forms/render/${validSchema.renderToken}`;

      return {
        hasValidToken: true,
        tokenExpiration: validSchema.expiresAt || null,
        tokenCreatedAt: validSchema.createdAt,
        formUrl,
      };
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Failed to check existing tokens: ${error.message}`,
        500,
        'CHECK_TOKENS_ERROR'
      );
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
   * @param expiresAt - Token expiration date (null for permanent token)
   * @returns JWT token string
   * @throws {ApiError} 500 - When token generation fails or secret not configured
   * @example
   * const token = formsService.generateRenderToken('schema-uuid', new Date('2025-12-31'));
   * @example
   * const token = formsService.generateRenderToken('schema-uuid', null);
   */
  generateRenderToken(formSchemaId: string, expiresAt: Date | null): string {
    try {
      const secret = process.env.FORM_RENDER_TOKEN_SECRET;

      if (!secret) {
        throw new ApiError(
          'FORM_RENDER_TOKEN_SECRET is not configured',
          500,
          'CONFIG_ERROR'
        );
      }

      const payload: any = {
        formSchemaId,
        iss: 'form-builder',
        iat: Math.floor(Date.now() / 1000),
      };

      // Add expiration to payload and JWT options only if date is provided
      const jwtOptions: any = {};
      if (expiresAt) {
        payload.expiresAt = expiresAt.toISOString();
        jwtOptions.expiresIn = Math.floor(
          (expiresAt.getTime() - Date.now()) / 1000
        );
      }

      const token = jwt.sign(payload, secret, jwtOptions);

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

      // Story 26.3: Clean up QR code when unpublishing
      if (form.qrCodeUrl) {
        try {
          await formQrCodeService.deleteQRCode(form.qrCodeUrl);
          console.log(`✅ QR code deleted for unpublished form ${formId}`);
        } catch (qrError) {
          // Log but don't fail unpublishing if QR code deletion fails
          console.error(
            `⚠️ Failed to delete QR code for form ${formId}:`,
            qrError
          );
        }
      }

      // Update form status to draft and clear QR code URL
      const updatedForm = await this.formsRepo.update(formId, {
        status: FormStatus.DRAFT,
        qrCodeUrl: undefined,
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

  /**
   * Helper method to detect template category from form schema
   * Uses Epic 30 shared utilities for category detection
   * @param schema - Form schema to analyze
   * @returns Detected template category or null
   * @since Epic 30, Story 30.1
   */
  detectFormCategory(schema: FormSchema) {
    return detectTemplateCategory(schema);
  }

  /**
   * Type guard to validate category metrics structure
   * Ensures CategoryMetrics type compilation
   * @param metrics - Metrics object to validate
   * @returns True if metrics has valid category discriminator
   * @since Epic 30, Story 30.1
   */
  isValidCategoryMetrics(metrics: any): metrics is CategoryMetrics {
    return (
      metrics &&
      typeof metrics.category === 'string' &&
      typeof metrics.totalSubmissions === 'number'
    );
  }

  /**
   * Type guard to validate wizard configuration
   * Ensures TemplateWizardConfig type compilation
   * @param config - Configuration object to validate
   * @returns True if config has valid category discriminator
   * @since Epic 30, Story 30.1
   */
  isValidWizardConfig(config: any): config is TemplateWizardConfig {
    return (
      config &&
      typeof config.category === 'string' &&
      Array.isArray(config.steps) &&
      Array.isArray(config.allowedFields)
    );
  }
}

// Export singleton instance
export const formsService = new FormsService();
