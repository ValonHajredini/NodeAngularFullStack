import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { toolConfigService } from '../services/tool-config.service';
import {
  CreateToolConfigRequest,
  UpdateToolConfigRequest,
} from '@nodeangularfullstack/shared';

/**
 * Tool configurations controller for handling config-related HTTP requests.
 * Provides endpoints for CRUD operations on tool configurations.
 */
export class ToolConfigsController {
  /**
   * Retrieves all configurations for a specific tool.
   * GET /api/tools/:toolKey/configs
   *
   * @param req - Express request object with toolKey param
   * @param res - Express response object
   * @param next - Express next function
   * @example
   * GET /api/tools/short-link/configs
   * Response: { success: true, data: { configs: [...], activeConfig: {...} } }
   */
  async getConfigs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const { toolKey } = req.params;

      const response = await toolConfigService.getToolConfigs(toolKey);

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getConfigs controller:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      next(error);
    }
  }

  /**
   * Retrieves the active configuration for a specific tool.
   * GET /api/tools/:toolKey/configs/active
   *
   * @param req - Express request object with toolKey param
   * @param res - Express response object
   * @param next - Express next function
   * @example
   * GET /api/tools/short-link/configs/active
   * Response: { success: true, data: { config: {...} } }
   */
  async getActiveConfig(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const { toolKey } = req.params;

      const response = await toolConfigService.getActiveConfig(toolKey);

      if (!response) {
        res.status(404).json({
          success: false,
          message: 'No active configuration found for this tool',
        });
        return;
      }

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getActiveConfig controller:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      next(error);
    }
  }

  /**
   * Creates a new tool configuration.
   * POST /api/tools/:toolKey/configs
   *
   * @param req - Express request object with toolKey param and config data in body
   * @param res - Express response object
   * @param next - Express next function
   * @example
   * POST /api/tools/short-link/configs
   * Body: { version: "1.1.0", displayMode: "full-width", isActive: true }
   * Response: { success: true, data: { config: {...} } }
   */
  async createConfig(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const { toolKey } = req.params;
      const configRequest: CreateToolConfigRequest = req.body;

      const response = await toolConfigService.createConfig(
        toolKey,
        configRequest
      );

      res.status(201).json(response);
    } catch (error) {
      console.error('Error in createConfig controller:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            message: error.message,
          });
          return;
        }

        if (
          error.message.includes('Invalid version') ||
          error.message.includes('already exists')
        ) {
          res.status(400).json({
            success: false,
            message: error.message,
          });
          return;
        }
      }

      next(error);
    }
  }

  /**
   * Updates an existing tool configuration.
   * PUT /api/tools/:toolKey/configs/:configId
   *
   * @param req - Express request object with toolKey, configId params and update data in body
   * @param res - Express response object
   * @param next - Express next function
   * @example
   * PUT /api/tools/short-link/configs/uuid
   * Body: { displayMode: "full-width" }
   * Response: { success: true, data: { config: {...} } }
   */
  async updateConfig(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const { toolKey, configId } = req.params;
      const updateRequest: UpdateToolConfigRequest = req.body;

      const response = await toolConfigService.updateConfig(
        toolKey,
        configId,
        updateRequest
      );

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateConfig controller:', error);

      if (error instanceof Error) {
        if (
          error.message.includes('not found') ||
          error.message.includes('does not belong')
        ) {
          res.status(404).json({
            success: false,
            message: error.message,
          });
          return;
        }

        if (
          error.message.includes('Invalid version') ||
          error.message.includes('already exists')
        ) {
          res.status(400).json({
            success: false,
            message: error.message,
          });
          return;
        }
      }

      next(error);
    }
  }

  /**
   * Sets a configuration as active.
   * PUT /api/tools/:toolKey/configs/:configId/activate
   *
   * @param req - Express request object with toolKey and configId params
   * @param res - Express response object
   * @param next - Express next function
   * @example
   * PUT /api/tools/short-link/configs/uuid/activate
   * Response: { success: true, data: { config: {...} } }
   */
  async activateConfig(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const { toolKey, configId } = req.params;

      const response = await toolConfigService.activateConfig(
        toolKey,
        configId
      );

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in activateConfig controller:', error);

      if (error instanceof Error) {
        if (
          error.message.includes('not found') ||
          error.message.includes('does not belong')
        ) {
          res.status(404).json({
            success: false,
            message: error.message,
          });
          return;
        }
      }

      next(error);
    }
  }

  /**
   * Deletes a tool configuration.
   * DELETE /api/tools/:toolKey/configs/:configId
   *
   * @param req - Express request object with toolKey and configId params
   * @param res - Express response object
   * @param next - Express next function
   * @example
   * DELETE /api/tools/short-link/configs/uuid
   * Response: { success: true, message: "Configuration deleted successfully" }
   */
  async deleteConfig(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const { toolKey, configId } = req.params;

      const response = await toolConfigService.deleteConfig(toolKey, configId);

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in deleteConfig controller:', error);

      if (error instanceof Error) {
        if (
          error.message.includes('not found') ||
          error.message.includes('does not belong')
        ) {
          res.status(404).json({
            success: false,
            message: error.message,
          });
          return;
        }

        if (error.message.includes('Cannot delete')) {
          res.status(400).json({
            success: false,
            message: error.message,
          });
          return;
        }
      }

      next(error);
    }
  }
}

// Export singleton instance
export const toolConfigsController = new ToolConfigsController();
