/**
 * Category Analytics Controller
 *
 * REST API endpoints for category-specific analytics metrics.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.5: Category Analytics API Endpoint and Controller
 *
 * @since 2025-01-27
 */

import { Request, Response, NextFunction } from 'express';
import { CategoryAnalyticsService } from '../services/category-analytics.service';
import { FormSchemasRepository } from '../repositories/form-schemas.repository';
import { FormSubmissionsRepository } from '../repositories/form-submissions.repository';
import { ApiError } from '../utils/api-error';

/**
 * Category Analytics Controller
 * Handles HTTP requests for category-specific analytics
 */
export class CategoryAnalyticsController {
  private readonly analyticsService: CategoryAnalyticsService;

  constructor() {
    const schemasRepository = new FormSchemasRepository();
    const submissionsRepository = new FormSubmissionsRepository();
    this.analyticsService = new CategoryAnalyticsService(
      schemasRepository,
      submissionsRepository
    );
  }

  /**
   * GET /api/analytics/:formId/category-metrics
   *
   * Fetch category-specific analytics metrics for a form.
   *
   * @param req - Express request with formId param
   * @param res - Express response
   * @param next - Express next function
   *
   * @returns JSON response with category metrics
   *
   * @example Response (Quiz)
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "category": "quiz",
   *     "totalSubmissions": 100,
   *     "averageScore": 75.5,
   *     "passRate": 68.0,
   *     "scoreDistribution": {
   *       "0-20%": 5,
   *       "20-40%": 10,
   *       "40-60%": 15,
   *       "60-80%": 30,
   *       "80-100%": 40
   *     },
   *     "questionAccuracy": {
   *       "question1": 85.5,
   *       "question2": 72.0
   *     }
   *   },
   *   "timestamp": "2025-01-27T12:00:00.000Z"
   * }
   * ```
   */
  getCategoryMetrics = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { formId } = req.params;

      if (!formId) {
        throw new ApiError(400, 'Form ID is required');
      }

      // Calculate category-specific metrics
      const metrics = await this.analyticsService.getCategoryMetrics(formId);

      res.status(200).json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/analytics/:formId/category
   *
   * Get detected template category for a form.
   *
   * @param req - Express request with formId param
   * @param res - Express response
   * @param next - Express next function
   *
   * @returns JSON response with category
   */
  getFormCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { formId } = req.params;

      if (!formId) {
        throw new ApiError(400, 'Form ID is required');
      }

      const category = await this.analyticsService.getFormCategory(formId);

      res.status(200).json({
        success: true,
        data: { category },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}
