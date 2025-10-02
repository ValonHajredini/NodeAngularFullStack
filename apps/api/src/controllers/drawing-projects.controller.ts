import { Request, Response } from 'express';
import { drawingProjectsRepository } from '../repositories/drawing-projects.repository';
import {
  CreateDrawingProjectRequest,
  UpdateDrawingProjectRequest,
  GetDrawingProjectResponse,
  GetDrawingProjectsResponse,
  SaveDrawingProjectResponse,
  DeleteDrawingProjectResponse,
} from '@nodeangularfullstack/shared';

/**
 * Controller for drawing projects management.
 * Handles CRUD operations for user drawing projects with authentication.
 */
export class DrawingProjectsController {
  /**
   * Get all projects for the authenticated user.
   * @route GET /api/drawing-projects
   * @access Authenticated users
   * @param req - Express request object
   * @param res - Express response object
   * @example
   * GET /api/drawing-projects
   * GET /api/drawing-projects?activeOnly=true
   */
  async getProjects(req: Request, res: Response): Promise<void> {
    try {
      console.log('🎨 [DrawingProjectsController] getProjects invoked');
      // User ID is set by authentication middleware
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      // Check for activeOnly query parameter
      const activeOnly = req.query.activeOnly === 'true';

      // Get tenant context from request (set by tenant middleware)
      const tenantContext = (req as any).tenantContext;

      const projects = await drawingProjectsRepository.findByUserId(
        userId,
        activeOnly,
        tenantContext
      );

      const response: GetDrawingProjectsResponse = {
        success: true,
        data: {
          projects,
          total: projects.length,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve projects',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get a single project by ID.
   * Validates user ownership via RLS policies.
   * @route GET /api/drawing-projects/:id
   * @access Authenticated users (owner only)
   * @param req - Express request object
   * @param res - Express response object
   * @example
   * GET /api/drawing-projects/123e4567-e89b-12d3-a456-426614174000
   */
  async getProjectById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const tenantContext = (req as any).tenantContext;
      const project = await drawingProjectsRepository.findProjectById(
        id,
        tenantContext
      );

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found or unauthorized',
        });
        return;
      }

      // Double-check ownership (RLS should already handle this)
      if (project.userId !== userId) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized access to project',
        });
        return;
      }

      const response: GetDrawingProjectResponse = {
        success: true,
        data: {
          project,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Get project by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve project',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create a new drawing project.
   * @route POST /api/drawing-projects
   * @access Authenticated users
   * @param req - Express request object with CreateDrawingProjectRequest body
   * @param res - Express response object
   * @example
   * POST /api/drawing-projects
   * {
   *   "name": "My Drawing",
   *   "description": "A great drawing",
   *   "templateData": { ... },
   *   "thumbnail": "data:image/png;base64,..."
   * }
   */
  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const projectData: CreateDrawingProjectRequest = req.body;

      // Validate required fields
      if (!projectData.name || !projectData.templateData) {
        res.status(400).json({
          success: false,
          message: 'Name and templateData are required',
        });
        return;
      }

      const tenantContext = (req as any).tenantContext;
      const project = await drawingProjectsRepository.createProject(
        userId,
        projectData,
        tenantContext
      );

      const response: SaveDrawingProjectResponse = {
        success: true,
        data: {
          project,
        },
        message: 'Project created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create project',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update an existing drawing project.
   * RLS policies ensure user can only update their own projects.
   * @route PUT /api/drawing-projects/:id
   * @access Authenticated users (owner only)
   * @param req - Express request object with UpdateDrawingProjectRequest body
   * @param res - Express response object
   * @example
   * PUT /api/drawing-projects/123e4567-e89b-12d3-a456-426614174000
   * {
   *   "name": "Updated Name",
   *   "templateData": { ... }
   * }
   */
  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const updateData: UpdateDrawingProjectRequest = req.body;

      // Validate at least one field to update
      if (
        !updateData.name &&
        !updateData.description &&
        !updateData.templateData &&
        !updateData.thumbnail &&
        updateData.isActive === undefined
      ) {
        res.status(400).json({
          success: false,
          message: 'At least one field must be provided for update',
        });
        return;
      }

      const tenantContext = (req as any).tenantContext;

      // First verify ownership
      const existingProject = await drawingProjectsRepository.findProjectById(
        id,
        tenantContext
      );

      if (!existingProject) {
        res.status(404).json({
          success: false,
          message: 'Project not found',
        });
        return;
      }

      if (existingProject.userId !== userId) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized to update this project',
        });
        return;
      }

      const project = await drawingProjectsRepository.updateProject(
        id,
        updateData,
        tenantContext
      );

      const response: SaveDrawingProjectResponse = {
        success: true,
        data: {
          project,
        },
        message: 'Project updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update project',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete a drawing project (hard delete).
   * RLS policies ensure user can only delete their own projects.
   * @route DELETE /api/drawing-projects/:id
   * @access Authenticated users (owner only)
   * @param req - Express request object
   * @param res - Express response object
   * @example
   * DELETE /api/drawing-projects/123e4567-e89b-12d3-a456-426614174000
   */
  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const tenantContext = (req as any).tenantContext;

      // First verify ownership
      const existingProject = await drawingProjectsRepository.findProjectById(
        id,
        tenantContext
      );

      if (!existingProject) {
        res.status(404).json({
          success: false,
          message: 'Project not found',
        });
        return;
      }

      if (existingProject.userId !== userId) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized to delete this project',
        });
        return;
      }

      await drawingProjectsRepository.deleteProject(id, tenantContext);

      const response: DeleteDrawingProjectResponse = {
        success: true,
        message: 'Project deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete project',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Singleton instance of DrawingProjectsController.
 * Used for route binding.
 */
export const drawingProjectsController = new DrawingProjectsController();
