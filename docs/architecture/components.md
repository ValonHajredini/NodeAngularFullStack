# Components

## Frontend Components

**Auth Module**
**Responsibility:** Handle authentication flows including login, registration, password reset, and session management

**Key Interfaces:**
- AuthService: JWT token management and API calls
- AuthGuard: Route protection based on authentication
- AuthInterceptor: Automatic token injection in HTTP requests

**Dependencies:** Angular Router, HttpClient, NgRx Store

**Technology Stack:** Angular 20+, RxJS, TypeScript

## Backend Services

**Auth Service**
**Responsibility:** JWT token generation, validation, user authentication, and password management

**Key Interfaces:**
- generateTokens(): Create access and refresh tokens
- validateToken(): Verify JWT signature and expiration
- hashPassword(): Bcrypt password hashing
- validatePassword(): Password verification

**Dependencies:** jsonwebtoken, bcrypt, User Repository

**Technology Stack:** Express.js, TypeScript, Passport.js

## Database Layer

**User Repository**
**Responsibility:** Abstract database operations for user entity with tenant isolation

**Key Interfaces:**
- findById(id, tenantId?): Retrieve user with optional tenant filtering
- findByEmail(email, tenantId?): Email-based user lookup
- create(userData): Create new user record
- update(id, updates): Update user information

**Dependencies:** PostgreSQL client, Database connection pool

**Technology Stack:** node-postgres, TypeScript

## Infrastructure Components

**Nginx Reverse Proxy**
**Responsibility:** Request routing, SSL termination, rate limiting, and static file serving

**Key Interfaces:**
- /api/* → Express.js backend
- /docs → Swagger UI
- /* → Angular static files

**Dependencies:** Docker network, upstream services

**Technology Stack:** Nginx 1.25+, Docker

## Component Diagram

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
