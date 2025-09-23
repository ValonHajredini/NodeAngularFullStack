import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Available theme types
 */
export type ThemeType = 'light' | 'dark' | 'system';

/**
 * Theme preference configuration
 */
export interface ThemeConfig {
  /** Current theme type */
  theme: ThemeType;
  /** Whether to respect system preference */
  respectSystemPreference: boolean;
  /** Whether to persist theme choice */
  persistChoice: boolean;
}

/**
 * Theme variables structure for programmatic access
 */
export interface ThemeVariables {
  colors: {
    primary: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    gray: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    semantic: {
      background: string;
      surface: string;
      textPrimary: string;
      textSecondary: string;
      textMuted: string;
      border: string;
    };
  };
  spacing: {
    unit: string;
    component: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    section: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  };
  typography: {
    fontFamily: {
      sans: string;
      mono: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      bold: string;
      extrabold: string;
    };
  };
}

/**
 * Theme Service
 *
 * Provides comprehensive theme management including:
 * - Light/Dark theme switching
 * - System preference detection
 * - Theme persistence
 * - Programmatic access to theme variables
 * - CSS custom property manipulation
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly STORAGE_KEY = 'app-theme-preference';
  private readonly THEME_ATTRIBUTE = 'data-theme';

  // Reactive signals
  private readonly _currentTheme = signal<ThemeType>('system');
  private readonly _isDarkMode = signal<boolean>(false);
  private readonly _isSystemDark = signal<boolean>(false);

  // Public readonly signals
  readonly currentTheme = this._currentTheme.asReadonly();
  readonly isDarkMode = this._isDarkMode.asReadonly();
  readonly isSystemDark = this._isSystemDark.asReadonly();

  constructor() {
    if (this.isBrowser) {
      this.initializeTheme();
      this.setupSystemPreferenceListener();

      // Effect to update DOM when theme changes
      effect(() => {
        this.applyThemeToDOM();
      });
    }
  }

  /**
   * Initialize theme from stored preference or system default
   */
  private initializeTheme(): void {
    const stored = this.getStoredTheme();
    const systemDark = this.getSystemPreference();

    this._isSystemDark.set(systemDark);

    if (stored) {
      this.setTheme(stored, false); // Don't persist again
    } else {
      this.setTheme('system', true);
    }
  }

  /**
   * Set the current theme
   */
  setTheme(theme: ThemeType, persist: boolean = true): void {
    this._currentTheme.set(theme);

    // Calculate if dark mode should be active
    const shouldBeDark = theme === 'dark' || (theme === 'system' && this._isSystemDark());
    this._isDarkMode.set(shouldBeDark);

    if (persist) {
      this.persistTheme(theme);
    }
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const current = this._currentTheme();
    if (current === 'system') {
      // If system, switch to opposite of current system preference
      this.setTheme(this._isSystemDark() ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      this.setTheme(current === 'light' ? 'dark' : 'light');
    }
  }

  /**
   * Reset to system preference
   */
  useSystemTheme(): void {
    this.setTheme('system');
  }

  /**
   * Get computed style value for a CSS custom property
   */
  getThemeVariable(property: string): string {
    if (!this.isBrowser) return '';

    const root = document.documentElement;
    return getComputedStyle(root).getPropertyValue(property).trim();
  }

  /**
   * Set a CSS custom property value
   */
  setThemeVariable(property: string, value: string): void {
    if (!this.isBrowser) return;

    const root = document.documentElement;
    root.style.setProperty(property, value);
  }

  /**
   * Get all theme variables as a structured object
   */
  getThemeVariables(): ThemeVariables {
    return {
      colors: {
        primary: {
          50: this.getThemeVariable('--color-primary-50'),
          100: this.getThemeVariable('--color-primary-100'),
          200: this.getThemeVariable('--color-primary-200'),
          300: this.getThemeVariable('--color-primary-300'),
          400: this.getThemeVariable('--color-primary-400'),
          500: this.getThemeVariable('--color-primary-500'),
          600: this.getThemeVariable('--color-primary-600'),
          700: this.getThemeVariable('--color-primary-700'),
          800: this.getThemeVariable('--color-primary-800'),
          900: this.getThemeVariable('--color-primary-900'),
        },
        gray: {
          50: this.getThemeVariable('--color-gray-50'),
          100: this.getThemeVariable('--color-gray-100'),
          200: this.getThemeVariable('--color-gray-200'),
          300: this.getThemeVariable('--color-gray-300'),
          400: this.getThemeVariable('--color-gray-400'),
          500: this.getThemeVariable('--color-gray-500'),
          600: this.getThemeVariable('--color-gray-600'),
          700: this.getThemeVariable('--color-gray-700'),
          800: this.getThemeVariable('--color-gray-800'),
          900: this.getThemeVariable('--color-gray-900'),
        },
        semantic: {
          background: this.getThemeVariable('--color-background'),
          surface: this.getThemeVariable('--color-surface'),
          textPrimary: this.getThemeVariable('--color-text-primary'),
          textSecondary: this.getThemeVariable('--color-text-secondary'),
          textMuted: this.getThemeVariable('--color-text-muted'),
          border: this.getThemeVariable('--color-border'),
        },
      },
      spacing: {
        unit: this.getThemeVariable('--spacing-unit'),
        component: {
          xs: this.getThemeVariable('--spacing-component-xs'),
          sm: this.getThemeVariable('--spacing-component-sm'),
          md: this.getThemeVariable('--spacing-component-md'),
          lg: this.getThemeVariable('--spacing-component-lg'),
          xl: this.getThemeVariable('--spacing-component-xl'),
        },
        section: {
          xs: this.getThemeVariable('--spacing-section-xs'),
          sm: this.getThemeVariable('--spacing-section-sm'),
          md: this.getThemeVariable('--spacing-section-md'),
          lg: this.getThemeVariable('--spacing-section-lg'),
          xl: this.getThemeVariable('--spacing-section-xl'),
        },
      },
      typography: {
        fontFamily: {
          sans: this.getThemeVariable('--font-family-sans'),
          mono: this.getThemeVariable('--font-family-mono'),
        },
        fontSize: {
          xs: this.getThemeVariable('--font-size-xs'),
          sm: this.getThemeVariable('--font-size-sm'),
          base: this.getThemeVariable('--font-size-base'),
          lg: this.getThemeVariable('--font-size-lg'),
          xl: this.getThemeVariable('--font-size-xl'),
          '2xl': this.getThemeVariable('--font-size-2xl'),
          '3xl': this.getThemeVariable('--font-size-3xl'),
        },
        fontWeight: {
          normal: this.getThemeVariable('--font-weight-normal'),
          medium: this.getThemeVariable('--font-weight-medium'),
          bold: this.getThemeVariable('--font-weight-bold'),
          extrabold: this.getThemeVariable('--font-weight-extrabold'),
        },
      },
    };
  }

  /**
   * Create a custom theme by overriding specific variables
   */
  createCustomTheme(overrides: Partial<ThemeVariables>): void {
    if (!this.isBrowser) return;

    // Apply color overrides
    if (overrides.colors?.primary) {
      Object.entries(overrides.colors.primary).forEach(([shade, value]) => {
        if (value) this.setThemeVariable(`--color-primary-${shade}`, value);
      });
    }

    // Apply spacing overrides
    if (overrides.spacing?.component) {
      Object.entries(overrides.spacing.component).forEach(([size, value]) => {
        if (value) this.setThemeVariable(`--spacing-component-${size}`, value);
      });
    }

    // Apply typography overrides
    if (overrides.typography?.fontSize) {
      Object.entries(overrides.typography.fontSize).forEach(([size, value]) => {
        if (value) this.setThemeVariable(`--font-size-${size}`, value);
      });
    }
  }

  /**
   * Export current theme as CSS custom properties
   */
  exportThemeAsCSS(): string {
    const variables = this.getThemeVariables();
    let css = ':root {\n';

    // Add color variables
    Object.entries(variables.colors.primary).forEach(([shade, value]) => {
      css += `  --color-primary-${shade}: ${value};\n`;
    });

    Object.entries(variables.colors.semantic).forEach(([name, value]) => {
      css += `  --color-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};\n`;
    });

    // Add spacing variables
    Object.entries(variables.spacing.component).forEach(([size, value]) => {
      css += `  --spacing-component-${size}: ${value};\n`;
    });

    // Add typography variables
    Object.entries(variables.typography.fontSize).forEach(([size, value]) => {
      css += `  --font-size-${size}: ${value};\n`;
    });

    css += '}\n';
    return css;
  }

  /**
   * Apply theme to DOM
   */
  private applyThemeToDOM(): void {
    if (!this.isBrowser) return;

    const html = document.documentElement;
    const isDark = this._isDarkMode();

    // Always set theme attribute based on actual dark/light state
    // This ensures CSS variables switch correctly
    html.setAttribute(this.THEME_ATTRIBUTE, isDark ? 'dark' : 'light');

    // Set dark mode class for compatibility
    html.classList.toggle('dark', isDark);
  }

  /**
   * Get system color scheme preference
   */
  private getSystemPreference(): boolean {
    if (!this.isBrowser) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Setup listener for system preference changes
   */
  private setupSystemPreferenceListener(): void {
    if (!this.isBrowser) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    mediaQuery.addEventListener('change', (e) => {
      this._isSystemDark.set(e.matches);

      // If using system theme, update dark mode state
      if (this._currentTheme() === 'system') {
        this._isDarkMode.set(e.matches);
      }
    });
  }

  /**
   * Get stored theme preference
   */
  private getStoredTheme(): ThemeType | null {
    if (!this.isBrowser) return null;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored as ThemeType;
      }
    } catch {
      // Ignore localStorage errors
    }

    return null;
  }

  /**
   * Persist theme preference
   */
  private persistTheme(theme: ThemeType): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch {
      // Ignore localStorage errors
    }
  }
}
