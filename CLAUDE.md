# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

This is a modern full-stack TypeScript monorepo with Angular 20+ frontend and Express.js backend.
The project uses npm workspaces for monorepo management and includes shared types, local PostgreSQL
setup, and comprehensive testing.

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
- Backend specific: `npm run test:unit`, `npm run test:integration`, `npm run test:security`

### Build and Quality Commands

- `npm run build` - Build all applications
- `npm run lint` - Lint all applications
- `npm run typecheck` - TypeScript checking for all apps
- `npm run format` - Format code with Prettier
- `npm run quality:check` - Run lint + typecheck + format check

### Database Commands (run from root or in apps/api/)

- `npm --workspace=apps/api run db:migrate` - Run database migrations
- `npm --workspace=apps/api run db:seed` - Seed database with test data
- `npm --workspace=apps/api run db:reset` - Clear and re-seed database

### Environment Configuration Commands

- `cp .env.development .env.local` - Create local environment file
- `ENV_FILE=.env.local ./start-dev.sh` - Use custom environment file

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
- Unit tests: `src/**/*.test.ts`
- Integration tests: `tests/integration/`
- Performance tests: `tests/performance/`
- Security tests: comprehensive auth and validation testing
- Coverage reports available with `npm run test:coverage`

### Frontend Testing

- Karma + Jasmine for unit tests
- Angular testing utilities
- Component and service testing
- Coverage reports with `npm run test:coverage`

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

### Prerequisites

- Node.js 20+ with npm
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

## Utility Scripts

The `scripts/` directory contains utility scripts for:

- Security auditing (`security-audit.js`)
- Metrics collection (`metrics-collector.js`)
- Feedback collection (`feedback-collector.js`)
- Environment validation (`validate-environment.js`)
- Database management (`pgweb-*.sh`)

Run these scripts with appropriate npm commands as defined in the root package.json.
