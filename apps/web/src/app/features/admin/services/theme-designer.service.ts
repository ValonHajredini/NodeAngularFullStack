import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FormTheme,
  CreateCustomThemeRequest,
  UpdateThemeRequest,
  ThemeValidationResult,
} from '@nodeangularfullstack/shared';
import { environment } from '../../../../environments/environment';

/**
 * API response wrapper for theme operations
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Theme usage statistics interface
 */
interface ThemeUsage {
  formsCount: number;
  publishedFormsCount: number;
  lastUsed?: Date;
  formsList: Array<{
    id: string;
    title: string;
    published: boolean;
    lastModified: Date;
  }>;
}

/**
 * Service for managing theme designer operations.
 * Handles CRUD operations for custom themes and validation.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeDesignerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/themes`;

  /**
   * Creates a new custom theme.
   * @param theme - The theme configuration to create
   * @returns Observable of the created theme
   * @example
   * themeDesignerService.createCustomTheme(theme).subscribe(
   *   createdTheme => console.log('Theme created:', createdTheme)
   * );
   */
  createCustomTheme(theme: FormTheme): Observable<FormTheme> {
    // Clean theme config to remove empty string values (validator treats "" as invalid URL)
    const cleanedThemeConfig = this.cleanThemeConfig(theme.themeConfig);

    const request = {
      name: theme.name,
      description: theme.description,
      thumbnailUrl: this.generateThumbnailUrl(theme),
      themeConfig: cleanedThemeConfig,
    };

    return this.http.post<ApiResponse<FormTheme>>(`${this.apiUrl}`, request).pipe(
      map((response) => response.data),
      catchError(this.handleError),
    );
  }

  /**
   * Updates an existing custom theme.
   * @param themeId - The ID of the theme to update
   * @param updates - The theme updates to apply
   * @returns Observable of the updated theme
   * @example
   * themeDesignerService.updateCustomTheme('theme-id', updates).subscribe(
   *   updatedTheme => console.log('Theme updated:', updatedTheme)
   * );
   */
  updateCustomTheme(themeId: string, updates: Partial<FormTheme>): Observable<FormTheme> {
    const request: UpdateThemeRequest = {
      name: updates.name,
      description: updates.description,
      themeConfig: updates.themeConfig,
      themeDefinition: updates.themeDefinition,
    };

    // Remove undefined values
    const cleanRequest = Object.fromEntries(
      Object.entries(request).filter(([_, value]) => value !== undefined),
    );

    return this.http.put<ApiResponse<FormTheme>>(`${this.apiUrl}/${themeId}`, cleanRequest).pipe(
      map((response) => response.data),
      catchError(this.handleError),
    );
  }

  /**
   * Retrieves all themes (predefined and custom) for admin management.
   * @returns Observable of all themes array
   * @example
   * themeDesignerService.getThemes().subscribe(
   *   themes => console.log('All themes:', themes)
   * );
   */
  getThemes(): Observable<FormTheme[]> {
    return this.http.get<ApiResponse<FormTheme[]>>(`${this.apiUrl}`).pipe(
      map((response) => response.data),
      catchError(this.handleError),
    );
  }

  /**
   * Retrieves all custom themes for the current user.
   * @returns Observable of custom themes array
   * @example
   * themeDesignerService.getUserCustomThemes().subscribe(
   *   themes => console.log('User themes:', themes)
   * );
   */
  getUserCustomThemes(): Observable<FormTheme[]> {
    return this.http.get<ApiResponse<FormTheme[]>>(`${this.apiUrl}/custom/user`).pipe(
      map((response) => response.data),
      catchError(this.handleError),
    );
  }

  /**
   * Retrieves a specific theme by ID.
   * @param themeId - The ID of the theme to retrieve
   * @returns Observable of the theme
   * @example
   * themeDesignerService.getTheme('theme-id').subscribe(
   *   theme => console.log('Theme:', theme)
   * );
   */
  getTheme(themeId: string): Observable<FormTheme> {
    return this.http.get<ApiResponse<FormTheme>>(`${this.apiUrl}/${themeId}`).pipe(
      map((response) => response.data),
      catchError(this.handleError),
    );
  }

  /**
   * Retrieves theme usage statistics.
   * @param themeId - The ID of the theme to get usage for
   * @returns Observable of theme usage data
   * @example
   * themeDesignerService.getThemeUsage('theme-id').subscribe(
   *   usage => console.log('Theme usage:', usage)
   * );
   */
  getThemeUsage(themeId: string): Observable<ThemeUsage> {
    return this.http.get<ApiResponse<ThemeUsage>>(`${this.apiUrl}/${themeId}/usage`).pipe(
      map((response) => response.data),
      catchError(this.handleError),
    );
  }

  /**
   * Deletes a custom theme.
   * @param themeId - The ID of the theme to delete
   * @returns Observable of the deletion result
   * @example
   * themeDesignerService.deleteCustomTheme('theme-id').subscribe(
   *   () => console.log('Theme deleted successfully')
   * );
   */
  deleteCustomTheme(themeId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${themeId}`).pipe(
      map(() => void 0),
      catchError(this.handleError),
    );
  }

  /**
   * Validates a theme definition for size and structure.
   * @param theme - The theme to validate
   * @returns Observable of validation result
   * @example
   * themeDesignerService.validateTheme(theme).subscribe(
   *   result => {
   *     if (result.valid) {
   *       console.log('Theme is valid');
   *     } else {
   *       console.error('Theme validation failed:', result.error);
   *     }
   *   }
   * );
   */
  validateTheme(theme: FormTheme): Observable<ThemeValidationResult> {
    const themeDefinition = this.generateThemeDefinition(theme);
    const sizeInBytes = new Blob([JSON.stringify(themeDefinition)]).size;
    const MAX_SIZE_KB = 50;
    const BYTES_PER_KB = 1024;
    const maxSizeBytes = MAX_SIZE_KB * BYTES_PER_KB;

    const result: ThemeValidationResult = {
      valid: sizeInBytes <= maxSizeBytes,
      sizeInBytes,
      error:
        sizeInBytes > maxSizeBytes
          ? `Theme definition exceeds 50KB limit (${sizeInBytes} bytes)`
          : undefined,
    };

    return new Observable((observer) => {
      observer.next(result);
      observer.complete();
    });
  }

  /**
   * Uploads a theme thumbnail image.
   * @param file - The image file to upload
   * @returns Observable of the uploaded image URL
   * @example
   * themeDesignerService.uploadThumbnail(file).subscribe(
   *   url => console.log('Thumbnail uploaded:', url)
   * );
   */
  uploadThumbnail(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('thumbnail', file);

    return this.http.post<ApiResponse<{ url: string }>>(`${this.apiUrl}/thumbnail`, formData).pipe(
      map((response) => response.data.url),
      catchError(this.handleError),
    );
  }

  /**
   * Generates a theme thumbnail URL from theme configuration.
   * In a real implementation, this would create a visual thumbnail.
   * @private
   * @param theme - The theme to generate thumbnail for
   * @returns Generated thumbnail URL
   */
  private generateThumbnailUrl(theme: FormTheme): string {
    // In a real implementation, this would:
    // 1. Generate a visual preview of the theme
    // 2. Upload it to storage service
    // 3. Return the URL

    // For now, return a placeholder based on primary color
    const primaryColor = theme.themeConfig.desktop.primaryColor.replace('#', '');
    return `https://via.placeholder.com/300x200/${primaryColor}/ffffff?text=${encodeURIComponent(theme.name)}`;
  }

  /**
   * Cleans theme configuration by removing empty string values.
   * This prevents validation errors on optional URL fields.
   * @private
   * @param themeConfig - The theme configuration to clean
   * @returns Cleaned theme configuration
   */
  private cleanThemeConfig(themeConfig: any): any {
    const cleanObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip empty strings
        if (value === '') {
          continue;
        }
        // Recursively clean nested objects
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          cleaned[key] = cleanObject(value);
        } else {
          cleaned[key] = value;
        }
      }
      return cleaned;
    };

    return cleanObject(themeConfig);
  }

  /**
   * Generates a theme definition object for storage.
   * @private
   * @param theme - The theme to generate definition for
   * @returns Theme definition object
   */
  private generateThemeDefinition(theme: FormTheme): Record<string, unknown> {
    return {
      version: '1.0',
      metadata: {
        name: theme.name,
        description: theme.description,
        createdAt: new Date().toISOString(),
        generator: 'theme-designer',
      },
      config: theme.themeConfig,
      preview: {
        primaryColor: theme.themeConfig.desktop.primaryColor,
        secondaryColor: theme.themeConfig.desktop.secondaryColor,
        backgroundColor: theme.themeConfig.desktop.backgroundColor,
      },
    };
  }

  /**
   * Handles HTTP errors and converts them to user-friendly messages.
   * @private
   * @param error - The HTTP error response
   * @returns Observable that throws a formatted error
   */
  private handleError(error: unknown): Observable<never> {
    let errorMessage = 'An unexpected error occurred';

    // Type guard to check if error has the expected structure
    if (this.isHttpErrorResponse(error)) {
      if (error.error) {
        if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (this.hasMessage(error.error)) {
          errorMessage = error.error.message;
        } else if (this.hasError(error.error)) {
          errorMessage = error.error.error;
        }
      } else if (this.hasMessage(error)) {
        errorMessage = error.message;
      }
    }

    return throwError(() => ({
      message: errorMessage,
      status: this.isHttpErrorResponse(error) ? error.status : undefined,
      statusText: this.isHttpErrorResponse(error) ? error.statusText : undefined,
    }));
  }

  /**
   * Type guard to check if error is an HTTP error response.
   */
  private isHttpErrorResponse(
    error: unknown,
  ): error is { status: number; statusText: string; error: unknown; message?: string } {
    return typeof error === 'object' && error !== null && 'status' in error;
  }

  /**
   * Type guard to check if object has message property.
   */
  private hasMessage(obj: unknown): obj is { message: string } {
    return typeof obj === 'object' && obj !== null && 'message' in obj;
  }

  /**
   * Type guard to check if object has error property.
   */
  private hasError(obj: unknown): obj is { error: string } {
    return typeof obj === 'object' && obj !== null && 'error' in obj;
  }

  /**
   * Exports a theme configuration as JSON file.
   * @param theme - The theme to export
   * @param filename - Optional custom filename
   * @example
   * themeDesignerService.exportTheme(theme, 'my-custom-theme.json');
   */
  exportTheme(theme: FormTheme, filename?: string): void {
    const themeDefinition = this.generateThemeDefinition(theme);
    const dataStr = JSON.stringify(themeDefinition, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = filename || `${theme.name.replace(/\s+/g, '-').toLowerCase()}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  }

  /**
   * Imports a theme configuration from JSON file.
   * @param file - The JSON file containing theme definition
   * @returns Observable of the imported theme
   * @example
   * themeDesignerService.importTheme(file).subscribe(
   *   theme => console.log('Theme imported:', theme)
   * );
   */
  importTheme(file: File): Observable<FormTheme> {
    return new Observable((observer) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const themeDefinition = JSON.parse(event.target?.result as string);

          // Convert theme definition back to FormTheme
          const theme: FormTheme = {
            id: 'imported-' + Date.now(),
            name: themeDefinition.metadata.name,
            description: themeDefinition.metadata.description,
            thumbnailUrl: this.generateThumbnailUrl({
              name: themeDefinition.metadata.name,
              themeConfig: themeDefinition.config,
            } as FormTheme),
            themeConfig: themeDefinition.config,
            usageCount: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            isCustom: true,
            creatorId: 'current-user',
            themeDefinition,
          };

          observer.next(theme);
          observer.complete();
        } catch (error) {
          observer.error({
            message: 'Invalid theme file format',
            details: error,
          });
        }
      };

      reader.onerror = () => {
        observer.error({
          message: 'Failed to read theme file',
        });
      };

      reader.readAsText(file);
    });
  }
}
