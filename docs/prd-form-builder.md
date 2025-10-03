# NodeAngularFullStack Brownfield Enhancement PRD: Form Builder Tool

## Intro Project Analysis and Context

### Analysis Source

**IDE-based fresh analysis** with existing project documentation available

### Existing Project Overview

#### Current Project State

NodeAngularFullStack is a production-ready full-stack TypeScript monorepo application implementing a
containerized architecture with Angular 20+ frontend and Express.js backend. The project currently
includes:

- **Primary Purpose**: Modern full-stack boilerplate providing comprehensive foundation for rapid
  application development
- **Core Features**: JWT authentication, role-based access control (Admin/User/ReadOnly), PostgreSQL
  database with multi-tenancy support, configurable tools system
- **Tools Ecosystem**: The application includes a pluggable "tools" feature where users can access
  various utility applications (SVG Drawing, Calendar, Map, Markdown Editor, Short Links, Todo App)
- **Deployment**: Docker-based containerization with Digital Ocean App Platform for production,
  development environment with hot-reload

### Available Documentation Analysis

#### Available Documentation

✅ **Tech Stack Documentation** - Complete architecture document with technology stack table ✅
**Source Tree/Architecture** - Monorepo structure documented with apps/ and packages/ organization
✅ **API Documentation** - Express.js routes with Swagger/OpenAPI documentation ✅ **Coding
Standards** - TypeScript strict mode, ESLint + Prettier configuration ✅ **Database Schema** -
PostgreSQL schema with user management, authentication, and tools tables ⚠️ **UX/UI Guidelines** -
Partial (PrimeNG + Tailwind CSS patterns established in existing tools)

**Documentation Quality**: Project has comprehensive technical documentation from greenfield
development. Architecture document (v1.0) provides complete tech stack, deployment infrastructure,
and design patterns.

### Enhancement Scope Definition

#### Enhancement Type

✅ **New Feature Addition** - Adding Form Builder and Form Renderer as new tool in existing tools
ecosystem

#### Enhancement Description

Add a drag-and-drop Form Builder tool that allows users to create custom forms with a visual editor,
save form schemas to the database, publish forms with secure tokenized URLs, and render those forms
dynamically for end-users to fill out. This enhancement integrates into the existing "tools" feature
alongside SVG Drawing, Calendar, and other utilities.

#### Impact Assessment

✅ **Moderate Impact** - Some existing code changes required

**Integration Points:**

- Tools listing and management (existing tools.routes.ts and ToolsService)
- Database schema extension (new tables for forms, form schemas, and submissions)
- Angular tools components directory pattern (following svg-drawing/ structure)
- Authentication and authorization (existing JWT + role-based access)
- API routing pattern (following existing RESTful conventions)

**Affected Areas:**

- Frontend: New tool component in `/apps/web/src/app/features/tools/components/form-builder/`
- Backend: New API routes in `/apps/api/src/routes/forms.routes.ts`
- Database: New migrations for forms-related tables
- Shared: New TypeScript interfaces for form schemas in `/packages/shared/`

### Goals and Background Context

#### Goals

- Enable users to create custom forms using drag-and-drop interface without writing code
- Provide secure, tokenized form sharing with expiration support
- Capture form submissions with proper validation and data storage
- Integrate seamlessly with existing tools ecosystem and design patterns
- Support conditional field visibility and advanced form logic
- Maintain production-grade security with rate limiting and token validation

#### Background Context

The NodeAngularFullStack application currently provides various productivity tools (SVG Drawing,
Calendar, Todo App, etc.) accessible to authenticated users. Users have requested the ability to
create custom forms for surveys, data collection, event registration, and feedback gathering without
requiring developer intervention.

This enhancement fills a critical gap in the tools ecosystem by providing dynamic form creation
capabilities. The Form Builder will follow the established patterns of existing tools (component
structure, API design, database integration) while introducing new capabilities around schema-based
form rendering, secure public access via tokens, and submission management.

### Change Log

| Change      | Date       | Version | Description                                         | Author    |
| ----------- | ---------- | ------- | --------------------------------------------------- | --------- |
| Initial PRD | 2025-10-03 | v1.0    | Created brownfield PRD for Form Builder enhancement | John (PM) |

---

## Requirements

### Functional Requirements

**FR1: Form Builder Interface** The system shall provide a drag-and-drop form builder interface with
three-panel layout: left palette (available form components), center canvas (form design area), and
right properties panel (selected field configuration).

**FR2: Form Component Palette** The palette shall include the following draggable components: text
input, email input, number input, select dropdown, textarea, file upload, checkbox, radio button
group, date picker, datetime picker, toggle switch, and section divider.

**FR3: Field Configuration** Users shall be able to configure each field with: label, unique name,
placeholder text, help text, validation rules (required, min/max values, min/max length, pattern
regex, email format), default values, disabled state, readonly state, and conditional visibility
rules.

**FR4: Select/Radio Options Management** For select dropdowns and radio button groups, users shall
be able to add, edit, remove, and reorder options with value/label pairs, and configure multi-select
capability for dropdowns.

**FR5: Form Settings** Users shall configure global form settings including: form title,
description, column layout (1-3 columns), field spacing, submission behavior, and form metadata.

**FR6: Draft and Publish Workflow** Users shall be able to save forms as drafts (private, editable)
and publish forms (generates secure token and public render URL, sets expiration date/time).

**FR7: Form Schema Validation** The system shall prevent duplicate field names, validate regex
patterns, ensure required fields have labels, and block publishing of forms with critical errors.

**FR8: Drag-and-Drop Reordering** Users shall be able to reorder form fields on the canvas via
drag-and-drop with visual feedback.

**FR9: Form Renderer - Token Access** The system shall provide a public-facing form renderer
accessible via tokenized URL (`/r/:token`) that validates token authenticity, publication status,
and expiration before rendering.

**FR10: Dynamic Form Generation** The renderer shall dynamically build Angular Reactive Forms from
the JSON schema, applying all configured validators and field properties.

**FR11: Conditional Visibility** The renderer shall support reactive conditional field visibility
based on `showIf` rules, automatically clearing values when fields are hidden.

**FR12: Form Validation and Submission** The renderer shall display inline validation error
messages, disable submit button while form is invalid or submitting, handle file uploads via
FormData, and submit captured values to the backend.

**FR13: Submission Storage** The system shall store form submissions with form ID, submitted values
object, submission timestamp, and optional user metadata (if authenticated).

**FR14: Builder-Renderer Parity** Published forms shall render identically to the builder preview,
ensuring WYSIWYG accuracy.

### Non-Functional Requirements

**NFR1: Performance** Form builder interface shall remain responsive with forms containing up to 100
fields. Form rendering shall complete within 500ms for forms with up to 50 fields.

**NFR2: Security** All render URLs shall use cryptographically secure signed tokens. The system
shall enforce expiration timestamps server-side. Public render and submission endpoints shall be
rate-limited (10 requests/minute per IP).

**NFR3: Validation** All form constraints shall be re-validated server-side on submission to prevent
client-side bypass.

**NFR4: Accessibility** All form fields shall have proper label associations and aria-describedby
attributes. Drag-drop functionality shall have keyboard alternatives (up/down arrow reordering).

**NFR5: Data Sanitization** All user-provided text (labels, help text, options) shall be sanitized
to prevent XSS injection.

**NFR6: Compatibility with Existing System** Form Builder shall maintain existing performance
characteristics. Memory usage shall not exceed current baseline by more than 15% when Form Builder
tool is active.

**NFR7: Internationalization** Validation error messages shall support localization. UI shall
support RTL languages where applicable.

**NFR8: Browser Support** Form renderer shall work in all browsers supported by existing application
(Chrome, Firefox, Safari, Edge - latest 2 versions).

### Compatibility Requirements

**CR1: Existing API Compatibility** All existing API endpoints (`/auth`, `/users`, `/tools`,
`/tokens`) shall remain unchanged. New form endpoints shall follow existing RESTful conventions and
versioning strategy.

**CR2: Database Schema Compatibility** New database tables (`forms`, `form_schemas`,
`form_submissions`) shall use existing PostgreSQL connection pooling and migration system.
Multi-tenancy support shall be maintained if enabled. New tables shall not modify existing user,
tenant, or tools table structures.

**CR3: UI/UX Consistency** Form Builder shall use existing PrimeNG 17+ components and Tailwind CSS
utilities. Layout shall follow existing tools component pattern (standalone Angular components with
OnPush change detection). Design shall match existing tool styles (SVG Drawing, Calendar, Todo App
navigation and layout).

**CR4: Integration Compatibility** Form Builder shall integrate with existing tools listing page.
New tool shall appear in tools navigation with appropriate role-based access control. Authentication
shall use existing JWT + Passport.js strategy. File uploads shall use existing file storage
configuration (DigitalOcean Spaces or local).

---

## Technical Constraints and Integration Requirements

### Existing Technology Stack

**Languages**: TypeScript 5.3+

**Frontend Frameworks**:

- Angular 20+ (standalone components, signals-based state)
- PrimeNG 17+ (UI component library)
- Tailwind CSS 3.4+ (utility-first styling)
- NgRx Signals (reactive state management)

**Backend Frameworks**:

- Express.js 4.19+ (TypeScript)
- Passport.js (JWT authentication)

**Database**: PostgreSQL 15+ with connection pooling

**Infrastructure**:

- Docker Compose for development
- Digital Ocean App Platform for production
- Redis 7+ (session caching)
- DigitalOcean Spaces (S3-compatible file storage)

**External Dependencies**:

- @angular/cdk/drag-drop (already installed, used for drag-drop functionality)
- @angular/forms (Reactive Forms, already installed)
- express-validator (backend validation)
- jsonwebtoken (JWT signing for render tokens)
- express-rate-limit (rate limiting middleware)

**Version Constraints**: Node.js 18+, npm 9+

### Integration Approach

**Database Integration Strategy**

Form Builder will add three new tables to the existing PostgreSQL schema using the established
migration system:

1. **`forms` table**: Core form metadata (id, user_id, tenant_id, title, description, status,
   created_at, updated_at)
2. **`form_schemas` table**: JSON schema storage (id, form_id, schema_version, schema_json,
   is_published, render_token, expires_at)
3. **`form_submissions` table**: Submission data (id, form_schema_id, values_json, submitted_at,
   submitter_ip, user_id nullable)

**Migration file location**:
`/apps/api/database/migrations/YYYYMMDDHHMMSS_create_form_builder_tables.ts`

**Connection**: Use existing `src/database/pool.ts` connection pooling

**Multi-tenancy**: If `ENABLE_MULTI_TENANCY=true`, forms table includes `tenant_id` foreign key to
`tenants` table

**API Integration Strategy**

New Express.js routes following existing patterns:

**Protected Routes** (require JWT authentication):

- `POST /api/forms` - Create draft form
- `GET /api/forms` - List user's forms
- `GET /api/forms/:id` - Get form details
- `PUT /api/forms/:id` - Update draft form
- `POST /api/forms/:id/publish` - Publish form (generates token)
- `DELETE /api/forms/:id` - Delete form
- `GET /api/forms/:id/submissions` - List form submissions

**Public Routes** (rate-limited, no auth):

- `GET /api/public/forms/render/:token` - Fetch form schema by token
- `POST /api/public/forms/submit/:token` - Submit form data

**Route file**: `/apps/api/src/routes/forms.routes.ts`

**Middleware stack**: AuthMiddleware → XSS protection → Validators → Rate limiter (public routes) →
Controllers

**Validators**: `/apps/api/src/validators/forms.validator.ts` using express-validator

**Controllers**: `/apps/api/src/controllers/forms.controller.ts`

**Repositories**: `/apps/api/src/repositories/forms.repository.ts` (follows Repository Pattern)

**Frontend Integration Strategy**

Form Builder component structure following SVG Drawing tool pattern:

**Location**: `/apps/web/src/app/features/tools/components/form-builder/`

**Component Structure**:

```
form-builder/
├── form-builder.component.ts        # Main container component
├── form-builder.component.html
├── form-builder.component.scss
├── form-builder.component.spec.ts
├── form-builder.service.ts          # State management & API calls
├── form-builder.service.spec.ts
├── components/                       # Sub-components
│   ├── field-palette/               # Left sidebar palette
│   ├── form-canvas/                 # Center canvas area
│   ├── field-properties/            # Right sidebar properties
│   ├── form-settings/               # Global form settings dialog
│   └── form-renderer/               # Dynamic form renderer (public route)
└── models/                          # Local types and interfaces
    └── form-schema.models.ts
```

**Routing**:

- `/tools/form-builder` - Builder interface (authenticated)
- `/forms/render/:token` - Public form renderer (no auth)

**State Management**: Angular signals for component-level state, service layer for API communication

**PrimeNG Components Used**: Dialog, Button, InputText, Dropdown, Checkbox, Toast, DragDrop (from
CDK)

**Testing Integration Strategy**

Follow existing testing patterns:

**Frontend Tests**:

- Unit tests: `form-builder.component.spec.ts` using Karma + Jasmine
- Service tests: `form-builder.service.spec.ts`
- Component tests for all sub-components
- Coverage target: 80%+ (matching existing tools)

**Backend Tests**:

- Unit tests: `/apps/api/tests/unit/controllers/forms.controller.test.ts`
- Integration tests: `/apps/api/tests/integration/forms.routes.test.ts`
- Repository tests: `/apps/api/tests/unit/repositories/forms.repository.test.ts`
- Security tests: Token validation, rate limiting, XSS prevention

**E2E Tests**:

- Playwright tests: `/tests/e2e/form-builder.spec.ts`
- Test scenarios: Create form → Publish → Submit → Verify submission

### Code Organization and Standards

**File Structure Approach**

Follow existing monorepo structure:

- Shared types in `/packages/shared/src/types/forms.types.ts`
- Frontend in `/apps/web/src/app/features/tools/components/form-builder/`
- Backend in `/apps/api/src/` (routes, controllers, repositories, validators)
- Tests alongside source files (`*.spec.ts` and `*.test.ts`)

**Naming Conventions**

- Components: `kebab-case` files, `PascalCase` class names
- Services: `kebab-case.service.ts`
- Routes: `plural-noun.routes.ts` (e.g., `forms.routes.ts`)
- Database tables: `snake_case` (e.g., `form_schemas`)
- TypeScript interfaces: `PascalCase` (e.g., `FormSchema`, `FormSubmission`)
- API endpoints: `kebab-case` (e.g., `/api/forms/:id/submissions`)

**Coding Standards**

- TypeScript strict mode enabled
- ESLint + Prettier (existing configuration)
- No `any` types (use `unknown` or proper typing)
- JSDoc comments for public APIs
- Angular OnPush change detection strategy
- Reactive Forms (no template-driven forms)
- Repository pattern for database access
- Express-validator for request validation

**Documentation Standards**

- OpenAPI/Swagger annotations for all API endpoints
- JSDoc comments for services and controllers
- Inline comments for complex business logic
- README in form-builder component directory explaining architecture
- Migration files with descriptive comments

### Deployment and Operations

**Build Process Integration**

Form Builder requires no changes to existing build process:

- Shared types built first: `npm run build:shared`
- Backend built: `npm run build:api`
- Frontend built: `npm run build:web`
- All builds use existing TypeScript compilation targets

**Deployment Strategy**

Follow existing Docker deployment:

- Development: `./start-dev.sh` starts all services including Form Builder
- Production: Docker Compose builds include Form Builder automatically
- Database migrations run automatically on deployment
- Environment variables for feature toggles (e.g., `ENABLE_FORM_BUILDER=true`)

**Monitoring and Logging**

- Use existing Winston logger for backend
- Structured logging for form creation, publication, submission events
- Error tracking via existing Sentry integration
- Form Builder metrics: forms created, published, submission count

**Configuration Management**

Environment variables (`.env` file):

```
# Form Builder Configuration
FORM_RENDER_TOKEN_SECRET=<secret_key>
FORM_RENDER_TOKEN_EXPIRY=30d
FORM_SUBMISSION_RATE_LIMIT=10
FORM_MAX_FIELDS=100
FORM_FILE_UPLOAD_MAX_SIZE=10485760  # 10MB
```

### Risk Assessment and Mitigation

**Technical Risks**

1. **Risk**: Complex drag-drop UI may have performance issues with large forms
   - **Mitigation**: Implement virtual scrolling for canvas, lazy-load field properties, use OnPush
     change detection
   - **Validation**: Performance testing with 100+ field forms

2. **Risk**: Token-based public access could be abused for spam submissions
   - **Mitigation**: Rate limiting (10 req/min), CAPTCHA option, IP-based throttling, expiration
     enforcement
   - **Validation**: Load testing on public endpoints

3. **Risk**: JSON schema validation complexity could lead to security vulnerabilities
   - **Mitigation**: Server-side re-validation, schema sanitization, whitelist allowed field types,
     regex pattern validation
   - **Validation**: Security testing with malicious payloads

**Integration Risks**

1. **Risk**: Database schema changes could conflict with existing migrations
   - **Mitigation**: Use sequential migration timestamps, test migrations on fresh database, include
     rollback scripts
   - **Validation**: Migration testing in CI/CD pipeline

2. **Risk**: New API routes could conflict with existing routing
   - **Mitigation**: Use distinct `/api/forms` prefix, follow existing route patterns, test route
     precedence
   - **Validation**: Integration tests covering all routes

**Deployment Risks**

1. **Risk**: Large JSON schemas could exceed database column size limits
   - **Mitigation**: Use JSONB type with compression, set max field limit (100), validate schema
     size before save
   - **Validation**: Test with maximum-size form schemas

2. **Risk**: File upload handling could introduce security vulnerabilities
   - **Mitigation**: Use existing file storage service, validate file types, scan uploads, limit
     file sizes
   - **Validation**: Security audit of file upload flow

**Mitigation Strategies**

- **Rollback Plan**: Database migrations include `down()` scripts for reversal
- **Feature Toggle**: `ENABLE_FORM_BUILDER` environment variable allows disabling feature
- **Backward Compatibility**: No changes to existing tables or API endpoints
- **Incremental Rollout**: Deploy to staging environment first, monitor for 48 hours before
  production
- **Monitoring**: Set up alerts for form submission rate spikes, token validation failures, database
  query performance

---

## Epic and Story Structure

### Epic Approach

**Epic Structure Decision**: **Single Comprehensive Epic** with 10 logically sequenced stories

**Rationale**: The Form Builder and Form Renderer are tightly coupled features that deliver value as
a cohesive unit. Splitting into multiple epics would create artificial boundaries and complicate
dependencies between database schema, API routes, and frontend components. A single epic ensures
proper sequencing from foundation (shared types, database) through backend API, frontend builder
interface, publishing workflow, and finally the public renderer. This approach minimizes integration
risk while maintaining story-level atomicity for testing and rollback.

**Story Sequencing Strategy**: Bottom-up implementation starting with data layer (shared types,
database schema, repositories) → API layer (CRUD operations, publishing) → Frontend builder
(component structure, drag-drop UI) → Publishing workflow (token generation, expiration) → Public
renderer (dynamic forms, submissions) → Security hardening and testing.

---

## Epic 1: Form Builder and Dynamic Form Renderer

**Epic Goal**: Enable authenticated users to create, publish, and share custom forms via
drag-and-drop builder interface, with public-facing dynamic form renderer supporting submissions,
validation, and secure tokenized access.

**Integration Requirements**:

- Integrate with existing tools ecosystem (`/tools` routes and navigation)
- Use existing authentication (JWT + Passport.js) for builder access
- Follow established database migration and repository patterns
- Maintain existing API versioning and error handling conventions
- Use PrimeNG + Tailwind CSS for UI consistency with other tools

### Story 1.1: Form Builder Shared Types and Database Schema

As a **backend developer**, I want **to define shared TypeScript types and create database tables
for forms, form schemas, and submissions**, so that **both frontend and backend have type-safe
interfaces and persistent storage for form data**.

#### Acceptance Criteria

1. **AC1**: Shared types package includes `FormField`, `FormSchema`, `FormMetadata`,
   `FormSubmission` interfaces in `/packages/shared/src/types/forms.types.ts`
2. **AC2**: Database migration creates `forms` table with columns: id (UUID), user_id (FK),
   tenant_id (FK nullable), title (varchar), description (text), status (enum: draft/published),
   created_at, updated_at
3. **AC3**: Database migration creates `form_schemas` table with columns: id (UUID), form_id (FK),
   schema_version (int), schema_json (JSONB), is_published (boolean), render_token (varchar unique
   nullable), expires_at (timestamp nullable), created_at, updated_at
4. **AC4**: Database migration creates `form_submissions` table with columns: id (UUID),
   form_schema_id (FK), values_json (JSONB), submitted_at (timestamp), submitter_ip (inet), user_id
   (FK nullable), metadata (JSONB nullable)
5. **AC5**: Migration includes proper indexes on foreign keys, render_token, and expires_at columns
6. **AC6**: Migration includes `up()` and `down()` scripts for rollback capability
7. **AC7**: Shared types built successfully with `npm run build:shared`
8. **AC8**: TypeScript strict mode passes for all shared types (no `any` types)

#### Integration Verification

- **IV1**: Migration runs successfully on existing database without errors using
  `npm --workspace=apps/api run db:migrate`
- **IV2**: Existing database tables (users, tenants, tools, etc.) remain unchanged after migration
- **IV3**: Multi-tenancy foreign key constraint only applied when `ENABLE_MULTI_TENANCY=true`
  environment variable is set
- **IV4**: Shared types package can be imported by both `apps/api` and `apps/web` without circular
  dependencies
- **IV5**: No breaking changes to existing shared types in `/packages/shared/src/`

---

### Story 1.2: Form Repository and Service Layer

As a **backend developer**, I want **to implement repository pattern for form data access and
service layer for business logic**, so that **database operations are abstracted and form
creation/management logic is centralized**.

#### Acceptance Criteria

1. **AC1**: `FormsRepository` class in `/apps/api/src/repositories/forms.repository.ts` implements
   methods: `create()`, `findById()`, `findByUserId()`, `update()`, `delete()`
2. **AC2**: `FormSchemasRepository` class implements methods: `createSchema()`, `findByFormId()`,
   `findByToken()`, `updateSchema()`, `publishSchema()`, `unpublishSchema()`
3. **AC3**: `FormSubmissionsRepository` class implements methods: `create()`,
   `findByFormSchemaId()`, `findByFormId()`, `countByFormSchemaId()`
4. **AC4**: All repositories use existing connection pool from `src/database/pool.ts`
5. **AC5**: `FormsService` class in `/apps/api/src/services/forms.service.ts` implements business
   logic: `createForm()`, `publishForm()`, `validateFormSchema()`, `generateRenderToken()`
6. **AC6**: Token generation uses `jsonwebtoken` library with `FORM_RENDER_TOKEN_SECRET` from
   environment
7. **AC7**: Form schema validation prevents duplicate field names and validates regex patterns
8. **AC8**: Service layer includes JSDoc comments for all public methods

#### Integration Verification

- **IV1**: Repository tests pass using existing test database configuration
- **IV2**: Repository pattern follows same structure as existing repositories (users.repository.ts,
  tools.repository.ts)
- **IV3**: Service layer properly handles multi-tenancy when enabled (tenant_id filtering)
- **IV4**: Database connection pooling remains stable with new queries (no connection leaks)
- **IV5**: Error handling uses existing error classes from `src/utils/errors.ts`

---

### Story 1.3: Form Builder API Routes and Controllers

As a **backend developer**, I want **to create RESTful API endpoints for form CRUD operations with
proper authentication and validation**, so that **authenticated users can manage their forms via
HTTP API**.

#### Acceptance Criteria

1. **AC1**: `/apps/api/src/routes/forms.routes.ts` implements protected routes: `POST /api/forms`,
   `GET /api/forms`, `GET /api/forms/:id`, `PUT /api/forms/:id`, `DELETE /api/forms/:id`
2. **AC2**: All routes use `AuthMiddleware.authenticate` for JWT validation
3. **AC3**: Routes include role-based access control (users can only access their own forms, admins
   can access all)
4. **AC4**: `FormsController` in `/apps/api/src/controllers/forms.controller.ts` handles all route
   logic
5. **AC5**: Request validators in `/apps/api/src/validators/forms.validator.ts` validate: title
   (required, max 200 chars), description (max 2000 chars), schema JSON structure
6. **AC6**: XSS protection middleware sanitizes all text inputs (title, description, field labels)
7. **AC7**: All routes include OpenAPI/Swagger JSDoc annotations
8. **AC8**: Error responses follow existing error format with status codes and messages

#### Integration Verification

- **IV1**: New routes registered in `src/index.ts` with prefix `/api/forms`
- **IV2**: Existing routes (`/api/auth`, `/api/users`, `/api/tools`) remain functional after adding
  forms routes
- **IV3**: Authentication uses existing JWT strategy from `src/config/passport.ts`
- **IV4**: Validation follows same pattern as existing validators (tools.validator.ts,
  users.validator.ts)
- **IV5**: Integration tests verify route precedence and no conflicts with existing endpoints

---

### Story 1.4: Form Builder Frontend Component Structure

As a **frontend developer**, I want **to create the Form Builder component structure with Angular
standalone components**, so that **the UI foundation is ready for implementing builder features**.

#### Acceptance Criteria

1. **AC1**: Main component created at
   `/apps/web/src/app/features/tools/components/form-builder/form-builder.component.ts` as
   standalone component
2. **AC2**: Component uses `ChangeDetectionStrategy.OnPush` for performance
3. **AC3**: Service `form-builder.service.ts` created with signals for state management:
   `currentForm`, `formFields`, `selectedField`, `isDirty`
4. **AC4**: Sub-components created: `field-palette.component.ts`, `form-canvas.component.ts`,
   `field-properties.component.ts`, `form-settings.component.ts`
5. **AC5**: Routing configured: `/tools/form-builder` route in tools routing module
6. **AC6**: Component imports PrimeNG modules: Dialog, Button, InputText, Dropdown, Toast
7. **AC7**: Three-panel layout implemented in HTML with Tailwind CSS: left sidebar (palette), center
   (canvas), right sidebar (properties)
8. **AC8**: Component spec file includes basic smoke tests (component creation, service injection)

#### Integration Verification

- **IV1**: Form Builder appears in tools navigation menu when user is authenticated
- **IV2**: Component follows same structure as existing tools (svg-drawing, calendar, todo-app)
- **IV3**: Lazy loading works correctly (component only loaded when route activated)
- **IV4**: Existing tools remain accessible and functional after adding Form Builder route
- **IV5**: Responsive layout tested on desktop and tablet breakpoints

---

### Story 1.5: Drag-and-Drop Field Palette and Canvas

As a **form creator**, I want **to drag form field components from a palette onto a canvas**, so
that **I can visually build my form layout**.

#### Acceptance Criteria

1. **AC1**: Field palette displays draggable components: Text Input, Email, Number, Select,
   Textarea, File Upload, Checkbox, Radio Group, Date, DateTime, Toggle, Section Divider
2. **AC2**: Angular CDK DragDrop module integrated for drag-and-drop functionality
3. **AC3**: Canvas accepts dropped fields and displays them in order
4. **AC4**: Each dropped field shows: field type icon, label (default: "Untitled Field"), drag
   handle for reordering
5. **AC5**: Fields can be reordered on canvas via drag-and-drop
6. **AC6**: Clicking a field on canvas selects it and shows properties in right sidebar
7. **AC7**: Visual feedback during drag: ghost preview, drop zones highlighted, invalid drop areas
   indicated
8. **AC8**: Keyboard accessibility: Tab to navigate fields, Arrow keys to reorder, Enter to select
9. **AC9**: Empty canvas shows helpful hint: "Drag fields from the palette to start building your
   form"
10. **AC10**: Service tracks field array with unique IDs, types, and properties

#### Integration Verification

- **IV1**: Drag-drop uses same CDK version as existing components (check package.json)
- **IV2**: Canvas rendering performance remains smooth with 50+ fields
- **IV3**: Touch gestures work on tablet devices (if supported by CDK)
- **IV4**: Undo/redo capability considered for future enhancement (noted in technical debt)
- **IV5**: Canvas state persists when switching between draft forms

---

### Story 1.6: Field Properties Configuration Panel

As a **form creator**, I want **to configure properties for selected form fields in a properties
panel**, so that **I can customize labels, validation rules, and behavior for each field**.

#### Acceptance Criteria

1. **AC1**: Properties panel displays when a field is selected on canvas
2. **AC2**: Common properties for all field types: Label (required), Field Name (required, unique,
   kebab-case auto-generated from label), Placeholder, Help Text
3. **AC3**: Validation properties: Required toggle, Min/Max (for numbers), Min/Max Length (for
   text), Pattern (regex with validation), Email format toggle
4. **AC4**: Behavior properties: Disabled toggle, Read-only toggle, Default Value
5. **AC5**: Conditional visibility: "Show If" rule builder with field selection, operator (equals,
   not equals, contains), and value
6. **AC6**: Select/Radio specific properties: Options list (add/edit/remove), Value/Label pairs,
   Reorder options, Multi-select toggle (select only)
7. **AC7**: File upload specific properties: Accepted file types (MIME types), Max file size, Max
   files count
8. **AC8**: Properties panel uses reactive forms for real-time validation
9. **AC9**: Duplicate field name detection with error message
10. **AC10**: Changes immediately reflected in canvas field preview

#### Integration Verification

- **IV1**: Properties panel uses PrimeNG form controls matching existing application style
- **IV2**: Validation follows same pattern as existing forms in application
- **IV3**: Regex pattern validation prevents invalid patterns from being saved
- **IV4**: Field name uniqueness check queries current form schema only (not global)
- **IV5**: Properties panel remains responsive when editing fields in 100+ field forms

---

### Story 1.7: Form Settings and Draft Persistence

As a **form creator**, I want **to configure global form settings and save drafts to the database**,
so that **I can set form-wide options and resume editing later**.

#### Acceptance Criteria

1. **AC1**: Form settings dialog accessible via toolbar button
2. **AC2**: Settings include: Form Title (required), Form Description, Column Layout (1-3 columns),
   Field Spacing (compact/normal/relaxed)
3. **AC3**: Submission settings: Success message, Redirect URL (optional), Allow multiple
   submissions toggle
4. **AC4**: "Save Draft" button calls `POST /api/forms` API to create new form or
   `PUT /api/forms/:id` to update
5. **AC5**: Draft saves form metadata (title, description, settings) and current schema JSON
6. **AC6**: Auto-save every 30 seconds if form is dirty (unsaved changes)
7. **AC7**: "My Forms" list view shows all user's draft and published forms with last modified date
8. **AC8**: Load existing draft populates canvas, properties, and settings
9. **AC9**: Dirty state indicator shows unsaved changes with warning before navigation
10. **AC10**: Delete draft confirms action and calls `DELETE /api/forms/:id` API

#### Integration Verification

- **IV1**: Form list integrates with existing tools listing page (separate tab or section)
- **IV2**: API calls use existing HTTP client service and error handling
- **IV3**: Auto-save debounces to prevent excessive API calls
- **IV4**: Form data persists correctly across browser refresh
- **IV5**: Multi-tenancy: Forms filtered by tenant_id when multi-tenancy enabled

---

### Story 1.8: Form Publishing and Token Generation

As a **form creator**, I want **to publish my form and receive a secure shareable URL**, so that **I
can distribute the form to respondents via the public renderer**.

#### Acceptance Criteria

1. **AC1**: "Publish" button validates form schema before allowing publish (all required fields have
   labels, no duplicate field names, valid regex patterns)
2. **AC2**: Publish dialog shows: Expiration date/time picker (default: 30 days), Preview of render
   URL
3. **AC3**: `POST /api/forms/:id/publish` endpoint generates cryptographically secure token using
   JWT
4. **AC4**: Token payload includes: formSchemaId, expiresAt, issuer, issued time
5. **AC5**: Render URL format: `https://{domain}/forms/render/{token}`
6. **AC6**: Published form creates new form_schema record with `is_published=true`, render_token,
   and expires_at
7. **AC7**: Re-publishing updates existing schema or creates new version (based on user choice)
8. **AC8**: Unpublish option revokes token (sets `is_published=false`) and invalidates render URL
9. **AC9**: Copy URL button copies render URL to clipboard with toast notification
10. **AC10**: Published forms marked as read-only in draft editor (must unpublish to edit)

#### Integration Verification

- **IV1**: Token generation uses existing JWT secret management pattern
- **IV2**: Token expiration enforced server-side on render requests
- **IV3**: Published forms remain accessible via old tokens until expiration (versioning support)
- **IV4**: Form status updates reflected in forms list view (draft vs published badge)
- **IV5**: Rate limiting applied to publish endpoint to prevent abuse (max 10 publishes per hour per
  user)

---

### Story 1.9: Public Form Renderer with Dynamic Form Generation

As a **form respondent**, I want **to access a published form via tokenized URL and fill it out**,
so that **I can submit my responses to the form creator**.

#### Acceptance Criteria

1. **AC1**: Public route `/forms/render/:token` accessible without authentication
2. **AC2**: `GET /api/public/forms/render/:token` endpoint validates token, checks expiration, and
   returns form schema
3. **AC3**: Invalid/expired token shows error page with message
4. **AC4**: Form renderer component dynamically builds Angular Reactive FormGroup from schema JSON
5. **AC5**: All field types render correctly: text inputs, selects, checkboxes, radio groups, date
   pickers, file uploads
6. **AC6**: Validators applied based on schema: required, min/max, email, pattern
7. **AC7**: Conditional visibility rules evaluated reactively (fields show/hide based on form
   values)
8. **AC8**: Hidden fields have values cleared automatically
9. **AC9**: Inline validation messages display below fields on blur
10. **AC10**: Submit button disabled while form invalid or submitting
11. **AC11**: Column layout (1-3 columns) rendered based on form settings
12. **AC12**: Form styling matches published form's configured theme

#### Integration Verification

- **IV1**: Public route does not require authentication (bypasses AuthGuard)
- **IV2**: Rate limiting applied to render endpoint (10 requests per minute per IP)
- **IV3**: Form renders correctly in all supported browsers (Chrome, Firefox, Safari, Edge)
- **IV4**: Mobile responsive layout tested on phone and tablet
- **IV5**: Accessibility: All fields have labels, keyboard navigation works, screen reader
  compatible

---

### Story 1.10: Form Submission Handling and Security Hardening

As a **form respondent**, I want **to submit my form responses securely**, so that **my data is
validated, stored, and the form creator can review submissions**.

#### Acceptance Criteria

1. **AC1**: `POST /api/public/forms/submit/:token` endpoint validates token and processes submission
2. **AC2**: Server-side validation re-validates all form constraints (required, min/max, email,
   pattern)
3. **AC3**: File uploads handled via FormData, files stored in DigitalOcean Spaces (or local
   storage), metadata saved in submission
4. **AC4**: Submission stored in `form_submissions` table with: form_schema_id, values_json,
   submitted_at, submitter_ip, user_id (if authenticated)
5. **AC5**: XSS sanitization applied to all text inputs before storage
6. **AC6**: Rate limiting on submit endpoint: 10 submissions per hour per IP for unauthenticated
   users
7. **AC7**: CAPTCHA challenge displayed after 3 submissions from same IP (optional, configurable)
8. **AC8**: Success page shows custom success message from form settings or default message
9. **AC9**: Optional redirect to external URL after successful submission (if configured)
10. **AC10**: Form creator can view submissions list: `GET /api/forms/:id/submissions`
    (authenticated, owner only)
11. **AC11**: Submissions list shows: submitted date, field values (truncated), submitter IP (masked
    for privacy)
12. **AC12**: Export submissions as CSV functionality (admin/owner only)

#### Integration Verification

- **IV1**: File upload uses existing file storage service and configuration
- **IV2**: Rate limiting uses existing express-rate-limit middleware pattern
- **IV3**: Submission queries indexed for performance (form_schema_id, submitted_at)
- **IV4**: Large form submissions (100+ fields) stored efficiently without exceeding JSONB size
  limits
- **IV5**: Security audit: SQL injection prevention, XSS protection, CSRF protection (if needed)
- **IV6**: E2E test: Create form → Publish → Access via token → Submit → Verify in database
- **IV7**: Performance test: 100 concurrent submissions handled without errors
- **IV8**: Accessibility audit: Form renderer meets WCAG 2.1 AA standards

---

## Definition of Done

- ✅ All 10 stories completed with acceptance criteria met
- ✅ Existing functionality verified through regression testing (tools ecosystem, authentication,
  database operations)
- ✅ Integration points working correctly (tools navigation, API routing, database migrations)
- ✅ Security testing passed (token validation, rate limiting, XSS prevention, server-side
  validation)
- ✅ Performance testing passed (100-field forms, concurrent submissions)
- ✅ Accessibility testing passed (WCAG 2.1 AA standards)
- ✅ E2E test suite passes (create → publish → render → submit workflow)
- ✅ Documentation updated (API docs, README in form-builder directory, environment variables guide)
- ✅ Code review completed with no critical issues
- ✅ Deployment to staging environment successful with 48-hour monitoring
- ✅ No regression in existing features (all existing tests pass)

---

**PRD Complete** **Version**: 1.0 **Created by**: John (Product Manager) **Date**: 2025-10-03
**Output File**: `/docs/prd-form-builder.md`
