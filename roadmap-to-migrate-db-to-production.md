# Roadmap to Migrate Database to Production

This guide provides step-by-step instructions for setting up separate databases for the main API and
Forms API services in production.

## Overview

The application uses a **separated database architecture** with two dedicated databases:

- **`api_db`**: Main API database (auth, users, dashboard) - `apps/api`
- **`form-builder-db`**: Forms API database (forms, themes, export) - `apps/forms-api`

## Prerequisites

- PostgreSQL 14+ installed on production server
- Database user credentials ready
- SSH access to production server
- Root or sudo privileges for database operations

## Step 1: Create Production Databases

### 1.1 Connect to PostgreSQL

```bash
# SSH into production server
ssh user@your-production-server

# Connect to PostgreSQL as superuser
sudo -u postgres psql
```

### 1.2 Create Databases and User

Execute the following SQL commands:

```sql
-- Create database user (if not exists)
CREATE USER dbuser WITH PASSWORD 'your-secure-password-here';

-- Create api_db database
CREATE DATABASE api_db OWNER dbuser;

-- Create form-builder-db database
CREATE DATABASE form_builder_db OWNER dbuser;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE api_db TO dbuser;
GRANT ALL PRIVILEGES ON DATABASE form_builder_db TO dbuser;

-- Verify databases were created
\l

-- Exit PostgreSQL
\q
```

**Expected Output:**

```
                                  List of databases
      Name        |  Owner   | Encoding |   Collate   |    Ctype
------------------+----------+----------+-------------+-------------
 api_db           | dbuser   | UTF8     | en_US.UTF-8 | en_US.UTF-8
 form_builder_db  | dbuser   | UTF8     | en_US.UTF-8 | en_US.UTF-8
```

## Step 2: Update Environment Variables

### 2.1 Main API Environment (`apps/api/.env.prod`)

Create or update the production environment file:

```bash
# Navigate to API directory
cd /path/to/NodeAngularFullStack/apps/api

# Edit production environment file
nano .env.prod
```

**Required Database Configuration:**

```bash
# Database Configuration (Main API)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=api_db
DB_USER=dbuser
DB_PASSWORD=your-secure-password-here
DB_SSL=true

# Multi-Database Architecture
AUTH_DB_NAME=api_db
DASHBOARD_DB_NAME=api_db

# JWT Authentication (Production - Use strong secrets)
JWT_SECRET=your-production-jwt-secret-at-least-64-characters-long-change-this
JWT_REFRESH_SECRET=your-production-refresh-secret-at-least-64-characters-long-change-this
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Form Render Token (Production)
FORM_RENDER_TOKEN_SECRET=your-production-form-render-token-secret-at-least-64-characters-long

# Other required variables...
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://legopdf.com
```

### 2.2 Forms API Environment (`apps/forms-api/.env.prod`)

```bash
# Navigate to Forms API directory
cd /path/to/NodeAngularFullStack/apps/forms-api

# Edit production environment file
nano .env.prod
```

**Required Database Configuration:**

```bash
# Database Configuration (Forms API)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=form_builder_db
DB_USER=dbuser
DB_PASSWORD=your-secure-password-here
DB_SSL=true

# Shared Authentication Database (from Main API)
AUTH_DB_NAME=api_db

# Other required variables...
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://form-builder.legopdf.com
```

**⚠️ CRITICAL NOTES:**

- **Database Names**: MUST use `api_db` and `form_builder_db` exactly as specified
- **AUTH_DB_NAME**: Both services share `api_db` for authentication/users
- **Passwords**: Use strong, unique passwords in production (minimum 32 characters)
- **JWT Secrets**: Generate cryptographically secure secrets (64+ characters)

### 2.3 Generate Secure Secrets

```bash
# Generate strong JWT secret (64 characters)
openssl rand -base64 48

# Generate refresh secret (64 characters)
openssl rand -base64 48

# Generate form render token secret (64 characters)
openssl rand -base64 48
```

## Step 3: Run Database Migrations

### 3.1 Main API Migrations (api_db)

```bash
# Navigate to API directory
cd /path/to/NodeAngularFullStack/apps/api

# Set production environment
export NODE_ENV=production

# Run migrations for api_db
npm run db:migrate

# Verify migrations completed
psql -U dbuser -d api_db -c "\dt"
```

**Expected Tables Created:**

- `users`
- `roles`
- `permissions`
- `user_roles`
- `refresh_tokens`
- `api_tokens`
- `audit_logs`
- `migrations`

### 3.2 Forms API Migrations (form_builder_db)

```bash
# Navigate to Forms API directory
cd /path/to/NodeAngularFullStack/apps/forms-api

# Set production environment
export NODE_ENV=production

# Run migrations for form_builder_db
npm run db:migrate

# Verify migrations completed
psql -U dbuser -d form_builder_db -c "\dt"
```

**Expected Tables Created:**

- `forms`
- `form_schemas`
- `form_submissions`
- `form_themes`
- `short_links`
- `tool_registry`
- `export_jobs`
- `migrations`

## Step 4: Seed Production Data

### 4.1 Seed Main API (Default Users)

```bash
# Navigate to API directory
cd /path/to/NodeAngularFullStack/apps/api

# Run seeds to create default users
npm run db:seed
```

**This will automatically create 3 test users:**

| Role          | Email                | Password   | Access Level                        |
| ------------- | -------------------- | ---------- | ----------------------------------- |
| Administrator | admin@example.com    | User123!@# | Full system access - Can manage all |
| Regular User  | user@example.com     | User123!@# | Standard access - View reports      |
| Read-Only     | readonly@example.com | User123!@# | View-only access - Cannot modify    |

**⚠️ IMPORTANT SECURITY NOTES:**

- **Change default passwords immediately** after first login in production
- Default users are for initial setup only
- Create new admin users with strong passwords
- Disable or delete default test accounts after setup

### 4.2 Seed Forms API (Sample Data)

```bash
# Navigate to Forms API directory
cd /path/to/NodeAngularFullStack/apps/forms-api

# Run seeds to create sample forms and themes
npm run db:seed
```

**This will create:**

- 9 predefined themes (Ocean Blue, Sunset Orange, Forest Green, etc.)
- Sample forms (if configured in seed files)
- Tool registry initial data

## Step 5: Verify Database Setup

### 5.1 Verify User Creation

```bash
# Connect to api_db
psql -U dbuser -d api_db

# Check users were created
SELECT id, email, role FROM users;

# Expected output:
#  id |        email         |    role
# ----+---------------------+-------------
#   1 | admin@example.com   | Admin
#   2 | user@example.com    | User
#   3 | readonly@example.com| ReadOnly

# Exit
\q
```

### 5.2 Verify Forms Database

```bash
# Connect to form_builder_db
psql -U dbuser -d form_builder_db

# Check themes were created
SELECT id, name, is_predefined FROM form_themes;

# Expected output shows 9 predefined themes

# Exit
\q
```

### 5.3 Test Database Connectivity

```bash
# Test Main API connection
cd /path/to/NodeAngularFullStack/apps/api
npm run test:db

# Test Forms API connection
cd /path/to/NodeAngularFullStack/apps/forms-api
npm run test:db
```

## Step 6: Start Production Services

### 6.1 Build Applications

```bash
# Navigate to root directory
cd /path/to/NodeAngularFullStack

# Build shared package first
npm run build:shared

# Build all applications
npm run build
```

### 6.2 Start Services with PM2

```bash
# Start services using PM2 ecosystem
pm2 start ecosystem.config.js --env production

# Verify services are running
pm2 status

# Check logs
pm2 logs api
pm2 logs forms-api
```

**Expected PM2 Output:**

```
┌─────┬────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name       │ mode        │ ↺       │ status  │ cpu      │
├─────┼────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ api        │ cluster     │ 0       │ online  │ 0%       │
│ 1   │ forms-api  │ cluster     │ 0       │ online  │ 0%       │
└─────┴────────────┴─────────────┴─────────┴─────────┴──────────┘
```

### 6.3 Verify API Health

```bash
# Test Main API health
curl https://api.legopdf.com/health

# Expected: {"status":"alive","timestamp":"...","uptime":...}

# Test Forms API health
curl https://forms-api.legopdf.com/health

# Expected: {"status":"alive","timestamp":"...","uptime":...}
```

## Step 7: Test Login Flow

### 7.1 Test Administrator Login

```bash
# Test login via API
curl -X POST https://api.legopdf.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "User123!@#"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "role": "Admin"
    }
  }
}
```

### 7.2 Access Frontend

1. Navigate to: https://legopdf.com/auth/login
2. Enter credentials:
   - **Email:** admin@example.com
   - **Password:** User123!@#
3. Click "Sign in"
4. Verify successful login and dashboard access

## Step 8: Post-Migration Security Checklist

### 8.1 Change Default Passwords

```sql
-- Connect to api_db
psql -U dbuser -d api_db

-- Update admin password (replace with bcrypt hash)
UPDATE users SET password = '$2b$10$NEW_BCRYPT_HASH_HERE' WHERE email = 'admin@example.com';

-- Or use application API to change passwords
```

### 8.2 Create Production Admin User

```bash
# Use API endpoint to create new admin with strong password
curl -X POST https://api.legopdf.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-production-admin@yourdomain.com",
    "password": "YourStrongPassword123!@#$",
    "role": "Admin"
  }'
```

### 8.3 Disable Test Accounts (Recommended)

```sql
-- Connect to api_db
psql -U dbuser -d api_db

-- Disable test accounts (don't delete for audit trail)
UPDATE users SET is_active = false WHERE email IN (
  'admin@example.com',
  'user@example.com',
  'readonly@example.com'
);
```

### 8.4 Security Hardening

- [ ] SSL/TLS certificates configured and valid
- [ ] Firewall rules restrict database access
- [ ] Database user has minimal required permissions
- [ ] Regular backups configured (daily recommended)
- [ ] Monitoring and alerting set up
- [ ] Rate limiting enabled on API endpoints
- [ ] CORS origins properly configured
- [ ] Environment variables stored securely (not in code)

## Troubleshooting

### Issue: Migration Fails with "Database does not exist"

**Solution:**

```bash
# Verify database exists
psql -U dbuser -l | grep -E 'api_db|form_builder_db'

# If missing, recreate following Step 1.2
```

### Issue: "Permission denied for database"

**Solution:**

```sql
-- Connect as superuser
sudo -u postgres psql

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE api_db TO dbuser;
GRANT ALL PRIVILEGES ON DATABASE form_builder_db TO dbuser;
```

### Issue: "Cannot connect to database"

**Solution:**

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection parameters
psql -U dbuser -d api_db -h localhost -p 5432

# Verify .env.prod file has correct credentials
cat apps/api/.env.prod | grep DB_
```

### Issue: Seed fails with "Users already exist"

**Solution:**

```bash
# Reset database (CAUTION: Deletes all data)
npm run db:reset

# Or manually delete users and re-seed
psql -U dbuser -d api_db -c "DELETE FROM users WHERE email LIKE '%@example.com';"
npm run db:seed
```

## Database Backup and Restore

### Create Backup

```bash
# Backup api_db
pg_dump -U dbuser -d api_db -F c -f api_db_backup_$(date +%Y%m%d).dump

# Backup form_builder_db
pg_dump -U dbuser -d form_builder_db -F c -f form_builder_db_backup_$(date +%Y%m%d).dump
```

### Restore from Backup

```bash
# Restore api_db
pg_restore -U dbuser -d api_db -c api_db_backup_20250123.dump

# Restore form_builder_db
pg_restore -U dbuser -d form_builder_db -c form_builder_db_backup_20250123.dump
```

## Environment-Specific Configuration

### Development (.env.development)

```bash
DB_NAME=nodeangularfullstack  # Single monolithic DB for dev
```

### Staging (.env.staging)

```bash
DB_NAME=api_db_staging
# OR
DB_NAME=form_builder_db_staging
```

### Production (.env.prod)

```bash
DB_NAME=api_db               # Main API
# OR
DB_NAME=form_builder_db      # Forms API
```

## Summary

✅ **Databases Created:**

- `api_db` (Main API - auth, users, dashboard)
- `form_builder_db` (Forms API - forms, themes, exports)

✅ **Environment Variables Configured:**

- `apps/api/.env.prod` → Uses `api_db`
- `apps/forms-api/.env.prod` → Uses `form_builder_db`

✅ **Migrations Completed:**

- All tables created in respective databases
- Schema synchronized with application code

✅ **Default Users Created:**

- Administrator (admin@example.com)
- Regular User (user@example.com)
- Read-Only User (readonly@example.com)
- All with password: User123!@# (change immediately!)

✅ **Services Running:**

- Main API on port 3000
- Forms API on port 3001
- Both connected to separate databases

## Next Steps

1. **Security**: Change all default passwords immediately
2. **Monitoring**: Set up database monitoring and alerts
3. **Backups**: Configure automated daily backups
4. **Documentation**: Update team documentation with new database architecture
5. **Testing**: Run full integration test suite
6. **Deployment**: Update CI/CD pipelines with new database credentials

---

**Last Updated:** 2025-11-23 **Version:** 1.0.0 **Author:** NodeAngularFullStack Team
