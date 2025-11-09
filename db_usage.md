# Database Architecture & Usage Guide

This document provides a comprehensive overview of the multi-database architecture used in the
NodeAngularFullStack project.

## Overview

The project uses a **multi-database architecture** with **4 separate PostgreSQL databases** running
on the same PostgreSQL server instance. This architecture supports the gradual migration from a
monolithic application to domain-specific services while maintaining backward compatibility.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Server (port 5432)                 │
├─────────────────────────────────────────────────────────────────┤
│ 1. nodeangularfullstack_auth       (Authentication DB)          │
│ 2. nodeangularfullstack_dashboard  (Dashboard API DB)           │
│ 3. nodeangularfullstack_forms      (Forms API DB)               │
│ 4. nodeangularfullstack            (Legacy Monolithic DB)       │
└─────────────────────────────────────────────────────────────────┘
```

## Database Descriptions

### 1. Authentication Database (`nodeangularfullstack_auth`)

**Purpose:** Centralized authentication and user management shared across all services.

**Environment Variable:** `AUTH_DB_NAME=nodeangularfullstack_auth`

**Access Pattern:**

- ✅ `apps/dashboard-api` - **Read-only** (user/tenant validation)
- ✅ `apps/forms-api` - **Read-only** (user/tenant validation)

**Contains:**

- User accounts and profiles
- JWT access tokens and refresh tokens
- User roles and permissions
- Tenant information (multi-tenancy support)
- Session management data

**Connection Pool Configuration:**

- Pool size: 10 connections (read-only access)
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

**Usage Example:**

```typescript
import { authPool } from './config/multi-database.config';

// Validate user authentication
const user = await authPool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

---

### 2. Dashboard Database (`nodeangularfullstack_dashboard`)

**Purpose:** Dashboard-specific data and tool registry management.

**Environment Variable:** `DASHBOARD_DB_NAME=nodeangularfullstack_dashboard`

**Access Pattern:**

- ✅ `apps/dashboard-api` - **Read-write** (primary owner)

**Contains:**

- Tool registry records (`tool_registry` table)
- Tool configurations
- Export jobs and export history (`export_jobs` table)
- Drawing projects and SVG data
- Dashboard-specific features and settings

**Connection Pool Configuration:**

- Pool size: 20 connections (full read-write access)
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

**Usage Example:**

```typescript
import { dashboardPool } from './config/multi-database.config';

// Query tool registry
const tools = await dashboardPool.query('SELECT * FROM tool_registry WHERE user_id = $1', [userId]);
```

---

### 3. Forms Database (`nodeangularfullstack_forms`)

**Purpose:** Form builder, themes, and submission data.

**Environment Variable:** `FORMS_DB_NAME=nodeangularfullstack_forms`

**Access Pattern:**

- ✅ `apps/forms-api` - **Read-write** (primary owner)
- ⚠️ `apps/dashboard-api` - **Temporary access** (architectural debt - should be removed)

**Contains:**

- Form schemas (`forms`, `form_schemas` tables)
- Form submissions (`form_submissions` table)
- Theme configurations (`form_themes` table)
- Short links and QR codes (`short_links` table)
- Public form rendering data

**Connection Pool Configuration:**

- Pool size: 20 connections (full read-write access for forms-api)
- Pool size: 10 connections (temporary legacy access for dashboard-api)
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

**Usage Example:**

```typescript
import { formsPool } from './config/multi-database.config';

// Query form schemas
const forms = await formsPool.query('SELECT * FROM forms WHERE user_id = $1', [userId]);
```

**⚠️ Architectural Debt:** The `apps/dashboard-api` currently has temporary access to the forms
database via `formsPool`. This violates service isolation principles and should be replaced with
HTTP calls to `apps/forms-api`. See `apps/dashboard-api/src/config/multi-database.config.ts:57-106`
for details.

---

### 4. Legacy Database (`nodeangularfullstack`)

**Purpose:** Backward compatibility during migration from monolithic architecture.

**Environment Variable:** `DB_NAME=nodeangularfullstack`

**Access Pattern:**

- ✅ `apps/api` - **Read-write** (legacy monolithic API)

**Contains:**

- All data from the original monolithic architecture
- Used for backward compatibility during gradual service extraction
- Will be deprecated once migration to separated services is complete

**Connection Pool Configuration:**

- Pool size: 20 connections
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

**Usage Example:**

```typescript
import { pool } from './config/database.config';

// Legacy monolithic query
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

---

## Service-to-Database Mapping

### Dashboard API (`apps/dashboard-api`)

**Configuration File:** `apps/dashboard-api/src/config/multi-database.config.ts`

**Database Access:** | Database | Access Level | Pool Name | Purpose |
|----------|-------------|-----------|---------| | `nodeangularfullstack_auth` | Read-only |
`authPool` | User/tenant validation | | `nodeangularfullstack_dashboard` | Read-write |
`dashboardPool` | Primary data storage | | `nodeangularfullstack_forms` | Temporary (deprecated) |
`formsPool` | Legacy access (architectural debt) |

**Connection Pools:**

```typescript
import { authPool, dashboardPool, formsPool } from './config/multi-database.config';

// Validate user (read-only auth database)
const user = await authPool.query('SELECT * FROM users WHERE id = $1', [userId]);

// Manage tools (read-write dashboard database)
const tool = await dashboardPool.query('SELECT * FROM tool_registry WHERE id = $1', [toolId]);

// DEPRECATED: Direct forms access (use HTTP calls to forms-api instead)
const form = await formsPool.query('SELECT * FROM forms WHERE id = $1', [formId]);
```

---

### Forms API (`apps/forms-api`)

**Configuration File:** `apps/forms-api/src/config/multi-database.config.ts`

**Database Access:** | Database | Access Level | Pool Name | Purpose |
|----------|-------------|-----------|---------| | `nodeangularfullstack_auth` | Read-only |
`authPool` | User/tenant validation | | `nodeangularfullstack_forms` | Read-write | `formsPool` |
Primary data storage |

**Connection Pools:**

```typescript
import { authPool, formsPool } from './config/multi-database.config';

// Validate user (read-only auth database)
const user = await authPool.query('SELECT * FROM users WHERE id = $1', [userId]);

// Manage forms (read-write forms database)
const form = await formsPool.query('SELECT * FROM forms WHERE user_id = $1', [userId]);
```

---

### Legacy API (`apps/api`)

**Configuration File:** `apps/api/src/config/database.config.ts`

**Database Access:** | Database | Access Level | Pool Name | Purpose |
|----------|-------------|-----------|---------| | `nodeangularfullstack` | Read-write | `pool` |
Legacy monolithic data |

**Connection Pool:**

```typescript
import { pool } from './config/database.config';

// Legacy monolithic query
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

---

## Environment Configuration

All database connections are configured via environment variables in `.env.development`:

```bash
# Database Connection Settings (Shared)
DB_HOST=localhost
DB_PORT=5432
DB_USER=dbuser
DB_PASSWORD=dbpassword
DB_SSL=false

# Authentication Database (Shared by all services)
AUTH_DB_NAME=nodeangularfullstack_auth

# Dashboard API Database
DASHBOARD_DB_NAME=nodeangularfullstack_dashboard

# Forms API Database
FORMS_DB_NAME=nodeangularfullstack_forms

# Legacy Monolithic Database (Backward compatibility)
DB_NAME=nodeangularfullstack
```

---

## Database Creation

All databases are automatically created by the setup scripts. To manually verify or create
databases:

```bash
# List all databases
psql -h localhost -U dbuser -d postgres -c "\l" | grep nodeangularfullstack

# Expected output:
# nodeangularfullstack           | dbuser    | UTF8 | C | C |
# nodeangularfullstack_auth      | postgres  | UTF8 | C | C |
# nodeangularfullstack_dashboard | postgres  | UTF8 | C | C |
# nodeangularfullstack_forms     | postgres  | UTF8 | C | C |
# nodeangularfullstack_test      | testuser  | UTF8 | C | C |
```

**Manual Database Creation:**

```bash
# Create databases (if not exist)
./scripts/db/create-separated-databases.sh

# Run migrations for all databases
./scripts/db/run-separated-migrations.sh

# Migrate data from monolith to separated databases
./scripts/db/migrate-to-separated-databases.sh
```

---

## Migration Commands

### Dashboard API Migrations

```bash
# Run migrations
npm --workspace=apps/dashboard-api run db:migrate

# Seed data
npm --workspace=apps/dashboard-api run db:seed

# Reset database
npm --workspace=apps/dashboard-api run db:reset
```

### Forms API Migrations

```bash
# Run migrations
npm --workspace=apps/forms-api run db:migrate

# Seed data
npm --workspace=apps/forms-api run db:seed

# Reset database (WARNING: Deletes all data)
npm --workspace=apps/forms-api run db:reset
```

---

## Connection Pool Health Checks

### Check All Connections (Dashboard API)

```typescript
import { checkAllDatabaseConnections } from './config/multi-database.config';

const health = await checkAllDatabaseConnections();
console.log(health);
// Output: { auth: true, dashboard: true, forms: true }
```

### Check All Connections (Forms API)

```typescript
import { checkAllDatabaseConnections } from './config/multi-database.config';

const health = await checkAllDatabaseConnections();
console.log(health);
// Output: { auth: true, forms: true }
```

### Health Check Endpoints

- Dashboard API: `http://localhost:3000/health`
- Forms API: `http://localhost:3001/health`
- Legacy API: `http://localhost:3002/health`

---

## Architectural Principles

### 1. Shared Authentication Database

All services access the same authentication database (`nodeangularfullstack_auth`) in **read-only
mode** for user validation. This approach:

- ✅ Prevents data duplication across services
- ✅ Ensures consistent authentication state
- ✅ Simplifies user management
- ✅ Supports single sign-on (SSO) patterns

### 2. Service Isolation

Each service owns its domain-specific database with full read-write access:

- `dashboard-api` owns `nodeangularfullstack_dashboard`
- `forms-api` owns `nodeangularfullstack_forms`

This follows microservices best practices:

- ✅ Data ownership boundaries are clear
- ✅ Schema changes are isolated per service
- ✅ Services can scale independently
- ✅ Reduces coupling between services

### 3. Connection Pool Sizing

- **Read-only pools:** 10 connections (auth database access)
- **Read-write pools:** 20 connections (primary data storage)
- **Idle timeout:** 30 seconds (closes inactive connections)
- **Connection timeout:** 2 seconds (fails fast on connection issues)

### 4. Backward Compatibility

The legacy database (`nodeangularfullstack`) remains operational during migration:

- ✅ Gradual service extraction without breaking existing functionality
- ✅ Allows testing separated services in parallel with monolith
- ✅ Provides rollback path if issues arise

---

## Best Practices

### 1. Use Appropriate Pool for Database Type

```typescript
// ✅ CORRECT: Use specific pools
import { authPool, dashboardPool } from './config/multi-database.config';

const user = await authPool.query('SELECT * FROM users WHERE id = $1', [userId]);
const tool = await dashboardPool.query('SELECT * FROM tools WHERE id = $1', [toolId]);

// ❌ INCORRECT: Using generic pool (ambiguous)
import { pool } from './config/multi-database.config';
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### 2. Respect Service Boundaries

```typescript
// ✅ CORRECT: Forms API calls to get form data
import { formsApiClient } from './api/forms-api.client';

const form = await formsApiClient.get(`/api/forms/${formId}`);

// ❌ INCORRECT: Dashboard API directly accessing forms database
import { formsPool } from './config/multi-database.config';
const form = await formsPool.query('SELECT * FROM forms WHERE id = $1', [formId]);
```

### 3. Handle Connection Failures Gracefully

```typescript
import { checkAllDatabaseConnections } from './config/multi-database.config';

const health = await checkAllDatabaseConnections();

if (!health.auth) {
  console.error('Authentication database unavailable');
  // Implement fallback strategy (cached data, error response, etc.)
}

if (!health.dashboard) {
  console.error('Dashboard database unavailable');
  return res.status(503).json({ error: 'Service temporarily unavailable' });
}
```

### 4. Close Connections on Shutdown

```typescript
import { closeAllDatabaseConnections } from './config/multi-database.config';

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database connections...');
  await closeAllDatabaseConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database connections...');
  await closeAllDatabaseConnections();
  process.exit(0);
});
```

---

## Known Issues & Architectural Debt

### Issue 1: Dashboard API Accessing Forms Database

**Problem:** The `apps/dashboard-api` has a temporary connection pool to the forms database
(`formsPool`), which violates service isolation principles.

**Location:** `apps/dashboard-api/src/config/multi-database.config.ts:66-106`

**Impact:**

- ❌ Violates service boundaries (dashboard-api should NOT access forms database)
- ❌ Creates tight coupling between services
- ❌ Makes it harder to scale services independently
- ❌ Complicates migration to microservices architecture

**Resolution Plan:**

1. Identify all repositories in `apps/dashboard-api` that use `formsPool`
2. Replace direct database queries with HTTP calls to `apps/forms-api`
3. Remove `formsPool` from dashboard-api configuration
4. Update tests to mock forms-api HTTP calls

**Affected Repositories (to be migrated):**

- `FormsRepository` - Replace with HTTP calls to `/api/forms`
- `FormSchemasRepository` - Replace with HTTP calls to `/api/form-schemas`
- `FormSubmissionsRepository` - Replace with HTTP calls to `/api/form-submissions`
- `ShortLinksRepository` - Replace with HTTP calls to `/api/short-links`
- `ThemesRepository` - Replace with HTTP calls to `/api/themes`

**Status:** Tracked in `TYPESCRIPT_FIXES.md` migration plan

---

## Migration Roadmap

The project is gradually migrating from a monolithic architecture to domain-specific services:

### Phase 1: Database Separation ✅ (Completed)

- Created separate databases for auth, dashboard, and forms
- Implemented multi-database connection pooling
- Updated migration scripts for separated databases

### Phase 2: Service API Extraction 🔄 (In Progress)

- Extracted dashboard API (`apps/dashboard-api`)
- Extracted forms API (`apps/forms-api`)
- Separated frontend applications (`apps/web`, `apps/form-builder-ui`)

### Phase 3: Service Isolation 📋 (Planned)

- Remove cross-database access (dashboard-api → forms database)
- Implement HTTP-based inter-service communication
- Add service mesh or API gateway for routing

### Phase 4: Legacy Deprecation 📋 (Future)

- Migrate remaining features from `apps/api` to domain services
- Deprecate legacy database (`nodeangularfullstack`)
- Decommission monolithic API

---

## Database Schema Documentation

### Authentication Database Schema

Located in: `apps/dashboard-api/database/migrations/auth/` (or equivalent auth service)

**Key Tables:**

- `users` - User accounts and profiles
- `refresh_tokens` - JWT refresh token storage
- `tenants` - Multi-tenancy support (if enabled)
- `user_roles` - Role-based access control

### Dashboard Database Schema

Located in: `apps/dashboard-api/database/migrations/`

**Key Tables:**

- `tool_registry` - Registered tools and configurations
- `export_jobs` - Export job tracking and history
- `drawing_projects` - SVG drawing project data
- `tool_configs` - Tool-specific configuration data

### Forms Database Schema

Located in: `apps/forms-api/database/migrations/`

**Key Tables:**

- `forms` - Form metadata
- `form_schemas` - Form field definitions and layout
- `form_submissions` - User-submitted form data
- `form_themes` - Theme configurations (colors, fonts, styling)
- `short_links` - Short link and QR code mappings

---

## Troubleshooting

### Connection Errors

**Problem:** `Connection refused` or `ECONNREFUSED` errors

**Solution:**

```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if stopped
brew services start postgresql@14

# Verify connection
psql -h localhost -U dbuser -d postgres -c "SELECT 1"
```

---

### Missing Databases

**Problem:** `database "nodeangularfullstack_auth" does not exist`

**Solution:**

```bash
# Run database creation script
./scripts/db/create-separated-databases.sh

# Verify databases were created
psql -h localhost -U dbuser -d postgres -c "\l" | grep nodeangularfullstack
```

---

### Migration Errors

**Problem:** Migrations fail or hang

**Solution:**

```bash
# Check current migration status
npm --workspace=apps/dashboard-api run db:status
npm --workspace=apps/forms-api run db:status

# Rollback last migration
npm --workspace=apps/dashboard-api run db:rollback
npm --workspace=apps/forms-api run db:rollback

# Re-run migrations
npm --workspace=apps/dashboard-api run db:migrate
npm --workspace=apps/forms-api run db:migrate
```

---

### Pool Exhaustion

**Problem:** `sorry, too many clients already` errors

**Solution:**

```typescript
// Check active connections
const result = await pool.query(`
  SELECT count(*) as active_connections
  FROM pg_stat_activity
  WHERE datname = 'nodeangularfullstack_auth'
`);

console.log('Active connections:', result.rows[0].active_connections);

// Reduce pool size if needed
const poolConfig = {
  // ...
  max: 10, // Reduce from 20 to 10
};
```

---

## Additional Resources

- **Migration Plan:** `MicroserviceDock/microservices_implementation_plan.md`
- **Architecture Proposal:** `MicroserviceDock/convert_to_microservices_doc.md`
- **TypeScript Fixes:** `TYPESCRIPT_FIXES.md`
- **Migration Scripts:** `scripts/db/`
- **Epic Documentation:** `docs/stories/30/`, `docs/stories/31/`, `docs/stories/32/`,
  `docs/stories/33/`

---

## Summary

This multi-database architecture provides a solid foundation for gradual service extraction while
maintaining backward compatibility. The key principles are:

1. **Shared Authentication** - All services use a centralized auth database (read-only)
2. **Service Isolation** - Each service owns its domain-specific data
3. **Backward Compatibility** - Legacy database remains operational during migration
4. **Scalability** - Connection pooling and service separation enable independent scaling

The architecture is currently in **Phase 2** (Service API Extraction), with ongoing work to
eliminate cross-service database access and implement proper HTTP-based inter-service communication.
