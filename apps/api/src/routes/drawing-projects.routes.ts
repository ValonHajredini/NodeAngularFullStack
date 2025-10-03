import { Router } from 'express';
import { drawingProjectsController } from '../controllers/drawing-projects.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { body, param, query } from 'express-validator';
import { ValidationMiddleware } from '../middleware/validation.middleware';

/**
 * Drawing projects routes configuration.
 * Defines all endpoints for drawing project management with authentication.
 * All routes require user authentication.
 */
const router = Router();

/**
 * Apply authentication middleware to all routes.
 * Only authenticated users can access their drawing projects.
 */
router.use(AuthMiddleware.authenticate);

/**
 * Validation middleware for creating a project.
 */
const validateCreateProject = [
  body('name')
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('description')
    .optional()
    .isString()
    .trim()
    .withMessage('Description must be a string'),
  body('templateData')
    .isObject()
    .withMessage('Template data must be an object'),
  body('templateData.version')
    .isString()
    .withMessage('Template version is required'),
  body('templateData.shapes')
    .isArray()
    .withMessage('Template shapes must be an array'),
  body('thumbnail')
    .optional()
    .isString()
    .withMessage('Thumbnail must be a base64 string'),
  ValidationMiddleware.handleValidationErrors,
];

/**
 * Validation middleware for updating a project.
 */
const validateUpdateProject = [
  param('id').isUUID().withMessage('Invalid project ID format'),
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('description')
    .optional()
    .isString()
    .trim()
    .withMessage('Description must be a string'),
  body('templateData')
    .optional()
    .isObject()
    .withMessage('Template data must be an object'),
  body('thumbnail')
    .optional()
    .isString()
    .withMessage('Thumbnail must be a base64 string'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  ValidationMiddleware.handleValidationErrors,
];

/**
 * Validation middleware for project ID parameter.
 */
const validateProjectId = [
  param('id').isUUID().withMessage('Invalid project ID format'),
  ValidationMiddleware.handleValidationErrors,
];

/**
 * Validation middleware for query parameters.
 */
const validateGetProjectsQuery = [
  query('activeOnly')
    .optional()
    .isBoolean()
    .withMessage('activeOnly must be a boolean'),
  ValidationMiddleware.handleValidationErrors,
];

/**
 * @route GET /api/drawing-projects
 * @description Retrieve all projects for the authenticated user
 * @access Authenticated users
 * @query activeOnly - Optional boolean to filter active projects only
 * @response 200 - Projects list
 * @response 401 - Authentication required
 * @response 500 - Internal server error
 */
router.get(
  '/',
  validateGetProjectsQuery,
  drawingProjectsController.getProjects.bind(drawingProjectsController)
);

/**
 * @route GET /api/drawing-projects/:id
 * @description Retrieve a single project by ID
 * @access Authenticated users (owner only)
 * @param id - Project UUID
 * @response 200 - Project data
 * @response 401 - Authentication required
 * @response 403 - Unauthorized access
 * @response 404 - Project not found
 * @response 500 - Internal server error
 */
router.get(
  '/:id',
  validateProjectId,
  drawingProjectsController.getProjectById.bind(drawingProjectsController)
);

/**
 * @route POST /api/drawing-projects
 * @description Create a new drawing project
 * @access Authenticated users
 * @body CreateDrawingProjectRequest
 * @response 201 - Project created successfully
 * @response 400 - Invalid request data
 * @response 401 - Authentication required
 * @response 500 - Internal server error
 */
router.post(
  '/',
  validateCreateProject,
  drawingProjectsController.createProject.bind(drawingProjectsController)
);

/**
 * @route PUT /api/drawing-projects/:id
 * @description Update an existing drawing project
 * @access Authenticated users (owner only)
 * @param id - Project UUID
 * @body UpdateDrawingProjectRequest
 * @response 200 - Project updated successfully
 * @response 400 - Invalid request data
 * @response 401 - Authentication required
 * @response 403 - Unauthorized access
 * @response 404 - Project not found
 * @response 500 - Internal server error
 */
router.put(
  '/:id',
  validateUpdateProject,
  drawingProjectsController.updateProject.bind(drawingProjectsController)
);

/**
 * @route DELETE /api/drawing-projects/:id
 * @description Delete a drawing project
 * @access Authenticated users (owner only)
 * @param id - Project UUID
 * @response 200 - Project deleted successfully
 * @response 401 - Authentication required
 * @response 403 - Unauthorized access
 * @response 404 - Project not found
 * @response 500 - Internal server error
 */
router.delete(
  '/:id',
  validateProjectId,
  drawingProjectsController.deleteProject.bind(drawingProjectsController)
);

export default router;
