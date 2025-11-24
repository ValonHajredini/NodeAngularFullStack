import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, FormTheme } from '@nodeangularfullstack/shared';
import { FormsApiClientService } from '@core/api/forms-api-client.service';

/**
 * Service for managing form themes via Forms API.
 * Handles fetching available themes and tracking theme applications.
 * Uses FormsApiClientService to communicate with forms-api.legopdf.com.
 */
@Injectable({ providedIn: 'root' })
export class ThemesApiService {
  private readonly api = inject(FormsApiClientService);

  /**
   * Fetches all available themes from the API.
   * Returns themes sorted by usage count (most popular first).
   * @returns Observable containing API response with themes array
   * @example
   * themesApi.getThemes().subscribe(response => {
   *   console.log('Available themes:', response.data);
   * });
   */
  getThemes(): Observable<ApiResponse<FormTheme[]>> {
    return this.api.get<ApiResponse<FormTheme[]>>('/api/v1/themes');
  }

  /**
   * Fetches all themes (predefined + custom) for use in theme dropdown.
   * The /themes endpoint returns both predefined and custom themes that are active.
   * Custom themes are distinguished by the isCustom property.
   * @returns Observable containing all available themes
   * @example
   * themesApi.getAllThemes().subscribe(themes => {
   *   const customThemes = themes.filter(t => t.isCustom);
   *   const predefinedThemes = themes.filter(t => !t.isCustom);
   * });
   */
  getAllThemes(): Observable<FormTheme[]> {
    return this.api
      .get<ApiResponse<FormTheme[]>>('/api/v1/themes')
      .pipe(map((response) => response.data || []));
  }

  /**
   * Tracks theme application and increments usage count.
   * Called when a user applies a theme to their form.
   * @param themeId - The ID of the theme being applied
   * @returns Observable containing updated usage count
   * @example
   * themesApi.applyTheme('theme-123').subscribe(response => {
   *   console.log('Theme applied, new usage count:', response.data.usageCount);
   * });
   */
  applyTheme(themeId: string): Observable<ApiResponse<{ usageCount: number }>> {
    return this.api.post<ApiResponse<{ usageCount: number }>>(`/api/v1/themes/${themeId}/apply`, {});
  }
}
