# Epic 1: Form Builder and Dynamic Form Renderer

**Epic Goal**: Enable authenticated users to create, publish, and share custom forms via
drag-and-drop builder interface, with public-facing dynamic form renderer supporting submissions,
validation, and secure tokenized access.

**Integration Requirements**:

- Integrate with existing tools ecosystem (`/tools` routes and navigation)
- Use existing authentication (JWT + Passport.js) for builder access
- Follow established database migration and repository patterns
- Maintain existing API versioning and error handling conventions
- Use PrimeNG + Tailwind CSS for UI consistency with other tools

## Story 1.1: Form Builder Shared Types and Database Schema

As a **backend developer**, I want **to define shared TypeScript types and create database tables
for forms, form schemas, and submissions**, so that **both frontend and backend have type-safe
interfaces and persistent storage for form data**.

### Acceptance Criteria

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

### Integration Verification

- **IV1**: Migration runs successfully on existing database without errors using
  `npm --workspace=apps/api run db:migrate`
- **IV2**: Existing database tables (users, tenants, tools, etc.) remain unchanged after migration
- **IV3**: Multi-tenancy foreign key constraint only applied when `ENABLE_MULTI_TENANCY=true`
  environment variable is set
- **IV4**: Shared types package can be imported by both `apps/api` and `apps/web` without circular
  dependencies
- **IV5**: No breaking changes to existing shared types in `/packages/shared/src/`

---

## Story 1.2: Form Repository and Service Layer

As a **backend developer**, I want **to implement repository pattern for form data access and
service layer for business logic**, so that **database operations are abstracted and form
creation/management logic is centralized**.

### Acceptance Criteria

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

### Integration Verification

- **IV1**: Repository tests pass using existing test database configuration
- **IV2**: Repository pattern follows same structure as existing repositories (users.repository.ts,
  tools.repository.ts)
- **IV3**: Service layer properly handles multi-tenancy when enabled (tenant_id filtering)
- **IV4**: Database connection pooling remains stable with new queries (no connection leaks)
- **IV5**: Error handling uses existing error classes from `src/utils/errors.ts`

---

## Story 1.3: Form Builder API Routes and Controllers

As a **backend developer**, I want **to create RESTful API endpoints for form CRUD operations with
proper authentication and validation**, so that **authenticated users can manage their forms via
HTTP API**.

### Acceptance Criteria

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

### Integration Verification

- **IV1**: New routes registered in `src/index.ts` with prefix `/api/forms`
- **IV2**: Existing routes (`/api/auth`, `/api/users`, `/api/tools`) remain functional after adding
  forms routes
- **IV3**: Authentication uses existing JWT strategy from `src/config/passport.ts`
- **IV4**: Validation follows same pattern as existing validators (tools.validator.ts,
  users.validator.ts)
- **IV5**: Integration tests verify route precedence and no conflicts with existing endpoints

---

## Story 1.4: Form Builder Frontend Component Structure

As a **frontend developer**, I want **to create the Form Builder component structure with Angular
standalone components**, so that **the UI foundation is ready for implementing builder features**.

### Acceptance Criteria

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

### Integration Verification

- **IV1**: Form Builder appears in tools navigation menu when user is authenticated
- **IV2**: Component follows same structure as existing tools (svg-drawing, calendar, todo-app)
- **IV3**: Lazy loading works correctly (component only loaded when route activated)
- **IV4**: Existing tools remain accessible and functional after adding Form Builder route
- **IV5**: Responsive layout tested on desktop and tablet breakpoints

---

## Story 1.5: Drag-and-Drop Field Palette and Canvas

As a **form creator**, I want **to drag form field components from a palette onto a canvas**, so
that **I can visually build my form layout**.

### Acceptance Criteria

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

### Integration Verification

- **IV1**: Drag-drop uses same CDK version as existing components (check package.json)
- **IV2**: Canvas rendering performance remains smooth with 50+ fields
- **IV3**: Touch gestures work on tablet devices (if supported by CDK)
- **IV4**: Undo/redo capability considered for future enhancement (noted in technical debt)
- **IV5**: Canvas state persists when switching between draft forms

---

## Story 1.6: Field Properties Configuration Panel

As a **form creator**, I want **to configure properties for selected form fields in a properties
panel**, so that **I can customize labels, validation rules, and behavior for each field**.

### Acceptance Criteria

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

### Integration Verification

- **IV1**: Properties panel uses PrimeNG form controls matching existing application style
- **IV2**: Validation follows same pattern as existing forms in application
- **IV3**: Regex pattern validation prevents invalid patterns from being saved
- **IV4**: Field name uniqueness check queries current form schema only (not global)
- **IV5**: Properties panel remains responsive when editing fields in 100+ field forms

---

## Story 1.7: Form Settings and Draft Persistence

As a **form creator**, I want **to configure global form settings and save drafts to the database**,
so that **I can set form-wide options and resume editing later**.

### Acceptance Criteria

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

### Integration Verification

- **IV1**: Form list integrates with existing tools listing page (separate tab or section)
- **IV2**: API calls use existing HTTP client service and error handling
- **IV3**: Auto-save debounces to prevent excessive API calls
- **IV4**: Form data persists correctly across browser refresh
- **IV5**: Multi-tenancy: Forms filtered by tenant_id when multi-tenancy enabled

---

## Story 1.8: Form Publishing and Token Generation

As a **form creator**, I want **to publish my form and receive a secure shareable URL**, so that **I
can distribute the form to respondents via the public renderer**.

### Acceptance Criteria

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

### Integration Verification

- **IV1**: Token generation uses existing JWT secret management pattern
- **IV2**: Token expiration enforced server-side on render requests
- **IV3**: Published forms remain accessible via old tokens until expiration (versioning support)
- **IV4**: Form status updates reflected in forms list view (draft vs published badge)
- **IV5**: Rate limiting applied to publish endpoint to prevent abuse (max 10 publishes per hour per
  user)

---

## Story 1.9: Public Form Renderer with Dynamic Form Generation

As a **form respondent**, I want **to access a published form via tokenized URL and fill it out**,
so that **I can submit my responses to the form creator**.

### Acceptance Criteria

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

### Integration Verification

- **IV1**: Public route does not require authentication (bypasses AuthGuard)
- **IV2**: Rate limiting applied to render endpoint (10 requests per minute per IP)
- **IV3**: Form renders correctly in all supported browsers (Chrome, Firefox, Safari, Edge)
- **IV4**: Mobile responsive layout tested on phone and tablet
- **IV5**: Accessibility: All fields have labels, keyboard navigation works, screen reader
  compatible

---

## Story 1.10: Form Submission Handling and Security Hardening

As a **form respondent**, I want **to submit my form responses securely**, so that **my data is
validated, stored, and the form creator can review submissions**.

### Acceptance Criteria

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

### Integration Verification

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
