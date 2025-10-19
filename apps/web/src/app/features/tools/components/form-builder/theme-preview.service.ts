import { Injectable } from '@angular/core';
import { FormTheme, ResponsiveThemeConfig, ThemeProperties } from '@nodeangularfullstack/shared';

/**
 * Service for applying theme CSS variables to the document.
 * Handles dynamic CSS variable injection for real-time theme preview.
 * Story 24.9: Added container background transparency support
 */
@Injectable({
  providedIn: 'root',
})
export class ThemePreviewService {
  /**
   * Applies theme CSS variables to the document root element.
   * Sets desktop styles immediately and applies mobile overrides via media query if available.
   * Injects both legacy and new CSS variable names for backward compatibility.
   * @param theme - The theme configuration to apply
   * @example
   * themePreviewService.applyThemeCss(theme);
   */
  applyThemeCss(theme: FormTheme): void {
    const root = document.documentElement;
    const { desktop, mobile } = theme.themeConfig;

    // Apply desktop styles to :root
    // Primary colors
    this.setCssVar(root, '--theme-primary-color', desktop.primaryColor);
    this.setCssVar(root, '--theme-secondary-color', desktop.secondaryColor);

    // Background variables (legacy and new)
    const rawBackground = desktop.backgroundColor || '#ffffff';
    const isGradient =
      rawBackground.startsWith('linear-gradient') || rawBackground.startsWith('radial-gradient');
    const backgroundColorValue = isGradient ? '#ffffff' : rawBackground;
    const backgroundImageValue = desktop.backgroundImageUrl
      ? `url(${desktop.backgroundImageUrl})`
      : isGradient
        ? rawBackground
        : 'none';

    this.setCssVar(root, '--theme-bg-color', backgroundColorValue);
    this.setCssVar(root, '--theme-background-color', backgroundColorValue); // New variable name
    this.setCssVar(root, '--theme-background-image', backgroundImageValue);

    // Background image opacity and blur (Story 24.9)
    const bgImageOpacity = desktop.backgroundImageOpacity ?? 1;
    const bgImageBlur = desktop.backgroundImageBlur ?? 0;
    this.setCssVar(root, '--theme-background-image-opacity', bgImageOpacity.toString());
    this.setCssVar(root, '--theme-background-image-blur', `${bgImageBlur}px`);

    // Text colors
    this.setCssVar(root, '--theme-text-primary', desktop.textColorPrimary);
    this.setCssVar(root, '--theme-text-secondary', desktop.textColorSecondary);

    // Typography
    this.setCssVar(root, '--theme-font-heading', desktop.fontFamilyHeading);
    this.setCssVar(root, '--theme-font-body', desktop.fontFamilyBody);
    this.setCssVar(root, '--theme-heading-font', desktop.fontFamilyHeading); // New variable name
    this.setCssVar(root, '--theme-body-font', desktop.fontFamilyBody); // New variable name
    this.setCssVar(root, '--theme-font-size-base', '16px'); // Standard base font size

    // Border and spacing (legacy and new)
    this.setCssVar(root, '--theme-field-radius', desktop.fieldBorderRadius);
    this.setCssVar(root, '--theme-border-radius', desktop.fieldBorderRadius); // New variable name
    this.setCssVar(root, '--theme-field-spacing', desktop.fieldSpacing);

    // Container variables (legacy and new)
    this.setCssVar(root, '--theme-container-bg', desktop.containerBackground);
    this.setCssVar(root, '--theme-container-background', desktop.containerBackground); // New variable name
    this.setCssVar(root, '--theme-container-border-radius', desktop.fieldBorderRadius);
    this.setCssVar(root, '--theme-container-padding', '24px');
    this.setCssVar(root, '--theme-container-opacity', desktop.containerOpacity.toString());
    this.setCssVar(root, '--theme-container-position', desktop.containerPosition);

    // Container background with alpha transparency (Story 24.9)
    // Convert hex color to rgba with opacity for proper transparency
    const containerBgWithAlpha = this.hexToRgba(
      desktop.containerBackground,
      desktop.containerOpacity,
    );
    this.setCssVar(root, '--theme-container-background-rgba', containerBgWithAlpha);

    // Layout variables (new for Epic 23)
    this.setCssVar(root, '--theme-row-spacing', desktop.fieldSpacing);
    this.setCssVar(root, '--theme-row-background', 'transparent');
    this.setCssVar(root, '--theme-column-padding', '12px');
    this.setCssVar(root, '--theme-column-gap', desktop.fieldSpacing);

    // Field element variables (new for Epic 23)
    const inputBackground = desktop.inputBackgroundColor ?? '#ffffff';
    const inputTextColor = desktop.inputTextColor ?? desktop.textColorPrimary;
    const labelColor = desktop.labelColor ?? desktop.textColorPrimary;

    this.setCssVar(root, '--theme-input-background', inputBackground);
    this.setCssVar(root, '--theme-input-border-color', '#d1d5db');
    this.setCssVar(root, '--theme-input-text-color', inputTextColor);
    this.setCssVar(root, '--theme-label-color', labelColor);
    this.setCssVar(root, '--theme-heading-color', desktop.textColorPrimary);
    this.setCssVar(root, '--theme-help-text-color', desktop.textColorSecondary);

    // Button variables (new for Epic 23)
    this.setCssVar(root, '--theme-button-primary-background', desktop.primaryColor);
    this.setCssVar(root, '--theme-button-primary-text', '#ffffff');
    this.setCssVar(root, '--theme-button-secondary-background', desktop.secondaryColor);
    this.setCssVar(root, '--theme-button-secondary-text', '#ffffff');

    // Step form navigation variables (new for Epic 23)
    this.setCssVar(root, '--theme-step-active-color', desktop.primaryColor);
    this.setCssVar(root, '--theme-step-inactive-color', '#9ca3af');

    // Apply mobile overrides via media query (if mobile config exists)
    if (mobile) {
      this.applyMobileOverrides(mobile);
    }
  }

  /**
   * Removes all theme CSS variables from the document root element.
   * Clears both desktop and mobile theme styles.
   * Removes both legacy and new CSS variable names.
   * @example
   * themePreviewService.clearThemeCss();
   */
  clearThemeCss(): void {
    const root = document.documentElement;

    // Remove all theme CSS variables (legacy and new)
    const themeVars = [
      // Primary colors
      '--theme-primary-color',
      '--theme-secondary-color',
      // Background variables
      '--theme-bg-color',
      '--theme-background-color',
      '--theme-background-image',
      '--theme-background-image-opacity',
      '--theme-background-image-blur',
      // Text colors
      '--theme-text-primary',
      '--theme-text-secondary',
      // Typography
      '--theme-font-heading',
      '--theme-font-body',
      '--theme-heading-font',
      '--theme-body-font',
      '--theme-font-size-base',
      // Border and spacing
      '--theme-field-radius',
      '--theme-border-radius',
      '--theme-field-spacing',
      // Container variables
      '--theme-container-bg',
      '--theme-container-background',
      '--theme-container-background-rgba',
      '--theme-container-border-radius',
      '--theme-container-padding',
      '--theme-container-opacity',
      '--theme-container-position',
      // Layout variables
      '--theme-row-spacing',
      '--theme-row-background',
      '--theme-column-padding',
      '--theme-column-gap',
      // Field element variables
      '--theme-input-background',
      '--theme-input-border-color',
      '--theme-input-text-color',
      '--theme-label-color',
      '--theme-heading-color',
      '--theme-help-text-color',
      // Button variables
      '--theme-button-primary-background',
      '--theme-button-primary-text',
      '--theme-button-secondary-background',
      '--theme-button-secondary-text',
      // Step form navigation variables
      '--theme-step-active-color',
      '--theme-step-inactive-color',
    ];

    themeVars.forEach((varName) => {
      root.style.removeProperty(varName);
    });

    // Remove mobile media query styles
    this.removeMobileOverrides();
  }

  /**
   * Sets a CSS custom property on an element with type safety.
   * @private
   * @param element - The DOM element to set the CSS variable on
   * @param varName - The CSS variable name (e.g., '--theme-primary-color')
   * @param value - The CSS value to set
   */
  private setCssVar(element: HTMLElement, varName: string, value: string): void {
    element.style.setProperty(varName, value);
  }

  /**
   * Converts a hex color to rgba format with specified opacity.
   * Supports 3-digit (#RGB) and 6-digit (#RRGGBB) hex colors.
   * @private
   * @param hex - Hex color string (e.g., '#FF5733' or '#F53')
   * @param opacity - Opacity value between 0 and 1
   * @returns RGBA color string (e.g., 'rgba(255, 87, 51, 0.5)')
   */
  private hexToRgba(hex: string, opacity: number): string {
    // Remove # if present
    const cleanHex = hex.replace('#', '');

    let r: number, g: number, b: number;

    if (cleanHex.length === 3) {
      // 3-digit hex (#RGB)
      r = parseInt(cleanHex[0] + cleanHex[0], 16);
      g = parseInt(cleanHex[1] + cleanHex[1], 16);
      b = parseInt(cleanHex[2] + cleanHex[2], 16);
    } else if (cleanHex.length === 6) {
      // 6-digit hex (#RRGGBB)
      r = parseInt(cleanHex.substring(0, 2), 16);
      g = parseInt(cleanHex.substring(2, 4), 16);
      b = parseInt(cleanHex.substring(4, 6), 16);
    } else {
      // Invalid hex, return white with opacity
      console.warn(`Invalid hex color: ${hex}, using white as fallback`);
      return `rgba(255, 255, 255, ${opacity})`;
    }

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  /**
   * Applies mobile theme overrides via dynamic media query injection.
   * Creates a style element with media query for mobile breakpoint (<768px).
   * @private
   * @param mobile - Mobile theme properties to apply as overrides
   */
  private applyMobileOverrides(mobile: Partial<ThemeProperties>): void {
    // Remove existing mobile overrides first
    this.removeMobileOverrides();

    // Create mobile media query CSS
    const mobileCss = this.generateMobileCss(mobile);

    // Create and inject style element
    const styleElement = document.createElement('style');
    styleElement.id = 'theme-mobile-overrides';
    styleElement.textContent = mobileCss;

    document.head.appendChild(styleElement);
  }

  /**
   * Removes mobile theme overrides by removing the injected style element.
   * @private
   */
  private removeMobileOverrides(): void {
    const existingStyle = document.getElementById('theme-mobile-overrides');
    if (existingStyle) {
      existingStyle.remove();
    }
  }

  /**
   * Generates CSS for mobile media query with theme overrides.
   * Includes both legacy and new CSS variable names for compatibility.
   * @private
   * @param mobile - Mobile theme properties to generate CSS for
   * @returns CSS string with media query and theme variable overrides
   */
  private generateMobileCss(mobile: Partial<ThemeProperties>): string {
    const overrides: string[] = [];

    if (mobile.primaryColor) {
      overrides.push(`--theme-primary-color: ${mobile.primaryColor};`);
      overrides.push(`--theme-button-primary-background: ${mobile.primaryColor};`);
      overrides.push(`--theme-step-active-color: ${mobile.primaryColor};`);
    }
    if (mobile.secondaryColor) {
      overrides.push(`--theme-secondary-color: ${mobile.secondaryColor};`);
      overrides.push(`--theme-button-secondary-background: ${mobile.secondaryColor};`);
    }
    if (mobile.backgroundColor) {
      overrides.push(`--theme-bg-color: ${mobile.backgroundColor};`);
      overrides.push(`--theme-background-color: ${mobile.backgroundColor};`);
    }
    if (mobile.textColorPrimary) {
      overrides.push(`--theme-text-primary: ${mobile.textColorPrimary};`);
      overrides.push(`--theme-input-text-color: ${mobile.textColorPrimary};`);
      overrides.push(`--theme-label-color: ${mobile.textColorPrimary};`);
      overrides.push(`--theme-heading-color: ${mobile.textColorPrimary};`);
    }
    if (mobile.textColorSecondary) {
      overrides.push(`--theme-text-secondary: ${mobile.textColorSecondary};`);
      overrides.push(`--theme-help-text-color: ${mobile.textColorSecondary};`);
    }
    if (mobile.inputBackgroundColor) {
      overrides.push(`--theme-input-background: ${mobile.inputBackgroundColor};`);
    }
    if (mobile.inputTextColor) {
      overrides.push(`--theme-input-text-color: ${mobile.inputTextColor};`);
    }
    if (mobile.labelColor) {
      overrides.push(`--theme-label-color: ${mobile.labelColor};`);
    }
    if (mobile.fontFamilyHeading) {
      overrides.push(`--theme-font-heading: ${mobile.fontFamilyHeading};`);
      overrides.push(`--theme-heading-font: ${mobile.fontFamilyHeading};`);
    }
    if (mobile.fontFamilyBody) {
      overrides.push(`--theme-font-body: ${mobile.fontFamilyBody};`);
      overrides.push(`--theme-body-font: ${mobile.fontFamilyBody};`);
    }
    if (mobile.fieldBorderRadius) {
      overrides.push(`--theme-field-radius: ${mobile.fieldBorderRadius};`);
      overrides.push(`--theme-border-radius: ${mobile.fieldBorderRadius};`);
      overrides.push(`--theme-container-border-radius: ${mobile.fieldBorderRadius};`);
    }
    if (mobile.fieldSpacing) {
      overrides.push(`--theme-field-spacing: ${mobile.fieldSpacing};`);
      overrides.push(`--theme-row-spacing: ${mobile.fieldSpacing};`);
      overrides.push(`--theme-column-gap: ${mobile.fieldSpacing};`);
    }
    if (mobile.containerBackground) {
      overrides.push(`--theme-container-bg: ${mobile.containerBackground};`);
      overrides.push(`--theme-container-background: ${mobile.containerBackground};`);
    }
    if (mobile.containerOpacity !== undefined) {
      overrides.push(`--theme-container-opacity: ${mobile.containerOpacity.toString()};`);
    }

    if (overrides.length === 0) {
      return '';
    }

    return `@media (max-width: 767px) {
  :root {
    ${overrides.join('\n    ')}
  }
}`;
  }
}
