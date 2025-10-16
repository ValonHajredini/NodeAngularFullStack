/**
 * Form Theme System Type Definitions
 * Shared types for form styling themes and responsive configuration
 */

/**
 * Theme properties for desktop and mobile configurations
 */
export interface ThemeProperties {
  /** Primary color (hex format) */
  primaryColor: string;
  /** Secondary color (hex format) */
  secondaryColor: string;
  /** Background color (hex format) */
  backgroundColor: string;
  /** Primary text color (hex format) */
  textColorPrimary: string;
  /** Secondary text color (hex format) */
  textColorSecondary: string;
  /** Font family for headings */
  fontFamilyHeading: string;
  /** Font family for body text */
  fontFamilyBody: string;
  /** Field border radius (CSS value) */
  fieldBorderRadius: string;
  /** Field spacing (CSS value) */
  fieldSpacing: string;
  /** Container background color (hex format) */
  containerBackground: string;
  /** Container opacity (0-1) */
  containerOpacity: number;
  /** Container position within form */
  containerPosition: 'center' | 'top' | 'left' | 'full-width';
  /** Optional background image URL */
  backgroundImageUrl?: string;
  /** Background image positioning */
  backgroundImagePosition?: 'cover' | 'contain' | 'repeat';
}

/**
 * Responsive theme configuration with desktop and optional mobile overrides
 */
export interface ResponsiveThemeConfig {
  /** Desktop theme properties */
  desktop: ThemeProperties;
  /** Optional mobile theme overrides */
  mobile?: Partial<ThemeProperties>;
}

/**
 * Form theme interface for database storage and API responses
 */
export interface FormTheme {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Theme display name (max 100 chars) */
  name: string;
  /** Optional theme description */
  description?: string;
  /** DigitalOcean Spaces URL for thumbnail image (max 500 chars) */
  thumbnailUrl: string;
  /** JSONB column storing theme properties */
  themeConfig: ResponsiveThemeConfig;
  /** Aggregate count of theme applications (default 0) */
  usageCount: number;
  /** Soft-delete flag (default true) */
  isActive: boolean;
  /** UUID reference to users(id), nullable */
  createdBy?: string;
  /** Theme creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
  /** Distinguishes custom themes (true) from predefined themes (false) */
  isCustom: boolean;
  /** UUID reference to custom theme creator, null for predefined themes */
  creatorId?: string;
  /** JSONB storage for custom theme definitions (max 50KB), null for predefined themes */
  themeDefinition?: any;
}

/**
 * Request interface for creating a new theme
 */
export interface CreateThemeRequest {
  /** Theme display name */
  name: string;
  /** Optional theme description */
  description?: string;
  /** Thumbnail image URL */
  thumbnailUrl: string;
  /** Theme configuration */
  themeConfig: ResponsiveThemeConfig;
  /** Optional creator user ID */
  createdBy?: string;
  /** Whether this is a custom theme */
  isCustom?: boolean;
  /** Creator ID for custom themes */
  creatorId?: string;
  /** Custom theme definition (max 50KB) */
  themeDefinition?: any;
}

/**
 * Request interface for updating an existing theme
 */
export interface UpdateThemeRequest {
  /** Theme display name */
  name?: string;
  /** Optional theme description */
  description?: string;
  /** Thumbnail image URL */
  thumbnailUrl?: string;
  /** Theme configuration */
  themeConfig?: ResponsiveThemeConfig;
  /** Custom theme definition (max 50KB) */
  themeDefinition?: any;
}

/**
 * Request interface for creating a custom theme
 */
export interface CreateCustomThemeRequest extends Omit<CreateThemeRequest, 'isCustom'> {
  /** Creator user ID (required for custom themes) */
  creatorId: string;
  /** Custom theme definition (required for custom themes) */
  themeDefinition: any;
}

/**
 * Validation result for theme definition size
 */
export interface ThemeValidationResult {
  /** Whether the theme definition is valid */
  valid: boolean;
  /** Error message if validation fails */
  error?: string;
  /** Size of theme definition in bytes */
  sizeInBytes?: number;
}
