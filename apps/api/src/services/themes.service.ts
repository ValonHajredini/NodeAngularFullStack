import { themesRepository } from '../repositories/themes.repository';
import {
  FormTheme,
  CreateThemeRequest,
  UpdateThemeRequest,
} from '@nodeangularfullstack/shared';

/**
 * Theme service for business logic operations.
 * Handles theme management with proper validation and security.
 */
export class ThemesService {
  /**
   * Finds all themes with optional active filtering.
   * @param activeOnly - If true, returns only active themes
   * @returns Promise containing array of themes ordered by usage_count DESC
   * @throws {Error} When database query fails
   * @example
   * const activeThemes = await themesService.findAll(true);
   * const allThemes = await themesService.findAll(false);
   */
  async findAll(activeOnly: boolean = true): Promise<FormTheme[]> {
    return await themesRepository.findAll(activeOnly);
  }

  /**
   * Finds a theme by its ID.
   * @param id - Theme ID to find
   * @returns Promise containing the theme or null if not found
   * @throws {Error} When database query fails
   * @example
   * const theme = await themesService.findById('theme-uuid');
   */
  async findById(id: string): Promise<FormTheme | null> {
    return await themesRepository.findById(id);
  }

  /**
   * Creates a new theme.
   * @param themeData - Theme creation data
   * @param userId - ID of the user creating the theme
   * @returns Promise containing the created theme
   * @throws {Error} When theme creation fails
   * @example
   * const theme = await themesService.create({
   *   name: 'Modern Blue',
   *   description: 'Clean modern theme with blue accents',
   *   thumbnailUrl: 'https://spaces.example.com/theme-thumb.jpg',
   *   themeConfig: { desktop: { primaryColor: '#007bff', ... } }
   * }, 'user-uuid');
   */
  async create(themeData: CreateThemeRequest): Promise<FormTheme> {
    // Validate theme configuration
    this.validateThemeConfig(themeData.themeConfig);

    return await themesRepository.create(themeData);
  }

  /**
   * Updates an existing theme.
   * @param id - Theme ID to update
   * @param updates - Partial theme data to update
   * @param userId - ID of the user updating the theme
   * @returns Promise containing the updated theme
   * @throws {Error} When update fails or theme not found
   * @example
   * const theme = await themesService.update('theme-uuid', {
   *   name: 'Updated Theme Name',
   *   description: 'New description'
   * }, 'user-uuid');
   */
  async update(id: string, updates: UpdateThemeRequest): Promise<FormTheme> {
    // Validate theme configuration if provided
    if (updates.themeConfig) {
      this.validateThemeConfig(updates.themeConfig);
    }

    return await themesRepository.update(id, updates);
  }

  /**
   * Soft deletes a theme by setting is_active to false.
   * @param id - Theme ID to soft delete
   * @returns Promise containing boolean indicating success
   * @throws {Error} When deletion fails
   * @example
   * const success = await themesService.softDelete('theme-uuid');
   */
  async softDelete(id: string): Promise<boolean> {
    return await themesRepository.softDelete(id);
  }

  /**
   * Atomically increments the usage count for a theme.
   * @param id - Theme ID to increment usage count
   * @returns Promise containing the updated theme
   * @throws {Error} When increment fails or theme not found
   * @example
   * const theme = await themesService.incrementUsage('theme-uuid');
   */
  async incrementUsage(id: string): Promise<FormTheme> {
    return await themesRepository.incrementUsageCount(id);
  }

  /**
   * Validates theme configuration structure and values.
   * @param themeConfig - Theme configuration to validate
   * @throws {Error} When validation fails
   * @private
   */
  private validateThemeConfig(themeConfig: any): void {
    if (!themeConfig || typeof themeConfig !== 'object') {
      throw new Error('Theme configuration must be an object');
    }

    if (!themeConfig.desktop || typeof themeConfig.desktop !== 'object') {
      throw new Error('Desktop theme configuration is required');
    }

    // Validate desktop theme properties
    this.validateThemeProperties(themeConfig.desktop, 'desktop');

    // Validate mobile theme properties if provided
    if (themeConfig.mobile) {
      this.validateThemeProperties(themeConfig.mobile, 'mobile', true);
    }
  }

  /**
   * Validates individual theme properties.
   * @param properties - Theme properties to validate
   * @param context - Context for error messages (desktop/mobile)
   * @param isPartial - Whether this is a partial validation (for mobile)
   * @throws {Error} When validation fails
   * @private
   */
  private validateThemeProperties(
    properties: any,
    context: string,
    isPartial: boolean = false
  ): void {
    const requiredFields = [
      'primaryColor',
      'secondaryColor',
      'backgroundColor',
      'textColorPrimary',
      'textColorSecondary',
      'fontFamilyHeading',
      'fontFamilyBody',
      'fieldBorderRadius',
      'fieldSpacing',
      'containerBackground',
      'containerOpacity',
      'containerPosition',
    ];

    // Check required fields for desktop, optional for mobile
    if (!isPartial) {
      for (const field of requiredFields) {
        if (properties[field] === undefined || properties[field] === null) {
          throw new Error(
            `${context} theme configuration missing required field: ${field}`
          );
        }
      }
    }

    // Validate color fields (hex format)
    const colorFields = [
      'primaryColor',
      'secondaryColor',
      'backgroundColor',
      'textColorPrimary',
      'textColorSecondary',
      'containerBackground',
    ];
    for (const field of colorFields) {
      if (
        properties[field] !== undefined &&
        !this.isValidHexColor(properties[field])
      ) {
        throw new Error(
          `${context} theme configuration: ${field} must be a valid hex color code (e.g., #FF5733)`
        );
      }
    }

    // Validate container opacity (0.0 to 1.0)
    if (properties.containerOpacity !== undefined) {
      const opacity = Number(properties.containerOpacity);
      if (isNaN(opacity) || opacity < 0 || opacity > 1) {
        throw new Error(
          `${context} theme configuration: containerOpacity must be a number between 0.0 and 1.0`
        );
      }
    }

    // Validate container position enum
    if (properties.containerPosition !== undefined) {
      const validPositions = ['center', 'top', 'left', 'full-width'];
      if (!validPositions.includes(properties.containerPosition)) {
        throw new Error(
          `${context} theme configuration: containerPosition must be one of: ${validPositions.join(', ')}`
        );
      }
    }

    // Validate background image position enum
    if (properties.backgroundImagePosition !== undefined) {
      const validPositions = ['cover', 'contain', 'repeat'];
      if (!validPositions.includes(properties.backgroundImagePosition)) {
        throw new Error(
          `${context} theme configuration: backgroundImagePosition must be one of: ${validPositions.join(', ')}`
        );
      }
    }

    // Validate string fields are not empty
    const stringFields = [
      'fontFamilyHeading',
      'fontFamilyBody',
      'fieldBorderRadius',
      'fieldSpacing',
    ];
    for (const field of stringFields) {
      if (
        properties[field] !== undefined &&
        (typeof properties[field] !== 'string' ||
          properties[field].trim() === '')
      ) {
        throw new Error(
          `${context} theme configuration: ${field} must be a non-empty string`
        );
      }
    }
  }

  /**
   * Validates hex color format.
   * @param color - Color string to validate
   * @returns Boolean indicating if color is valid hex format
   * @private
   */
  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }
}

// Export singleton instance
export const themesService = new ThemesService();
