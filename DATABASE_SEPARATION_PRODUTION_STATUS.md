# Database Separation Status Report

**Generated:** 2025-11-24  
**Purpose:** Analysis of current multi-database implementation status

## Executive Summary

✅ **Code Supports Multi-Database**: Forms API has multi-database configuration  
⚠️ **Partial Implementation**: Databases exist but data is not properly separated  
❌ **Data Migration Not Complete**: Both databases have overlapping schemas and data

---

## Current Database Configuration

### Database Instances

| Database Name    | Purpose                     | Current Status                 |
| ---------------- | --------------------------- | ------------------------------ |
| `api_prod`       | Main API (Auth + Dashboard) | ✅ Exists, contains mixed data |
| `forms_api_prod` | Forms API                   | ✅ Exists, contains mixed data |

### Environment Configuration

**apps/api/.env:**

```env
DB_NAME=api_prod                    # Primary database
AUTH_DB_NAME=api_prod               # Auth database (same)
DASHBOARD_DB_NAME=api_prod          # Dashboard database (same)
FORMS_DB_NAME=api_prod              # ❌ Should not be set here
```

**apps/forms-api/.env:**

```env
DB_NAME=forms_api_prod              # Primary database
FORMS_DB_NAME=forms_api_prod        # ✅ Forms database
AUTH_DB_NAME=api_prod               # ✅ Auth database (read-only)
```

---

## Code Architecture Analysis

### apps/api (Main API)

**Configuration:** `apps/api/src/config/database.config.ts`

- ✅ Uses **single database pool** (`pool`)
- ❌ **NO multi-database support**
- 📍 Connects to: `api_prod` only

**Code Usage:**

```typescript
// All repositories use single database
import { pool } from '../config/database.config';
```

### apps/forms-api (Forms API)

**Configuration:** `apps/forms-api/src/config/multi-database.config.ts`

- ✅ Uses **multi-database pools**:
  - `authPool` → reads from `AUTH_DB_NAME` (api_prod)
  - `formsPool` → reads/writes to `FORMS_DB_NAME` (forms_api_prod)
- ✅ **HAS multi-database support**

**Code Usage:**

```typescript
// Auth operations (read-only)
import { authPool } from '../config/multi-database.config';

// Forms operations (read-write)
import { formsPool } from '../config/multi-database.config';
```

**Repositories Using Multi-Database:**

- ✅ `users.repository.ts` → uses `authPool`
- ✅ `form-schemas.repository.ts` → uses `formsPool`
- ✅ `form-submissions.repository.ts` → uses `formsPool`
- ✅ `tool-registry.repository.ts` → uses `formsPool`
- ✅ `analytics.repository.ts` → uses `formsPool`
- ✅ 9+ other repositories using multi-database pools

---

## Database Content Analysis

### api_prod Database

**Tables Found (17 tables):**

- ✅ Auth tables: `users`, `tenants`, `sessions`, `api_tokens`, `password_resets`
- ✅ Forms tables: `forms`, `form_schemas`, `form_submissions`, `form_themes`, `short_links`
- ✅ Dashboard tables: `tools`, `tool_configs`, `tool_registry`, `export_jobs`
- ✅ Other: `audit_logs`, `drawing_projects`, `tenant_users`

**Data Count:**

- Users: 10
- Forms: 1

**Status:** ❌ **Monolithic structure** - contains all data types

### forms_api_prod Database

**Tables Found (18 tables):**

- ✅ Auth tables: `users`, `tenants`, `sessions`, `api_tokens`, `password_resets`
- ✅ Forms tables: `forms`, `form_schemas`, `form_submissions`, `form_themes`, `short_links`,
  `form_templates`
- ✅ Dashboard tables: `tool_configs`
- ✅ Other: `audit_logs`, `drawing_projects`, `appointment_bookings`, `product_inventory`

**Data Count:**

- Users: 10
- Forms: 0

**Status:** ⚠️ **Schema exists but forms data is empty** - might be writing to wrong database

---

## Migration Scripts Available

### Location: `scripts/db/`

1. ✅ **`create-separated-databases.sh`**
   - Creates: `nodeangularfullstack_auth`, `nodeangularfullstack_dashboard`,
     `nodeangularfullstack_forms`
   - ⚠️ Uses different database names than production (`api_prod`, `forms_api_prod`)

2. ✅ **`migrate-to-separated-databases.sh`**
   - Migrates data from monolithic to separated databases
   - Exports data from source and imports to target databases
   - ⚠️ Designed for development database names, not production

3. ✅ **`run-separated-migrations.sh`**
   - Runs schema migrations on separated databases
   - ✅ Should work with production databases if configured

4. ✅ **`complete-database-migration.sh`**
   - Master orchestration script
   - Runs all migration steps in sequence

5. ✅ **`backup-monolithic-database.sh`**
   - Creates backup before migration

### Migration README: `scripts/db/MIGRATION_README.md`

✅ Comprehensive migration guide available

---

## Database Table Assignment (Planned Architecture)

According to documentation, the target architecture should be:

### Auth Database (`api_prod` should become auth-only)

- `users`
- `tenants`
- `sessions`
- `api_tokens`
- `api_token_usage`
- `password_resets`

### Forms Database (`forms_api_prod` should be forms-only)

- `forms`
- `form_schemas`
- `form_submissions`
- `form_themes`
- `short_links`
- `form_templates` (if exists)

### Dashboard Database (Should be separate)

- `tools`
- `tool_configs`
- `tool_registry`
- `export_jobs`
- `drawing_projects`

---

## Current Issues

### 1. ❌ Data Duplication

- Both databases have `users`, `tenants`, `sessions` tables
- Both databases have `forms`, `form_schemas` tables
- Data is duplicated, not separated

### 2. ❌ api Uses Single Database Only

- `apps/api` doesn't have multi-database configuration
- All data goes to `api_prod` (monolithic structure)

### 3. ⚠️ forms-api Multi-Database Not Fully Utilized

- Code supports multi-database but:
  - Forms data might be empty in `forms_api_prod` (0 forms)
  - Both databases have same schema

### 4. ⚠️ Migration Scripts Use Different Names

- Scripts expect: `nodeangularfullstack_*` databases
- Production uses: `api_prod`, `forms_api_prod`

---

## Recommendations

### Option 1: Use Current Databases (Quick Fix)

1. **Clean up `api_prod`** - Keep only auth tables:

   ```sql
   -- Remove forms tables from api_prod
   DROP TABLE IF EXISTS forms, form_schemas, form_submissions, form_themes, short_links;
   ```

2. **Migrate forms data** from `api_prod` to `forms_api_prod`:

   ```bash
   # Use pg_dump to export forms tables from api_prod
   # Import into forms_api_prod
   ```

3. **Update `apps/api`** to use multi-database config:
   - Create `apps/api/src/config/multi-database.config.ts`
   - Update repositories to use correct pools

### Option 2: Full Migration (Recommended)

1. **Adapt migration scripts** for production database names:
   - Update `create-separated-databases.sh` to use `api_prod`, `forms_api_prod`
   - Update `migrate-to-separated-databases.sh` accordingly

2. **Run complete migration**:

   ```bash
   ./scripts/db/complete-database-migration.sh
   ```

3. **Update `apps/api`** to use multi-database architecture

---

## Next Steps

1. ✅ **Verify current state** - DONE (this document)
2. ⏭️ **Decide on migration approach** (Option 1 or Option 2)
3. ⏭️ **Backup current databases** before migration
4. ⏭️ **Run data migration** to properly separate data
5. ⏭️ **Update `apps/api`** to support multi-database
6. ⏭️ **Verify** both APIs work correctly
7. ⏭️ **Monitor** for 24-48 hours

---

## Summary

| Aspect                   | Status     | Notes                                      |
| ------------------------ | ---------- | ------------------------------------------ |
| Multiple databases exist | ✅ YES     | `api_prod` and `forms_api_prod` both exist |
| Code supports multi-DB   | ⚠️ PARTIAL | `forms-api` yes, `api` no                  |
| Data properly separated  | ❌ NO      | Both DBs have overlapping schemas/data     |
| Migration scripts exist  | ✅ YES     | But use different database names           |
| Production ready         | ❌ NO      | Needs data migration                       |

**Conclusion:** The infrastructure exists, but data migration needs to be completed to properly
separate the databases.
