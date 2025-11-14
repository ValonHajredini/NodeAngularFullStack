# Epic 24: Universal Theme Application to All Input Field Types

**Epic ID**: EPIC-24 **Priority**: High **Status**: Draft **Created**: 2025-10-18 **Type**:
Brownfield Enhancement

---

## Executive Summary

Ensure all form input field types and display elements consistently apply the selected form theme's
CSS variables, providing a unified visual experience across all 16 field types. This epic enhances
the existing per-form theme system by systematically applying theme colors, fonts, and spacing to
every input and display element.

---

## Problem Statement

Currently, the per-form theme system is implemented and functional:

- Forms store `themeId` in settings and schema
- ThemePreviewService injects 40+ CSS variables into `:root`
- Theme selection dropdown works in form builder
- Public forms load and apply themes correctly

**However**, not all input field types consistently consume these theme CSS variables. Some fields
use hardcoded colors, fonts, or PrimeNG defaults instead of the theme variables, resulting in
inconsistent visual styling across different field types.

**User Impact**: When users select a theme for their form, they expect ALL fields to reflect that
theme's colors and styling. Currently, some fields (like basic text inputs) might show theme colors
while others (like date pickers, file uploads, or image galleries) don't, creating a fragmented user
experience.

---

## Goals & Success Criteria

### Goals

1. **Visual Consistency**: All 16 field types reflect selected theme colors, fonts, and spacing
2. **Real-Time Preview**: Theme changes in builder canvas show immediate feedback across all fields
3. **Published Form Fidelity**: Public forms render with identical theme application as builder
   preview
4. **Backward Compatibility**: Forms without themes continue using default styling (no regression)

### Success Criteria

- ✅ All input fields (TEXT, EMAIL, NUMBER, SELECT, TEXTAREA, FILE, CHECKBOX, RADIO, DATE, DATETIME,
  TOGGLE, IMAGE_GALLERY) use theme CSS variables
- ✅ All display elements (HEADING, IMAGE, TEXT_BLOCK, DIVIDER) use theme typography/color variables
- ✅ Theme selection → save → publish → render workflow works end-to-end
- ✅ Mobile responsive theme application verified
- ✅ No performance regression (theme application < 50ms)
- ✅ Visual regression tests pass for existing forms

---

## Existing System Context

### Current Architecture

- **Technology Stack**: Angular 20+, PrimeNG 17+, TypeScript, Express.js, PostgreSQL
- **Frontend**: Standalone components, reactive forms, NgRx Signals
- **Theme Storage**: `forms.schemas.settings.themeId` (UUID reference)
- **Theme Service**: `ThemePreviewService`
  (apps/web/src/app/features/tools/components/form-builder/)
- **CSS Variables**: 40+ variables defined in theme-preview.service.ts (lines 20-85)

### Integration Points

1. **FormBuilderComponent** (form-builder.component.ts:1049-1057)
   - Theme selection via ThemeDropdownComponent
   - Applies theme to form via `formBuilderService.applyTheme(theme)`

2. **FormRendererComponent** (form-renderer.component.ts:302-323)
   - Loads theme data from API for published forms
   - Applies theme CSS via `themePreviewService.applyThemeCss(theme)`

3. **ThemePreviewService** (theme-preview.service.ts:20-85)
   - Injects CSS variables into document root
   - Handles responsive mobile overrides

### Existing Theme CSS Variables

```css
/* Primary Colors */
--theme-primary-color
--theme-secondary-color

/* Background */
--theme-background-color
--theme-background-image

/* Text Colors */
--theme-text-primary
--theme-text-secondary

/* Typography */
--theme-heading-font
--theme-body-font
--theme-font-size-base

/* Layout */
--theme-border-radius
--theme-field-spacing
--theme-row-spacing
--theme-column-gap

/* Container */
--theme-container-background
--theme-container-opacity
--theme-container-padding

/* Input Fields */
--theme-input-background
--theme-input-border-color
--theme-input-text-color
--theme-label-color
--theme-heading-color
--theme-help-text-color

/* Buttons */
--theme-button-primary-background
--theme-button-primary-text
--theme-button-secondary-background
--theme-button-secondary-text

/* Step Forms */
--theme-step-active-color
--theme-step-inactive-color
```

---

## Epic Stories

### Story 24.1: Audit Current Theme CSS Variable Usage Across All Field Types

**Description**: Create comprehensive audit documenting which field types currently use theme CSS
variables vs. hardcoded styles. This baseline will guide prioritization for subsequent enhancement
stories.

**User Story**: As a developer, I need a clear understanding of the current theme variable usage
across all field types so I can efficiently implement theme support where it's missing.

**Acceptance Criteria**:

- [ ] **Audit Document Created**: Spreadsheet/markdown table listing all 16 field types with
      columns:
  - Field Type
  - Component Path
  - CSS Variable Usage (Yes/No/Partial)
  - Hardcoded Styles Found
  - Priority (High/Medium/Low)

- [ ] **Gap Analysis**: Document identifies specific CSS properties that need theme variable
      conversion for each field type

- [ ] **Priority Matrix**: Fields categorized as:
  - **High Priority**: TEXT, EMAIL, NUMBER, TEXTAREA, SELECT (most commonly used)
  - **Medium Priority**: CHECKBOX, RADIO, DATE, DATETIME, TOGGLE, FILE
  - **Low Priority**: IMAGE_GALLERY, HEADING, IMAGE, TEXT_BLOCK, DIVIDER

- [ ] **Baseline Tests**: Create visual regression test screenshots for each field type with current
      theme application

**Technical Notes**:

- Review form-renderer.component.scss
- Check field preview components: text-input-preview.component.ts, select-preview.component.ts, etc.
- Document PrimeNG component overrides that might conflict with theme variables

**Dependencies**: None

**Estimated Effort**: 4 hours

---

### Story 24.2: Apply Theme Variables to Basic Input Fields (TEXT, EMAIL, NUMBER, TEXTAREA)

**Description**: Update CSS for text-based input fields to consistently use theme variables for
background, border, text color, label color, focus states, and help text.

**User Story**: As a form creator, when I select a theme for my form, I want all text input fields
to reflect the theme's colors and fonts so my form has a cohesive look.

**Acceptance Criteria**:

- [ ] **Background Color**: All text inputs use `--theme-input-background` for field background

  ```scss
  background-color: var(--theme-input-background, #ffffff);
  ```

- [ ] **Border Color**: Input borders use `--theme-input-border-color`

  ```scss
  border: 1px solid var(--theme-input-border-color, #d1d5db);
  ```

- [ ] **Text Color**: Input text uses `--theme-input-text-color`

  ```scss
  color: var(--theme-input-text-color, #1f2937);
  ```

- [ ] **Label Color**: Field labels use `--theme-label-color`

  ```scss
  label {
    color: var(--theme-label-color, #374151);
  }
  ```

- [ ] **Focus State**: Focus borders use `--theme-primary-color`

  ```scss
  &:focus {
    border-color: var(--theme-primary-color, #3b82f6);
  }
  ```

- [ ] **Help Text**: Help text uses `--theme-help-text-color`

  ```scss
  .help-text {
    color: var(--theme-help-text-color, #6b7280);
  }
  ```

- [ ] **Font Family**: Input text uses `--theme-body-font`

  ```scss
  font-family: var(--theme-body-font, system-ui);
  ```

- [ ] **Builder Preview**: Field preview components (text-input-preview.component.ts, etc.) reflect
      theme changes in real-time

- [ ] **Public Form**: Published forms render text inputs with correct theme styling

- [ ] **Mobile Responsive**: Mobile theme overrides work correctly (<768px)

**Testing**:

- [ ] Select light theme → verify text inputs show light colors
- [ ] Select dark theme → verify text inputs show dark colors
- [ ] Switch themes in builder → verify immediate visual update
- [ ] Publish form → verify public form matches builder preview
- [ ] Test on mobile viewport → verify responsive theme application

**Technical Implementation**:

```scss
// apps/web/src/app/features/public/form-renderer/form-renderer.component.scss

// Text-based inputs (TEXT, EMAIL, NUMBER, TEXTAREA)
input[type='text'],
input[type='email'],
input[type='number'],
textarea {
  background-color: var(--theme-input-background, #ffffff);
  border: 1px solid var(--theme-input-border-color, #d1d5db);
  color: var(--theme-input-text-color, #1f2937);
  font-family: var(--theme-body-font, system-ui);
  border-radius: var(--theme-border-radius, 0.375rem);

  &:focus {
    outline: none;
    border-color: var(--theme-primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(var(--theme-primary-color-rgb, 59, 130, 246), 0.1);
  }

  &::placeholder {
    color: var(--theme-help-text-color, #9ca3af);
  }
}

// Field labels
.field-label {
  color: var(--theme-label-color, #374151);
  font-family: var(--theme-body-font, system-ui);
  font-weight: 500;
}

// Help text
.field-help-text {
  color: var(--theme-help-text-color, #6b7280);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

// Error messages
.field-error {
  color: #ef4444; // Always red for errors (not themed)
  font-size: 0.875rem;
}
```

**Dependencies**: Story 24.1 (audit complete)

**Estimated Effort**: 6 hours

---

### Story 24.3: Apply Theme Variables to Selection Fields (SELECT, RADIO, CHECKBOX)

**Description**: Enhance selection field types to reflect theme colors for dropdown backgrounds,
selected states, radio/checkbox indicators, and option text.

**User Story**: As a form creator, when I select a theme, I want dropdowns, radio buttons, and
checkboxes to match the theme colors so all interactive elements look cohesive.

**Acceptance Criteria**:

- [ ] **SELECT Dropdown Background**: Uses `--theme-input-background`

  ```scss
  select {
    background-color: var(--theme-input-background, #ffffff);
  }
  ```

- [ ] **SELECT Dropdown Border**: Uses `--theme-input-border-color`

  ```scss
  select {
    border: 1px solid var(--theme-input-border-color, #d1d5db);
  }
  ```

- [ ] **SELECT Option Text**: Uses `--theme-input-text-color`

  ```scss
  option {
    color: var(--theme-input-text-color, #1f2937);
  }
  ```

- [ ] **RADIO Selected State**: Uses `--theme-primary-color` for checked indicator

  ```scss
  input[type='radio']:checked::after {
    background-color: var(--theme-primary-color, #3b82f6);
  }
  ```

- [ ] **CHECKBOX Selected State**: Uses `--theme-primary-color` for checkmark/background

  ```scss
  input[type='checkbox']:checked {
    background-color: var(--theme-primary-color, #3b82f6);
  }
  ```

- [ ] **Radio/Checkbox Labels**: Use `--theme-label-color`

  ```scss
  .radio-label,
  .checkbox-label {
    color: var(--theme-label-color, #374151);
  }
  ```

- [ ] **Hover States**: Consistent theme-based hover effects

  ```scss
  input[type='radio']:hover,
  input[type='checkbox']:hover {
    border-color: var(--theme-primary-color, #3b82f6);
  }
  ```

- [ ] **Focus States**: Use `--theme-primary-color` for focus rings

- [ ] **Builder Preview**: Selection field previews reflect theme changes immediately

- [ ] **Public Form**: Published forms render selection fields with theme styling

**Testing**:

- [ ] Select light theme → verify dropdowns/radios/checkboxes show light theme colors
- [ ] Select dark theme → verify selection fields adapt to dark colors
- [ ] Check/uncheck interactions show theme-colored states
- [ ] Multi-option checkbox groups reflect theme colors
- [ ] Radio button groups show theme-colored selected state

**Technical Implementation**:

```scss
// SELECT dropdowns
select {
  background-color: var(--theme-input-background, #ffffff);
  border: 1px solid var(--theme-input-border-color, #d1d5db);
  color: var(--theme-input-text-color, #1f2937);
  font-family: var(--theme-body-font, system-ui);
  border-radius: var(--theme-border-radius, 0.375rem);

  &:focus {
    border-color: var(--theme-primary-color, #3b82f6);
  }

  option {
    background-color: var(--theme-input-background, #ffffff);
    color: var(--theme-input-text-color, #1f2937);
  }
}

// RADIO buttons (custom styling)
.radio-input {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--theme-input-border-color, #d1d5db);
  border-radius: 50%;
  position: relative;
  cursor: pointer;

  &:checked {
    border-color: var(--theme-primary-color, #3b82f6);

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 0.625rem;
      height: 0.625rem;
      border-radius: 50%;
      background-color: var(--theme-primary-color, #3b82f6);
    }
  }

  &:focus {
    outline: 2px solid var(--theme-primary-color, #3b82f6);
    outline-offset: 2px;
  }
}

// CHECKBOX (custom styling)
.checkbox-input {
  appearance: none;
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--theme-input-border-color, #d1d5db);
  border-radius: var(--theme-border-radius, 0.375rem);
  position: relative;
  cursor: pointer;

  &:checked {
    background-color: var(--theme-primary-color, #3b82f6);
    border-color: var(--theme-primary-color, #3b82f6);

    &::after {
      content: '✓';
      position: absolute;
      color: white;
      font-size: 1rem;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }

  &:focus {
    outline: 2px solid var(--theme-primary-color, #3b82f6);
    outline-offset: 2px;
  }
}

// Labels for radio/checkbox
.radio-label,
.checkbox-label {
  color: var(--theme-label-color, #374151);
  font-family: var(--theme-body-font, system-ui);
  cursor: pointer;
  user-select: none;
}
```

**Dependencies**: Story 24.2 (basic inputs complete)

**Estimated Effort**: 8 hours

---

### Story 24.4: Apply Theme Variables to Specialized Inputs (DATE, DATETIME, TOGGLE, FILE)

**Description**: Apply theme variables to date pickers, toggle switches, and file upload components
for consistent visual styling.

**User Story**: As a form creator, I want date pickers, toggle switches, and file upload buttons to
match my theme colors so all input types have a unified appearance.

**Acceptance Criteria**:

- [ ] **DATE Picker Input**: Uses theme variables for input field

  ```scss
  input[type='date'] {
    background-color: var(--theme-input-background, #ffffff);
    border-color: var(--theme-input-border-color, #d1d5db);
    color: var(--theme-input-text-color, #1f2937);
  }
  ```

- [ ] **DATE Picker Calendar Header**: Uses `--theme-primary-color`

  ```scss
  .calendar-header {
    background-color: var(--theme-primary-color, #3b82f6);
    color: white;
  }
  ```

- [ ] **DATE Picker Selected Date**: Highlights with `--theme-primary-color`

- [ ] **DATETIME Picker**: Same theme application as DATE with time section

- [ ] **TOGGLE Switch Active State**: Uses `--theme-primary-color`

  ```scss
  .toggle-switch:checked {
    background-color: var(--theme-primary-color, #3b82f6);
  }
  ```

- [ ] **TOGGLE Switch Inactive State**: Uses neutral theme colors

- [ ] **FILE Upload Button**: Uses `--theme-button-primary-background`

  ```scss
  .file-upload-button {
    background-color: var(--theme-button-primary-background, #3b82f6);
    color: var(--theme-button-primary-text, #ffffff);
  }
  ```

- [ ] **FILE Upload Text**: Uses theme text colors for file name display

- [ ] **FILE Upload Label**: Uses `--theme-label-color`

- [ ] **Mobile Viewport**: Date pickers and file uploads adapt to mobile theme settings

- [ ] **Builder Preview**: Specialized input previews reflect theme changes

- [ ] **Public Form**: Published forms render specialized inputs with theme styling

**Testing**:

- [ ] Date picker calendar shows theme colors (header, selected date)
- [ ] Toggle switch ON state shows theme primary color
- [ ] File upload button uses theme button colors
- [ ] All fields maintain theme styling on mobile (<768px)
- [ ] Focus states use theme primary color

**Technical Implementation**:

```scss
// DATE and DATETIME inputs
input[type='date'],
input[type='datetime-local'] {
  background-color: var(--theme-input-background, #ffffff);
  border: 1px solid var(--theme-input-border-color, #d1d5db);
  color: var(--theme-input-text-color, #1f2937);
  font-family: var(--theme-body-font, system-ui);
  border-radius: var(--theme-border-radius, 0.375rem);

  &:focus {
    border-color: var(--theme-primary-color, #3b82f6);
  }

  // Calendar icon (browser-specific)
  &::-webkit-calendar-picker-indicator {
    filter: var(--theme-icon-filter, none); // Optional: theme-aware icon tinting
  }
}

// TOGGLE switch (custom component)
.toggle-switch {
  position: relative;
  width: 3rem;
  height: 1.5rem;
  background-color: var(--theme-input-border-color, #d1d5db);
  border-radius: 1.5rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &.checked {
    background-color: var(--theme-primary-color, #3b82f6);
  }

  .toggle-slider {
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 1.25rem;
    height: 1.25rem;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  &.checked .toggle-slider {
    transform: translateX(1.5rem);
  }
}

// FILE upload
.file-upload-container {
  .file-upload-button {
    background-color: var(--theme-button-primary-background, #3b82f6);
    color: var(--theme-button-primary-text, #ffffff);
    border: none;
    padding: 0.5rem 1rem;
    border-radius: var(--theme-border-radius, 0.375rem);
    font-family: var(--theme-body-font, system-ui);
    cursor: pointer;

    &:hover {
      opacity: 0.9;
    }

    &:focus {
      outline: 2px solid var(--theme-primary-color, #3b82f6);
      outline-offset: 2px;
    }
  }

  .file-name-display {
    color: var(--theme-text-primary, #1f2937);
    font-family: var(--theme-body-font, system-ui);
    margin-top: 0.5rem;
  }

  .file-upload-label {
    color: var(--theme-label-color, #374151);
    font-family: var(--theme-body-font, system-ui);
    font-weight: 500;
  }
}
```

**PrimeNG Calendar Overrides** (if using PrimeNG date picker):

```scss
// Override PrimeNG calendar theme
::ng-deep .p-datepicker {
  background-color: var(--theme-input-background, #ffffff);
  border: 1px solid var(--theme-input-border-color, #d1d5db);

  .p-datepicker-header {
    background-color: var(--theme-primary-color, #3b82f6);
    color: white;
  }

  .p-datepicker-today > span {
    background-color: var(--theme-secondary-color, #6b7280);
    color: white;
  }

  .p-datepicker-calendar td.p-datepicker-today > span.p-highlight {
    background-color: var(--theme-primary-color, #3b82f6);
    color: white;
  }
}
```

**Dependencies**: Story 24.3 (selection fields complete)

**Estimated Effort**: 10 hours

---

### Story 24.5: Apply Theme Variables to Image Gallery Input

**Description**: Ensure IMAGE_GALLERY component selection states, grid borders, and hover effects
use theme colors for visual consistency.

**User Story**: As a form creator, when I add an image gallery selector to my form, I want the
selected image border and hover effects to match my theme colors.

**Acceptance Criteria**:

- [ ] **Gallery Grid Container**: Uses theme spacing variables

  ```scss
  .image-gallery-grid {
    gap: var(--theme-column-gap, 1rem);
  }
  ```

- [ ] **Image Borders**: Uses `--theme-input-border-color`

  ```scss
  .gallery-image {
    border: 2px solid var(--theme-input-border-color, #d1d5db);
  }
  ```

- [ ] **Selected Image Border**: Uses `--theme-primary-color`

  ```scss
  .gallery-image.selected {
    border-color: var(--theme-primary-color, #3b82f6);
    box-shadow: 0 0 0 3px rgba(var(--theme-primary-color-rgb), 0.2);
  }
  ```

- [ ] **Hover State**: Border color shifts to theme primary color

  ```scss
  .gallery-image:hover {
    border-color: var(--theme-primary-color, #3b82f6);
  }
  ```

- [ ] **Gallery Label**: Uses `--theme-label-color`

- [ ] **Image Captions**: Use `--theme-text-secondary`

- [ ] **Responsive Grid**: Grid columns respect theme spacing on mobile

- [ ] **Builder Preview**: Image gallery preview reflects theme changes

- [ ] **Public Form**: Published forms render gallery with theme styling

**Testing**:

- [ ] Gallery grid shows theme-colored borders
- [ ] Selected image highlights with theme primary color
- [ ] Hover effects show theme colors
- [ ] Grid spacing matches theme spacing settings
- [ ] Mobile grid (2 columns) maintains theme styling

**Technical Implementation**:

```scss
// apps/web/src/app/features/public/form-renderer/image-gallery-renderer.component.scss

.image-gallery-container {
  .gallery-label {
    color: var(--theme-label-color, #374151);
    font-family: var(--theme-body-font, system-ui);
    font-weight: 500;
    margin-bottom: 0.75rem;
  }

  .image-gallery-grid {
    display: grid;
    gap: var(--theme-column-gap, 1rem);

    // Responsive columns based on metadata.columns (2-4)
    &.cols-2 {
      grid-template-columns: repeat(2, 1fr);
    }
    &.cols-3 {
      grid-template-columns: repeat(3, 1fr);
    }
    &.cols-4 {
      grid-template-columns: repeat(4, 1fr);
    }

    @media (max-width: 767px) {
      grid-template-columns: repeat(2, 1fr); // Always 2 columns on mobile
      gap: calc(var(--theme-column-gap, 1rem) * 0.75);
    }
  }

  .gallery-image-wrapper {
    position: relative;
    cursor: pointer;
    border-radius: var(--theme-border-radius, 0.375rem);
    overflow: hidden;
    border: 2px solid var(--theme-input-border-color, #d1d5db);
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--theme-primary-color, #3b82f6);
      transform: scale(1.02);
    }

    &.selected {
      border-color: var(--theme-primary-color, #3b82f6);
      border-width: 3px;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); // TODO: Use CSS variable

      &::after {
        content: '✓';
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        background-color: var(--theme-primary-color, #3b82f6);
        color: white;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        font-weight: bold;
      }
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .image-caption {
    margin-top: 0.25rem;
    color: var(--theme-text-secondary, #6b7280);
    font-size: 0.875rem;
    text-align: center;
  }

  .gallery-help-text {
    margin-top: 0.5rem;
    color: var(--theme-help-text-color, #6b7280);
    font-size: 0.875rem;
  }
}
```

**Component Update** (image-gallery-renderer.component.ts):

```typescript
// Ensure component template uses correct CSS classes
// No TypeScript changes needed - only CSS/SCSS updates
```

**Dependencies**: Story 24.4 (specialized inputs complete)

**Estimated Effort**: 4 hours

---

### Story 24.6: Apply Theme Variables to Display Elements (HEADING, IMAGE, TEXT_BLOCK, DIVIDER)

**Description**: Apply theme typography and color variables to non-input display elements for visual
consistency across the entire form.

**User Story**: As a form creator, I want headings, text blocks, images, and dividers in my form to
use my theme's fonts and colors so the entire form has a cohesive design.

**Acceptance Criteria**:

- [ ] **HEADING Elements**: Use theme heading font and color

  ```scss
  .heading-element {
    font-family: var(--theme-heading-font, system-ui);
    color: var(--theme-heading-color, #1f2937);
  }
  ```

- [ ] **HEADING Levels**: h1-h6 respect theme heading styles

- [ ] **TEXT_BLOCK Content**: Uses theme body font and text color

  ```scss
  .text-block-content {
    font-family: var(--theme-body-font, system-ui);
    color: var(--theme-text-primary, #1f2937);
  }
  ```

- [ ] **TEXT_BLOCK Paragraphs**: Use theme line-height and spacing

- [ ] **IMAGE Captions**: Use theme secondary text color

  ```scss
  .image-caption {
    color: var(--theme-text-secondary, #6b7280);
  }
  ```

- [ ] **IMAGE Container**: Respects theme border radius

- [ ] **DIVIDER Lines**: Use theme border color

  ```scss
  .divider-line {
    border-color: var(--theme-input-border-color, #d1d5db);
  }
  ```

- [ ] **Section Backgrounds**: Respect `--theme-container-background` when applicable

- [ ] **Builder Preview**: Display element previews reflect theme changes

- [ ] **Public Form**: Published forms render display elements with theme styling

**Testing**:

- [ ] Headings (h1-h6) show theme heading font and color
- [ ] Text blocks use theme body font and text color
- [ ] Image captions use theme secondary text color
- [ ] Dividers use theme border color
- [ ] All display elements maintain theme styling on mobile

**Technical Implementation**:

```scss
// HEADING elements
.heading-element {
  font-family: var(--theme-heading-font, system-ui);
  color: var(--theme-heading-color, #1f2937);
  line-height: 1.2;
  margin-bottom: var(--theme-field-spacing, 1rem);

  &.h1 {
    font-size: 2.25rem;
    font-weight: 700;
  }
  &.h2 {
    font-size: 1.875rem;
    font-weight: 600;
  }
  &.h3 {
    font-size: 1.5rem;
    font-weight: 600;
  }
  &.h4 {
    font-size: 1.25rem;
    font-weight: 500;
  }
  &.h5 {
    font-size: 1.125rem;
    font-weight: 500;
  }
  &.h6 {
    font-size: 1rem;
    font-weight: 500;
  }

  // Responsive font scaling
  @media (max-width: 767px) {
    &.h1 {
      font-size: 1.875rem;
    }
    &.h2 {
      font-size: 1.5rem;
    }
    &.h3 {
      font-size: 1.25rem;
    }
  }
}

// TEXT_BLOCK elements
.text-block-element {
  font-family: var(--theme-body-font, system-ui);
  color: var(--theme-text-primary, #1f2937);
  line-height: 1.6;
  margin-bottom: var(--theme-field-spacing, 1rem);

  p {
    margin-bottom: 0.75rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  // Optional background padding (from metadata)
  &.has-background {
    background-color: rgba(var(--theme-container-background-rgb, 255, 255, 255), 0.5);
    padding: 1rem;
    border-radius: var(--theme-border-radius, 0.375rem);
  }
}

// IMAGE elements
.image-element {
  margin-bottom: var(--theme-field-spacing, 1rem);

  img {
    border-radius: var(--theme-border-radius, 0.375rem);
    max-width: 100%;
    height: auto;
  }

  .image-caption {
    margin-top: 0.5rem;
    color: var(--theme-text-secondary, #6b7280);
    font-size: 0.875rem;
    font-family: var(--theme-body-font, system-ui);
    text-align: center;
  }
}

// DIVIDER elements
.divider-element {
  margin: var(--theme-field-spacing, 1rem) 0;

  hr {
    border: none;
    border-top: 1px solid var(--theme-input-border-color, #d1d5db);
    margin: 0;
  }

  &.thick hr {
    border-top-width: 2px;
  }

  &.dashed hr {
    border-top-style: dashed;
  }
}

// GROUP containers (if applicable)
.group-element {
  border: 1px solid var(--theme-input-border-color, #d1d5db);
  border-radius: var(--theme-border-radius, 0.375rem);
  padding: 1rem;
  margin-bottom: var(--theme-field-spacing, 1rem);

  .group-title {
    font-family: var(--theme-heading-font, system-ui);
    color: var(--theme-heading-color, #1f2937);
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  &.has-background {
    background-color: var(--theme-container-background, #f9fafb);
  }
}
```

**Dependencies**: Story 24.5 (image gallery complete)

**Estimated Effort**: 6 hours

---

### Story 24.7: Enhance Theme Preview in Form Builder Canvas

**Description**: Ensure form builder canvas immediately reflects theme changes across all field type
previews with real-time visual feedback.

**User Story**: As a form creator, when I select a theme in the builder, I want to see all my form
fields update immediately in the canvas so I can preview exactly how my published form will look.

**Acceptance Criteria**:

- [ ] **Immediate Theme Application**: Theme selection triggers instant visual update across all
      field previews (no page reload)

- [ ] **Field Preview Components Updated**: All preview components consume theme CSS variables:
  - `text-input-preview.component.ts/.scss`
  - `select-preview.component.ts/.scss`
  - `checkbox-preview.component.ts/.scss`
  - `radio-preview.component.ts/.scss`
  - `textarea-preview.component.ts/.scss`
  - (and all other field type preview components)

- [ ] **Canvas Background**: Form canvas respects `--theme-container-background` and
      `--theme-container-opacity`

  ```scss
  #form-canvas {
    background-color: var(--theme-container-background, transparent);
    opacity: var(--theme-container-opacity, 1);
  }
  ```

- [ ] **Theme Designer Modal Preview**: Preview section in Theme Designer Modal shows accurate field
      rendering with selected colors

- [ ] **No Visual Flicker**: Theme transitions are smooth without intermediate states or flicker

- [ ] **Multi-Field Update**: All fields on canvas update simultaneously (not one-by-one)

- [ ] **Row Layout Theming**: Row containers and column borders respect theme spacing/colors

- [ ] **Step Form Theming**: Step indicators use `--theme-step-active-color` and
      `--theme-step-inactive-color`

**Testing**:

- [ ] Select theme from dropdown → all canvas fields update immediately
- [ ] Switch between 3 different themes → verify consistent real-time updates
- [ ] Add new field after theme applied → new field inherits current theme
- [ ] Open Theme Designer Modal → preview section shows theme-styled fields
- [ ] Verify no console errors during theme switching

**Technical Implementation**:

**Update FormBuilderService** (form-builder.service.ts):

```typescript
// Ensure applyTheme method triggers change detection properly
applyTheme(theme: FormTheme): void {
  // Store current theme ID in form settings
  const currentForm = this._currentForm();
  if (currentForm?.schema?.settings) {
    currentForm.schema.settings.themeId = theme.id;
    this._currentForm.set({ ...currentForm });
  }

  // Store theme in available themes if not already present
  const themes = this._availableThemes();
  if (!themes.find(t => t.id === theme.id)) {
    this._availableThemes.set([...themes, theme]);
  }

  // Set current theme signal
  this._currentTheme.set(theme);

  // Apply theme CSS to document root
  this.themePreviewService.applyThemeCss(theme);

  // Increment theme usage count via API
  this.themesApi.applyTheme(theme.id).subscribe({
    next: () => console.log('[Theme] Usage count incremented'),
    error: (err) => console.error('[Theme] Failed to increment usage:', err),
  });

  // Mark form as dirty to indicate unsaved changes
  this.markDirty();
}
```

**Update Field Preview Components** (example: text-input-preview.component.scss):

```scss
// Ensure all preview components use theme variables
.field-preview-container {
  margin-bottom: var(--theme-field-spacing, 1rem);

  .preview-label {
    color: var(--theme-label-color, #374151);
    font-family: var(--theme-body-font, system-ui);
    font-weight: 500;
    margin-bottom: 0.5rem;
    display: block;
  }

  .preview-input {
    background-color: var(--theme-input-background, #ffffff);
    border: 1px solid var(--theme-input-border-color, #d1d5db);
    color: var(--theme-input-text-color, #1f2937);
    font-family: var(--theme-body-font, system-ui);
    border-radius: var(--theme-border-radius, 0.375rem);
    padding: 0.5rem 0.75rem;
    width: 100%;

    &::placeholder {
      color: var(--theme-help-text-color, #9ca3af);
    }
  }

  .preview-help-text {
    color: var(--theme-help-text-color, #6b7280);
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }
}
```

**Update Form Canvas Container** (form-builder.component.ts template):

```html
<!-- Canvas container with theme-aware background -->
<div
  id="form-canvas"
  class="flex-1 overflow-y-auto overflow-x-hidden"
  [ngStyle]="{
    'background-color': 'var(--theme-container-background, transparent)',
    'opacity': 'var(--theme-container-opacity, 1)'
  }"
>
  <div id="canvasForm" class="canvas-container">
    <app-form-canvas
      [settings]="formSettings()"
      (fieldClicked)="onFieldClicked($event)"
    ></app-form-canvas>
  </div>
</div>
```

**Dependencies**: Story 24.6 (display elements complete)

**Estimated Effort**: 8 hours

---

### Story 24.8: End-to-End Theme Verification & Regression Testing

**Description**: Comprehensive testing of theme application across all field types in form builder
and published forms with visual regression testing and cross-browser verification.

**User Story**: As a QA engineer, I need to verify that all 16 field types correctly apply theme
styling in all environments (builder, preview, published forms) without breaking existing
functionality.

**Acceptance Criteria**:

- [ ] **All Field Types Tested**: Each of 16 field types manually tested with 3 different themes:
  - **Light Theme** (white background, dark text, blue primary)
  - **Dark Theme** (dark background, light text, purple primary)
  - **Custom Theme** (custom colors, fonts, spacing)

- [ ] **Builder Canvas Testing**:
  - [ ] All fields show theme colors immediately after theme selection
  - [ ] Theme switching updates all fields without page reload
  - [ ] New fields inherit current theme when added
  - [ ] Field drag-drop maintains theme styling
  - [ ] Field editing modal shows themed fields

- [ ] **Preview Mode Testing** (Story 14.3):
  - [ ] Preview dialog shows form with correct theme styling
  - [ ] All field types render with theme colors in preview
  - [ ] Preview matches published form appearance

- [ ] **Published Form Testing**:
  - [ ] Public form loads theme data from API correctly
  - [ ] All field types render with theme styling
  - [ ] Theme colors match builder preview exactly
  - [ ] Form submission works with themed fields

- [ ] **Mobile Responsive Testing** (<768px):
  - [ ] Mobile theme overrides apply correctly
  - [ ] All field types readable and functional on mobile
  - [ ] Touch interactions work with themed fields
  - [ ] Grid layouts adapt responsively with theme spacing

- [ ] **Forms Without Themes** (Backward Compatibility):
  - [ ] Existing forms without `themeId` show default PrimeNG styling
  - [ ] No visual regression for un-themed forms
  - [ ] Forms can be edited without requiring theme selection

- [ ] **Theme Deletion Handling** (AC: 5 from Story 20.7):
  - [ ] Forms with deleted themes fall back to default styling
  - [ ] Console warning displayed when theme not found
  - [ ] No errors thrown when theme is missing
  - [ ] Form remains functional after theme deletion

- [ ] **Browser Compatibility**:
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Edge (latest)

- [ ] **Performance Testing**:
  - [ ] Theme application completes in <50ms (measured with DevTools)
  - [ ] No memory leaks when switching themes repeatedly
  - [ ] Smooth animations during theme transitions

- [ ] **Visual Regression Tests**:
  - [ ] Playwright screenshots captured for each field type with each theme
  - [ ] Baseline screenshots match expected appearance
  - [ ] No unintended styling changes detected

**Testing Plan**:

**Manual Testing Checklist** (per theme):

```markdown
## Theme: [Light/Dark/Custom]

### TEXT Input

- [ ] Background color matches theme
- [ ] Border color matches theme
- [ ] Text color matches theme
- [ ] Label color matches theme
- [ ] Focus state shows primary color
- [ ] Help text shows secondary color

### EMAIL Input

- [ ] Same checks as TEXT

### NUMBER Input

- [ ] Same checks as TEXT
- [ ] Number controls styled with theme

### TEXTAREA

- [ ] Same checks as TEXT
- [ ] Resizable handle styled appropriately

### SELECT Dropdown

- [ ] Dropdown background matches theme
- [ ] Border color matches theme
- [ ] Selected option text matches theme
- [ ] Dropdown icon colored with theme

### RADIO Buttons

- [ ] Selected state uses primary color
- [ ] Label color matches theme
- [ ] Hover state shows primary color

### CHECKBOX

- [ ] Checked state uses primary color
- [ ] Checkmark visible on themed background
- [ ] Label color matches theme

### DATE Picker

- [ ] Input field styled with theme
- [ ] Calendar header uses primary color
- [ ] Selected date highlighted with primary color

### DATETIME Picker

- [ ] Same checks as DATE
- [ ] Time section styled with theme

### TOGGLE Switch

- [ ] Active state uses primary color
- [ ] Inactive state uses neutral theme color
- [ ] Label color matches theme

### FILE Upload

- [ ] Button uses primary button background
- [ ] Button text uses primary button text color
- [ ] File name display uses theme text color

### IMAGE_GALLERY

- [ ] Grid borders use theme border color
- [ ] Selected image border uses primary color
- [ ] Hover effect shows primary color
- [ ] Grid spacing matches theme

### HEADING (h1-h6)

- [ ] Font family matches theme heading font
- [ ] Color matches theme heading color
- [ ] All heading levels styled consistently

### IMAGE

- [ ] Border radius matches theme
- [ ] Caption uses theme secondary text color

### TEXT_BLOCK

- [ ] Font family matches theme body font
- [ ] Text color matches theme primary text
- [ ] Paragraph spacing appropriate

### DIVIDER

- [ ] Line color matches theme border color
- [ ] Thickness/style options work correctly
```

**Automated E2E Tests** (Playwright):

```typescript
// tests/e2e/story-24.8-theme-verification.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Story 24.8: Universal Theme Application', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to form builder
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'User123!@#');
    await page.click('button[type="submit"]');
    await page.goto('/app/tools/form-builder');
  });

  test('should apply light theme to all field types', async ({ page }) => {
    // Add all 16 field types to form
    const fieldTypes = [
      'Text Input',
      'Email',
      'Number',
      'Select Option',
      'Text Area',
      'File Upload',
      'Checkbox',
      'Radio Button',
      'Date',
      'Date & Time',
      'Toggle',
      'Image Gallery',
      'Untitled Heading',
      'Image',
      'Text Block',
      'Section Divider',
    ];

    for (const fieldType of fieldTypes) {
      await page.click(`text=${fieldType}`);
      await page.waitForTimeout(500);
    }

    // Select light theme from dropdown
    await page.click('button:has-text("Styling Themes")');
    await page.waitForSelector('.theme-grid');
    await page.click('.theme-card:has-text("Light Theme")');
    await page.waitForTimeout(1000);

    // Take screenshot for visual regression
    await page.screenshot({
      path: 'tests/screenshots/light-theme-all-fields.png',
      fullPage: true,
    });

    // Verify theme CSS variables are applied
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--theme-primary-color');
    });
    expect(primaryColor).toBeTruthy();

    // Save form
    await page.click('button:has-text("Save")');
    await page.waitForSelector('text=Draft Saved');

    // Publish form
    await page.click('button:has-text("Publish")');
    await page.waitForSelector('text=Form Published');

    // Get public form URL
    const publicUrl = await page.inputValue('input[readonly][value*="/forms/render/"]');
    expect(publicUrl).toContain('/forms/render/');

    // Open public form in new page
    const publicPage = await page.context().newPage();
    await publicPage.goto(publicUrl);
    await publicPage.waitForLoadState('networkidle');

    // Verify theme applied in public form
    const publicPrimaryColor = await publicPage.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--theme-primary-color');
    });
    expect(publicPrimaryColor).toBe(primaryColor);

    // Take screenshot of public form
    await publicPage.screenshot({
      path: 'tests/screenshots/light-theme-public-form.png',
      fullPage: true,
    });
  });

  test('should apply dark theme to all field types', async ({ page }) => {
    // Similar test for dark theme
    // ... (implementation omitted for brevity)
  });

  test('should handle forms without themes (backward compatibility)', async ({ page }) => {
    // Add fields without selecting theme
    await page.click('text=Text Input');
    await page.click('text=Email');
    await page.click('text=Select Option');

    // Verify default styling (no theme CSS variables)
    const backgroundColor = await page.evaluate(() => {
      const input = document.querySelector('input[type="text"]');
      return input ? getComputedStyle(input).backgroundColor : null;
    });
    expect(backgroundColor).toBeTruthy();

    // Save and publish
    await page.click('button:has-text("Save")');
    await page.click('button:has-text("Publish")');

    // Verify public form works without theme
    const publicUrl = await page.inputValue('input[readonly][value*="/forms/render/"]');
    const publicPage = await page.context().newPage();
    await publicPage.goto(publicUrl);

    // Verify form is functional
    await publicPage.fill('input[type="text"]', 'Test value');
    await publicPage.click('button[type="submit"]');
    await publicPage.waitForSelector('text=Thank you');
  });

  test('should handle theme deletion gracefully', async ({ page }) => {
    // This test requires backend setup to simulate theme deletion
    // Test that forms with deleted themes still render with default styling
    // ... (implementation depends on test data setup)
  });
});
```

**Performance Test**:

```typescript
// tests/e2e/story-24.8-performance.spec.ts

test('theme application performance', async ({ page }) => {
  await page.goto('/app/tools/form-builder');

  // Add multiple fields
  for (let i = 0; i < 20; i++) {
    await page.click('text=Text Input');
  }

  // Measure theme application time
  const startTime = Date.now();
  await page.click('button:has-text("Styling Themes")');
  await page.click('.theme-card:first-child');
  await page.waitForTimeout(100); // Small buffer for visual update
  const endTime = Date.now();

  const duration = endTime - startTime;
  expect(duration).toBeLessThan(100); // Should be < 100ms for 20 fields
});
```

**Dependencies**: Story 24.7 (builder preview complete)

**Estimated Effort**: 16 hours (includes comprehensive testing across all scenarios)

---

## Technical Specifications

### CSS Variable Reference

All theme CSS variables defined in `ThemePreviewService.applyThemeCss()`:

```scss
// Core Colors
--theme-primary-color        // Primary brand color (buttons, focus states)
--theme-secondary-color      // Secondary accent color
--theme-background-color     // Page background
--theme-background-image     // Background image URL

// Typography
--theme-heading-font         // Heading font family
--theme-body-font            // Body text font family
--theme-font-size-base       // Base font size (16px)

// Text Colors
--theme-text-primary         // Primary text color
--theme-text-secondary       // Secondary/muted text color
--theme-label-color          // Form label color
--theme-heading-color        // Heading text color
--theme-help-text-color      // Help text/placeholder color

// Layout
--theme-border-radius        // Border radius for inputs/containers
--theme-field-spacing        // Spacing between fields
--theme-row-spacing          // Spacing between rows
--theme-column-gap           // Gap between columns
--theme-column-padding       // Padding within columns

// Container
--theme-container-background // Container background color
--theme-container-opacity    // Container opacity (0-1)
--theme-container-padding    // Container padding
--theme-container-border-radius // Container border radius

// Input Fields
--theme-input-background     // Input field background
--theme-input-border-color   // Input field border
--theme-input-text-color     // Input field text

// Buttons
--theme-button-primary-background   // Primary button background
--theme-button-primary-text         // Primary button text
--theme-button-secondary-background // Secondary button background
--theme-button-secondary-text       // Secondary button text

// Step Forms
--theme-step-active-color    // Active step indicator color
--theme-step-inactive-color  // Inactive step indicator color
```

### CSS Cascade & Specificity Strategy

**Priority Order** (highest to lowest):

1. **Custom Field CSS** (Story 16.2) - User-defined styles from `field.metadata.customStyle`
2. **Theme CSS Variables** (Epic 24) - Theme-based styling
3. **PrimeNG Defaults** - Framework component styles
4. **Browser Defaults** - Native input styling

**Implementation Pattern**:

```scss
// Use CSS variables with fallbacks for graceful degradation
.input-field {
  background-color: var(--theme-input-background, #ffffff); // Theme or default
  border: 1px solid var(--theme-input-border-color, #d1d5db);
  color: var(--theme-input-text-color, #1f2937);
}

// Custom field CSS (from metadata.customStyle) overrides theme
.input-field[style*='background-color'] {
  // User's inline styles take precedence (higher specificity)
}
```

### Mobile Responsive Theme Application

**Mobile Breakpoint**: `@media (max-width: 767px)`

**Mobile Theme Overrides**:

```scss
// ThemePreviewService generates mobile media query dynamically
@media (max-width: 767px) {
  :root {
    --theme-primary-color: [mobile-override];
    --theme-font-size-base: 14px; // Slightly smaller on mobile
    --theme-field-spacing: 0.75rem; // Tighter spacing
  }
}
```

### PrimeNG Component Overrides

**Strategy**: Use `::ng-deep` (Angular view encapsulation piercing) to override PrimeNG styles with
theme variables.

**Example** (Date Picker):

```scss
::ng-deep .p-datepicker {
  background-color: var(--theme-input-background, #ffffff);
  border: 1px solid var(--theme-input-border-color, #d1d5db);

  .p-datepicker-header {
    background-color: var(--theme-primary-color, #3b82f6);
    color: white;
  }

  .p-datepicker-today > span.p-highlight {
    background-color: var(--theme-primary-color, #3b82f6);
  }
}
```

**Important**: PrimeNG styles have high specificity. Use `::ng-deep` with caution and scope to
specific components to avoid global style pollution.

---

## Compatibility Requirements

### Existing Forms Without Themes

- [ ] Forms created before Epic 24 continue using default PrimeNG styling
- [ ] No `themeId` in settings → no theme CSS variables applied
- [ ] Forms can be edited/published without requiring theme selection
- [ ] Visual appearance identical to pre-Epic-24 behavior

### Custom Field CSS (Story 16.2)

- [ ] Custom field styles (from `field.metadata.customStyle`) override theme styles
- [ ] Custom CSS has higher specificity than theme CSS variables
- [ ] Theme and custom CSS coexist without conflicts

### Theme Deletion Handling

- [ ] Forms with deleted themes degrade gracefully to default styling
- [ ] `theme` property in API response is `null` when theme deleted (Story 20.7)
- [ ] Console warning displayed: "Theme {id} not found, using default styles"
- [ ] No errors thrown in browser console
- [ ] Form remains functional (submission, validation, rendering)

### Responsive Behavior

- [ ] Mobile theme overrides apply correctly below 768px breakpoint
- [ ] Desktop and mobile themes can have different colors/fonts
- [ ] Responsive grid layouts respect theme spacing variables

---

## Risk Assessment & Mitigation

### Risk 1: CSS Specificity Conflicts

**Severity**: HIGH **Description**: PrimeNG components use high-specificity selectors that may
override theme CSS variables. Custom field CSS might conflict with theme styles.

**Mitigation**:

- Use `::ng-deep` judiciously with component-level scoping
- Test theme application with PrimeNG components (Calendar, Dropdown, etc.)
- Ensure custom field CSS (inline styles) has higher specificity than theme CSS
- Document CSS cascade order in technical specifications

**Rollback Plan**: Theme CSS variables are additive only. Removing theme variable assignments
returns to PrimeNG defaults without breaking existing functionality.

---

### Risk 2: Performance Degradation with Large Forms

**Severity**: MEDIUM **Description**: Applying theme CSS to forms with 50+ fields might cause
noticeable lag or visual flicker during theme switching.

**Mitigation**:

- Use CSS variables (native browser feature, highly performant)
- Batch DOM updates when switching themes (no incremental field-by-field updates)
- Implement performance test (Story 24.8) to measure theme application time (<50ms requirement)
- Use `ChangeDetectionStrategy.OnPush` for field preview components

**Rollback Plan**: If performance issues detected, defer theme application to individual field
components rather than global `:root` injection.

---

### Risk 3: Browser Compatibility Issues

**Severity**: MEDIUM **Description**: CSS variables have excellent modern browser support but may
behave inconsistently in older browsers or specific versions.

**Mitigation**:

- Always provide fallback values: `var(--theme-primary-color, #3b82f6)`
- Test in all major browsers (Chrome, Firefox, Safari, Edge)
- Use Autoprefixer for vendor-prefixed properties
- Verify CSS variable inheritance in nested components

**Rollback Plan**: If CSS variable support is insufficient, generate static CSS classes for each
theme as fallback.

---

### Risk 4: Theme Deletion Breaks Published Forms

**Severity**: HIGH **Description**: If a theme is deleted by admin, all published forms using that
theme might break or display incorrectly.

**Mitigation**:

- Backend returns `null` for `theme` property when theme not found (already implemented in Story
  20.7)
- Frontend gracefully handles `null` theme by clearing CSS variables and using defaults
- Console warning logged (not user-visible error)
- Forms remain functional without theme styling

**Rollback Plan**: Prevent theme deletion if any published forms reference it (backend validation).

---

### Risk 5: Mobile Theme Overrides Not Applied

**Severity**: MEDIUM **Description**: Mobile-specific theme overrides (from
`ResponsiveThemeConfig.mobile`) might not apply correctly on mobile devices due to media query
issues.

**Mitigation**:

- Test theme application on actual mobile devices (iOS Safari, Android Chrome)
- Verify media query breakpoint (767px) aligns with mobile viewport sizes
- Use browser DevTools responsive mode for testing
- Log mobile override application in console for debugging

**Rollback Plan**: Disable mobile overrides and use desktop theme universally if mobile themes cause
issues.

---

## Definition of Done

### Story Completion Criteria

- [x] All story acceptance criteria met and verified
- [x] Code reviewed and approved by peer developer
- [x] Unit tests written and passing (where applicable)
- [x] E2E tests written and passing (Story 24.8)
- [x] Visual regression tests created with baseline screenshots
- [x] Documentation updated (CSS variable reference, field styling guide)
- [x] No TypeScript compilation errors
- [x] No console errors or warnings in browser

### Epic Completion Criteria

- [ ] All 8 stories completed and merged to `main` branch
- [ ] Visual regression tests pass for all field types with 3 themes
- [ ] End-to-end theme workflow tested: select theme → save → publish → render
- [ ] Performance benchmarks met (theme application < 50ms)
- [ ] Backward compatibility verified (forms without themes work correctly)
- [ ] Theme deletion handling verified (graceful degradation)
- [ ] Mobile responsive theme application verified on real devices
- [ ] Documentation complete:
  - [ ] CSS variable reference document
  - [ ] Field styling guide for developers
  - [ ] Theme application architecture diagram
  - [ ] Troubleshooting guide for CSS specificity issues
- [ ] No performance regression in existing forms
- [ ] No visual regression in existing forms without themes
- [ ] Browser compatibility verified (Chrome, Firefox, Safari, Edge)
- [ ] Release notes updated with Epic 24 details

---

## Story Sequencing & Dependencies

**Recommended Implementation Order**:

1. **Story 24.1** (Audit) → Foundation for all subsequent work
2. **Story 24.2** (Basic Inputs) → Highest priority fields, most commonly used
3. **Story 24.3** (Selection Fields) → Build on basic input patterns
4. **Story 24.4** (Specialized Inputs) → More complex components
5. **Story 24.5** (Image Gallery) → Custom component with unique styling needs
6. **Story 24.6** (Display Elements) → Non-input elements, lower priority
7. **Story 24.7** (Builder Canvas) → Integration of all field previews
8. **Story 24.8** (E2E Testing) → Comprehensive verification of all previous stories

**Parallel Work Opportunities**:

- Stories 24.2, 24.3, 24.4, 24.5, 24.6 can be developed in parallel by different developers (after
  Story 24.1 audit is complete)
- Story 24.7 (Builder Canvas) requires Stories 24.2-24.6 to be complete
- Story 24.8 (E2E Testing) requires all previous stories to be complete

---

## Story Manager Handoff

**Story Manager: Please develop detailed user stories for this brownfield epic with the following
key considerations:**

### Existing System Context

- **Technology Stack**: Angular 20+ frontend, Express.js backend, PostgreSQL database
- **Integration Points**:
  - `FormBuilderComponent` (theme selection dropdown, lines 130-134)
  - `FormRendererComponent` (public form theme application, lines 302-323)
  - `ThemePreviewService` (CSS variable injection, lines 20-85)
  - `FormBuilderService.applyTheme()` (theme application to form state, lines 1317-1365)

### Existing Patterns to Follow

- **CSS Variable-Based Theming**: All theme styling via CSS custom properties (`:root` level)
- **PrimeNG Component Styling**: Use `::ng-deep` with component scoping for framework overrides
- **Responsive Themes**: Desktop styles default, mobile overrides via media query (< 768px)
- **Graceful Degradation**: Always provide fallback values in `var()` function

### Critical Compatibility Requirements

- **Backward Compatibility**: Forms without `themeId` must render with default PrimeNG styling (no
  regression)
- **Custom Field CSS Priority**: User-defined styles (Story 16.2) override theme CSS
- **Theme Deletion Handling**: Forms with deleted themes fall back to defaults (console warning, no
  errors)
- **Performance Constraint**: Theme application must complete in < 50ms for forms with 50+ fields

### Per-Form Theme Workflow Verification

Each story must include verification that the existing per-form theme workflow remains intact:

1. Theme selection from dropdown in builder
2. Theme data saved to `form.schema.settings.themeId`
3. Theme applied to builder canvas preview
4. Theme persisted when form saved
5. Theme loaded when form reopened
6. Theme data fetched via API for published forms
7. Theme CSS applied to public form renderer

### Success Metrics

- All 16 field types visually reflect selected theme (colors, fonts, spacing)
- Theme changes in builder show immediate visual feedback
- Published forms render identically to builder preview
- No performance degradation (< 50ms theme application time)
- No visual regression for forms without themes
- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

**Please ensure each story includes**:

- Detailed acceptance criteria with code examples
- Testing checklist for manual verification
- Technical implementation guidance (CSS/TypeScript snippets)
- Performance and browser compatibility verification steps
- Rollback plan in case of issues

The epic should enhance the existing per-form theme system while maintaining complete system
integrity and backward compatibility.

---

## Additional Resources

### Related Documentation

- [Epic 20: Form Styling & Theme System](./epic-20-form-styling-theme-system.md)
- [Epic 23: Complete Theme System](./epic-23-complete-theme-system.md)
- [Story 16.2: Universal Custom CSS Support](./epic-16-field-properties-system.md#story-162)
- [Story 20.7: Public Form Rendering with Themes](./epic-20-form-styling-theme-system.md#story-207)
- [Architecture: Tech Stack](../architecture/tech-stack.md)
- [Architecture: Source Tree](../architecture/source-tree.md)

### Key Files to Review

- `apps/web/src/app/features/tools/components/form-builder/theme-preview.service.ts` - Theme CSS
  injection
- `apps/web/src/app/features/tools/components/form-builder/form-builder.component.ts` - Theme
  selection
- `apps/web/src/app/features/public/form-renderer/form-renderer.component.ts` - Public form theme
  rendering
- `apps/web/src/app/features/tools/components/form-builder/form-canvas/field-preview-renderer/` -
  Field preview components
- `packages/shared/src/types/theme.types.ts` - Theme type definitions
- `packages/shared/src/types/forms.types.ts` - Form and field type definitions

---

**Epic Status**: Draft - Ready for Story Development **Next Steps**: Story Manager to create
detailed user stories with technical implementations **Timeline**: Estimated 8-10 days for full epic
completion (62 total hours)
