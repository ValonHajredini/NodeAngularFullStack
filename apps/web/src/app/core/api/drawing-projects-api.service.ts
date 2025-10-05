import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiClientService } from './api-client.service';
import {
  DrawingProject,
  CreateDrawingProjectRequest,
  UpdateDrawingProjectRequest,
  GetDrawingProjectResponse,
  GetDrawingProjectsResponse,
  SaveDrawingProjectResponse,
  DeleteDrawingProjectResponse,
} from '@nodeangularfullstack/shared';

/**
 * API service for drawing projects management.
 * Handles HTTP requests for CRUD operations on user drawing projects.
 */
@Injectable({ providedIn: 'root' })
export class DrawingProjectsApiService {
  private readonly apiClient = inject(ApiClientService);
  private readonly baseUrl = '/drawing-projects';

  /**
   * Retrieves all drawing projects for the authenticated user.
   * @param activeOnly - If true, only return active projects
   * @returns Observable containing array of projects
   * @example
   * service.getProjects(true).subscribe(projects => {
   *   console.log('Active projects:', projects);
   * });
   */
  getProjects(activeOnly = false): Observable<DrawingProject[]> {
    const url = activeOnly ? `${this.baseUrl}?activeOnly=true` : this.baseUrl;

    return this.apiClient
      .get<GetDrawingProjectsResponse>(url)
      .pipe(map((response) => response.data.projects));
  }

  /**
   * Retrieves a single drawing project by ID.
   * @param projectId - Project UUID
   * @returns Observable containing the project
   * @throws {HttpErrorResponse} When project not found or unauthorized
   * @example
   * service.getProjectById('123-456').subscribe(project => {
   *   console.log('Project:', project);
   * });
   */
  getProjectById(projectId: string): Observable<DrawingProject> {
    return this.apiClient
      .get<GetDrawingProjectResponse>(`${this.baseUrl}/${projectId}`)
      .pipe(map((response) => response.data.project));
  }

  /**
   * Creates a new drawing project.
   * @param projectData - Project creation data
   * @returns Observable containing the created project
   * @throws {HttpErrorResponse} When creation fails
   * @example
   * service.createProject({
   *   name: 'My Drawing',
   *   description: 'A great drawing',
   *   templateData: { ... },
   *   thumbnail: 'data:image/png;base64,...'
   * }).subscribe(project => {
   *   console.log('Created:', project);
   * });
   */
  createProject(projectData: CreateDrawingProjectRequest): Observable<DrawingProject> {
    return this.apiClient
      .post<SaveDrawingProjectResponse>(this.baseUrl, projectData)
      .pipe(map((response) => response.data.project));
  }

  /**
   * Updates an existing drawing project.
   * @param projectId - Project UUID to update
   * @param updateData - Fields to update
   * @returns Observable containing the updated project
   * @throws {HttpErrorResponse} When update fails or unauthorized
   * @example
   * service.updateProject('123-456', {
   *   name: 'Updated Name',
   *   templateData: { ... }
   * }).subscribe(project => {
   *   console.log('Updated:', project);
   * });
   */
  updateProject(
    projectId: string,
    updateData: UpdateDrawingProjectRequest,
  ): Observable<DrawingProject> {
    return this.apiClient
      .put<SaveDrawingProjectResponse>(`${this.baseUrl}/${projectId}`, updateData)
      .pipe(map((response) => response.data.project));
  }

  /**
   * Deletes a drawing project.
   * @param projectId - Project UUID to delete
   * @returns Observable containing success status
   * @throws {HttpErrorResponse} When deletion fails or unauthorized
   * @example
   * service.deleteProject('123-456').subscribe(() => {
   *   console.log('Project deleted');
   * });
   */
  deleteProject(projectId: string): Observable<void> {
    return this.apiClient
      .delete<DeleteDrawingProjectResponse>(`${this.baseUrl}/${projectId}`)
      .pipe(map(() => undefined));
  }
}
