# Epic 16: Comprehensive Field Properties Configuration System - Brownfield Enhancement PRD

**Version:** 1.0 **Date:** 2025-10-10 **Status:** Draft **Author:** John (PM Agent)

---

## Table of Contents

1. [Intro Project Analysis and Context](#intro-project-analysis-and-context)
2. [Requirements](#requirements)
3. [User Interface Enhancement Goals](#user-interface-enhancement-goals)
4. [Technical Constraints and Integration Requirements](#technical-constraints-and-integration-requirements)
5. [Epic and Story Structure](#epic-and-story-structure)

---

## Intro Project Analysis and Context

### Analysis Source

✓ **Document-project output available** at: `docs/architecture/` and `docs/prd/` ✓ **IDE-based fresh
analysis** completed

- Existing architecture documentation reviewed
- Recent Epic 15 (Content Display Fields) completed
- Current form builder state analyzed

### Current Project State

**Project Purpose:** Full-stack TypeScript monorepo with Angular 20+ frontend and Express.js
backend, featuring a visual form builder with drag-and-drop interface, row-based multi-column
layouts, real-time analytics, data visualization, and WCAG AA accessibility. Forms are shareable via
short links with QR codes.

**Current Form Builder Capabilities:**

- 11 interactive input field types (text, email, number, select, textarea, file, checkbox, radio,
  date, datetime, toggle)
- 5 display/organizational elements (heading, image, text_block, divider, group) - **recently added
  in Epic 15**
- Row-based layout system with 1-4 columns per row and multi-field vertical stacking
- Live field preview rendering with inline editing
- Form analytics with data visualization (bar/line/pie charts)
- Public form rendering with responsive mobile support
- Field properties modal for configuration

### Available Documentation Analysis

**Using existing project analysis from document-project output:**

✓ **Tech Stack Documentation** - Complete (`docs/architecture/tech-stack.md`) ✓ **Source
Tree/Architecture** - Complete (`docs/architecture/source-tree.md`) ✓ **Coding Standards** -
Complete (`docs/architecture/coding-standards.md`) ✓ **API Documentation** - Complete
(`docs/architecture/api-specification.md`) ✓ **Database Schema** - Complete
(`docs/architecture/database-schema.md`) ✓ **UX/UI Guidelines** - Inferred from existing PrimeNG +
Tailwind patterns ✓ **Technical Debt Documentation** - Referenced in architecture docs

### Enhancement Scope Definition

**Enhancement Type:**

- ☑ Major Feature Modification (Field Properties System Enhancement)
- ☐ New Feature Addition
- ☐ UI/UX Overhaul
- ☐ Other

**Enhancement Description:**

Comprehensive enhancement of the field properties configuration system to provide form creators with
granular control over:

1. **Common input field properties** - Standardized configuration UI for label, name, placeholder,
   help text, required flag, default value, validation (min/max/pattern), and custom error messages
2. **Field-specific styling** - Custom CSS capabilities for all field types (heading, text block,
   image, inputs)
3. **Enhanced validation UI** - Improved UX for configuring validation rules with real-time preview
4. **Property inheritance** - Consistent property configuration patterns across all 16 field types

**Impact Assessment:**

- ☐ Minimal Impact (isolated additions)
- ☑ Moderate Impact (some existing code changes)
- ☐ Significant Impact (substantial existing code changes)
- ☐ Major Impact (architectural changes required)

**Rationale:** This enhances the existing Field Properties Modal component and validation system
without requiring architectural changes. It builds on existing `FormField` interface which already
contains most properties.

### Goals and Background Context

**Goals:**

- Provide consistent, intuitive UI for configuring all field properties across 16 field types
- Enable custom CSS styling for all fields (not just display elements)
- Improve validation configuration UX with visual feedback and error message customization
- Ensure property configuration follows Angular/PrimeNG design patterns
- Maintain backward compatibility with existing forms

**Background Context:**

Currently, the field properties modal
(`apps/web/src/app/features/tools/components/form-builder/field-properties/`) provides basic
configuration for fields, but the UX is inconsistent across field types and lacks advanced features
like:

- Real-time validation preview
- Custom CSS input for all field types (currently only available in metadata for
  heading/image/text_block)
- Organized property grouping (basic properties, validation, styling)
- Visual feedback for validation rules

With Epic 15 recently adding 3 new display field types (heading, image, text_block) with their own
metadata structures, there's an opportunity to standardize and enhance the property configuration
experience for ALL field types, making it easier for form creators to build professional, customized
forms.

### Change Log

| Change        | Date       | Version | Description                                                           | Author          |
| ------------- | ---------- | ------- | --------------------------------------------------------------------- | --------------- |
| Initial draft | 2025-10-10 | 1.0     | Created brownfield PRD for comprehensive field properties enhancement | John (PM Agent) |

---

## Requirements

### Functional Requirements

**FR1: Universal Property Configuration Panel** The Field Properties Modal shall provide a unified
configuration interface for common properties across all 16 field types: label, name (fieldName),
placeholder, help text, required flag, and default value. This interface shall adapt to show/hide
properties based on field type relevance (e.g., placeholder not shown for divider fields).

**FR2: Enhanced Validation Configuration** The system shall provide an intuitive validation
configuration UI for input fields, including:

- Min/max length for text inputs (minLength, maxLength)
- Min/max value for numeric inputs (min, max)
- Pattern-based validation with regex input and helper examples
- Custom error messages per validation rule (errorMessage)
- File upload constraints (acceptedFileTypes, maxFileSize for FILE type)
- Real-time validation feedback preview

**FR3: Custom CSS Styling for All Field Types** All field types (input and display) shall support
custom CSS configuration via a validated CSS input field in the properties modal. Custom CSS shall
be:

- Stored in field.metadata.customStyle (standardized across all types)
- Sanitized/validated server-side to prevent malicious CSS injection
- Applied to the field container element in public form rendering
- Previewed in real-time in the form builder canvas

**FR4: Organized Property Grouping** The Field Properties Modal shall organize properties into
logical groups using PrimeNG Accordion or TabView:

- **Basic Properties:** Label, name, placeholder, help text, required, default value
- **Validation:** All validation rules (min/max/pattern/error messages)
- **Styling:** Custom CSS, alignment, colors (field-type specific)
- **Advanced:** Conditional logic, metadata (field-type specific)

**FR5: Field-Type Specific Property Panels** The properties modal shall display type-specific
configuration sections based on the selected field type:

- **HEADING:** Heading level (h1-h6), alignment, color, font weight, custom CSS
- **IMAGE:** Image upload/URL, alt text, width/height, alignment, caption, objectFit, custom CSS
- **TEXT_BLOCK:** Rich text editor, alignment, background color, padding, collapsible, custom CSS
- **SELECT/RADIO/CHECKBOX:** Options management (add/edit/remove/reorder options)
- **FILE:** Accepted file types, max file size
- **GROUP:** Group title, border style, collapsible, background color, custom CSS

**FR6: Property Validation and Error Handling** The properties modal shall validate all user inputs
before saving:

- Required fields (e.g., label, fieldName, alt text for images) show validation errors
- Regex patterns are validated for syntax errors
- Custom CSS is checked for malicious content (client-side warning, server-side enforcement)
- Numeric inputs (min/max/width/height) accept only valid numbers
- Field name uniqueness validation (no duplicate fieldName values in form)

**FR7: Property Persistence and State Management** All field property changes shall be:

- Immediately persisted to NgRx Signal state (FormBuilderService)
- Auto-saved to backend API when user closes properties modal or navigates away
- Loaded from database when form is reopened in builder
- Versioned with form schema (schema_json JSONB column)

**FR8: Real-Time Canvas Preview Updates** The form builder canvas shall reflect property changes in
real-time as user edits in the properties modal:

- Label changes update field preview label immediately
- Custom CSS changes update preview styling (debounced for performance)
- Validation rules show visual indicators (e.g., "Required" badge)
- Field-specific properties update preview (heading level changes h1→h2 preview)

### Non-Functional Requirements

**NFR1: Performance**

- Field Properties Modal shall open in < 200ms (lazy-loaded component)
- Property changes shall update canvas preview within 100ms (debounced for CSS)
- Form save operation shall complete within 1 second for forms with < 50 fields
- Real-time preview updates shall not cause noticeable UI lag

**NFR2: Security**

- Custom CSS input shall be sanitized server-side using strict whitelist validation (prevent CSS
  injection attacks)
- Regex patterns shall be validated to prevent ReDoS (Regular Expression Denial of Service) attacks
- File upload URLs shall be validated to prevent path traversal or malicious URLs
- HTML content in TEXT_BLOCK shall use DOMPurify sanitization (already implemented in Epic 15)

**NFR3: Accessibility (WCAG 2.1 AA Compliance)**

- Field Properties Modal shall be keyboard navigable (Tab, Shift+Tab, Enter, Escape)
- All form inputs shall have associated labels with proper ARIA attributes
- Error messages shall be announced to screen readers (aria-live regions)
- Color contrast ratios shall meet WCAG AA standards (4.5:1 for text)
- Focus indicators shall be clearly visible (PrimeNG default styling)

**NFR4: Usability**

- Property grouping shall reduce cognitive load (max 7 properties per section)
- Field names shall auto-generate from labels (slug format: "First Name" → "first_name")
- Common validation patterns shall be provided as presets (email, phone, URL, etc.)
- Error messages shall provide actionable guidance (not just "Invalid input")
- Properties modal shall remember last opened section per field type (localStorage)

**NFR5: Maintainability**

- Property configuration logic shall be encapsulated in reusable Angular components
- Field-type specific panels shall use strategy pattern (avoid massive if/else chains)
- CSS validation rules shall be centralized and easily updatable
- Property changes shall emit events for logging/analytics integration

**NFR6: Backward Compatibility**

- Existing forms (pre-Epic 16) shall load without errors (graceful handling of missing properties)
- Forms created before custom CSS feature shall continue rendering correctly
- Database migrations shall not be required (JSONB schema is flexible)
- Property additions shall be additive only (no removal of existing properties)

### Compatibility Requirements

**CR1: FormField Interface Compatibility** All property changes shall utilize the existing
`FormField` interface in `packages/shared/src/types/forms.types.ts` without breaking changes. New
properties shall be added to existing metadata interfaces (HeadingMetadata, ImageMetadata,
TextBlockMetadata) or created as new metadata types. The `validation` field shall be enhanced to
support custom error messages.

**CR2: Database Schema Compatibility** All field properties shall be stored in the existing
`form_schemas.schema_json` JSONB column. No database migrations or schema changes are required. The
flexible JSONB structure shall accommodate new property fields without versioning issues.

**CR3: UI Component Consistency** The Field Properties Modal shall follow existing Angular 20+
patterns:

- Standalone component architecture (no NgModules)
- PrimeNG components (p-accordion, p-inputText, p-dropdown, p-colorPicker, p-fileUpload)
- Tailwind CSS utility classes for spacing/layout
- NgRx Signals for reactive state management
- Reactive Forms (FormGroup/FormControl) for property inputs

**CR4: Backend Validation Compatibility** Custom CSS and property validation shall integrate with
existing backend validation:

- Express-validator middleware shall validate custom CSS on form save/publish
- CSS validation rules shall follow same pattern as existing HTML sanitization (Epic 12/15)
- Validation errors shall return consistent error format (400 Bad Request with error details)
- Backend shall reject malicious CSS patterns (e.g., `javascript:`, `expression()`, `@import`)

---

## User Interface Enhancement Goals

### Integration with Existing UI

The Field Properties Modal enhancement shall integrate seamlessly with the existing form builder UI
architecture:

**Design System Alignment:**

- Use PrimeNG 17+ components exclusively (p-accordion, p-inputText, p-dropdown, p-colorPicker,
  p-fileUpload, p-editor)
- Follow Tailwind CSS utility-first styling conventions (spacing: p-4, gap-4, etc.)
- Maintain consistent color palette with existing form builder (primary: blue-600, danger: red-500,
  etc.)
- Use existing PrimeNG theme (configured in angular.json)

**Component Architecture:**

- Field Properties Modal remains a standalone Angular component (`field-properties.component.ts`)
- Property sections (Basic/Validation/Styling/Advanced) implemented as child components for
  reusability
- CSS Validator utility service for client-side CSS validation
- Property configuration strategy pattern for field-type specific panels

**State Management Integration:**

- Properties modal consumes `FormBuilderService` (existing NgRx Signals-based service)
- Property changes emit to `updateField()` method in FormBuilderService
- Canvas preview subscribes to `selectedField()` signal for reactive updates
- Validation errors managed via Angular Reactive Forms (FormGroup/FormControl)

**Interaction Patterns:**

- Modal opens when user clicks "Settings" icon on field in canvas (existing pattern)
- Modal slides in from right side (p-sidebar component) OR center dialog (p-dialog)
- Property changes save on "Save" button click (explicit control)
- "Cancel" button discards unsaved changes and closes modal
- ESC key closes modal with unsaved changes warning (if dirty)

### Modified/New Screens and Views

**1. Enhanced Field Properties Modal (Primary Change)**

**Location:**
`apps/web/src/app/features/tools/components/form-builder/field-properties/field-properties.component.ts`

**Layout Structure:**

```
┌─────────────────────────────────────────────┐
│  Field Properties - [Field Type]       [X] │
├─────────────────────────────────────────────┤
│  ▼ Basic Properties                         │
│    • Label: [____________________]           │
│    • Field Name: [first_name____] (auto)    │
│    • Placeholder: [Enter your name...]      │
│    • Help Text: [_______________]           │
│    • Required: [✓] Default: [____]          │
│                                              │
│  ▼ Validation (Input fields only)           │
│    • Min Length: [__] Max Length: [__]      │
│    • Pattern: [___] (Regex) [Presets ▼]    │
│    • Error Message: [_______________]       │
│                                              │
│  ▼ Styling                                   │
│    • Custom CSS: [Monaco Editor or Textarea]│
│    • (Field-specific: alignment, colors)    │
│                                              │
│  ▼ Advanced (Field-type specific)            │
│    • (Conditional logic, metadata)          │
│                                              │
├─────────────────────────────────────────────┤
│              [Cancel]  [Save Changes]        │
└─────────────────────────────────────────────┘
```

**Components:**

- **PrimeNG Accordion** (`p-accordion`) for collapsible property groups
- **PrimeNG InputText** for text inputs (label, placeholder, help text)
- **PrimeNG InputNumber** for numeric inputs (min, max, width, height)
- **PrimeNG Checkbox** for boolean flags (required, collapsible)
- **PrimeNG Dropdown** for selections (heading level, alignment, padding)
- **PrimeNG ColorPicker** for color inputs (text color, background color)
- **PrimeNG Editor** (Quill-based rich text editor) for TEXT_BLOCK content
- **PrimeNG FileUpload** for IMAGE field image uploads
- **Custom CSS Input** - Monaco Editor component (VS Code editor) OR simple textarea with syntax
  highlighting

**2. Field Canvas Preview Updates (Secondary Change)**

**Location:**
`apps/web/src/app/features/tools/components/form-builder/form-canvas/field-preview-renderer/`

**Changes:**

- Add visual indicators for validation rules (e.g., "Required" badge, "Pattern: Email" chip)
- Render custom CSS styles in preview mode (applied to preview container)
- Show truncated custom CSS in field footer (e.g., "Custom CSS: 3 rules applied")
- Display validation error messages on hover (tooltip)

**3. Field Palette Tooltips (Minor Change)**

**Location:**
`apps/web/src/app/features/tools/components/form-builder/field-palette/field-palette.component.ts`

**Changes:**

- Add tooltips to field type buttons showing available properties
- Example: "Text Input - Supports validation, custom CSS, placeholder"

### UI Consistency Requirements

**1. Visual Consistency**

- Properties modal header uses same blue-600 background as form builder toolbar
- Button styles match existing "Save Form", "Preview" buttons (PrimeNG p-button primary/secondary)
- Input field styling matches existing Angular Material/PrimeNG input styles
- Error messages use same red-500 color as existing validation errors

**2. Interaction Consistency**

- Modal keyboard navigation follows existing patterns (Tab, Shift+Tab, Enter, ESC)
- Auto-save behavior consistent with other modals in application (explicit save, not auto)
- Validation error display matches existing form validation UX (inline errors below inputs)
- Loading states use existing PrimeNG p-progressSpinner component

**3. Responsive Behavior**

- Properties modal adapts to screen size:
  - Desktop (≥ 1024px): Modal width 600px, right-aligned or center
  - Tablet (768px-1023px): Modal width 80vw, center
  - Mobile (< 768px): Modal fullscreen overlay
- Property groups stack vertically on mobile (accordion auto-expands on small screens)
- Custom CSS editor switches to simpler textarea on mobile (Monaco editor too heavy)

**4. Accessibility Consistency**

- All inputs have associated labels (for screen readers)
- Error messages use aria-live="polite" regions
- Modal has aria-labelledby pointing to header
- Focus trap within modal (cannot tab outside modal when open)
- Color picker includes text input alternative (for users who cannot perceive colors)

**5. Animation and Transitions**

- Modal open/close animation: 200ms ease-in-out (matches existing modals)
- Property group expand/collapse: PrimeNG Accordion default animation (150ms)
- Canvas preview updates: No animation (instant for responsiveness)
- Validation error appearance: Fade-in 100ms (subtle, not jarring)

---

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages:**

- TypeScript 5.3+ (frontend and backend unified language)

**Frameworks:**

- Frontend: Angular 20+ with standalone components (no NgModules)
- Backend: Express.js 4.19+ with TypeScript
- UI Components: PrimeNG 17+, Tailwind CSS 3.4+
- State Management: NgRx Signals 17+

**Database:**

- PostgreSQL 15+ with JSONB support for flexible schema storage
- Connection pooling via pg library
- No migrations required (JSONB `schema_json` column is flexible)

**Infrastructure:**

- Local development: PostgreSQL via Homebrew, npm workspaces monorepo
- File Storage: DigitalOcean Spaces (S3-compatible) for image uploads
- Testing: Jest (backend), Karma+Jasmine (frontend), Playwright (E2E)

**External Dependencies:**

- DOMPurify: HTML sanitization (already used in Epic 15 for TEXT_BLOCK)
- Monaco Editor (optional): VS Code-based code editor for CSS input
- Quill (via PrimeNG Editor): Rich text editing for TEXT_BLOCK content

**Version Constraints:**

- Node.js 18+ (specified in package.json engines)
- npm workspaces for monorepo management
- Angular CLI 17+ for build tooling

### Integration Approach

**Database Integration Strategy:**

**No Schema Changes Required:**

- Field properties stored in existing `form_schemas.schema_json` JSONB column
- Custom CSS stored in `field.metadata.customStyle` (new property added to metadata interfaces)
- Validation rules stored in existing `field.validation` object (enhanced with `errorMessage`
  property)
- Backward compatible: Forms without new properties load gracefully (undefined values handled)

**Data Flow:**

1. User edits properties in Field Properties Modal (frontend)
2. Changes saved to NgRx Signals state (FormBuilderService)
3. On "Save" button click, entire form schema POST to `/api/forms/:formId` endpoint
4. Backend validates custom CSS, validation rules, and sanitizes inputs
5. JSONB `schema_json` column updated with new field configurations
6. Frontend receives updated schema and refreshes canvas preview

**API Integration Strategy:**

**No New Endpoints Required:**

- Use existing `PUT /api/forms/:formId` endpoint for form updates
- Use existing `POST /api/forms/:formId/publish` endpoint for publishing
- Use existing `POST /api/forms/upload` endpoint for image uploads (IMAGE field)

**Backend Validation Enhancements:**

- Add CSS validation middleware: `validateCustomCSS(css: string): boolean`
  - Whitelist safe CSS properties (color, background, padding, margin, font-_, text-_, border-\*,
    etc.)
  - Blacklist dangerous patterns: `javascript:`, `expression()`, `@import`, `url()` with non-https
  - Validate CSS syntax using CSS parser (e.g., `postcss` or regex validation)
- Enhance field validation: Validate regex patterns for ReDoS attacks (pattern complexity limits)
- Validate field uniqueness: Ensure `field.fieldName` is unique within form schema

**Frontend Integration Strategy:**

**Component Architecture:**

```
FormBuilderComponent (container)
  ├── FormCanvasComponent (renders field previews)
  │     └── FieldPreviewRendererComponent (updated for custom CSS, validation badges)
  ├── FieldPaletteComponent (field type selection)
  └── FieldPropertiesComponent (ENHANCED - main work area)
        ├── BasicPropertiesSection (label, name, placeholder, help, required, default)
        ├── ValidationPropertiesSection (min/max, pattern, error messages)
        ├── StylingPropertiesSection (custom CSS, alignment, colors)
        └── AdvancedPropertiesSection (conditional logic, field-specific metadata)
```

**State Management:**

- FormBuilderService (existing) manages form schema state using NgRx Signals
- New signals: `isPropertiesModalDirty()`, `validationErrors()`, `cssValidationWarnings()`
- New methods: `updateFieldProperty(fieldId, propertyPath, value)`, `validateCustomCSS(css)`

**Shared Types Package:**

- Extend `FormField` interface metadata types:
  - Add `customStyle?: string` to HeadingMetadata, ImageMetadata, TextBlockMetadata, GroupMetadata
  - Create `BaseFieldMetadata` interface with common `customStyle` property
  - All metadata interfaces extend BaseFieldMetadata for consistency
- Enhance `FormFieldValidation` interface:
  - Add `errorMessage?: string` property (already exists, ensure all types use it)

**Testing Integration Strategy:**

**Unit Tests (Jest):**

- Test CSS validation logic: `validateCustomCSS()` service method
  - Valid CSS passes: `color: red; padding: 10px;`
  - Invalid CSS rejected: `javascript:alert(1)`, `@import url(...)`
- Test field property updates: FormBuilderService state management
- Test validation rule parsing: Regex pattern validation

**Component Tests (Karma + Jasmine):**

- Field Properties Modal opens/closes correctly
- Property changes update component state (reactive forms)
- Validation errors display correctly
- Save/Cancel buttons work as expected

**Integration Tests (Backend - Jest + Supertest):**

- POST `/api/forms/:formId` with custom CSS validates correctly
- Malicious CSS rejected with 400 Bad Request
- Valid CSS saved to database (JSONB schema_json)
- Existing forms without custom CSS load without errors

**E2E Tests (Playwright):**

- Open form builder → select field → open properties modal → edit properties → save → verify canvas
  preview updates
- Add custom CSS → save form → publish form → verify CSS applied in public form rendering
- Add validation rules → submit invalid data → verify custom error messages display

### Code Organization and Standards

**File Structure Approach:**

**New/Modified Files:**

```
apps/web/src/app/features/tools/components/form-builder/
├── field-properties/
│   ├── field-properties.component.ts (MODIFIED - main modal)
│   ├── field-properties.component.html (MODIFIED - template)
│   ├── field-properties.component.scss (MODIFIED - styles)
│   ├── sections/ (NEW - property section components)
│   │   ├── basic-properties-section.component.ts
│   │   ├── validation-properties-section.component.ts
│   │   ├── styling-properties-section.component.ts
│   │   └── advanced-properties-section.component.ts
│   └── validators/ (NEW - custom CSS validators)
│       └── css-validator.service.ts

apps/api/src/
├── validators/
│   └── forms.validator.ts (MODIFIED - add CSS validation)
├── middleware/
│   └── css-sanitizer.middleware.ts (NEW - CSS validation middleware)

packages/shared/src/types/
└── forms.types.ts (MODIFIED - extend metadata interfaces)
```

**Naming Conventions:**

- Components: PascalCase with `.component.ts` suffix (Angular convention)
- Services: PascalCase with `.service.ts` suffix
- Validators: kebab-case with `.validator.ts` suffix
- Signals: camelCase with `()` suffix: `selectedField()`, `cssErrors()`

**Coding Standards:**

- TypeScript strict mode enabled (no implicit any, strict null checks)
- ESLint + Prettier for code formatting
- JSDoc comments for public APIs (services, validators)
- Reactive programming: Use signals for state, observables for async operations
- Component isolation: Each property section is standalone component (reusability)

**Documentation Standards:**

- Inline comments for complex CSS validation logic
- JSDoc for public service methods (CSS validator, property updater)
- README updates: Document new custom CSS feature in form builder docs
- Type documentation: Add JSDoc to new metadata properties (`customStyle`)

### Deployment and Operations

**Build Process Integration:**

**No Build Changes Required:**

- Shared package build: `npm --workspace=packages/shared run build` (existing)
- Frontend build: `npm --workspace=apps/web run build` (existing)
- Backend build: `npm --workspace=apps/api run build` (existing)
- Build order: shared → api/web (parallel)

**Development Workflow:**

- Use existing `npm start` or `./start-dev.sh` for local development
- Hot-reload works for frontend changes (Angular dev server)
- Backend restarts automatically on file changes (nodemon)

**Deployment Strategy:**

**Zero-Downtime Deployment:**

- Frontend: Deploy to existing hosting (DigitalOcean App Platform, Vercel, or similar)
- Backend: Deploy new API version with CSS validation middleware
- Database: No migrations required (JSONB flexible schema)
- Rollback: If issues arise, revert frontend/backend deployments (no data loss risk)

**Feature Flag (Optional):**

- Add `ENABLE_CUSTOM_CSS` environment variable (default: true)
- Allows disabling custom CSS feature if security issues discovered
- Frontend checks flag via `/api/config/features` endpoint (if implemented)

**Monitoring and Logging:**

**Logging:**

- Log CSS validation rejections (Winston logger):
  `logger.warn('CSS validation failed', { css, reason })`
- Log property update errors (frontend): Console errors for debugging
- Track custom CSS usage via analytics events (optional)

**Monitoring:**

- Track CSS validation rejection rate (Sentry custom metric)
- Monitor form save latency (should remain < 1s)
- Alert if CSS rejection rate spikes (potential malicious activity)

**Configuration Management:**

**Environment Variables (Existing):**

- No new environment variables required
- Optional: `MAX_CSS_LENGTH` (default: 5000 characters)
- Optional: `ENABLE_CUSTOM_CSS` (default: true)

**Configuration Files:**

- CSS whitelist configuration: `apps/api/src/config/css-whitelist.ts`
  - Allowed properties: `['color', 'background-color', 'padding', 'margin', ...]`
  - Blocked patterns: `['javascript:', 'expression(', '@import', ...]`
- Easy to update whitelist without code changes (configuration-driven)

### Risk Assessment and Mitigation

**Technical Risks:**

**Risk 1: CSS Injection Attacks**

- **Description:** Malicious users inject harmful CSS (e.g., `javascript:` URLs, `@import` external
  stylesheets)
- **Mitigation:**
  - Server-side CSS validation with strict whitelist (allows only safe properties)
  - Blacklist dangerous patterns (`javascript:`, `expression()`, `@import`, `url()`)
  - Content Security Policy (CSP) headers prevent inline script execution
  - Regular security audits of CSS whitelist
- **Likelihood:** Medium | **Impact:** High | **Priority:** P0 (Must address)

**Risk 2: ReDoS (Regular Expression Denial of Service)**

- **Description:** Complex regex patterns in validation rules cause backend CPU spikes
- **Mitigation:**
  - Validate regex complexity (limit nested quantifiers, backtracking)
  - Use safe regex library (e.g., `safe-regex` npm package) to detect dangerous patterns
  - Enforce timeout on regex execution (100ms max)
  - Warn users when regex pattern is too complex
- **Likelihood:** Low | **Impact:** Medium | **Priority:** P1 (Should address)

**Risk 3: Performance Degradation (Large Forms)**

- **Description:** Forms with 50+ fields with custom CSS slow down canvas rendering
- **Mitigation:**
  - Debounce canvas preview updates (300ms delay for CSS changes)
  - Lazy-load field previews (virtualization for large forms)
  - Limit custom CSS length (5000 characters max)
  - Optimize CSS parsing (use memoization for repeated parsing)
- **Likelihood:** Low | **Impact:** Low | **Priority:** P2 (Monitor)

**Integration Risks:**

**Risk 4: Backward Compatibility Issues**

- **Description:** Existing forms fail to load after updating shared types package
- **Mitigation:**
  - All new properties are optional (TypeScript `?` suffix)
  - Graceful fallbacks: `field.metadata?.customStyle ?? ''`
  - Test with existing forms from database (QA regression testing)
  - Version checking: Backend detects old schema versions, applies compatibility layer
- **Likelihood:** Low | **Impact:** Medium | **Priority:** P1 (Test thoroughly)

**Risk 5: Type Definition Mismatch (Frontend/Backend)**

- **Description:** Shared types package not rebuilt, causing frontend/backend type mismatch
- **Mitigation:**
  - Add build step validation: `npm run build:shared` before api/web builds
  - Pre-commit hook: Rebuild shared package if types changed
  - CI/CD pipeline: Ensure shared package always built first
  - Type versioning: Add version field to FormField interface (future-proofing)
- **Likelihood:** Low | **Impact:** Low | **Priority:** P2 (Process improvement)

**Deployment Risks:**

**Risk 6: Database JSONB Column Size Limits**

- **Description:** Custom CSS bloats JSONB column, exceeds PostgreSQL limits (1GB per row)
- **Mitigation:**
  - Enforce CSS length limit (5000 characters, ~5KB)
  - Monitor JSONB column size (Sentry metric)
  - Alert if form schema exceeds 100KB (early warning)
  - Document limit in UI ("Max 5000 characters")
- **Likelihood:** Very Low | **Impact:** Low | **Priority:** P3 (Monitor)

**Mitigation Strategies Summary:**

1. **Security First:** CSS validation is server-side mandatory, client-side optional warning
2. **Performance Testing:** Load test with 50-field forms containing custom CSS
3. **Backward Compatibility:** Test with 10 existing forms from production database
4. **Monitoring:** Track CSS rejection rate, form save latency, JSONB size
5. **Rollback Plan:** Feature flag (`ENABLE_CUSTOM_CSS=false`) disables feature instantly

---

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision:** **Single comprehensive epic** with 7 logically sequenced stories.

**Rationale:**

This enhancement should be structured as a **single epic** because:

1. **Cohesive Scope:** All work centers on enhancing the Field Properties Modal component and its
   related integration points
2. **Shared Components:** Stories share the same UI components (modal, property sections,
   validators)
3. **Sequential Dependencies:** Stories build incrementally (Basic → Validation → Styling →
   Advanced), each depending on previous foundations
4. **Single Integration Point:** All changes integrate through the same FormBuilderService state
   management
5. **Unified Testing:** Property enhancements can be tested together (one comprehensive regression
   test suite)
6. **Brownfield Pattern:** Following Epic 15 pattern (3 related stories in single epic)

---

## Epic 16: Comprehensive Field Properties Configuration System

**Epic Goal:**

Provide form creators with a professional, intuitive field properties configuration experience by
enhancing the Field Properties Modal with organized property grouping
(Basic/Validation/Styling/Advanced), universal custom CSS support for all field types, enhanced
validation configuration with custom error messages, real-time canvas preview updates, and
comprehensive field-type specific property panels—all while maintaining backward compatibility with
existing forms.

**Integration Requirements:**

- **Zero Breaking Changes:** All existing forms (11 input types, 5 display types) continue working
  without modification
- **Shared Types Extension:** Extend `packages/shared/src/types/forms.types.ts` metadata interfaces
  with `customStyle` property
- **Component Enhancement:** Enhance existing `FieldPropertiesComponent` (not rewrite) with new
  property sections
- **State Management:** Integrate with existing FormBuilderService NgRx Signals architecture
- **Backend Validation:** Add CSS validation middleware following Epic 12/15 sanitization pattern
- **Database Compatibility:** Use existing JSONB `schema_json` column (no migrations)

---

### Story 16.1: Organize Field Properties Modal with Accordion-Based Property Groups

**As a** form creator, **I want** the Field Properties Modal to organize properties into logical
collapsible groups (Basic, Validation, Styling, Advanced), **so that** I can easily find and
configure relevant properties without feeling overwhelmed by a long list of options.

**Implementation Details:**

- Refactor `field-properties.component.html` to use PrimeNG Accordion (`p-accordion`)
- Create 4 property sections: Basic, Validation, Styling, Advanced
- Move existing property inputs into appropriate sections
- Add section expand/collapse state persistence (localStorage per field type)
- Implement responsive behavior (auto-expand all sections on mobile)

**Acceptance Criteria:**

1. Field Properties Modal displays 4 collapsible accordion sections: Basic Properties, Validation,
   Styling, Advanced
2. Basic Properties section contains: Label, Field Name, Placeholder, Help Text, Required, Default
   Value
3. Validation section shows only for input field types (hidden for HEADING, IMAGE, TEXT_BLOCK,
   DIVIDER, GROUP)
4. Styling section shows for all field types
5. Advanced section shows field-type specific metadata configurations
6. Sections remember expanded/collapsed state per field type (localStorage)
7. On mobile (< 768px), all sections expand by default (no collapsing)
8. Existing field property saving/loading functionality remains unchanged
9. No regression in existing form builder features (palette, canvas, form saving)

**Integration Verification:**

- **IV1:** Open existing forms (created before Epic 16) → select fields → open properties modal →
  verify all existing properties load correctly in new accordion layout
- **IV2:** Edit field properties in new accordion layout → save form → reload form → verify
  properties persisted correctly
- **IV3:** Test all 16 field types → verify appropriate sections show/hide based on field type
  (e.g., Validation hidden for DIVIDER)

---

### Story 16.2: Implement Universal Custom CSS Support for All Field Types

**As a** form creator, **I want** to add custom CSS styling to any field type (input or display),
**so that** I can customize the visual appearance of my forms to match my branding and design
requirements.

**Implementation Details:**

- Add "Custom CSS" textarea to Styling section (all field types)
- Create `CssValidatorService` for client-side CSS validation (warnings only)
- Add CSS validation middleware (`css-sanitizer.middleware.ts`) on backend
- Extend metadata interfaces (HeadingMetadata, ImageMetadata, etc.) with `customStyle?: string`
- Update `FieldPreviewRendererComponent` to apply custom CSS in canvas preview
- Update `FormRendererComponent` (public forms) to apply custom CSS with sanitization

**Acceptance Criteria:**

1. Styling section includes "Custom CSS" textarea input (Monaco Editor on desktop, textarea on
   mobile)
2. Custom CSS input validates on blur, showing warnings for potentially unsafe patterns
   (client-side)
3. Custom CSS stored in `field.metadata.customStyle` property (extends all metadata interfaces)
4. Backend CSS validation middleware rejects malicious CSS (javascript:, @import, expression())
5. Whitelisted CSS properties: color, background-_, padding, margin, font-_, text-_, border-_,
   width, height, display, flex-_, grid-_
6. Custom CSS applies to field preview in form builder canvas (real-time update with 300ms debounce)
7. Custom CSS applies to fields in published public forms (sanitized server-side)
8. CSS length limited to 5000 characters (enforced client and server-side)
9. Existing forms without custom CSS continue rendering correctly (graceful fallback)
10. Error handling: Invalid CSS returns 400 Bad Request with specific error message

**Integration Verification:**

- **IV1:** Add custom CSS to TEXT field → save form → reload builder → verify CSS persists and
  displays in canvas
- **IV2:** Add malicious CSS (`javascript:alert(1)`) → save form → verify backend rejects with 400
  error
- **IV3:** Publish form with custom CSS → render public form → verify CSS applied and sanitized (no
  XSS)

---

### Story 16.3: Enhance Validation Configuration UI with Custom Error Messages

**As a** form creator, **I want** to configure validation rules (min/max, pattern) with custom error
messages, **so that** form respondents see helpful, context-specific guidance when they enter
invalid data.

**Implementation Details:**

- Enhance Validation section with organized validation rule inputs
- Add Min/Max Length inputs (for TEXT, EMAIL, TEXTAREA)
- Add Min/Max Value inputs (for NUMBER)
- Add Pattern regex input with validation pattern presets dropdown (Email, Phone, URL, Custom)
- Add Error Message textarea for each validation rule
- Update `FormFieldValidation` interface with `errorMessage` property (already exists, ensure usage)
- Update `FormRendererComponent` to display custom error messages on validation failure

**Acceptance Criteria:**

1. Validation section includes organized inputs: Min Length, Max Length, Min Value, Max Value,
   Pattern, Error Message
2. Validation inputs show/hide based on field type (length for text, value for number)
3. Pattern input includes preset dropdown: Email Pattern, Phone Pattern (US), URL Pattern, Custom
   Regex
4. Selecting preset auto-fills pattern input with regex (e.g., Email → `^[^\s@]+@[^\s@]+\.[^\s@]+$`)
5. Error Message textarea allows custom validation error (max 200 characters)
6. Validation rules persist to `field.validation` object (minLength, maxLength, min, max, pattern,
   errorMessage)
7. Canvas preview shows validation indicators (e.g., "Required" badge, "Pattern: Email" chip)
8. Published forms display custom error messages when validation fails (instead of generic "Invalid
   input")
9. Backend validates regex patterns for ReDoS attacks (reject overly complex patterns)
10. Existing forms with validation rules continue working (backward compatible)

**Integration Verification:**

- **IV1:** Configure TEXT field with minLength=3, custom error "Name must be at least 3 characters"
  → publish form → submit invalid data → verify custom error displays
- **IV2:** Configure NUMBER field with min=0, max=100 → publish form → submit 150 → verify
  validation error
- **IV3:** Configure EMAIL field with Email preset pattern → publish form → submit invalid email →
  verify validation fails

---

### Story 16.4: Implement Field-Type Specific Property Panels

**As a** form creator, **I want** field-type specific configuration options in the Advanced section
(e.g., heading level for HEADING, image upload for IMAGE), **so that** I can configure all unique
properties for each field type in one place.

**Implementation Details:**

- Create property section components for field-type specific configurations:
  - `HeadingPropertiesSection` (heading level, alignment, color, font weight)
  - `ImagePropertiesSection` (image upload, alt text, width/height, caption, objectFit)
  - `TextBlockPropertiesSection` (rich text editor, alignment, background, padding, collapsible)
  - `SelectRadioCheckboxPropertiesSection` (options management: add/edit/remove/reorder)
  - `FilePropertiesSection` (accepted file types, max file size)
  - `GroupPropertiesSection` (group title, border style, collapsible, background color)
- Use Angular `@switch` or `*ngComponentOutlet` to dynamically load section based on field type
- Integrate PrimeNG Editor (Quill) for TEXT_BLOCK rich text editing
- Integrate PrimeNG FileUpload for IMAGE field image uploads

**Acceptance Criteria:**

1. Advanced section dynamically shows field-type specific configuration panel
2. HEADING fields show: Heading Level dropdown (H1-H6), Alignment dropdown (left/center/right),
   Color picker, Font Weight toggle (normal/bold)
3. IMAGE fields show: Image upload button, Alt Text input (required), Width/Height inputs, Alignment
   dropdown, Caption input, Object Fit dropdown
4. TEXT_BLOCK fields show: Rich text editor (PrimeNG Editor with toolbar), Alignment dropdown,
   Background Color picker, Padding dropdown (none/small/medium/large), Collapsible toggle
5. SELECT/RADIO/CHECKBOX fields show: Options list with add/edit/remove/reorder buttons
6. FILE fields show: Accepted File Types multi-select, Max File Size input
7. GROUP fields show: Group Title input, Border Style dropdown, Collapsible toggle, Background Color
   picker
8. Field-specific properties persist to `field.metadata` object (HeadingMetadata, ImageMetadata,
   etc.)
9. Canvas preview reflects field-specific property changes (e.g., H1 → H2 updates preview)
10. Published forms render field-specific properties correctly

**Integration Verification:**

- **IV1:** Configure HEADING field with level=H2, alignment=center, color=blue → verify canvas
  preview and published form render correctly
- **IV2:** Upload image to IMAGE field → verify image persists to DO Spaces → verify image displays
  in canvas and published form
- **IV3:** Configure TEXT_BLOCK with rich text formatting (bold, lists) → publish form → verify HTML
  renders with sanitization

---

### Story 16.5: Add Real-Time Canvas Preview Updates for Property Changes

**As a** form creator, **I want** the form canvas to update in real-time as I change field
properties, **so that** I can immediately see the visual impact of my configuration changes without
saving and reloading.

**Implementation Details:**

- Enhance FormBuilderService with reactive signals for property changes
- Add debouncing to CSS preview updates (300ms delay to prevent lag)
- Update `FieldPreviewRendererComponent` to subscribe to `selectedField()` signal
- Implement instant preview for simple properties (label, placeholder, required)
- Add visual indicators for validation rules (badges, chips)
- Display truncated custom CSS in field footer ("Custom CSS: 3 rules applied")

**Acceptance Criteria:**

1. Label changes in properties modal instantly update canvas preview label
2. Placeholder changes instantly update canvas preview placeholder text
3. Required toggle instantly adds/removes "Required" badge on canvas preview
4. Custom CSS changes update canvas preview with 300ms debounce (prevents lag on every keystroke)
5. Validation rules show visual indicators: "Required" badge, "Pattern: Email" chip, "Min: 3" chip
6. Field-specific property changes update preview: Heading level H1→H2, Image alignment left→center
7. Custom CSS display in field footer: "Custom CSS: 3 rules applied" (truncated summary)
8. Canvas preview updates do not cause noticeable UI lag (< 100ms perceived delay)
9. Preview updates do not trigger form "dirty" state (no unsaved changes warning unless Save
   clicked)
10. Existing canvas rendering performance unchanged (no regression)

**Integration Verification:**

- **IV1:** Open properties modal → change label → verify canvas updates instantly without saving
- **IV2:** Add custom CSS (20 lines) → verify canvas preview updates after 300ms debounce (not
  laggy)
- **IV3:** Change heading level H1→H6 → verify canvas preview heading size updates immediately

---

### Story 16.6: Implement Property Validation and Error Handling

**As a** form creator, **I want** clear validation errors when I configure invalid field properties,
**so that** I can correct mistakes before saving and avoid publishing broken forms.

**Implementation Details:**

- Add Angular Reactive Forms validation to all property inputs
- Implement field name uniqueness validator (no duplicate `fieldName` in form)
- Add regex pattern syntax validator (validate regex before saving)
- Add required field validation (label, alt text for images, field name)
- Display inline validation errors below inputs (PrimeNG form error styling)
- Disable "Save" button when form has validation errors
- Add CSS syntax validator (client-side warnings for potentially unsafe CSS)

**Acceptance Criteria:**

1. Label input shows error if empty: "Label is required"
2. Field Name input shows error if duplicate: "Field name must be unique"
3. Field Name auto-generates from label (slug format: "First Name" → "first_name") with manual
   override
4. Alt Text input (IMAGE fields) shows error if empty: "Alt text is required for accessibility"
5. Pattern input validates regex syntax, shows error if invalid: "Invalid regex pattern"
6. Min/Max inputs validate numeric ranges: Min < Max, shows error if Min > Max
7. Custom CSS input shows warnings for potentially unsafe patterns (not errors, just warnings)
8. "Save" button disabled when validation errors exist (enabled when form valid)
9. Validation errors display inline below inputs (red text, PrimeNG error styling)
10. Validation errors announced to screen readers (aria-live="polite" regions)

**Integration Verification:**

- **IV1:** Leave label empty → click Save → verify "Label is required" error displays and Save
  disabled
- **IV2:** Create two fields with same fieldName → verify "Field name must be unique" error
- **IV3:** Enter invalid regex pattern `[a-z` → verify "Invalid regex pattern" error displays

---

### Story 16.7: Add Auto-Save and Keyboard Shortcuts for Property Modal

**As a** form creator, **I want** keyboard shortcuts (Ctrl+S to save) and auto-save when I close the
modal, **so that** I can work efficiently without worrying about losing my property changes.

**Implementation Details:**

- Add keyboard shortcut handling: Ctrl+S (Cmd+S on Mac) saves and closes modal
- Add ESC key handling: Close modal with unsaved changes warning (if dirty)
- Implement "Save" and "Cancel" buttons in modal footer
- Add dirty state tracking (form touched and values changed)
- Add confirmation dialog when closing modal with unsaved changes
- Implement auto-save on modal close (if valid, no errors)

**Acceptance Criteria:**

1. Pressing Ctrl+S (Cmd+S on Mac) saves property changes and closes modal
2. Pressing ESC key attempts to close modal
3. If modal has unsaved changes, ESC shows confirmation dialog: "Discard unsaved changes?"
4. "Save Changes" button saves properties and closes modal (disabled if validation errors)
5. "Cancel" button closes modal without saving (shows confirmation if dirty)
6. Modal tracks dirty state (changes made since opening)
7. Closing modal with unsaved changes shows confirmation dialog (unless auto-save enabled)
8. Auto-save triggers when user closes modal without clicking Cancel (saves valid changes)
9. Keyboard shortcuts work across all property sections (not blocked by input focus)
10. Accessibility: Keyboard shortcuts announced to screen readers (instructions in modal header)

**Integration Verification:**

- **IV1:** Edit label → press Ctrl+S → verify modal closes and changes saved
- **IV2:** Edit label → press ESC → verify "Discard changes?" confirmation displays
- **IV3:** Edit properties → close modal without Save → verify auto-save persists changes

---

## Definition of Done

- [ ] All 7 stories completed with acceptance criteria met
- [ ] Existing form builder functionality verified through regression testing:
  - Field palette continues working (drag-drop field types)
  - Form canvas rendering unchanged (row layouts, multi-field columns)
  - Form saving/loading works correctly
  - Form publishing workflow unchanged
  - Public form rendering unchanged for forms without new properties
- [ ] Integration points working correctly:
  - Field Properties Modal opens/closes correctly
  - Property changes persist to FormBuilderService state
  - Backend validates custom CSS and validation rules
  - Database saves/loads field configurations from JSONB schema_json
- [ ] Documentation updated:
  - FormField metadata interfaces documented (customStyle property)
  - CSS validation whitelist/blacklist documented
  - Field properties modal usage documented in user guide
  - Security considerations documented (CSS sanitization, ReDoS prevention)
- [ ] No regression in existing features:
  - All 16 field types work as before
  - Row-based layout system unaffected
  - Form analytics and data visualization unchanged
  - Short links and QR codes continue working
- [ ] Security validated:
  - CSS validation prevents injection attacks (javascript:, @import, expression())
  - Regex patterns validated for ReDoS (complexity limits)
  - HTML sanitization unchanged (DOMPurify for TEXT_BLOCK)
  - No XSS vulnerabilities introduced
- [ ] Accessibility validated:
  - Field Properties Modal keyboard navigable (Tab, Shift+Tab, ESC, Ctrl+S)
  - All inputs have proper labels and ARIA attributes
  - Error messages announced to screen readers
  - Color contrast meets WCAG 2.1 AA standards
  - Focus indicators clearly visible
- [ ] Performance validated:
  - Properties modal opens in < 200ms
  - Canvas preview updates within 100ms (debounced for CSS)
  - Form save completes within 1 second (< 50 fields)
  - No noticeable UI lag with real-time preview updates
- [ ] Backward compatibility validated:
  - 10+ existing forms (created before Epic 16) load without errors
  - Forms without custom CSS render correctly
  - Forms without new validation rules work as before
  - Database JSONB schema gracefully handles missing properties

---

## Handoff to Story Manager

**Story Manager Handoff:**

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing Angular 20+ / Express.js form builder system
- Integration points: Field Properties Modal component, FormBuilderService state management, backend
  CSS validation middleware
- Existing patterns to follow: PrimeNG component usage, NgRx Signals state management, JSONB
  flexible schema storage
- Critical compatibility requirements:
  - Zero breaking changes to FormField interface (additive only)
  - No database migrations (use existing JSONB schema_json column)
  - Custom CSS must be validated server-side (security critical)
  - All new properties must be optional (backward compatibility)
- Each story must include verification that existing functionality remains intact (Integration
  Verification steps)

The epic should maintain system integrity while delivering a professional, intuitive field
properties configuration experience across all 16 field types."

---

**Next Steps:**

1. Review and approve PRD
2. Shard PRD into individual story files (if desired)
3. Hand off to Story Manager or Development team for implementation
4. Create QA test plan based on acceptance criteria and integration verification steps
