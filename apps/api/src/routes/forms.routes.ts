import { Router } from 'express';
import { formsController } from '../controllers/forms.controller';
import { FormsUploadController } from '../controllers/forms-upload.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { sanitizeFormHTML } from '../middleware/sanitize-html.middleware';
import { cssSanitizerMiddleware } from '../middleware/css-sanitizer.middleware';
import {
  createFormValidator,
  updateFormValidator,
  formIdValidator,
  validateFormSchema,
  xssProtection,
} from '../validators/forms.validator';

// Initialize upload controller
const formsUploadController = new FormsUploadController();

/**
 * Forms routes configuration.
 * Defines all CRUD endpoints for form management with proper validation and middleware.
 */
const router = Router();

/**
 * @swagger
 * /api/forms:
 *   post:
 *     summary: Create a new form
 *     description: Create a new form with optional schema (authenticated users only)
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 description: Form title
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Form description
 *               status:
 *                 type: string
 *                 enum: [draft, published]
 *                 default: draft
 *                 description: Form status
 *               schema:
 *                 type: object
 *                 description: Optional form schema
 *                 properties:
 *                   fields:
 *                     type: array
 *                     description: Array of form fields
 *           example:
 *             title: "Contact Form"
 *             description: "Customer feedback form"
 *             status: "draft"
 *     responses:
 *       201:
 *         description: Form created successfully
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
 *                   example: "Form created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/FormMetadata'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/',
  AuthMiddleware.authenticate,
  xssProtection,
  sanitizeFormHTML, // Sanitize custom background HTML before validation
  cssSanitizerMiddleware, // Validate custom field CSS (Story 16.2)
  createFormValidator,
  validateFormSchema,
  formsController.createForm
);

/**
 * @swagger
 * /api/forms:
 *   get:
 *     summary: Get paginated list of forms
 *     description: Get paginated list of forms (users see their own forms, admins see all)
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Forms retrieved successfully
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
 *                   example: "Forms retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FormMetadata'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', AuthMiddleware.authenticate, formsController.getForms);

/**
 * @swagger
 * /api/forms/{id}/publish:
 *   post:
 *     summary: Publish a form
 *     description: Publish a form with JWT render token (owner or admin only)
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [expiresInDays]
 *             properties:
 *               expiresInDays:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 365
 *                 default: 30
 *                 description: Number of days until token expires
 *           example:
 *             expiresInDays: 30
 *     responses:
 *       200:
 *         description: Form published successfully
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
 *                   example: "Form published successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     form:
 *                       $ref: '#/components/schemas/FormMetadata'
 *                     schema:
 *                       $ref: '#/components/schemas/FormSchema'
 *                     renderUrl:
 *                       type: string
 *                       example: "/forms/render/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error or schema validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions to publish this form
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Form not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded (10 publishes per hour)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/publish',
  AuthMiddleware.authenticate,
  RateLimitMiddleware.publishRateLimit(),
  formIdValidator,
  formsController.publishForm
);

/**
 * @swagger
 * /api/forms/{id}/unpublish:
 *   post:
 *     summary: Unpublish a form
 *     description: Unpublish a form and invalidate render token (owner or admin only)
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Form unpublished successfully
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
 *                   example: "Form unpublished successfully"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions to unpublish this form
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Form not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/unpublish',
  AuthMiddleware.authenticate,
  formIdValidator,
  formsController.unpublishForm
);

/**
 * @swagger
 * /api/forms/upload-background:
 *   post:
 *     summary: Upload a background image for forms
 *     description: Upload an image file to DigitalOcean Spaces for use as form background
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [backgroundImage]
 *             properties:
 *               backgroundImage:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, GIF, WebP, SVG) - max 5MB
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       description: Public CDN URL of uploaded image
 *                     fileName:
 *                       type: string
 *                     size:
 *                       type: number
 *                     mimeType:
 *                       type: string
 *       400:
 *         description: No file provided or invalid file type
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Upload failed
 */
router.post(
  '/upload-background',
  AuthMiddleware.authenticate,
  formsUploadController.uploadMiddleware,
  formsUploadController.uploadBackgroundImage
);

/**
 * @swagger
 * /api/forms/{formId}/upload-image:
 *   post:
 *     summary: Upload an image for a form field
 *     description: Upload an image file to DigitalOcean Spaces for use in IMAGE field type
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: formId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, GIF, WebP) - max 5MB
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     imageUrl:
 *                       type: string
 *                       description: Public CDN URL of uploaded image
 *                     fileName:
 *                       type: string
 *                     size:
 *                       type: number
 *                     mimeType:
 *                       type: string
 *       400:
 *         description: No file provided, invalid file type, or file too large
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Upload failed
 */
router.post(
  '/:formId/upload-image',
  AuthMiddleware.authenticate,
  formsUploadController.uploadFieldImageMiddleware,
  formsUploadController.uploadFormImage
);

/**
 * @swagger
 * /api/forms/{id}:
 *   get:
 *     summary: Get form by ID
 *     description: Get form by ID with ownership validation (users can only access their own forms, admins can access all)
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Form retrieved successfully
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
 *                   example: "Form retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/FormMetadata'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid form ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions to access this form
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Form not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id',
  AuthMiddleware.authenticate,
  formIdValidator,
  formsController.getFormById
);

/**
 * @swagger
 * /api/forms/{id}:
 *   put:
 *     summary: Update form
 *     description: Update form (owner or admin only)
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 description: Form title
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Form description
 *               status:
 *                 type: string
 *                 enum: [draft, published]
 *                 description: Form status
 *               schema:
 *                 type: object
 *                 description: Optional form schema
 *                 properties:
 *                   fields:
 *                     type: array
 *                     description: Array of form fields
 *           example:
 *             title: "Updated Contact Form"
 *             description: "Updated description"
 *             status: "draft"
 *     responses:
 *       200:
 *         description: Form updated successfully
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
 *                   example: "Form updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/FormMetadata'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions to update this form
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Form not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/:id',
  AuthMiddleware.authenticate,
  formIdValidator,
  xssProtection,
  sanitizeFormHTML, // Sanitize custom background HTML before validation
  cssSanitizerMiddleware, // Validate custom field CSS (Story 16.2)
  updateFormValidator,
  validateFormSchema,
  formsController.updateForm
);

/**
 * @swagger
 * /api/forms/{id}:
 *   delete:
 *     summary: Delete form
 *     description: Delete form (owner or admin only)
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       204:
 *         description: Form deleted successfully (no content)
 *       400:
 *         description: Invalid form ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions to delete this form
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Form not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  '/:id',
  AuthMiddleware.authenticate,
  formIdValidator,
  formsController.deleteForm
);

/**
 * @swagger
 * /api/forms/{id}/submissions:
 *   get:
 *     summary: Get form submissions
 *     description: Get paginated submissions for a form (owner or admin only, with masked IPs and truncated values)
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Submissions retrieved successfully
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
 *                   example: "Submissions retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FormSubmission'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions to view submissions
 *       404:
 *         description: Form not found
 */
router.get(
  '/:id/submissions',
  AuthMiddleware.authenticate,
  formIdValidator,
  formsController.getSubmissions
);

/**
 * @swagger
 * /api/forms/{id}/submissions/export:
 *   get:
 *     summary: Export form submissions as CSV
 *     description: Export all form submissions to CSV file (owner or admin only)
 *     tags: [Forms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Form ID (UUID)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: |
 *                 Submitted At,Submitter IP,Name,Email,Message
 *                 2025-01-04T14:30:00Z,192.168._._,John Doe,john@example.com,Hello world
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions to export submissions
 *       404:
 *         description: Form not found or no submissions found
 */
router.get(
  '/:id/submissions/export',
  AuthMiddleware.authenticate,
  formIdValidator,
  formsController.exportSubmissions
);

export { router as formsRoutes };
