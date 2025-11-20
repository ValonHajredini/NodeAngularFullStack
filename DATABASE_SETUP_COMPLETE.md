# PostgreSQL Database Setup - COMPLETED ✅

**Date:** November 20, 2025  
**Database:** nodeangularfullstack_prod  
**Server:** localhost:5432

---

## ✅ What Was Completed

### 1. PostgreSQL Installation
- **Version:** PostgreSQL 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
- **Status:** Running and active
- **Service:** postgresql.service (enabled)

### 2. Database Creation
```sql
Database Name: nodeangularfullstack_prod
Database Owner: legopdf_user
Encoding: UTF8
Locale: C.UTF-8
```

### 3. Database User
```
Username: legopdf_user
Password: aZFoc785uZrIz98LDExOyfysDJ8i8fhS
Privileges: CREATEROLE, Full access to nodeangularfullstack_prod
```

**⚠️ IMPORTANT: Save this password in a secure password manager!**

### 4. Additional Database Roles Created
- `application_role` - For Row-Level Security policies
- `authenticated` - For authenticated user policies

### 5. Migrations Executed

#### Dashboard API (30 migrations)
✅ All migrations completed successfully

1. `001_create_auth_tables.sql` - Users, sessions, tenants, password resets
2. `002_add_audit_logging.sql` - Audit logs and soft delete
3. `003_enhance_multi_tenancy.sql` - Tenant plans, settings, features
4. `004_add_tenant_rls_policies.sql` - Row-Level Security policies
5. `005_create_api_tokens_table.sql` - API token management
6. `006_create_api_token_usage_table.sql` - Token usage tracking
7-30. Additional tables and features (tool registry, export jobs, etc.)

#### Forms API (34 migrations)
✅ All migrations completed successfully

1. `001_create_auth_tables.sql` - User authentication tables
2. `002_add_audit_logging.sql` - Audit logging system
3. `003_enhance_multi_tenancy.sql` - Multi-tenancy features
4-34. Forms, themes, submissions, analytics, templates, etc.

**Total Migrations:** 64 migrations executed successfully

### 6. Database Tables Created (20 tables)

| Category | Tables |
|----------|--------|
| **Authentication** | users, sessions, tenants, password_resets |
| **Security** | audit_logs, api_tokens, api_token_usage |
| **Forms & Themes** | forms, form_schemas, form_submissions, form_themes, form_templates, short_links |
| **Tool System** | tools, tool_configs, tool_registry, export_jobs |
| **Additional** | drawing_projects, product_inventory, appointment_bookings |

### 7. Test Users Created

| Email | Role | Password | Status |
|-------|------|----------|--------|
| admin@example.com | admin | User123!@# | ✅ Active, Verified |
| user@example.com | user | User123!@# | ✅ Active, Verified |

### 8. Default Tenant Created

| Name | Slug | Status |
|------|------|--------|
| Default Tenant | default | ✅ Active |

### 9. Environment Files Updated

#### Dashboard API (`.env.production`)
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nodeangularfullstack_prod
DB_USER=legopdf_user
DB_PASSWORD=aZFoc785uZrIz98LDExOyfysDJ8i8fhS
DB_SSL=false
PGWEB_DATABASE_URL=postgresql://legopdf_user:aZFoc785uZrIz98LDExOyfysDJ8i8fhS@localhost:5432/nodeangularfullstack_prod
```

#### Forms API (`.env.production`)
Same database configuration as Dashboard API

---

## 🔧 How to Use the Database

### Connect to Database

```bash
# Using psql
psql -U legopdf_user -d nodeangularfullstack_prod -h localhost

# You'll be prompted for the password:
# aZFoc785uZrIz98LDExOyfysDJ8i8fhS
```

### Useful PostgreSQL Commands

```sql
-- List all tables
\dt

-- View table structure
\d users

-- List all indexes
\di

-- View all users
SELECT email, role, is_active, email_verified FROM users;

-- View all tenants
SELECT id, name, slug, is_active FROM tenants;

-- Count records in each table
SELECT 
  schemaname AS schema,
  tablename AS table,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  (SELECT count(*) FROM (SELECT * FROM pg_catalog.pg_tables WHERE schemaname=t.schemaname AND tablename=t.tablename) x) as row_count
FROM pg_catalog.pg_tables t
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Exit psql
\q
```

---

## 📊 Database Statistics

```
Total Migrations Run: 64
Total Tables Created: 20
Total Indexes: 100+ (created by migrations)
Database Size: ~50 MB (with migrations and initial data)
```

---

## 🔐 Security Features Implemented

1. **Row-Level Security (RLS)** - Enabled on users, sessions, password_resets
2. **Tenant Isolation** - Automatic filtering by tenant_id
3. **Audit Logging** - All user actions logged
4. **API Token Management** - Secure API access with usage tracking
5. **Password Resets** - Secure password reset mechanism
6. **Email Verification** - User email verification system

---

## 🚀 Application Startup

### Start Dashboard API
```bash
cd /var/apps/NodeAngularFullStack/apps/dashboard-api
npm run dev
# Listens on http://localhost:3000
```

### Start Forms API
```bash
cd /var/apps/NodeAngularFullStack/apps/forms-api
npm run dev
# Listens on http://localhost:3001
```

### Test Database Connection
Both APIs will automatically connect to the database on startup using the `.env` configuration.

---

## 📝 Configuration Progress

### Overall Status

| Service | Configuration | Status |
|---------|--------------|--------|
| **Dashboard API** | 14/36 variables (39%) | ⚠️ Needs Redis, Spaces, SendGrid |
| **Forms API** | 14/38 variables (37%) | ⚠️ Needs Redis, Spaces, SendGrid |
| **Web Frontend** | 5/5 variables (100%) | ✅ Complete |
| **Form Builder UI** | 4/4 variables (100%) | ✅ Complete |

### What's Still Missing

#### Backend Services Need:
1. **Redis** - Cache server
   - REDIS_HOST
   - REDIS_PORT
   - REDIS_PASSWORD

2. **DigitalOcean Spaces** - File storage
   - DO_SPACES_KEY
   - DO_SPACES_SECRET
   - DO_SPACES_BUCKET
   - DO_SPACES_REGION
   - DO_SPACES_ENDPOINT

3. **SendGrid** - Email service
   - SENDGRID_API_KEY
   - EMAIL_FROM (already set to noreply@legopdf.com)
   - EMAIL_FROM_NAME (already set to LegoPDF)

4. **Monitoring** (Optional)
   - SENTRY_DSN
   - LOGTAIL_TOKEN

#### Infrastructure Needs:
1. DNS records for 6 domains (legopdf.com, api., forms-api., form-builder., admin., www.)
2. SSL certificates (Let's Encrypt)
3. Nginx reverse proxy configuration

---

## 🧪 Testing the Setup

### Test 1: Check Database Connection
```bash
psql -U legopdf_user -d nodeangularfullstack_prod -h localhost -c "SELECT 'Database connection successful!' AS status;"
```

### Test 2: Verify Tables
```bash
psql -U legopdf_user -d nodeangularfullstack_prod -h localhost -c "\dt"
```

### Test 3: Check Test Users
```bash
psql -U legopdf_user -d nodeangularfullstack_prod -h localhost -c "SELECT email, role FROM users;"
```

### Test 4: Start API (Development Mode)
```bash
cd /var/apps/NodeAngularFullStack/apps/dashboard-api
cp .env.production .env
npm run dev
```

If successful, you'll see:
```
✅ Database connection pool initialized successfully
📊 Database: nodeangularfullstack_prod @ localhost:5432
🚀 Dashboard API server running on port 3000
```

---

## 🐛 Troubleshooting

### Issue: "password authentication failed"
**Solution:** Verify password in `.env` file matches: `aZFoc785uZrIz98LDExOyfysDJ8i8fhS`

### Issue: "database does not exist"
**Solution:** 
```bash
sudo -u postgres psql -c "CREATE DATABASE nodeangularfullstack_prod OWNER legopdf_user;"
```

### Issue: "role does not exist"
**Solution:**
```bash
sudo -u postgres psql -c "CREATE ROLE application_role;"
sudo -u postgres psql -c "CREATE ROLE authenticated;"
```

### Issue: "permission denied"
**Solution:**
```bash
sudo -u postgres psql nodeangularfullstack_prod -c "GRANT ALL ON SCHEMA public TO legopdf_user;"
```

---

## 📚 Next Steps

1. ✅ **Database Setup** - COMPLETED
2. ⬜ **Install and Configure Redis**
   ```bash
   sudo apt install redis-server
   sudo systemctl start redis-server
   ```

3. ⬜ **Setup DigitalOcean Spaces**
   - Sign up at digitalocean.com
   - Create a Space
   - Generate API keys
   - Add to `.env.production` files

4. ⬜ **Setup SendGrid**
   - Sign up at sendgrid.com
   - Generate API key
   - Verify domain (legopdf.com)
   - Add SENDGRID_API_KEY to `.env.production`

5. ⬜ **Configure DNS**
   - Point all 6 domains to your server IP
   - Wait for DNS propagation (up to 48 hours)

6. ⬜ **Generate SSL Certificates**
   ```bash
   sudo certbot certonly --nginx -d legopdf.com -d www.legopdf.com -d api.legopdf.com -d forms-api.legopdf.com -d form-builder.legopdf.com -d admin.legopdf.com
   ```

7. ⬜ **Setup Nginx Reverse Proxy**
   - Configure Nginx to route HTTPS traffic to application ports
   - See `LEGOPDF_PRODUCTION_STATUS.md` for sample configurations

---

## 📞 Support Files

- **Full Configuration Guide:** `LEGOPDF_PRODUCTION_STATUS.md`
- **Environment Variables:** `docs/ENVIRONMENT_VARIABLES.md`
- **Production Setup:** `PRODUCTION_ENV_SETUP.md`

---

**Database Setup Completed By:** Claude (AI Assistant)  
**Date:** November 20, 2025  
**Status:** ✅ Ready for application development and testing

