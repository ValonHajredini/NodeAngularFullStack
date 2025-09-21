# Component Interaction Diagrams

## Overview

This document provides detailed component interaction diagrams that illustrate how different parts
of the NodeAngularFullStack system communicate and collaborate.

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant LC as LoginComponent
    participant AS as AuthService
    participant AI as AuthInterceptor
    participant API as Express API
    participant AM as AuthMiddleware
    participant DB as PostgreSQL
    participant R as Redis

    U->>LC: Enter credentials
    LC->>AS: login(credentials)
    AS->>API: POST /api/auth/login
    API->>AM: Validate request
    AM->>DB: Check user credentials
    DB-->>AM: User data
    AM->>R: Store session
    R-->>AM: Session ID
    AM-->>API: JWT + Refresh token
    API-->>AS: Auth response
    AS->>AS: Store tokens (httpOnly)
    AS-->>LC: Login success
    LC-->>U: Redirect to dashboard

    Note over AS,AI: All subsequent API calls include JWT
    AS->>AI: HTTP request
    AI->>AI: Add Authorization header
    AI->>API: Request with JWT
    API->>AM: Validate JWT
    AM-->>API: Authorized request
```

## Feature Module Loading

```mermaid
graph TD
    A[App Component] --> B[Router Outlet]
    B --> C{Route Guard}
    C -->|Authenticated| D[Feature Module]
    C -->|Not Authenticated| E[Auth Module]

    D --> F[Feature Component]
    F --> G[Feature Service]
    G --> H[Shared Service]
    H --> I[HTTP Client]
    I --> J[Backend API]

    D --> K[Shared Components]
    K --> L[Button Component]
    K --> M[Modal Component]
    K --> N[Form Field Component]

    style D fill:#4CAF50
    style E fill:#FF9800
    style K fill:#2196F3
```

## State Management Flow

```mermaid
graph LR
    A[Component] --> B[Signal Store]
    B --> C[Computed Signals]
    C --> D[Template]

    A --> E[Service]
    E --> F[HTTP Client]
    F --> G[Backend API]
    G --> H[Service Response]
    H --> I[Update Signal]
    I --> B

    J[Effect] --> B
    J --> K[Side Effects]
    K --> L[Router Navigation]
    K --> M[Local Storage]
    K --> N[Notifications]

    style B fill:#FF6B6B
    style C fill:#4ECDC4
    style J fill:#45B7D1
```

## Backend Service Architecture

```mermaid
graph TB
    subgraph "Presentation Layer"
        A[Express Routes]
        B[Controllers]
        C[Middleware]
    end

    subgraph "Application Layer"
        D[Services]
        E[Use Cases]
        F[Domain Logic]
    end

    subgraph "Infrastructure Layer"
        G[Repositories]
        H[Database Clients]
        I[External APIs]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    D --> I

    style D fill:#4CAF50
    style G fill:#FF9800
    style B fill:#2196F3
```

## Database Transaction Flow

```mermaid
sequenceDiagram
    participant C as Controller
    participant S as Service
    participant R as Repository
    participant DB as PostgreSQL
    participant Cache as Redis

    C->>S: Business operation
    S->>R: Start transaction
    R->>DB: BEGIN

    loop For each operation
        S->>R: Repository method
        R->>DB: SQL query
        DB-->>R: Result
        R-->>S: Processed data
    end

    S->>R: Commit transaction
    R->>DB: COMMIT
    DB-->>R: Success

    S->>Cache: Update cache
    Cache-->>S: Cache updated

    S-->>C: Operation result
    C-->>C: Format response
```

## Error Handling Flow

```mermaid
graph TD
    A[Component Action] --> B{Try Block}
    B -->|Success| C[Update State]
    B -->|Error| D[Catch Block]

    D --> E[Error Service]
    E --> F{Error Type}

    F -->|Validation| G[Show Form Errors]
    F -->|Auth| H[Redirect to Login]
    F -->|Network| I[Show Retry Button]
    F -->|Unknown| J[Show Generic Error]

    E --> K[Log to Console]
    E --> L[Send to Sentry]

    G --> M[User Feedback]
    H --> M
    I --> M
    J --> M

    style D fill:#FF6B6B
    style E fill:#FFA726
```

## Real-time Communication (WebSocket)

```mermaid
sequenceDiagram
    participant C as Component
    participant WS as WebSocket Service
    participant S as Socket.IO Server
    participant R as Redis Pub/Sub
    participant API as Backend Service

    C->>WS: Subscribe to updates
    WS->>S: Connect with auth token
    S->>S: Validate token
    S->>R: Subscribe to channels

    Note over C,API: User performs action elsewhere

    API->>R: Publish update
    R->>S: Broadcast to subscribers
    S->>WS: Emit update event
    WS->>C: Notify component
    C->>C: Update UI
```

## File Upload Flow

```mermaid
graph LR
    A[File Input] --> B[Upload Component]
    B --> C[Upload Service]
    C --> D{File Validation}

    D -->|Valid| E[Generate Presigned URL]
    D -->|Invalid| F[Show Error]

    E --> G[Direct Upload to S3]
    G --> H[Notify Backend]
    H --> I[Update Database]
    I --> J[Confirm to Frontend]

    style D fill:#FFA726
    style G fill:#4CAF50
```

## Multi-Tenant Request Flow

```mermaid
sequenceDiagram
    participant U as User (Tenant A)
    participant F as Frontend
    participant LB as Load Balancer
    participant API as Express API
    participant TM as Tenant Middleware
    participant DB as PostgreSQL

    U->>F: Make request
    F->>LB: HTTP request + JWT
    LB->>API: Forward request
    API->>TM: Extract tenant from JWT
    TM->>TM: Set tenant context
    TM->>DB: Query with tenant filter
    DB-->>TM: Tenant-specific data
    TM-->>API: Filtered response
    API-->>LB: JSON response
    LB-->>F: Response
    F-->>U: Update UI

    Note over TM,DB: All queries automatically filtered by tenant
```

## Caching Strategy

```mermaid
graph TD
    A[API Request] --> B{Cache Check}
    B -->|Hit| C[Return Cached Data]
    B -->|Miss| D[Query Database]

    D --> E[Process Data]
    E --> F[Store in Cache]
    F --> G[Return Data]

    H[Cache Invalidation] --> I{Invalidation Type}
    I -->|TTL Expired| J[Remove Entry]
    I -->|Manual| K[Clear Specific Keys]
    I -->|Pattern| L[Clear Key Pattern]

    style B fill:#4ECDC4
    style H fill:#FF6B6B
```

## Development Workflow

```mermaid
graph LR
    A[Code Change] --> B[Hot Reload]
    B --> C[TypeScript Compilation]
    C --> D[Browser Update]

    E[API Change] --> F[Nodemon Restart]
    F --> G[Swagger Update]

    H[Database Change] --> I[Migration Run]
    I --> J[Schema Update]

    K[Test Run] --> L{Test Results}
    L -->|Pass| M[Commit Code]
    L -->|Fail| N[Fix Issues]
    N --> A

    style L fill:#4CAF50
    style N fill:#FF6B6B
```

## Monitoring and Observability

```mermaid
graph TB
    subgraph "Application"
        A[Frontend Components]
        B[Backend Services]
        C[Database Operations]
    end

    subgraph "Monitoring"
        D[Error Tracking - Sentry]
        E[Logging - Winston/Logtail]
        F[Metrics - Custom]
        G[Health Checks]
    end

    subgraph "Alerting"
        H[Error Alerts]
        I[Performance Alerts]
        J[Uptime Alerts]
    end

    A --> D
    A --> E
    B --> D
    B --> E
    B --> F
    C --> E
    C --> F

    D --> H
    E --> I
    F --> I
    G --> J

    style D fill:#FF6B6B
    style E fill:#4CAF50
    style F fill:#2196F3
```

## Extension Points

### Adding New Components

1. **Create Feature Module**: Follow the feature-based organization pattern
2. **Define Interfaces**: Add shared types to `packages/shared`
3. **Implement Services**: Create service layer with repository pattern
4. **Add Routes**: Configure routing with guards and lazy loading
5. **Write Tests**: Implement comprehensive test coverage

### Custom Authentication Providers

```mermaid
graph LR
    A[Auth Provider Interface] --> B[JWT Provider]
    A --> C[OAuth Provider]
    A --> D[SAML Provider]
    A --> E[Custom Provider]

    B --> F[Auth Service]
    C --> F
    D --> F
    E --> F

    F --> G[Application]
```

### Database Scaling

```mermaid
graph TB
    A[Application] --> B[Connection Pool]
    B --> C[Primary Database]
    B --> D[Read Replica 1]
    B --> E[Read Replica 2]

    F[Cache Layer] --> G[Redis Cluster]
    A --> F

    H[Write Operations] --> C
    I[Read Operations] --> D
    I --> E
```

These diagrams provide a visual reference for understanding how components interact within the
NodeAngularFullStack architecture. They serve as both documentation and a guide for extending the
system while maintaining architectural consistency.
