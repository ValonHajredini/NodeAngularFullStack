# Epic 21: Enable Visual Theme Application on Forms - ~~DEPRECATED~~

**STATUS:** ⚠️ **DEPRECATED - ROLLED BACK**  
**Date:** 2025-10-16  
**Reason:** Incomplete implementation - theme utility classes only covered form inputs/buttons, not
backgrounds/containers. Tailwind removal was partial, causing CSS conflicts.

**Replacement:** See Epic 23 - Complete Theme System Implementation

**Issues Identified:**

1. `theme-variables.css` only defined classes for `.theme-input`, `.theme-button`, `.theme-label`
2. Missing classes for `.theme-form-background`, `.theme-container-wrapper`, row/column containers
3. Partial Tailwind replacement left conflicts (Tailwind specificity > theme variables)
4. Theme rendering broken: only inputs/labels/buttons styled, backgrounds/divs not styled

**Files to Revert:**

- `apps/web/src/app/features/tools/components/form-builder/form-canvas/form-canvas.component.ts`
- `apps/web/src/app/features/public/form-renderer/form-renderer.component.html`
- `apps/web/src/styles/theme-variables.css` (partial modifications)

---

## Original Epic Content (For Reference Only)

## Epic Goal

Enable form builders to select from 9 predefined themes and see colors, fonts, and styling instantly
apply to form previews and published forms by replacing hardcoded Tailwind classes with existing
theme utility classes.

## Epic Description

### Existing System Context

**Current functionality**: Form Builder has complete theme infrastructure (Epic 20) with:

- 9 predefined themes (Scarlet, Neon, Desert, Cyber Dawn, Night Blue, Green Ocean, Wall Flower,
  Angular, Default) seeded in database
- ThemePreviewService injecting CSS variables into `:root`
- Theme selection UI with active state indicator (blue border on selected theme)
- Utility classes defined in `theme-variables.css` (`.theme-input`, `.theme-button-primary`,
  `.theme-label`, etc.)

**Technology stack**: Angular 20+ standalone components, PrimeNG, Tailwind CSS (retained for
layout), TypeScript, Express.js backend

**Integration points**:

- Form templates (`form-canvas.component.ts`, `form-renderer.component.html`)
- Existing theme utility stylesheet (`apps/web/src/styles/theme-variables.css`)
- ThemePreviewService (CSS variable injection - no changes needed)

### Enhancement Details

**What's being added/changed**:

- Replace hardcoded Tailwind color/typography classes (e.g., `border-gray-300`, `text-blue-600`,
  `focus:ring-blue-500`) with theme-aware utility classes (e.g., `.theme-input`, `.theme-heading`)
- Scope limited to themeable elements: inputs, buttons, labels, headings, textareas, selects,
  checkboxes, radios
- **Keep** Tailwind for layout/spacing (flex, grid, padding, margin, responsive utilities) - no
  change to responsive behavior

**How it integrates**:

- Uses existing `theme-variables.css` utility classes that consume CSS variables injected by
  ThemePreviewService
- No changes to ThemePreviewService, FormBuilderService, or theme API endpoints
- Pure template-level class replacement
- Theme CSS variables already being injected correctly (verified working)

**Success criteria**:

- Clicking Scarlet theme changes form inputs to crimson red borders/buttons, white text on black
  background
- All 9 themes visually apply in both builder preview and published forms
- Theme transitions are smooth (using `.theme-transition` class)
- No regression in form layout, responsiveness, validation, or submission behavior

## Stories

### Story 21.1: Replace Form Canvas Hardcoded Classes with Theme Utilities

**Description**: Update Form Canvas component template to use theme utility classes for all
themeable elements in the builder preview.

**Scope**:

- File:
  `apps/web/src/app/features/tools/components/form-builder/form-canvas/form-canvas.component.ts`
- Replace hardcoded Tailwind color/typography classes with theme utilities
- Apply to all field types rendered in canvas

**Class Replacements**:

- Text inputs: `border-gray-300 focus:ring-blue-500` → `.theme-input`
- Buttons (primary): `bg-blue-600 text-white` → `.theme-button-primary`
- Buttons (secondary): `bg-gray-500 text-white` → `.theme-button-secondary`
- Labels: `text-gray-700 font-medium` → `.theme-label`
- Headings: Custom color classes → `.theme-heading`
- Selects: `border-gray-300` → `.theme-select`
- Textareas: `border-gray-300` → `.theme-textarea`
- Checkboxes/Radios: Custom accent colors → `.theme-checkbox` / `.theme-radio`

**Keep Unchanged**:

- All Tailwind layout utilities (flex, grid, w-full, px-3, py-2, mb-4, etc.)
- Responsive breakpoints (sm:, md:, lg:)
- Spacing utilities (gap-2, space-y-4, etc.)

**Acceptance Criteria**:

1. Builder preview shows theme colors when theme selected from dropdown
2. Scarlet theme shows crimson red primary color, dark gray secondary, black background
3. All field types (text, email, select, textarea, checkbox, radio, date) render with theme colors
4. Form layout and responsiveness unchanged
5. Drag-drop functionality intact
6. Field editing modal still works

**Testing Checklist**:

- [ ] Test 3 high-contrast themes in builder preview: Scarlet (red/black), Neon (pink/purple),
      Default (gray)
- [ ] Verify responsive behavior on mobile/tablet/desktop
- [ ] Drag field from palette → canvas (works)
- [ ] Edit field properties via modal (works)
- [ ] Switch between themes (smooth transition)

---

### Story 21.2: Replace Form Renderer Hardcoded Classes with Theme Utilities

**Description**: Update Form Renderer component template to use theme utility classes for all
themeable elements in published public forms.

**Scope**:

- File: `apps/web/src/app/features/public/form-renderer/form-renderer.component.html`
- Replace hardcoded Tailwind color/typography classes with theme utilities
- Ensure consistency with Form Canvas styling
- Apply to all field types in public form rendering

**Class Replacements** (same as Story 21.1):

- Text inputs: `border-gray-300 focus:ring-blue-500` → `.theme-input`
- Submit button: `bg-blue-600 text-white` → `.theme-button-primary`
- Labels: `text-gray-700 font-medium` → `.theme-label`
- Form title/description: Custom colors → `.theme-heading`, `.theme-text-secondary`
- Error messages: Keep error red (not themeable) → `.theme-error-text`
- Help text: `text-gray-600` → `.theme-help-text`

**Keep Unchanged**:

- All Tailwind layout utilities
- Responsive breakpoints
- Row layout rendering logic
- Step form navigation
- Validation error styling (stays red)

**Acceptance Criteria**:

1. Published forms render with selected theme colors/fonts
2. Scarlet theme shows crimson red inputs, black background, white text
3. All field types render correctly with themes applied
4. Form submission works (POST to backend)
5. Validation errors display correctly
6. Row layout rendering intact
7. Step form navigation works

**Testing Checklist**:

- [ ] Publish form with Scarlet theme → verify colors on public URL
- [ ] Test 3 high-contrast themes on published forms: Scarlet, Neon, Default
- [ ] Submit form → verify backend receives data
- [ ] Test validation errors (required fields, email format, etc.)
- [ ] Test row layout with themes (2-4 columns)
- [ ] Test step form with themes (multi-step wizard)
- [ ] Mobile responsiveness on published forms

---

### Story 21.3: Add Theme Transition Animations and E2E Testing

**Description**: Add smooth theme transition animations and create comprehensive E2E tests to verify
theme application across all scenarios.

**Scope**:

- Apply `.theme-transition` class to themeable elements for smooth color changes
- Create E2E test suite for theme functionality
- Test all 9 themes in both builder and renderer
- Verify mobile/tablet/desktop responsiveness

**Implementation**:

1. **Add Transition Classes**:
   - Apply `.theme-transition` to inputs, buttons, labels in both canvas and renderer
   - Verify smooth color/font changes when switching themes (300ms transition)

2. **E2E Test Suite** (`tests/e2e/theme-application.spec.ts`):

   ```typescript
   describe('Theme Application', () => {
     test('Theme selection changes builder preview colors', async () => {
       // Open Form Builder
       // Click "Styling Themes" button
       // Select Scarlet theme
       // Verify inputs have crimson red borders
       // Verify buttons have crimson red background
     });

     test('High-contrast themes render correctly in builder', async () => {
       // Test Scarlet (red/black), Neon (pink/purple), Default (gray)
       // Verify each theme applies visually
     });

     test('Published forms render with selected theme', async () => {
       // Create form, select Scarlet theme, publish
       // Navigate to public URL
       // Verify Scarlet colors render
     });

     test('Theme changes are smooth (transitions)', async () => {
       // Switch between Scarlet → Neon → Default
       // Verify no visual glitches
       // Verify 300ms transition duration
     });

     test('Mobile responsiveness with themes', async () => {
       // Set viewport to mobile
       // Test Scarlet, Neon, Default themes
       // Verify responsive behavior intact
     });
   });
   ```

3. **Manual QA Checklist**:
   - [ ] Test 3 high-contrast themes: Scarlet (red/black), Neon (pink/purple), Default (gray)
   - [ ] Builder preview shows theme colors
   - [ ] Published forms show theme colors
   - [ ] Theme transitions are smooth (no flicker)
   - [ ] Mobile: Themes render correctly, fields stack vertically
   - [ ] Tablet: Themes render correctly, columns adapt
   - [ ] Desktop: Full theme rendering with all columns

**Acceptance Criteria**:

1. Theme changes have smooth 300ms transitions (no flicker)
2. E2E tests pass for 3 high-contrast themes: Scarlet, Neon, Default
3. High-contrast themes verified working in:
   - Builder preview
   - Published forms
   - Mobile viewport (< 768px)
   - Tablet viewport (768px - 1279px)
   - Desktop viewport (≥ 1280px)
4. No regression in existing functionality:
   - Form creation/editing
   - Drag-drop
   - Validation
   - Submission
   - Row layouts
   - Step forms

**Testing Checklist**:

- [ ] Run E2E test suite (`npm run test:e2e`)
- [ ] Manual test: Scarlet theme (high contrast red/black)
- [ ] Manual test: Neon theme (high contrast pink/purple)
- [ ] Manual test: Default theme (neutral gray baseline)
- [ ] Mobile testing (Chrome DevTools mobile viewport)
- [ ] Regression test: Create new form, add fields, publish, submit

---

## Compatibility Requirements

- ✅ **Existing APIs remain unchanged**: No backend/API modifications required
- ✅ **Database schema unchanged**: Uses existing `form_themes` table from Epic 20
- ✅ **UI follows existing patterns**: Uses existing theme utility classes from
  `theme-variables.css`
- ✅ **Performance impact minimal**: Pure CSS class replacement; no JavaScript changes; no
  additional API calls

## Risk Mitigation

**Primary Risk**: Accidentally removing layout/spacing Tailwind classes, breaking responsive design
or form structure

**Mitigation**:

- **Surgical replacement strategy**: Only replace color/typography classes; keep all layout
  utilities
- **Comprehensive Tailwind retention**: Keep flex, grid, padding, margin, width, height, responsive
  breakpoints (sm:, md:, lg:)
- **Testing at each story**: Test responsive behavior on mobile/tablet/desktop before moving to next
  story
- **Peer review**: Second developer reviews template changes before merge
- **E2E test coverage**: Automated tests catch layout regressions

**Rollback Plan**:

- Simple `git revert` on template files (form-canvas.component.ts, form-renderer.component.html)
- No database migrations to rollback
- No API changes to rollback
- No deployment downtime required

**Secondary Risks**:

- **Theme utility classes incomplete**: Already mitigated - `theme-variables.css` created with all
  necessary classes (.theme-input, .theme-button-primary, etc.)
- **CSS variable injection not working**: Already verified working - ThemePreviewService correctly
  injects variables into `:root`

## Definition of Done

### Story Completion

- ✅ All 3 stories completed with acceptance criteria met
- ✅ Code reviewed and approved
- ✅ E2E tests written and passing
- ✅ Manual QA completed for all 9 themes

### Functionality Verification

- ✅ Existing form functionality verified:
  - Field validation (required, email format, regex patterns)
  - Form submission to backend
  - Row layouts (1-4 columns per row)
  - Step forms (multi-step wizard navigation)
  - Drag-drop field reordering
  - Field editing via modal
  - Publish/unpublish workflow

### Visual Verification

- ✅ All 9 themes render correctly in builder preview
- ✅ All 9 themes render correctly in published forms
- ✅ Theme transitions are smooth (300ms, no flicker)
- ✅ Responsive behavior intact:
  - Mobile (< 768px): Fields stack vertically, themes apply
  - Tablet (768px - 1279px): Adaptive columns, themes apply
  - Desktop (≥ 1280px): Full columns, themes apply

### No Regressions

- ✅ No regression in existing features:
  - Form Builder UI/UX
  - Theme selection dropdown
  - Forms API endpoints
  - Public form rendering
  - Form analytics
  - Short links with QR codes
  - Background settings (image, custom CSS/HTML)

### Documentation

- ✅ Epic documentation updated (this file)
- ✅ Story acceptance criteria documented
- ✅ E2E test coverage documented
- ✅ No additional user documentation needed (behavior transparent to users)

---

## Technical Notes

### Files Modified

1. `apps/web/src/app/features/tools/components/form-builder/form-canvas/form-canvas.component.ts`
   (Story 21.1)
2. `apps/web/src/app/features/public/form-renderer/form-renderer.component.html` (Story 21.2)
3. `tests/e2e/theme-application.spec.ts` (Story 21.3 - new file)

### Files NOT Modified (Infrastructure Already Exists)

- `apps/web/src/styles/theme-variables.css` - Already created with all utility classes
- `apps/web/src/app/features/tools/components/form-builder/theme-preview.service.ts` - Already
  injects CSS variables correctly
- `apps/web/src/app/features/tools/components/form-builder/form-builder.service.ts` - Already
  applies themes
- `apps/web/src/app/features/tools/components/form-builder/theme-dropdown/theme-dropdown.component.ts` -
  Already functional
- `apps/api/database/seeds/default-themes.json` - 9 themes already seeded
- Any backend APIs - No changes needed

### Theme Utility Classes Reference

From `apps/web/src/styles/theme-variables.css`:

**Form Elements**:

- `.theme-input` - Text inputs, emails, numbers, dates with theme borders/focus states
- `.theme-select` - Dropdowns with theme borders
- `.theme-textarea` - Textareas with theme borders
- `.theme-checkbox` - Checkboxes with theme accent color
- `.theme-radio` - Radio buttons with theme accent color

**Buttons**:

- `.theme-button-primary` - Primary buttons (theme primary color background)
- `.theme-button-secondary` - Secondary buttons (theme secondary color background)

**Typography**:

- `.theme-heading` - Headings (theme heading font + primary text color)
- `.theme-label` - Form labels (theme body font + primary text color)
- `.theme-text-primary` - Primary text (theme primary text color)
- `.theme-text-secondary` - Secondary text (theme secondary text color)
- `.theme-help-text` - Help text below fields

**States**:

- `.theme-error-text` - Error messages (stays red, not themeable)
- `.theme-input-error` - Input error state (red border, not themeable)

**Utilities**:

- `.theme-transition` - Smooth transitions for color/font changes (300ms ease)

### CSS Variables Injected (Reference)

ThemePreviewService injects these variables into `:root`:

- `--theme-primary-color` (e.g., Scarlet: `#DC143C`)
- `--theme-secondary-color` (e.g., Scarlet: `#333333`)
- `--theme-bg-color` (e.g., Scarlet: `linear-gradient(135deg, #1A1A1A 0%, #000000 100%)`)
- `--theme-text-primary` (e.g., Scarlet: `#FFFFFF`)
- `--theme-text-secondary` (e.g., Scarlet: `#CCCCCC`)
- `--theme-font-heading` (e.g., Scarlet: `'Montserrat', sans-serif`)
- `--theme-font-body` (e.g., Scarlet: `'Raleway', sans-serif`)
- `--theme-field-radius` (e.g., Scarlet: `8px`)
- `--theme-field-spacing` (e.g., Scarlet: `16px`)
- `--theme-container-bg` (e.g., Scarlet: `rgba(220, 20, 60, 0.1)`)
- `--theme-container-opacity` (e.g., Scarlet: `0.95`)

---

## Success Metrics

### User-Facing Success

- ✅ Form builders can select any of 9 themes and see instant visual feedback
- ✅ Published forms display with correct theme styling
- ✅ Scarlet theme provides high-contrast validation (red on black is obvious)

### Technical Success

- ✅ No architectural changes required (uses existing infrastructure)
- ✅ No backend changes required
- ✅ Minimal code changes (2 template files)
- ✅ Low risk (isolated, reversible changes)
- ✅ Fast delivery (3 days vs. 3 weeks for full Tailwind removal)

### Quality Success

- ✅ All E2E tests pass
- ✅ Zero regressions in existing functionality
- ✅ Responsive behavior maintained
- ✅ Theme transitions are smooth and professional

---

## Epic Status

**Status**: Ready for Story Creation **Epic Owner**: Product Manager (John) **Story Manager**: To be
assigned **Estimated Duration**: 3 days **Risk Level**: Low **Dependencies**: Epic 20 (Theme
Infrastructure) - Already Complete ✅

---

## Handoff to Story Manager

**Story Manager**: Please develop detailed user stories for this brownfield epic using the story
outlines above (21.1, 21.2, 21.3).

**Key Considerations**:

- This is an enhancement to an existing system running **Angular 20+ standalone components, PrimeNG,
  Tailwind CSS, TypeScript**
- Integration points:
  - `apps/web/src/app/features/tools/components/form-builder/form-canvas/form-canvas.component.ts`
  - `apps/web/src/app/features/public/form-renderer/form-renderer.component.html`
  - `apps/web/src/styles/theme-variables.css` (existing utility classes)
  - ThemePreviewService (no changes needed)
- Existing patterns to follow:
  - Use `.theme-input`, `.theme-button-primary`, `.theme-label`, `.theme-heading`, `.theme-select`,
    `.theme-textarea`, `.theme-checkbox`, `.theme-radio` classes
  - Retain Tailwind for layout/spacing (flex, grid, padding, margin, responsive utilities)
  - Follow existing component structure (no architectural changes)
- Critical compatibility requirements:
  - Preserve responsive behavior (mobile/tablet/desktop breakpoints)
  - Maintain form validation logic
  - Keep row layout and step form functionality intact
  - No changes to FormBuilderService, ThemePreviewService, or backend APIs
- Each story must include verification that existing functionality remains intact (drag-drop, field
  editing, validation, submission, publish workflow)

**Epic Goal**: Enable visual theme application to form inputs, buttons, and typography while
maintaining system integrity.

---

**Created**: 2025-10-16 **Last Updated**: 2025-10-16
