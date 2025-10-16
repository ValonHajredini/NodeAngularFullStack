import { Response } from 'express';
import { validationResult } from 'express-validator';
import { Parser } from 'json2csv';
import { formsService, ApiError } from '../services/forms.service';
import { formsRepository } from '../repositories/forms.repository';
import { formSubmissionsRepository } from '../repositories/form-submissions.repository';
import { formSchemasRepository } from '../repositories/form-schemas.repository';
import {
  FormStatus,
  FormSubmission,
  SubmissionFilterOptions,
} from '@nodeangularfullstack/shared';
import { AuthRequest } from '../middleware/auth.middleware';
import { AsyncHandler } from '../utils/async-handler.utils';

/**
 * Forms controller handling HTTP requests for form management operations.
 * Manages CRUD operations for forms with proper authentication and authorization.
 */
export class FormsController {
  /**
   * Creates a new form.
   * @route POST /api/forms
   * @param req - Express request object with form creation data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with created form data
   * @throws {ApiError} 400 - Invalid input data
   * @throws {ApiError} 401 - Authentication required
   * @example
   * POST /api/forms
   * Authorization: Bearer <token>
   * {
   *   "title": "Contact Form",
   *   "description": "Customer feedback form",
   *   "status": "draft",
   *   "themeId": "uuid-here"
   * }
   */
  createForm = AsyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError('Invalid input data', 400, 'VALIDATION_ERROR');
      }

      // Extract user from request (populated by auth middleware)
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;

      if (!userId) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Prepare form data
      // Extract themeId from schema.settings.themeId (new format from frontend)
      // or fallback to top-level themeId (old format for backward compatibility)
      const themeId = req.body.schema?.settings?.themeId || req.body.themeId;

      const formData = {
        title: req.body.title,
        description: req.body.description,
        status: req.body.status || FormStatus.DRAFT,
        schema: req.body.schema
          ? {
              ...req.body.schema,
              themeId: themeId,
            }
          : undefined,
      };

      // Create form using service
      const form = await formsService.createForm(userId, tenantId, formData);

      res.status(201).json({
        success: true,
        message: 'Form created successfully',
        data: form,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * Gets paginated list of forms for the authenticated user.
   * @route GET /api/forms
   * @param req - Express request object with query parameters
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with paginated form list
   * @throws {ApiError} 401 - Authentication required
   * @example
   * GET /api/forms?page=1&limit=20
   * Authorization: Bearer <token>
   */
  getForms = AsyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const tenantId = req.user?.tenantId;

      if (!userId) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      // In non-tenant mode, users always see only their own forms
      // In tenant mode, admins can see all forms within their tenant
      const filterUserId =
        tenantId && userRole === 'admin' ? undefined : userId;

      // Get forms from repository with tenant context
      const tenantContext = tenantId ? { id: tenantId, slug: '' } : undefined;
      const forms = await formsRepository.findAll(
        filterUserId,
        tenantContext,
        page,
        limit
      );

      // Calculate total count for pagination
      const total = forms.length; // In production, this would be a separate count query
      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        message: 'Forms retrieved successfully',
        data: forms,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * Gets a form by ID with ownership validation.
   * @route GET /api/forms/:id
   * @param req - Express request object with form ID parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with form data
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Insufficient permissions
   * @throws {ApiError} 404 - Form not found
   * @example
   * GET /api/forms/form-uuid
   * Authorization: Bearer <token>
   */
  getFormById = AsyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const tenantId = req.user?.tenantId;

      if (!userId) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Get form from repository
      const form = await formsService.getFormWithSchema(id);

      if (!form) {
        throw new ApiError('Form not found', 404, 'NOT_FOUND');
      }

      // In non-tenant mode, users can only access their own forms
      // In tenant mode, admins can access all forms within their tenant
      const canAccess =
        form.userId === userId ||
        (tenantId && userRole === 'admin' && form.tenantId === tenantId);

      if (!canAccess) {
        throw new ApiError(
          'Insufficient permissions to access this form',
          403,
          'FORBIDDEN'
        );
      }

      res.status(200).json({
        success: true,
        message: 'Form retrieved successfully',
        data: form,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * Updates a form.
   * @route PUT /api/forms/:id
   * @param req - Express request object with form update data
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with updated form data
   * @throws {ApiError} 400 - Invalid input data
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Insufficient permissions
   * @throws {ApiError} 404 - Form not found
   * @example
   * PUT /api/forms/form-uuid
   * Authorization: Bearer <token>
   * {
   *   "title": "Updated Contact Form",
   *   "description": "Updated description",
   *   "themeId": "new-theme-uuid"
   * }
   */
  updateForm = AsyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError('Invalid input data', 400, 'VALIDATION_ERROR');
      }

      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Get existing form to verify ownership
      const existingForm = await formsRepository.findFormById(id);

      if (!existingForm) {
        throw new ApiError('Form not found', 404, 'NOT_FOUND');
      }

      // In non-tenant mode, users can only update their own forms
      // In tenant mode, admins can update all forms within their tenant
      const tenantId = req.user?.tenantId;
      const canUpdate =
        existingForm.userId === userId ||
        (tenantId &&
          userRole === 'admin' &&
          existingForm.tenantId === tenantId);

      if (!canUpdate) {
        throw new ApiError(
          'Insufficient permissions to update this form',
          403,
          'FORBIDDEN'
        );
      }

      // Prepare update data
      const updateData: Partial<{
        title: string;
        description: string;
        status: FormStatus;
      }> = {};
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined)
        updateData.description = req.body.description;
      if (req.body.status !== undefined) updateData.status = req.body.status;

      // Prepare schema data with themeId
      // Extract themeId from schema.settings.themeId (new format from frontend)
      // or fallback to top-level themeId (old format for backward compatibility)
      const themeId = req.body.schema?.settings?.themeId || req.body.themeId;

      const schemaData = req.body.schema
        ? {
            ...req.body.schema,
            themeId: themeId,
          }
        : undefined;

      // Update form using service
      const updatedForm = await formsService.updateForm(
        id,
        updateData,
        schemaData
      );

      res.status(200).json({
        success: true,
        message: 'Form updated successfully',
        data: updatedForm,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * Deletes a form.
   * @route DELETE /api/forms/:id
   * @param req - Express request object with form ID parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with deletion confirmation
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Insufficient permissions
   * @throws {ApiError} 404 - Form not found
   * @example
   * DELETE /api/forms/form-uuid
   * Authorization: Bearer <token>
   */
  deleteForm = AsyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Get existing form to verify ownership
      const existingForm = await formsRepository.findFormById(id);

      if (!existingForm) {
        throw new ApiError('Form not found', 404, 'NOT_FOUND');
      }

      // In non-tenant mode, users can only delete their own forms
      // In tenant mode, admins can delete all forms within their tenant
      const tenantId = req.user?.tenantId;
      const canDelete =
        existingForm.userId === userId ||
        (tenantId &&
          userRole === 'admin' &&
          existingForm.tenantId === tenantId);

      if (!canDelete) {
        throw new ApiError(
          'Insufficient permissions to delete this form',
          403,
          'FORBIDDEN'
        );
      }

      // Delete form using repository
      await formsRepository.delete(id);

      res.status(204).send();
    }
  );

  /**
   * Publishes a form and generates render token.
   * @route POST /api/forms/:id/publish
   * @param req - Express request object with form ID and expiration days
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with published form data and render URL
   * @throws {ApiError} 400 - Invalid input data or schema validation failed
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Insufficient permissions
   * @throws {ApiError} 404 - Form not found
   * @example
   * POST /api/forms/form-uuid/publish
   * Authorization: Bearer <token>
   * {
   *   "expiresInDays": 30
   * }
   */
  publishForm = AsyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Parse expiration days (default to 30)
      const expiresInDays = parseInt(req.body.expiresInDays) || 30;

      // Validate expiration days range
      if (expiresInDays < 1 || expiresInDays > 365) {
        throw new ApiError(
          'Expiration days must be between 1 and 365',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Publish form using service
      const result = await formsService.publishForm(id, userId, expiresInDays);

      res.status(200).json({
        success: true,
        message: 'Form published successfully',
        data: result,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * Unpublishes a form and invalidates the render token.
   * @route POST /api/forms/:id/unpublish
   * @param req - Express request object with form ID
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with unpublish confirmation
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Insufficient permissions
   * @throws {ApiError} 404 - Form not found
   * @example
   * POST /api/forms/form-uuid/unpublish
   * Authorization: Bearer <token>
   */
  unpublishForm = AsyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Unpublish form using service
      const updatedForm = await formsService.unpublishForm(id, userId);

      res.status(200).json({
        success: true,
        message: 'Form unpublished successfully',
        data: updatedForm,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * Gets submissions for a specific form.
   * @route GET /api/forms/:id/submissions
   * @param req - Express request object with form ID and query params
   * @param res - Express response object
   * @returns HTTP response with submissions list
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - User doesn't own this form
   * @throws {ApiError} 404 - Form not found
   * @example
   * GET /api/forms/form-uuid/submissions?page=1&limit=10
   * Authorization: Bearer <token>
   */
  getSubmissions = AsyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Verify form ownership
      const form = await formsRepository.findFormById(id);

      if (!form) {
        throw new ApiError('Form not found', 404, 'FORM_NOT_FOUND');
      }

      // In non-tenant mode, users can only view their own form submissions
      // In tenant mode, admins can view all submissions within their tenant
      const tenantId = req.user?.tenantId;
      const canViewSubmissions =
        form.userId === userId ||
        (tenantId && req.user?.role === 'admin' && form.tenantId === tenantId);

      if (!canViewSubmissions) {
        throw new ApiError(
          'You do not have permission to view these submissions',
          403,
          'FORBIDDEN'
        );
      }

      // Parse pagination params
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Get submissions
      const { submissions, total } =
        await formSubmissionsRepository.findByFormId(id, page, limit);

      // Mask IP addresses for privacy
      const maskedSubmissions = submissions.map(
        (submission: FormSubmission) => {
          const ipParts = submission.submitterIp.split('.');
          const maskedIp =
            ipParts.length >= 2
              ? `${ipParts[0]}.${ipParts[1]}._._`
              : submission.submitterIp;

          // Truncate long field values
          const truncatedValues: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(submission.values)) {
            if (typeof value === 'string' && value.length > 100) {
              truncatedValues[key] = value.substring(0, 100) + '...';
            } else {
              truncatedValues[key] = value;
            }
          }

          return {
            ...submission,
            submitterIp: maskedIp,
            values: truncatedValues,
          };
        }
      );

      res.status(200).json({
        success: true,
        message: 'Submissions retrieved successfully',
        data: maskedSubmissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * Exports form submissions as CSV with optional filtering.
   * @route GET /api/forms/:id/submissions/export
   * @query fields - Comma-separated field names to include
   * @query dateFrom - Start date filter (ISO format)
   * @query dateTo - End date filter (ISO format)
   * @query filterField - Field name to filter by
   * @query filterValue - Value to match for filter field
   * @param req - Express request object with form ID and query parameters
   * @param res - Express response object
   * @returns CSV file download
   * @throws {ApiError} 400 - Invalid field names or date format
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - User doesn't own this form
   * @throws {ApiError} 404 - Form not found or no submissions
   * @example
   * GET /api/forms/form-uuid/submissions/export
   * GET /api/forms/form-uuid/submissions/export?fields=name,email&dateFrom=2024-01-01
   * Authorization: Bearer <token>
   */
  exportSubmissions = AsyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Verify form ownership
      const form = await formsRepository.findFormById(id);

      if (!form) {
        throw new ApiError('Form not found', 404, 'FORM_NOT_FOUND');
      }

      // In non-tenant mode, users can only export their own form submissions
      // In tenant mode, admins can export all submissions within their tenant
      const tenantId = req.user?.tenantId;
      const canExportSubmissions =
        form.userId === userId ||
        (tenantId && req.user?.role === 'admin' && form.tenantId === tenantId);

      if (!canExportSubmissions) {
        throw new ApiError(
          'You do not have permission to export these submissions',
          403,
          'FORBIDDEN'
        );
      }

      // Parse filter options from query parameters
      const filterOptions: SubmissionFilterOptions = {
        fields: req.query.fields
          ? (req.query.fields as string).split(',').map((f) => f.trim())
          : undefined,
        dateFrom: req.query.dateFrom
          ? new Date(req.query.dateFrom as string)
          : undefined,
        dateTo: req.query.dateTo
          ? new Date(req.query.dateTo as string)
          : undefined,
        fieldFilters: [],
      };

      // Add field value filters
      if (req.query.filterField && req.query.filterValue) {
        filterOptions.fieldFilters?.push({
          field: req.query.filterField as string,
          value: req.query.filterValue as string,
        });
      }

      // Validate field names against form schema
      if (filterOptions.fields && filterOptions.fields.length > 0) {
        const schemas = await formSchemasRepository.findByFormId(id);
        if (schemas.length > 0) {
          const latestSchema = schemas[0]; // Schemas are sorted by version DESC
          const validFields = latestSchema.fields.map(
            (f: { fieldName: string }) => f.fieldName
          );
          const invalidFields = filterOptions.fields.filter(
            (f) => !validFields.includes(f)
          );
          if (invalidFields.length > 0) {
            throw new ApiError(
              `Invalid field names: ${invalidFields.join(', ')}`,
              400,
              'INVALID_FIELDS'
            );
          }
        }
      }

      // Validate dates
      if (filterOptions.dateFrom && isNaN(filterOptions.dateFrom.getTime())) {
        throw new ApiError('Invalid dateFrom format', 400, 'INVALID_DATE');
      }
      if (filterOptions.dateTo && isNaN(filterOptions.dateTo.getTime())) {
        throw new ApiError('Invalid dateTo format', 400, 'INVALID_DATE');
      }

      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="form-submissions-${form.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv"`
      );
      res.setHeader('Transfer-Encoding', 'chunked');

      // Write UTF-8 BOM for Excel compatibility
      res.write('\ufeff');

      // Stream submissions in batches
      await this.streamSubmissionsToCSV(id, filterOptions, res);
    }
  );

  /**
   * Streams submissions to CSV in batches to avoid memory overflow.
   * @param formId - Form ID to export
   * @param filterOptions - Filter options for submissions
   * @param res - Express response object
   * @throws {ApiError} 404 - No submissions found
   */
  private async streamSubmissionsToCSV(
    formId: string,
    filterOptions: SubmissionFilterOptions,
    res: Response
  ): Promise<void> {
    const batchSize = 1000;
    let page = 1;
    let hasMore = true;
    let isFirstBatch = true;
    let selectedFields: string[] = []; // Store field list from first batch

    while (hasMore) {
      const { submissions } = await formSubmissionsRepository.findByFormId(
        formId,
        page,
        batchSize,
        filterOptions
      );

      if (submissions.length === 0) {
        if (isFirstBatch) {
          throw new ApiError(
            'No submissions found for this form',
            404,
            'NO_SUBMISSIONS'
          );
        }
        hasMore = false;
        break;
      }

      // Determine CSV columns from first batch and store for consistency
      if (isFirstBatch) {
        selectedFields =
          filterOptions.fields || Object.keys(submissions[0].values);
        const headers = ['Submitted At', 'Submitter IP', ...selectedFields];

        // Create CSV parser
        const parser = new Parser({ fields: headers });

        // Prepare CSV data for this batch
        const csvData = submissions.map((submission: FormSubmission) => {
          const ipParts = submission.submitterIp.split('.');
          const maskedIp =
            ipParts.length >= 2
              ? `${ipParts[0]}.${ipParts[1]}._._`
              : submission.submitterIp;

          const row: any = {
            'Submitted At': new Date(submission.submittedAt).toLocaleString(
              'en-US',
              { timeZone: 'UTC' }
            ),
            'Submitter IP': maskedIp,
          };

          // Add selected field values
          selectedFields.forEach((field) => {
            row[field] = submission.values[field] ?? '';
          });

          return row;
        });

        // Write headers and first batch
        const csv = parser.parse(csvData);
        res.write(csv + '\n');
        isFirstBatch = false;
      } else {
        // For subsequent batches, use stored selectedFields for consistency
        const csvData = submissions.map((submission: FormSubmission) => {
          const ipParts = submission.submitterIp.split('.');
          const maskedIp =
            ipParts.length >= 2
              ? `${ipParts[0]}.${ipParts[1]}._._`
              : submission.submitterIp;

          const row: any = {
            'Submitted At': new Date(submission.submittedAt).toLocaleString(
              'en-US',
              { timeZone: 'UTC' }
            ),
            'Submitter IP': maskedIp,
          };

          // Use stored selectedFields to ensure consistent CSV structure
          selectedFields.forEach((field) => {
            row[field] = submission.values[field] ?? '';
          });

          return row;
        });

        const parser = new Parser({
          fields: ['Submitted At', 'Submitter IP', ...selectedFields],
        });
        const csv = parser.parse(csvData);
        // Remove header row from subsequent batches
        const rows = csv.split('\n').slice(1).join('\n');
        res.write(rows + '\n');
      }

      page++;
      if (submissions.length < batchSize) {
        hasMore = false;
      }
    }

    res.end();
  }
}

// Export singleton instance
export const formsController = new FormsController();
