# Epic 29: Form Template System with Business Logic

**Version**: 1.0 **Status**: Draft **Created**: 2025-01-09 **Author**: Product Manager (John)

---

## Table of Contents

1. [Project Analysis and Context](#project-analysis-and-context)
2. [Requirements](#requirements)
3. [User Interface Enhancement Goals](#user-interface-enhancement-goals)
4. [Technical Constraints and Integration Requirements](#technical-constraints-and-integration-requirements)
5. [Epic and Story Structure](#epic-and-story-structure)
6. [Change Log](#change-log)

---

## Project Analysis and Context

### Scope Assessment

✅ **This feature qualifies for full PRD treatment** because:

- Form templates require architectural planning for template storage, management, and application
- Multiple coordinated stories needed: backend schema, UI selection flow, template data model,
  product-specific field behaviors (stock tracking, variants, pricing)
- Impacts multiple layers: database schema, backend API, form builder UI, form renderer, and shared
  types
- Introduces new domain concepts (templates, template categories, template-specific field types)

### Analysis Source

**Source**: IDE-based fresh analysis combined with existing comprehensive project documentation

**Available Documentation**:

- ✅ Tech Stack Documentation (docs/architecture/tech-stack.md)
- ✅ Source Tree/Architecture (docs/architecture/source-tree.md)
- ✅ Epic List with 25+ completed epics (docs/prd/epic-list.md)
- ✅ Coding Standards (Angular 20+ standalone components, Express.js clean architecture)
- ✅ API Documentation (Swagger/OpenAPI)
- ✅ Database Schema documentation
- ✅ Theme System architecture (Epic 20-25 completed)

### Current Project State

**Form Builder Platform Overview**: This is a comprehensive **visual form builder** similar to
Typeform/Google Forms with advanced features.

**Current Capabilities**:

- **Visual Form Creation**: Drag-and-drop field palette with 16+ field types
- **Advanced Layouts**: Row-based multi-column layouts (Epic 14), nested sub-columns with variable
  width (Epic 25-27)
- **Theme System**: Custom theme designer (5-step wizard) + 9 predefined themes with Google Fonts
  integration (Epic 20-25)
- **Step Forms**: Multi-step wizard forms with progress indicators (Epic 19)
- **Analytics**: Form analytics dashboard with Chart.js visualizations (Epic 10, 17)
- **Public Forms**: Short links with QR codes, iframe embeds, responsive rendering (Epic 26)
- **Field Types**: TEXT, TEXTAREA, NUMBER, EMAIL, SELECT, CHECKBOX, RADIO, DATE, FILE,
  IMAGE_GALLERY, HEADING, TEXT_BLOCK, IMAGE, DIVIDER, GROUP, etc.

**Architecture Highlights**:

- **Frontend**: `apps/form-builder-ui` (Angular 20+, port 4201) - Signal-based reactive state,
  PrimeNG 17+ components
- **Backend**: `apps/forms-api` (Express.js, port 3001) - Clean architecture pattern
  (controllers/services/repositories)
- **Database**: PostgreSQL with JSONB for form schemas (tables: `forms`, `form_schemas`,
  `form_submissions`, `form_themes`, `short_links`)
- **Shared Types**: `@nodeangularfullstack/shared` package for type safety across stack

### Enhancement Scope Definition

**Enhancement Type**: ☑ **New Feature Addition** + **Major Feature Modification**

**Enhancement Description**: Add a **form template system** that allows users to select
pre-configured form structures optimized for specific use cases (product sales, restaurant menus,
appointment booking, quizzes, polls, etc.) when creating a new form. Templates will include
specialized field configurations, validation rules, and template-specific behaviors (e.g., inventory
tracking for product forms, time slot selection for appointments, scoring for quizzes).

**Impact Assessment**: ☑ **Moderate Impact** (some existing code changes)

- **Database**: New `form_templates` table + template-specific metadata columns and supporting
  tables
- **Backend**: New template endpoints, template service layer, template application logic, business
  logic executors
- **Frontend**: Template selection UI in form creation flow, template preview modal, admin template
  editor
- **Form Builder**: Modification to initialization flow to apply template fields/settings
- **Minimal Impact on**: Existing form rendering, theme system, analytics (backward compatible)

### Goals and Background Context

**Goals**:

- Enable users to quickly create domain-specific forms without manual field-by-field construction
- Reduce time-to-create for common form use cases (product catalogs, appointments, registrations,
  quizzes, polls)
- Provide template marketplace foundation for future template sharing/monetization
- Support specialized field behaviors (inventory management, dynamic pricing, variant selection,
  appointment booking, quiz scoring, vote aggregation)
- Maintain backward compatibility with existing blank form creation workflow

**Background Context**: The current form builder requires users to manually add every field,
configure properties, and set up layouts from scratch. This creates friction for users who want to
build common form types like product order forms or appointment bookings.

By introducing templates, the system will provide:

1. **Faster onboarding**: New users can see pre-built examples and modify them rather than starting
   blank
2. **Domain-specific UX**: Templates can include specialized field types (product variants, stock
   counters) that aren't exposed in generic blank forms
3. **Competitive parity**: Major form builders (Typeform, Jotform, Google Forms) offer template
   galleries
4. **Monetization path**: Premium templates could be future revenue stream

This enhancement builds on the existing theme system (Epic 20-25) by adding **structural templates**
alongside **visual themes**.

---

## Requirements

### Functional Requirements

**FR1: Template Selection on Form Creation** When a user initiates form creation, the system SHALL
present a template selection modal with options to either start from a template or create a blank
form.

**FR2: Template Categories and Browsing** The system SHALL organize templates into 6 categories
(E-commerce, Services, Data Collection, Events, Quiz, Polls) with visual category cards and template
preview thumbnails.

**FR3: Template Preview** Users SHALL be able to preview a template's field structure, layout
configuration, and sample data before selecting it, without creating a form.

**FR4: Template Application to New Forms** When a user selects a template, the system SHALL create a
new form pre-populated with the template's field configuration, validation rules, layout settings,
and theme assignment.

**FR5: Template Metadata Storage** The system SHALL store templates in a dedicated `form_templates`
table with fields: `id`, `name`, `description`, `category`, `preview_image_url`, `template_schema`
(JSONB), `business_logic_config` (JSONB), `created_by`, `is_active`, `usage_count`, `created_at`,
`updated_at`.

**FR6: Product Template - Variant Selection** Product templates SHALL include an IMAGE_GALLERY field
type for product photos where each image can have associated metadata (size, color, price_modifier)
and selection updates the displayed price dynamically.

**FR7: Product Template - Inventory Tracking** Product templates SHALL include a `stock_quantity`
field in the template metadata that decrements by the submitted quantity and prevents submissions
when stock reaches zero.

**FR8: Product Template - Dynamic Pricing** Product templates SHALL calculate the total price based
on base price + variant price modifiers + quantity, displaying the computed total in real-time
before submission.

**FR9: Appointment Template - Time Slot Selection** Appointment templates SHALL include a time slot
selector field that displays available time slots from a configured schedule and prevents
double-booking by tracking booked slots.

**FR10: Restaurant Menu Template - Order Summary** Restaurant menu templates SHALL allow multiple
item selection with quantities and display a running order summary with line items and total price.

**FR11: Quiz Template - Scoring Logic** Quiz templates SHALL support correct answer configuration
for each question and calculate a score on submission, storing both answers and final score.

**FR12: Poll Template - Vote Aggregation** Poll templates SHALL prevent duplicate voting (by
session/user) and display real-time vote counts for each option after submission.

**FR13: Template-Specific Field Types** The system SHALL introduce new field types exclusive to
templates: `VARIANT_SELECTOR` (image gallery with metadata), `TIME_SLOT_PICKER`, `INVENTORY_ITEM`,
`QUIZ_QUESTION`, `POLL_OPTION`.

**FR14: Template Business Logic Execution** The backend SHALL execute template-specific business
logic on form submission: inventory updates, booking validations, score calculations, vote
increments.

**FR15: Template Admin Management Interface** Admins SHALL have a dedicated interface (`apps/web`)
to create, edit, activate/deactivate, and preview templates with real-time validation.

**FR16: Backward Compatibility with Blank Forms** The system SHALL maintain the existing blank form
creation workflow as the default option, ensuring no breaking changes to current user flows.

**FR17: Template Modification After Application** Once a template is applied to a form, users SHALL
be able to modify all fields, add/remove fields, and change settings just like blank forms (template
is a starting point, not a constraint).

**FR18: Template Usage Analytics** The system SHALL track `usage_count` for each template and
display popular templates first in the selection UI, updating counts on each template application.

### Non-Functional Requirements

**NFR1: Performance - Template Selection Modal Load Time** Template selection modal SHALL load and
display all template categories with preview thumbnails within 500ms on first render, utilizing
lazy-loaded images and cached metadata.

**NFR2: Database - JSONB Query Performance** Template queries filtering by category SHALL complete
within 100ms for up to 100 templates using PostgreSQL JSONB GIN indexes on `category` and
`is_active` fields.

**NFR3: Scalability - Template Schema Size Limit** Template `template_schema` JSONB column SHALL
enforce a 100KB size limit to prevent performance degradation on form creation (consistent with
existing form schema limits).

**NFR4: Availability - Template Service Failure Handling** If the template service fails, the system
SHALL gracefully fall back to blank form creation with a user-facing error message, ensuring form
creation remains available.

**NFR5: Security - Template Admin Authorization** Template management endpoints
(`POST /api/templates`, `PUT /api/templates/:id`, `DELETE /api/templates/:id`) SHALL require admin
role authentication and reject non-admin users with 403 Forbidden.

**NFR6: Maintainability - Template Business Logic Isolation** Template-specific business logic SHALL
be encapsulated in a dedicated `TemplateExecutorService` using the strategy pattern, allowing new
template types to be added without modifying core form submission logic.

**NFR7: Testability - Template Logic Unit Test Coverage** All template business logic (inventory
decrements, score calculations, booking validations) SHALL achieve minimum 90% unit test coverage
with Jest integration tests.

**NFR8: Usability - Template Preview Accuracy** Template preview SHALL render the exact field
configuration, layout, and theme as the final form will appear, using the shared
`FormRendererComponent` in preview mode.

**NFR9: Accessibility - Template Selection WCAG AA Compliance** Template selection modal SHALL meet
WCAG 2.1 AA standards with keyboard navigation, screen reader announcements, and focus management.

**NFR10: Data Integrity - Inventory Consistency** Product template inventory updates SHALL use
database transactions to prevent race conditions when multiple users submit orders simultaneously
for the same product.

### Compatibility Requirements

**CR1: Existing Form Schema Compatibility** Templates MUST generate form schemas that conform to the
existing `FormSchema` interface in `packages/shared/src/types/forms.types.ts`, ensuring seamless
integration with the form builder and renderer.

**CR2: Theme System Integration** Templates MUST support theme assignment via
`schema.settings.themeId`, allowing template forms to use any of the 9 predefined themes or custom
themes from the theme designer (Epic 23-24).

**CR3: Row Layout System Compatibility** Templates MUST support the existing row-based multi-column
layout system (Epic 14, 27), including nested sub-columns and variable width ratios, without
requiring new layout mechanisms.

**CR4: Form Submission API Backward Compatibility** Template-based forms MUST submit to the existing
`POST /api/public/forms/:shortCode/submit` endpoint without changes, with template business logic
executed as middleware hooks rather than endpoint modifications.

**CR5: Analytics Dashboard Compatibility** Forms created from templates MUST be fully compatible
with the existing analytics dashboard (`FormAnalyticsComponent`), displaying submission charts, data
visualizations, and export functionality without template-specific code branches.

**CR6: Short Link and QR Code System** Template-based forms MUST generate short links and QR codes
identically to blank forms, using the existing `short_links` table and `ShortLinkService` logic.

**CR7: Existing Field Type Preservation** All 16+ existing field types (TEXT, TEXTAREA, NUMBER,
EMAIL, SELECT, CHECKBOX, RADIO, DATE, FILE, IMAGE_GALLERY, HEADING, TEXT_BLOCK, IMAGE, DIVIDER,
GROUP, etc.) MUST remain functional and unchanged in both blank forms and template forms.

**CR8: Frontend State Management Integration** Template application logic MUST integrate with the
existing signal-based reactive state in `FormBuilderService` (computed signals like `fields()`,
`fieldsByRowColumn()`), avoiding parallel state management.

---

## User Interface Enhancement Goals

### Integration with Existing UI

**Design System Consistency:** The template selection and management interfaces will leverage the
existing PrimeNG 17+ components and Tailwind CSS utility classes to maintain visual consistency:

- **Template Selection Modal**: Built with `p-dialog` component (consistent with existing
  `PublishDialogComponent`, `ThemeDesignerModalComponent` patterns)
- **Category Cards**: Using `p-card` with Tailwind grid layouts (following the pattern from
  `FormCardComponent`)
- **Template Preview**: Reusing the existing `FormRendererComponent` in preview mode (same approach
  as Story 14.3 preview functionality)
- **Admin Template Editor**: Following the sidebar pattern from `RowLayoutSidebarComponent` and
  `StepFormSidebarComponent`

**Component Hierarchy Integration:**

```
FormBuilderComponent (existing)
└─> TemplateSelectionModalComponent (new)
    ├─> TemplateCategoryGridComponent (new)
    ├─> TemplateCardComponent (new)
    └─> TemplatePreviewModalComponent (new - wraps FormRendererComponent)
```

**Signal-Based State Management:** The template selection will integrate with the existing
`FormBuilderService` signals pattern:

```typescript
// New computed signals in FormBuilderService
selectedTemplate = signal<FormTemplate | null>(null);
isTemplateMode = computed(() => this.selectedTemplate() !== null);
templateFields = computed(() => this.selectedTemplate()?.templateSchema.fields || []);
```

**Styling Approach:**

- **Theme Variables**: Template UI will respect the active PrimeNG theme (following the existing
  theme system from Epic 20-25)
- **Responsive Breakpoints**: Mobile-first design using Tailwind breakpoints (`sm:`, `md:`, `lg:`)
  consistent with form renderer responsive behavior
- **Icon System**: PrimeIcons library (already used in `FieldPaletteComponent`,
  `ThemeDropdownComponent`)

### Modified/New Screens and Views

**Form Builder UI (`apps/form-builder-ui`):**

1. **NEW: Template Selection Modal** (`src/app/features/dashboard/template-selection-modal/`)
   - Triggered when user clicks "Create New Form" or "Choose Template" button
   - Category browsing grid (6 categories with icons and counts)
   - Template card grid within selected category
   - "Start Blank" option prominently displayed
   - Search/filter by template name

2. **NEW: Template Preview Modal** (`src/app/features/dashboard/template-preview-modal/`)
   - Full-screen modal showing template form rendering
   - Uses existing `FormRendererComponent` with `previewMode: true`
   - Sample data populated to demonstrate template functionality
   - "Use This Template" and "Back to Templates" actions

3. **MODIFIED: Forms List Component**
   (`src/app/features/dashboard/forms-list/forms-list.component.ts`)
   - Add "Create from Template" button alongside existing "Create New Form"
   - Display template badge on forms created from templates (optional metadata)
   - No changes to existing list/grid view of forms

4. **MODIFIED: Form Builder Component** (`src/app/features/dashboard/form-builder.component.ts`)
   - Initialization logic updated to check for `?templateId` query parameter
   - Apply template schema to `FormBuilderService` on load if template selected
   - No visual changes to existing toolbar, canvas, or sidebar

**Admin Dashboard (`apps/web`):**

5. **NEW: Template Management Page** (`src/app/features/admin/pages/template-management/`)
   - List view of all templates with category filters
   - CRUD operations: Create, Edit, Delete, Activate/Deactivate templates
   - Usage statistics display (usage_count, created_at)
   - Template preview launcher

6. **NEW: Template Editor Component** (`src/app/features/admin/components/template-editor/`)
   - Form to define template metadata (name, description, category)
   - JSON editor for `template_schema` (Monaco Editor integration)
   - Business logic configuration panel (template-specific settings)
   - Preview button to test template rendering
   - Image upload for preview thumbnail

7. **MODIFIED: Admin Navigation** (`src/app/layouts/main-layout/`)
   - Add "Templates" menu item in admin sidebar (sibling to "Tools", "Users")
   - Admin role guard protection (existing `AuthGuard` with role check)

**Public Form Renderer (no changes):**

- Template-based forms render identically to blank forms
- No UI modifications needed in `FormRendererComponent`

### UI Consistency Requirements

**Visual Consistency:**

- **Color Palette**: Template UI SHALL use the existing PrimeNG theme color variables
  (`--primary-color`, `--surface-ground`, `--text-color`) without introducing custom colors
- **Typography**: Template components SHALL use the project's existing font stack and Tailwind
  typography scale
- **Spacing**: Template layouts SHALL use Tailwind spacing utilities (`p-4`, `gap-3`, `space-y-2`)
  consistent with existing components
- **Shadows and Borders**: Template cards SHALL use Tailwind shadow utilities (`shadow-md`,
  `shadow-lg`) matching the elevation system in `FormCardComponent`

**Interaction Consistency:**

- **Modal Behavior**: Template selection and preview modals SHALL follow the same open/close
  patterns as `PublishDialogComponent` (Escape key to close, backdrop click to close)
- **Loading States**: Template loading SHALL use PrimeNG `p-skeleton` components or
  `p-progressSpinner` for async operations
- **Error Handling**: Template selection errors SHALL display using the existing toast notification
  service (`MessageService`)
- **Button Styles**: Template action buttons SHALL use PrimeNG button variants (`p-button-primary`,
  `p-button-secondary`, `p-button-text`)

**Responsive Design:**

- **Mobile Template Selection**: On screens < 768px, template category grid SHALL switch from 3
  columns to 1 column with full-width cards
- **Template Preview Mobile**: Template preview modal SHALL fill viewport on mobile
- **Touch Targets**: All interactive elements SHALL meet 44x44px minimum touch target size (WCAG AA)

**Accessibility Consistency:**

- **Keyboard Navigation**: Template selection modal SHALL support full keyboard navigation (Tab,
  Enter, Escape) with visible focus indicators
- **Screen Reader Support**: Template cards SHALL include `aria-label` descriptions
- **Focus Management**: When template modal opens, focus SHALL move to first focusable element

**Animation Consistency:**

- **Modal Transitions**: Template modals SHALL use PrimeNG default animation timing (150ms
  ease-in-out)
- **Hover Effects**: Template cards SHALL include subtle hover scale transform and shadow increase

---

## Technical Constraints and Integration Requirements

### Existing Technology Stack

| **Category**           | **Technology**               | **Version** | **Constraint for Templates**                                            |
| ---------------------- | ---------------------------- | ----------- | ----------------------------------------------------------------------- |
| **Frontend Framework** | Angular                      | 20+         | Template UI must use standalone components with signals                 |
| **UI Components**      | PrimeNG                      | 17+         | Template components must use PrimeNG dialog, card, accordion            |
| **State Management**   | NgRx Signals                 | 17+         | Template state integrated into FormBuilderService signals               |
| **Backend Framework**  | Express.js                   | 4.19+       | Template API follows clean architecture (controller/service/repository) |
| **Database**           | PostgreSQL                   | 15+         | Template storage uses JSONB columns, GIN indexes for queries            |
| **API Style**          | REST + OpenAPI               | 3.0         | Template endpoints documented with JSDoc → Swagger                      |
| **Authentication**     | JWT + Passport.js            | Latest      | Template admin endpoints require JWT auth + admin role                  |
| **CSS Framework**      | Tailwind CSS                 | 3.4+        | Template components use utility-first Tailwind classes                  |
| **Testing**            | Jest + Playwright            | 29+ / 1.40+ | Template logic requires 90% Jest coverage + E2E tests                   |
| **Shared Types**       | @nodeangularfullstack/shared | Custom      | Template types defined in shared package                                |

### Integration Approach

**Database Integration Strategy:**

- **New Tables**:
  - `form_templates` - Main template storage
  - `product_inventory` - Product SKU stock tracking
  - `appointment_bookings` - Appointment time slot bookings
- **Migration Path**: Knex.js migration scripts in `apps/forms-api/database/migrations/`
- **Indexing**: GIN indexes on `template_schema` JSONB, B-tree index on `is_active`
- **Seed Data**: Initial 12 templates (2 per category) seeded for demo purposes
- **No Schema Changes**: Existing `forms`, `form_schemas`, `form_submissions` tables remain
  unchanged

**API Integration Strategy:**

- **New Endpoints** in `apps/forms-api`:
  - `GET /api/templates` - List all active templates (public)
  - `GET /api/templates/:id` - Get single template details (public)
  - `POST /api/templates` - Create template (admin only)
  - `PUT /api/templates/:id` - Update template (admin only)
  - `DELETE /api/templates/:id` - Delete template (admin only)
  - `POST /api/templates/:id/apply` - Apply template to new form (authenticated)
- **Controller**: `TemplatesController` in `src/controllers/templates.controller.ts`
- **Service**: `TemplatesService` in `src/services/templates.service.ts`
- **Repository**: `TemplatesRepository` in `src/repositories/templates.repository.ts`
- **Validation**: `TemplatesValidator` using `express-validator`

**Frontend Integration Strategy:**

- **Template Selection Modal**: New component in
  `apps/form-builder-ui/src/app/features/dashboard/template-selection-modal/`
- **HTTP Service**: `TemplatesApiService` in `apps/form-builder-ui/src/app/core/services/`
- **State Management**: Extend `FormBuilderService` with template-related signals
- **Routing**: Add `?templateId=<uuid>` query parameter support

**Testing Integration Strategy:**

- **Backend Unit Tests**: `apps/forms-api/tests/unit/` - Template CRUD, business logic
- **Backend Integration Tests**: `apps/forms-api/tests/integration/` - API endpoints, authorization
- **Frontend Component Tests**: Jasmine/Karma tests for template components
- **E2E Tests**: Playwright tests covering full template workflows

### Code Organization and Standards

**Backend File Structure (`apps/forms-api/src/`):**

```
controllers/
  └─ templates.controller.ts
services/
  ├─ templates.service.ts
  └─ template-executor.service.ts
repositories/
  └─ templates.repository.ts
validators/
  └─ templates.validator.ts
database/
  ├─ migrations/
  │   └─ 20250109_create_templates_table.ts
  └─ seeds/
      └─ 07_form_templates.ts
```

**Frontend File Structure (`apps/form-builder-ui/src/app/`):**

```
features/dashboard/
  ├─ template-selection-modal/
  ├─ template-preview-modal/
  └─ template-category-card/
core/services/
  └─ templates-api.service.ts
```

**Shared Package (`packages/shared/src/types/`):**

```
templates.types.ts
```

**Naming Conventions:**

- **Backend Files**: `templates.controller.ts`, `templates.service.ts` (feature.layer.ts)
- **Frontend Components**: `template-selection-modal.component.ts` (kebab-case.component.ts)
- **Shared Types**: `FormTemplate`, `TemplateCategory` (PascalCase)
- **API Endpoints**: `/api/templates` (plural, lowercase)

### Deployment and Operations

**Build Process Integration:**

- **Shared Package Build**: Run `npm run build:shared` before building backend/frontend
- **Backend Build**: `npm --workspace=apps/forms-api run build`
- **Frontend Build**: `npm --workspace=apps/form-builder-ui run build`

**Deployment Strategy:**

- **Database Migration**: Run `npm --workspace=apps/forms-api run db:migrate` before deployment
- **Seed Templates**: Run `npm --workspace=apps/forms-api run db:seed` (development/staging only)
- **Rollback Plan**: Migration rollback script to drop `form_templates` table

**Monitoring and Logging:**

- **Template API Metrics**: Log template selection rates, category popularity, usage counts
- **Business Logic Execution**: Log inventory updates, booking conflicts with structured Winston
  logging
- **Error Tracking**: Sentry integration captures template errors
- **Performance Monitoring**: Track template modal load time, application duration

**Configuration Management:**

- **Environment Variables**: No new env vars needed (uses existing `DATABASE_URL`, `JWT_SECRET`)
- **Feature Flags**: Optional `ENABLE_FORM_TEMPLATES` flag (default: true)
- **Template Assets**: Preview images stored in DigitalOcean Spaces

### Risk Assessment and Mitigation

**Technical Risks:**

1. **Risk**: Template JSONB schema size exceeds 100KB limit
   - **Mitigation**: Enforce size validation, UI warning when approaching limit

2. **Risk**: Business logic execution degrades submission latency
   - **Mitigation**: Execute asynchronously after response, use database transactions

3. **Risk**: Inventory race conditions cause overselling
   - **Mitigation**: PostgreSQL row-level locks (`SELECT FOR UPDATE`), optimistic locking

**Integration Risks:**

1. **Risk**: Template field types break existing form renderer
   - **Mitigation**: Implement as specialized configurations of existing types, feature flag

2. **Risk**: Template state conflicts with FormBuilderService signals
   - **Mitigation**: Integrate as computed properties, comprehensive unit tests

**Deployment Risks:**

1. **Risk**: Migration fails on production due to timeout
   - **Mitigation**: Create indexes concurrently, run during low-traffic window

2. **Risk**: Template seed data conflicts
   - **Mitigation**: Use upsert logic, test on production snapshot

**Mitigation Strategies:**

- **Comprehensive Testing**: 90% unit test coverage, integration tests, E2E tests
- **Phased Rollout**: Deploy backend first, enable for admin users, gradual rollout
- **Feature Flag**: `ENABLE_FORM_TEMPLATES` allows instant rollback
- **Database Backups**: Automated backups before migration
- **Monitoring Alerts**: Sentry alerts for template errors, performance degradation

---

## Epic and Story Structure

### Epic Structure Decision

**Epic 29: Form Template System with Business Logic**

**Epic Goal:** Enable users to quickly create domain-specific forms by selecting from pre-configured
templates (E-commerce, Services, Data Collection, Events, Quiz, Polls) with specialized business
logic (inventory tracking, appointment booking, scoring, vote aggregation), while maintaining full
backward compatibility with existing blank form creation workflows.

**Integration Requirements:**

- Template schema generation MUST conform to existing `FormSchema` interface
- Template-based forms MUST integrate seamlessly with existing form builder, renderer, theme system,
  analytics
- Template business logic MUST execute as middleware/hooks without modifying core submission
  endpoints
- All existing form features (row layouts, step forms, themes) MUST work identically in
  template-based forms

---

### Story 29.1: Database Schema and Template Storage Foundation

**As a** backend developer, **I want** a robust database schema for storing form templates with
metadata and business logic configuration, **so that** templates can be efficiently queried,
versioned, and applied to new forms.

**Acceptance Criteria:**

1. **AC1**: `form_templates` table created with columns: `id` (UUID PK), `name` (VARCHAR 255),
   `description` (TEXT), `category` (VARCHAR 50), `preview_image_url` (TEXT), `template_schema`
   (JSONB), `business_logic_config` (JSONB), `created_by` (UUID FK to users), `is_active` (BOOLEAN
   default true), `usage_count` (INTEGER default 0), `created_at` (TIMESTAMP), `updated_at`
   (TIMESTAMP)

2. **AC2**: GIN index created on `template_schema` JSONB column for efficient category filtering:
   `CREATE INDEX idx_templates_schema_category ON form_templates USING GIN ((template_schema -> 'category'))`

3. **AC3**: B-tree index created on `is_active` column:
   `CREATE INDEX idx_templates_is_active ON form_templates (is_active)`

4. **AC4**: Foreign key constraint added on `created_by` referencing `users.id` with ON DELETE SET
   NULL

5. **AC5**: CHECK constraint enforces `category` ENUM:
   `('ecommerce', 'services', 'data_collection', 'events', 'quiz', 'polls')`

6. **AC6**: CHECK constraint enforces `template_schema` size limit:
   `pg_column_size(template_schema) <= 102400` (100KB)

7. **AC7**: Migration script includes rollback logic

8. **AC8**: Seed script creates 12 initial templates (2 per category)

**Integration Verification:**

- **IV1**: Existing tables remain unchanged, all existing queries execute successfully
- **IV2**: Migration completes within 5 seconds on test database with 10,000+ forms
- **IV3**: Template category queries execute within 100ms (EXPLAIN ANALYZE)

---

### Story 29.2: Shared Template Types and Interfaces

**As a** full-stack developer, **I want** shared TypeScript interfaces for templates across frontend
and backend, **so that** type safety is maintained and API contracts are consistent.

**Acceptance Criteria:**

1. **AC1**: `FormTemplate` interface created in `packages/shared/src/types/templates.types.ts`

2. **AC2**: `TemplateCategory` enum exported: `ECOMMERCE`, `SERVICES`, `DATA_COLLECTION`, `EVENTS`,
   `QUIZ`, `POLLS`

3. **AC3**: `TemplateBusinessLogicConfig` interface with discriminated union for logic types

4. **AC4**: `InventoryConfig` interface: `stockField`, `threshold`, `decrementOnSubmit`

5. **AC5**: `AppointmentConfig` interface: `timeSlotField`, `maxBookingsPerSlot`, `bookedSlotsTable`

6. **AC6**: `QuizConfig` interface: `scoringRules`, `passingScore`

7. **AC7**: `PollConfig` interface: `voteField`, `preventDuplicates`, `showResultsAfterVote`

8. **AC8**: All types exported from `packages/shared/src/index.ts`

9. **AC9**: `npm run build:shared` completes without errors

**Integration Verification:**

- **IV1**: Existing shared types remain unchanged, all imports resolve
- **IV2**: Backend imports work: `import { FormTemplate } from '@nodeangularfullstack/shared'`
- **IV3**: Frontend imports work in `apps/form-builder-ui`

---

### Story 29.3: Templates Repository and Database Access Layer

**As a** backend developer, **I want** a repository layer for template CRUD operations following
clean architecture, **so that** database access is abstracted and testable.

**Acceptance Criteria:**

1. **AC1**: `TemplatesRepository` class created with methods: `create()`, `findAll()`, `findById()`,
   `findByCategory()`, `update()`, `delete()`, `incrementUsageCount()`

2. **AC2**: `findAll()` supports `isActive` filtering and pagination

3. **AC3**: `findByCategory()` uses GIN index for JSONB filtering

4. **AC4**: `incrementUsageCount()` uses atomic SQL increment

5. **AC5**: All methods use parameterized queries (SQL injection prevention)

6. **AC6**: Repository methods return typed `FormTemplate` results

7. **AC7**: Error handling wraps database errors with descriptive messages

8. **AC8**: Exports singleton: `export const templatesRepository = new TemplatesRepository()`

**Integration Verification:**

- **IV1**: Existing repositories remain unchanged
- **IV2**: Unit tests achieve 95%+ coverage
- **IV3**: Single-row operations execute within 50ms, paginated queries within 100ms

---

### Story 29.4: Templates Service Layer with Application Logic

**As a** backend developer, **I want** a service layer that orchestrates template operations and
application logic, **so that** business rules are enforced and templates can be applied to forms.

**Acceptance Criteria:**

1. **AC1**: `TemplatesService` class created with methods: `createTemplate()`, `getTemplates()`,
   `getTemplateById()`, `updateTemplate()`, `deleteTemplate()`, `applyTemplateToForm()`

2. **AC2**: `createTemplate()` validates schema conforms to `FormSchema` and enforces 100KB limit

3. **AC3**: `applyTemplateToForm()` deep-clones template schema, returns valid `FormSchema`

4. **AC4**: `applyTemplateToForm()` increments `usage_count`

5. **AC5**: `getTemplates()` sorts by `usage_count DESC` by default

6. **AC6**: Service validates business logic config matches category

7. **AC7**: Uses custom `ApiError` class for structured errors

8. **AC8**: Comprehensive JSDoc comments with examples

**Integration Verification:**

- **IV1**: Existing services remain unchanged
- **IV2**: Unit tests achieve 95%+ coverage with mocked repositories
- **IV3**: Generated schemas compatible with `FormBuilderService`

---

### Story 29.5: Templates Controller and REST API Endpoints

**As a** backend developer, **I want** REST API endpoints for template operations with
authentication and validation, **so that** frontend applications can interact with templates
securely.

**Acceptance Criteria:**

1. **AC1**: `TemplatesController` class created with methods for all CRUD operations

2. **AC2**: `GET /api/templates` - paginated active templates (public, no auth)

3. **AC3**: `GET /api/templates/:id` - single template (public)

4. **AC4**: `POST /api/templates` - create template (admin only)

5. **AC5**: `PUT /api/templates/:id` - update template (admin only)

6. **AC6**: `DELETE /api/templates/:id` - soft delete by setting `is_active = false` (admin only)

7. **AC7**: `POST /api/templates/:id/apply` - apply template, return `FormSchema` (authenticated)

8. **AC8**: All endpoints include express-validator validation

9. **AC9**: JSDoc for Swagger/OpenAPI generation

10. **AC10**: Routes registered in `templates.routes.ts` with admin middleware

**Integration Verification:**

- **IV1**: Existing form endpoints remain unchanged
- **IV2**: Integration tests cover all endpoints with 90%+ coverage
- **IV3**: Swagger docs at `/api-docs` include template endpoints

---

### Story 29.6: Template Selection Modal UI Component

**As a** form creator, **I want** a modal to browse and select templates when creating a form, **so
that** I can quickly start with a pre-configured structure.

**Acceptance Criteria:**

1. **AC1**: `TemplateSelectionModalComponent` created as standalone Angular component

2. **AC2**: Modal displays 6 category cards with icons, names, counts

3. **AC3**: Clicking category expands to show template grid (2-3 columns desktop, 1 mobile)

4. **AC4**: Template cards show: name, description, thumbnail, "Preview" and "Use Template" buttons

5. **AC5**: "Start Blank" option prominently displayed at top

6. **AC6**: Modal opened via "Create New Form" button in `FormsListComponent`

7. **AC7**: Uses PrimeNG `p-dialog` (90vw desktop, full viewport mobile)

8. **AC8**: Search/filter input for filtering by name

9. **AC9**: Loading state with `p-skeleton` components

10. **AC10**: Error state with retry button

**Integration Verification:**

- **IV1**: Existing "Create New Form" flow remains functional
- **IV2**: Keyboard navigation works (Tab, Enter, Escape)
- **IV3**: Mobile rendering correct (< 768px full-screen)

---

### Story 29.7: Template Preview Modal with Form Renderer Integration

**As a** form creator, **I want** to preview a template's structure before selecting it, **so that**
I can make an informed decision.

**Acceptance Criteria:**

1. **AC1**: `TemplatePreviewModalComponent` created as standalone component

2. **AC2**: Modal embeds `FormRendererComponent` with `previewMode: true`

3. **AC3**: Template schema fetched from `GET /api/templates/:id`

4. **AC4**: Sample data populated to demonstrate functionality

5. **AC5**: Modal header shows template name, category badge, description

6. **AC6**: Footer includes "Use This Template" and "Back to Templates" buttons

7. **AC7**: PrimeNG `p-dialog` fullscreen on mobile, 80vw desktop

8. **AC8**: Launched by "Preview" button on template card

9. **AC9**: Loading spinner while fetching

**Integration Verification:**

- **IV1**: Existing form preview (Story 14.3) remains unchanged
- **IV2**: Preview renders all field types correctly
- **IV3**: Template theme applied if themeId present

---

### Story 29.8: Template Application to Form Builder

**As a** form creator, **I want** selected templates to pre-populate the form builder, **so that** I
can start editing immediately.

**Acceptance Criteria:**

1. **AC1**: `TemplatesApiService` created with `applyTemplate(templateId): Observable<FormSchema>`

2. **AC2**: Calls `POST /api/templates/:id/apply`

3. **AC3**: `FormBuilderService` extended with
   `selectedTemplate = signal<FormTemplate | null>(null)`

4. **AC4**: Computed signal `isTemplateMode = computed(() => this.selectedTemplate() !== null)`

5. **AC5**: Form builder route supports `?templateId=<uuid>` query param

6. **AC6**: `FormBuilderComponent` `ngOnInit()` checks templateId, fetches and applies schema

7. **AC7**: Template fields loaded with correct positions (row/column, step structure)

8. **AC8**: Template theme applied if themeId present

9. **AC9**: Form is draft and fully editable after application

10. **AC10**: "Template Applied" toast notification

**Integration Verification:**

- **IV1**: Blank form creation unchanged (no query param)
- **IV2**: Template forms modifiable with all existing builder features
- **IV3**: Saving creates standard form record

---

### Story 29.9: Admin Template Management Interface

**As an** admin, **I want** a UI to create, edit, and manage templates, **so that** I can curate the
template library.

**Acceptance Criteria:**

1. **AC1**: `TemplateManagementPage` created in `apps/web/src/app/features/admin/pages/`

2. **AC2**: Data table with columns: Name, Category, Description, Usage Count, Active, Actions

3. **AC3**: "Create Template" button opens editor dialog

4. **AC4**: Category filter dropdown

5. **AC5**: Active/Inactive toggle filter

6. **AC6**: Edit action opens editor with existing data

7. **AC7**: Delete shows confirmation, calls `DELETE /api/templates/:id`

8. **AC8**: Preview opens template preview modal

9. **AC9**: Protected by admin auth guard

10. **AC10**: "Templates" menu item in admin sidebar

**Integration Verification:**

- **IV1**: Existing admin pages unchanged
- **IV2**: Admin navigation expands correctly
- **IV3**: Non-admins redirected with error message

---

### Story 29.10: Admin Template Editor with Schema Configuration

**As an** admin, **I want** a comprehensive editor to define template schemas and business logic,
**so that** I can create new templates with custom configurations.

**Acceptance Criteria:**

1. **AC1**: `TemplateEditorComponent` created as dialog component

2. **AC2**: Form fields: Name, Description, Category, Preview Image upload

3. **AC3**: Monaco Editor for JSON schema editing with validation

4. **AC4**: Dynamic business logic form based on category

5. **AC5**: Schema validation on blur/change with inline errors

6. **AC6**: "Preview Template" button opens preview with current schema

7. **AC7**: "Save Template" validates and calls `POST /api/templates` or `PUT`

8. **AC8**: Success toast with "View in Template Library" action

9. **AC9**: Image upload to DO Spaces using existing pattern

**Integration Verification:**

- **IV1**: Existing Monaco Editor usage unchanged
- **IV2**: Created schemas load correctly in form builder
- **IV3**: Editor preview matches public preview

---

### Story 29.11: Product Template with Inventory Tracking

**As a** form creator, **I want** an e-commerce product template with variants and inventory
management, **so that** I can sell products with automated stock tracking.

**Acceptance Criteria:**

1. **AC1**: "Product Order Form" template created with category `ECOMMERCE`

2. **AC2**: Schema includes: Product Images (IMAGE_GALLERY), Quantity, Customer Info, Delivery
   Address

3. **AC3**: IMAGE_GALLERY configured with variant metadata: `{size, color, priceModifier, sku}`

4. **AC4**: Business logic config: `{type: 'inventory', variantField, quantityField, stockTable}`

5. **AC5**: `product_inventory` table created: `sku`, `stock_quantity`, `reserved_quantity`,
   `updated_at`

6. **AC6**: `InventoryExecutor` strategy class created

7. **AC7**: On submission, decrements stock with transaction and row-level lock
   (`SELECT FOR UPDATE`)

8. **AC8**: Prevents submission if out of stock

9. **AC9**: Frontend displays real-time stock via `GET /api/inventory/:sku`

**Integration Verification:**

- **IV1**: Non-product forms unchanged
- **IV2**: Inventory updates within 200ms
- **IV3**: Concurrent submissions handle correctly (no overselling)

---

### Story 29.12: Appointment Booking Template with Time Slot Management

**As a** service provider, **I want** an appointment booking template with conflict prevention, **so
that** customers can book without double-booking.

**Acceptance Criteria:**

1. **AC1**: "Appointment Booking" template created with category `SERVICES`

2. **AC2**: Schema: Service Type, Preferred Date, Time Slot, Customer Name, Email, Phone

3. **AC3**: Business logic config:
   `{type: 'appointment', timeSlotField, dateField, maxBookingsPerSlot, bookingsTable}`

4. **AC4**: `appointment_bookings` table: `id`, `form_id`, `date`, `time_slot`, `booked_at`,
   `status`

5. **AC5**: `AppointmentExecutor` strategy class created

6. **AC6**: Checks existing bookings count

7. **AC7**: Rejects if count >= maxBookingsPerSlot

8. **AC8**: Inserts booking with status `confirmed`

9. **AC9**: Frontend fetches available slots, disables booked ones

**Integration Verification:**

- **IV1**: Existing date/time fields unchanged
- **IV2**: Booking logic executes within 150ms
- **IV3**: Conflict detection prevents double-booking

---

### Story 29.13: Quiz Template with Scoring Logic

**As an** educator, **I want** a quiz template with automatic scoring, **so that** I can create
assessments and track performance.

**Acceptance Criteria:**

1. **AC1**: "Quiz Assessment" template created with category `QUIZ`

2. **AC2**: Schema includes 5 RADIO questions with 4 options each

3. **AC3**: Business logic config: `{type: 'quiz', scoringRules, passingScore, showResults}`

4. **AC4**: `QuizExecutor` strategy class created

5. **AC5**: Calculates percentage score on submission

6. **AC6**: Stores score in `metadata` JSONB: `{score, correctAnswers, totalQuestions, passed}`

7. **AC7**: Returns score in response if `showResults: true`

8. **AC8**: Analytics include score distribution chart

**Integration Verification:**

- **IV1**: Non-quiz forms unchanged
- **IV2**: Scoring executes within 50ms
- **IV3**: Charts render in existing analytics component

---

### Story 29.14: Poll Template with Vote Aggregation

**As a** content creator, **I want** a poll template with duplicate prevention and real-time
results, **so that** I can gather audience opinions accurately.

**Acceptance Criteria:**

1. **AC1**: "Quick Poll" template created with category `POLLS`

2. **AC2**: Schema includes single RADIO field with 4-6 options

3. **AC3**: Business logic config:
   `{type: 'poll', voteField, preventDuplicates, showResultsAfterVote, trackingMethod}`

4. **AC4**: `PollExecutor` strategy class created

5. **AC5**: Checks for duplicate votes by session ID

6. **AC6**: Rejects duplicate with error message

7. **AC7**: Returns vote counts if `showResultsAfterVote: true`

8. **AC8**: Results displayed with Chart.js horizontal bar chart

**Integration Verification:**

- **IV1**: Non-poll forms unchanged
- **IV2**: Uses existing session middleware
- **IV3**: Charts use existing Chart.js integration

---

### Story 29.15: Restaurant Menu Template with Order Summary

**As a** restaurant owner, **I want** a menu ordering template with order total calculation, **so
that** customers can place orders online.

**Acceptance Criteria:**

1. **AC1**: "Restaurant Menu Order" template created with category `SERVICES`

2. **AC2**: Schema: Multiple CHECKBOX fields (menu items) with nested NUMBER fields (quantities)

3. **AC3**: Each item includes `metadata.price`

4. **AC4**: Business logic config: `{type: 'order', itemFields, calculateTotal}`

5. **AC5**: `OrderExecutor` strategy class created

6. **AC6**: Calculates total: `sum(item.metadata.price * item.quantity)`

7. **AC7**: Stores order total in submission metadata

8. **AC8**: Frontend displays running total as user selects items

**Integration Verification:**

- **IV1**: Existing checkbox/number fields unchanged
- **IV2**: Calculation executes within 50ms
- **IV3**: Order total displays in analytics

---

### Story 29.16: End-to-End Template System Testing and Documentation

**As a** QA engineer and developer, **I want** comprehensive E2E tests and documentation, **so
that** the feature is reliable and maintainable.

**Acceptance Criteria:**

1. **AC1**: Playwright E2E suite created covering: selection, preview, application, submission with
   business logic

2. **AC2**: E2E test verifies product inventory decrement

3. **AC3**: E2E test verifies appointment booking conflict

4. **AC4**: E2E test verifies quiz scoring

5. **AC5**: E2E test verifies poll duplicate prevention

6. **AC6**: Backend unit tests achieve 90%+ coverage for services and executors

7. **AC7**: Frontend component tests for all template components

8. **AC8**: API documentation updated at `/api-docs`

9. **AC9**: User guide created in `docs/user-guide/form-templates.md`

10. **AC10**: Architecture docs updated in `docs/architecture/template-system.md`

**Integration Verification:**

- **IV1**: All existing E2E tests pass
- **IV2**: E2E suite executes within 5 minutes
- **IV3**: Documentation builds correctly

---

## Epic Summary

**Total Stories**: 16 stories spanning backend foundation to specialized templates and comprehensive
testing

**Story Dependencies:**

- Stories 29.1-29.5 (Backend Foundation) → Must complete sequentially
- Story 29.2 (Shared Types) → Blocks all other stories
- Stories 29.6-29.8 (Frontend UI) → Depend on backend API (29.5)
- Stories 29.9-29.10 (Admin Interface) → Depend on backend API (29.5)
- Stories 29.11-29.15 (Template Types) → Can be developed in parallel after foundation
- Story 29.16 (Testing) → Final story, integrates all previous work

**Estimated Complexity**: Similar to Epic 19 (Step Forms) or Epic 23-25 (Theme System) - Major
feature with cross-stack implementation

**Risk Mitigation Sequence**:

1. Database schema first (Story 29.1) - allows rollback before UI work
2. Shared types second (Story 29.2) - establishes contracts early
3. Backend API complete (Stories 29.3-29.5) - testable independently
4. Template selection UI (Stories 29.6-29.8) - validates backend integration
5. Specialized templates incrementally (Stories 29.11-29.15) - isolated business logic
6. Comprehensive testing last (Story 29.16) - validates entire system

---

## Change Log

| Change           | Date       | Version | Description                                                                                                     | Author          |
| ---------------- | ---------- | ------- | --------------------------------------------------------------------------------------------------------------- | --------------- |
| Initial Creation | 2025-01-09 | 1.0     | Epic 29 PRD created with 16 stories covering form template system with business logic for 6 template categories | John (PM Agent) |
