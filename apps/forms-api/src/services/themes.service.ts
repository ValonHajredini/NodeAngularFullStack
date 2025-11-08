import { themesRepository } from '../repositories/themes.repository';
import {
  FormTheme,
  CreateThemeRequest,
  UpdateThemeRequest,
} from '@nodeangularfullstack/shared';
import { SharedAuthService } from '@nodeangularfullstack/shared/dist/services/shared-auth.service';
import { authPool } from '../config/multi-database.config';

/**
 * Theme service for business logic operations.
 * Handles theme management with proper validation and security.
 * Uses SharedAuthService for cross-database user validation.
 */
export class ThemesService {
  private readonly sharedAuthService: SharedAuthService;

  constructor() {
    this.sharedAuthService = new SharedAuthService(authPool);
  }
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
   * @throws {Error} When theme creation fails or user validation fails
   * @example
   * const theme = await themesService.create({
   *   name: 'Modern Blue',
   *   description: 'Clean modern theme with blue accents',
   *   thumbnailUrl: 'https://spaces.example.com/theme-thumb.jpg',
   *   themeConfig: { desktop: { primaryColor: '#007bff', ... } }
   * }, 'user-uuid');
   */
  async create(themeData: CreateThemeRequest): Promise<FormTheme> {
    // Validate user exists and is active (cross-database validation)
    if (themeData.creatorId) {
      const isValidUser = await this.sharedAuthService.validateUser(
        themeData.creatorId
      );
      if (!isValidUser) {
        throw new Error(
          'Invalid or inactive user. Theme creation requires valid creator.'
        );
      }
    }

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
   * Gets theme usage statistics including forms using this theme.
   * @param id - Theme ID to get usage statistics for
   * @returns Promise containing usage statistics
   * @throws {Error} When theme not found or query fails
   * @example
   * const usage = await themesService.getThemeUsage('theme-uuid');
   */
  async getThemeUsage(id: string): Promise<{
    formsCount: number;
    publishedFormsCount: number;
    lastUsed?: Date;
    formsList: Array<{
      id: string;
      title: string;
      published: boolean;
      lastModified: Date;
    }>;
  }> {
    // Verify theme exists
    const theme = await themesRepository.findById(id);
    if (!theme) {
      throw new Error('Theme not found');
    }

    return await themesRepository.getThemeUsage(id);
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
    const hexColorFields = [
      'primaryColor',
      'secondaryColor',
      'textColorPrimary',
      'textColorSecondary',
    ];
    for (const field of hexColorFields) {
      if (
        properties[field] !== undefined &&
        !this.isValidHexColor(properties[field])
      ) {
        throw new Error(
          `${context} theme configuration: ${field} must be a valid hex color code (e.g., #FF5733)`
        );
      }
    }

    // Validate background fields (allow hex colors and safe CSS)
    const backgroundFields = ['backgroundColor', 'containerBackground'];
    for (const field of backgroundFields) {
      if (
        properties[field] !== undefined &&
        !this.isValidColorOrCSS(properties[field])
      ) {
        throw new Error(
          `${context} theme configuration: ${field} must be a valid hex color code or safe CSS gradient`
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

  /**
   * Validates hex color format or safe CSS background.
   * @param color - Color string to validate
   * @returns Boolean indicating if color is valid hex format or safe CSS
   * @private
   */
  private isValidColorOrCSS(color: string): boolean {
    // First check for hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return true;
    }

    // Also allow safe CSS gradients and color functions
    // This regex matches the same patterns validated in themes.validator.ts
    const safeCSS =
      /^(rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[01]?\.?\d*\s*\)|hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)|hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[01]?\.?\d*\s*\)|linear-gradient\([^)]+\)|radial-gradient\([^)]+\))$/;
    return safeCSS.test(color);
  }
}

// Export singleton instance
export const themesService = new ThemesService();
