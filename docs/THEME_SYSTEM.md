# Theme System Documentation

The NodeAngularFullStack project implements a comprehensive theming system using CSS custom
properties (CSS variables) combined with SCSS and Angular services. This system provides full
support for light/dark themes, system preference detection, and custom theme creation.

## 🎨 Architecture Overview

The theme system consists of four main components:

1. **CSS Custom Properties** (`apps/web/src/styles/theme.scss`) - Core theme variables
2. **SCSS Integration** (`apps/web/src/styles.scss`) - Tailwind overrides and utilities
3. **Theme Service** (`apps/web/src/app/core/services/theme.service.ts`) - TypeScript theme
   management
4. **Theme Toggle Component** (`apps/web/src/app/shared/components/theme-toggle/`) - UI controls

## 📋 Features

- ✅ **Light/Dark Theme Support** - Complete color schemes for both themes
- ✅ **System Preference Detection** - Automatically respects user's OS preference
- ✅ **Theme Persistence** - Saves user's theme choice in localStorage
- ✅ **Dynamic Theme Switching** - Real-time theme changes without page reload
- ✅ **CSS Custom Properties** - Modern CSS variables for all theme tokens
- ✅ **TypeScript Integration** - Type-safe theme variable access
- ✅ **Tailwind Compatibility** - Seamless integration with existing Tailwind classes
- ✅ **Component Integration** - Ready-to-use theme toggle component
- ✅ **Responsive Design** - Theme-aware responsive utilities
- ✅ **Custom Theme Creation** - Programmatic theme customization

## 🚀 Quick Start

### Basic Theme Usage

```html
<!-- Use theme variables in templates -->
<div class="bg-surface text-primary border-primary">Content with theme-aware colors</div>

<!-- Use utility classes -->
<button class="btn btn-primary">Themed Button</button>
<div class="card">Themed Card</div>
```

### Adding Theme Toggle

```typescript
// In your component
import { ThemeToggleComponent } from '../shared/components';

@Component({
  imports: [ThemeToggleComponent],
  template: `
    <!-- Simple toggle -->
    <app-theme-toggle />

    <!-- Extended options -->
    <app-theme-toggle [showAllOptions]="true" />
  `,
})
export class MyComponent {}
```

### Using Theme Service

```typescript
import { inject } from '@angular/core';
import { ThemeService } from '../core/services/theme.service';

export class MyComponent {
  private themeService = inject(ThemeService);

  // Get current theme
  get currentTheme() {
    return this.themeService.currentTheme();
  }

  // Check if dark mode is active
  get isDarkMode() {
    return this.themeService.isDarkMode();
  }

  // Programmatically change theme
  switchToLight() {
    this.themeService.setTheme('light');
  }

  // Get theme variable value
  getPrimaryColor() {
    return this.themeService.getThemeVariable('--color-primary-600');
  }
}
```

## 🎯 Theme Variables Reference

### Color System

#### Primary Colors

```css
--color-primary-50   /* Lightest blue */
--color-primary-100
--color-primary-200
--color-primary-300
--color-primary-400
--color-primary-500
--color-primary-600  /* Base primary */
--color-primary-700
--color-primary-800
--color-primary-900  /* Darkest blue */
```

#### Semantic Colors

```css
--color-background    /* Page background */
--color-surface      /* Card/component backgrounds */
--color-text-primary /* Main text color */
--color-text-secondary /* Secondary text */
--color-text-muted   /* Disabled/muted text */
--color-border       /* Default borders */
```

#### Status Colors

```css
/* Success (Green) */
--color-success-100, --color-success-500, --color-success-800

/* Error (Red) */
--color-error-100, --color-error-500, --color-error-800

/* Warning (Yellow) */
--color-warning-100, --color-warning-500, --color-warning-800

/* Info (Blue) */
--color-info-100, --color-info-500, --color-info-800
```

### Typography System

```css
/* Font Families */
--font-family-sans   /* System font stack */
--font-family-mono   /* Monospace fonts */

/* Font Sizes */
--font-size-xs       /* 12px */
--font-size-sm       /* 14px */
--font-size-base     /* 16px */
--font-size-lg       /* 18px */
--font-size-xl       /* 20px */
--font-size-2xl      /* 24px */
--font-size-3xl      /* 30px */

/* Font Weights */
--font-weight-normal     /* 400 */
--font-weight-medium     /* 500 */
--font-weight-bold       /* 700 */
--font-weight-extrabold  /* 800 */
```

### Spacing System

```css
/* Base Unit */
--spacing-unit       /* 0.25rem (4px) */

/* Scale */
--spacing-1          /* 4px */
--spacing-2          /* 8px */
--spacing-3          /* 12px */
--spacing-4          /* 16px */
--spacing-6          /* 24px */
--spacing-8          /* 32px */
--spacing-12         /* 48px */
--spacing-16         /* 64px */

/* Semantic Spacing */
--spacing-component-xs   /* 8px */
--spacing-component-sm   /* 12px */
--spacing-component-md   /* 16px */
--spacing-component-lg   /* 24px */
--spacing-component-xl   /* 32px */

--spacing-section-xs     /* 32px */
--spacing-section-sm     /* 48px */
--spacing-section-md     /* 64px */
--spacing-section-lg     /* 80px */
--spacing-section-xl     /* 96px */
```

### Component Variables

```css
/* Forms */
--form-input-height          /* 44px */
--form-input-padding-x       /* 12px */
--form-input-border-radius   /* 6px */

/* Buttons */
--button-height              /* 44px */
--button-padding-x           /* 24px */
--button-border-radius       /* 6px */

/* Cards */
--card-padding               /* 24px */
--card-border-radius         /* 8px */
--card-shadow                /* Base shadow */

/* Navigation */
--nav-height                 /* 64px */
--nav-padding-x              /* 16px */
```

## 🛠️ Advanced Usage

### Creating Custom Themes

```typescript
import { inject } from '@angular/core';
import { ThemeService } from '../core/services/theme.service';

export class ThemeCustomizer {
  private themeService = inject(ThemeService);

  createBrandTheme() {
    this.themeService.createCustomTheme({
      colors: {
        primary: {
          500: '#7C3AED', // Purple primary
          600: '#6D28D9',
          700: '#5B21B6',
        },
      },
      typography: {
        fontSize: {
          base: '18px', // Larger base font
          lg: '20px',
        },
      },
    });
  }

  exportCurrentTheme() {
    const css = this.themeService.exportThemeAsCSS();
    console.log(css); // Export as CSS string
  }
}
```

### Theme-Aware Components

```typescript
@Component({
  template: `
    <div [style.background-color]="backgroundColor()" [style.color]="textColor()">
      Theme-aware content
    </div>
  `,
})
export class ThemeAwareComponent {
  private themeService = inject(ThemeService);

  backgroundColor = computed(() => {
    return this.themeService.getThemeVariable('--color-surface');
  });

  textColor = computed(() => {
    return this.themeService.getThemeVariable('--color-text-primary');
  });
}
```

### Dark Mode Specific Styles

```scss
// SCSS approach
.my-component {
  background: var(--color-surface);

  // Dark mode specific styles
  [data-theme='dark'] & {
    box-shadow: var(--shadow-lg);
  }

  // System dark mode
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme]) & {
      box-shadow: var(--shadow-lg);
    }
  }
}
```

## 🎨 Utility Classes

### Pre-built Components

```html
<!-- Button variants -->
<button class="btn btn-primary">Primary Button</button>

<!-- Card component -->
<div class="card">
  <h2 class="text-primary">Card Title</h2>
  <p class="text-secondary">Card content</p>
</div>

<!-- Form input -->
<input class="form-input" placeholder="Themed input" />
```

### Color Utilities

```html
<!-- Background colors -->
<div class="bg-surface">Surface background</div>
<div class="bg-primary-50">Light primary background</div>

<!-- Text colors -->
<span class="text-primary">Primary text</span>
<span class="text-secondary">Secondary text</span>
<span class="text-muted">Muted text</span>

<!-- Border colors -->
<div class="border border-primary">Primary border</div>
```

### Spacing Utilities

```html
<!-- Padding -->
<div class="p-component">Component padding</div>
<div class="p-section">Section padding</div>

<!-- Margin -->
<div class="m-component">Component margin</div>
<div class="space-y-4">Vertical spacing</div>
```

## 🔧 Implementation Details

### Theme Service API

```typescript
interface ThemeService {
  // Reactive signals
  currentTheme(): 'light' | 'dark' | 'system';
  isDarkMode(): boolean;
  isSystemDark(): boolean;

  // Theme management
  setTheme(theme: ThemeType, persist?: boolean): void;
  toggleTheme(): void;
  useSystemTheme(): void;

  // Variable access
  getThemeVariable(property: string): string;
  setThemeVariable(property: string, value: string): void;
  getThemeVariables(): ThemeVariables;

  // Custom themes
  createCustomTheme(overrides: Partial<ThemeVariables>): void;
  exportThemeAsCSS(): string;
}
```

### Theme Toggle Component Props

```typescript
@Component({
  inputs: ['showAllOptions'], // boolean - show all three theme options
})
export class ThemeToggleComponent {
  showAllOptions = false; // Simple toggle vs full options
}
```

## 📱 Responsive Theming

The theme system includes responsive utilities for different screen sizes:

```scss
.responsive-component {
  font-size: calc(var(--font-size-base) * var(--text-scale, 1));
  padding: calc(var(--spacing-4) * var(--spacing-scale, 1));

  @media (max-width: 639px) {
    --text-scale: 0.9;
    --spacing-scale: 0.75;
  }

  @media (min-width: 1024px) {
    --text-scale: 1.1;
    --spacing-scale: 1.1;
  }
}
```

## 🧪 Testing Themes

### Manual Testing

1. **Theme Toggle**: Use the theme toggle component to switch between themes
2. **System Preference**: Change your OS theme preference to test system mode
3. **Persistence**: Reload the page to ensure theme choice is saved
4. **Responsive**: Test on different screen sizes

### Automated Testing

```typescript
// Example theme service test
describe('ThemeService', () => {
  it('should toggle between light and dark themes', () => {
    const service = TestBed.inject(ThemeService);

    service.setTheme('light');
    expect(service.currentTheme()).toBe('light');
    expect(service.isDarkMode()).toBe(false);

    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark');
    expect(service.isDarkMode()).toBe(true);
  });
});
```

## 🔄 Migration Guide

If you have existing components using hardcoded colors:

### Before (Hardcoded)

```scss
.my-component {
  background-color: #ffffff;
  color: #1f2937;
  border: 1px solid #e5e7eb;
}
```

### After (Theme Variables)

```scss
.my-component {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  border: var(--border-width-1) solid var(--color-border);
}
```

## 🎯 Best Practices

1. **Always use theme variables** instead of hardcoded colors
2. **Test both light and dark modes** during development
3. **Use semantic variables** (`--color-text-primary`) over specific ones (`--color-gray-900`)
4. **Leverage utility classes** for consistent spacing and typography
5. **Consider accessibility** - ensure sufficient color contrast in both themes
6. **Test system preference changes** to ensure proper theme switching

## 🐛 Troubleshooting

### Common Issues

**Theme not applying:**

- Ensure `theme.scss` is imported in `styles.scss`
- Check browser console for CSS errors
- Verify component imports include `ThemeToggleComponent`

**Variables not updating:**

- Confirm you're using CSS custom properties (`var(--variable-name)`)
- Check that theme service is injected correctly
- Ensure Angular change detection is working

**Dark mode not working:**

- Verify system preference detection
- Check localStorage for saved preferences
- Ensure dark theme styles are properly defined

### Browser Support

The theme system requires CSS custom properties support:

- ✅ Chrome 49+
- ✅ Firefox 31+
- ✅ Safari 9.1+
- ✅ Edge 16+

## 📚 Additional Resources

- [CSS Custom Properties MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Angular Signals](https://angular.io/guide/signals)
- [PrimeNG Theming](https://primeng.org/theming)
- [Tailwind CSS Customization](https://tailwindcss.com/docs/customizing-colors)

---

**Theme System Status: ✅ Complete**

The theming system is fully implemented and ready for production use. All components support both
light and dark themes with proper system preference detection and persistence.
