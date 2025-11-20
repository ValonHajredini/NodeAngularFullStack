/**
 * Form Theme System Type Definitions
 * Shared types for form styling themes and responsive configuration
 */

/**
 * Border style options for container borders
 */
export type BorderStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset';

/**
 * Background size/repeat options for container background images
 */
export type BackgroundSize = 'cover' | 'contain' | 'repeat' | 'no-repeat';

/**
 * Predefined shadow presets for container shadows
 */
export type ShadowPreset = 'subtle' | 'medium' | 'strong' | 'custom' | 'none';

/**
 * Horizontal alignment options for container positioning
 */
export type AlignmentHorizontal = 'left' | 'center' | 'right' | 'stretch';

/**
 * Vertical alignment options for container positioning
 */
export type AlignmentVertical = 'top' | 'center' | 'bottom' | 'stretch';

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
  /** Container position within form */
  containerPosition: 'center' | 'top' | 'left' | 'full-width';
  /** Input field background color (hex format) */
  inputBackgroundColor?: string;
  /** Input field text color (hex format) */
  inputTextColor?: string;
  /** Field label text color (hex format) */
  labelColor?: string;
  /** Optional background image URL */
  backgroundImageUrl?: string;
  /** Background image positioning */
  backgroundImagePosition?: 'cover' | 'contain' | 'repeat';
  /** Background image opacity (0-1, default 1) */
  backgroundImageOpacity?: number;
  /** Background image blur in pixels (0-20, default 0) */
  backgroundImageBlur?: number;
  /** Preview element text color (hex format) */
  previewTextColor?: string;
  /** Preview element background color (hex format) */
  previewBackgroundColor?: string;
  /** Preview element border color (hex format) */
  previewBorderColor?: string;
  /** Preview element border radius (CSS value) */
  previewBorderRadius?: string;

  // ===== Container Styling Properties (Epic 25) =====

  // Background Properties
  /** Container background color in hex format (e.g., '#FFFFFF'), default '#FFFFFF' */
  containerBackgroundColor?: string;
  /** Container background image URL (base64 data URI or external URL) */
  containerBackgroundImageUrl?: string;
  /** Container background image size/repeat mode, default 'cover' */
  containerBackgroundSize?: BackgroundSize;
  /** Container background image horizontal position as percentage (0-100), default 50 */
  containerBackgroundPositionX?: number;
  /** Container background image vertical position as percentage (0-100), default 50 */
  containerBackgroundPositionY?: number;

  // Border Properties
  /** Whether container border is enabled, default false */
  containerBorderEnabled?: boolean;
  /** Container border width in pixels (valid range: 0-10), default 1 */
  containerBorderWidth?: number;
  /** Container border color in hex format (e.g., '#D1D5DB'), default '#D1D5DB' */
  containerBorderColor?: string;
  /** Container border radius in pixels (valid range: 0-50), default 8 */
  containerBorderRadius?: number;
  /** Container border style (solid, dashed, dotted, etc.), default 'solid' */
  containerBorderStyle?: BorderStyle;

  // Shadow Properties
  /** Whether container box shadow is enabled, default false */
  containerShadowEnabled?: boolean;
  /** Predefined shadow preset (subtle, medium, strong, custom, none), default 'medium' */
  containerShadowPreset?: ShadowPreset;
  /** Shadow intensity in pixels (valid range: 0-30), default 10 */
  containerShadowIntensity?: number;
  /** Shadow color in rgba format with alpha channel (e.g., 'rgba(0, 0, 0, 0.1)'), default 'rgba(0, 0, 0, 0.1)' */
  containerShadowColor?: string;
  /** Shadow horizontal offset in pixels, default 0 */
  containerShadowOffsetX?: number;
  /** Shadow vertical offset in pixels, default 4 */
  containerShadowOffsetY?: number;
  /** Shadow blur radius in pixels, default 6 */
  containerShadowBlur?: number;
  /** Shadow spread radius in pixels, default 0 */
  containerShadowSpread?: number;

  // Layout Properties
  /** Container horizontal alignment (left, center, right, stretch), default 'center' */
  containerAlignmentHorizontal?: AlignmentHorizontal;
  /** Container vertical alignment (top, center, bottom, stretch), default 'center' */
  containerAlignmentVertical?: AlignmentVertical;
  /** Container maximum width in pixels (valid range: 300-1200), default 1024 */
  containerMaxWidth?: number;

  // Effects Properties
  /** Container opacity as percentage (valid range: 0-100), default 100 */
  containerOpacity?: number;
  /** Whether backdrop blur effect is enabled, default false */
  containerBackdropBlurEnabled?: boolean;
  /** Backdrop blur intensity in pixels (valid range: 0-20), default 0 */
  containerBackdropBlurIntensity?: number;
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
