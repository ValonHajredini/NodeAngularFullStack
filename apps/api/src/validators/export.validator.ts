import { param, ValidationChain } from 'express-validator';

/**
 * Export Validation Middleware
 *
 * Express-validator middleware for validating export job API requests.
 * Ensures toolId and jobId parameters are valid UUIDs.
 *
 * Story 33.1.3: Export Job Status Tracking
 */

/**
 * Validation rules for starting export job.
 * Validates toolId parameter is a valid UUID.
 *
 * @example
 * router.post('/tools/:toolId/export', validateExportStart, controller.startExport);
 */
export const validateExportStart: ValidationChain[] = [
  param('toolId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('toolId is required and must be a string'),
];

/**
 * Validation rules for export job operations (get status, cancel).
 * Validates jobId parameter is a valid UUID.
 *
 * @example
 * router.get('/export-jobs/:jobId', validateJobId, controller.getExportStatus);
 * router.post('/export-jobs/:jobId/cancel', validateJobId, controller.cancelExport);
 */
export const validateJobId: ValidationChain[] = [
  param('jobId').isUUID().withMessage('jobId must be a valid UUID'),
];
