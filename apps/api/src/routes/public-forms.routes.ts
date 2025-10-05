import { Router } from 'express';
import { PublicFormsController } from '../controllers/public-forms.controller';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware';

/**
 * Public forms routes configuration.
 * Defines public endpoints for form rendering (no authentication required).
 */
const router = Router();
const publicFormsController = new PublicFormsController();

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

export { router as publicFormsRoutes };
