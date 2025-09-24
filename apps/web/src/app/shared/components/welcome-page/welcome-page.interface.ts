/**
 * Welcome Page Interface Definitions
 *
 * Provides type definitions for configurable welcome page components
 */

/**
 * Color variants for buttons and icons
 */
export type WelcomeColorVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'gray';

/**
 * Button size variants
 */
export type WelcomeButtonSize = 'sm' | 'md' | 'lg';

/**
 * CTA Button configuration
 */
export interface WelcomeCTAButton {
  label: string;
  action?: () => void;
  routerLink?: string;
  href?: string;
  variant: WelcomeColorVariant;
  size?: WelcomeButtonSize;
  icon?: string;
  disabled?: boolean;
  ariaLabel?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
}

/**
 * Feature showcase item configuration
 */
export interface WelcomeFeature {
  title: string;
  description: string;
  icon: string;
  iconColor: WelcomeColorVariant;
  iconBackgroundColor?: WelcomeColorVariant;
  href?: string;
  routerLink?: string;
}

/**
 * Hero section configuration
 */
export interface WelcomeHeroConfig {
  title: string;
  subtitle: string;
  accentText?: string;
  description?: string;
  primaryButton?: WelcomeCTAButton;
  secondaryButton?: WelcomeCTAButton;
  backgroundGradient?: boolean;
  showThemeToggle?: boolean;
}

/**
 * API Documentation section configuration
 */
export interface WelcomeApiDocsConfig {
  title: string;
  description: string;
  docTitle: string;
  docDescription: string;
  docUrl: string;
  docButtonLabel: string;
  docButtonIcon?: string;
}

/**
 * Footer configuration
 */
export interface WelcomeFooterConfig {
  copyrightText: string;
  links?: Array<{
    label: string;
    href?: string;
    routerLink?: string;
  }>;
  showSocialLinks?: boolean;
  backgroundColor?: WelcomeColorVariant;
}

/**
 * Navigation configuration
 */
export interface WelcomeNavConfig {
  brandName: string;
  brandIcon?: string;
  brandRouterLink?: string;
  showThemeToggle?: boolean;
  rightButtons?: WelcomeCTAButton[];
}

/**
 * Complete welcome page configuration
 */
export interface WelcomePageConfig {
  navigation?: WelcomeNavConfig;
  hero: WelcomeHeroConfig;
  features?: {
    title: string;
    description: string;
    items: WelcomeFeature[];
    columns?: 2 | 3 | 4;
  } | null;
  apiDocs?: WelcomeApiDocsConfig | null;
  footer?: WelcomeFooterConfig | null;
  customSections?: Array<{
    id: string;
    component: any;
    props?: Record<string, any>;
  }> | null;
}

/**
 * Theme-aware styling configuration
 */
export interface WelcomeThemeConfig {
  useCustomColors?: boolean;
  customPrimaryColor?: string;
  customSecondaryColor?: string;
  heroBackgroundType?: 'solid' | 'gradient' | 'image';
  heroBackgroundValue?: string;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  shadowIntensity?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Complete welcome page props
 */
export interface WelcomePageProps {
  config: WelcomePageConfig;
  theme?: WelcomeThemeConfig;
  className?: string;
  loading?: boolean;
  error?: string | null;
}
