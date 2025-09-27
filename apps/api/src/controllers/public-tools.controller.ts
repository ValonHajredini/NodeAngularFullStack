import { Request, Response, NextFunction } from 'express';
import { toolsService } from '../services/tools.service';
import { Tool } from '@nodeangularfullstack/shared';

/**
 * Public interface for tool availability information.
 * Contains only public fields needed for feature gating.
 */
export interface PublicTool {
  /** Tool key identifier */
  key: string;
  /** Human-readable name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Brief description */
  description: string;
  /** Whether tool is enabled */
  active: boolean;
}

/**
 * Public tools controller for feature gating endpoints.
 * Provides public access to tool availability without authentication.
 * Only returns essential information needed for client-side feature gating.
 */
export class PublicToolsController {
  /**
   * Retrieve public tool status information for feature gating.
   * @route GET /api/v1/tools
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with public tool information
   */
  getPublicTools = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const toolsResponse = await toolsService.getTools();
      const tools = toolsResponse.data.tools;

      // Filter to only active tools and sanitize for public use
      const publicTools: PublicTool[] = tools
        .filter((tool: Tool) => tool.active)
        .map((tool: Tool) => ({
          key: tool.key,
          name: tool.name,
          slug: tool.slug,
          description: tool.description,
          active: tool.active,
        }));

      // Set cache headers for reasonable caching (5 minutes)
      res.set({
        'Cache-Control': 'public, max-age=300',
        ETag: `"tools-${Date.now()}"`,
        'Content-Type': 'application/json',
      });

      res.status(200).json({
        success: true,
        data: {
          tools: publicTools,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a tool by its slug for dynamic routing.
   * @route GET /api/v1/tools/slug/:slug
   * @param req - Express request object with tool slug parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with tool data or 404 if disabled/missing
   */
  getPublicToolBySlug = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { slug } = req.params;

      if (!slug || typeof slug !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Tool slug is required',
        });
        return;
      }

      const tool = await toolsService.getToolBySlug(slug);

      // Return 404 for disabled or non-existent tools
      if (!tool || !tool.active) {
        res.status(404).json({
          success: false,
          error: 'Tool not found or disabled',
        });
        return;
      }

      // Return public tool information
      const publicTool: PublicTool = {
        key: tool.key,
        name: tool.name,
        slug: tool.slug,
        description: tool.description,
        active: tool.active,
      };

      // Set cache headers
      res.set({
        'Cache-Control': 'public, max-age=300',
        ETag: `"tool-${slug}-${Date.now()}"`,
        'Content-Type': 'application/json',
      });

      res.status(200).json({
        success: true,
        data: {
          tool: publicTool,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if a specific tool is enabled.
   * @route GET /api/v1/tools/:key
   * @param req - Express request object with tool key parameter
   * @param res - Express response object
   * @param next - Express next function
   * @returns HTTP response with tool status or 404 if disabled/missing
   */
  getPublicToolStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { key } = req.params;

      if (!key || typeof key !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Tool key is required',
        });
        return;
      }

      const tool = await toolsService.getToolByKey(key);

      // Return 404 for disabled or non-existent tools
      if (!tool || !tool.active) {
        res.status(404).json({
          success: false,
          error: 'Tool not found or disabled',
        });
        return;
      }

      // Return public tool information
      const publicTool: PublicTool = {
        key: tool.key,
        name: tool.name,
        slug: tool.slug,
        description: tool.description,
        active: tool.active,
      };

      // Set cache headers
      res.set({
        'Cache-Control': 'public, max-age=300',
        ETag: `"tool-${key}-${Date.now()}"`,
        'Content-Type': 'application/json',
      });

      res.status(200).json({
        success: true,
        data: {
          tool: publicTool,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const publicToolsController = new PublicToolsController();
