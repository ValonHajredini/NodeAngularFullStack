# Technical Constraints and Integration Requirements

## Existing Technology Stack

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

## Integration Approach

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

## Code Organization and Standards

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

## Deployment and Operations

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

## Risk Assessment and Mitigation

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
