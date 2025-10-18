# PrimeNG Component Theme Override Strategy

**Document Version**: 1.0 **Date**: 2025-10-18 **Epic**: Epic 24 - Universal Theme Application
**Story**: Story 24.1 - Theme Audit

---

## Overview

This document outlines the comprehensive strategy for applying theme CSS variables to PrimeNG
components within the form builder field preview system. It provides code patterns, specificity
strategies, and implementation guidelines for consistent theme integration across all PrimeNG-based
field types.

---

## PrimeNG Components Requiring Theme Integration

### Component Inventory

| Field Type        | PrimeNG Component     | Complexity    | Priority |
| ----------------- | --------------------- | ------------- | -------- |
| TEXT/EMAIL/NUMBER | InputText             | Low           | High     |
| SELECT            | Select (Dropdown)     | Medium        | High     |
| CHECKBOX          | Checkbox              | Medium        | Medium   |
| RADIO             | RadioButton           | Medium        | Medium   |
| DATE/DATETIME     | DatePicker (Calendar) | **Very High** | Medium   |
| FILE              | FileUpload            | Medium        | Medium   |
| TOGGLE            | ToggleSwitch          | Low           | Medium   |
| DIVIDER           | Divider               | Low           | Low      |

---

## General Override Principles

### 1. Component-Scoped `::ng-deep`

Always scope `::ng-deep` to the component to prevent global style pollution:

```scss
// ✅ GOOD - Component-scoped
:host ::ng-deep .p-checkbox {
  background-color: var(--theme-checkbox-background, #ffffff);
}

// ❌ BAD - Global pollution
::ng-deep .p-checkbox {
  background-color: var(--theme-checkbox-background, #ffffff);
}
```

### 2. CSS Variable Fallbacks

Always provide fallback values matching current implementation:

```scss
// ✅ GOOD - Fallback matches existing Tailwind/hardcoded color
background-color: var(--theme-input-background, #ffffff);
border-color: var(--theme-input-border-color, #d1d5db);

// ❌ BAD - No fallback (breaks un-themed forms)
background-color: var(--theme-input-background);
```

### 3. Specificity Strategy

Use parent selectors to increase specificity without `!important`:

```scss
// Level 1: Component class
.field-preview ::ng-deep .p-checkbox {
  border-color: var(--theme-input-border-color, #d1d5db);
}

// Level 2: State selectors (higher specificity)
.field-preview ::ng-deep .p-checkbox:hover {
  border-color: var(--theme-primary-color, #3b82f6);
}

// Level 3: Nested elements (highest specificity)
.field-preview ::ng-deep .p-checkbox .p-checkbox-box {
  background-color: var(--theme-checkbox-background, #ffffff);
}
```

### 4. Avoid `!important` Unless Absolutely Necessary

Only use `!important` when PrimeNG's inline styles or high-specificity selectors cannot be
overridden:

```scss
// ✅ GOOD - Only when absolutely necessary
.field-preview ::ng-deep .p-datepicker-header {
  background-color: var(--theme-primary-color, #3b82f6) !important;
}

// ❌ BAD - Overusing !important
.field-preview ::ng-deep .p-checkbox {
  border-color: var(--theme-input-border-color, #d1d5db) !important; // Not needed
}
```

---

## Component-Specific Implementation Patterns

### 1. InputText (TEXT/EMAIL/NUMBER) - COMPLETED

**Status**: ✅ Partial theme support already exists (lines 30-36 in
`text-input-preview.component.ts`)

**Current Implementation**:

```scss
::ng-deep .field-preview input.p-inputtext {
  border: 2px solid var(--theme-primary-color, #3b82f6);
  border-radius: var(--theme-field-radius, 4px);
  font-family: var(--theme-font-body, inherit);
  color: var(--theme-text-primary, #111827);
  transition: border-color 0.2s ease;
}
```

**Missing Variables** (Story 24.2):

```scss
::ng-deep .field-preview input.p-inputtext {
  // Add these:
  background-color: var(--theme-input-background, #ffffff);
  border-color: var(--theme-input-border-color, #d1d5db);

  &::placeholder {
    color: var(--theme-help-text-color, #9ca3af);
  }

  &:focus {
    border-color: var(--theme-primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
  }

  &:disabled {
    background-color: var(--theme-input-disabled-background, #f9fafb);
    color: var(--theme-input-disabled-text-color, #9ca3af);
    cursor: not-allowed;
  }
}
```

**Estimated Effort**: 1 hour (extend existing implementation)

---

### 2. Select (Dropdown) - PARTIAL

**Current Implementation** (lines 56-62 in `select-preview.component.ts`):

```scss
::ng-deep .field-preview p-select.theme-select {
  border: 2px solid var(--theme-primary-color, #3b82f6);
  border-radius: var(--theme-field-radius, 4px);
  font-family: var(--theme-font-body, inherit);
  color: var(--theme-text-primary, #111827);
  transition: border-color 0.2s ease;
}
```

**Complete Implementation** (Story 24.2):

```scss
// Main select input
::ng-deep .field-preview .p-select {
  background-color: var(--theme-input-background, #ffffff);
  border: 1px solid var(--theme-input-border-color, #d1d5db);
  border-radius: var(--theme-border-radius, 0.375rem);
  font-family: var(--theme-body-font, system-ui);
  color: var(--theme-text-primary, #111827);

  &:hover {
    border-color: var(--theme-primary-color, #3b82f6);
  }

  &:focus {
    border-color: var(--theme-primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
  }
}

// Select label (displayed text)
::ng-deep .field-preview .p-select .p-select-label {
  color: var(--theme-text-primary, #111827);
  font-family: var(--theme-body-font, system-ui);
  padding: 0.5rem 0.75rem;
}

// Dropdown trigger icon
::ng-deep .field-preview .p-select .p-select-dropdown {
  color: var(--theme-text-secondary, #6b7280);
}

// Dropdown overlay panel
::ng-deep .p-select-overlay {
  background-color: var(--theme-input-background, #ffffff);
  border: 1px solid var(--theme-input-border-color, #d1d5db);
  border-radius: var(--theme-border-radius, 0.375rem);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

// Dropdown options
::ng-deep .p-select-overlay .p-select-option {
  color: var(--theme-text-primary, #111827);
  padding: 0.5rem 0.75rem;

  &:hover {
    background-color: var(--theme-primary-color, #3b82f6);
    color: #ffffff;
  }

  &.p-selected {
    background-color: rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
    color: var(--theme-primary-color, #3b82f6);
  }
}
```

**Estimated Effort**: 3 hours (dropdown overlay complexity)

---

### 3. Checkbox - NEW

**DOM Structure**:

```html
<p-checkbox>
  <div class="p-checkbox p-component">
    <div class="p-checkbox-box">
      <i class="p-checkbox-icon pi pi-check"></i>
    </div>
  </div>
</p-checkbox>
```

**Implementation** (Story 24.3):

```scss
// Checkbox container
::ng-deep .field-preview .p-checkbox {
  .p-checkbox-box {
    width: 1.25rem;
    height: 1.25rem;
    background-color: var(--theme-input-background, #ffffff);
    border: 2px solid var(--theme-input-border-color, #d1d5db);
    border-radius: var(--theme-border-radius, 0.375rem);
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--theme-primary-color, #3b82f6);
    }
  }

  // Checked state
  &.p-checked .p-checkbox-box {
    background-color: var(--theme-primary-color, #3b82f6);
    border-color: var(--theme-primary-color, #3b82f6);

    .p-checkbox-icon {
      color: #ffffff;
    }
  }

  // Focus state
  &.p-focus .p-checkbox-box {
    border-color: var(--theme-primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
  }

  // Disabled state
  &.p-disabled .p-checkbox-box {
    background-color: var(--theme-input-disabled-background, #f9fafb);
    border-color: var(--theme-input-border-color, #d1d5db);
    opacity: 0.6;
    cursor: not-allowed;
  }
}

// Label styling (separate from checkbox)
::ng-deep .field-preview label {
  color: var(--theme-label-color, #374151);
  font-family: var(--theme-body-font, system-ui);
  font-size: 0.875rem;

  .text-red-500 {
    color: var(--theme-required-indicator-color, #ef4444);
  }
}
```

**Estimated Effort**: 3 hours

---

### 4. RadioButton - NEW

**DOM Structure**:

```html
<p-radioButton>
  <div class="p-radiobutton p-component">
    <div class="p-radiobutton-box">
      <div class="p-radiobutton-icon"></div>
    </div>
  </div>
</p-radioButton>
```

**Implementation** (Story 24.3):

```scss
// Radio button container
::ng-deep .field-preview .p-radiobutton {
  .p-radiobutton-box {
    width: 1.25rem;
    height: 1.25rem;
    background-color: var(--theme-input-background, #ffffff);
    border: 2px solid var(--theme-input-border-color, #d1d5db);
    border-radius: 50%; // Always circular
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--theme-primary-color, #3b82f6);
    }
  }

  // Checked state (dot in center)
  &.p-checked .p-radiobutton-box {
    border-color: var(--theme-primary-color, #3b82f6);

    .p-radiobutton-icon {
      width: 0.625rem;
      height: 0.625rem;
      background-color: var(--theme-primary-color, #3b82f6);
      border-radius: 50%;
    }
  }

  // Focus state
  &.p-focus .p-radiobutton-box {
    border-color: var(--theme-primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
  }

  // Disabled state
  &.p-disabled .p-radiobutton-box {
    background-color: var(--theme-input-disabled-background, #f9fafb);
    opacity: 0.6;
    cursor: not-allowed;
  }
}

// Label styling
::ng-deep .field-preview label {
  color: var(--theme-label-color, #374151);
  font-family: var(--theme-body-font, system-ui);
  font-size: 0.875rem;
}
```

**Estimated Effort**: 3 hours

---

### 5. ToggleSwitch - NEW

**DOM Structure**:

```html
<p-toggleswitch>
  <div class="p-toggleswitch p-component">
    <div class="p-toggleswitch-slider"></div>
  </div>
</p-toggleswitch>
```

**Implementation** (Story 24.4):

```scss
// Toggle switch container
::ng-deep .field-preview .p-toggleswitch {
  .p-toggleswitch-slider {
    width: 3rem;
    height: 1.5rem;
    background-color: var(--theme-toggle-background-unchecked, #cbd5e0);
    border-radius: 0.75rem;
    transition: background-color 0.2s ease;
    position: relative;

    // Handle (slider)
    &:before {
      content: '';
      position: absolute;
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 50%;
      background-color: var(--theme-toggle-handle-color, #ffffff);
      top: 0.125rem;
      left: 0.125rem;
      transition: transform 0.2s ease;
    }

    &:hover {
      background-color: var(--theme-toggle-background-unchecked-hover, #a0aec0);
    }
  }

  // Checked state
  &.p-checked .p-toggleswitch-slider {
    background-color: var(--theme-toggle-background-checked, var(--theme-primary-color, #3b82f6));

    &:before {
      transform: translateX(1.5rem);
    }
  }

  // Focus state
  &.p-focus .p-toggleswitch-slider {
    box-shadow: 0 0 0 3px rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
  }

  // Disabled state
  &.p-disabled .p-toggleswitch-slider {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

// Label styling
::ng-deep .field-preview label {
  color: var(--theme-label-color, #374151);
  font-family: var(--theme-body-font, system-ui);
  font-size: 0.875rem;
  font-weight: 500;
}
```

**Estimated Effort**: 2 hours

---

### 6. DatePicker - MOST COMPLEX

**DOM Structure** (simplified):

```html
<p-datepicker>
  <input class="p-inputtext" />
  <div class="p-datepicker-overlay">
    <div class="p-datepicker-header">...</div>
    <table class="p-datepicker-calendar">
      <td class="p-datepicker-today">...</td>
      <td class="p-datepicker-selected">...</td>
    </table>
  </div>
</p-datepicker>
```

**Implementation** (Story 24.4):

```scss
// Input field (similar to InputText)
::ng-deep .field-preview .p-datepicker input.p-inputtext {
  background-color: var(--theme-input-background, #ffffff);
  border: 1px solid var(--theme-input-border-color, #d1d5db);
  border-radius: var(--theme-border-radius, 0.375rem);
  color: var(--theme-text-primary, #111827);
  font-family: var(--theme-body-font, system-ui);

  &:focus {
    border-color: var(--theme-primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
  }
}

// Calendar overlay panel
::ng-deep .p-datepicker-overlay {
  background-color: var(--theme-input-background, #ffffff);
  border: 1px solid var(--theme-input-border-color, #d1d5db);
  border-radius: var(--theme-border-radius, 0.375rem);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

// Calendar header (month/year navigation)
::ng-deep .p-datepicker-overlay .p-datepicker-header {
  background-color: var(--theme-primary-color, #3b82f6);
  color: #ffffff;
  padding: 0.5rem;
  border-radius: var(--theme-border-radius, 0.375rem) var(--theme-border-radius, 0.375rem) 0 0;

  .p-datepicker-title {
    color: #ffffff;
    font-family: var(--theme-heading-font, var(--theme-body-font, system-ui));
    font-weight: 600;
  }

  button {
    color: #ffffff;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
}

// Calendar table
::ng-deep .p-datepicker-overlay .p-datepicker-calendar {
  font-family: var(--theme-body-font, system-ui);

  // Day headers (Sun, Mon, Tue...)
  thead th {
    color: var(--theme-text-secondary, #6b7280);
    font-weight: 600;
    padding: 0.5rem;
  }

  // Day cells
  tbody td {
    padding: 0;

    span {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--theme-text-primary, #111827);
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background-color: rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
      }
    }

    // Today's date
    &.p-datepicker-today span {
      border: 2px solid var(--theme-primary-color, #3b82f6);
      font-weight: 600;
    }

    // Selected date
    &.p-datepicker-selected span {
      background-color: var(--theme-primary-color, #3b82f6);
      color: #ffffff;
      font-weight: 600;
    }

    // Other month dates (grayed out)
    &.p-datepicker-other-month span {
      color: var(--theme-text-secondary, #9ca3af);
      opacity: 0.5;
    }

    // Disabled dates
    &.p-disabled span {
      color: var(--theme-input-disabled-text-color, #9ca3af);
      cursor: not-allowed;
      opacity: 0.4;
    }
  }
}

// Time picker (for DATETIME fields)
::ng-deep .p-datepicker-overlay .p-timepicker {
  border-top: 1px solid var(--theme-input-border-color, #e5e7eb);
  padding: 0.5rem;

  button {
    color: var(--theme-primary-color, #3b82f6);

    &:hover {
      background-color: rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
    }
  }

  span {
    color: var(--theme-text-primary, #111827);
    font-family: var(--theme-body-font, system-ui);
  }
}
```

**Special Considerations**:

- DatePicker has the most complex DOM structure of all PrimeNG components
- Requires extensive testing of all states: today, selected, hover, disabled, other month
- Time picker (for DATETIME) adds additional complexity
- Mobile responsive behavior needs special attention

**Estimated Effort**: 4 hours (most complex component)

---

### 7. FileUpload - NEW

**DOM Structure**:

```html
<p-fileupload mode="basic">
  <span class="p-button">
    <span class="p-button-label">Choose File</span>
  </span>
</p-fileupload>
```

**Implementation** (Story 24.4):

```scss
// File upload button (basic mode)
::ng-deep .field-preview .p-fileupload {
  .p-button {
    background-color: var(--theme-button-primary-background, var(--theme-primary-color, #3b82f6));
    border-color: var(--theme-button-primary-background, var(--theme-primary-color, #3b82f6));
    color: var(--theme-button-primary-text, #ffffff);
    font-family: var(--theme-body-font, system-ui);
    border-radius: var(--theme-border-radius, 0.375rem);
    padding: 0.5rem 1rem;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      background-color: var(--theme-button-primary-hover-background, #2563eb);
      border-color: var(--theme-button-primary-hover-background, #2563eb);
    }

    &:focus {
      box-shadow: 0 0 0 3px rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

// Validation text (accepted file types, max size)
::ng-deep .field-preview .text-gray-400 {
  color: var(--theme-help-text-color, #9ca3af);
  font-size: 0.75rem;
  font-family: var(--theme-body-font, system-ui);
}
```

**Estimated Effort**: 3 hours

---

### 8. Divider - NEW

**DOM Structure**:

```html
<p-divider align="left" type="solid">
  <div class="p-divider-content">
    <span>Section Title</span>
  </div>
</p-divider>
```

**Implementation** (Story 24.6):

```scss
// Divider line
::ng-deep .field-preview .p-divider {
  &:before {
    border-color: var(--theme-divider-color, var(--theme-input-border-color, #e5e7eb));
  }

  // Divider label/content
  .p-divider-content {
    background-color: transparent;
    color: var(--theme-label-color, #374151);
    font-family: var(--theme-body-font, system-ui);
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0 0.5rem;
  }
}

// Help text below divider
::ng-deep .field-preview small.text-gray-500 {
  color: var(--theme-help-text-color, #6b7280);
  font-family: var(--theme-body-font, system-ui);
}
```

**Estimated Effort**: 1 hour (simplest PrimeNG component)

---

## Testing Strategy for PrimeNG Overrides

### 1. Visual Verification Checklist

For each PrimeNG component, verify:

- [ ] **Default state**: Component renders with theme variables applied
- [ ] **Hover state**: Hover effects use theme colors
- [ ] **Focus state**: Focus ring uses `--theme-primary-color`
- [ ] **Disabled state**: Disabled opacity and colors match theme
- [ ] **Active/Selected state**: Active elements use theme primary color
- [ ] **Error state** (if applicable): Error borders use `--theme-error-color`

### 2. Specificity Testing

Test that theme styles override PrimeNG defaults:

```javascript
// Playwright test example
test('checkbox uses theme colors', async ({ page }) => {
  const checkbox = page.locator('.p-checkbox-box');

  // Verify theme variable applied
  const borderColor = await checkbox.evaluate((el) => getComputedStyle(el).borderColor);

  expect(borderColor).toBe('rgb(209, 213, 219)'); // #d1d5db fallback
});
```

### 3. Fallback Testing

Test un-themed forms still render correctly:

```javascript
test('checkbox works without theme', async ({ page }) => {
  // Navigate to form without themeId
  await page.goto('/public/form/abc123'); // Un-themed form

  const checkbox = page.locator('.p-checkbox-box');
  await expect(checkbox).toBeVisible();

  // Should use fallback colors
  const bg = await checkbox.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgb(255, 255, 255)'); // #ffffff fallback
});
```

### 4. Cross-Browser Testing

Test on all supported browsers (Story 24.8):

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### 5. Mobile Responsive Testing

Test mobile theme overrides work correctly:

```scss
// Mobile-specific theme variables (if defined in themeConfig.mobile)
@media (max-width: 767px) {
  ::ng-deep .p-checkbox-box {
    // Use mobile theme variables if available
    border-color: var(--theme-mobile-input-border-color, var(--theme-input-border-color, #d1d5db));
  }
}
```

---

## Common Pitfalls and Solutions

### Pitfall 1: `!important` Overuse

**Problem**: Using `!important` for every style override **Solution**: Increase specificity instead

```scss
// ❌ BAD
::ng-deep .p-checkbox {
  border-color: var(--theme-input-border-color, #d1d5db) !important;
}

// ✅ GOOD
.field-preview ::ng-deep .p-checkbox .p-checkbox-box {
  border-color: var(--theme-input-border-color, #d1d5db);
}
```

### Pitfall 2: Missing Fallback Values

**Problem**: CSS variable without fallback breaks un-themed forms **Solution**: Always provide
fallback matching current implementation

```scss
// ❌ BAD
background-color: var(--theme-input-background);

// ✅ GOOD
background-color: var(--theme-input-background, #ffffff);
```

### Pitfall 3: Global `::ng-deep` Pollution

**Problem**: Unscoped `::ng-deep` affects all PrimeNG components globally **Solution**: Always scope
to component or parent class

```scss
// ❌ BAD - Affects ALL checkboxes globally
::ng-deep .p-checkbox {
  border-color: red;
}

// ✅ GOOD - Only affects checkboxes in field previews
:host ::ng-deep .p-checkbox {
  border-color: var(--theme-input-border-color, #d1d5db);
}
```

### Pitfall 4: Inline Styles Overriding CSS Variables

**Problem**: PrimeNG components with inline `style` attributes override CSS variables **Solution**:
Use `!important` sparingly for inline style conflicts

```scss
// When PrimeNG uses inline styles like style="background-color: #3b82f6"
::ng-deep .p-datepicker-header {
  background-color: var(--theme-primary-color, #3b82f6) !important;
}
```

### Pitfall 5: Forgetting State Selectors

**Problem**: Only styling default state, missing hover/focus/disabled **Solution**: Always implement
all interactive states

```scss
::ng-deep .p-checkbox-box {
  // Default state
  border-color: var(--theme-input-border-color, #d1d5db);

  // ✅ Hover state
  &:hover {
    border-color: var(--theme-primary-color, #3b82f6);
  }

  // ✅ Focus state
  &:focus {
    box-shadow: 0 0 0 3px rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
  }

  // ✅ Disabled state
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
```

---

## RGB Variable Pattern for Box Shadows

For semi-transparent box shadows using theme colors, define RGB variables:

```typescript
// In theme-preview.service.ts
applyThemeCss(theme: FormTheme): void {
  const root = document.documentElement;

  // Hex color
  this.setCssVar(root, '--theme-primary-color', '#3b82f6');

  // RGB equivalent (for rgba() usage)
  this.setCssVar(root, '--theme-primary-color-rgb', '59, 130, 246');
}
```

**Usage in SCSS**:

```scss
&:focus {
  box-shadow: 0 0 0 3px rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
}
```

---

## Implementation Order Recommendation

Based on complexity and dependencies:

1. **TEXT/EMAIL/NUMBER** (1-2 hours) - Extend existing partial implementation
2. **TEXTAREA** (3 hours) - Similar to text inputs, no PrimeNG complexity
3. **SELECT** (3 hours) - Dropdown overlay adds complexity
4. **TOGGLE** (2 hours) - Simple PrimeNG component
5. **FILE** (3 hours) - Button styling straightforward
6. **CHECKBOX** (3 hours) - Medium PrimeNG complexity
7. **RADIO** (3 hours) - Similar to CHECKBOX
8. **DATE/DATETIME** (4 hours) - Most complex, do last
9. **DIVIDER** (1 hour) - Simplest, can be done anytime

**Total Estimated Effort**: 25 hours for PrimeNG components

---

## Conclusion

This PrimeNG override strategy provides:

- ✅ Consistent patterns across all components
- ✅ Proper specificity without `!important` overuse
- ✅ Comprehensive fallback values for backward compatibility
- ✅ Testing strategies for validation
- ✅ Implementation order based on complexity

**Next Steps**:

1. Begin with TEXT/EMAIL/NUMBER completion (Story 24.2)
2. Test thoroughly before moving to next component
3. Update this document with any discovered edge cases
4. Use Playwright visual regression tests to validate (Story 24.8)

---

**Document Version**: 1.0 **Last Updated**: 2025-10-18 **Maintained By**: Epic 24 Development Team
