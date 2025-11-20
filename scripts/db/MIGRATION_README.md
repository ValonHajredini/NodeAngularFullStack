# Database Migration Guide: Monolithic → Separated Databases

This guide documents the complete process for migrating from the monolithic `nodeangularfullstack`
database to three separated databases for proper microservices architecture.

## Overview

### Migration Goal

Separate the monolithic database into 3 independent databases:

- **nodeangularfullstack_auth** - Shared authentication and tenant data (read-only for services)
- **nodeangularfullstack_dashboard** - Dashboard API exclusive data
- **nodeangularfullstack_forms** - Forms API exclusive data

### Architecture Benefits

- **Database isolation**: Each service owns its data
- **Scalability**: Databases can scale independently
- **Security**: Services can only access their authorized databases
- **Cross-database validation**: SharedAuthService validates user/tenant references

## Prerequisites

Before running the migration, ensure:

1. **PostgreSQL 14+ installed and running**

   ```bash
   brew services start postgresql@14
   # or
   pg_ctl -D /usr/local/var/postgres start
   ```

2. **Sufficient disk space**
   - At least 2x the size of your current database for backups
   - Check disk space: `df -h`

3. **Database credentials configured**
   - Update `.env.development` with correct credentials
   - Ensure `postgres` superuser access for database creation

4. **Stop all running services**

   ```bash
   ./stop-dev.sh
   ```

5. **Run tests before migration** (to establish baseline)
   ```bash
   npm test
   ```

## Migration Scripts

The migration process consists of 4 scripts:

### 1. `backup-monolithic-database.sh`

Creates a complete backup of the monolithic database.

- **Output**: `./backups/database/nodeangularfullstack_backup_TIMESTAMP.sql.gz`
- **Runtime**: ~1-2 minutes (depends on data size)
- **Safe to run multiple times**: Yes

### 2. `create-separated-databases.sh`

Creates the 3 target databases with correct permissions.

- **Output**: 3 new PostgreSQL databases
- **Runtime**: ~5 seconds
- **Safe to run multiple times**: Yes (skips existing databases)

### 3. `run-separated-migrations.sh`

Runs schema migrations on the 3 separated databases.

- **Output**: Database schemas created in all 3 databases
- **Runtime**: ~10-30 seconds
- **Safe to run multiple times**: Yes (but will fail if schemas exist)

### 4. `migrate-to-separated-databases.sh`

Migrates data from monolithic to separated databases.

- **Output**: Data copied to appropriate databases + migration report
- **Runtime**: ~1-5 minutes (depends on data size)
- **Safe to run multiple times**: No (will duplicate data)

### 5. `complete-database-migration.sh` (Master Script)

Orchestrates the entire migration process automatically.

- **Runs**: All 4 scripts above in sequence
- **Interactive**: Pauses between steps for review
- **Recommended**: For first-time migration

## Step-by-Step Migration

### Option A: Automated Migration (Recommended)

Run the master orchestration script:

```bash
cd /Applications/MAMP/htdocs/Projects/NodeAngularFullStack
./scripts/db/complete-database-migration.sh
```

The script will:

1. Prompt for confirmation
2. Backup the monolithic database
3. Create separated databases
4. Run schema migrations
5. Migrate all data
6. Generate verification report
7. Provide next steps

### Option B: Manual Step-by-Step Migration

If you prefer more control, run each script manually:

```bash
# Step 1: Backup monolithic database
./scripts/db/backup-monolithic-database.sh

# Step 2: Create separated databases
./scripts/db/create-separated-databases.sh

# Step 3: Run schema migrations
./scripts/db/run-separated-migrations.sh

# Step 4: Migrate data
./scripts/db/migrate-to-separated-databases.sh
```

## Database Table Assignments

### AUTH Database (nodeangularfullstack_auth)

Shared by both services (read-only access):

- `users` - User accounts and authentication
- `tenants` - Multi-tenant organizations
- `sessions` - User sessions and refresh tokens
- `api_tokens` - API authentication tokens
- `api_token_usage` - Token usage tracking
- `password_resets` - Password reset tokens

### DASHBOARD Database (nodeangularfullstack_dashboard)

Dashboard API exclusive tables:

- `tools` - Tool configurations
- `tool_configs` - Tool-specific settings
- `tool_registry` - Registered tools for export
- `drawing_projects` - SVG drawing projects
- `export_jobs` - Tool export job tracking
- `test_tool` - Testing/development tool data

### FORMS Database (nodeangularfullstack_forms)

Forms API exclusive tables:

- `forms` - Form metadata
- `form_schemas` - Form field schemas and versions
- `form_submissions` - User form submissions
- `form_themes` - Custom form themes
- `short_links` - Form short links and QR codes

## Verification Steps

After migration completes, verify everything works:

### 1. Check Migration Report

```bash
cat ./backups/database/migration_report_TIMESTAMP.txt
```

Verify:

- All tables migrated successfully
- Row counts match between source and target
- No errors reported

### 2. Connect to Each Database

```bash
# AUTH database
PGPASSWORD='dbpassword' psql -h localhost -U dbuser -d nodeangularfullstack_auth

# DASHBOARD database
PGPASSWORD='dbpassword' psql -h localhost -U dbuser -d nodeangularfullstack_dashboard

# FORMS database
PGPASSWORD='dbpassword' psql -h localhost -U dbuser -d nodeangularfullstack_forms
```

Check table counts:

```sql
SELECT COUNT(*) FROM users;    -- AUTH
SELECT COUNT(*) FROM tools;    -- DASHBOARD
SELECT COUNT(*) FROM forms;    -- FORMS
```

### 3. Run Integration Tests

```bash
npm test
```

Expected: All tests should pass with separated databases.

### 4. Start and Test Both APIs

```bash
# Terminal 1: Dashboard API
npm --workspace=apps/dashboard-api run dev

# Terminal 2: Forms API
npm --workspace=apps/forms-api run dev

# Terminal 3: Frontend
npm --workspace=apps/web run dev
```

Test:

- User login (AUTH database)
- Form creation (FORMS database + AUTH validation)
- Tool registry operations (DASHBOARD database + AUTH validation)

## Rollback Procedure

If migration fails or issues are found:

### 1. Stop All Services

```bash
./stop-dev.sh
```

### 2. Restore Monolithic Database

```bash
# Find your backup
ls -lh ./backups/database/

# Restore (replace TIMESTAMP)
gunzip -c ./backups/database/nodeangularfullstack_backup_TIMESTAMP.sql.gz | \
  PGPASSWORD='dbpassword' psql -h localhost -U dbuser -d nodeangularfullstack
```

### 3. Revert Configuration

```bash
# Revert multi-database configs to use monolithic pool
# Update apps/dashboard-api/src/config/multi-database.config.ts
# Update apps/forms-api/src/config/multi-database.config.ts
```

### 4. Restart Services

```bash
./start-dev.sh
```

## Post-Migration Tasks

### 1. Update Environment Configuration

The `.env.development` already has the new database names configured:

```env
# Multi-Database Configuration
AUTH_DB_NAME=nodeangularfullstack_auth
DASHBOARD_DB_NAME=nodeangularfullstack_dashboard
FORMS_DB_NAME=nodeangularfullstack_forms

# Legacy monolithic database (keep for reference)
DB_NAME=nodeangularfullstack
```

### 2. Monitor for Issues

- Check API logs for database connection errors
- Verify cross-database user validation works
- Monitor SharedAuthService cache performance
- Watch for foreign key validation errors

### 3. Performance Tuning

- Monitor query performance across databases
- Check SharedAuthService cache hit rates
- Optimize cross-database queries if needed
- Consider adding database connection pool tuning

### 4. Documentation

- Update CLAUDE.md with migration status
- Document any deployment-specific changes
- Note any discovered issues or edge cases

## Troubleshooting

### Issue: "Database already exists"

**Solution**: This is normal if running scripts multiple times. The script will skip creation.

### Issue: "Permission denied to create database"

**Solution**: Use `postgres` superuser instead of `dbuser`:

```bash
PGPASSWORD='' psql -h localhost -U postgres -d postgres
```

### Issue: "Row count mismatch after migration"

**Solution**:

1. Check migration logs for errors
2. Verify source data integrity
3. Re-run migration for affected tables
4. Check for constraints/triggers that may have blocked inserts

### Issue: "Tests fail after migration"

**Solution**:

1. Check test database configuration
2. Verify repositories use correct pools
3. Check for hardcoded database references
4. Review SharedAuthService integration

### Issue: "Cross-database validation fails"

**Solution**:

1. Verify AUTH database is accessible
2. Check authPool configuration
3. Test SharedAuthService.validateUser() manually
4. Verify user/tenant data migrated correctly

## Files Modified During Migration

### Configuration Files

- `apps/dashboard-api/src/config/multi-database.config.ts` ✅
- `apps/forms-api/src/config/multi-database.config.ts` ✅
- `.env.development` ✅

### Repository Files (30 total)

- `apps/dashboard-api/src/repositories/*.ts` (19 repos) ✅
- `apps/forms-api/src/repositories/*.ts` (11 repos) ✅

### Service Files (4 updated)

- `apps/dashboard-api/src/services/forms.service.ts` ✅
- `apps/dashboard-api/src/services/themes.service.ts` ✅
- `apps/forms-api/src/services/forms.service.ts` ✅
- `apps/forms-api/src/services/themes.service.ts` ✅

### Shared Package

- `packages/shared/src/services/shared-auth.service.ts` ✅

## Migration Checklist

- [ ] PostgreSQL 14+ running
- [ ] Stop all services
- [ ] Run baseline tests
- [ ] Run backup script
- [ ] Verify backup created
- [ ] Create separated databases
- [ ] Run schema migrations
- [ ] Migrate data
- [ ] Verify migration report
- [ ] Check row counts match
- [ ] Run integration tests
- [ ] Test dashboard-api endpoints
- [ ] Test forms-api endpoints
- [ ] Test cross-database validation
- [ ] Monitor for 24-48 hours
- [ ] Document any issues
- [ ] Archive monolithic database backup

## Support

For issues or questions:

1. Check this README first
2. Review migration reports in `./backups/database/`
3. Check API logs for database errors
4. Verify environment configuration
5. Consult database separation plan: `docs/architecture/database-separation-plan.md`

## References

- Database Separation Plan: `docs/architecture/database-separation-plan.md`
- Multi-Database Config: `apps/dashboard-api/src/config/multi-database.config.ts`
- SharedAuthService: `packages/shared/src/services/shared-auth.service.ts`
- Migration Scripts: `scripts/db/`
