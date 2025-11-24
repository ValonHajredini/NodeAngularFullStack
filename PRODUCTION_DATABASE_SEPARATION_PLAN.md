# Production Database Separation Implementation Plan

**Created:** 2025-11-24 **Purpose:** Complete plan to properly separate databases in production
**Goal:** Enable both `api` and `forms-api` to authenticate users from shared auth database

---

## **Target Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                   PRODUCTION DATABASES                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────┐     ┌──────────────────────┐│
│  │   api_prod           │     │  forms_api_prod      ││
│  │   (Auth + Dashboard) │     │  (Forms Only)        ││
│  ├──────────────────────┤     ├──────────────────────┤│
│  │ • users              │     │ • forms              ││
│  │ • tenants            │     │ • form_schemas       ││
│  │ • sessions           │     │ • form_submissions   ││
│  │ • api_tokens         │     │ • form_themes        ││
│  │ • password_resets    │     │ • short_links        ││
│  │ • tools              │     │ • form_templates     ││
│  │ • tool_configs       │     └──────────────────────┘│
│  │ • tool_registry      │              ▲              │
│  │ • export_jobs        │              │              │
│  │ • audit_logs         │     READ-ONLY AUTH ACCESS   │
│  └──────────────────────┘              │              │
│           ▲                             │              │
│           │                             │              │
│           └─────────────────────────────┘              │
│                                                         │
│         BOTH SERVICES READ FROM AUTH DATABASE          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      SERVICES                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────┐     ┌──────────────────────┐│
│  │   apps/api           │     │  apps/forms-api      ││
│  │   (Port 3000)        │     │  (Port 3001)         ││
│  ├──────────────────────┤     ├──────────────────────┤│
│  │ Multi-DB Support:    │     │ Multi-DB Support:    ││
│  │ • authPool (R/W)     │     │ • authPool (R/O)     ││
│  │ • dashboardPool (R/W)│     │ • formsPool (R/W)    ││
│  └──────────────────────┘     └──────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## **Phase 1: Backup Production Databases**

### **1.1 Create Backup Script**

**File:** `scripts/db/backup-production.sh`

```bash
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/postgres/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "🔐 Backing up production databases..."

# Backup api_prod
echo "📦 Backing up api_prod..."
PGPASSWORD='your-production-password' pg_dump \
  -h localhost \
  -U legopdf \
  -d api_prod \
  -F c \
  -f "$BACKUP_DIR/api_prod.backup"

# Backup forms_api_prod
echo "📦 Backing up forms_api_prod..."
PGPASSWORD='your-production-password' pg_dump \
  -h localhost \
  -U legopdf \
  -d forms_api_prod \
  -F c \
  -f "$BACKUP_DIR/forms_api_prod.backup"

# Create SQL dumps for inspection
PGPASSWORD='your-production-password' pg_dump \
  -h localhost \
  -U legopdf \
  -d api_prod \
  --schema-only \
  -f "$BACKUP_DIR/api_prod_schema.sql"

PGPASSWORD='your-production-password' pg_dump \
  -h localhost \
  -U legopdf \
  -d forms_api_prod \
  --schema-only \
  -f "$BACKUP_DIR/forms_api_prod_schema.sql"

echo "✅ Backups completed at: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
```

### **1.2 Run Backup**

```bash
# On production server
chmod +x scripts/db/backup-production.sh
./scripts/db/backup-production.sh
```

---

## **Phase 2: Add Multi-Database Support to apps/api**

### **2.1 Create Multi-Database Configuration**

**File:** `apps/api/src/config/multi-database.config.ts`

```typescript
import { Pool, PoolConfig } from 'pg';
import { appConfig } from './app.config';

/**
 * Multi-Database Configuration for apps/api
 *
 * Architecture:
 * - authPool: Read/Write access to authentication database (users, tenants, sessions)
 * - dashboardPool: Read/Write access to dashboard database (tools, configs, exports)
 *
 * Both pools share the same connection settings but connect to different databases.
 */

// Base pool configuration
const baseConfig: Partial<PoolConfig> = {
  host: appConfig.db.host,
  port: appConfig.db.port,
  user: appConfig.db.user,
  password: appConfig.db.password,
  ssl: appConfig.db.ssl ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum connections per pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Authentication Database Pool (Read/Write)
const authPoolConfig: PoolConfig = {
  ...baseConfig,
  database: process.env.AUTH_DB_NAME ?? process.env.DB_NAME ?? 'api_prod',
};

export const authPool = new Pool(authPoolConfig);

// Dashboard Database Pool (Read/Write) - Currently same as auth
// In future, this can point to separate dashboard database
const dashboardPoolConfig: PoolConfig = {
  ...baseConfig,
  database: process.env.DASHBOARD_DB_NAME ?? process.env.DB_NAME ?? 'api_prod',
};

export const dashboardPool = new Pool(dashboardPoolConfig);

// Health check function
export async function checkDatabaseConnections(): Promise<void> {
  try {
    await authPool.query('SELECT NOW()');
    console.log('✅ Auth database connection: OK');
  } catch (error) {
    console.error('❌ Auth database connection failed:', error);
    throw error;
  }

  try {
    await dashboardPool.query('SELECT NOW()');
    console.log('✅ Dashboard database connection: OK');
  } catch (error) {
    console.error('❌ Dashboard database connection failed:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await authPool.end();
  await dashboardPool.end();
});
```

### **2.2 Update database.config.ts to Export Multi-Database Pools**

**File:** `apps/api/src/config/database.config.ts`

Add at the end:

```typescript
// Export multi-database pools
export { authPool, dashboardPool, checkDatabaseConnections } from './multi-database.config';
```

---

## **Phase 3: Migrate Forms Data from api_prod to forms_api_prod**

### **3.1 Create Data Migration Script**

**File:** `scripts/db/migrate-forms-data-production.sh`

```bash
#!/bin/bash
set -e

echo "🔄 Migrating forms data from api_prod to forms_api_prod..."

# Export forms tables from api_prod
echo "📤 Exporting forms data from api_prod..."
PGPASSWORD='your-production-password' pg_dump \
  -h localhost \
  -U legopdf \
  -d api_prod \
  --data-only \
  --table=forms \
  --table=form_schemas \
  --table=form_submissions \
  --table=form_themes \
  --table=short_links \
  --table=form_templates \
  -f /tmp/forms_data.sql

# Import into forms_api_prod
echo "📥 Importing forms data into forms_api_prod..."
PGPASSWORD='your-production-password' psql \
  -h localhost \
  -U legopdf \
  -d forms_api_prod \
  -f /tmp/forms_data.sql

# Verify migration
echo "✅ Verifying data migration..."
FORMS_COUNT=$(PGPASSWORD='your-production-password' psql -h localhost -U legopdf -d forms_api_prod -t -c "SELECT COUNT(*) FROM forms;")
echo "Forms in forms_api_prod: $FORMS_COUNT"

# Clean up
rm -f /tmp/forms_data.sql

echo "✅ Forms data migration completed!"
```

### **3.2 Run Migration**

```bash
# On production server
chmod +x scripts/db/migrate-forms-data-production.sh
./scripts/db/migrate-forms-data-production.sh
```

---

## **Phase 4: Clean Up api_prod (Remove Forms Tables)**

### **4.1 Create Cleanup Script**

**File:** `scripts/db/cleanup-api-prod.sh`

```bash
#!/bin/bash
set -e

echo "🧹 Cleaning up api_prod (removing forms tables)..."

# Verify forms data exists in forms_api_prod before cleanup
FORMS_COUNT=$(PGPASSWORD='your-production-password' psql -h localhost -U legopdf -d forms_api_prod -t -c "SELECT COUNT(*) FROM forms;")

if [ "$FORMS_COUNT" -eq 0 ]; then
  echo "❌ ERROR: forms_api_prod has no forms data. Aborting cleanup."
  exit 1
fi

echo "✅ Verified forms_api_prod has $FORMS_COUNT forms"

# Remove forms tables from api_prod
echo "🗑️  Removing forms tables from api_prod..."
PGPASSWORD='your-production-password' psql -h localhost -U legopdf -d api_prod <<'SQL'
-- Drop forms-related tables
DROP TABLE IF EXISTS form_templates CASCADE;
DROP TABLE IF EXISTS short_links CASCADE;
DROP TABLE IF EXISTS form_submissions CASCADE;
DROP TABLE IF EXISTS form_schemas CASCADE;
DROP TABLE IF EXISTS forms CASCADE;
DROP TABLE IF EXISTS form_themes CASCADE;

-- Verify cleanup
SELECT 'Cleanup completed!' AS status;
SQL

echo "✅ api_prod cleanup completed!"
```

### **4.2 Run Cleanup (AFTER verifying migration)**

```bash
# On production server - ONLY after verifying forms data in forms_api_prod
chmod +x scripts/db/cleanup-api-prod.sh
./scripts/db/cleanup-api-prod.sh
```

---

## **Phase 5: Update apps/api Repositories**

### **5.1 Update Users Repository**

**File:** `apps/api/src/repositories/users.repository.ts`

Change:

```typescript
import { pool } from '../config/database.config';
```

To:

```typescript
import { authPool as pool } from '../config/database.config';
```

### **5.2 Update All Auth-Related Repositories**

Files to update (change `pool` to `authPool`):

- `apps/api/src/repositories/users.repository.ts`
- `apps/api/src/repositories/sessions.repository.ts`
- `apps/api/src/repositories/tenant.repository.ts`
- `apps/api/src/repositories/api-token.repository.ts`
- `apps/api/src/repositories/password-resets.repository.ts`

### **5.3 Update Dashboard Repositories**

Files to update (change `pool` to `dashboardPool`):

- `apps/api/src/repositories/tools.repository.ts`
- `apps/api/src/repositories/tool-configs.repository.ts`
- `apps/api/src/repositories/tool-registry.repository.ts`
- `apps/api/src/repositories/export-job.repository.ts`

### **5.4 Create Migration Script for Repository Updates**

**File:** `scripts/update-api-repositories.sh`

```bash
#!/bin/bash
set -e

echo "🔧 Updating apps/api repositories to use multi-database pools..."

# Auth repositories - use authPool
for file in \
  apps/api/src/repositories/users.repository.ts \
  apps/api/src/repositories/sessions.repository.ts \
  apps/api/src/repositories/tenant.repository.ts \
  apps/api/src/repositories/api-token.repository.ts \
  apps/api/src/repositories/password-resets.repository.ts
do
  if [ -f "$file" ]; then
    echo "Updating $file to use authPool..."
    sed -i '' "s/import { pool }/import { authPool as pool }/g" "$file"
  fi
done

# Dashboard repositories - use dashboardPool
for file in \
  apps/api/src/repositories/tools.repository.ts \
  apps/api/src/repositories/tool-configs.repository.ts \
  apps/api/src/repositories/tool-registry.repository.ts \
  apps/api/src/repositories/export-job.repository.ts
do
  if [ -f "$file" ]; then
    echo "Updating $file to use dashboardPool..."
    sed -i '' "s/import { pool }/import { dashboardPool as pool }/g" "$file"
  fi
done

echo "✅ Repository updates completed!"
```

---

## **Phase 6: Configure Production Environment**

### **6.1 Update apps/api/.env on Production Server**

```bash
# apps/api/.env (Production)
NODE_ENV=production
PORT=3000

# Database Configuration - Multi-Database Support
DB_HOST=localhost
DB_PORT=5432
DB_USER=legopdf
DB_PASSWORD=your-production-password
DB_SSL=false

# Database Names
DB_NAME=api_prod                    # Primary database (backward compatibility)
AUTH_DB_NAME=api_prod               # Authentication database
DASHBOARD_DB_NAME=api_prod          # Dashboard database (same as auth for now)

# Remove FORMS_DB_NAME if it exists - forms-api handles forms
# FORMS_DB_NAME=                    # ❌ DO NOT SET - handled by forms-api

# JWT, CORS, etc. (unchanged)
JWT_SECRET=your-production-jwt-secret
# ... rest of config
```

### **6.2 Update apps/forms-api/.env on Production Server**

```bash
# apps/forms-api/.env (Production)
NODE_ENV=production
PORT=3001

# Database Configuration - Multi-Database Support
DB_HOST=localhost
DB_PORT=5432
DB_USER=legopdf
DB_PASSWORD=your-production-password
DB_SSL=false

# Database Names
DB_NAME=forms_api_prod              # Primary database (backward compatibility)
AUTH_DB_NAME=api_prod               # ✅ Read-only auth database (shared with api)
FORMS_DB_NAME=forms_api_prod        # ✅ Forms database (read-write)

# JWT, CORS, etc. (unchanged)
JWT_SECRET=your-production-jwt-secret
# ... rest of config
```

---

## **Phase 7: Deployment & Verification**

### **7.1 Deployment Steps**

```bash
# 1. Backup databases
./scripts/db/backup-production.sh

# 2. Migrate forms data
./scripts/db/migrate-forms-data-production.sh

# 3. Update repository imports
./scripts/update-api-repositories.sh

# 4. Commit and push changes
git add apps/api/src/config/multi-database.config.ts
git add apps/api/src/repositories/*.ts
git add scripts/db/migrate-forms-data-production.sh
git add scripts/db/cleanup-api-prod.sh
git commit -m "feat: Add multi-database support to apps/api for production separation"
git push github main

# 5. Wait for CI/CD deployment to complete

# 6. SSH to production server and update .env files
ssh user@production-server
cd /var/apps/NodeAngularFullStack

# Update apps/api/.env
vim apps/api/.env
# Add: AUTH_DB_NAME=api_prod
# Add: DASHBOARD_DB_NAME=api_prod

# Update apps/forms-api/.env (verify)
vim apps/forms-api/.env
# Verify: AUTH_DB_NAME=api_prod
# Verify: FORMS_DB_NAME=forms_api_prod

# 7. Restart services
pm2 restart api
pm2 restart forms-api

# 8. Verify services started
pm2 logs api
pm2 logs forms-api
```

### **7.2 Health Checks**

```bash
# Check API health
curl -f http://localhost:3000/health
# Should return: {"status":"ok"}

# Check Forms API health
curl -f http://localhost:3001/health
# Should return: {"status":"ok"}

# Test login via API
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"User123!@#"}'
# Should return JWT token

# Test forms API with auth token
TOKEN="<token-from-login>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/forms
# Should return forms list
```

### **7.3 Verification Checklist**

- [ ] ✅ Both databases backed up successfully
- [ ] ✅ Forms data migrated to forms_api_prod
- [ ] ✅ Forms count matches in both databases before cleanup
- [ ] ✅ api_prod cleaned up (forms tables removed)
- [ ] ✅ apps/api multi-database config created
- [ ] ✅ apps/api repositories updated to use authPool/dashboardPool
- [ ] ✅ Production .env files updated
- [ ] ✅ CI/CD deployment successful
- [ ] ✅ Both services restarted successfully
- [ ] ✅ Health checks pass for both services
- [ ] ✅ Login works via api service
- [ ] ✅ Forms API validates auth tokens correctly
- [ ] ✅ Forms API can read user data from auth database
- [ ] ✅ Forms API writes forms data to forms database
- [ ] ✅ No database connection errors in logs

---

## **Phase 8: Post-Deployment Cleanup (Optional - After 48 Hours)**

### **8.1 Clean Up api_prod (Remove Forms Tables)**

Once verified that forms-api works correctly for 48 hours:

```bash
# Run cleanup script
./scripts/db/cleanup-api-prod.sh
```

---

## **Rollback Plan**

If something goes wrong:

### **Rollback Step 1: Restore from Backup**

```bash
# Stop services
pm2 stop api forms-api

# Restore api_prod
PGPASSWORD='your-production-password' pg_restore \
  -h localhost \
  -U legopdf \
  -d api_prod \
  --clean \
  /var/backups/postgres/YYYYMMDD_HHMMSS/api_prod.backup

# Restore forms_api_prod
PGPASSWORD='your-production-password' pg_restore \
  -h localhost \
  -U legopdf \
  -d forms_api_prod \
  --clean \
  /var/backups/postgres/YYYYMMDD_HHMMSS/forms_api_prod.backup

# Revert .env changes
# Revert code changes (git revert)

# Restart services
pm2 restart api forms-api
```

---

## **Summary**

| Phase                  | Estimated Time | Risk Level | Can Skip          |
| ---------------------- | -------------- | ---------- | ----------------- |
| 1. Backup              | 10 minutes     | LOW        | ❌ NO             |
| 2. Add Multi-DB to api | 30 minutes     | LOW        | ❌ NO             |
| 3. Migrate Forms Data  | 15 minutes     | MEDIUM     | ❌ NO             |
| 4. Cleanup api_prod    | 5 minutes      | HIGH       | ✅ YES (do later) |
| 5. Update Repositories | 20 minutes     | LOW        | ❌ NO             |
| 6. Configure .env      | 10 minutes     | LOW        | ❌ NO             |
| 7. Deploy & Verify     | 30 minutes     | MEDIUM     | ❌ NO             |
| **TOTAL**              | **~2 hours**   | **MEDIUM** |                   |

**Total Downtime:** ~5-10 minutes (service restart only)

---

## **Key Benefits After Migration**

✅ **Proper Data Separation**

- Auth data in `api_prod`
- Forms data in `forms_api_prod`
- No data duplication

✅ **Scalability**

- Each database can be scaled independently
- Can move to separate servers in future

✅ **Security**

- forms-api has read-only access to auth database
- Reduced attack surface

✅ **Maintainability**

- Clear data ownership
- Easier backups and migrations

✅ **Performance**

- Reduced database contention
- Better connection pool management

---

## **Next Steps**

1. Review this plan with team
2. Schedule maintenance window (2-hour window recommended)
3. Run Phase 1 (Backup) immediately
4. Execute Phases 2-7 during maintenance window
5. Monitor for 48 hours
6. Execute Phase 8 (Cleanup) if all stable
