/**
 * Analytics Validation Rules
 *
 * Validation middleware for analytics API endpoints.
 * Ensures form IDs are valid UUIDs and query parameters conform to expected formats.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.5: Category Analytics API Endpoint and Controller
 *
 * @since 2025-01-27
 */

import { param, query } from 'express-validator';
import { TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Validation rules for category analytics endpoint.
 * Validates formId path parameter and optional query parameters.
 *
 * @example
 * GET /api/analytics/:formId/category-metrics
 * GET /api/analytics/:formId/category-metrics?startDate=2025-01-01&endDate=2025-01-31
 */
export const getCategoryMetricsValidator = [
  // Validate formId path parameter (required, must be UUID)
  param('formId')
    .trim()
    .notEmpty()
    .withMessage('Form ID is required')
    .isUUID()
    .withMessage('Form ID must be a valid UUID'),

  // Optional date range filters (ISO 8601 date format YYYY-MM-DD)
  query('startDate')
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Start date must be in format YYYY-MM-DD')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  query('endDate')
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('End date must be in format YYYY-MM-DD')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),

  // Optional category filter (must be valid TemplateCategory enum value)
  query('category')
    .optional()
    .trim()
    .isIn([
      TemplateCategory.POLLS,
      TemplateCategory.QUIZ,
      TemplateCategory.ECOMMERCE,
      TemplateCategory.SERVICES,
      TemplateCategory.DATA_COLLECTION,
      TemplateCategory.EVENTS,
    ])
    .withMessage(
      'Category must be one of: polls, quiz, ecommerce, services, data_collection, events'
    ),
];

/**
 * Validation rules for form ID parameter.
 * Reusable validator for endpoints that only require formId.
 *
 * @example
 * GET /api/analytics/:formId/summary
 */
export const formIdParamValidator = [
  param('formId')
    .trim()
    .notEmpty()
    .withMessage('Form ID is required')
    .isUUID()
    .withMessage('Form ID must be a valid UUID'),
];
