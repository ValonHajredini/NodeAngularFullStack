# Epic 20: Form Builder Styling Theme System

**Epic Type:** New Feature Addition (Brownfield Enhancement) **Status:** Draft **Created:**
2025-10-15 **Impact Level:** Moderate (some existing code changes)

---

## Executive Summary

Add a visual theme selection system to the form builder that allows users to apply pre-designed
styling themes (colors, fonts, spacing, backgrounds) to their forms. Users can select from a curated
library of themes displayed in a dropdown panel from the toolbar, providing instant visual
transformations similar to Typeform or Google Forms theme systems.

---

## Table of Contents

1. [Project Context](#project-context)
2. [Enhancement Scope](#enhancement-scope)
3. [Requirements](#requirements)
4. [User Interface Enhancement Goals](#user-interface-enhancement-goals)
5. [Technical Constraints](#technical-constraints)
6. [Epic Structure](#epic-structure)
7. [Stories](#stories)

---

## Project Context

### Analysis Source

✅ **IDE-based fresh analysis** of loaded project files:

- Form builder component (apps/web/src/app/features/tools/components/form-builder/)
- Form settings component with existing background system
- Shared types (packages/shared/src/types/forms.types.ts)
- Existing PRD shards in docs/prd/

### Current Project State

**NodeAngularFullStack Form Builder** is a mature visual form creation tool with:

- **Drag-and-drop builder** with field palette, canvas, and properties panel
- **Row-based multi-column layouts** with 1-4 columns per row
- **Step form wizard** support for multi-page forms
- **Analytics dashboard** with bar/line/pie charts
- **Background customization** (image upload, custom HTML/CSS)
- **Public form rendering** with short links and QR codes
- **PostgreSQL backend** with Express.js API and Angular 20 frontend

### Available Documentation

✅ **Comprehensive documentation exists:**

- ✅ Tech Stack Documentation (Angular 20, Express.js, PostgreSQL, PrimeNG, Tailwind)
- ✅ Source Tree/Architecture (apps/api, apps/web, packages/shared)
- ✅ Coding Standards (TypeScript strict mode, standalone components)
- ✅ API Documentation (forms.controller.ts, forms-api.service.ts)
- ✅ PRD structure (20+ epic documents in docs/prd/)

---

## Enhancement Scope

### Enhancement Type

**✅ New Feature Addition** - Adding pre-defined styling theme system

### Enhancement Description

Add a **visual theme selection system** to the form builder that allows users to apply pre-designed
styling themes (colors, fonts, spacing, backgrounds) to their forms. Users can select from a curated
library of themes (e.g., "Neon", "Desert", "Wall Flower") displayed in the toolbar dropdown panel.
Themes instantly update the form preview with coordinated color schemes, typography, and visual
styling.

### Impact Assessment

✅ **Moderate Impact** (some existing code changes):

- New UI component for theme palette (dropdown panel from toolbar)
- Extend `FormSettings` interface to include theme configuration
- Update form renderer to apply theme styles
- Backend API endpoints for theme CRUD operations
- Database schema for storing themes (new `form_themes` table)
- Existing background customization remains but works alongside themes

### Goals

- ✅ **Empower non-technical users** to create professionally styled forms without CSS knowledge
- ✅ **Accelerate form creation** by providing instant visual transformations via theme selection
- ✅ **Maintain brand consistency** across multiple forms using shared theme libraries
- ✅ **Preserve customization flexibility** by allowing themes to coexist with custom backgrounds
- ✅ **Enhance user experience** with real-time theme preview in form builder

### Background Context

The form builder currently offers **low-level background customization** (image upload, custom
HTML/CSS), which requires technical expertise. Users have requested **high-level theme presets**
similar to website builders (Wix, Squarespace) or form tools (Typeform, Google Forms themes).

User research shows a **theme palette sidebar** with visual thumbnails (Wall Flower, Neon, Angular,
Desert themes) that instantly transform form appearance. This enhancement bridges the gap between
"blank canvas" and "fully customized", enabling rapid styling for business users while maintaining
advanced options for power users.

---

## Requirements

### Functional Requirements

**FR1:** The form builder toolbar SHALL display a "Styling Themes" button that opens a **large
dropdown panel** (PrimeNG OverlayPanel) containing a grid of theme options

**FR2:** The theme selection dropdown SHALL display themes in a **responsive grid layout** (3-4
columns on desktop, 2 on tablet) with each theme shown as:

- **Screenshot thumbnail** (pre-captured image of a sample form with that theme applied)
- Theme name label
- Usage count indicator (optional)

**FR2.1:** Theme thumbnails SHALL be **static images** (PNG/WebP format, ~300x200px) uploaded as
part of theme definition, NOT live-rendered previews

**FR3:** Users SHALL be able to apply a pre-defined theme to their form with a single click on the
theme thumbnail, updating the form canvas preview in real-time without requiring a save operation

**FR4:** Each theme SHALL define the following styling properties **per breakpoint** (desktop
≥768px, mobile <768px):

- Primary color (buttons, accents)
- Secondary color (borders, secondary elements)
- Background color/image
- Text color (primary and secondary)
- Font family (heading and body)
- Field border radius
- Field spacing/padding
- Container background color/opacity
- Form container positioning (center, top, left, full-width)

**FR4.1:** When a single color/property is defined without breakpoint distinction, it SHALL apply to
both mobile and desktop views

**FR5:** Applied themes SHALL persist in the form schema's `settings.themeId` property (extending
`FormSettings` interface) and be rendered consistently in both builder preview and public form views
with responsive breakpoint support

**FR6:** The system SHALL provide at least **6-8 pre-defined themes** out-of-the-box (including
themes inspired by: Wall Flower, Neon, Desert, Cyber Dawn, Night Blue, Green Ocean, Angular,
Default)

**FR7:** Users SHALL be able to switch between themes without losing form field data, row layout
configuration, or step form structure

**FR8:** Themes in the dropdown grid SHALL be **sorted by usage frequency** (most frequently applied
→ least frequently applied) based on aggregate usage statistics across all users

**FR8.1:** A backend analytics endpoint SHALL track theme application events and calculate usage
rankings updated daily

**FR9:** Themes SHALL coexist with existing background customization features (image upload, custom
HTML/CSS) with clear precedence rules: **theme provides base styles, custom backgrounds override
theme backgrounds**

**FR10:** _(Future epic)_ Admin users SHALL have the ability to create, edit, and delete custom
themes through a dedicated theme management interface

### Non-Functional Requirements

**NFR1:** Theme application SHALL complete within 500ms to provide real-time preview experience
without perceived lag

**NFR2:** Theme data SHALL be stored in a new `form_themes` database table with JSONB columns for:

- `theme_config` (responsive theme properties)
- `thumbnail_url` (S3/DigitalOcean Spaces URL for screenshot)
- `usage_count` (aggregate application count)

**NFR3:** The theme dropdown panel SHALL be **responsive**:

- Desktop (≥1280px): 4-column grid, ~1000px panel width
- Tablet (768-1279px): 3-column grid, ~720px panel width
- Mobile (<768px): 2-column grid, ~480px panel width

**NFR3.1:** Theme thumbnail images SHALL be **lazy-loaded** when dropdown opens (not on initial page
load)

**NFR4:** Theme CSS SHALL be generated dynamically using **CSS custom properties** with media query
breakpoints:

```css
:root {
  --theme-primary-color: #hex; /* desktop default */
}
@media (max-width: 767px) {
  :root {
    --theme-primary-color: #hex; /* mobile override */
  }
}
```

**NFR5:** The system SHALL maintain backward compatibility with existing forms that have no theme
applied, defaulting to current styling behavior (theme: undefined or 'none')

**NFR6:** Theme definitions SHALL be validated against a JSON schema including responsive breakpoint
structure to prevent malformed configurations

**NFR7:** Theme thumbnail image storage SHALL use existing DigitalOcean Spaces integration
(apps/api/src/services/forms.service.ts upload pattern)

**NFR8:** Theme-related code SHALL follow existing project patterns: standalone Angular components,
TypeScript strict mode, PrimeNG UI components, Tailwind utility classes

### Compatibility Requirements

**CR1:** Existing forms created before theme system implementation MUST render identically (no
visual regressions) with theme property undefined or set to 'none'

**CR2:** Forms with custom background settings (backgroundType: 'image' or 'custom') MUST continue
to work, with theme acting as a base layer that custom backgrounds override

**CR3:** All existing API endpoints (`/api/forms`, `/api/forms/:id`, `/api/public/forms/:shortCode`)
MUST accept the new theme property in schema.settings without breaking backward compatibility

**CR4:** The form builder's drag-and-drop functionality, row layout system, and step form wizard
MUST remain fully functional when themes are applied

**CR5:** Published forms with render tokens MUST apply themes correctly in public view, matching the
builder preview pixel-for-pixel

**CR6:** Form analytics and submission data collection MUST remain unaffected by theme application
(themes are purely presentational)

---

## User Interface Enhancement Goals

### Integration with Existing UI

The theme system will integrate seamlessly with current form builder UI patterns:

**Existing Component Hierarchy:**

```
FormBuilderComponent (toolbar + 3-panel layout)
├─ Toolbar (top)
│  ├─ "Styling Themes" button + dropdown (NEW)
│  ├─ Settings button (unchanged)
│  ├─ Preview button (unchanged)
│  └─ Publish/Save buttons (unchanged)
├─ Left Sidebar: FieldPaletteComponent (unchanged)
├─ Center Canvas: FormCanvasComponent (theme styles applied here)
└─ Right Sidebar: RowLayoutSidebar + StepFormSidebar (unchanged)
```

**New Components:**

- `ThemeDropdownComponent` - PrimeNG OverlayPanel with theme grid
- `ThemeCardComponent` - Individual theme thumbnail + metadata
- `ThemePreviewService` - Service for applying theme CSS variables

### Modified/New Screens

**Modified Screen: Form Builder Toolbar**

Replace "My Forms" button with:

```html
<button
  pButton
  label="Styling Themes"
  icon="pi pi-palette"
  severity="secondary"
  size="small"
  (click)="toggleThemeDropdown($event)"
></button>
```

**"My Forms" Functionality** - Moved to breadcrumb navigation (click "Form Builder" breadcrumb opens
dialog)

**New Screen: Theme Dropdown Panel**

Layout:

```
┌─────────────────────────────────────────────────────┐
│ Styling Themes                      [Search] [X]    │
├─────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│ │ [Image] │ │ [Image] │ │ [Image] │ │ [Image] │   │
│ │ Neon    │ │ Desert  │ │Cyber Dawn│ │Wall Flower│  │
│ │ ⭐ 1,234│ │ ⭐ 892  │ │ ⭐ 654  │ │ ⭐ 432  │   │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│ │ [Image] │ │ [Image] │ │ [Image] │ │ [Image] │   │
│ │ Night   │ │ Green   │ │ Default │ │ Angular │   │
│ │ Blue    │ │ Ocean   │ │         │ │         │   │
│ │ ⭐ 321  │ │ ⭐ 198  │ │ ⭐ 87   │ │ ⭐ 12   │   │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────────────────┘
```

**Features:**

- 4-column grid (responsive to 3/2 columns on smaller screens)
- Thumbnail images (~240x160px with border-radius)
- Theme name below thumbnail
- Usage count indicator (⭐ icon + number)
- Active theme highlighted with blue border
- Hover effect: subtle scale-up + shadow

### UI Consistency Requirements

**UC1:** Theme dropdown SHALL use **PrimeNG OverlayPanel** component to match existing dialog
patterns

**UC2:** Theme cards SHALL use **Tailwind CSS** utility classes for layout consistent with
FieldPaletteComponent

**UC3:** Theme selection interaction SHALL provide **visual feedback**:

- Hover: Scale thumbnail to 102%, add drop-shadow
- Active theme: Blue border (`border-blue-500`)
- Click animation: Brief pulse effect

**UC4:** Theme thumbnails SHALL display **loading skeletons** (PrimeNG Skeleton) while images
lazy-load

**UC5:** Theme dropdown SHALL be **keyboard navigable**:

- Arrow keys: Navigate theme grid
- Enter: Apply selected theme
- Escape: Close dropdown

**UC6:** Theme application SHALL show a **toast notification**:

```typescript
this.messageService.add({
  severity: 'success',
  summary: 'Theme Applied',
  detail: `"${themeName}" theme applied to form`,
  life: 2000,
});
```

---

## Technical Constraints

### Existing Technology Stack

**Frontend:**

- Angular 20+ with standalone components
- TypeScript 5.x (strict mode)
- PrimeNG 17+ UI components
- Tailwind CSS 3.x
- RxJS and NgRx Signals
- Angular CDK for drag-drop

**Backend:**

- Node.js 18+ with Express.js 4.x
- TypeScript for API development
- PostgreSQL 14+ with node-postgres
- DigitalOcean Spaces for cloud storage
- JWT authentication with Passport.js

### Integration Approach

#### Database Integration

**New Table: `form_themes`**

```sql
CREATE TABLE form_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(500) NOT NULL,
  theme_config JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_form_themes_usage ON form_themes(usage_count DESC);
CREATE INDEX idx_form_themes_active ON form_themes(is_active) WHERE is_active = true;
```

**Schema Migration for `form_schemas`:**

```sql
ALTER TABLE form_schemas
ADD COLUMN theme_id UUID REFERENCES form_themes(id) ON DELETE SET NULL;

CREATE INDEX idx_form_schemas_theme ON form_schemas(theme_id);
```

#### API Integration

**New Endpoints:**

```typescript
GET    /api/themes              // List active themes (sorted by usage)
GET    /api/themes/:id          // Get single theme
POST   /api/themes              // Create theme (admin only)
PUT    /api/themes/:id          // Update theme (admin only)
DELETE /api/themes/:id          // Soft-delete theme (admin only)
POST   /api/themes/:id/apply    // Track theme application
```

**Modified Endpoints:**

```typescript
PATCH /api/forms/:id            // Accept theme_id in body
POST  /api/forms                // Accept theme_id in body
GET   /api/forms/:id            // Include theme object in response
```

#### Frontend Integration

**State Management Extension:**

```typescript
// FormBuilderService additions
readonly currentTheme = signal<FormTheme | null>(null);
readonly availableThemes = signal<FormTheme[]>([]);

applyTheme(themeId: string): void {
  const theme = this.availableThemes().find(t => t.id === themeId);
  if (theme) {
    this.currentTheme.set(theme);
    this.markDirty();
  }
}
```

**Type Definitions:**

```typescript
export interface FormSettings {
  // ... existing properties
  themeId?: string; // NEW: Reference to selected theme
}

export interface FormTheme {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl: string;
  themeConfig: ResponsiveThemeConfig;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResponsiveThemeConfig {
  desktop: ThemeProperties;
  mobile?: Partial<ThemeProperties>;
}

export interface ThemeProperties {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColorPrimary: string;
  textColorSecondary: string;
  fontFamilyHeading: string;
  fontFamilyBody: string;
  fieldBorderRadius: string;
  fieldSpacing: string;
  containerBackground: string;
  containerOpacity: number;
  containerPosition: 'center' | 'top' | 'left' | 'full-width';
  backgroundImageUrl?: string;
  backgroundImagePosition?: 'cover' | 'contain' | 'repeat';
}
```

### Code Organization

**File Structure:**

```
apps/web/src/app/features/tools/components/form-builder/
├── theme-dropdown/
│   ├── theme-dropdown.component.ts
│   ├── theme-card/
│   │   └── theme-card.component.ts
│   └── theme-preview.service.ts
├── form-builder.component.ts               # MODIFIED
└── form-builder.service.ts                 # MODIFIED

apps/api/src/
├── controllers/themes.controller.ts        # NEW
├── routes/themes.routes.ts                 # NEW
├── repositories/themes.repository.ts       # NEW
├── services/themes.service.ts              # NEW
└── validators/themes.validator.ts          # NEW

packages/shared/src/types/forms.types.ts    # MODIFIED
```

### Risk Assessment

**Technical Risks:**

1. **RISK**: Theme CSS conflicts with Tailwind utilities
   - **Mitigation**: Use scoped CSS custom properties with higher specificity

2. **RISK**: Large thumbnail images slow dropdown load
   - **Mitigation**: Lazy-load images, WebP format, max 50KB per thumbnail

3. **RISK**: Theme config JSONB schema drift
   - **Mitigation**: JSON schema validation, versioning, migration scripts

**Integration Risks:**

4. **RISK**: Theme overrides background customization unexpectedly
   - **Mitigation**: Clear precedence rules, warning messages in UI

5. **RISK**: Theme deletion breaks forms
   - **Mitigation**: Soft-delete, `ON DELETE SET NULL`, fallback to default

**Deployment Risks:**

6. **RISK**: Database migration fails mid-deployment
   - **Mitigation**: Test on staging, backward-compatible changes, rollback plan

---

## Epic Structure

### Epic Approach

**Single comprehensive epic** with 8 sequential stories

**Rationale:**

- Cohesive feature addition with tightly coupled components
- Stories are logically dependent (API before UI)
- Single epic allows unified rollback
- Incremental integration minimizes risk
- Each story delivers testable increment

---

## Stories

### Story 1.1: Database Schema and Theme Repository

**As a** backend developer, **I want** to create the database schema and repository layer for
storing form themes, **so that** themes can be persisted and queried efficiently.

**Acceptance Criteria:**

1. Create `form_themes` table with all required columns
2. Add indexes on `usage_count DESC` and `is_active`
3. Add `theme_id` column to `form_schemas` with FK constraint
4. Implement `ThemesRepository` with CRUD methods
5. Use parameterized queries for SQL injection prevention
6. Write unit tests with 80%+ coverage

**Integration Verification:**

- IV1: Verify existing forms table queries remain unaffected
- IV2: Verify `form_schemas` accepts `theme_id = NULL`
- IV3: Verify migration script is reversible

---

### Story 1.2: Theme API Endpoints and Validation

**As a** backend developer, **I want** to create REST API endpoints for theme management, **so
that** the frontend can fetch, create, and apply themes.

**Acceptance Criteria:**

1. Implement `GET /api/themes` (active themes, sorted by usage)
2. Implement `GET /api/themes/:id`
3. Implement `POST /api/themes` (admin only, validated)
4. Implement `PUT /api/themes/:id` (admin only)
5. Implement `DELETE /api/themes/:id` (soft-delete)
6. Implement `POST /api/themes/:id/apply` (increment usage)
7. Add Swagger/OpenAPI documentation
8. Write integration tests with auth scenarios

**Integration Verification:**

- IV1: Verify existing `/api/forms` endpoints remain functional
- IV2: Verify authentication middleware applies correctly
- IV3: Verify rate limiting allows legitimate requests

---

### Story 1.3: Shared Types and Form Settings Extension

**As a** full-stack developer, **I want** to extend shared types to include theme interfaces, **so
that** frontend and backend have type-safe theme structures.

**Acceptance Criteria:**

1. Add `FormTheme` interface to shared types
2. Add `ResponsiveThemeConfig` and `ThemeProperties` interfaces
3. Extend `FormSettings` with optional `themeId`
4. Build shared package, verify no type errors
5. Update API response types to include embedded theme
6. Write TypeScript type tests

**Integration Verification:**

- IV1: Verify existing `FormSettings` usage still compiles
- IV2: Verify form-builder.service.ts imports new types
- IV3: Verify backend serializes `FormTheme` correctly

---

### Story 1.4: Backend - Forms API Theme Integration

**As a** backend developer, **I want** to modify the forms API to accept and return theme
references, **so that** forms can be saved with applied themes.

**Acceptance Criteria:**

1. Modify `POST /api/forms` to accept optional `themeId`
2. Modify `PATCH /api/forms/:id` to accept `themeId`
3. Modify `GET /api/forms/:id` to include embedded theme
4. Modify `GET /api/public/forms/:shortCode` to include theme
5. Add validation: `themeId` must reference active theme
6. Update integration tests for theme scenarios

**Integration Verification:**

- IV1: Verify forms without `themeId` save successfully
- IV2: Verify invalid `themeId` returns 400 Bad Request
- IV3: Verify publish/unpublish works with themed forms

---

### Story 1.5: Frontend - Theme Dropdown Component

**As a** frontend developer, **I want** to create a theme dropdown component, **so that** users can
browse and select themes.

**Acceptance Criteria:**

1. Create `ThemeDropdownComponent` (PrimeNG OverlayPanel)
2. Create `ThemeCardComponent` for thumbnails
3. Implement responsive grid layout (4/3/2 columns)
4. Implement lazy-loading with skeletons
5. Highlight currently applied theme
6. Emit `themeSelected` event on click
7. Fetch themes from `GET /api/themes` on open
8. Add keyboard navigation
9. Write unit tests with 80%+ coverage

**Integration Verification:**

- IV1: Verify dropdown doesn't interfere with drag-drop
- IV2: Verify dropdown closes on outside click
- IV3: Verify toolbar layout remains correct

---

### Story 1.6: Frontend - Theme Application and State Management

**As a** frontend developer, **I want** to implement theme application logic, **so that** selected
themes update form preview in real-time.

**Acceptance Criteria:**

1. Extend `FormBuilderService` with theme signals/methods
2. Create `ThemePreviewService` for CSS variable injection
3. Implement responsive CSS variable injection
4. Add "Styling Themes" button to toolbar
5. Connect dropdown to `applyTheme()` method
6. Show toast notification on theme apply
7. Mark form dirty when theme applied
8. Persist `themeId` on save
9. Load theme on form edit
10. Write unit and integration tests

**Integration Verification:**

- IV1: Verify save/load works with themed forms
- IV2: Verify no CSS conflicts with row layout
- IV3: Verify publish/unpublish works with themes

---

### Story 1.7: Public Form Rendering with Themes

**As a** frontend developer, **I want** to render public forms with applied themes, **so that** end
users see themed forms matching builder preview.

**Acceptance Criteria:**

1. Modify `FormRendererComponent` to fetch theme from API
2. Apply theme CSS variables to public form container
3. Implement responsive theme application
4. Handle forms without themes (default styles)
5. Handle deleted themes gracefully
6. Verify theme/custom background coexistence
7. Write E2E tests with Playwright

**Integration Verification:**

- IV1: Verify forms without themes render identically
- IV2: Verify submission functionality works
- IV3: Verify responsive layout works

---

### Story 1.8: Default Themes Seeding and Polish

**As a** product manager, **I want** to seed 6-8 pre-designed themes, **so that** users have
immediate options at launch.

**Acceptance Criteria:**

1. Create 6-8 theme configurations (Neon, Desert, etc.)
2. Design/upload thumbnails to DigitalOcean Spaces
3. Create seed migration script
4. Verify thumbnails display correctly
5. Test all default themes (visual QA)
6. Move "My Forms" to breadcrumb navigation
7. Update user documentation
8. Perform full regression testing

**Integration Verification:**

- IV1: Verify existing forms continue working unchanged
- IV2: Verify performance: dropdown <500ms, apply <200ms
- IV3: Verify production environment functionality

---

## Implementation Notes

### Backward Compatibility Strategy

- All forms without `themeId` render with existing default styles
- Database schema changes are additive (no column removals)
- API endpoints accept optional theme parameters
- Frontend gracefully handles missing theme data

### Migration Path

1. **Phase 1**: Deploy backend with new tables/endpoints (backward compatible)
2. **Phase 2**: Deploy frontend with theme UI (feature-flagged)
3. **Phase 3**: Seed default themes via migration
4. **Phase 4**: Enable feature flag for production users
5. **Phase 5**: Monitor usage metrics and gather feedback

### Rollback Plan

- Database: Revert migration (drop columns/tables)
- Backend: Disable theme routes via environment variable
- Frontend: Remove theme button, hide dropdown
- No data loss: Forms retain `themeId` for future re-enable

---

## Success Metrics

- **Adoption**: 30%+ of new forms created with themes within 30 days
- **Performance**: Theme application <500ms (p95)
- **Reliability**: Zero visual regressions on existing forms
- **Usage**: Top 3 themes account for 60%+ of applications
- **Satisfaction**: User survey rating ≥4.5/5 for theme feature

---

## Future Enhancements (Out of Scope)

- **Custom theme creator** (admin-only theme management UI)
- **Theme marketplace** (share/import community themes)
- **Theme variants** (light/dark mode per theme)
- **Brand kits** (organization-level theme libraries)
- **AI-powered theme suggestions** (based on form content)

---

**Document Version:** 1.0 **Last Updated:** 2025-10-15 **Status:** Ready for Implementation
