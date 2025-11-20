# Theme System Documentation

This document explains how to use the comprehensive theme system implemented in this Angular application.

## Overview

The theme system provides:

- **CSS Custom Properties** for all design tokens (colors, spacing, typography)
- **Theme Management Service** for programmatic control
- **Tailwind-compatible utilities** that use theme variables
- **Dark/Light mode support** with system preference detection
- **Future-proof theming** for easy customization

## Quick Start

### 1. Using Theme Variables in Templates

The existing Tailwind classes now use theme variables automatically:

```html
<!-- These classes automatically use theme variables -->
<div class="bg-primary-600 text-white p-4 rounded-md">Primary button</div>

<div class="bg-surface border border-gray-300 p-6 rounded-lg">
  Card with themed background and border
</div>
```

### 2. Using Theme Variables in Component Styles

```scss
.my-component {
  // Use CSS custom properties directly
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  padding: var(--spacing-4);
  border-radius: var(--border-radius-md);

  // Semantic colors adapt to theme
  border: 1px solid var(--color-border);

  &:hover {
    background-color: var(--color-primary-50);
  }
}
```

### 3. Managing Themes Programmatically

```typescript
import { ThemeService } from '@core/services/theme.service';

@Component({...})
export class MyComponent {
  constructor(private themeService: ThemeService) {}

  // Toggle theme
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  // Set specific theme
  setLightTheme() {
    this.themeService.setTheme('light');
  }

  // Use system preference
  useSystemTheme() {
    this.themeService.useSystemTheme();
  }

  // Check current theme
  get isDarkMode() {
    return this.themeService.isDarkMode();
  }
}
```

## Available Design Tokens

### Colors

#### Primary Color Scale

```css
var(--color-primary-50)   /* Lightest primary */
var(--color-primary-100)
var(--color-primary-200)
var(--color-primary-300)
var(--color-primary-400)
var(--color-primary-500)
var(--color-primary-600)  /* Base primary */
var(--color-primary-700)
var(--color-primary-800)
var(--color-primary-900)  /* Darkest primary */
```

#### Semantic Colors (Auto-adapting)

```css
var(--color-background)    /* Page background */
var(--color-surface)       /* Card/modal backgrounds */
var(--color-text-primary)  /* Main text */
var(--color-text-secondary)/* Secondary text */
var(--color-text-muted)    /* Muted text */
var(--color-text-inverse)  /* White text */
var(--color-border)        /* Default borders */
var(--color-border-light)  /* Light borders */
var(--color-border-dark)   /* Dark borders */
```

#### Status Colors

```css
/* Error/Danger */
var(--color-error-50) to var(--color-error-900)

/* Success/Green */
var(--color-success-50) to var(--color-success-900)

/* Warning/Yellow */
var(--color-warning-50) to var(--color-warning-900)

/* Info/Blue */
var(--color-info-50) to var(--color-info-900)
```

### Spacing

#### Base Spacing Scale

```css
var(--spacing-0)     /* 0px */
var(--spacing-1)     /* 4px */
var(--spacing-2)     /* 8px */
var(--spacing-3)     /* 12px */
var(--spacing-4)     /* 16px */
var(--spacing-6)     /* 24px */
var(--spacing-8)     /* 32px */
var(--spacing-12)    /* 48px */
/* ... up to --spacing-96 (384px) */
```

#### Semantic Spacing

```css
/* Component spacing */
var(--spacing-component-xs)  /* 8px */
var(--spacing-component-sm)  /* 12px */
var(--spacing-component-md)  /* 16px */
var(--spacing-component-lg)  /* 24px */
var(--spacing-component-xl)  /* 32px */

/* Section spacing */
var(--spacing-section-xs)    /* 32px */
var(--spacing-section-sm)    /* 48px */
var(--spacing-section-md)    /* 64px */
var(--spacing-section-lg)    /* 80px */
var(--spacing-section-xl)    /* 96px */
```

### Typography

#### Font Families

```css
var(--font-family-sans)  /* System font stack */
var(--font-family-mono)  /* Monospace fonts */
```

#### Font Sizes

```css
var(--font-size-xs)    /* 12px */
var(--font-size-sm)    /* 14px */
var(--font-size-base)  /* 16px */
var(--font-size-lg)    /* 18px */
var(--font-size-xl)    /* 20px */
var(--font-size-2xl)   /* 24px */
var(--font-size-3xl)   /* 30px */
/* ... up to --font-size-6xl */
```

#### Font Weights

```css
var(--font-weight-normal)     /* 400 */
var(--font-weight-medium)     /* 500 */
var(--font-weight-semibold)   /* 600 */
var(--font-weight-bold)       /* 700 */
var(--font-weight-extrabold)  /* 800 */
```

## Advanced Usage

### Creating Custom Themes

```typescript
// Inject the theme service
constructor(private themeService: ThemeService) {}

// Create a custom brand theme
createBrandTheme() {
  this.themeService.createCustomTheme({
    colors: {
      primary: {
        600: '#8b5cf6',  // Purple brand color
        700: '#7c3aed',
        500: '#a855f7',
      }
    },
    spacing: {
      component: {
        md: '20px',  // Slightly larger component spacing
      }
    }
  });
}
```

### Accessing Theme Variables Programmatically

```typescript
// Get current theme variables
const themeVars = this.themeService.getThemeVariables();
console.log('Primary color:', themeVars.colors.primary[600]);

// Get specific variable
const primaryColor = this.themeService.getThemeVariable('--color-primary-600');

// Set custom variable
this.themeService.setThemeVariable('--my-custom-color', '#ff6b6b');
```

### Responsive Theme Scaling

The responsive enhancements CSS already includes scaling variables:

```css
.responsive-text {
  font-size: calc(1rem * var(--text-scale, 1));
}

.responsive-spacing {
  padding: calc(1rem * var(--spacing-scale, 1));
}
```

### Component-Level Theming

```scss
.my-custom-component {
  // Use component-specific spacing
  padding: var(--spacing-component-md);

  // Use semantic colors that adapt to theme
  background: var(--color-surface);
  border: 1px solid var(--color-border);

  .title {
    color: var(--color-text-primary);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
  }

  .description {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    margin-top: var(--spacing-2);
  }
}
```

## Theme-Aware Utility Classes

Use these pre-built utility classes that automatically adapt to the current theme:

```html
<!-- Background utilities -->
<div class="bg-surface">Surface background</div>
<div class="bg-primary">Primary background</div>

<!-- Text utilities -->
<p class="text-primary">Primary text color</p>
<p class="text-secondary">Secondary text color</p>
<p class="text-muted">Muted text color</p>

<!-- Spacing utilities -->
<div class="p-component">Component padding</div>
<div class="m-section">Section margin</div>

<!-- Component utilities -->
<div class="card">Themed card component</div>
<button class="btn btn-primary">Themed button</button>
<input class="form-input" placeholder="Themed input" />
```

## Migration from Hardcoded Values

### Before (Hardcoded)

```scss
.my-component {
  background-color: #ffffff;
  color: #1f2937;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}
```

### After (Themed)

```scss
.my-component {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  padding: var(--spacing-4);
  border: var(--border-width-1) solid var(--color-border);
  border-radius: var(--border-radius-md);
}
```

## Best Practices

### 1. Use Semantic Colors

```scss
/* ✅ Good - Uses semantic color that adapts */
color: var(--color-text-primary);

/* ❌ Avoid - Hardcoded color */
color: #1f2937;
```

### 2. Use Spacing Scale

```scss
/* ✅ Good - Uses spacing scale */
margin: var(--spacing-4) var(--spacing-6);

/* ❌ Avoid - Arbitrary values */
margin: 15px 23px;
```

### 3. Use Component Spacing for Related Elements

```scss
/* ✅ Good - Consistent component spacing */
.form-group {
  margin-bottom: var(--spacing-component-md);
}

/* ❌ Avoid - Inconsistent spacing */
.form-group {
  margin-bottom: 18px;
}
```

### 4. Leverage Theme Service Signals

```typescript
// ✅ Good - Reactive to theme changes
@Component({
  template: ` <div [class.dark-specific]="isDark()">Content adapts to theme</div> `,
})
export class MyComponent {
  isDark = this.themeService.isDarkMode;

  constructor(private themeService: ThemeService) {}
}
```

## Browser Support

The theme system uses CSS Custom Properties, which are supported in:

- Chrome 49+
- Firefox 31+
- Safari 9.1+
- Edge 16+

For older browsers, the system gracefully falls back to default Tailwind values.

## Performance Considerations

- CSS Custom Properties are performant and don't require JavaScript to update
- Theme switches are instant with no flicker
- Variables are computed once and cached by the browser
- The theme service uses Angular signals for optimal change detection

## Future Extensibility

The theme system is designed to be easily extensible:

1. **Add new color scales** by extending the CSS custom properties
2. **Create theme variants** using the theme service
3. **Add new design tokens** following the existing patterns
4. **Integrate with external design systems** by mapping their tokens to our variables

## Troubleshooting

### Theme Variables Not Working

1. Ensure `theme.scss` is imported before Tailwind in `styles.scss`
2. Check that the CSS custom property name is correct (include `--` prefix)
3. Verify browser developer tools show the variable is defined

### Dark Theme Not Activating

1. Check that `ThemeService` is provided in your component
2. Verify system preference detection is working
3. Ensure the theme service is called after platform detection

### Custom Theme Not Applying

1. Make sure to call `createCustomTheme()` after Angular initialization
2. Check that CSS custom properties are being set correctly
3. Verify theme variables are not being overridden by higher specificity rules
