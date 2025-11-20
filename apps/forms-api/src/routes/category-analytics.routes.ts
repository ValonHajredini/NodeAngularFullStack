/**
 * Category Analytics Routes
 *
 * REST API routes for category-specific analytics endpoints.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.5: Category Analytics API Endpoint and Controller
 *
 * @since 2025-01-27
 */

import { Router } from 'express';
import { CategoryAnalyticsController } from '../controllers/category-analytics.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();
const controller = new CategoryAnalyticsController();

/**
 * @route   GET /api/analytics/:formId/category-metrics
 * @desc    Get category-specific analytics metrics for a form
 * @access  Private (requires authentication)
 *
 * @param   {string} formId - Form schema UUID
 * @returns {CategoryMetrics} Category-specific metrics (quiz, poll, etc.)
 */
router.get(
  '/:formId/category-metrics',
  authenticateJWT,
  controller.getCategoryMetrics
);

/**
 * @route   GET /api/analytics/:formId/category
 * @desc    Get detected template category for a form
 * @access  Private (requires authentication)
 *
 * @param   {string} formId - Form schema UUID
 * @returns {object} Category information
 */
router.get('/:formId/category', authenticateJWT, controller.getFormCategory);

export default router;
