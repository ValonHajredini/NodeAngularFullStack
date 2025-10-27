# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

This is a modern full-stack TypeScript monorepo with Angular 20+ frontend and Express.js backend.
The project uses npm workspaces for monorepo management and includes shared types, local PostgreSQL
setup, and comprehensive testing.

**Architecture**: Monolith-first with export capabilities for gradual service extraction. The core
system remains monolithic while providing infrastructure to export tools as standalone deployable
packages (see Epics 30-33 for details).

**Key Features**:

- **Visual Form Builder**: Drag-and-drop interface, row-based multi-column layouts, real-time
  analytics, data visualization (bar/line/pie charts), WCAG AA accessibility, shareable via short
  links with QR codes
- **Tool Registry & Export System**: Export registered tools (forms, workflows, themes) as
  standalone microservice packages with Docker configs, migrations, and boilerplate code

## Development Commands

### Essential Development Commands

- `npm start` or `./start-dev.sh` - Start entire development environment (API + Frontend + pgWeb
  against local PostgreSQL)
- `npm stop` or `./stop-dev.sh` - Stop all local services
- `npm --workspace=apps/api run dev` - Start backend API only (port 3000)
- `npm --workspace=apps/web run dev` - Start frontend only (port 4200)

### Testing Commands

- `npm test` - Run all tests (backend + frontend)
- `npm run test:api` - Backend tests only
- `npm run test:web` - Frontend tests only
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:e2e:ui` - Playwright E2E with UI mode
- `npm run test:e2e:themes` - Run theme system E2E tests (headed mode)
- `npm run test:e2e:themes:ui` - Theme E2E tests with Playwright UI

**Backend-Specific Test Commands:**

- `npm --workspace=apps/api run test:unit` - Unit tests only
- `npm --workspace=apps/api run test:integration` - Integration tests only
- `npm --workspace=apps/api run test:security` - Security tests
- `npm --workspace=apps/api run test:coverage` - Generate coverage reports

**Running Single Tests:**

- Backend: `npm --workspace=apps/api run test -- --testPathPattern="filename.test.ts"`
- Frontend: `npm --workspace=apps/web run test -- --include="**/component-name.spec.ts"`
- Add `--watch=false`, `--passWithNoTests`, or `--silent` flags as needed
- Use `--maxWorkers=1` flag for tests that require sequential execution or have resource constraints

### Build and Quality Commands

- `npm run build` - Build all applications
- `npm run build:shared` - Build shared package (required before backend/frontend)
- `npm run lint` - Lint all applications
- `npm run typecheck` - TypeScript checking for all apps
- `npm run format` - Format code with Prettier
- `npm run quality:check` - Run lint + typecheck + format check

**Workspace-Specific:**

- `npm --workspace=apps/api run lint` - Lint backend only
- `npm --workspace=apps/web run lint` - Lint frontend only
- `npm --workspace=apps/api run typecheck` - TypeScript check backend
- `npm --workspace=apps/web run typecheck` - TypeScript check frontend

### Database Commands (run from root or in apps/api/)

- `npm --workspace=apps/api run db:migrate` - Run database migrations
- `npm --workspace=apps/api run db:seed` - Seed database with test data
- `npm --workspace=apps/api run db:reset` - Clear and re-seed database

### Environment Configuration Commands

- `cp .env.development .env.local` - Create local environment file
- `ENV_FILE=.env.local ./start-dev.sh` - Use custom environment file

### Quality and Security Commands

- `npm run quality:check` - Run lint + typecheck + format check
- `npm run security:audit` - Run security audit script
- `npm run format` - Format all code with Prettier
- `npm run format:check` - Check formatting without making changes

## Architecture Overview

### Monorepo Structure

```
apps/
├── api/          # Express.js backend (TypeScript)
├── web/          # Angular 20+ frontend (standalone components)
packages/
├── shared/       # Shared types and utilities (@nodeangularfullstack/shared)
├── config/       # Shared configuration
```

### Key Architectural Patterns

**Backend (apps/api/)**

- Express.js with TypeScript
- Repository pattern for data access (src/repositories/)
- Service layer for business logic (src/services/)
- JWT authentication with Passport.js
- PostgreSQL with connection pooling
- Comprehensive validation using express-validator
- Swagger/OpenAPI documentation at `/api-docs`

**Frontend (apps/web/)**

- Angular 20+ with standalone components (no NgModules)
- PrimeNG 17+ UI components with Tailwind CSS
- NgRx Signals for state management
- Reactive forms and validation
- Proxy configuration for API calls (proxy.conf.json)
- Feature-based architecture:
  - `src/app/core/` - Core services, guards, and API layer
  - `src/app/features/` - Feature modules (admin, auth, dashboard, profile, settings, tools)
  - `src/app/shared/` - Shared components, directives, pipes, and utilities
  - `src/app/layouts/` - Layout components

**Shared Package (packages/shared/)**

- Common TypeScript interfaces and types
- Utility functions shared between frontend and backend
- Build target: CommonJS for backend, ES modules for frontend

### Database Architecture

- PostgreSQL 14+ as primary database (local installation via Homebrew recommended)
- Connection pooling and health checks
- Migration system for schema updates
- Comprehensive seed data for development
- pgWeb CLI for database UI (optional but recommended)

### Service Architecture

- **Local development ports**: Frontend (4200), Backend (3000), PostgreSQL (5432), pgWeb (8080)
- Health checks at `/health` endpoint
- Rate limiting and security middleware
- CORS configured for cross-origin requests
- All services run locally with process management via start/stop scripts

## Testing Strategy

### Backend Testing

- Jest framework with TypeScript support
- Unit tests: `apps/api/tests/unit/` (controllers, repositories, validators)
- Integration tests: `apps/api/tests/integration/`
- Performance tests: `apps/api/tests/performance/`
- Security tests: comprehensive auth and validation testing
- Coverage reports available with `npm --workspace=apps/api run test:coverage`

### Frontend Testing

- Karma + Jasmine for unit tests
- Angular testing utilities
- Component and service testing (\*.spec.ts files alongside components)
- Coverage reports with `npm --workspace=apps/web run test:coverage`

### E2E Testing

- Playwright for cross-browser testing
- Test directory: `tests/e2e/`
- Configured for Chromium, Firefox, WebKit, Edge, and mobile browsers
- Automatically starts backend and frontend servers before running tests
- Run with `npm run test:e2e` or `npm run test:e2e:ui` for interactive mode

## Development Workflow

### Local Development Setup

1. Install PostgreSQL 14+ locally (recommended: `brew install postgresql@14`)
2. Start PostgreSQL service (`brew services start postgresql@14`)
3. Create database and user (see README.md for commands)
4. Use `./start-dev.sh` for one-command startup
5. Automatically runs database migrations and seeding
6. Starts backend API server, frontend Angular server, and pgWeb UI
7. All services include hot-reload and file watching

### Environment Configuration

- Default environment file: `.env.development` (automatically loaded)
- Create custom environment file: `cp .env.development .env.local`
- Use custom environment: `ENV_FILE=.env.local ./start-dev.sh`
- Multi-tenancy support (can be enabled via environment variables)
- PostgreSQL credentials and connection settings configurable

### Code Quality Standards

- ESLint + TypeScript ESLint for both frontend and backend
- Prettier for code formatting
- Husky for pre-commit hooks with lint-staged
- TypeScript strict mode enabled
- Comprehensive JSDoc comments required for public APIs

## Important Development Notes

### Shared Types Usage

- Always import shared types from `@nodeangularfullstack/shared`
- Run `npm run build:shared` after modifying shared types
- Both frontend and backend must use the same type definitions
- **Critical shared types**: `FormTheme`, `ThemeProperties`, `ResponsiveThemeConfig` (theme system),
  `FormSchema`, `FormField`, `FieldPosition` (form builder)
- Shared types located in `packages/shared/src/types/` (theme.types.ts, forms.types.ts, etc.)

### Database Development

- PostgreSQL must be running locally (start with `brew services start postgresql@14`)
- Use migration scripts for schema changes
- Test data is automatically seeded in development
- pgWeb UI available at http://localhost:8080 for database inspection
- Database connection verified automatically by start script
- Always test with seeded data before production deployment

### Authentication Flow

- JWT-based authentication with refresh tokens
- Passport.js strategies for authentication
- Role-based access control (Admin, User, ReadOnly)
- Test user accounts available (see README.md for credentials)

### API Development

- All routes include comprehensive validation
- Swagger documentation auto-generated from JSDoc comments
- Error handling middleware with structured error responses
- Rate limiting configured for all endpoints

### Frontend Development

- Use standalone Angular components (no NgModules)
- PrimeNG components with Tailwind for styling
- Reactive forms with custom validators
- State management with NgRx Signals
- Proxy configuration automatically routes API calls to backend

### Form Builder Development

- Form schemas stored in `forms`, `form_schemas`, `form_submissions` tables
- Short links with QR codes stored in `short_links` table
- Frontend form builder components in `apps/web/src/app/features/tools/components/form-builder/`
- Backend form APIs in `apps/api/src/controllers/forms.controller.ts` and
  `apps/api/src/services/forms.service.ts`
- Public form rendering at `/public/form/:shortCode` route
- HTML sanitization middleware applied to all form submissions (uses DOMPurify)
- Custom CSS validation for background styles

### Theme System Development

- **Theme Designer Modal**: 5-step wizard for creating custom themes (Colors → Typography → Styling
  → Background → Preview)
- **Predefined Themes**: 9 pre-built themes (Ocean Blue, Sunset Orange, Forest Green, etc.) stored
  in `form_themes` table
- **Custom Themes**: User-created themes with full customization (colors, fonts, backgrounds,
  container styling)
- **Signal-Based Architecture**: Theme designer uses Angular 20+ signals for reactive state
  management
- **Service Pattern**: `ThemeDesignerModalService` manages theme state with computed signals for
  live preview
- **CSS Variables**: Themes rendered via CSS custom properties (`--theme-form-*` prefix) for instant
  switching
- **Responsive Themes**: Desktop and mobile property overrides stored in `ResponsiveThemeConfig`
  (JSONB column)
- **Theme Persistence**: Theme configs stored as JSONB in PostgreSQL with 50KB size limit
- **Image Uploads**: Background images converted to base64 data URIs, validated for size (5MB max)
  and type (JPEG/PNG/WebP)
- **Container Styling**: Border, shadow, alignment, opacity, and backdrop blur controls (Epic 25)
- **Google Fonts Integration**: 1000+ fonts available via Google Fonts API
- **Backend Validation**: Theme configs validated for CSS safety and size limits before storage
- **Theme Application**: Forms reference themes via `formSchema.themeId` foreign key
- **Location**: Frontend components in
  `apps/web/src/app/features/tools/components/form-builder/theme-designer-modal/`
- **Location**: Backend APIs in `apps/api/src/controllers/themes.controller.ts` and
  `apps/api/src/services/themes.service.ts`
- **Row-based layout system**: Enable/disable row layout mode, configure 1-4 columns per row,
  flexible multi-column forms
  - Row layout configuration stored in `FormSettings.rowLayout` (optional property)
  - Field positions tracked via `FormField.position` (rowId + columnIndex + orderInColumn)
  - Migration helper converts global column layout to row-based layout
  - FormBuilderService provides row management methods: `enableRowLayout()`, `addRow()`,
    `removeRow()`, `updateRowColumns()`, `setFieldPosition()`
  - RowLayoutSidebarComponent provides UI for row configuration
  - **Multi-field column support**:
    - Multiple fields can be stacked vertically within a single column
    - Field order within column tracked via `FieldPosition.orderInColumn` property (0-based index)
    - FormBuilderService provides methods: `getFieldsInColumn()`, `reorderFieldInColumn()`,
      `fieldsByRowColumn()` computed signal
    - Fields render vertically stacked with 12px spacing between fields
    - Drag-drop calculates `orderInColumn` based on drop position within column
    - Moving field to new column recalculates `orderInColumn` for both old and new columns
    - Backward compatible: forms without `orderInColumn` default to 0 (single field per column
      behavior)
  - **Drag-and-drop behavior**:
    - FormCanvasComponent renders row-based layout with column drop zones when row layout enabled
    - Each column displays as drop zone with visual boundaries (dashed border for empty, solid for
      occupied)
    - Empty columns show "Drop field here" placeholder with inbox icon
    - Drag field type from palette to create new field in specific row-column position
    - Drag existing field to move to new row-column position or reorder within same column
    - Drop validation: allows drops into any column (no more "occupied" restriction)
    - Visual feedback: green border on valid drop targets during drag
    - Backward compatibility: global column layout (1-3 columns) works when row layout disabled
    - Uses Angular CDK Drag-Drop with `cdkDropListGroup` at parent level (FormBuilderComponent) to
      connect palette with all drop zones
    - Custom drop predicate (`canDropIntoColumn`) always returns true for multi-field column support
    - **IMPORTANT**: Do NOT add nested `cdkDropListGroup` within FormCanvasComponent row layout
      section - this breaks palette-to-canvas drag-drop by overriding parent group
  - **Public form row layout rendering**:
    - FormRendererComponent detects `formSchema.settings.rowLayout.enabled` to determine layout mode
    - **Row layout mode** (when `enabled === true`):
      - Renders rows → columns → fields matching builder design exactly
      - Each row uses CSS Grid with `grid-template-columns: repeat(columnCount, 1fr)`
      - Fields within columns sorted by `position.orderInColumn` (ascending)
      - Multiple fields per column render vertically stacked with 12px spacing
    - **Global layout mode** (when `enabled === false` or undefined):
      - Falls back to global column layout for backward compatibility
      - Uses `settings.columnLayout` (1-3 columns) for grid configuration
      - Fields sorted by `field.order` property (no row/column structure)
    - **Responsive behavior**:
      - Desktop (≥ 768px): Rows render with horizontal columns as designed (2-4 columns
        side-by-side)
      - Mobile (< 768px): Columns stack vertically via CSS Grid media query
        (`@media (max-width: 767px)`)
      - Column order preserved on mobile (column 0 → column 1 → column 2 → ...)
      - Fields within columns maintain vertical order (`orderInColumn`)
      - No horizontal scrolling on mobile devices
    - **Backward compatibility**:
      - Forms created before Epic 14 (no `rowLayout` property) render with global layout mode
      - No breaking changes to existing published forms
      - Graceful degradation when `rowLayout` undefined or disabled
    - **Implementation details**:
      - Template uses `@if (isRowLayoutEnabled())` to choose rendering path
      - Field rendering logic shared between row and global layout modes (no duplication)
      - Reactive form group integration unchanged (all fields added regardless of position)
  - **Preview Mode (Story 14.3)**:
    - **Preview button** in FormBuilderComponent toolbar opens modal dialog with form preview
    - **Preview dialog** (PreviewDialogComponent) embeds FormRendererComponent in preview mode
    - **In-memory preview**: Uses current builder state (includes unsaved changes), no API fetch
    - **Preview mode flag**: FormRendererComponent accepts `@Input() previewMode` to disable
      submission
    - **Form submission disabled** in preview mode (prevents POST to backend)
    - **Close preview** returns to builder without saving or navigating away
    - **Usage**: Click "Preview" button → see exact public form rendering → close to continue
      editing
    - **Benefits**: Test layout/styling before publishing, iterate without publishing, verify
      responsive behavior
    - **Location**: FormBuilderComponent toolbar (between Settings and Save buttons)
      - Form submission logic unchanged (POST to `/api/public/forms/:shortCode/submit`)
      - HTML sanitization middleware still applied server-side (DOMPurify)
  - **Step Form Sub-Column Support (Story 27.9)**:
    - **Sub-column configuration UI** available in StepFormSidebarComponent for step form rows
    - **Column width ratio configuration** for rows within steps (Equal, Narrow-Wide, Custom, etc.)
    - **Sub-column management** for each column in step form rows (enable/disable, count 2-4, width
      ratios)
    - **Service integration**: Uses existing FormBuilderService sub-column methods with stepId
      parameter
    - **UI pattern**: Follows RowLayoutSidebarComponent sub-column UI exactly (accordion, toggles,
      dropdowns)
    - **Location**: StepFormSidebarComponent in
      `apps/web/src/app/features/tools/components/form-builder/step-form-sidebar/`
    - **Features**:
      - Width ratio dropdowns for row columns (2-4 columns)
      - Custom width input with fractional unit validation (e.g., '1fr, 2fr')
      - Accordion panels for each column with sub-column configuration
      - Enable/disable sub-columns per column via toggle button
      - Sub-column count selection (2-4 sub-columns)
      - Sub-column width ratio presets and custom input
      - Real-time validation errors for custom width inputs
    - **Backward compatibility**: Existing step form functionality unchanged, no service method
      changes required

### Tool Registry & Export System Development (Epics 30-33)

**Architecture Note**: The project is currently a **monolith with export capabilities**, NOT a
microservices architecture. The export system generates standalone service packages that can be
deployed separately, but the core system remains monolithic.

**Tool Registry System (Epic 30)**:

- **Database schema**: `tool_registry` table tracks all registered tools (forms, workflows, themes)
- **Status tracking**: Tools can be registered, draft, archived, or exported
- **Repository pattern**: `ToolRegistryRepository` in
  `apps/api/src/repositories/tool-registry.repository.ts`
- **REST API**: CRUD endpoints in `apps/api/src/controllers/tool-registry.controller.ts`
- **Validation**: Input validation with express-validator middleware
- **Frontend UI**: `ToolCard` component in `apps/web/src/app/features/admin/components/tool-card/`
- **Shared types**: `ToolRegistryRecord` in `packages/shared/src/types/tool-registry.types.ts`

**Export Infrastructure (Epic 33)**:

- **Export orchestrator**: `ExportOrchestratorService` coordinates multi-step export process
- **Strategy Pattern**: `IExportStrategy` interface with 3 implementations:
  - `FormsExportStrategy` (8 steps) - exports form builder tools
  - `WorkflowsExportStrategy` (7 steps) - exports workflow tools
  - `ThemesExportStrategy` (6 steps) - exports theme tools
- **Location**: `apps/api/src/services/export-orchestrator.service.ts` and
  `apps/api/src/services/export-strategies/`
- **Export Jobs schema**: `export_jobs` table tracks export lifecycle (pending → in_progress →
  completed/failed)
- **Progress tracking**: Real-time progress updates with step completion percentage
- **Package generation**: Creates .tar.gz archives containing:
  - Express.js/Node.js service boilerplate
  - Docker configuration (Dockerfile, docker-compose.yml)
  - Database migrations and schemas
  - Environment configuration (.env.example)
  - Tool-specific data (form schemas, theme configs, etc.)
  - README with deployment instructions
- **Download API**: `GET /api/tool-registry/export-jobs/:jobId/download` endpoint
- **Security**: SHA-256 checksums for package integrity, download tracking, 30-day retention
- **Rollback support**: Automatic cleanup on export failure with step-by-step rollback
- **Repository**: `ExportJobRepository` in `apps/api/src/repositories/export-job.repository.ts`
- **Shared types**: `ExportJob`, `ExportJobStatus` in `packages/shared/src/types/export.types.ts`

**CLI Scaffolding Tool (Epic 31)**:

- **Package**: `@nodeangularfullstack/create-tool` in `packages/create-tool/`
- **Usage**: `npx @nodeangularfullstack/create-tool` to generate new service boilerplate
- **Commander.js**: CLI framework for command parsing
- **Inquirer.js**: Interactive prompts for configuration
- **EJS templates**: Template generation system for boilerplate

**Export History UI (Epic 32)**:

- **Export progress modal**: `ExportProgressModalComponent` shows real-time export progress
- **Export history page**: View past exports, re-download packages, monitor status
- **Location**: `apps/web/src/app/features/admin/pages/export-history/`
- **Service**: `ExportJobService` in
  `apps/web/src/app/features/tools/services/export-job.service.ts`

**Testing**:

- Integration tests: `apps/api/tests/integration/export-download.test.ts`,
  `export-history-list.test.ts`, `package-verification.test.ts`
- Unit tests: `apps/api/tests/unit/utils/checksum.utils.test.ts`
- E2E tests: `tests/e2e/export-history-complete-workflow.spec.ts`
- Quality gates: `docs/qa/gates/33.2.1-export-package-download.yml`,
  `33.2.2-package-verification-security.yml`

**Story Documentation**:

- `docs/stories/30/` - Tool Registry System stories
- `docs/stories/31/` - CLI Scaffolding Tool stories
- `docs/stories/32/` - Tool Registry UI stories
- `docs/stories/33/` - Export Core Infrastructure stories

**Migration Planning**:

- `MicroserviceDock/` - Contains comprehensive microservices migration plans
- `MicroserviceDock/microservices_implementation_plan.md` - 11-week migration roadmap
- `MicroserviceDock/convert_to_microservices_doc.md` - Architecture proposal
- Git branch: `features/multi_service_architecture`

### Prerequisites

- Node.js 18+ with npm (engines specified in package.json)
- PostgreSQL 14+ (recommended: `brew install postgresql@14`)
- pgWeb CLI (optional: `brew install pgweb`)
- Angular CLI (installed automatically if missing)

## Service URLs

**Local Development:**

- Frontend: http://localhost:4200
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/api-docs
- pgWeb Database UI: http://localhost:8080
- Health Check: http://localhost:3000/health

**Test User Credentials:**

- Admin: admin@example.com / Admin123!@#
- User: user@example.com / User123!@#
- ReadOnly: readonly@example.com / Read123!@#

## Documentation Structure

The `docs/` directory contains comprehensive project documentation:

**Story Documentation:**

- `docs/stories/` - User stories organized by epic number (e.g.,
  `docs/stories/25/25.1.container-styling-ui.md`)
- Stories include acceptance criteria, tasks, dev notes, QA results, and gate status
- Each story has corresponding gate file in `docs/qa/gates/` for quality validation

**Architecture Documentation:**

- `docs/architecture/` - System architecture, patterns, and technical design decisions
- `docs/user-guide/` - End-user documentation for features (form analytics, theme creation)

**Development Workflow:**

- Stories progress through states: Draft → Ready for Review → In Progress → Done
- QA gate files track quality scores, test coverage, and compliance checks
- Always check story documentation before implementing new features

## Utility Scripts

The `scripts/` directory contains utility scripts accessible via npm commands:

**Security:**

- `npm run security:audit` - Run comprehensive security audit

**Metrics:**

- `npm run metrics:init` - Initialize metrics collection
- `npm run metrics:dashboard` - View metrics dashboard
- `npm run metrics:export` - Export metrics data

**Feedback:**

- `npm run feedback:init` - Initialize feedback collection
- `npm run feedback:collect` - Collect structured feedback
- `npm run feedback:quick` - Quick feedback submission
- `npm run feedback:dashboard` - View feedback dashboard

**Onboarding:**

- `npm run onboarding:setup` - Initialize metrics, feedback, and validation
- `npm run onboarding:help` - Display onboarding instructions

# important-instruction-reminders

Do what has been asked; nothing more, nothing less. NEVER create files unless they're absolutely
necessary for achieving your goal. ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation
files if explicitly requested by the User.
