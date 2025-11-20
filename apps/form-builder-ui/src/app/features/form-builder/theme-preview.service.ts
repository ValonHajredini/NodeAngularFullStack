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

    this.setCssVar(root, '--theme-bg-color', backgroundColorValue);
    this.setCssVar(root, '--theme-background-color', backgroundColorValue); // New variable name

    // IMPORTANT: Background images (especially large base64 data URIs) cannot be set via
    // inline CSS variables due to browser length limitations. Instead, inject via <style> tag.
    // This is critical for Story 24.9 (background image with opacity and blur).
    this.applyBackgroundImageStyle(desktop.backgroundImageUrl, isGradient ? rawBackground : null);

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
    this.setCssVar(root, '--theme-container-opacity', (desktop.containerOpacity ?? 100).toString());
    this.setCssVar(root, '--theme-container-position', desktop.containerPosition);

    // Container background with alpha transparency (Story 24.9)
    // Convert hex color to rgba with opacity for proper transparency
    // Note: containerOpacity is now 0-100 percentage (Epic 25), convert to 0-1 for hexToRgba
    const containerBgWithAlpha = this.hexToRgba(
      desktop.containerBackground,
      (desktop.containerOpacity ?? 100) / 100,
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

    // ===== Container Styling CSS Variables (Epic 25, Story 25.3) =====

    // Container background variables
    this.setCssVar(
      root,
      '--theme-form-container-bg-color',
      desktop.containerBackgroundColor ?? '#ffffff',
    );
    this.setCssVar(
      root,
      '--theme-form-container-bg-size',
      desktop.containerBackgroundSize ?? 'cover',
    );
    this.setCssVar(
      root,
      '--theme-form-container-bg-pos-x',
      (desktop.containerBackgroundPositionX ?? 50).toString(),
    );
    this.setCssVar(
      root,
      '--theme-form-container-bg-pos-y',
      (desktop.containerBackgroundPositionY ?? 50).toString(),
    );

    // Container background image via style tag injection (handles large base64 URIs)
    this.applyContainerBackgroundImage(
      desktop.containerBackgroundImageUrl,
      desktop.containerBackgroundSize,
      desktop.containerBackgroundPositionX,
      desktop.containerBackgroundPositionY,
    );

    // Container border variables
    this.setCssVar(
      root,
      '--theme-form-container-border-enabled',
      desktop.containerBorderEnabled ? '1' : '0',
    );
    this.setCssVar(
      root,
      '--theme-form-container-border-width',
      `${desktop.containerBorderWidth ?? 1}px`,
    );
    this.setCssVar(
      root,
      '--theme-form-container-border-color',
      desktop.containerBorderColor ?? '#d1d5db',
    );
    this.setCssVar(
      root,
      '--theme-form-container-border-radius',
      `${desktop.containerBorderRadius ?? 8}px`,
    );
    this.setCssVar(
      root,
      '--theme-form-container-border-style',
      desktop.containerBorderStyle ?? 'solid',
    );

    // Container shadow variables (computed from shadow properties)
    const shadowCss = this.buildShadowCss({
      enabled: desktop.containerShadowEnabled,
      preset: desktop.containerShadowPreset,
      offsetX: desktop.containerShadowOffsetX,
      offsetY: desktop.containerShadowOffsetY,
      blur: desktop.containerShadowBlur,
      spread: desktop.containerShadowSpread,
      color: desktop.containerShadowColor,
      intensity: desktop.containerShadowIntensity,
    });
    this.setCssVar(
      root,
      '--theme-form-container-shadow-enabled',
      desktop.containerShadowEnabled ? '1' : '0',
    );
    this.setCssVar(root, '--theme-form-container-shadow', shadowCss);

    // Container layout variables
    this.setCssVar(
      root,
      '--theme-form-container-align-horizontal',
      desktop.containerAlignmentHorizontal ?? 'center',
    );
    this.setCssVar(
      root,
      '--theme-form-container-align-vertical',
      desktop.containerAlignmentVertical ?? 'center',
    );
    this.setCssVar(
      root,
      '--theme-form-container-max-width',
      `${desktop.containerMaxWidth ?? 1024}px`,
    );

    // Container effects variables
    this.setCssVar(
      root,
      '--theme-form-container-opacity',
      (desktop.containerOpacity ?? 100).toString(),
    );
    this.setCssVar(
      root,
      '--theme-form-container-backdrop-blur',
      desktop.containerBackdropBlurEnabled
        ? `${desktop.containerBackdropBlurIntensity ?? 0}px`
        : '0px',
    );

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
      // Container styling variables (Epic 25, Story 25.3)
      '--theme-form-container-bg-color',
      '--theme-form-container-bg-size',
      '--theme-form-container-bg-pos-x',
      '--theme-form-container-bg-pos-y',
      '--theme-form-container-border-enabled',
      '--theme-form-container-border-width',
      '--theme-form-container-border-color',
      '--theme-form-container-border-radius',
      '--theme-form-container-border-style',
      '--theme-form-container-shadow-enabled',
      '--theme-form-container-shadow',
      '--theme-form-container-align-horizontal',
      '--theme-form-container-align-vertical',
      '--theme-form-container-max-width',
      '--theme-form-container-opacity',
      '--theme-form-container-backdrop-blur',
    ];

    themeVars.forEach((varName) => {
      root.style.removeProperty(varName);
    });

    // Remove injected style elements
    this.removeBackgroundImageStyle();
    this.removeContainerBackgroundImageStyle(); // Epic 25, Story 25.3
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
   * Injects background image CSS via <style> tag to bypass inline style length limitations.
   * Large base64 data URIs cannot be set via CSS custom properties due to browser CSSOM limits.
   * Instead, we directly target the ::before pseudo-element that displays the background.
   * @private
   * @param backgroundImageUrl - The background image URL (can be base64 data URI)
   * @param gradientFallback - Optional gradient string to use if no background image
   */
  private applyBackgroundImageStyle(
    backgroundImageUrl: string | undefined,
    gradientFallback: string | null,
  ): void {
    // Remove existing background image style
    this.removeBackgroundImageStyle();

    // Determine background image value
    const backgroundImageValue = backgroundImageUrl
      ? `url(${backgroundImageUrl})`
      : gradientFallback
        ? gradientFallback
        : 'none';

    // IMPORTANT: We cannot use CSS custom properties for large base64 images because
    // browsers have CSSOM value length limits. Instead, directly target the pseudo-element.
    // This targets both form-renderer-container (published forms) and form-canvas (builder preview)
    const backgroundCss = `
.form-renderer-container::before,
.form-canvas::before {
  background-image: ${backgroundImageValue} !important;
}`;

    // Create and inject style element
    const styleElement = document.createElement('style');
    styleElement.id = 'theme-background-image-style';
    styleElement.textContent = backgroundCss;

    document.head.appendChild(styleElement);

    console.log('[ThemePreviewService] Background image injected via <style> tag');
  }

  /**
   * Removes background image style element.
   * @private
   */
  private removeBackgroundImageStyle(): void {
    const existingStyle = document.getElementById('theme-background-image-style');
    if (existingStyle) {
      existingStyle.remove();
    }
  }

  /**
   * Injects container background image CSS via <style> tag for form container wrapper.
   * Large base64 data URIs cannot be set via CSS custom properties due to browser CSSOM limits.
   * This method targets the .form-container-themed::before pseudo-element to avoid affecting content opacity.
   * Story 25.3: Container styling for form renderer and preview.
   * @private
   * @param imageUrl - The background image URL (can be base64 data URI)
   * @param bgSize - Background size mode (cover, contain, repeat, no-repeat)
   * @param positionX - Horizontal position as percentage (0-100), default 50
   * @param positionY - Vertical position as percentage (0-100), default 50
   */
  private applyContainerBackgroundImage(
    imageUrl?: string,
    bgSize?: string,
    positionX?: number,
    positionY?: number,
  ): void {
    // Remove existing container background image style
    this.removeContainerBackgroundImageStyle();

    if (!imageUrl) return;

    // Calculate background position from percentages
    const posX = positionX ?? 50;
    const posY = positionY ?? 50;
    const size = bgSize ?? 'cover';

    // IMPORTANT: We cannot use CSS custom properties for large base64 images because
    // browsers have CSSOM value length limits (typically 2KB-5KB per property).
    // Target the ::before pseudo-element so background opacity doesn't affect form content.
    const backgroundCss = `
.form-container-themed::before {
  background-image: url('${imageUrl}') !important;
  background-size: ${size} !important;
  background-position: ${posX}% ${posY}% !important;
}`;

    // Create and inject style element
    const styleElement = document.createElement('style');
    styleElement.id = 'theme-container-bg-image';
    styleElement.textContent = backgroundCss;

    document.head.appendChild(styleElement);

    console.log('[ThemePreviewService] Container background image injected via <style> tag');
  }

  /**
   * Removes container background image style element.
   * Story 25.3: Container styling cleanup.
   * @private
   */
  private removeContainerBackgroundImageStyle(): void {
    const existingStyle = document.getElementById('theme-container-bg-image');
    if (existingStyle) {
      existingStyle.remove();
    }
  }

  /**
   * Constructs CSS box-shadow string from shadow properties.
   * Supports both preset shadows (subtle, medium, strong) and custom shadow values.
   * Story 25.3: Container shadow styling.
   * @private
   * @param shadowProps - Shadow properties object
   * @returns CSS box-shadow string or 'none' if shadow disabled
   * @example
   * buildShadowCss({ enabled: true, preset: 'medium' })
   * // Returns: "0px 4px 6px 0px rgba(0, 0, 0, 0.1)"
   * @example
   * buildShadowCss({ enabled: true, preset: 'custom', offsetX: 2, offsetY: 4, blur: 8, spread: 0, color: 'rgba(0,0,0,0.2)' })
   * // Returns: "2px 4px 8px 0px rgba(0,0,0,0.2)"
   */
  private buildShadowCss(shadowProps: {
    enabled?: boolean;
    preset?: string;
    offsetX?: number;
    offsetY?: number;
    blur?: number;
    spread?: number;
    color?: string;
    intensity?: number;
  }): string {
    // Return 'none' if shadow disabled
    if (!shadowProps.enabled) {
      return 'none';
    }

    // Shadow presets (matching Epic 25 design specs)
    const shadowPresets: Record<
      string,
      { offsetX: number; offsetY: number; blur: number; spread: number; color: string }
    > = {
      subtle: { offsetX: 0, offsetY: 1, blur: 3, spread: 0, color: 'rgba(0, 0, 0, 0.1)' },
      medium: { offsetX: 0, offsetY: 4, blur: 6, spread: 0, color: 'rgba(0, 0, 0, 0.1)' },
      strong: { offsetX: 0, offsetY: 10, blur: 15, spread: 0, color: 'rgba(0, 0, 0, 0.2)' },
    };

    const preset = shadowProps.preset ?? 'medium';

    // Use preset values if preset is not 'custom', otherwise use individual properties
    let offsetX: number, offsetY: number, blur: number, spread: number, color: string;

    if (preset !== 'custom' && preset !== 'none' && shadowPresets[preset]) {
      const presetValues = shadowPresets[preset];
      offsetX = presetValues.offsetX;
      offsetY = presetValues.offsetY;
      blur = presetValues.blur;
      spread = presetValues.spread;
      color = presetValues.color;
    } else {
      // Custom shadow: use individual properties
      offsetX = shadowProps.offsetX ?? 0;
      offsetY = shadowProps.offsetY ?? 4;
      blur = shadowProps.blur ?? 6;
      spread = shadowProps.spread ?? 0;
      color = shadowProps.color ?? 'rgba(0, 0, 0, 0.1)';
    }

    // Construct CSS shadow string: "offsetX offsetY blur spread color"
    return `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${color}`;
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
