import { Injectable } from '@angular/core';
import { FormTheme, ResponsiveThemeConfig, ThemeProperties } from '@nodeangularfullstack/shared';

/**
 * Service for applying theme CSS variables to the document.
 * Handles dynamic CSS variable injection for real-time theme preview.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemePreviewService {
  /**
   * Applies theme CSS variables to the document root element.
   * Sets desktop styles immediately and applies mobile overrides via media query if available.
   * @param theme - The theme configuration to apply
   * @example
   * themePreviewService.applyThemeCss(theme);
   */
  applyThemeCss(theme: FormTheme): void {
    const root = document.documentElement;
    const { desktop, mobile } = theme.themeConfig;

    // Apply desktop styles to :root
    this.setCssVar(root, '--theme-primary-color', desktop.primaryColor);
    this.setCssVar(root, '--theme-secondary-color', desktop.secondaryColor);
    this.setCssVar(root, '--theme-bg-color', desktop.backgroundColor);
    this.setCssVar(root, '--theme-text-primary', desktop.textColorPrimary);
    this.setCssVar(root, '--theme-text-secondary', desktop.textColorSecondary);
    this.setCssVar(root, '--theme-font-heading', desktop.fontFamilyHeading);
    this.setCssVar(root, '--theme-font-body', desktop.fontFamilyBody);
    this.setCssVar(root, '--theme-field-radius', desktop.fieldBorderRadius);
    this.setCssVar(root, '--theme-field-spacing', desktop.fieldSpacing);
    this.setCssVar(root, '--theme-container-bg', desktop.containerBackground);
    this.setCssVar(root, '--theme-container-opacity', desktop.containerOpacity.toString());

    // Apply mobile overrides via media query (if mobile config exists)
    if (mobile) {
      this.applyMobileOverrides(mobile);
    }
  }

  /**
   * Removes all theme CSS variables from the document root element.
   * Clears both desktop and mobile theme styles.
   * @example
   * themePreviewService.clearThemeCss();
   */
  clearThemeCss(): void {
    const root = document.documentElement;

    // Remove desktop CSS variables
    const themeVars = [
      '--theme-primary-color',
      '--theme-secondary-color',
      '--theme-bg-color',
      '--theme-text-primary',
      '--theme-text-secondary',
      '--theme-font-heading',
      '--theme-font-body',
      '--theme-field-radius',
      '--theme-field-spacing',
      '--theme-container-bg',
      '--theme-container-opacity',
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
   * @private
   * @param mobile - Mobile theme properties to generate CSS for
   * @returns CSS string with media query and theme variable overrides
   */
  private generateMobileCss(mobile: Partial<ThemeProperties>): string {
    const overrides: string[] = [];

    if (mobile.primaryColor) {
      overrides.push(`--theme-primary-color: ${mobile.primaryColor};`);
    }
    if (mobile.secondaryColor) {
      overrides.push(`--theme-secondary-color: ${mobile.secondaryColor};`);
    }
    if (mobile.backgroundColor) {
      overrides.push(`--theme-bg-color: ${mobile.backgroundColor};`);
    }
    if (mobile.textColorPrimary) {
      overrides.push(`--theme-text-primary: ${mobile.textColorPrimary};`);
    }
    if (mobile.textColorSecondary) {
      overrides.push(`--theme-text-secondary: ${mobile.textColorSecondary};`);
    }
    if (mobile.fontFamilyHeading) {
      overrides.push(`--theme-font-heading: ${mobile.fontFamilyHeading};`);
    }
    if (mobile.fontFamilyBody) {
      overrides.push(`--theme-font-body: ${mobile.fontFamilyBody};`);
    }
    if (mobile.fieldBorderRadius) {
      overrides.push(`--theme-field-radius: ${mobile.fieldBorderRadius};`);
    }
    if (mobile.fieldSpacing) {
      overrides.push(`--theme-field-spacing: ${mobile.fieldSpacing};`);
    }
    if (mobile.containerBackground) {
      overrides.push(`--theme-container-bg: ${mobile.containerBackground};`);
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
