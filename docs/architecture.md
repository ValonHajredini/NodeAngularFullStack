# NodeAngularFullStack Fullstack Architecture Document

## Introduction

This document outlines the complete fullstack architecture for NodeAngularFullStack, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

### Starter Template or Existing Project

**N/A - Greenfield project**

This is a new fullstack boilerplate being built from scratch to provide a comprehensive foundation for rapid application development with configurable multi-tenancy, JWT authentication, and Docker containerization.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-09-20 | v1.0 | Initial architecture document creation | Winston (Architect) |

## High Level Architecture

### Technical Summary

NodeAngularFullStack implements a containerized monolithic architecture with microservice-ready boundaries, deploying Angular 20+ frontend and Express.js/TypeScript backend through Docker containers. The system integrates via RESTful APIs with JWT authentication, connecting to PostgreSQL database with optional multi-tenancy configuration. Infrastructure leverages Docker Compose for development and Digital Ocean App Platform for production deployment, utilizing environment-based configuration for flexible deployment modes. This architecture achieves PRD goals by providing immediate development productivity through pre-configured infrastructure while maintaining production-grade security, performance, and scalability standards.

### Platform and Infrastructure Choice

**Platform:** Digital Ocean App Platform
**Key Services:** App Platform (Apps), Managed Database (PostgreSQL), Spaces (Object Storage), Container Registry
**Deployment Host and Regions:** Primary: NYC3 (US East), Secondary: FRA1 (EU Central)

**Rationale:** Digital Ocean provides cost-effective managed services ideal for startups and small teams, with predictable pricing and simple deployment workflows that align with the PRD's developer experience goals.

### Repository Structure

**Structure:** Monorepo
**Monorepo Tool:** npm workspaces (native Node.js solution)
**Package Organization:** Apps-based structure with shared packages for cross-stack type definitions and utilities

### High Level Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Angular 20+ SPA]
        MOBILE[Future: Mobile App]
    end

    subgraph "CDN/Edge"
        CF[CloudFlare CDN]
    end

    subgraph "Application Layer - Docker Containers"
        NGINX[Nginx Reverse Proxy]
        API[Express.js API<br/>TypeScript/Node.js]
        SWAGGER[Swagger UI<br/>API Documentation]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL 15+<br/>Primary Database)]
        REDIS[(Redis<br/>Session Cache)]
        PGWEB[pgWeb Admin<br/>Database UI]
    end

    subgraph "External Services"
        S3[DO Spaces<br/>File Storage]
        MAIL[SendGrid<br/>Email Service]
    end

    WEB --> CF
    CF --> NGINX
    MOBILE -.-> NGINX
    NGINX --> API
    NGINX --> SWAGGER
    API --> PG
    API --> REDIS
    API --> S3
    API --> MAIL
    PGWEB --> PG

    style WEB fill:#4CAF50
    style API fill:#2196F3
    style PG fill:#FF9800
```

### Architectural Patterns

- **Monolithic with Service Boundaries:** Single deployable unit with clear service separations enabling future microservice extraction - _Rationale:_ Simplifies initial development while maintaining scalability path
- **Repository Pattern:** Abstract database operations behind repository interfaces - _Rationale:_ Enables testing with mocks and future database migration flexibility
- **JWT Stateless Authentication:** Token-based auth without server sessions - _Rationale:_ Enables horizontal scaling and API-first architecture
- **Component-Based UI:** Angular standalone components with OnPush change detection - _Rationale:_ Maximizes reusability and performance in large applications
- **API Gateway Pattern:** Nginx reverse proxy as single entry point - _Rationale:_ Centralized SSL termination, rate limiting, and request routing
- **Database-Per-Service Ready:** Schema design supports future service isolation - _Rationale:_ Enables gradual migration to microservices without database refactoring
- **Environment-Based Configuration:** All settings via environment variables - _Rationale:_ Supports multiple deployment environments without code changes
- **Docker-First Development:** All dependencies containerized - _Rationale:_ Ensures consistent development environments across teams

## Tech Stack

### Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.3+ | Type-safe frontend development | Shared language with backend, reduces context switching |
| Frontend Framework | Angular | 20+ | SPA framework with built-in features | Enterprise-grade framework with comprehensive tooling |
| UI Component Library | PrimeNG | 17+ | Professional UI components | Reduces development time with pre-built components |
| State Management | NgRx Signals | 17+ | Reactive state management | Modern signal-based approach for performance |
| Backend Language | TypeScript | 5.3+ | Type-safe backend development | Unified language across stack, strong typing |
| Backend Framework | Express.js | 4.19+ | Minimal, flexible web framework | Mature ecosystem, extensive middleware support |
| API Style | REST | OpenAPI 3.0 | Standard HTTP-based APIs | Universal client support, tooling ecosystem |
| Database | PostgreSQL | 15+ | Relational database | ACID compliance, JSON support, multi-tenancy ready |
| Cache | Redis | 7+ | In-memory data store | Session management, API response caching |
| File Storage | DO Spaces | S3-compatible | Object storage for files | Cost-effective, S3 API compatibility |
| Authentication | JWT + Passport.js | Latest | Token-based authentication | Stateless, scalable, industry standard |
| Frontend Testing | Jest + Testing Library | 29+ / 14+ | Unit and component testing | Fast execution, good Angular integration |
| Backend Testing | Jest + Supertest | 29+ / 6+ | API and unit testing | Consistent with frontend, good async support |
| E2E Testing | Playwright | 1.40+ | Cross-browser E2E testing | Modern, fast, reliable automation |
| Build Tool | Angular CLI | 17+ | Frontend build orchestration | Official Angular tooling, optimized builds |
| Bundler | esbuild (via Angular) | Latest | JavaScript bundling | Fastest bundler, used by Angular internally |
| IaC Tool | Docker Compose | 2.23+ | Container orchestration | Simple, declarative infrastructure |
| CI/CD | GitHub Actions | Latest | Automated workflows | Native GitHub integration, free tier |
| Monitoring | Sentry | Latest | Error tracking and performance | Comprehensive error tracking, performance monitoring |
| Logging | Winston + Logtail | 3.11+ | Structured logging | JSON logging, multiple transports |
| CSS Framework | Tailwind CSS | 3.4+ | Utility-first CSS | Rapid development, consistent styling |

## Data Models

### User

**Purpose:** Core user entity for authentication and authorization

**Key Attributes:**
- id: UUID - Unique identifier
- email: string - Unique email address for login
- password_hash: string - Bcrypt hashed password
- first_name: string - User's first name
- last_name: string - User's last name
- role: enum - User role (admin, user, readonly)
- tenant_id: UUID? - Optional tenant association for multi-tenancy
- created_at: timestamp - Account creation time
- updated_at: timestamp - Last modification time
- last_login: timestamp? - Last successful login
- is_active: boolean - Account active status
- email_verified: boolean - Email verification status

#### TypeScript Interface
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'readonly';
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  emailVerified: boolean;
}
```

#### Relationships
- Has many: Sessions (one-to-many)
- Belongs to: Tenant (many-to-one, optional)
- Has many: PasswordResets (one-to-many)

### Tenant

**Purpose:** Multi-tenancy support for isolated customer environments

**Key Attributes:**
- id: UUID - Unique tenant identifier
- name: string - Tenant organization name
- slug: string - URL-safe tenant identifier
- settings: JSONB - Tenant-specific configuration
- plan: enum - Subscription plan level
- max_users: integer - User limit based on plan
- created_at: timestamp - Tenant creation time
- is_active: boolean - Tenant active status

#### TypeScript Interface
```typescript
interface Tenant {
  id: string;
  name: string;
  slug: string;
  settings: {
    branding?: {
      primaryColor?: string;
      logo?: string;
    };
    features: {
      [key: string]: boolean;
    };
  };
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  maxUsers: number;
  createdAt: Date;
  isActive: boolean;
}
```

#### Relationships
- Has many: Users (one-to-many)
- Has many: TenantInvites (one-to-many)

### Session

**Purpose:** JWT refresh token tracking and session management

**Key Attributes:**
- id: UUID - Session identifier
- user_id: UUID - Associated user
- refresh_token: string - Hashed refresh token
- expires_at: timestamp - Token expiration
- ip_address: string - Client IP for security
- user_agent: string - Client browser info
- created_at: timestamp - Session start time

#### TypeScript Interface
```typescript
interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}
```

#### Relationships
- Belongs to: User (many-to-one)

## API Specification

### REST API Specification

```yaml
openapi: 3.0.0
info:
  title: NodeAngularFullStack API
  version: 1.0.0
  description: RESTful API for fullstack boilerplate with JWT authentication and multi-tenancy
servers:
  - url: http://localhost:3000/api/v1
    description: Development server
  - url: https://api.example.com/v1
    description: Production server

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        firstName:
          type: string
        lastName:
          type: string
        role:
          type: string
          enum: [admin, user, readonly]
        tenantId:
          type: string
          format: uuid
        createdAt:
          type: string
          format: date-time

    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: object
            timestamp:
              type: string
              format: date-time
            requestId:
              type: string

paths:
  /auth/register:
    post:
      summary: Register new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password, firstName, lastName]
              properties:
                email:
                  type: string
                password:
                  type: string
                firstName:
                  type: string
                lastName:
                  type: string
                tenantId:
                  type: string
      responses:
        201:
          description: User created successfully
        400:
          description: Validation error
        409:
          description: Email already exists

  /auth/login:
    post:
      summary: User login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                password:
                  type: string
      responses:
        200:
          description: Login successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken:
                    type: string
                  refreshToken:
                    type: string
                  user:
                    $ref: '#/components/schemas/User'

  /auth/refresh:
    post:
      summary: Refresh access token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [refreshToken]
              properties:
                refreshToken:
                  type: string
      responses:
        200:
          description: Token refreshed

  /users/profile:
    get:
      summary: Get current user profile
      security:
        - bearerAuth: []
      responses:
        200:
          description: User profile
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

    patch:
      summary: Update user profile
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                firstName:
                  type: string
                lastName:
                  type: string
      responses:
        200:
          description: Profile updated

  /users:
    get:
      summary: List users (admin only)
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        200:
          description: User list
```

## Components

### Frontend Components

**Auth Module**
**Responsibility:** Handle authentication flows including login, registration, password reset, and session management

**Key Interfaces:**
- AuthService: JWT token management and API calls
- AuthGuard: Route protection based on authentication
- AuthInterceptor: Automatic token injection in HTTP requests

**Dependencies:** Angular Router, HttpClient, NgRx Store

**Technology Stack:** Angular 20+, RxJS, TypeScript

### Backend Services

**Auth Service**
**Responsibility:** JWT token generation, validation, user authentication, and password management

**Key Interfaces:**
- generateTokens(): Create access and refresh tokens
- validateToken(): Verify JWT signature and expiration
- hashPassword(): Bcrypt password hashing
- validatePassword(): Password verification

**Dependencies:** jsonwebtoken, bcrypt, User Repository

**Technology Stack:** Express.js, TypeScript, Passport.js

### Database Layer

**User Repository**
**Responsibility:** Abstract database operations for user entity with tenant isolation

**Key Interfaces:**
- findById(id, tenantId?): Retrieve user with optional tenant filtering
- findByEmail(email, tenantId?): Email-based user lookup
- create(userData): Create new user record
- update(id, updates): Update user information

**Dependencies:** PostgreSQL client, Database connection pool

**Technology Stack:** node-postgres, TypeScript

### Infrastructure Components

**Nginx Reverse Proxy**
**Responsibility:** Request routing, SSL termination, rate limiting, and static file serving

**Key Interfaces:**
- /api/* → Express.js backend
- /docs → Swagger UI
- /* → Angular static files

**Dependencies:** Docker network, upstream services

**Technology Stack:** Nginx 1.25+, Docker

### Component Diagram

```mermaid
graph TB
    subgraph "Frontend - Angular"
        UI[UI Components]
        AUTH_MOD[Auth Module]
        API_SVC[API Service]
        STATE[NgRx Store]
        GUARDS[Route Guards]
    end

    subgraph "Backend - Express.js"
        ROUTES[API Routes]
        AUTH_SVC[Auth Service]
        USER_REPO[User Repository]
        MIDDLEWARE[Middleware Stack]
        VALIDATORS[Request Validators]
    end

    subgraph "Infrastructure"
        NGINX[Nginx]
        REDIS[Redis Cache]
        PG[PostgreSQL]
    end

    UI --> AUTH_MOD
    UI --> STATE
    AUTH_MOD --> API_SVC
    API_SVC --> GUARDS

    NGINX --> ROUTES
    ROUTES --> MIDDLEWARE
    MIDDLEWARE --> AUTH_SVC
    AUTH_SVC --> USER_REPO
    USER_REPO --> PG
    AUTH_SVC --> REDIS

    style UI fill:#4CAF50
    style ROUTES fill:#2196F3
    style PG fill:#FF9800
```

## External APIs

### SendGrid API
- **Purpose:** Transactional email delivery for password resets, welcome emails, and notifications
- **Documentation:** https://docs.sendgrid.com/api-reference/mail-send/mail-send
- **Base URL(s):** https://api.sendgrid.com/v3
- **Authentication:** API Key in Authorization header
- **Rate Limits:** 10,000 emails/day (free tier), 3,000 requests/second

**Key Endpoints Used:**
- `POST /mail/send` - Send transactional emails

**Integration Notes:** Use template IDs for consistent email formatting, implement retry logic for failed sends

### Digital Ocean Spaces API
- **Purpose:** File upload and storage for user avatars and application assets
- **Documentation:** https://docs.digitalocean.com/products/spaces/reference/s3-compatibility/
- **Base URL(s):** https://nyc3.digitaloceanspaces.com
- **Authentication:** Access Key ID and Secret Access Key (S3-compatible)
- **Rate Limits:** No hard limits, fair use policy

**Key Endpoints Used:**
- `PUT /{bucket}/{key}` - Upload file
- `GET /{bucket}/{key}` - Retrieve file
- `DELETE /{bucket}/{key}` - Delete file

**Integration Notes:** Use pre-signed URLs for direct browser uploads, implement CDN for public assets

## Core Workflows

```mermaid
sequenceDiagram
    participant User
    participant Angular
    participant Nginx
    participant Express
    participant PostgreSQL
    participant Redis
    participant SendGrid

    %% User Registration Flow
    User->>Angular: Fill registration form
    Angular->>Angular: Validate input
    Angular->>Nginx: POST /api/v1/auth/register
    Nginx->>Express: Forward request
    Express->>Express: Validate request
    Express->>PostgreSQL: Check email exists
    PostgreSQL-->>Express: Email available
    Express->>Express: Hash password
    Express->>PostgreSQL: Create user record
    PostgreSQL-->>Express: User created
    Express->>SendGrid: Send welcome email
    SendGrid-->>Express: Email queued
    Express->>Express: Generate JWT tokens
    Express->>Redis: Store refresh token
    Redis-->>Express: Token stored
    Express-->>Angular: Return tokens + user
    Angular->>Angular: Store tokens
    Angular->>Angular: Update state
    Angular-->>User: Redirect to dashboard

    %% Login Flow with Multi-Tenancy
    User->>Angular: Enter credentials
    Angular->>Nginx: POST /api/v1/auth/login
    Nginx->>Express: Forward request
    Express->>PostgreSQL: Find user by email
    PostgreSQL-->>Express: User record
    Express->>Express: Verify password
    Express->>Express: Check tenant status
    Express->>Express: Generate tokens
    Express->>Redis: Store session
    Redis-->>Express: Session created
    Express-->>Angular: Return tokens
    Angular->>Angular: Store in localStorage
    Angular-->>User: Navigate to app

    %% API Request with JWT
    User->>Angular: Access protected page
    Angular->>Angular: Check token expiry
    Angular->>Nginx: GET /api/v1/users/profile
    Note right of Angular: Bearer token in header
    Nginx->>Express: Forward with headers
    Express->>Express: Validate JWT
    Express->>Redis: Check session
    Redis-->>Express: Session valid
    Express->>PostgreSQL: Get user data
    PostgreSQL-->>Express: User profile
    Express-->>Angular: Return data
    Angular->>Angular: Update UI
    Angular-->>User: Display profile

    %% Token Refresh Flow
    Angular->>Angular: Detect token expiry
    Angular->>Nginx: POST /api/v1/auth/refresh
    Nginx->>Express: Forward request
    Express->>Redis: Validate refresh token
    Redis-->>Express: Token valid
    Express->>Express: Generate new access token
    Express->>Redis: Rotate refresh token
    Redis-->>Express: Token updated
    Express-->>Angular: New tokens
    Angular->>Angular: Update storage
    Angular->>Angular: Retry original request
```

## Database Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table (optional, based on ENABLE_MULTI_TENANCY env var)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    plan VARCHAR(50) DEFAULT 'free',
    max_users INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Users table with optional tenant support
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    UNIQUE(email, tenant_id)
);

-- Sessions table for refresh token storage
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(refresh_token);
CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_password_resets_user ON password_resets(user_id);

-- Row-level security policies (when multi-tenancy enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Frontend Architecture

### Component Architecture

#### Component Organization
```text
src/
├── app/
│   ├── core/                    # Singleton services, guards, interceptors
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.guard.ts
│   │   │   └── auth.interceptor.ts
│   │   ├── api/
│   │   │   └── api.service.ts
│   │   └── services/
│   ├── features/                # Feature modules
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── password-reset/
│   │   ├── dashboard/
│   │   └── profile/
│   ├── shared/                  # Shared components, pipes, directives
│   │   ├── components/
│   │   ├── directives/
│   │   └── pipes/
│   └── layouts/                 # Layout components
│       ├── main-layout/
│       └── auth-layout/
```

#### Component Template
```typescript
import { Component, ChangeDetectionStrategy, Signal, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="component-container">
      <!-- Component template -->
    </div>
  `,
  styles: [`
    .component-container {
      @apply p-4;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExampleComponent {
  private readonly dataSignal = signal<Data | null>(null);
  protected readonly computedValue = computed(() =>
    this.dataSignal()?.property ?? 'default'
  );

  constructor() {
    // Component initialization
  }
}
```

### State Management Architecture

#### State Structure
```typescript
// store/app.state.ts
export interface AppState {
  auth: AuthState;
  users: UserState;
  ui: UIState;
  tenant: TenantState;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface UserState {
  users: User[];
  selectedUser: User | null;
  pagination: Pagination;
  loading: boolean;
  error: string | null;
}
```

#### State Management Patterns
- Use NgRx Signals for reactive state management
- Implement facade services for complex state interactions
- Use computed signals for derived state
- Implement optimistic updates for better UX
- Cache API responses with configurable TTL

### Routing Architecture

#### Route Organization
```text
app.routes.ts
├── '' (MainLayout)
│   ├── dashboard
│   ├── profile
│   └── users (admin only)
├── 'auth' (AuthLayout)
│   ├── login
│   ├── register
│   └── password-reset
└── '**' (404 page)
```

#### Protected Route Pattern
```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'admin',
        canActivate: [roleGuard(['admin'])],
        loadChildren: () => import('./features/admin/admin.routes')
          .then(m => m.ADMIN_ROUTES)
      }
    ]
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component')
          .then(m => m.LoginComponent)
      }
    ]
  }
];
```

### Frontend Services Layer

#### API Client Setup
```typescript
// core/api/api.client.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get<T>(endpoint: string, options?: any): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, options);
  }

  post<T>(endpoint: string, body: any, options?: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body, options);
  }

  patch<T>(endpoint: string, body: any, options?: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, body, options);
  }

  delete<T>(endpoint: string, options?: any): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, options);
  }
}
```

#### Service Example
```typescript
// features/users/users.service.ts
import { Injectable, inject } from '@angular/core';
import { ApiClient } from '@core/api/api.client';
import { Observable } from 'rxjs';
import { User, PaginatedResponse } from '@shared/models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiClient);

  getUsers(page = 1, limit = 20): Observable<PaginatedResponse<User>> {
    return this.api.get<PaginatedResponse<User>>(
      `/users?page=${page}&limit=${limit}`
    );
  }

  getProfile(): Observable<User> {
    return this.api.get<User>('/users/profile');
  }

  updateProfile(updates: Partial<User>): Observable<User> {
    return this.api.patch<User>('/users/profile', updates);
  }
}
```

## Backend Architecture

### Service Architecture

#### Controller/Route Organization
```text
src/
├── routes/
│   ├── auth.routes.ts
│   ├── users.routes.ts
│   └── index.ts
├── controllers/
│   ├── auth.controller.ts
│   └── users.controller.ts
├── services/
│   ├── auth.service.ts
│   ├── users.service.ts
│   └── tenant.service.ts
├── repositories/
│   ├── users.repository.ts
│   └── base.repository.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── tenant.middleware.ts
│   └── validation.middleware.ts
└── utils/
    ├── jwt.utils.ts
    └── password.utils.ts
```

#### Controller Template
```typescript
// controllers/users.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UsersService } from '../services/users.service';
import { AsyncHandler } from '../utils/async-handler';
import { ApiError } from '../utils/api-error';

export class UsersController {
  constructor(private usersService: UsersService) {}

  getProfile = AsyncHandler(async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const userId = req.user!.id;
    const tenantId = req.tenant?.id;

    const user = await this.usersService.findById(userId, tenantId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json({
      success: true,
      data: user
    });
  });

  updateProfile = AsyncHandler(async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const userId = req.user!.id;
    const updates = req.body;

    const updatedUser = await this.usersService.update(userId, updates);

    res.json({
      success: true,
      data: updatedUser
    });
  });
}
```

### Database Architecture

#### Schema Design
```sql
-- Additional tables for complete system

-- Audit log for compliance
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API rate limiting
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- IP or user ID
    endpoint VARCHAR(255) NOT NULL,
    requests INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(identifier, endpoint, window_start)
);
```

#### Data Access Layer
```typescript
// repositories/base.repository.ts
import { Pool } from 'pg';
import { QueryResult } from 'pg';

export abstract class BaseRepository<T> {
  constructor(
    protected pool: Pool,
    protected tableName: string
  ) {}

  async findById(id: string, tenantId?: string): Promise<T | null> {
    let query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const params: any[] = [id];

    if (tenantId && this.supportsTenancy()) {
      query += ' AND tenant_id = $2';
      params.push(tenantId);
    }

    const result = await this.pool.query(query, params);
    return result.rows[0] || null;
  }

  async create(data: Partial<T>): Promise<T> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  protected supportsTenancy(): boolean {
    return ['users', 'audit_logs'].includes(this.tableName);
  }
}
```

### Authentication and Authorization

#### Auth Flow
```mermaid
sequenceDiagram
    participant Client
    participant Middleware
    participant AuthService
    participant Database
    participant Redis

    Client->>Middleware: Request with JWT
    Middleware->>Middleware: Extract token
    Middleware->>AuthService: Validate token
    AuthService->>AuthService: Verify signature
    AuthService->>Redis: Check blacklist
    Redis-->>AuthService: Token valid
    AuthService->>Database: Get user data
    Database-->>AuthService: User info
    AuthService-->>Middleware: User authenticated
    Middleware->>Middleware: Attach user to request
    Middleware-->>Client: Continue to route
```

#### Middleware/Guards
```typescript
// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service';
import { UsersService } from '../services/users.service';
import { ApiError } from '../utils/api-error';

export interface AuthRequest extends Request {
  user?: User;
  tenant?: Tenant;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new ApiError(401, 'No token provided');
    }

    const payload = await JwtService.verify(token);
    const user = await UsersService.findById(payload.userId);

    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid token');
    }

    req.user = user;

    if (user.tenantId) {
      req.tenant = await TenantService.findById(user.tenantId);
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Unauthorized'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }

    next();
  };
};
```

## Unified Project Structure

```plaintext
nodeangularfullstack/
├── .github/                        # CI/CD workflows
│   └── workflows/
│       ├── ci.yaml                # Test and lint on PR
│       └── deploy.yaml            # Deploy to Digital Ocean
├── apps/                          # Application packages
│   ├── web/                       # Angular frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── core/         # Singleton services
│   │   │   │   ├── features/     # Feature modules
│   │   │   │   ├── shared/       # Shared components
│   │   │   │   └── layouts/      # Layout components
│   │   │   ├── assets/           # Static assets
│   │   │   ├── environments/     # Environment configs
│   │   │   └── styles/           # Global styles
│   │   ├── public/               # Public assets
│   │   ├── angular.json
│   │   ├── tailwind.config.js
│   │   └── package.json
│   └── api/                      # Express.js backend
│       ├── src/
│       │   ├── routes/           # API routes
│       │   ├── controllers/      # Route handlers
│       │   ├── services/         # Business logic
│       │   ├── repositories/     # Data access
│       │   ├── middleware/       # Express middleware
│       │   ├── validators/       # Input validation
│       │   ├── utils/           # Utilities
│       │   └── server.ts        # Server entry
│       ├── migrations/          # Database migrations
│       ├── seeds/              # Seed data
│       ├── tests/              # API tests
│       └── package.json
├── packages/                    # Shared packages
│   ├── shared/                 # Shared types/utils
│   │   ├── src/
│   │   │   ├── types/         # TypeScript interfaces
│   │   │   ├── constants/     # Shared constants
│   │   │   ├── validators/    # Shared validators
│   │   │   └── utils/        # Shared utilities
│   │   └── package.json
│   └── config/                # Shared configuration
│       ├── eslint/           # ESLint rules
│       ├── typescript/       # TS config
│       └── jest/            # Jest config
├── infrastructure/           # Infrastructure as code
│   ├── docker/
│   │   ├── Dockerfile.web   # Angular container
│   │   ├── Dockerfile.api   # Express container
│   │   └── nginx.conf      # Nginx config
│   └── docker-compose.yml  # Local development
├── scripts/                # Build/deploy scripts
│   ├── setup.sh           # Initial setup
│   ├── migrate.sh         # Run migrations
│   └── seed.sh           # Load seed data
├── docs/                  # Documentation
│   ├── prd.md
│   ├── architecture.md   # This document
│   └── api/              # API docs
├── .env.example          # Environment template
├── package.json          # Root package.json
├── nx.json              # Nx configuration (if using)
└── README.md            # Getting started guide
```

## Development Workflow

### Local Development Setup

#### Prerequisites
```bash
# Required software
node --version  # v20.x or higher
npm --version   # v10.x or higher
docker --version # v24.x or higher
docker-compose --version # v2.x or higher

# Optional but recommended
git --version   # v2.x or higher
```

#### Initial Setup
```bash
# Clone repository
git clone https://github.com/your-org/nodeangularfullstack.git
cd nodeangularfullstack

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start Docker services
docker-compose up -d

# Run database migrations
npm run migrate

# Seed initial data
npm run seed

# Start development servers
npm run dev
```

#### Development Commands
```bash
# Start all services
npm run dev

# Start frontend only
npm run dev:web

# Start backend only
npm run dev:api

# Run tests
npm run test           # All tests
npm run test:web       # Frontend tests
npm run test:api       # Backend tests
npm run test:e2e       # E2E tests
```

### Environment Configuration

#### Required Environment Variables
```bash
# Frontend (.env.local)
VITE_API_URL=http://localhost:3000/api/v1
VITE_ENVIRONMENT=development

# Backend (.env)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
ENABLE_MULTI_TENANCY=false

# Shared
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=debug
```

## Deployment Architecture

### Deployment Strategy

**Frontend Deployment:**
- **Platform:** Digital Ocean App Platform (Static Sites)
- **Build Command:** `npm run build:web`
- **Output Directory:** `dist/apps/web`
- **CDN/Edge:** CloudFlare CDN with custom domain

**Backend Deployment:**
- **Platform:** Digital Ocean App Platform (Apps)
- **Build Command:** `npm run build:api`
- **Deployment Method:** Docker container with auto-scaling

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test
      - run: npm run lint

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push Docker image
        run: |
          docker build -f infrastructure/docker/Dockerfile.api -t registry.digitalocean.com/project/api:${{ github.sha }} .
          docker push registry.digitalocean.com/project/api:${{ github.sha }}
      - name: Deploy to Digital Ocean
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
        run: |
          doctl apps create-deployment ${{ secrets.APP_ID }} --image registry.digitalocean.com/project/api:${{ github.sha }}

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build frontend
        run: |
          npm ci
          npm run build:web
      - name: Deploy to Digital Ocean Static Sites
        uses: digitalocean/action-static-site@v1
        with:
          app_name: nodeangularfullstack-web
          source_dir: dist/apps/web
```

### Environments

| Environment | Frontend URL | Backend URL | Purpose |
|------------|--------------|-------------|---------|
| Development | http://localhost:4200 | http://localhost:3000 | Local development |
| Staging | https://staging.example.com | https://api-staging.example.com | Pre-production testing |
| Production | https://app.example.com | https://api.example.com | Live environment |

## Security and Performance

### Security Requirements

**Frontend Security:**
- CSP Headers: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'`
- XSS Prevention: Angular's built-in sanitization, strict CSP
- Secure Storage: JWT in httpOnly cookies with SameSite=strict

**Backend Security:**
- Input Validation: Joi/class-validator on all endpoints
- Rate Limiting: 100 requests per minute per IP
- CORS Policy: Whitelist specific origins only

**Authentication Security:**
- Token Storage: Access token in memory, refresh in httpOnly cookie
- Session Management: Sliding expiration with 15min access, 7d refresh
- Password Policy: Min 8 chars, uppercase, lowercase, number, special char

### Performance Optimization

**Frontend Performance:**
- Bundle Size Target: <500KB initial, <50KB per lazy route
- Loading Strategy: Lazy loading with preloading strategy
- Caching Strategy: Service worker with cache-first for assets

**Backend Performance:**
- Response Time Target: p95 <200ms, p99 <500ms
- Database Optimization: Connection pooling, indexed queries, prepared statements
- Caching Strategy: Redis for sessions, API response cache with 5min TTL

## Testing Strategy

### Testing Pyramid
```text
        E2E Tests
       /        \
   Integration Tests
   /            \
Frontend Unit  Backend Unit
```

### Test Organization

#### Frontend Tests
```text
apps/web/src/
├── app/
│   ├── core/
│   │   └── auth/
│   │       ├── auth.service.spec.ts
│   │       └── auth.guard.spec.ts
│   └── features/
│       └── users/
│           └── users.component.spec.ts
└── test-setup.ts
```

#### Backend Tests
```text
apps/api/
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── auth.test.ts
│   │   └── users.test.ts
│   └── fixtures/
└── jest.config.js
```

#### E2E Tests
```text
e2e/
├── specs/
│   ├── auth.spec.ts
│   └── user-journey.spec.ts
├── fixtures/
└── playwright.config.ts
```

### Test Examples

#### Frontend Component Test
```typescript
// users.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsersComponent } from './users.component';
import { UsersService } from './users.service';
import { of } from 'rxjs';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let usersService: jasmine.SpyObj<UsersService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('UsersService', ['getUsers']);

    TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        { provide: UsersService, useValue: spy }
      ]
    });

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    usersService = TestBed.inject(UsersService) as jasmine.SpyObj<UsersService>;
  });

  it('should load users on init', () => {
    const mockUsers = [{ id: '1', email: 'test@example.com' }];
    usersService.getUsers.and.returnValue(of({ data: mockUsers }));

    fixture.detectChanges();

    expect(usersService.getUsers).toHaveBeenCalled();
    expect(component.users()).toEqual(mockUsers);
  });
});
```

#### Backend API Test
```typescript
// auth.test.ts
import request from 'supertest';
import { app } from '../src/server';
import { pool } from '../src/db';

describe('Auth Endpoints', () => {
  beforeEach(async () => {
    await pool.query('DELETE FROM users');
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject duplicate emails', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#'
        });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test456!@#'
        });

      expect(response.status).toBe(409);
      expect(response.body.error.message).toContain('already exists');
    });
  });
});
```

#### E2E Test
```typescript
// auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should complete full auth cycle', async ({ page }) => {
    // Registration
    await page.goto('/auth/register');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test123!@#');
    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome, John');

    // Logout
    await page.click('button[aria-label="Logout"]');
    await expect(page).toHaveURL('/auth/login');

    // Login
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });
});
```

## Coding Standards

### Critical Fullstack Rules

- **Type Sharing:** Always define types in packages/shared and import from there
- **API Calls:** Never make direct HTTP calls - use the service layer
- **Environment Variables:** Access only through config objects, never process.env directly
- **Error Handling:** All API routes must use the standard error handler
- **State Updates:** Never mutate state directly - use proper state management patterns
- **Tenant Isolation:** Always include tenant context in queries when multi-tenancy is enabled
- **Token Handling:** Never store JWT in localStorage - use httpOnly cookies or memory
- **Database Queries:** Use parameterized queries to prevent SQL injection
- **Input Validation:** Validate all user input on both frontend and backend
- **Documentation:** All public functions, interfaces, and classes MUST have JSDoc comments

### Documentation Standards

**JSDoc Requirements:**
All public APIs must be documented with JSDoc comments. This is CRITICAL for maintainability and AI agent understanding.

```typescript
// Frontend Example - Angular Service
/**
 * Manages user authentication and JWT token lifecycle.
 * Handles login, logout, and token refresh operations.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /**
   * Authenticates a user with email and password.
   * @param credentials - User login credentials
   * @returns Observable containing user data and tokens
   * @throws {HttpErrorResponse} When authentication fails
   * @example
   * authService.login({ email: 'user@example.com', password: 'pass123' })
   *   .subscribe(result => console.log('Logged in:', result.user));
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    // Implementation
  }
}

// Backend Example - Express Controller
/**
 * Handles user profile operations.
 * Requires JWT authentication for all endpoints.
 */
export class UsersController {
  /**
   * Updates the authenticated user's profile information.
   * @param req - Express request with authenticated user
   * @param res - Express response
   * @param next - Express next function
   * @returns Updated user profile
   * @throws {ApiError} 400 - Invalid input data
   * @throws {ApiError} 401 - User not authenticated
   * @throws {ApiError} 404 - User not found
   */
  updateProfile = AsyncHandler(async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    // Implementation
  });
}

// Shared Types Example
/**
 * Represents a user in the system.
 * Used across frontend and backend for type consistency.
 */
export interface User {
  /** Unique identifier (UUID v4) */
  id: string;
  /** User's email address (unique per tenant) */
  email: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** User role determining permissions */
  role: 'admin' | 'user' | 'readonly';
  /** Optional tenant ID for multi-tenant mode */
  tenantId?: string;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
}
```

**Documentation Rules:**
- **Functions:** Document purpose, parameters, return value, exceptions, and provide examples for complex operations
- **Classes/Services:** Document the overall responsibility and key behaviors
- **Interfaces/Types:** Document the purpose and important fields, especially for shared types
- **Complex Logic:** Add inline comments explaining the "why" not the "what"
- **API Endpoints:** Include HTTP method, path, required permissions, request/response formats
- **Component Props:** Document each prop's purpose and valid values
- **Hooks:** Document dependencies, return values, and side effects

### Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `UserProfile.tsx` |
| Hooks | camelCase with 'use' | - | `useAuth.ts` |
| API Routes | - | kebab-case | `/api/user-profile` |
| Database Tables | - | snake_case | `user_profiles` |

## Error Handling Strategy

### Error Flow
```mermaid
sequenceDiagram
    participant Frontend
    participant API
    participant ErrorHandler
    participant Logger
    participant Client

    Frontend->>API: Request
    API->>API: Process request
    API->>API: Error occurs
    API->>ErrorHandler: Throw ApiError
    ErrorHandler->>Logger: Log error details
    ErrorHandler->>ErrorHandler: Format response
    ErrorHandler-->>Frontend: Error response
    Frontend->>Frontend: Parse error
    Frontend->>Client: Display user-friendly message
```

### Error Response Format
```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  };
}
```

### Frontend Error Handling
```typescript
// core/error/error.handler.ts
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ToastService } from '@shared/services/toast.service';
import { LoggerService } from '@core/services/logger.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private toast = inject(ToastService);
  private logger = inject(LoggerService);

  handleError(error: Error): void {
    this.logger.error('Unhandled error', error);

    if (error instanceof HttpErrorResponse) {
      this.handleHttpError(error);
    } else {
      this.toast.error('An unexpected error occurred');
    }
  }

  private handleHttpError(error: HttpErrorResponse): void {
    const message = error.error?.error?.message || 'Server error occurred';
    this.toast.error(message);
  }
}
```

### Backend Error Handling
```typescript
// middleware/error.middleware.ts
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.id;

  logger.error({
    requestId,
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId
    }
  });
};
```

## Monitoring and Observability

### Monitoring Stack

- **Frontend Monitoring:** Sentry for error tracking, performance monitoring via Web Vitals
- **Backend Monitoring:** Sentry for errors, custom metrics with Prometheus
- **Error Tracking:** Sentry with source maps for detailed stack traces
- **Performance Monitoring:** New Relic APM for detailed performance insights

### Key Metrics

**Frontend Metrics:**
- Core Web Vitals (LCP, FID, CLS)
- JavaScript errors and stack traces
- API response times from client perspective
- User interactions and conversion funnel

**Backend Metrics:**
- Request rate (requests/second)
- Error rate (4xx, 5xx responses)
- Response time (p50, p95, p99)
- Database query performance
- Cache hit ratio
- Memory and CPU usage

## Checklist Results Report

*To be executed with architect-checklist for validation*

---

**Document Complete**

This comprehensive full-stack architecture document provides the complete technical blueprint for the NodeAngularFullStack project, covering all aspects from high-level design to implementation details.