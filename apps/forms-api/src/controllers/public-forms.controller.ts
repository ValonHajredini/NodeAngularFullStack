import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { formSchemasRepository } from '../repositories/form-schemas.repository';
import { formSubmissionsRepository } from '../repositories/form-submissions.repository';
import { shortLinksRepository } from '../repositories/short-links.repository';
import { templatesRepository } from '../repositories/templates.repository';
import { appointmentBookingRepository } from '../repositories/appointment-booking.repository';
import { ApiError } from '../services/forms.service';
import { AsyncHandler } from '../utils/async-handler.utils';
import { AppConfig } from '../config/app.config';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';
import { TemplateExecutorRegistry } from '../services/template-executor-registry.service';

/**
 * JWT payload structure for form render tokens
 */
interface FormRenderTokenPayload {
  /** Form schema ID */
  formSchemaId: string;
  /** Token expiration timestamp (Unix timestamp in seconds) */
  exp: number;
  /** Token issued at timestamp (Unix timestamp in seconds) */
  iat: number;
}

/**
 * Public forms controller handling public form rendering operations.
 * Manages form schema retrieval for public access via JWT tokens (no authentication required).
 */
export class PublicFormsController {
  /**
   * Retrieves form schema for public rendering using JWT token.
   * @route GET /api/public/forms/render/:token
   * @param req - Express request object with token parameter
   * @param res - Express response object
   * @returns HTTP response with form schema and settings
   * @throws {ApiError} 404 - Invalid token or form not found
   * @throws {ApiError} 410 - Token has expired
   * @example
   * GET /api/public/forms/render/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   */
  renderForm = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { token } = req.params;

      if (!token) {
        throw new ApiError('Invalid form link', 404, 'INVALID_TOKEN');
      }

      // Get secret from config
      const secret = AppConfig.getFormRenderTokenSecret();
      if (!secret) {
        throw new ApiError(
          'Form rendering is not configured',
          500,
          'CONFIGURATION_ERROR'
        );
      }

      let payload: FormRenderTokenPayload;

      try {
        // Verify and decode JWT token
        const decoded = jwt.verify(token, secret) as FormRenderTokenPayload;
        payload = decoded;
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          throw new ApiError('This form has expired', 410, 'TOKEN_EXPIRED');
        }
        throw new ApiError('Invalid form link', 404, 'INVALID_TOKEN');
      }

      // Extract formSchemaId from payload
      const { formSchemaId } = payload;

      if (!formSchemaId) {
        throw new ApiError('Invalid form link', 404, 'INVALID_TOKEN');
      }

      // Retrieve form schema from repository
      const formSchema = await formSchemasRepository.findById(formSchemaId);

      if (!formSchema) {
        throw new ApiError('Form not found', 404, 'FORM_NOT_FOUND');
      }

      // Verify form is published
      if (!formSchema.isPublished) {
        throw new ApiError('Form not found', 404, 'FORM_NOT_PUBLISHED');
      }

      // Check if token has expired (additional check using expiresAt from DB)
      if (formSchema.expiresAt && new Date(formSchema.expiresAt) < new Date()) {
        throw new ApiError('This form has expired', 410, 'TOKEN_EXPIRED');
      }

      // Return schema and settings with embedded theme
      res.status(200).json({
        success: true,
        message: 'Form schema retrieved successfully',
        data: {
          schema: formSchema,
          settings: formSchema.settings,
          theme: formSchema.theme || null,
        },
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * Submits form data for a published form using JWT token.
   * @route POST /api/public/forms/submit/:token
   * @param req - Express request object with token parameter and submission data
   * @param res - Express response object
   * @returns HTTP response with submission confirmation
   * @throws {ApiError} 400 - Validation errors or rate limit exceeded
   * @throws {ApiError} 404 - Invalid token or form not found
   * @throws {ApiError} 410 - Token has expired
   * @throws {ApiError} 429 - Rate limit exceeded
   * @example
   * POST /api/public/forms/submit/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   * Body: { values: { name: 'John', email: 'john@example.com' } }
   */
  submitForm = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { token } = req.params;
      const { values } = req.body;

      if (!token) {
        throw new ApiError('Invalid form link', 404, 'INVALID_TOKEN');
      }

      if (!values || typeof values !== 'object') {
        throw new ApiError(
          'Invalid submission data',
          400,
          'INVALID_SUBMISSION'
        );
      }

      // Get secret from config
      const secret = AppConfig.getFormRenderTokenSecret();
      if (!secret) {
        throw new ApiError(
          'Form rendering is not configured',
          500,
          'CONFIGURATION_ERROR'
        );
      }

      let payload: FormRenderTokenPayload;

      try {
        // Verify and decode JWT token
        const decoded = jwt.verify(token, secret) as FormRenderTokenPayload;
        payload = decoded;
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          throw new ApiError('This form has expired', 410, 'TOKEN_EXPIRED');
        }
        throw new ApiError('Invalid form link', 404, 'INVALID_TOKEN');
      }

      // Extract formSchemaId from payload
      const { formSchemaId } = payload;

      if (!formSchemaId) {
        throw new ApiError('Invalid form link', 404, 'INVALID_TOKEN');
      }

      // Retrieve form schema from repository
      const formSchema = await formSchemasRepository.findById(formSchemaId);

      if (!formSchema) {
        throw new ApiError('Form not found', 404, 'FORM_NOT_FOUND');
      }

      // Verify form is published
      if (!formSchema.isPublished) {
        throw new ApiError('Form not found', 404, 'FORM_NOT_PUBLISHED');
      }

      // Check if token has expired
      if (formSchema.expiresAt && new Date(formSchema.expiresAt) < new Date()) {
        throw new ApiError('This form has expired', 410, 'TOKEN_EXPIRED');
      }

      // Get submitter IP
      const submitterIp = (req.ip ||
        req.headers['x-forwarded-for'] ||
        'unknown') as string;

      // Rate limiting: Configurable submissions per hour per IP (unauthenticated)
      // Default: 100 (production), can be set to 1000 for development via RATE_LIMIT_MAX_REQUESTS env var
      const rateLimit = AppConfig.get().rateLimit.maxRequests;
      const submissionCount = await formSubmissionsRepository.countByIpSince(
        submitterIp,
        1
      );

      if (submissionCount >= rateLimit) {
        throw new ApiError(
          'Rate limit exceeded. Please try again later.',
          429,
          'RATE_LIMIT_EXCEEDED'
        );
      }

      // Get fields from form schema
      const fields: FormField[] = formSchema.fields || [];

      // Server-side validation
      const validationErrors: Record<string, string> = {};
      const sanitizedValues: Record<string, unknown> = {};

      for (const field of fields) {
        const value = values[field.fieldName];

        // Skip divider fields (non-input fields)
        if (field.type === FormFieldType.DIVIDER) {
          continue;
        }

        // Required field validation
        if (
          field.required &&
          (value === undefined || value === null || value === '')
        ) {
          validationErrors[field.fieldName] = `${field.label} is required`;
          continue;
        }

        // Skip validation for empty optional fields
        if (
          !field.required &&
          (value === undefined || value === null || value === '')
        ) {
          continue;
        }

        // Type-specific validation
        switch (field.type) {
          case FormFieldType.EMAIL:
            if (typeof value === 'string' && !validator.isEmail(value)) {
              validationErrors[field.fieldName] =
                `${field.label} must be a valid email address`;
            } else {
              sanitizedValues[field.fieldName] =
                validator.normalizeEmail(value as string) || value;
            }
            break;

          case FormFieldType.NUMBER:
            const numValue = Number(value);
            if (isNaN(numValue)) {
              validationErrors[field.fieldName] =
                `${field.label} must be a number`;
            } else {
              // Min/Max validation
              if (
                field.validation?.min !== undefined &&
                numValue < field.validation.min
              ) {
                validationErrors[field.fieldName] =
                  `${field.label} must be at least ${field.validation.min}`;
              }
              if (
                field.validation?.max !== undefined &&
                numValue > field.validation.max
              ) {
                validationErrors[field.fieldName] =
                  `${field.label} must be at most ${field.validation.max}`;
              }
              sanitizedValues[field.fieldName] = numValue;
            }
            break;

          case FormFieldType.TEXT:
          case FormFieldType.TEXTAREA:
            if (typeof value === 'string') {
              // Length validation
              if (
                field.validation?.minLength &&
                value.length < field.validation.minLength
              ) {
                validationErrors[field.fieldName] =
                  `${field.label} must be at least ${field.validation.minLength} characters`;
              }
              if (
                field.validation?.maxLength &&
                value.length > field.validation.maxLength
              ) {
                validationErrors[field.fieldName] =
                  `${field.label} must be at most ${field.validation.maxLength} characters`;
              }

              // Pattern validation
              if (field.validation?.pattern) {
                const regex = new RegExp(field.validation.pattern);
                if (!regex.test(value)) {
                  validationErrors[field.fieldName] =
                    field.validation.errorMessage ||
                    `${field.label} format is invalid`;
                }
              }

              // XSS sanitization
              sanitizedValues[field.fieldName] = validator.escape(value);
            } else {
              validationErrors[field.fieldName] =
                `${field.label} must be a string`;
            }
            break;

          case FormFieldType.CHECKBOX:
            // Checkbox with options: validate and store as comma-separated string
            if (field.options && field.options.length > 0) {
              if (typeof value === 'string' && value.trim() !== '') {
                // Split comma-separated string and validate each option
                const selectedValues = value.split(',').map((v) => v.trim());
                const validValues = field.options.map((opt) =>
                  String(opt.value)
                );

                for (const selectedValue of selectedValues) {
                  if (!validValues.includes(selectedValue)) {
                    validationErrors[field.fieldName] =
                      `${field.label} contains invalid selection: ${selectedValue}`;
                    break;
                  }
                }

                if (!validationErrors[field.fieldName]) {
                  sanitizedValues[field.fieldName] = value; // Store comma-separated string
                }
              } else if (
                value === '' ||
                value === undefined ||
                value === null
              ) {
                // Empty selection for optional checkbox
                sanitizedValues[field.fieldName] = '';
              } else {
                validationErrors[field.fieldName] =
                  `${field.label} must be a comma-separated string`;
              }
            } else {
              // Single checkbox (toggle-style): store as boolean
              sanitizedValues[field.fieldName] = Boolean(value);
            }
            break;

          case FormFieldType.TOGGLE:
            sanitizedValues[field.fieldName] = Boolean(value);
            break;

          case FormFieldType.SELECT:
          case FormFieldType.RADIO:
            // Validate against allowed options
            if (field.options && Array.isArray(field.options)) {
              const validValues = field.options.map((opt) => String(opt.value));
              if (!validValues.includes(String(value))) {
                validationErrors[field.fieldName] =
                  `${field.label} contains an invalid selection`;
              } else {
                sanitizedValues[field.fieldName] = value;
              }
            } else {
              sanitizedValues[field.fieldName] = value;
            }
            break;

          case FormFieldType.DATE:
          case FormFieldType.DATETIME:
            if (typeof value === 'string' && !validator.isISO8601(value)) {
              validationErrors[field.fieldName] =
                `${field.label} must be a valid date`;
            } else {
              sanitizedValues[field.fieldName] = value;
            }
            break;

          default:
            sanitizedValues[field.fieldName] = value;
        }
      }

      // Check for extra fields not in schema
      for (const key in values) {
        const fieldExists = fields.some((f) => f.fieldName === key);
        if (!fieldExists) {
          validationErrors[key] = 'Field not found in form schema';
        }
      }

      // If validation errors, return 400
      if (Object.keys(validationErrors).length > 0) {
        const error = new ApiError(
          'Validation failed',
          400,
          'VALIDATION_ERROR'
        );
        (error as any).errors = validationErrors;
        throw error;
      }

      // Template business logic integration (Epic 29.11: Inventory Tracking)
      // Check if form has a template with business logic configuration
      let template = null;
      const templateId = formSchema.settings?.templateId;

      if (templateId) {
        try {
          template = await templatesRepository.findById(templateId);

          if (template && template.businessLogicConfig) {
            // Validate business logic before creating submission
            // Get session ID for poll voting (Story 29.14)
            const sessionId = (req.session as any)?.id;

            const validation = await TemplateExecutorRegistry.validateBeforeSubmission(
              { values: sanitizedValues },
              template,
              sessionId
            );

            if (!validation.valid) {
              const error = new ApiError(
                validation.errors[0] || 'Business logic validation failed',
                400,
                'BUSINESS_LOGIC_VALIDATION_ERROR'
              );
              (error as any).errors = validation.errors;
              throw error;
            }
          }
        } catch (error: any) {
          // Re-throw validation errors
          if (error instanceof ApiError) {
            throw error;
          }
          // Log other errors but don't block submission
          console.error('Template validation error:', error);
        }
      }

      // Create submission
      const submission = await formSubmissionsRepository.create({
        formSchemaId,
        values: sanitizedValues,
        submitterIp,
        userId: (req as any).user?.id, // Optional: if authenticated
        metadata: {
          userAgent: req.headers['user-agent'],
          referer: req.headers['referer'],
        },
      });

      // Execute template business logic after submission (if applicable)
      let executorResult = null;
      if (template && template.businessLogicConfig) {
        try {
          // Get session ID for poll voting (Story 29.14)
          const sessionId = (req.session as any)?.id;

          executorResult = await TemplateExecutorRegistry.executeAfterSubmission(
            submission,
            template,
            undefined, // client (no transaction context needed for public forms)
            sessionId
          );
        } catch (error: any) {
          // Business logic execution failed - delete submission (compensating transaction)
          try {
            await formSubmissionsRepository.delete(submission.id);
          } catch (deleteError) {
            console.error('Failed to delete submission after executor error:', deleteError);
          }

          throw new ApiError(
            `Submission failed: ${error.message}`,
            500,
            'BUSINESS_LOGIC_EXECUTION_ERROR'
          );
        }
      }

      // Return success response
      res.status(201).json({
        success: true,
        message: 'Form submitted successfully',
        data: {
          submissionId: submission.id,
          redirectUrl: formSchema.settings?.submission?.redirectUrl,
          successMessage:
            formSchema.settings?.submission?.successMessage ||
            'Thank you for your submission!',
          // Include executor result if available (e.g., remaining stock)
          executorResult: executorResult?.data,
        },
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * Retrieves form schema for public rendering using short code.
   * @route GET /api/public/forms/:shortCode
   * @param req - Express request object with shortCode parameter
   * @param res - Express response object
   * @returns HTTP response with form schema, settings, and theme
   * @throws {ApiError} 404 - Short code not found or form not published
   * @throws {ApiError} 410 - Form has expired
   * @example
   * GET /api/public/forms/abc123
   */
  getPublicFormByShortCode = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { shortCode } = req.params;

      if (!shortCode) {
        throw new ApiError('Invalid short code', 404, 'INVALID_SHORT_CODE');
      }

      // Query short_links table and join with form_schemas and form_themes
      const formData =
        await shortLinksRepository.findFormSchemaByCode(shortCode);

      if (!formData) {
        throw new ApiError('Form not found', 404, 'FORM_NOT_FOUND');
      }

      // Check if form has expired
      if (
        formData.schema.expiresAt &&
        new Date(formData.schema.expiresAt) < new Date()
      ) {
        throw new ApiError('This form has expired', 410, 'FORM_EXPIRED');
      }

      // Handle deleted theme gracefully (AC: 5)
      if (formData.settings?.themeId && !formData.theme) {
        console.warn(
          `Theme ${formData.settings.themeId} not found for form ${formData.schema.id}, using default styles`
        );
      }

      // Return form with embedded theme (AC: 1, 2, 4)
      res.status(200).json({
        success: true,
        message: 'Form schema retrieved successfully',
        form: {
          id: formData.schema.id,
          schema: formData.schema,
          settings: formData.settings,
          theme: formData.theme || null, // null if no theme or theme deleted
          shortCode: formData.shortCode,
          renderToken: formData.renderToken, // Include render token for form submission
        },
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * Retrieves available appointment slots for a form using short code.
   * @route GET /api/public/forms/:shortCode/available-slots
   * @param req - Express request object with shortCode parameter and query params
   * @param res - Express response object
   * @returns HTTP response with available slots array
   * @throws {ApiError} 400 - Missing or invalid query parameters
   * @throws {ApiError} 404 - Short code not found, form not published, or no appointment config
   * @throws {ApiError} 410 - Form has expired
   * @example
   * GET /api/public/forms/abc123/available-slots?startDate=2025-12-15&endDate=2025-12-22
   */
  getAvailableSlots = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { shortCode } = req.params;
      const { startDate, endDate } = req.query;

      // Validate short code
      if (!shortCode) {
        throw new ApiError('Invalid short code', 404, 'INVALID_SHORT_CODE');
      }

      // Validate query parameters
      if (!startDate || !endDate) {
        throw new ApiError(
          'Missing required query parameters: startDate and endDate',
          400,
          'MISSING_PARAMETERS'
        );
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (
        typeof startDate !== 'string' ||
        !dateRegex.test(startDate) ||
        typeof endDate !== 'string' ||
        !dateRegex.test(endDate)
      ) {
        throw new ApiError(
          'Invalid date format. Expected YYYY-MM-DD (ISO 8601)',
          400,
          'INVALID_DATE_FORMAT'
        );
      }

      // Validate date range (endDate must be after or equal to startDate)
      if (new Date(endDate) < new Date(startDate)) {
        throw new ApiError(
          'Invalid date range: endDate must be after or equal to startDate',
          400,
          'INVALID_DATE_RANGE'
        );
      }

      // Query form data by short code
      const formData =
        await shortLinksRepository.findFormSchemaByCode(shortCode);

      if (!formData) {
        throw new ApiError('Form not found', 404, 'FORM_NOT_FOUND');
      }

      // Check if form has expired
      if (
        formData.schema.expiresAt &&
        new Date(formData.schema.expiresAt) < new Date()
      ) {
        throw new ApiError('This form has expired', 410, 'FORM_EXPIRED');
      }

      // Get template ID from form settings
      const templateId = formData.settings?.templateId;

      if (!templateId) {
        throw new ApiError(
          'Form is not configured with an appointment template',
          404,
          'NO_APPOINTMENT_CONFIG'
        );
      }

      // Retrieve template with business logic configuration
      const template = await templatesRepository.findById(templateId);

      if (!template || !template.businessLogicConfig) {
        throw new ApiError(
          'Form template not found or has no business logic configuration',
          404,
          'TEMPLATE_NOT_FOUND'
        );
      }

      // Verify template has appointment business logic
      if (template.businessLogicConfig.type !== 'appointment') {
        throw new ApiError(
          'Form is not configured for appointment booking',
          404,
          'NOT_APPOINTMENT_FORM'
        );
      }

      // Extract AppointmentConfig
      const appointmentConfig = template.businessLogicConfig as any; // Type will be narrowed

      // Query available slots from repository
      const slots = await appointmentBookingRepository.getAvailableSlots(
        formData.schema.id,
        startDate,
        endDate,
        appointmentConfig.maxBookingsPerSlot
      );

      // Return available slots
      res.status(200).json({
        success: true,
        message: 'Available slots retrieved successfully',
        data: {
          slots,
          dateRange: {
            startDate,
            endDate,
          },
          maxBookingsPerSlot: appointmentConfig.maxBookingsPerSlot,
        },
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * GET /api/public/forms/:shortCode/poll-results
   * Retrieves aggregated poll results for a form with poll template.
   *
   * @since Epic 29, Story 29.14
   * @source docs/architecture/backend-architecture.md (Poll Voting)
   */
  getPollResults = AsyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { shortCode } = req.params;

      if (!shortCode || typeof shortCode !== 'string') {
        throw new ApiError('Invalid short code', 400, 'INVALID_SHORT_CODE');
      }

      // Query form data by short code
      const formData =
        await shortLinksRepository.findFormSchemaByCode(shortCode);

      if (!formData) {
        throw new ApiError('Form not found', 404, 'FORM_NOT_FOUND');
      }

      // Check if form has expired
      if (
        formData.schema.expiresAt &&
        new Date(formData.schema.expiresAt) < new Date()
      ) {
        throw new ApiError('This form has expired', 410, 'FORM_EXPIRED');
      }

      // Get template ID from form settings
      const templateId = formData.settings?.templateId;

      if (!templateId) {
        throw new ApiError(
          'Form is not configured with a poll template',
          404,
          'NO_POLL_CONFIG'
        );
      }

      // Retrieve template with business logic configuration
      const template = await templatesRepository.findById(templateId);

      if (!template || !template.businessLogicConfig) {
        throw new ApiError(
          'Form template not found or has no business logic configuration',
          404,
          'TEMPLATE_NOT_FOUND'
        );
      }

      // Verify template has poll business logic
      if (template.businessLogicConfig.type !== 'poll') {
        throw new ApiError(
          'Form is not configured for poll voting',
          404,
          'NOT_POLL_FORM'
        );
      }

      // Extract PollLogicConfig
      const pollConfig = template.businessLogicConfig as any;

      // Query aggregated poll votes from repository
      const voteData = await formSubmissionsRepository.aggregatePollVotes(
        formData.schema.id,
        pollConfig.voteField
      );

      const totalVotes = voteData.reduce((sum, v) => sum + v.count, 0);

      const results = {
        total_votes: totalVotes,
        vote_counts: voteData.reduce(
          (acc, v) => {
            acc[v.vote_value] = v.count;
            return acc;
          },
          {} as Record<string, number>
        ),
        vote_percentages: voteData.reduce(
          (acc, v) => {
            acc[v.vote_value] =
              totalVotes > 0 ? Math.round((v.count / totalVotes) * 100) : 0;
            return acc;
          },
          {} as Record<string, number>
        ),
      };

      // Return poll results
      res.status(200).json({
        success: true,
        message: 'Poll results retrieved successfully',
        data: results,
        timestamp: new Date().toISOString(),
      });
    }
  );
}
