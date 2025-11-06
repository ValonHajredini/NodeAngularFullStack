import { Pool } from 'pg';
import { databaseService } from '../services/database.service';
import { BaseRepository } from './base.repository';
import {
  DrawingProject,
  CreateDrawingProjectRequest,
  UpdateDrawingProjectRequest,
  DrawingTemplate,
} from '@nodeangularfullstack/shared';

/**
 * Drawing project database entity interface matching the database schema.
 */
export interface DrawingProjectEntity {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  template_data: DrawingTemplate;
  thumbnail?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Drawing projects repository for database operations.
 * Handles all drawing project-related database queries with proper error handling.
 * Projects are scoped to specific users via RLS policies.
 */
export class DrawingProjectsRepository extends BaseRepository<DrawingProjectEntity> {
  constructor() {
    super('drawing_projects');
  }

  protected get pool(): Pool {
    return databaseService.getPool();
  }

  /**
   * Transforms database entity to domain model.
   * Converts snake_case to camelCase and Date strings to Date objects.
   * @param entity - Database entity
   * @returns Domain model DrawingProject
   */
  private toDomainModel(entity: DrawingProjectEntity): DrawingProject {
    return {
      id: entity.id,
      userId: entity.user_id,
      name: entity.name,
      description: entity.description || undefined,
      templateData: entity.template_data,
      thumbnail: entity.thumbnail || undefined,
      isActive: entity.is_active,
      createdAt: new Date(entity.created_at),
      updatedAt: new Date(entity.updated_at),
    };
  }

  /**
   * Creates a new drawing project in the database.
   * @param userId - User ID who owns the project
   * @param projectData - Project data for creation
   * @param tenantContext - Optional tenant context for multi-tenancy
   * @returns Promise containing the created project
   * @throws {Error} When project creation fails
   * @example
   * const project = await repository.create('user-id', {
   *   name: 'My Drawing',
   *   description: 'A great drawing',
   *   templateData: { ... },
   *   thumbnail: 'data:image/png;base64,...'
   * });
   */
  async createProject(
    userId: string,
    projectData: CreateDrawingProjectRequest,
    tenantContext?: any
  ): Promise<DrawingProject> {
    const query = `
      INSERT INTO drawing_projects (user_id, name, description, template_data, thumbnail)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [
      userId,
      projectData.name,
      projectData.description || null,
      JSON.stringify(projectData.templateData),
      projectData.thumbnail || null,
    ];

    try {
      const result = await this.executeQuery(query, values, tenantContext);
      const rows = result.rows as DrawingProjectEntity[] | undefined;

      if (!rows || rows.length === 0) {
        throw new Error('Failed to create drawing project');
      }

      return this.toDomainModel(rows[0]);
    } catch (error) {
      throw new Error(
        `Failed to create drawing project: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Finds all drawing projects for a specific user.
   * @param userId - User ID to find projects for
   * @param activeOnly - If true, only return active projects (default: false)
   * @param tenantContext - Optional tenant context for multi-tenancy
   * @returns Promise containing array of projects
   * @example
   * const projects = await repository.findByUserId('user-id', true);
   */
  async findByUserId(
    userId: string,
    activeOnly: boolean = false,
    tenantContext?: any
  ): Promise<DrawingProject[]> {
    const query = activeOnly
      ? `SELECT * FROM drawing_projects WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC;`
      : `SELECT * FROM drawing_projects WHERE user_id = $1 ORDER BY created_at DESC;`;

    const values = [userId];

    try {
      const result = await this.executeQuery(query, values, tenantContext);

      const rows = (result.rows as DrawingProjectEntity[] | undefined) ?? [];

      return rows.map((entity: DrawingProjectEntity) =>
        this.toDomainModel(entity)
      );
    } catch (error) {
      throw new Error(
        `Failed to fetch user projects: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Finds a drawing project by ID.
   * Validates user ownership via RLS policies.
   * @param projectId - Project ID to find
   * @param tenantContext - Optional tenant context for multi-tenancy
   * @returns Promise containing the project or null if not found
   * @example
   * const project = await repository.findById('project-id');
   */
  async findProjectById(
    projectId: string,
    tenantContext?: any
  ): Promise<DrawingProject | null> {
    const query = `SELECT * FROM drawing_projects WHERE id = $1;`;
    const values = [projectId];

    try {
      const result = await this.executeQuery(query, values, tenantContext);
      const rows = result.rows as DrawingProjectEntity[] | undefined;

      if (!rows || rows.length === 0) {
        return null;
      }

      return this.toDomainModel(rows[0]);
    } catch (error) {
      throw new Error(
        `Failed to fetch project: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Updates an existing drawing project.
   * RLS policies ensure user can only update their own projects.
   * @param projectId - Project ID to update
   * @param updateData - Fields to update
   * @param tenantContext - Optional tenant context for multi-tenancy
   * @returns Promise containing the updated project
   * @throws {Error} When update fails or project not found
   * @example
   * const updated = await repository.update('project-id', {
   *   name: 'Updated Name',
   *   templateData: { ... }
   * });
   */
  async updateProject(
    projectId: string,
    updateData: UpdateDrawingProjectRequest,
    tenantContext?: any
  ): Promise<DrawingProject> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updateData.name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      values.push(updateData.name);
      paramCount++;
    }

    if (updateData.description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      values.push(updateData.description || null);
      paramCount++;
    }

    if (updateData.templateData !== undefined) {
      updateFields.push(`template_data = $${paramCount}`);
      values.push(JSON.stringify(updateData.templateData));
      paramCount++;
    }

    if (updateData.thumbnail !== undefined) {
      updateFields.push(`thumbnail = $${paramCount}`);
      values.push(updateData.thumbnail || null);
      paramCount++;
    }

    if (updateData.isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount}`);
      values.push(updateData.isActive);
      paramCount++;
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(projectId);
    const query = `
      UPDATE drawing_projects
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *;
    `;

    try {
      const result = await this.executeQuery(query, values, tenantContext);
      const rows = result.rows as DrawingProjectEntity[] | undefined;

      if (!rows || rows.length === 0) {
        throw new Error('Project not found or unauthorized');
      }

      return this.toDomainModel(rows[0]);
    } catch (error) {
      throw new Error(
        `Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Deletes a drawing project.
   * RLS policies ensure user can only delete their own projects.
   * @param projectId - Project ID to delete
   * @param tenantContext - Optional tenant context for multi-tenancy
   * @returns Promise containing true if deleted
   * @throws {Error} When deletion fails or project not found
   * @example
   * await repository.delete('project-id');
   */
  async deleteProject(
    projectId: string,
    tenantContext?: any
  ): Promise<boolean> {
    const query = `DELETE FROM drawing_projects WHERE id = $1 RETURNING id;`;
    const values = [projectId];

    try {
      const result = await this.executeQuery(query, values, tenantContext);
      const rows = result.rows as Array<{ id: string }> | undefined;

      if (!rows || rows.length === 0) {
        throw new Error('Project not found or unauthorized');
      }

      return true;
    } catch (error) {
      throw new Error(
        `Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Soft-deletes a drawing project by setting is_active to false.
   * RLS policies ensure user can only update their own projects.
   * @param projectId - Project ID to soft-delete
   * @param tenantContext - Optional tenant context for multi-tenancy
   * @returns Promise containing the updated project
   * @example
   * await repository.softDelete('project-id');
   */
  async softDeleteProject(
    projectId: string,
    tenantContext?: any
  ): Promise<DrawingProject> {
    return this.updateProject(projectId, { isActive: false }, tenantContext);
  }
}

/**
 * Singleton instance of DrawingProjectsRepository.
 * Used across the application for drawing project operations.
 */
export const drawingProjectsRepository = new DrawingProjectsRepository();
