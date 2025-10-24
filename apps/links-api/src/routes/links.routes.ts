import { Router } from 'express';
import { LinksController } from '../controllers/links.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  generateLinkValidation,
  updateLinkValidation,
  linkIdValidation,
  shortCodeValidation,
} from '../validators/links.validator';

/**
 * Create router with all links-related routes
 */
export function createLinksRoutes(controller: LinksController): Router {
  const router = Router();

  // Protected routes (require authentication)

  /**
   * @route   POST /api/links/generate
   * @desc    Generate a new short link
   * @access  Private (authenticated users)
   */
  router.post('/api/links/generate', authMiddleware, generateLinkValidation, controller.generateLink);

  /**
   * @route   GET /api/links/me
   * @desc    Get all short links for authenticated user
   * @access  Private (authenticated users)
   */
  router.get('/api/links/me', authMiddleware, controller.getUserLinks);

  /**
   * @route   GET /api/links/:shortCode
   * @desc    Get short link details by code
   * @access  Private (authenticated users, owner only)
   */
  router.get(
    '/api/links/:shortCode',
    authMiddleware,
    shortCodeValidation,
    controller.getLinkByCode
  );

  /**
   * @route   GET /api/links/:id/analytics
   * @desc    Get analytics summary for a short link
   * @access  Private (authenticated users, owner only)
   */
  router.get('/api/links/:id/analytics', authMiddleware, linkIdValidation, controller.getAnalytics);

  /**
   * @route   PATCH /api/links/:id
   * @desc    Update a short link (expiration, token)
   * @access  Private (authenticated users, owner only)
   */
  router.patch('/api/links/:id', authMiddleware, updateLinkValidation, controller.updateLink);

  /**
   * @route   DELETE /api/links/:id
   * @desc    Delete a short link
   * @access  Private (authenticated users, owner only)
   */
  router.delete('/api/links/:id', authMiddleware, linkIdValidation, controller.deleteLink);

  // Public routes (no authentication required)

  /**
   * @route   GET /:shortCode
   * @desc    Public redirect endpoint - redirects to original URL
   * @access  Public
   */
  router.get('/:shortCode', shortCodeValidation, controller.redirect);

  return router;
}
