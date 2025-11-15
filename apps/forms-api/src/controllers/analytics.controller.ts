/**
 * Analytics Controller
 *
 * Handles HTTP requests for category-specific form analytics.
 * Delegates analytics computation to the analytics service/strategy registry.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.5: Category Analytics API Endpoint and Controller
 *
 * @since 2025-01-27
 */

import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.middleware';
import { AsyncHandler } from '../utils/async-handler.utils';
import { analyticsService } from '../services/analytics/analytics.service';
import { ApiError } from '../services/forms.service';
import { formsRepository } from '../repositories/forms.repository';
import { TemplateCategory, detectTemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Analytics controller handling HTTP requests for form analytics operations.
 * Provides category-specific metrics for polls, quizzes, products, appointments, restaurants, and events.
 */
export class AnalyticsController {
  /**
   * Gets category-specific analytics metrics for a form.
   *
   * @route GET /api/analytics/:formId/category-metrics
   * @param req - Express request object with formId path parameter
   * @param res - Express response object
   * @returns HTTP response with category-specific analytics data
   * @throws {ApiError} 400 - Invalid input data (validation errors)
   * @throws {ApiError} 401 - Authentication required
   * @throws {ApiError} 403 - Forbidden (user doesn't own the form)
   * @throws {ApiError} 404 - Form not found
   *
   * @example
   * GET /api/analytics/123e4567-e89b-12d3-a456-426614174000/category-metrics
   * Authorization: Bearer <token>
   *
   * Response (Poll metrics example):
   * {
   *   "success": true,
   *   "message": "Analytics retrieved successfully",
   *   "data": {
   *     "category": "polls",
   *     "totalSubmissions": 150,
   *     "voteCounts": { "option_a": 75, "option_b": 45, "option_c": 30 },
   *     "votePercentages": { "option_a": 50, "option_b": 30, "option_c": 20 },
   *     "uniqueVoters": 148,
   *     "duplicateVoteAttempts": 12,
   *     "mostPopularOption": "option_a",
   *     "firstSubmissionAt": "2025-01-01T00:00:00Z",
   *     "lastSubmissionAt": "2025-01-15T12:30:00Z"
   *   },
   *   "timestamp": "2025-01-27T10:30:00.000Z"
   * }
   *
   * Response (Quiz metrics example):
   * {
   *   "success": true,
   *   "message": "Analytics retrieved successfully",
   *   "data": {
   *     "category": "quiz",
   *     "totalSubmissions": 200,
   *     "averageScore": 75.5,
   *     "medianScore": 80,
   *     "passRate": 68.5,
   *     "scoreDistribution": { "0-20": 10, "21-40": 15, "41-60": 25, "61-80": 80, "81-100": 70 },
   *     "questionAccuracy": { "q1": 85.5, "q2": 62.0, "q3": 91.5 },
   *     "highestScore": 100,
   *     "lowestScore": 15,
   *     "firstSubmissionAt": "2025-01-01T00:00:00Z",
   *     "lastSubmissionAt": "2025-01-15T12:30:00Z"
   *   },
   *   "timestamp": "2025-01-27T10:30:00.000Z"
   * }
   *
   * @swagger
   * /api/analytics/{formId}/category-metrics:
   *   get:
   *     summary: Get category-specific analytics for a form
   *     description: Retrieves analytics metrics tailored to the form's template category (polls, quiz, ecommerce, services, data_collection, events)
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
   *                   example: Analytics retrieved successfully
   *                 data:
   *                   oneOf:
   *                     - $ref: '#/components/schemas/PollMetrics'
   *                     - $ref: '#/components/schemas/QuizMetrics'
   *                     - $ref: '#/components/schemas/ProductMetrics'
   *                     - $ref: '#/components/schemas/AppointmentMetrics'
   *                     - $ref: '#/components/schemas/RestaurantMetrics'
   *                     - $ref: '#/components/schemas/EventsMetrics'
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       400:
   *         description: Invalid form ID format
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       403:
   *         description: Forbidden - user doesn't own this form
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Form not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  getCategoryMetrics = AsyncHandler(
    async (req: AuthRequest, res: Response): Promise<void> => {
      // Validate request parameters
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(
          'Invalid input data',
          400,
          'VALIDATION_ERROR'
        );
      }

      // Extract authentication context (populated by auth middleware)
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId || null;

      if (!userId) {
        throw new ApiError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Extract form ID from path parameter
      const { formId } = req.params;

      if (!formId) {
        throw new ApiError('Form ID is required', 400, 'MISSING_FORM_ID');
      }

      // Verify form exists and user has access (ownership check)
      // Use findFormWithSchema() to get category from schema_json
      const form = await formsRepository.findFormWithSchema(formId, tenantId);

      if (!form) {
        throw new ApiError(
          'Form not found',
          404,
          'FORM_NOT_FOUND'
        );
      }

      // Verify user owns the form (authorization check)
      if (form.userId !== userId) {
        throw new ApiError(
          'You do not have permission to access analytics for this form',
          403,
          'FORBIDDEN'
        );
      }

      // Verify form has a published schema
      if (!form.schema?.id) {
        throw new ApiError(
          'Form has no published schema',
          404,
          'SCHEMA_NOT_FOUND'
        );
      }

      // Detect category from form schema using shared utility
      // Category detection checks settings.templateCategory and other strategies
      const category: TemplateCategory | null = form.schema
        ? detectTemplateCategory(form.schema)
        : null;

      // Delegate analytics computation to service (which uses strategy registry)
      // IMPORTANT: Pass formSchemaId, not formId (submissions are linked to form_schemas table)
      const metrics = await analyticsService.getFormAnalytics(
        form.schema.id,
        category,
        tenantId
      );

      // Return standardized success response
      res.status(200).json({
        success: true,
        message: 'Analytics retrieved successfully',
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    }
  );
}

/**
 * Singleton instance for use across the application.
 * Routes should import this instance.
 */
export const analyticsController = new AnalyticsController();
