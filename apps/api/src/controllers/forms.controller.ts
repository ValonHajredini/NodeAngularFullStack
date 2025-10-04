import { Response } from 'express';
import { validationResult } from 'express-validator';
import { formsService, ApiError } from '../services/forms.service';
import { formsRepository } from '../repositories/forms.repository';
import { FormStatus } from '@nodeangularfullstack/shared';
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
   *   "status": "draft"
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
      const formData = {
        title: req.body.title,
        description: req.body.description,
        status: req.body.status || FormStatus.DRAFT,
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

      // Admins can see all forms, users see only their own
      const filterUserId = userRole === 'admin' ? undefined : userId;

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

      if (!userId) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Get form from repository
      const form = await formsRepository.findFormById(id);

      if (!form) {
        throw new ApiError('Form not found', 404, 'NOT_FOUND');
      }

      // Check ownership (users can only access their own forms, admins can access all)
      if (form.userId !== userId && userRole !== 'admin') {
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
   *   "description": "Updated description"
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

      // Check ownership (users can only update their own forms, admins can update all)
      if (existingForm.userId !== userId && userRole !== 'admin') {
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

      // Update form using repository
      const updatedForm = await formsRepository.update(id, updateData);

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

      // Check ownership (users can only delete their own forms, admins can delete all)
      if (existingForm.userId !== userId && userRole !== 'admin') {
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
}

// Export singleton instance
export const formsController = new FormsController();
