# Story 24.1: Audit Current Theme CSS Variable Usage Across All Field Types

**Story ID**: STORY-24.1 **Epic**: Epic 24 - Universal Theme Application **Priority**: High
**Status**: Ready for Development **Estimated Effort**: 4 hours **Sprint**: TBD

---

## User Story

**As a** developer working on theme system enhancement **I want** a comprehensive audit of current
theme CSS variable usage across all 16 field types **So that** I can efficiently implement theme
support where it's missing and prioritize development work

---

## Acceptance Criteria

### AC1: Audit Document Created

- [ ] Markdown table or spreadsheet created with the following columns:
  - Field Type (e.g., TEXT, EMAIL, NUMBER, etc.)
  - Component Path (file location in codebase)
  - SCSS File Path (stylesheet location)
  - CSS Variable Usage (Yes/No/Partial)
  - Theme Variables Found (list of variables currently used)
  - Hardcoded Styles Found (list of hardcoded colors/fonts/spacing)
  - Priority (High/Medium/Low)
  - Estimated Effort (hours)
  - Notes (special considerations, PrimeNG overrides needed, etc.)

### AC2: Gap Analysis Completed

- [ ] For each field type with missing theme support, document:
  - Specific CSS properties that need theme variable conversion
  - Current hardcoded values (colors, fonts, spacing)
  - Target theme CSS variables to use
  - Example code snippets showing before/after

### AC3: Priority Matrix Defined

- [ ] Fields categorized into priority tiers:
  - **High Priority** (implement first): TEXT, EMAIL, NUMBER, TEXTAREA, SELECT
    - Rationale: Most commonly used input fields, highest user impact
  - **Medium Priority** (implement second): CHECKBOX, RADIO, DATE, DATETIME, TOGGLE, FILE
    - Rationale: Frequently used, moderate complexity
  - **Low Priority** (implement third): IMAGE_GALLERY, HEADING, IMAGE, TEXT_BLOCK, DIVIDER
    - Rationale: Display elements or specialized inputs, lower frequency

### AC4: Baseline Visual Regression Tests Created

- [ ] Screenshot captured for each field type in current state (before theme enhancements)
- [ ] Screenshots organized in `/tests/screenshots/baseline/` directory
- [ ] Naming convention: `{field-type}-baseline.png` (e.g., `text-input-baseline.png`)
- [ ] Screenshots include:
  - Builder canvas preview of field
  - Public form rendering of field
  - Both desktop and mobile viewport sizes

### AC5: PrimeNG Component Overrides Documented

- [ ] List of PrimeNG components used in form renderer identified
- [ ] Required `::ng-deep` overrides documented for each component
- [ ] CSS specificity strategies documented to avoid conflicts

### AC6: Audit Report Delivered

- [ ] Final audit report includes:
  - Executive summary with key findings
  - Detailed field-by-field analysis
  - Prioritized implementation roadmap
  - Risk areas identified (high CSS specificity, complex components)
  - Recommended implementation sequence

---

## Technical Implementation

### Step 1: Field Type Inventory

**All 16 Field Types to Audit**:

#### Input Fields (12 types)

1. TEXT - Single-line text input
2. EMAIL - Email input with validation
3. NUMBER - Numeric input
4. SELECT - Dropdown selection
5. TEXTAREA - Multi-line text input
6. FILE - File upload
7. CHECKBOX - Checkbox input (single or multi-select)
8. RADIO - Radio button group
9. DATE - Date picker
10. DATETIME - Date and time picker
11. TOGGLE - Toggle switch
12. IMAGE_GALLERY - Image gallery selector

#### Display Elements (4 types)

13. HEADING - Heading/title (h1-h6)
14. IMAGE - Image display
15. TEXT_BLOCK - Text content block
16. DIVIDER - Section divider

---

### Step 2: Component Location Mapping

**File Locations to Review**:

```bash
# Form Renderer Component (Public Forms)
apps/web/src/app/features/public/form-renderer/
├── form-renderer.component.ts
├── form-renderer.component.html
├── form-renderer.component.scss  # PRIMARY AUDIT TARGET
└── image-gallery-renderer.component.scss

# Field Preview Components (Builder Canvas)
apps/web/src/app/features/tools/components/form-builder/form-canvas/field-preview-renderer/
├── field-preview-renderer.component.ts/.scss
├── text-input-preview.component.ts/.scss
├── select-preview.component.ts/.scss
├── checkbox-preview.component.ts/.scss
├── radio-preview.component.ts/.scss
├── textarea-preview.component.ts/.scss
└── inline-label-editor.component.ts/.scss

# Theme Service (Reference for available CSS variables)
apps/web/src/app/features/tools/components/form-builder/
└── theme-preview.service.ts  # Lines 20-85: CSS variable definitions
```

---

### Step 3: CSS Variable Reference

**Available Theme CSS Variables** (from theme-preview.service.ts:20-85):

```scss
// Core Colors
--theme-primary-color           // Primary brand color
--theme-secondary-color         // Secondary accent color
--theme-background-color        // Page background
--theme-background-image        // Background image URL

// Typography
--theme-heading-font            // Heading font family
--theme-body-font               // Body text font family
--theme-font-size-base          // Base font size (16px)

// Text Colors
--theme-text-primary            // Primary text color
--theme-text-secondary          // Secondary/muted text
--theme-label-color             // Form label color
--theme-heading-color           // Heading text color
--theme-help-text-color         // Help text/placeholder color

// Layout
--theme-border-radius           // Border radius for inputs
--theme-field-spacing           // Spacing between fields
--theme-row-spacing             // Spacing between rows
--theme-column-gap              // Gap between columns
--theme-column-padding          // Padding within columns

// Container
--theme-container-background    // Container background color
--theme-container-opacity       // Container opacity (0-1)
--theme-container-padding       // Container padding
--theme-container-border-radius // Container border radius

// Input Fields
--theme-input-background        // Input field background
--theme-input-border-color      // Input field border
--theme-input-text-color        // Input field text

// Buttons
--theme-button-primary-background     // Primary button background
--theme-button-primary-text           // Primary button text
--theme-button-secondary-background   // Secondary button background
--theme-button-secondary-text         // Secondary button text

// Step Forms
--theme-step-active-color       // Active step indicator color
--theme-step-inactive-color     // Inactive step indicator color
```

---

### Step 4: Audit Template

**Use this template for each field type**:

````markdown
## Field Type: [FIELD_NAME]

### Component Information

- **Type**: Input Field / Display Element
- **Component Path**: `apps/web/src/.../component.ts`
- **SCSS Path**: `apps/web/src/.../component.scss`
- **Used in Builder**: Yes/No
- **Used in Public Form**: Yes/No

### Current Theme Support

- **CSS Variable Usage**: Yes / No / Partial
- **Variables Found**:
  - `--theme-primary-color` (usage: focus border)
  - `--theme-input-background` (usage: field background)
  - ... (list all found)

### Hardcoded Styles Found

- **Background Color**: `#ffffff` (line 45) → Should use `--theme-input-background`
- **Border Color**: `#d1d5db` (line 46) → Should use `--theme-input-border-color`
- **Text Color**: `#1f2937` (line 47) → Should use `--theme-input-text-color`
- **Font Family**: `system-ui` (line 48) → Should use `--theme-body-font`
- ... (list all found)

### Gap Analysis

**Missing Theme Variables**:

1. Background color needs `--theme-input-background`
2. Border needs `--theme-input-border-color`
3. Text needs `--theme-input-text-color`
4. Label needs `--theme-label-color`
5. Focus state needs `--theme-primary-color`

**Code Changes Required**:

```scss
// BEFORE
.field-input {
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  color: #1f2937;
}

// AFTER
.field-input {
  background-color: var(--theme-input-background, #ffffff);
  border: 1px solid var(--theme-input-border-color, #d1d5db);
  color: var(--theme-input-text-color, #1f2937);
}
```
````

### Priority & Effort

- **Priority**: High / Medium / Low
- **Effort Estimate**: X hours
- **Complexity**: Low / Medium / High
- **Dependencies**: Story 24.X (if applicable)

### Special Considerations

- PrimeNG component overrides needed: Yes/No
- Custom styling challenges: (describe any)
- Mobile responsive considerations: (describe any)
- Browser compatibility issues: (describe any)

### Notes

(Any additional observations, risks, or recommendations)

````

---

### Step 5: Baseline Screenshot Capture

**Create Baseline Screenshots**:

```bash
# Directory structure
tests/
└── screenshots/
    └── baseline/
        ├── desktop/
        │   ├── text-input-baseline.png
        │   ├── email-input-baseline.png
        │   ├── number-input-baseline.png
        │   ├── select-input-baseline.png
        │   ├── textarea-input-baseline.png
        │   ├── file-input-baseline.png
        │   ├── checkbox-input-baseline.png
        │   ├── radio-input-baseline.png
        │   ├── date-input-baseline.png
        │   ├── datetime-input-baseline.png
        │   ├── toggle-input-baseline.png
        │   ├── image-gallery-input-baseline.png
        │   ├── heading-element-baseline.png
        │   ├── image-element-baseline.png
        │   ├── text-block-element-baseline.png
        │   └── divider-element-baseline.png
        └── mobile/
            └── (same files as desktop)
````

**Playwright Script for Baseline Capture**:

```typescript
// tests/e2e/story-24.1-baseline-capture.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Story 24.1: Baseline Screenshot Capture', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'User123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('/app/dashboard');

    // Navigate to form builder
    await page.goto('/app/tools/form-builder');
    await page.waitForLoadState('networkidle');
  });

  const fieldTypes = [
    { name: 'Text Input', selector: 'text=Text Input' },
    { name: 'Email', selector: 'text=Email' },
    { name: 'Number', selector: 'text=Number' },
    { name: 'Select Option', selector: 'text=Select Option' },
    { name: 'Text Area', selector: 'text=Text Area' },
    { name: 'File Upload', selector: 'text=File Upload' },
    { name: 'Checkbox', selector: 'text=Checkbox' },
    { name: 'Radio Button', selector: 'text=Radio Button' },
    { name: 'Date', selector: 'text=Date' },
    { name: 'Date & Time', selector: 'text=Date & Time' },
    { name: 'Toggle', selector: 'text=Toggle' },
    { name: 'Image Gallery', selector: 'text=Image Gallery' },
    { name: 'Untitled Heading', selector: 'text=Untitled Heading' },
    { name: 'Image', selector: 'text=Image' },
    { name: 'Text Block', selector: 'text=Text Block' },
    { name: 'Section Divider', selector: 'text=Section Divider' },
  ];

  for (const field of fieldTypes) {
    test(`capture baseline for ${field.name}`, async ({ page }) => {
      // Add field to canvas
      await page.click(field.selector);
      await page.waitForTimeout(500);

      // Capture desktop screenshot
      const fieldElement = page.locator('.form-canvas .field-preview').last();
      await fieldElement.screenshot({
        path: `tests/screenshots/baseline/desktop/${field.name.toLowerCase().replace(/\s+/g, '-')}-baseline.png`,
      });

      // Switch to mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Capture mobile screenshot
      await fieldElement.screenshot({
        path: `tests/screenshots/baseline/mobile/${field.name.toLowerCase().replace(/\s+/g, '-')}-baseline.png`,
      });

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  }

  test('capture baseline for published form', async ({ page }) => {
    // Create form with all field types
    for (const field of fieldTypes) {
      await page.click(field.selector);
      await page.waitForTimeout(300);
    }

    // Save form
    await page.click('button:has-text("Save")');
    await page.waitForSelector('text=Draft Saved');

    // Publish form
    await page.click('button:has-text("Publish")');
    await page.waitForSelector('text=Form Published');

    // Get public URL
    const publicUrl = await page.inputValue('input[readonly][value*="/forms/render/"]');

    // Open public form
    const publicPage = await page.context().newPage();
    await publicPage.goto(publicUrl);
    await publicPage.waitForLoadState('networkidle');

    // Capture desktop screenshots
    await publicPage.screenshot({
      path: 'tests/screenshots/baseline/desktop/public-form-full-baseline.png',
      fullPage: true,
    });

    // Individual field screenshots
    for (let i = 0; i < fieldTypes.length; i++) {
      const fieldElement = publicPage.locator('.field-container').nth(i);
      await fieldElement.screenshot({
        path: `tests/screenshots/baseline/desktop/public-${fieldTypes[i].name.toLowerCase().replace(/\s+/g, '-')}-baseline.png`,
      });
    }

    // Mobile screenshots
    await publicPage.setViewportSize({ width: 375, height: 667 });
    await publicPage.screenshot({
      path: 'tests/screenshots/baseline/mobile/public-form-full-baseline.png',
      fullPage: true,
    });
  });
});
```

---

### Step 6: PrimeNG Component Identification

**PrimeNG Components Used in Form Renderer**:

```typescript
// List of PrimeNG components that may need ::ng-deep overrides
const primeNgComponents = [
  {
    component: 'p-calendar',
    usage: 'DATE and DATETIME fields',
    overrideNeeded: true,
    reason: 'Calendar header and selected date styling',
    cssSelector: '.p-datepicker',
  },
  {
    component: 'p-dropdown',
    usage: 'SELECT fields',
    overrideNeeded: true,
    reason: 'Dropdown panel background and border',
    cssSelector: '.p-dropdown',
  },
  {
    component: 'p-checkbox',
    usage: 'CHECKBOX fields',
    overrideNeeded: false,
    reason: 'Using custom CSS, not PrimeNG component',
    cssSelector: 'N/A',
  },
  // ... add all components
];
```

---

## Deliverables

### 1. Audit Report Document

**Location**: `/docs/stories/story-24.1-audit-report.md`

**Required Sections**:

- Executive Summary
- Field-by-Field Analysis (16 field types)
- Priority Matrix
- Gap Analysis Summary
- Implementation Roadmap
- Risk Areas
- Recommendations

### 2. Field Audit Spreadsheet

**Location**: `/docs/stories/story-24.1-field-audit.csv`

**Columns**: Field Type, Component Path, SCSS Path, Variable Usage, Hardcoded Styles, Priority,
Effort, Notes

### 3. Baseline Screenshots

**Location**: `/tests/screenshots/baseline/`

**Contents**:

- Desktop screenshots (16 field types + full form)
- Mobile screenshots (16 field types + full form)
- Both builder canvas and public form renderings

### 4. PrimeNG Override Strategy

**Location**: `/docs/stories/story-24.1-primeng-overrides.md`

**Contents**:

- List of PrimeNG components requiring overrides
- CSS specificity strategies
- Example override code snippets

---

## Testing & Verification

### Manual Testing Checklist

- [ ] All 16 field types reviewed in form-renderer.component.scss
- [ ] All field preview components reviewed in builder canvas
- [ ] CSS variable usage documented for each field
- [ ] Hardcoded styles identified for each field
- [ ] Priority matrix validated with team
- [ ] Baseline screenshots captured for all fields (desktop + mobile)
- [ ] PrimeNG components identified and documented
- [ ] Audit report reviewed and approved by tech lead

### Automated Testing

- [ ] Playwright script runs without errors
- [ ] All baseline screenshots generated successfully
- [ ] Screenshots saved to correct directory structure
- [ ] File naming convention followed

---

## Implementation Steps

### Step-by-Step Guide

**Hour 1: Setup & Inventory**

1. Create audit report template file
2. Create field audit spreadsheet
3. Review Epic 24 documentation
4. Set up screenshot directories

**Hour 2: Component Analysis**

1. Audit form-renderer.component.scss (primary target)
2. Document CSS variable usage for each field type
3. Identify hardcoded styles (colors, fonts, spacing)
4. Create gap analysis notes

**Hour 3: Baseline Capture**

1. Run Playwright baseline screenshot script
2. Verify screenshots captured correctly
3. Review screenshots for quality
4. Document PrimeNG components found

**Hour 4: Documentation & Delivery**

1. Complete audit report with findings
2. Create priority matrix
3. Define implementation roadmap
4. Review deliverables with team
5. Hand off to Story 24.2 developer

---

## Dependencies

### Prerequisites

- Access to codebase (`/apps/web/src/app/features/`)
- Playwright installed and configured
- Dev environment running (form builder accessible)
- Admin test account credentials

### Blocking Issues

None - this is the first story in Epic 24

### Required Knowledge

- CSS/SCSS syntax
- Angular component structure
- Theme CSS variables (reference: theme-preview.service.ts)
- Basic Playwright for screenshot capture

---

## Acceptance Test Scenarios

### Scenario 1: Audit Report Completeness

**Given** the audit is complete **When** reviewing the audit report **Then** I should see:

- All 16 field types documented
- Current CSS variable usage status for each
- Hardcoded styles identified for each
- Priority assigned to each field type
- Implementation effort estimated

### Scenario 2: Baseline Screenshots

**Given** the Playwright script has run **When** checking the screenshots directory **Then** I
should find:

- 16 desktop field screenshots
- 16 mobile field screenshots
- Public form full-page screenshots (desktop + mobile)
- All files follow naming convention
- All images are clear and properly cropped

### Scenario 3: Gap Analysis Usefulness

**Given** the audit is complete **When** a developer starts Story 24.2 (Basic Inputs) **Then** they
should be able to:

- Identify which CSS variables to use
- Find current hardcoded values to replace
- Understand the priority of work
- Reference example code snippets

---

## Risk Assessment

### Risk 1: Incomplete Audit

**Severity**: Medium **Probability**: Low **Impact**: Delays subsequent stories if gaps are missed
**Mitigation**: Use checklist to ensure all 16 field types reviewed **Contingency**: Conduct
follow-up review after Story 24.2 completion

### Risk 2: Baseline Screenshots Fail

**Severity**: Low **Probability**: Medium **Impact**: No visual regression baseline for comparison
**Mitigation**: Run Playwright script multiple times to ensure stability **Contingency**: Capture
screenshots manually using browser DevTools

### Risk 3: PrimeNG Components Not Identified

**Severity**: Medium **Probability**: Low **Impact**: CSS specificity issues discovered late in
development **Mitigation**: Search codebase for all PrimeNG component imports **Contingency**: Add
PrimeNG override task to later stories as needed

---

## Definition of Done

- [x] All 16 field types audited and documented
- [x] Audit report created with executive summary and recommendations
- [x] Field audit spreadsheet completed with all required columns
- [x] Baseline screenshots captured for all fields (desktop + mobile)
- [x] PrimeNG component override strategy documented
- [x] Priority matrix defined and validated
- [x] Gap analysis completed with code examples
- [x] Implementation roadmap created for Stories 24.2-24.8
- [x] Audit report reviewed and approved by tech lead
- [x] Story 24.2 developer briefed on findings

---

## Notes for Developers

### Quick Start Guide

1. **Clone Audit Template**:

   ```bash
   cp docs/stories/story-24.1-audit-template.md docs/stories/story-24.1-audit-report.md
   ```

2. **Run Baseline Script**:

   ```bash
   npm run test:e2e -- tests/e2e/story-24.1-baseline-capture.spec.ts
   ```

3. **Review Files**:
   - Start with `form-renderer.component.scss` (primary target)
   - Check `theme-preview.service.ts` for available CSS variables
   - Look for hardcoded hex colors (`#ffffff`, `#d1d5db`, etc.)

4. **Document Findings**:
   - Use audit template for each field type
   - Note current CSS variable usage
   - Identify gaps and missing theme support

5. **Create Deliverables**:
   - Complete audit report
   - Fill in field audit spreadsheet
   - Verify baseline screenshots captured

### Common Pitfalls to Avoid

❌ **Don't**: Skip documenting "partial" theme support ✅ **Do**: Note which CSS properties use
themes and which don't

❌ **Don't**: Assume all fields need same CSS variables ✅ **Do**: Identify field-specific variables
(e.g., calendar needs `--theme-step-active-color`)

❌ **Don't**: Overlook mobile-specific styling ✅ **Do**: Check for responsive CSS and mobile
breakpoints

❌ **Don't**: Forget to document PrimeNG components ✅ **Do**: List all PrimeNG imports and required
overrides

---

## Additional Resources

### Reference Files

- Epic 24 Documentation: `/docs/prd/epic-24-universal-theme-application.md`
- Theme Preview Service:
  `/apps/web/src/app/features/tools/components/form-builder/theme-preview.service.ts`
- Form Renderer: `/apps/web/src/app/features/public/form-renderer/form-renderer.component.scss`

### Example Audits

See `/docs/examples/audit-example-text-input.md` for a sample completed audit

### Questions?

Contact: Tech Lead or Epic 24 Product Owner

---

**Story Status**: Ready for Development ✅ **Next Story**: Story 24.2 - Apply Theme Variables to
Basic Input Fields

## QA Results

Reviewer: Quinn (Test Architect & Quality Advisor)

Summary

- Scope aligns with Epic 24 objectives and enumerates all 16 field types.
- Strong structure and guidance; however, several required deliverables are not present in the repo
  yet.
- Baseline E2E capture spec exists and is well‑scaffolded, but baseline artifacts are not checked
  in.

Acceptance Criteria Assessment

- AC1 Audit Document Created: NOT MET
  - Missing files referenced in Deliverables: `docs/stories/story-24.1-audit-report.md` and
    `docs/stories/story-24.1-field-audit.csv`.
- AC2 Gap Analysis Completed: NOT MET
  - Template and examples are present, but no field‑by‑field filled analysis is committed.
- AC3 Priority Matrix Defined: MET
  - Priority tiers and rationale are explicitly defined and consistent with Epic.
- AC4 Baseline Visual Regression Tests Created: PARTIAL
  - Test present: `tests/e2e/story-24.1-baseline-capture.spec.ts` (creates dirs, captures, and
    verifies files).
  - Baseline images are not committed under `tests/screenshots/baseline/`.
- AC5 PrimeNG Component Overrides Documented: NOT MET
  - No `docs/stories/story-24.1-primeng-overrides.md` found; only guidance exists in story.
- AC6 Audit Report Delivered: NOT MET
  - Executive summary and field‑by‑field analysis not present as a separate report file.

Evidence and Notes

- Variable source:
  `apps/web/src/app/features/tools/components/form-builder/theme-preview.service.ts` defines both
  canonical and legacy alias vars (e.g., `--theme-background-color` and `--theme-bg-color`,
  `--theme-heading-font` and `--theme-font-heading`). The audit framework should explicitly capture
  both to avoid drift.
- Primary audit target `apps/web/src/app/features/public/form-renderer/form-renderer.component.scss`
  contains hardcoded values (e.g., `#374151` for labels, toggle colors `#cbd5e0`/`#3b82f6`, fixed
  gaps), confirming expected gaps for later stories.
- Story references `docs/examples/audit-example-text-input.md` but `docs/examples/` does not exist.

Risks

- Doc drift: Story references variable line ranges and paths that may change; include a generated
  map from the service at review time.
- PrimeNG overrides untracked: Missing concrete override doc could delay Story 24.4.

Recommendations (Must‑Dos to Pass Gate)

- Add the missing deliverables:
  - `docs/stories/story-24.1-audit-report.md` (executive summary + field‑by‑field)
  - `docs/stories/story-24.1-field-audit.csv`
  - `docs/stories/story-24.1-primeng-overrides.md`
- Run and commit baseline artifacts (or confirm they are generated in CI as artifacts):
  - `tests/screenshots/baseline/desktop/*.png`, `mobile/*.png`, and `metadata.json`
- Update story references to include both canonical and alias CSS variables for completeness.
- Remove or correct the reference to the non‑existent `docs/examples/audit-example-text-input.md`,
  or add it.

Gate Decision

- Status: CONCERNS
- Rationale: Critical deliverables and baseline evidence are missing; guidance is solid and
  actionable once artifacts are produced.
