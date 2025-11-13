/**
 * Analytics Routes Configuration
 *
 * Defines REST API endpoints for form analytics operations.
 * Provides category-specific analytics metrics for polls, quizzes, products, appointments, restaurants, and events.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.5: Category Analytics API Endpoint and Controller
 *
 * @since 2025-01-27
 */

import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { getCategoryMetricsValidator } from '../validators/analytics.validator';

/**
 * Analytics routes configuration.
 * All routes require authentication and proper authorization.
 */
const router = Router();

/**
 * @swagger
 * /api/analytics/{formId}/category-metrics:
 *   get:
 *     summary: Get category-specific analytics for a form
 *     description: |
 *       Retrieves analytics metrics tailored to the form's template category.
 *
 *       Supported categories and their metrics:
 *       - **polls**: Vote counts, percentages, unique voters, popular options
 *       - **quiz**: Score distributions, pass rates, question accuracy
 *       - **ecommerce**: Revenue totals, product sales, inventory alerts
 *       - **services**: Booking rates, time slot popularity, capacity utilization
 *       - **data_collection**: Order totals, popular items, peak times (restaurant/menu forms)
 *       - **events**: RSVP responses, ticket sales, attendance rates
 *
 *       The endpoint automatically detects the form's category and returns appropriate metrics.
 *       Generic metrics (submission counts, timestamps) are provided for forms without specialized categories.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: formId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the form to get analytics for
 *         example: '123e4567-e89b-12d3-a456-426614174000'
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional start date for time range filter (ISO 8601 format YYYY-MM-DD)
 *         example: '2025-01-01'
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Optional end date for time range filter (ISO 8601 format YYYY-MM-DD)
 *         example: '2025-01-31'
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *           enum: [polls, quiz, ecommerce, services, data_collection, events]
 *         description: Optional category filter to override auto-detection
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
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
 *                   example: 'Analytics retrieved successfully'
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/PollMetrics'
 *                     - $ref: '#/components/schemas/QuizMetrics'
 *                     - $ref: '#/components/schemas/ProductMetrics'
 *                     - $ref: '#/components/schemas/AppointmentMetrics'
 *                     - $ref: '#/components/schemas/RestaurantMetrics'
 *                     - $ref: '#/components/schemas/EventsMetrics'
 *                   description: Category-specific metrics (discriminated by 'category' field)
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2025-01-27T10:30:00.000Z'
 *             examples:
 *               pollMetrics:
 *                 summary: Poll analytics example
 *                 value:
 *                   success: true
 *                   message: 'Analytics retrieved successfully'
 *                   data:
 *                     category: 'polls'
 *                     totalSubmissions: 150
 *                     voteCounts: { option_a: 75, option_b: 45, option_c: 30 }
 *                     votePercentages: { option_a: 50, option_b: 30, option_c: 20 }
 *                     uniqueVoters: 148
 *                     duplicateVoteAttempts: 12
 *                     mostPopularOption: 'option_a'
 *                     firstSubmissionAt: '2025-01-01T00:00:00Z'
 *                     lastSubmissionAt: '2025-01-15T12:30:00Z'
 *                   timestamp: '2025-01-27T10:30:00.000Z'
 *               quizMetrics:
 *                 summary: Quiz analytics example
 *                 value:
 *                   success: true
 *                   message: 'Analytics retrieved successfully'
 *                   data:
 *                     category: 'quiz'
 *                     totalSubmissions: 200
 *                     averageScore: 75.5
 *                     medianScore: 80
 *                     passRate: 68.5
 *                     scoreDistribution: { '0-20': 10, '21-40': 15, '41-60': 25, '61-80': 80, '81-100': 70 }
 *                     questionAccuracy: { q1: 85.5, q2: 62.0, q3: 91.5 }
 *                     highestScore: 100
 *                     lowestScore: 15
 *                     firstSubmissionAt: '2025-01-01T00:00:00Z'
 *                     lastSubmissionAt: '2025-01-15T12:30:00Z'
 *                   timestamp: '2025-01-27T10:30:00.000Z'
 *       400:
 *         description: Invalid form ID format or validation errors
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
 *                   example: 'VALIDATION_ERROR'
 *                 message:
 *                   type: string
 *                   example: 'Invalid input data'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Authentication required (missing or invalid token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 'Unauthorized'
 *                 message:
 *                   type: string
 *                   example: 'Authorization header is required'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       403:
 *         description: Forbidden - user doesn't own this form
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
 *                   example: 'FORBIDDEN'
 *                 message:
 *                   type: string
 *                   example: 'You do not have permission to access analytics for this form'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Form not found
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
 *                   example: 'FORM_NOT_FOUND'
 *                 message:
 *                   type: string
 *                   example: 'Form not found'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get(
  '/:formId/category-metrics',
  AuthMiddleware.authenticate,
  getCategoryMetricsValidator,
  analyticsController.getCategoryMetrics
);

export default router;
