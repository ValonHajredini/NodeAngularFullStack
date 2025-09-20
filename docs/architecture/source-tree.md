# Source Tree Structure

## Overview

This document defines the architectural patterns and file organization for our full-stack TypeScript application following 2025 best practices. The project uses a **monorepo workspace structure** with feature-based organization optimized for scalability and maintainability.

## Architecture Principles

### Core Design Patterns
- **Feature-Based Architecture**: Organize by business capabilities, not file types
- **Standalone Components**: Leverage Angular's modern standalone architecture
- **Clean Architecture**: Maintain clear separation between domain, infrastructure, and presentation layers
- **Shared Type Safety**: Unified TypeScript types across frontend and backend

### 2025 Best Practices
- **Angular 20+**: Standalone components, signals, and modern routing
- **Express.js Clean Architecture**: Domain-driven design with proper layer separation
- **Monorepo Workspaces**: Efficient code sharing and dependency management
- **TypeScript-First**: Full type safety across the entire stack

## Root Structure

```
NodeAngularFullStack/
├── apps/                    # Application packages
│   ├── api/                # Express.js backend application
│   └── web/                # Angular frontend application
├── packages/               # Shared libraries
│   ├── shared/            # Shared types and utilities
│   └── config/            # Configuration packages
├── docs/                   # Project documentation
│   ├── architecture/      # Architecture documentation
│   ├── prd/              # Product requirements
│   └── stories/          # Development stories
├── infrastructure/        # Infrastructure as code
├── tests/                 # End-to-end and integration tests
├── scripts/               # Build and utility scripts
└── .bmad-core/           # Development workflow automation
```

## Backend Structure (apps/api/)

Following **Clean Architecture** principles with TypeScript and Express.js:

```
apps/api/
├── src/
│   ├── controllers/       # Presentation Layer
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   └── index.ts
│   ├── services/          # Application Layer (Use Cases)
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   └── index.ts
│   ├── repositories/      # Infrastructure Layer (Data Access)
│   │   ├── auth.repository.ts
│   │   ├── user.repository.ts
│   │   └── index.ts
│   ├── middleware/        # Cross-cutting Concerns
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── logging.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── validation.middleware.ts
│   ├── routes/            # Route Definitions
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   └── index.ts
│   ├── types/             # Domain Types (Business Logic)
│   │   ├── auth.types.ts
│   │   └── user.types.ts
│   ├── utils/             # Infrastructure Utilities
│   │   ├── database.utils.ts
│   │   ├── encryption.utils.ts
│   │   ├── migration.utils.ts
│   │   ├── seed.utils.ts
│   │   └── validation.utils.ts
│   ├── validators/        # Input Validation
│   │   ├── auth.validators.ts
│   │   └── user.validators.ts
│   └── server.ts          # Application Entry Point
├── database/              # Database Management
│   ├── migrations/        # Database schema migrations
│   └── seeds/            # Database seed data
├── tests/                 # Backend Tests
│   ├── integration/       # API integration tests
│   ├── unit/             # Unit tests
│   └── helpers/          # Test utilities
├── dist/                  # Compiled JavaScript output
├── coverage/              # Test coverage reports
├── package.json
├── tsconfig.json
├── jest.config.js
└── .env.example
```

### Backend Layer Responsibilities

#### Controllers (Presentation Layer)
- Handle HTTP requests/responses
- Input validation and sanitization
- Route parameter extraction
- Response formatting
- Error handling delegation

#### Services (Application Layer)
- Business logic implementation
- Use case orchestration
- Cross-cutting concerns coordination
- Domain rule enforcement

#### Repositories (Infrastructure Layer)
- Data access abstraction
- Database query implementation
- External service integration
- Data transformation

#### Middleware (Cross-cutting)
- Authentication and authorization
- Request/response logging
- Rate limiting
- Error handling
- Input validation

## Frontend Structure (apps/web/)

Following **Angular 20+ Feature-Based Architecture** with standalone components:

```
apps/web/
├── src/
│   ├── app/
│   │   ├── core/                    # Singleton Services & Guards
│   │   │   ├── guards/             # Route guards
│   │   │   │   ├── auth.guard.ts
│   │   │   │   └── index.ts
│   │   │   ├── interceptors/       # HTTP interceptors
│   │   │   │   ├── auth.interceptor.ts
│   │   │   │   ├── error.interceptor.ts
│   │   │   │   └── index.ts
│   │   │   ├── services/           # Core application services
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── api.service.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── features/               # Feature Modules (Business Logic)
│   │   │   ├── auth/              # Authentication feature
│   │   │   │   ├── components/    # Feature-specific components
│   │   │   │   │   ├── login/
│   │   │   │   │   └── register/
│   │   │   │   ├── pages/         # Route components
│   │   │   │   │   ├── login.page.ts
│   │   │   │   │   └── register.page.ts
│   │   │   │   ├── services/      # Feature services
│   │   │   │   │   └── auth-feature.service.ts
│   │   │   │   ├── types/         # Feature types
│   │   │   │   │   └── auth.types.ts
│   │   │   │   └── auth.routes.ts # Feature routing
│   │   │   ├── dashboard/         # Dashboard feature
│   │   │   │   ├── components/
│   │   │   │   ├── pages/
│   │   │   │   ├── services/
│   │   │   │   └── dashboard.routes.ts
│   │   │   └── users/             # User management feature
│   │   │       ├── components/
│   │   │       ├── pages/
│   │   │       ├── services/
│   │   │       └── users.routes.ts
│   │   ├── shared/                # Reusable Components & Utilities
│   │   │   ├── components/        # Shared UI components
│   │   │   │   ├── button/
│   │   │   │   ├── modal/
│   │   │   │   ├── form-field/
│   │   │   │   └── index.ts
│   │   │   ├── directives/        # Shared directives
│   │   │   │   └── index.ts
│   │   │   ├── pipes/             # Shared pipes
│   │   │   │   └── index.ts
│   │   │   ├── utils/             # Frontend utilities
│   │   │   │   ├── form.utils.ts
│   │   │   │   ├── date.utils.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── layouts/               # Application Layouts
│   │   │   ├── main-layout/       # Primary application layout
│   │   │   ├── auth-layout/       # Authentication layout
│   │   │   └── index.ts
│   │   ├── app.config.ts          # Application configuration
│   │   ├── app.routes.ts          # Main routing configuration
│   │   ├── app.ts                 # Root standalone component
│   │   └── app.html               # Root template
│   ├── environments/              # Environment configurations
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── styles.scss               # Global styles
│   ├── main.ts                   # Application bootstrap
│   └── index.html                # HTML entry point
├── public/                       # Static assets
├── dist/                         # Build output
├── .angular/                     # Angular CLI cache
├── package.json
├── angular.json                  # Angular CLI configuration
├── tsconfig.json                 # TypeScript configuration
├── tsconfig.app.json            # App-specific TypeScript config
├── proxy.conf.json              # Development proxy configuration
└── tailwind.config.js           # Tailwind CSS configuration
```

### Frontend Architecture Patterns

#### Feature-Based Organization
- **Self-contained features**: Each feature contains components, services, and routing
- **Lazy loading**: Features are loaded on-demand for optimal performance
- **Clear boundaries**: Features have minimal dependencies on each other

#### Standalone Components (Angular 20+)
- **No NgModules**: Components are standalone with explicit imports
- **Tree-shakable**: Only imported dependencies are bundled
- **Simplified routing**: Direct component loading without module wrappers

#### Signals Integration
- **Reactive state**: Use Angular signals for component state management
- **Change detection**: Optimized change detection with signals
- **Computed values**: Reactive computed properties

## Shared Packages Structure

### packages/shared/
```
packages/shared/
├── src/
│   ├── types/              # Shared TypeScript interfaces
│   │   ├── api.types.ts    # API request/response types
│   │   ├── auth.types.ts   # Authentication types
│   │   ├── user.types.ts   # User domain types
│   │   └── index.ts
│   ├── utils/              # Shared utility functions
│   │   ├── validation.utils.ts
│   │   ├── date.utils.ts
│   │   ├── string.utils.ts
│   │   └── index.ts
│   └── index.ts            # Package exports
├── dist/                   # Compiled output
├── package.json
└── tsconfig.json
```

### packages/config/
```
packages/config/
├── src/
│   ├── database.config.ts  # Database configuration
│   ├── auth.config.ts      # Authentication configuration
│   ├── api.config.ts       # API configuration
│   └── index.ts
├── package.json
└── tsconfig.json
```

## File Naming Conventions

### Backend (Express.js)
- **Controllers**: `{feature}.controller.ts`
- **Services**: `{feature}.service.ts`
- **Repositories**: `{feature}.repository.ts`
- **Middleware**: `{purpose}.middleware.ts`
- **Routes**: `{feature}.routes.ts`
- **Types**: `{domain}.types.ts`
- **Validators**: `{feature}.validators.ts`
- **Utils**: `{purpose}.utils.ts`

### Frontend (Angular)
- **Components**: `{name}.component.ts` (with standalone decorator)
- **Pages**: `{name}.page.ts` (route components)
- **Services**: `{name}.service.ts`
- **Guards**: `{name}.guard.ts`
- **Interceptors**: `{name}.interceptor.ts`
- **Pipes**: `{name}.pipe.ts`
- **Directives**: `{name}.directive.ts`
- **Types**: `{domain}.types.ts`

## Import Path Standards

### Internal Imports
```typescript
// Backend
import { UserService } from '../services/user.service.js';
import { AuthMiddleware } from '../middleware/auth.middleware.js';

// Frontend
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
```

### Shared Package Imports
```typescript
// Both frontend and backend
import { User, CreateUserRequest } from '@nodeangularfullstack/shared';
import { validateEmail } from '@nodeangularfullstack/shared/utils';
```

## Development Workflow

### Feature Development Pattern
1. **Define types** in `packages/shared/src/types/`
2. **Implement backend** in `apps/api/src/` following clean architecture
3. **Create frontend feature** in `apps/web/src/app/features/`
4. **Add shared components** in `apps/web/src/app/shared/` if reusable
5. **Write tests** for both backend and frontend
6. **Integration testing** in `tests/` directory

### Testing Structure
```
tests/
├── e2e/                    # End-to-end tests
├── integration/            # Cross-service integration
├── fixtures/               # Test data
└── helpers/               # Test utilities
```

## Scalability Considerations

### Horizontal Scaling
- **Feature isolation**: Features can be developed independently
- **Package separation**: Shared code prevents duplication
- **Clean boundaries**: Clear interfaces between layers

### Performance Optimization
- **Lazy loading**: Angular features loaded on demand
- **Tree shaking**: Unused code eliminated in builds
- **Standalone components**: Reduced bundle size
- **Signals**: Optimized change detection

### Team Collaboration
- **Feature ownership**: Teams can own complete features
- **Shared standards**: Consistent patterns across codebase
- **Type safety**: Shared types prevent API contract issues
- **Independent development**: Minimal cross-team dependencies

## Migration Path

For existing applications transitioning to this structure:

1. **Phase 1**: Migrate to workspace structure
2. **Phase 2**: Implement shared package
3. **Phase 3**: Refactor backend to clean architecture
4. **Phase 4**: Convert to Angular standalone components
5. **Phase 5**: Implement feature-based organization
6. **Phase 6**: Add signals and modern Angular patterns

This structure provides a solid foundation for scalable, maintainable full-stack TypeScript applications following 2025 best practices.