import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { templatesService } from '../services/templates.service';
import { AsyncHandler } from '../utils/async-handler.utils';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Templates controller handling HTTP requests for template management operations.
 * Manages CRUD operations for form templates with proper authentication and authorization.
 */
export class TemplatesController {
  /**
   * @swagger
   * /api/templates:
   *   get:
   *     summary: List all active templates
   *     description: Retrieves paginated list of active form templates. Public endpoint, no authentication required.
   *     tags:
   *       - Templates
   *     parameters:
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *           enum: [ecommerce, services, quiz, polls, events, data_collection]
   *         description: Filter templates by category
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of items per page
   *     responses:
   *       200:
   *         description: Successfully retrieved templates
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/FormTemplate'
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     total:
   *                       type: integer
   *                     page:
   *                       type: integer
   *                     limit:
   *                       type: integer
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  getTemplates = AsyncHandler(
    async (
      req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const { category, page = 1, limit = 20 } = req.query;

      // Parse pagination parameters
      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 20;

      // Fetch templates with database-level pagination
      const { templates, total } =
        await templatesService.getTemplatesWithPagination(
          {
            category: category as any,
            isActive: true,
          },
          { page: pageNum, limit: limitNum }
        );

      res.status(200).json({
        success: true,
        data: templates,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
        },
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * @swagger
   * /api/templates/{id}:
   *   get:
   *     summary: Get template by ID
   *     description: Retrieves a single template by its UUID. Public endpoint, no authentication required. Returns 404 if template not found or not active.
   *     tags:
   *       - Templates
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Template UUID
   *     responses:
   *       200:
   *         description: Successfully retrieved template
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/FormTemplate'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       404:
   *         description: Template not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 error:
   *                   type: string
   *                   example: Template not found
   */
  getTemplateById = AsyncHandler(
    async (
      req: Request,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;

      const template = await templatesService.getTemplateById(id);

      // Check if template exists and is active
      if (!template || !template.isActive) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: template,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * @swagger
   * /api/templates:
   *   post:
   *     summary: Create new template
   *     description: Creates a new form template. Requires JWT authentication with admin role.
   *     tags:
   *       - Templates
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - category
   *               - templateSchema
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 255
   *                 example: Product Order Form
   *               description:
   *                 type: string
   *                 maxLength: 1000
   *                 example: Template for product order forms with inventory tracking
   *               category:
   *                 type: string
   *                 enum: [ecommerce, services, quiz, polls, events, data_collection]
   *                 example: ecommerce
   *               templateSchema:
   *                 type: object
   *                 description: Complete FormSchema object
   *               businessLogicConfig:
   *                 type: object
   *                 description: Optional business logic configuration
   *               previewImageUrl:
   *                 type: string
   *                 format: uri
   *                 example: https://example.com/preview.png
   *     responses:
   *       201:
   *         description: Template created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Template created successfully
   *                 data:
   *                   $ref: '#/components/schemas/FormTemplate'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized - missing or invalid token
   *       403:
   *         description: Forbidden - user is not admin
   */
  createTemplate = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const template = await templatesService.createTemplate(req.body);

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: template,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * @swagger
   * /api/templates/{id}:
   *   put:
   *     summary: Update template
   *     description: Updates an existing template. Requires JWT authentication with admin role.
   *     tags:
   *       - Templates
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Template UUID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 255
   *               description:
   *                 type: string
   *                 maxLength: 1000
   *               category:
   *                 type: string
   *                 enum: [ecommerce, services, quiz, polls, events, data_collection]
   *               templateSchema:
   *                 type: object
   *                 description: Complete FormSchema object
   *               businessLogicConfig:
   *                 type: object
   *                 description: Business logic configuration
   *               previewImageUrl:
   *                 type: string
   *                 format: uri
   *     responses:
   *       200:
   *         description: Template updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Template updated successfully
   *                 data:
   *                   $ref: '#/components/schemas/FormTemplate'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized - missing or invalid token
   *       403:
   *         description: Forbidden - user is not admin
   *       404:
   *         description: Template not found
   */
  updateTemplate = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { id } = req.params;
      const template = await templatesService.updateTemplate(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Template updated successfully',
        data: template,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * @swagger
   * /api/templates/{id}:
   *   delete:
   *     summary: Delete template (soft delete)
   *     description: Soft deletes a template by setting is_active to false. Requires JWT authentication with admin role.
   *     tags:
   *       - Templates
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Template UUID
   *     responses:
   *       200:
   *         description: Template deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Template deleted successfully
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       401:
   *         description: Unauthorized - missing or invalid token
   *       403:
   *         description: Forbidden - user is not admin
   *       404:
   *         description: Template not found
   */
  deleteTemplate = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;

      await templatesService.deleteTemplate(id);

      res.status(200).json({
        success: true,
        message: 'Template deleted successfully',
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * @swagger
   * /api/templates/{id}/apply:
   *   post:
   *     summary: Apply template to create form schema
   *     description: Applies a template to generate a new form schema. Requires JWT authentication. Increments template usage count.
   *     tags:
   *       - Templates
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Template UUID
   *     responses:
   *       200:
   *         description: Template applied successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   description: Generated FormSchema ready for form creation
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Template is not active
   *       401:
   *         description: Unauthorized - missing or invalid token
   *       404:
   *         description: Template not found
   */
  applyTemplate = AsyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      _next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;

      const formSchema = await templatesService.applyTemplateToForm(id);

      res.status(200).json({
        success: true,
        data: formSchema,
        timestamp: new Date().toISOString(),
      });
    }
  );
}

// Export singleton instance
export const templatesController = new TemplatesController();
