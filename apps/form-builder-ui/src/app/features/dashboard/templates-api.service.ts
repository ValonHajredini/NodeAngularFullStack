import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiClientService } from '@core/api/api-client.service';
import {
  FormTemplate,
  FormSchema,
  ApiResponse,
} from '@nodeangularfullstack/shared';

/**
 * Service for interacting with form templates API.
 * Handles template fetching, filtering, and application to form builder.
 * Provides methods to apply templates and generate new form schemas from templates.
 */
@Injectable({ providedIn: 'root' })
export class TemplatesApiService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Fetches all active templates with optional category filter.
   * Returns templates sorted by usage count (most popular first) by default.
   * @param category - Optional category filter (e.g., 'ecommerce', 'services')
   * @returns Observable of paginated templates wrapped in API response
   * @throws {HttpErrorResponse} When fetch fails
   * @example
   * templatesApiService.getTemplates('ecommerce').subscribe(response => {
   *   console.log('E-commerce templates:', response.data);
   * });
   */
  getTemplates(category?: string): Observable<ApiResponse<FormTemplate[]>> {
    const params: Record<string, string> = {};
    if (category) {
      params['category'] = category;
    }

    return this.apiClient
      .get<ApiResponse<FormTemplate[]>>('/templates', {
        params,
      })
      .pipe(
        map((response) => ({
          ...response,
          data: response.data?.map((template) => this.convertTemplateDates(template)) || [],
        })),
        catchError((error) => {
          console.error('Failed to fetch templates:', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Fetches a single template by ID.
   * Returns complete template details including schema and business logic config.
   * @param id - Template UUID to retrieve
   * @returns Observable of template details wrapped in API response
   * @throws {HttpErrorResponse} 404 if template not found, 403 if access denied
   * @example
   * templatesApiService.getTemplateById('template-123').subscribe(response => {
   *   console.log('Template details:', response.data);
   * });
   */
  getTemplateById(id: string): Observable<ApiResponse<FormTemplate>> {
    return this.apiClient
      .get<ApiResponse<FormTemplate>>(`/templates/${id}`)
      .pipe(
        map((response) => ({
          ...response,
          data: response.data ? this.convertTemplateDates(response.data) : undefined,
        })),
        catchError((error) => {
          console.error(`Failed to fetch template ${id}:`, error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Applies a template to create a new form schema.
   * Calls backend to deep-clone template schema and increment usage count.
   * Returns a ready-to-use form schema that can be loaded into the form builder.
   * @param templateId - Template UUID to apply
   * @returns Observable of form schema wrapped in API response, ready for form builder
   * @throws {HttpErrorResponse} 404 if template not found, 500 if application fails
   * @example
   * templatesApiService.applyTemplate('template-123').subscribe(response => {
   *   // response.data contains the new form schema with all fields and settings
   *   formBuilderService.loadFormSchema(response.data);
   * });
   */
  applyTemplate(templateId: string): Observable<ApiResponse<FormSchema>> {
    return this.apiClient
      .post<ApiResponse<FormSchema>>(`/templates/${templateId}/apply`, {})
      .pipe(
        catchError((error) => {
          console.error(`Failed to apply template ${templateId}:`, error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Converts template date strings from API to Date objects.
   * Ensures consistent date handling across the application.
   * @private
   * @param template - Template with string dates from API
   * @returns Template with converted Date objects
   */
  private convertTemplateDates(template: FormTemplate): FormTemplate {
    return {
      ...template,
      createdAt: new Date(template.createdAt),
      updatedAt: new Date(template.updatedAt),
    };
  }
}
