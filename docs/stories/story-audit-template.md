# Story 24.1: Field Type Audit Template

**Instructions**: Copy this template for each field type and fill in the details during your audit.

---

## Field Type: [FIELD_NAME]

### Component Information

- **Field Type Category**: ☐ Input Field ☐ Display Element
- **Component Path**: `apps/web/src/app/features/.../[component-name].component.ts`
- **SCSS File Path**: `apps/web/src/app/features/.../[component-name].component.scss`
- **Template Path**: `apps/web/src/app/features/.../[component-name].component.html`
- **Used in Builder Canvas**: ☐ Yes ☐ No
- **Used in Public Form Renderer**: ☐ Yes ☐ No
- **PrimeNG Component**: ☐ Yes (specify: **\_\_\_\_**) ☐ No

---

### Current Theme Support Analysis

#### CSS Variable Usage Status

**Overall Assessment**: ☐ Full Support ☐ Partial Support ☐ No Support

**Theme Variables Currently Used**:

- [ ] `--theme-primary-color` (used for: ************\_************)
- [ ] `--theme-secondary-color` (used for: ************\_************)
- [ ] `--theme-input-background` (used for: ************\_************)
- [ ] `--theme-input-border-color` (used for: ************\_************)
- [ ] `--theme-input-text-color` (used for: ************\_************)
- [ ] `--theme-label-color` (used for: ************\_************)
- [ ] `--theme-heading-color` (used for: ************\_************)
- [ ] `--theme-help-text-color` (used for: ************\_************)
- [ ] `--theme-body-font` (used for: ************\_************)
- [ ] `--theme-heading-font` (used for: ************\_************)
- [ ] `--theme-border-radius` (used for: ************\_************)
- [ ] `--theme-field-spacing` (used for: ************\_************)
- [ ] Other: ************\_************

---

### Hardcoded Styles Inventory

**Hardcoded Colors Found**: | Color Value | SCSS Line | CSS Property | Should Use Variable |
|-------------|-----------|--------------|---------------------| | `#ffffff` | Line XX |
`background-color` | `--theme-input-background` | | `#d1d5db` | Line XX | `border-color` |
`--theme-input-border-color` | | `#1f2937` | Line XX | `color` | `--theme-input-text-color` | |
`#374151` | Line XX | `color` (label) | `--theme-label-color` | | `#6b7280` | Line XX | `color`
(help text) | `--theme-help-text-color` | | `#3b82f6` | Line XX | `border-color` (focus) |
`--theme-primary-color` |

**Hardcoded Fonts Found**: | Font Value | SCSS Line | CSS Property | Should Use Variable |
|------------|-----------|--------------|---------------------| | `system-ui` | Line XX |
`font-family` | `--theme-body-font` | | `Inter, sans-serif` | Line XX | `font-family` |
`--theme-heading-font` |

**Hardcoded Spacing Found**: | Spacing Value | SCSS Line | CSS Property | Should Use Variable |
|---------------|-----------|--------------|---------------------| | `1rem` | Line XX |
`margin-bottom` | `--theme-field-spacing` | | `0.375rem` | Line XX | `border-radius` |
`--theme-border-radius` |

---

### Gap Analysis

**Missing Theme Variable Integration**:

1. **Background Color**
   - Current: `background-color: #ffffff;` (line XX)
   - Should be: `background-color: var(--theme-input-background, #ffffff);`
   - Priority: High/Medium/Low

2. **Border Color**
   - Current: `border: 1px solid #d1d5db;` (line XX)
   - Should be: `border: 1px solid var(--theme-input-border-color, #d1d5db);`
   - Priority: High/Medium/Low

3. **Text Color**
   - Current: `color: #1f2937;` (line XX)
   - Should be: `color: var(--theme-input-text-color, #1f2937);`
   - Priority: High/Medium/Low

4. **Label Color**
   - Current: `.field-label { color: #374151; }` (line XX)
   - Should be: `.field-label { color: var(--theme-label-color, #374151); }`
   - Priority: High/Medium/Low

5. **Focus State**
   - Current: `&:focus { border-color: #3b82f6; }` (line XX)
   - Should be: `&:focus { border-color: var(--theme-primary-color, #3b82f6); }`
   - Priority: High/Medium/Low

6. **Placeholder/Help Text**
   - Current: `&::placeholder { color: #9ca3af; }` (line XX)
   - Should be: `&::placeholder { color: var(--theme-help-text-color, #9ca3af); }`
   - Priority: High/Medium/Low

7. **Font Family**
   - Current: `font-family: system-ui;` (line XX)
   - Should be: `font-family: var(--theme-body-font, system-ui);`
   - Priority: High/Medium/Low

---

### Code Examples

#### Before (Current Implementation)

```scss
.field-input {
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  color: #1f2937;
  font-family: system-ui;
  padding: 0.5rem 0.75rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
}

.field-label {
  color: #374151;
  font-weight: 500;
  margin-bottom: 0.5rem;
  display: block;
}

.field-help-text {
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
```

#### After (With Theme Variables)

```scss
.field-input {
  background-color: var(--theme-input-background, #ffffff);
  border: 1px solid var(--theme-input-border-color, #d1d5db);
  border-radius: var(--theme-border-radius, 0.375rem);
  color: var(--theme-input-text-color, #1f2937);
  font-family: var(--theme-body-font, system-ui);
  padding: 0.5rem 0.75rem;

  &:focus {
    outline: none;
    border-color: var(--theme-primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
  }

  &::placeholder {
    color: var(--theme-help-text-color, #9ca3af);
  }
}

.field-label {
  color: var(--theme-label-color, #374151);
  font-family: var(--theme-body-font, system-ui);
  font-weight: 500;
  margin-bottom: 0.5rem;
  display: block;
}

.field-help-text {
  color: var(--theme-help-text-color, #6b7280);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
```

---

### Priority & Effort Estimation

**Priority Level**: ☐ High (Stories 24.2) ☐ Medium (Stories 24.3-24.4) ☐ Low (Stories 24.5-24.6)

**Rationale for Priority**:

- High: Most commonly used field types (TEXT, EMAIL, NUMBER, TEXTAREA, SELECT)
- Medium: Frequently used with moderate complexity (CHECKBOX, RADIO, DATE, FILE, TOGGLE)
- Low: Specialized or display elements (IMAGE_GALLERY, HEADING, IMAGE, TEXT_BLOCK, DIVIDER)

**Effort Estimate**: \_\_\_\_ hours

**Complexity Assessment**: ☐ Low (simple CSS replacement) ☐ Medium (some PrimeNG overrides) ☐ High
(complex component)

**Dependencies**:

- Story 24.1 (this audit) must be complete
- Requires Story **\_\_\_\_** to be complete first (if applicable)

---

### Special Considerations

#### PrimeNG Component Overrides

☐ **Requires `::ng-deep` overrides**: Yes / No

**If Yes, document required overrides**:

```scss
// Example PrimeNG override
::ng-deep .p-calendar {
  background-color: var(--theme-input-background, #ffffff);
  border: 1px solid var(--theme-input-border-color, #d1d5db);

  .p-datepicker-header {
    background-color: var(--theme-primary-color, #3b82f6);
    color: white;
  }
}
```

**CSS Specificity Strategy**:

- PrimeNG component specificity level: (e.g., `.p-calendar .p-datepicker`)
- Override strategy: `::ng-deep` with component scoping
- Potential conflicts: (describe any)

#### Mobile Responsive Considerations

☐ **Has mobile-specific styling**: Yes / No

**If Yes, document mobile considerations**:

- Breakpoint: `@media (max-width: 767px)`
- Mobile theme variables needed: (list any)
- Mobile-specific layout changes: (describe)

#### Browser Compatibility Issues

☐ **Has known browser compatibility issues**: Yes / No

**If Yes, document issues**:

- Browser(s) affected: ******\_\_******
- Issue description: ******\_\_******
- Workaround needed: ******\_\_******

#### Accessibility Considerations

☐ **Has accessibility requirements**: Yes / No

**If Yes, document requirements**:

- WCAG AA compliance needed for: ******\_\_******
- Contrast ratio requirements: 4.5:1 minimum for text
- Keyboard navigation: (describe)
- Screen reader support: (describe)

---

### Testing Strategy

**Manual Testing Checklist**:

- [ ] Verify theme variables applied correctly in builder canvas
- [ ] Verify theme variables applied correctly in public form
- [ ] Test with light theme (white background, dark text)
- [ ] Test with dark theme (dark background, light text)
- [ ] Test with custom theme (custom colors/fonts)
- [ ] Verify focus states use primary color
- [ ] Verify hover states (if applicable)
- [ ] Test on mobile viewport (< 768px)
- [ ] Test on tablet viewport (768px - 1024px)
- [ ] Test on desktop viewport (> 1024px)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)

**Automated Testing**:

- [ ] Visual regression test created (Playwright screenshot comparison)
- [ ] Baseline screenshot captured (Story 24.1)
- [ ] E2E test verifies theme CSS variables present

**Performance Testing**:

- [ ] Theme application time measured (should be < 50ms)
- [ ] No visual flicker during theme switching

---

### Risk Assessment

**Identified Risks**:

1. **Risk**: CSS specificity conflicts with PrimeNG
   - **Severity**: High/Medium/Low
   - **Mitigation**: Use `::ng-deep` with component scoping
   - **Contingency**: Increase specificity with additional selectors

2. **Risk**: Theme variables not applied in certain states (hover, focus, disabled)
   - **Severity**: High/Medium/Low
   - **Mitigation**: Test all interactive states during implementation
   - **Contingency**: Add state-specific CSS variable applications

3. **Risk**: Mobile theme overrides not working
   - **Severity**: High/Medium/Low
   - **Mitigation**: Test mobile media queries thoroughly
   - **Contingency**: Use JavaScript-based viewport detection if CSS fails

---

### Notes & Observations

**Additional Findings**:

- (Any interesting patterns or anti-patterns discovered)
- (Opportunities for refactoring beyond theme variables)
- (Interactions with other components or systems)

**Blockers**:

- (Any issues preventing theme variable implementation)

**Questions for Tech Lead**:

- (Any clarifications needed)

**References**:

- Related Epic 24 stories: ******\_\_******
- Related documentation: ******\_\_******
- External resources: ******\_\_******

---

**Audit Completed By**: ******\_\_****** **Audit Date**: ******\_\_****** **Reviewed By**:
******\_\_****** **Approved**: ☐ Yes ☐ Needs Revision

---

## Quick Reference: Available Theme CSS Variables

```scss
// Core Colors
--theme-primary-color           // Buttons, focus states, active selections
--theme-secondary-color         // Secondary accents, inactive states

// Background
--theme-background-color        // Page/container background
--theme-input-background        // Input field background

// Text Colors
--theme-text-primary            // Body text
--theme-text-secondary          // Muted/secondary text
--theme-label-color             // Form labels
--theme-heading-color           // Headings
--theme-help-text-color         // Placeholders, help text

// Typography
--theme-body-font               // Body/input text font
--theme-heading-font            // Heading font
--theme-font-size-base          // Base font size (16px)

// Layout
--theme-border-radius           // Input/container border radius
--theme-field-spacing           // Spacing between fields
--theme-row-spacing             // Row spacing
--theme-column-gap              // Column gap

// Container
--theme-container-background    // Container background
--theme-container-opacity       // Container opacity
--theme-container-padding       // Container padding

// Input Fields
--theme-input-border-color      // Input borders

// Buttons
--theme-button-primary-background    // Primary button background
--theme-button-primary-text          // Primary button text
--theme-button-secondary-background  // Secondary button background
--theme-button-secondary-text        // Secondary button text

// Step Forms
--theme-step-active-color       // Active step color
--theme-step-inactive-color     // Inactive step color
```

---

**Template Version**: 1.0 **Last Updated**: 2025-10-18
