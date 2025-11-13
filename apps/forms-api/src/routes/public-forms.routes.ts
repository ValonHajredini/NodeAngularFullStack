import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { PublicFormsController } from '../controllers/public-forms.controller';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { sessionMiddleware } from '../middleware/session.middleware';

/**
 * Public forms routes configuration.
 * Defines public endpoints for form rendering (no authentication required).
 * Session middleware applied for poll duplicate vote prevention (Story 29.14).
 */
const router = Router();
const publicFormsController = new PublicFormsController();

/**
 * Apply session middleware to all public form routes
 * Required for poll voting duplicate prevention
 * @since Epic 29, Story 29.14
 */
router.use(sessionMiddleware);

/**
 * Middleware to allow iframe embedding for public forms.
 * Story 26.4: Iframe Embed Code Generator
 * Sets security headers to permit external website embedding.
 */
const allowIframeEmbedding = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  // Allow all origins to embed this content in iframes
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *");

  // Additional security headers for iframe embedding
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
};

/**
 * @swagger
 * /api/public/forms/render/{token}:
 *   get:
 *     summary: Get form schema for public rendering
 *     description: Validates JWT token and returns form schema for public access (no authentication required)
 *     tags: [Public Forms]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: JWT render token for the form
 *         example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Form schema retrieved successfully
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
 *                   example: "Form schema retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     schema:
 *                       $ref: '#/components/schemas/FormSchema'
 *                     settings:
 *                       type: object
 *                       description: Form settings for rendering
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Form not found or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Form not found"
 *       410:
 *         description: Token has expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "This form has expired"
 *       429:
 *         description: Rate limit exceeded (10 requests per minute per IP)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Too many requests, please try again later"
 */
router.get(
  '/forms/render/:token',
  allowIframeEmbedding,
  RateLimitMiddleware.publicFormRenderLimit(),
  publicFormsController.renderForm
);

/**
 * @swagger
 * /api/public/forms/submit/{token}:
 *   post:
 *     summary: Submit form data
 *     description: Validates and stores form submission data (no authentication required, rate limited)
 *     tags: [Public Forms]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: JWT render token for the form
 *         example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               values:
 *                 type: object
 *                 description: Form field values (key-value pairs)
 *                 example:
 *                   name: "John Doe"
 *                   email: "john@example.com"
 *                   message: "Hello world"
 *               captchaToken:
 *                 type: string
 *                 description: Optional CAPTCHA token (required after 3 submissions)
 *                 example: "03AGdBq25..."
 *     responses:
 *       201:
 *         description: Form submitted successfully
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
 *                   example: "Form submitted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     submissionId:
 *                       type: string
 *                       format: uuid
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     redirectUrl:
 *                       type: string
 *                       nullable: true
 *                       example: "https://example.com/thank-you"
 *                     successMessage:
 *                       type: string
 *                       example: "Thank you for your submission!"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 errors:
 *                   type: object
 *                   example:
 *                     email: "Email is required"
 *                     name: "Name must be at least 2 characters"
 *       404:
 *         description: Form not found or invalid token
 *       410:
 *         description: Token has expired
 *       429:
 *         description: Rate limit exceeded (10 submissions per hour per IP)
 */
router.post(
  '/forms/submit/:token',
  RateLimitMiddleware.publicFormSubmitLimit(),
  publicFormsController.submitForm
);

/**
 * @swagger
 * /api/public/forms/{shortCode}:
 *   get:
 *     summary: Get form schema for public rendering by short code
 *     description: Retrieves form schema with embedded theme using short code (alternative to JWT token method)
 *     tags: [Public Forms]
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Short code for the published form
 *         example: "abc123"
 *     responses:
 *       200:
 *         description: Form schema retrieved successfully with optional theme
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
 *                   example: "Form schema retrieved successfully"
 *                 form:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     schema:
 *                       $ref: '#/components/schemas/FormSchema'
 *                     settings:
 *                       type: object
 *                       description: Form settings for rendering
 *                     theme:
 *                       nullable: true
 *                       description: Optional theme object (null if no theme or theme deleted)
 *                       $ref: '#/components/schemas/FormTheme'
 *                     shortCode:
 *                       type: string
 *                       example: "abc123"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Form not found or short code invalid
 *       410:
 *         description: Form has expired
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/forms/:shortCode',
  allowIframeEmbedding,
  RateLimitMiddleware.publicFormRenderLimit(),
  publicFormsController.getPublicFormByShortCode
);

/**
 * @swagger
 * /api/public/forms/{shortCode}/available-slots:
 *   get:
 *     summary: Get available appointment slots for a form
 *     description: Retrieves available time slots for appointment booking forms (no authentication required)
 *     tags: [Public Forms]
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Short code for the published appointment form
 *         example: "abc123"
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for availability query (YYYY-MM-DD)
 *         example: "2025-12-15"
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for availability query (YYYY-MM-DD)
 *         example: "2025-12-22"
 *     responses:
 *       200:
 *         description: Available slots retrieved successfully
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
 *                   example: "Available slots retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     slots:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AvailableSlot'
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           format: date
 *                           example: "2025-12-15"
 *                         endDate:
 *                           type: string
 *                           format: date
 *                           example: "2025-12-22"
 *                     maxBookingsPerSlot:
 *                       type: number
 *                       example: 5
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Missing or invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid date format. Expected YYYY-MM-DD (ISO 8601)"
 *       404:
 *         description: Form not found or not configured for appointment booking
 *       410:
 *         description: Form has expired
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/forms/:shortCode/available-slots',
  RateLimitMiddleware.publicFormRenderLimit(),
  publicFormsController.getAvailableSlots
);

/**
 * @swagger
 * /api/public/forms/{shortCode}/poll-results:
 *   get:
 *     summary: Get poll results for a form
 *     description: Retrieves aggregated poll vote results with counts and percentages (no authentication required)
 *     tags: [Public Forms]
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Short code for the published poll form
 *         example: "abc123"
 *     responses:
 *       200:
 *         description: Poll results retrieved successfully
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
 *                   example: "Poll results retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_votes:
 *                       type: number
 *                       example: 150
 *                     vote_counts:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *                       example: { "option_a": 75, "option_b": 45, "option_c": 30 }
 *                     vote_percentages:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 *                       example: { "option_a": 50, "option_b": 30, "option_c": 20 }
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Form not found or not configured for poll voting
 *       410:
 *         description: Form has expired
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
  '/forms/:shortCode/poll-results',
  RateLimitMiddleware.publicFormRenderLimit(),
  publicFormsController.getPollResults
);

export { router as publicFormsRoutes };
