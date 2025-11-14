import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { ApiClientService } from '@core/api/api-client.service';
import {
  FormTemplate,
  FormSchema,
  ApiResponse,
  CreateFormTemplateRequest,
  UpdateFormTemplateRequest,
  CategoryMetrics,
  TemplateWizardConfig,
  detectTemplateCategory,
} from '@nodeangularfullstack/shared';

/**
 * Service for interacting with form templates API.
 * Handles template fetching, filtering, application, and CRUD operations for template management.
 * Provides methods to apply templates and generate new form schemas from templates.
 *
 * **Features:**
 * - Fetch templates with optional category filtering
 * - Create, update, and delete templates (admin only)
 * - Apply templates to generate form schemas
 * - Client-side caching with shareReplay() for performance
 * - Category detection helpers
 *
 * @example Basic Usage
 * ```typescript
 * constructor(private templatesApi: TemplatesApiService) {}
 *
 * ngOnInit() {
 *   this.templatesApi.getAllTemplates().subscribe({
 *     next: (templates) => console.log('Templates:', templates),
 *     error: (err) => console.error('Error:', err),
 *   });
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class TemplatesApiService {
  private readonly apiClient = inject(ApiClientService);
  private cache$: Observable<FormTemplate[]> | null = null;

  /**
   * Fetches all active templates with optional category filter.
   * Returns templates sorted by usage count (most popular first) by default.
   * @param category - Optional category filter (e.g., 'ecommerce', 'services')
   * @returns Observable of templates array (unwrapped from API response)
   * @throws {HttpErrorResponse} When fetch fails
   * @example
   * templatesApiService.getTemplates('ecommerce').subscribe(templates => {
   *   console.log('E-commerce templates:', templates);
   * });
   */
  getTemplates(category?: string): Observable<FormTemplate[]> {
    const params: Record<string, string> = {};
    if (category) {
      params['category'] = category;
    }

    return this.apiClient
      .get<ApiResponse<FormTemplate[]>>('/templates', {
        params,
      })
      .pipe(
        map((response) => response.data?.map((template) => this.convertTemplateDates(template)) || []),
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
   * @returns Observable of template details (unwrapped from API response)
   * @throws {HttpErrorResponse} 404 if template not found, 403 if access denied
   * @example
   * templatesApiService.getTemplateById('template-123').subscribe(template => {
   *   console.log('Template details:', template);
   * });
   */
  getTemplateById(id: string): Observable<FormTemplate> {
    return this.apiClient
      .get<ApiResponse<FormTemplate>>(`/templates/${id}`)
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('No template data returned from API');
          }
          return this.convertTemplateDates(response.data);
        }),
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
   * @returns Observable of form schema (unwrapped from API response), ready for form builder
   * @throws {HttpErrorResponse} 404 if template not found, 500 if application fails
   * @example
   * templatesApiService.applyTemplate('template-123').subscribe(formSchema => {
   *   // formSchema contains the new form schema with all fields and settings
   *   formBuilderService.loadFormSchema(formSchema);
   * });
   */
  applyTemplate(templateId: string): Observable<FormSchema> {
    return this.apiClient
      .post<ApiResponse<FormSchema>>(`/templates/${templateId}/apply`, {})
      .pipe(
        map((response) => {
          if (!response.data) {
            throw new Error('No form schema returned from template application');
          }
          return response.data;
        }),
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

  /**
   * Fetch all templates from the API with caching.
   * Results are cached to reduce unnecessary HTTP requests.
   *
   * @returns Observable array of FormTemplate objects
   * @throws {Error} Network or server errors
   *
   * @example
   * ```typescript
   * this.templatesApi.getAllTemplates().subscribe({
   *   next: (templates) => this.templates = templates,
   *   error: (err) => console.error('Failed to fetch templates:', err)
   * });
   * ```
   */
  getAllTemplates(): Observable<FormTemplate[]> {
    if (!this.cache$) {
      this.cache$ = this.apiClient
        .get<ApiResponse<FormTemplate[]>>('/templates')
        .pipe(
          map((response) => response.data?.map((t) => this.convertTemplateDates(t)) || []),
          catchError((error) => {
            console.error('Failed to fetch all templates:', error);
            return throwError(() => error);
          }),
          shareReplay(1),
        );
    }
    return this.cache$;
  }

  /**
   * Create a new form template.
   * Clears cache after successful creation.
   *
   * @param template - Template creation data
   * @returns Observable of created FormTemplate
   * @throws {Error} Validation errors or server errors
   *
   * @example
   * ```typescript
   * const newTemplate: CreateFormTemplateRequest = {
   *   name: 'Product Order Form',
   *   category: TemplateCategory.ECOMMERCE,
   *   templateSchema: { fields: [], settings: {} },
   *   description: 'A form for ordering products'
   * };
   * this.templatesApi.createTemplate(newTemplate).subscribe({
   *   next: (created) => console.log('Created template:', created),
   *   error: (err) => console.error('Creation failed:', err)
   * });
   * ```
   */
  createTemplate(template: CreateFormTemplateRequest): Observable<FormTemplate> {
    return this.apiClient
      .post<ApiResponse<FormTemplate>>('/templates', template)
      .pipe(
        map((response) => {
          if (response.data) {
            this.refreshCache();
            return this.convertTemplateDates(response.data);
          }
          throw new Error('No data returned from create template');
        }),
        catchError((error) => {
          console.error('Failed to create template:', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Update an existing form template.
   * Clears cache after successful update.
   *
   * @param id - Template UUID
   * @param updates - Partial template data to update
   * @returns Observable of updated FormTemplate
   * @throws {Error} Validation errors, 404 if not found
   *
   * @example
   * ```typescript
   * this.templatesApi.updateTemplate('123-uuid', {
   *   name: 'Updated Name',
   *   isActive: false
   * }).subscribe({
   *   next: (updated) => console.log('Updated template:', updated),
   *   error: (err) => console.error('Update failed:', err)
   * });
   * ```
   */
  updateTemplate(id: string, updates: UpdateFormTemplateRequest): Observable<FormTemplate> {
    return this.apiClient
      .patch<ApiResponse<FormTemplate>>(`/templates/${id}`, updates)
      .pipe(
        map((response) => {
          if (response.data) {
            this.refreshCache();
            return this.convertTemplateDates(response.data);
          }
          throw new Error('No data returned from update template');
        }),
        catchError((error) => {
          console.error(`Failed to update template ${id}:`, error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Delete a form template (soft delete - sets isActive to false).
   * Clears cache after successful deletion.
   *
   * @param id - Template UUID
   * @returns Observable of void (no response body)
   * @throws {Error} 404 if not found, server errors
   *
   * @example
   * ```typescript
   * this.templatesApi.deleteTemplate('123-uuid').subscribe({
   *   next: () => console.log('Template deleted'),
   *   error: (err) => console.error('Deletion failed:', err)
   * });
   * ```
   */
  deleteTemplate(id: string): Observable<void> {
    return this.apiClient
      .delete<ApiResponse<void>>(`/templates/${id}`)
      .pipe(
        map(() => {
          this.refreshCache();
          return;
        }),
        catchError((error) => {
          console.error(`Failed to delete template ${id}:`, error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Clear the templates cache.
   * Forces the next getAllTemplates() call to fetch fresh data.
   *
   * Call this method after mutations (create, update, delete) or when
   * you need to ensure fresh data.
   *
   * @example
   * ```typescript
   * // After external changes
   * this.templatesApi.refreshCache();
   * this.templatesApi.getAllTemplates().subscribe(...);
   * ```
   */
  refreshCache(): void {
    this.cache$ = null;
  }

  /**
   * Helper method to detect template category from form schema
   * Uses Epic 30 shared utilities for category detection
   * @param schema - Form schema to analyze
   * @returns Detected template category or null
   * @since Epic 30, Story 30.1
   */
  detectFormCategory(schema: FormSchema) {
    return detectTemplateCategory(schema);
  }

  /**
   * Type guard to validate category metrics structure
   * Ensures CategoryMetrics type compilation
   * @param metrics - Metrics object to validate
   * @returns True if metrics has valid category discriminator
   * @since Epic 30, Story 30.1
   */
  isValidCategoryMetrics(metrics: any): metrics is CategoryMetrics {
    return (
      metrics &&
      typeof metrics.category === 'string' &&
      typeof metrics.totalSubmissions === 'number'
    );
  }

  /**
   * Type guard to validate wizard configuration
   * Ensures TemplateWizardConfig type compilation
   * @param config - Configuration object to validate
   * @returns True if config has valid category discriminator
   * @since Epic 30, Story 30.1
   */
  isValidWizardConfig(config: any): config is TemplateWizardConfig {
    return (
      config &&
      typeof config.category === 'string' &&
      Array.isArray(config.steps) &&
      Array.isArray(config.allowedFields)
    );
  }
}
