import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { LinksService } from '../services/links.service';

/**
 * HTTP request handlers for short links endpoints
 */
export class LinksController {
  constructor(private service: LinksService) {}

  /**
   * POST /api/links/generate
   * Generate a new short link
   */
  generateLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { originalUrl, resourceType, resourceId, expiresAt, token } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: User ID missing' });
        return;
      }

      // Generate short link
      const shortLink = await this.service.generateShortLink({
        userId,
        originalUrl,
        resourceType,
        resourceId,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        token,
      });

      res.status(201).json({
        message: 'Short link created successfully',
        data: shortLink,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/links/me
   * Get all short links for the authenticated user
   */
  getUserLinks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: User ID missing' });
        return;
      }

      const links = await this.service.getUserLinks(userId);

      res.status(200).json({
        message: 'Links retrieved successfully',
        data: links,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/links/:shortCode
   * Get short link details by code
   */
  getLinkByCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { shortCode } = req.params;

      const link = await this.service.getByShortCode(shortCode);

      if (!link) {
        res.status(404).json({ error: 'Short link not found' });
        return;
      }

      // Only return link if user is authorized (owner)
      const userId = req.user?.id;
      if (link.userId !== userId) {
        res.status(403).json({ error: 'Unauthorized to view this link' });
        return;
      }

      res.status(200).json({
        message: 'Link retrieved successfully',
        data: link,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/links/:id/analytics
   * Get analytics summary for a short link
   */
  getAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: User ID missing' });
        return;
      }

      // Verify ownership (LinksService will handle this)
      const analytics = await this.service.getAnalyticsSummary(id);

      res.status(200).json({
        message: 'Analytics retrieved successfully',
        data: analytics,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  /**
   * PATCH /api/links/:id
   * Update a short link (expiration, token)
   */
  updateLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: User ID missing' });
        return;
      }

      const { expiresAt, token } = req.body;

      const updatedLink = await this.service.updateLink(id, userId, {
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        token,
      });

      if (!updatedLink) {
        res.status(404).json({ error: 'Short link not found' });
        return;
      }

      res.status(200).json({
        message: 'Link updated successfully',
        data: updatedLink,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('unauthorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  /**
   * DELETE /api/links/:id
   * Delete a short link
   */
  deleteLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: User ID missing' });
        return;
      }

      const deleted = await this.service.deleteLink(id, userId);

      if (!deleted) {
        res.status(404).json({ error: 'Short link not found' });
        return;
      }

      res.status(200).json({
        message: 'Link deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('unauthorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      next(error);
    }
  };

  /**
   * GET /:shortCode
   * Public redirect endpoint
   * Redirects to original URL and tracks analytics
   */
  redirect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { shortCode } = req.params;

      // Extract metadata for analytics
      const metadata = {
        ipAddress: (req.ip || req.socket.remoteAddress || '').replace('::ffff:', ''),
        userAgent: req.headers['user-agent'] || '',
        referrer: req.headers['referer'] || '',
      };

      const originalUrl = await this.service.redirect(shortCode, metadata);

      res.redirect(302, originalUrl);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Short link not found') {
          res.status(404).json({ error: 'Short link not found' });
          return;
        }
        if (error.message === 'Short link has expired') {
          res.status(410).json({ error: 'Short link has expired' });
          return;
        }
      }
      next(error);
    }
  };
}
