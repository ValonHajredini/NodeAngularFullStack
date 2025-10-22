import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import { formSchemasRepository } from '../repositories/form-schemas.repository';
import { formSubmissionsRepository } from '../repositories/form-submissions.repository';
import { shortLinksRepository } from '../repositories/short-links.repository';
import { ApiError } from '../services/forms.service';
import { AsyncHandler } from '../utils/async-handler.utils';
import { AppConfig } from '../config/app.config';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';

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

      // Rate limiting: 10 submissions per hour per IP (unauthenticated)
      const submissionCount = await formSubmissionsRepository.countByIpSince(
        submitterIp,
        1
      );

      if (submissionCount >= 10) {
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
}
