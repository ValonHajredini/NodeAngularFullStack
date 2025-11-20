import { Router } from 'express';
import { templatesController } from '../controllers/templates.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import {
  createTemplateValidator,
  updateTemplateValidator,
  getTemplateByIdValidator,
  deleteTemplateValidator,
  applyTemplateValidator,
  listTemplatesValidator,
} from '../validators/templates.validator';

/**
 * Templates routes configuration.
 * Defines all CRUD endpoints for template management with proper validation and middleware.
 *
 * @example
 * ```typescript
 * // Public endpoints (no authentication)
 * GET /api/templates - List active templates
 * GET /api/templates/:id - Get template by ID
 *
 * // Authenticated endpoints
 * POST /api/templates/:id/apply - Apply template to create form schema
 *
 * // Admin-only endpoints
 * POST /api/templates - Create template
 * PUT /api/templates/:id - Update template
 * DELETE /api/templates/:id - Delete template (soft delete)
 * ```
 */
const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     FormTemplate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique template identifier
 *         name:
 *           type: string
 *           description: Template name
 *         description:
 *           type: string
 *           description: Template description
 *         category:
 *           type: string
 *           enum: [ecommerce, services, quiz, polls, events, data_collection]
 *           description: Template category
 *         templateSchema:
 *           type: object
 *           description: Complete FormSchema object
 *         businessLogicConfig:
 *           type: object
 *           description: Optional business logic configuration
 *         previewImageUrl:
 *           type: string
 *           format: uri
 *           description: Preview image URL
 *         usageCount:
 *           type: integer
 *           description: Number of times template has been used
 *         isActive:
 *           type: boolean
 *           description: Whether template is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Template creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * GET /api/templates
 * List all active templates with optional filtering.
 * Public endpoint - no authentication required.
 */
router.get('/templates', listTemplatesValidator, templatesController.getTemplates);

/**
 * GET /api/templates/:id
 * Get a single template by ID.
 * Public endpoint - no authentication required.
 * Returns 404 if template not found or not active.
 */
router.get(
  '/templates/:id',
  getTemplateByIdValidator,
  templatesController.getTemplateById
);

/**
 * POST /api/templates
 * Create a new template.
 * Requires JWT authentication with admin role.
 */
router.post(
  '/templates',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  createTemplateValidator,
  templatesController.createTemplate
);

/**
 * PUT /api/templates/:id
 * Update an existing template.
 * Requires JWT authentication with admin role.
 */
router.put(
  '/templates/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  updateTemplateValidator,
  templatesController.updateTemplate
);

/**
 * DELETE /api/templates/:id
 * Soft delete a template (sets is_active = false).
 * Requires JWT authentication with admin role.
 */
router.delete(
  '/templates/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  deleteTemplateValidator,
  templatesController.deleteTemplate
);

/**
 * POST /api/templates/:id/apply
 * Apply a template to generate a new form schema.
 * Requires JWT authentication (any authenticated user).
 * Increments template usage_count.
 */
router.post(
  '/templates/:id/apply',
  AuthMiddleware.authenticate,
  applyTemplateValidator,
  templatesController.applyTemplate
);

export default router;
