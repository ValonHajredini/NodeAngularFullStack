# Database Separation Architecture Plan

## Overview

This document outlines the plan to separate the monolithic database into three microservices
databases to support independent deployment and scaling of services.

## Current State

- **Single Database**: `nodeangularfullstack`
- **17 Tables**: All tables in one database
- **Two Frontend Apps**:
  - `apps/web` - Main web application dashboard
  - `apps/form-builder-ui` - Form builder application
- **One Backend**: `apps/api` serving both frontends

## Target Architecture

### Database Separation Strategy

```
┌─────────────────────────────────────────────────────┐
│         nodeangularfullstack_auth (Shared)         │
│  ┌──────────────────────────────────────────────┐  │
│  │ Authentication & Authorization               │  │
│  │ - users                                      │  │
│  │ - tenants                                    │  │
│  │ - sessions                                   │  │
│  │ - password_resets                            │  │
│  │ - api_tokens                                 │  │
│  │ - api_token_usage                            │  │
│  │ - audit_logs                                 │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │                               │
┌───────▼─────────────┐   ┌─────────────▼──────────────┐
│ nodeangular_web     │   │ nodeangular_forms          │
│ (Web App Service)   │   │ (Form Builder Service)     │
│                     │   │                            │
│ - tools             │   │ - forms                    │
│ - tool_configs      │   │ - form_schemas             │
│ - tool_registry     │   │ - form_submissions         │
│ - export_jobs       │   │ - form_themes              │
│ - drawing_projects  │   │ - short_links              │
└─────────────────────┘   └────────────────────────────┘
```

### Table Ownership

#### Auth Database (`nodeangularfullstack_auth`)

**Purpose**: Centralized authentication, authorization, and tenant management

| Table           | Purpose                      | Shared By    |
| --------------- | ---------------------------- | ------------ |
| users           | User accounts                | All services |
| tenants         | Multi-tenancy configuration  | All services |
| sessions        | JWT refresh token management | All services |
| password_resets | Password reset tokens        | All services |
| api_tokens      | API authentication tokens    | All services |
| api_token_usage | Token usage tracking         | All services |
| audit_logs      | Security audit trail         | All services |

**Key Fields**:

- `users.id` (UUID) - Referenced by all services via `user_id`
- `tenants.id` (UUID) - Referenced by all services via `tenant_id`

#### Web App Database (`nodeangularfullstack_web`)

**Purpose**: Main web application data (tools, registry, exports)

| Table            | Purpose                         | References Auth DB  |
| ---------------- | ------------------------------- | ------------------- |
| tools            | Tool metadata and configuration | user_id, tenant_id  |
| tool_configs     | Tool-specific configurations    | user_id (via tools) |
| tool_registry    | Registered tools catalog        | user_id, tenant_id  |
| export_jobs      | Tool export job tracking        | user_id, tenant_id  |
| drawing_projects | SVG drawing project data        | user_id, tenant_id  |

**Foreign Key Strategy**:

- Stores `user_id` and `tenant_id` as UUID fields
- Application layer validates against Auth DB
- No database-level foreign key constraints across databases

#### Form Builder Database (`nodeangularfullstack_forms`)

**Purpose**: Form builder feature data

| Table            | Purpose                            | References Auth DB  |
| ---------------- | ---------------------------------- | ------------------- |
| forms            | Form metadata                      | user_id, tenant_id  |
| form_schemas     | Versioned form definitions (JSONB) | user_id (via forms) |
| form_submissions | Public form submission data        | user_id (optional)  |
| form_themes      | Theme configurations               | user_id, tenant_id  |
| short_links      | Short URL mappings for forms       | -                   |

**Foreign Key Strategy**:

- Stores `user_id` and `tenant_id` as UUID fields
- Application layer validates against Auth DB
- No database-level foreign key constraints across databases

## Implementation Plan

### Phase 1: Database Setup

1. Create three new PostgreSQL databases
2. Configure connection pools for each database
3. Set up environment variables for multi-database support

### Phase 2: Schema Migration

1. Export existing schema from monolithic database
2. Split schema into three migration scripts
3. Run migrations on new databases
4. Verify schema correctness

### Phase 3: Data Migration

1. Create data migration scripts
2. Copy data from monolithic to separated databases
3. Verify data integrity
4. Create backup of monolithic database

### Phase 4: Application Layer Changes

1. Create separate database connection pools
2. Update repository pattern to use correct connections
3. Implement shared authentication service
4. Add application-layer foreign key validation
5. Update environment configuration

### Phase 5: Service Layer Updates

1. Create user/tenant lookup service for cross-database queries
2. Update services to handle cross-database relationships
3. Implement caching for frequently accessed auth data
4. Add retry logic for cross-database operations

### Phase 6: Testing

1. Unit tests for new connection logic
2. Integration tests for cross-database queries
3. End-to-end tests for complete workflows
4. Performance testing for cross-database joins

### Phase 7: Deployment

1. Deploy new database infrastructure
2. Run data migration in production
3. Switch connection strings to new databases
4. Monitor for issues
5. Keep monolithic database as backup (1 week retention)

## Technical Implementation Details

### Multi-Database Configuration

**New Environment Variables**:

```env
# Auth Database
AUTH_DB_HOST=localhost
AUTH_DB_PORT=5432
AUTH_DB_NAME=nodeangularfullstack_auth
AUTH_DB_USER=dbuser
AUTH_DB_PASSWORD=dbpassword

# Web App Database
WEB_DB_HOST=localhost
WEB_DB_PORT=5432
WEB_DB_NAME=nodeangularfullstack_web
WEB_DB_USER=dbuser
WEB_DB_PASSWORD=dbpassword

# Form Builder Database
FORMS_DB_HOST=localhost
FORMS_DB_PORT=5432
FORMS_DB_NAME=nodeangularfullstack_forms
FORMS_DB_USER=dbuser
FORMS_DB_PASSWORD=dbpassword
```

### Connection Pool Architecture

**File**: `apps/api/src/config/database.config.ts`

```typescript
export const authPool = new Pool(authPoolConfig);
export const webPool = new Pool(webPoolConfig);
export const formsPool = new Pool(formsPoolConfig);
```

### Repository Pattern Update

**Base Repository**:

```typescript
export class BaseRepository {
  protected pool: Pool;

  constructor(databaseType: 'auth' | 'web' | 'forms') {
    switch (databaseType) {
      case 'auth':
        this.pool = authPool;
        break;
      case 'web':
        this.pool = webPool;
        break;
      case 'forms':
        this.pool = formsPool;
        break;
    }
  }
}
```

**Example Repository**:

```typescript
export class FormsRepository extends BaseRepository {
  constructor() {
    super('forms'); // Uses formsPool
  }

  async findByUserId(userId: string): Promise<Form[]> {
    // userId is validated against auth DB by service layer
    const result = await this.pool.query('SELECT * FROM forms WHERE user_id = $1', [userId]);
    return result.rows;
  }
}
```

### Shared Authentication Service

**File**: `apps/api/src/services/shared-auth.service.ts`

```typescript
export class SharedAuthService {
  private userCache = new Map<string, User>();
  private tenantCache = new Map<string, Tenant>();

  async validateUser(userId: string): Promise<boolean> {
    // Check cache first
    if (this.userCache.has(userId)) {
      return true;
    }

    // Query auth database
    const result = await authPool.query('SELECT id FROM users WHERE id = $1 AND is_active = true', [
      userId,
    ]);

    if (result.rows.length > 0) {
      this.userCache.set(userId, result.rows[0]);
      return true;
    }

    return false;
  }

  async validateTenant(tenantId: string): Promise<boolean> {
    // Similar implementation for tenant validation
  }

  async getUser(userId: string): Promise<User | null> {
    // Return cached or fetch from auth DB
  }
}
```

## Cross-Database Query Patterns

### Pattern 1: Application-Layer Joins

```typescript
// Service layer performs join logic
async getFormWithUser(formId: string): Promise<FormWithUser> {
  // Query forms database
  const form = await formsRepo.findById(formId);

  // Query auth database for user details
  const user = await sharedAuthService.getUser(form.user_id);

  return { ...form, user };
}
```

### Pattern 2: Denormalization

```typescript
// Store frequently accessed data from auth DB in service DB
interface FormWithUserInfo {
  id: string;
  title: string;
  user_id: string;
  user_email: string; // Denormalized from auth DB
  user_name: string; // Denormalized from auth DB
}
```

### Pattern 3: Event-Driven Sync

```typescript
// When user is updated in auth DB, emit event to update other services
authService.on('user.updated', (user) => {
  formsService.updateUserInfo(user);
  webService.updateUserInfo(user);
});
```

## Data Migration Scripts

### Script 1: Create Databases

```bash
#!/bin/bash
# scripts/db/create-separated-databases.sh

createdb -h localhost -U dbuser nodeangularfullstack_auth
createdb -h localhost -U dbuser nodeangularfullstack_web
createdb -h localhost -U dbuser nodeangularfullstack_forms
```

### Script 2: Migrate Schema

```bash
#!/bin/bash
# scripts/db/migrate-schema.sh

# Auth database
psql -h localhost -U dbuser -d nodeangularfullstack_auth \
  -f apps/api/database/migrations-auth/*.sql

# Web database
psql -h localhost -U dbuser -d nodeangularfullstack_web \
  -f apps/api/database/migrations-web/*.sql

# Forms database
psql -h localhost -U dbuser -d nodeangularfullstack_forms \
  -f apps/api/database/migrations-forms/*.sql
```

### Script 3: Migrate Data

```sql
-- scripts/db/migrate-data-auth.sql
INSERT INTO nodeangularfullstack_auth.users
SELECT * FROM nodeangularfullstack.users;

INSERT INTO nodeangularfullstack_auth.tenants
SELECT * FROM nodeangularfullstack.tenants;

-- ... repeat for all auth tables

-- scripts/db/migrate-data-web.sql
INSERT INTO nodeangularfullstack_web.tools
SELECT * FROM nodeangularfullstack.tools;

-- ... repeat for all web tables

-- scripts/db/migrate-data-forms.sql
INSERT INTO nodeangularfullstack_forms.forms
SELECT * FROM nodeangularfullstack.forms;

-- ... repeat for all forms tables
```

## Rollback Strategy

### Quick Rollback

1. Stop application servers
2. Revert environment variables to monolithic database
3. Restart application servers
4. Monolithic database remains intact during transition

### Data Rollback

1. Keep monolithic database running in read-only mode for 1 week
2. If issues found, copy data back from separated databases
3. Verify data integrity with checksums
4. Switch connection strings back to monolithic

## Performance Considerations

### Query Optimization

- **Before**: Single query with JOIN across tables
- **After**: Two queries (one per database) + application-layer join
- **Impact**: Slight latency increase (1-5ms per cross-database query)
- **Mitigation**: Caching frequently accessed auth data

### Connection Pooling

- **Before**: Single pool with 20 connections
- **After**: Three pools with 10 connections each
- **Benefit**: Better resource allocation per service
- **Risk**: Higher total connection count (monitor PostgreSQL limits)

### Caching Strategy

- Cache user and tenant data in memory (Redis or in-process)
- TTL: 5 minutes for user data, 1 hour for tenant data
- Invalidate cache on user/tenant updates

## Monitoring & Observability

### Metrics to Track

- Connection pool utilization per database
- Cross-database query latency
- Cache hit/miss ratio for auth data
- Foreign key validation failures

### Alerting Thresholds

- Connection pool exhaustion (> 90% utilization)
- Cross-database query latency > 100ms
- Cache miss ratio > 30%
- Foreign key validation failures > 1% of requests

## Security Considerations

### Access Control

- Each database has separate user credentials
- Web service cannot directly access Forms database
- Forms service cannot directly access Web database
- Both services access Auth database (read-only for user/tenant lookup)

### Database Permissions

```sql
-- Auth database: Read-only access for web and forms services
GRANT SELECT ON users, tenants TO webservice_user, formsservice_user;

-- Web database: Full access for web service only
GRANT ALL ON ALL TABLES IN SCHEMA public TO webservice_user;

-- Forms database: Full access for forms service only
GRANT ALL ON ALL TABLES IN SCHEMA public TO formsservice_user;
```

### Network Isolation

- In production, use separate database servers or schemas
- Implement network policies to restrict cross-service database access
- Use SSL/TLS for database connections

## Testing Strategy

### Unit Tests

- Test repository connection selection
- Test shared auth service caching
- Test application-layer foreign key validation

### Integration Tests

- Test cross-database queries
- Test data consistency across databases
- Test rollback scenarios

### Performance Tests

- Benchmark cross-database queries vs. monolithic queries
- Load test connection pools under high traffic
- Test cache effectiveness

### End-to-End Tests

- Test complete user workflows across services
- Test authentication flow with separated auth DB
- Test form creation and submission with separated forms DB

## Timeline

| Phase                        | Duration | Dependencies |
| ---------------------------- | -------- | ------------ |
| 1. Database Setup            | 1 day    | -            |
| 2. Schema Migration          | 2 days   | Phase 1      |
| 3. Data Migration            | 1 day    | Phase 2      |
| 4. Application Layer Changes | 3 days   | Phase 3      |
| 5. Service Layer Updates     | 2 days   | Phase 4      |
| 6. Testing                   | 3 days   | Phase 5      |
| 7. Deployment                | 1 day    | Phase 6      |

**Total Estimated Duration**: 13 days

## Risks & Mitigation

| Risk                            | Impact | Probability | Mitigation                                            |
| ------------------------------- | ------ | ----------- | ----------------------------------------------------- |
| Data loss during migration      | High   | Low         | Multiple backups, dry-run migrations, rollback plan   |
| Performance degradation         | Medium | Medium      | Caching, query optimization, monitoring               |
| Foreign key validation failures | Medium | Low         | Comprehensive testing, validation service             |
| Connection pool exhaustion      | Medium | Low         | Proper pool sizing, monitoring, alerts                |
| Rollback complexity             | High   | Low         | Keep monolithic DB intact, automated rollback scripts |

## Success Criteria

1. ✅ All three databases created and operational
2. ✅ All tables migrated to correct databases
3. ✅ All data migrated without loss or corruption
4. ✅ Application layer validates foreign keys correctly
5. ✅ No query failures due to missing cross-database JOINs
6. ✅ Performance within acceptable thresholds (< 10% latency increase)
7. ✅ All existing tests pass
8. ✅ Rollback tested and verified
9. ✅ Documentation updated
10. ✅ Team trained on new architecture

## Next Steps

1. **Review this plan** with the team and stakeholders
2. **Get approval** for the database separation
3. **Create backup** of current monolithic database
4. **Begin implementation** starting with Phase 1

## References

- [Microservices Database Patterns](https://microservices.io/patterns/data/database-per-service.html)
- [PostgreSQL Multi-Database Applications](https://www.postgresql.org/docs/current/manage-ag-overview.html)
- [Cross-Database Query Patterns](https://martinfowler.com/articles/distributed-data-management.html)
