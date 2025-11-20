# Running All Services - Step-by-Step Guide

**Updated**: November 7, 2025 **Architecture**: Multi-Database Microservices (3 separated databases)

This guide provides step-by-step instructions for starting the entire development environment with
the new multi-database architecture.

---

## Quick Start (Automated)

```bash
# One-command startup (runs all services)
./start-dev.sh
```

**Note**: The current `start-dev.sh` script needs updating for multi-database support (Phase 7
pending). Use the manual steps below for now.

---

## Manual Step-by-Step Guide

### Prerequisites Check

Before starting, ensure you have:

- ✅ Node.js 18+ installed
- ✅ PostgreSQL 14+ installed (Homebrew recommended)
- ✅ npm workspaces set up
- ✅ Angular CLI installed globally

```bash
# Verify installations
node --version        # Should be v18+
npm --version         # Should be 8+
psql --version        # Should be 14+
ng version            # Should be 20+
```

---

## Step 1: Start PostgreSQL

### Option A: Using Homebrew (Recommended)

```bash
# Start PostgreSQL service
brew services start postgresql@14

# Verify PostgreSQL is running
brew services list | grep postgresql
# Should show: postgresql@14  started
```

### Option B: Manual Start

```bash
# Start PostgreSQL manually
pg_ctl -D /usr/local/var/postgres start

# Or with Homebrew path
pg_ctl -D /opt/homebrew/var/postgresql@14 start
```

### Verify PostgreSQL Connection

```bash
# Test connection with psql
psql -U postgres -d postgres -c "SELECT version();"

# Should output PostgreSQL version info
```

---

## Step 2: Verify/Create Separated Databases

The system requires **3 separate databases**:

- `nodeangularfullstack_auth` - Shared authentication data
- `nodeangularfullstack_dashboard` - Dashboard API data
- `nodeangularfullstack_forms` - Forms API data

### Check if Databases Exist

```bash
# List all databases
PGPASSWORD='dbpassword' psql -h localhost -U dbuser -lqt | cut -d \| -f 1 | grep nodeangularfullstack

# Should show:
# nodeangularfullstack_auth
# nodeangularfullstack_dashboard
# nodeangularfullstack_forms
```

### Create Databases (if needed)

```bash
# Run database creation script
./scripts/db/create-separated-databases.sh

# Expected output:
# ✅ Database 'nodeangularfullstack_auth' created successfully
# ✅ Database 'nodeangularfullstack_dashboard' created successfully
# ✅ Database 'nodeangularfullstack_forms' created successfully
```

---

## Step 3: Run Database Migrations

Apply schema migrations to all 3 databases:

```bash
# Run migrations on all separated databases
./scripts/db/run-separated-migrations.sh

# Expected output:
# ✓ All AUTH migrations completed (7 migrations)
# ✓ All DASHBOARD migrations completed (6 migrations)
# ✓ All FORMS migrations completed (8 migrations)
```

### Verify Migrations

```bash
# Check table counts in each database
echo "=== AUTH Database ===" && \
PGPASSWORD='dbpassword' psql -h localhost -U dbuser -d nodeangularfullstack_auth -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" && \
echo "" && \
echo "=== DASHBOARD Database ===" && \
PGPASSWORD='dbpassword' psql -h localhost -U dbuser -d nodeangularfullstack_dashboard -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" && \
echo "" && \
echo "=== FORMS Database ===" && \
PGPASSWORD='dbpassword' psql -h localhost -U dbuser -d nodeangularfullstack_forms -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Expected output:
# AUTH Database: 8 tables
# DASHBOARD Database: 3 tables
# FORMS Database: 5 tables
```

---

## Step 4: Install Dependencies

Install npm dependencies for all workspaces:

```bash
# Install all dependencies (from root)
npm install

# Or install per workspace:
npm --workspace=apps/dashboard-api install
npm --workspace=apps/forms-api install
npm --workspace=apps/web install
npm --workspace=apps/form-builder-ui install
npm --workspace=packages/shared install
```

---

## Step 5: Build Shared Package

The shared package must be built before starting services:

```bash
# Build shared types package
npm run build:shared

# Expected output:
# > tsc -b packages/shared
# ✓ Shared package built successfully
```

---

## Step 6: Seed Databases (Optional but Recommended)

Populate databases with test data:

```bash
# Seed AUTH database with test users (via dashboard-api)
npm --workspace=apps/dashboard-api run db:seed

# Expected output:
# ✅ Created tenant: Acme Corporation
# ✅ Created test user: admin@example.com
# ✅ Created test user: user@example.com
# ✅ Created test user: readonly@example.com
```

**Note**: The seed script currently uses the monolithic database. You may need to manually insert
test data into the AUTH database:

```bash
# Alternative: Insert test data directly
PGPASSWORD='' psql -h localhost -U postgres -d nodeangularfullstack_auth <<'EOF'
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

INSERT INTO tenants (id, name, slug, plan, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Tenant', 'test-tenant', 'professional', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'admin@test.com', '$2a$10$YourHashHere', 'Admin', 'User', 'admin', true),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'user@test.com', '$2a$10$YourHashHere', 'Test', 'User', 'user', true)
ON CONFLICT DO NOTHING;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
EOF
```

---

## Step 7: Start Backend Services

### Terminal 1: Dashboard API (port 3000)

```bash
# Start dashboard API
npm --workspace=apps/dashboard-api run dev

# Expected output:
# 🚀 Dashboard API server listening on port 3000
# 📊 Database: nodeangularfullstack_dashboard @ localhost:5432
# 🔐 Auth Database: nodeangularfullstack_auth @ localhost:5432
# 📖 API Documentation: http://localhost:3000/api-docs
```

**Health Check**:

```bash
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","database":"connected","timestamp":"..."}
```

### Terminal 2: Forms API (port 3001)

```bash
# Start forms API
npm --workspace=apps/forms-api run dev

# Expected output:
# 🚀 Forms API server listening on port 3001
# 📊 Database: nodeangularfullstack_forms @ localhost:5432
# 🔐 Auth Database: nodeangularfullstack_auth @ localhost:5432
# 📖 API Documentation: http://localhost:3001/api-docs
```

**Health Check**:

```bash
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","database":"connected","timestamp":"..."}
```

---

## Step 8: Start Frontend Applications

### Terminal 3: Main Dashboard (port 4200)

```bash
# Start main Angular dashboard
npm --workspace=apps/web run dev

# Expected output:
# ✓ Browser application bundle generation complete.
# ** Angular Live Development Server is listening on localhost:4200 **
```

**Browser Check**:

```
Open: http://localhost:4200
```

### Terminal 4: Form Builder UI (port 4201)

```bash
# Start form builder UI
npm --workspace=apps/form-builder-ui run dev

# Expected output:
# ✓ Browser application bundle generation complete.
# ** Angular Live Development Server is listening on localhost:4201 **
```

**Browser Check**:

```
Open: http://localhost:4201
```

---

## Step 9: Start Database UI (Optional)

### Terminal 5: pgWeb (port 8080)

```bash
# Start pgWeb for AUTH database
pgweb --bind 127.0.0.1 --listen :8080 \
  --url "postgresql://dbuser:dbpassword@localhost:5432/nodeangularfullstack_auth?sslmode=disable" \
  --auth-user admin \
  --auth-pass development-password

# Or for DASHBOARD database
pgweb --bind 127.0.0.1 --listen :8080 \
  --url "postgresql://dbuser:dbpassword@localhost:5432/nodeangularfullstack_dashboard?sslmode=disable" \
  --auth-user admin \
  --auth-pass development-password

# Or for FORMS database
pgweb --bind 127.0.0.1 --listen :8080 \
  --url "postgresql://dbuser:dbpassword@localhost:5432/nodeangularfullstack_forms?sslmode=disable" \
  --auth-user admin \
  --auth-pass development-password
```

**Browser Check**:

```
Open: http://localhost:8080
Login: admin / development-password
```

---

## Step 10: Verify Everything is Running

### Check All Services

```bash
# Check all ports
lsof -i :3000  # Dashboard API
lsof -i :3001  # Forms API
lsof -i :4200  # Main Dashboard
lsof -i :4201  # Form Builder UI
lsof -i :8080  # pgWeb (if running)
lsof -i :5432  # PostgreSQL
```

### Health Checks

```bash
# Dashboard API
curl http://localhost:3000/health
curl http://localhost:3000/api-docs  # Swagger UI

# Forms API
curl http://localhost:3001/health
curl http://localhost:3001/api-docs  # Swagger UI

# Main Dashboard
curl http://localhost:4200

# Form Builder UI
curl http://localhost:4201
```

---

## Service URLs Summary

Once everything is running, you'll have access to:

### 🌐 Frontend Applications

| Service         | URL                   | Description                       |
| --------------- | --------------------- | --------------------------------- |
| Main Dashboard  | http://localhost:4200 | Angular dashboard application     |
| Form Builder UI | http://localhost:4201 | Standalone form builder interface |

### 🔧 Backend APIs

| Service            | URL                            | Description                   |
| ------------------ | ------------------------------ | ----------------------------- |
| Dashboard API      | http://localhost:3000          | Dashboard microservice API    |
| Dashboard API Docs | http://localhost:3000/api-docs | Swagger/OpenAPI documentation |
| Dashboard Health   | http://localhost:3000/health   | Health check endpoint         |
| Forms API          | http://localhost:3001          | Forms microservice API        |
| Forms API Docs     | http://localhost:3001/api-docs | Swagger/OpenAPI documentation |
| Forms Health       | http://localhost:3001/health   | Health check endpoint         |

### 🗄️ Database

| Service    | URL                   | Description              |
| ---------- | --------------------- | ------------------------ |
| pgWeb UI   | http://localhost:8080 | PostgreSQL web interface |
| PostgreSQL | localhost:5432        | PostgreSQL server        |

### 🗃️ Databases

| Database                         | Purpose                    | Access                     |
| -------------------------------- | -------------------------- | -------------------------- |
| `nodeangularfullstack_auth`      | Shared authentication data | Read-only (both APIs)      |
| `nodeangularfullstack_dashboard` | Dashboard API data         | Read-write (dashboard-api) |
| `nodeangularfullstack_forms`     | Forms API data             | Read-write (forms-api)     |

---

## Test Credentials

Use these credentials for testing:

```
Admin User:
  Email: admin@example.com
  Password: User123!@#
  Role: admin

Regular User:
  Email: user@example.com
  Password: User123!@#
  Role: user

Read-Only User:
  Email: readonly@example.com
  Password: User123!@#
  Role: readonly
```

---

## Stopping All Services

### Option 1: Use Stop Script

```bash
./stop-dev.sh
```

### Option 2: Manual Stop

```bash
# Kill processes by port
lsof -ti:3000 | xargs kill  # Dashboard API
lsof -ti:3001 | xargs kill  # Forms API
lsof -ti:4200 | xargs kill  # Main Dashboard
lsof -ti:4201 | xargs kill  # Form Builder UI
lsof -ti:8080 | xargs kill  # pgWeb

# Or kill all node processes (careful!)
pkill -f "node.*apps/(dashboard-api|forms-api|web|form-builder-ui)"
```

### Option 3: Stop PostgreSQL

```bash
# Stop PostgreSQL service (Homebrew)
brew services stop postgresql@14

# Or manual stop
pg_ctl -D /usr/local/var/postgres stop
```

---

## Troubleshooting

### Problem: PostgreSQL not running

**Symptoms**:

```
❌ Unable to connect to PostgreSQL at localhost:5432
```

**Solution**:

```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql@14

# Or check if it's running but on different port
lsof -i :5432
```

---

### Problem: Databases don't exist

**Symptoms**:

```
ERROR: database "nodeangularfullstack_auth" does not exist
```

**Solution**:

```bash
# Create all 3 databases
./scripts/db/create-separated-databases.sh

# Then run migrations
./scripts/db/run-separated-migrations.sh
```

---

### Problem: Port already in use

**Symptoms**:

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**:

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill

# Or kill all node processes
pkill -f "node.*apps/dashboard-api"
```

---

### Problem: SharedAuthService validation failing

**Symptoms**:

```
ApiError: Invalid or inactive user
INVALID_USER (403)
```

**Solution**:

```bash
# Verify user exists in AUTH database
PGPASSWORD='dbpassword' psql -h localhost -U dbuser -d nodeangularfullstack_auth -c "SELECT id, email, is_active FROM users;"

# If no users, seed the database
npm --workspace=apps/dashboard-api run db:seed
```

---

### Problem: Migration errors

**Symptoms**:

```
ERROR: relation "users" already exists
```

**Solution**:

```bash
# Drop and recreate databases
PGPASSWORD='' psql -h localhost -U postgres -d postgres <<'EOF'
DROP DATABASE IF EXISTS nodeangularfullstack_auth;
DROP DATABASE IF EXISTS nodeangularfullstack_dashboard;
DROP DATABASE IF EXISTS nodeangularfullstack_forms;
EOF

# Recreate and run migrations
./scripts/db/create-separated-databases.sh
./scripts/db/run-separated-migrations.sh
```

---

### Problem: Shared package not built

**Symptoms**:

```
Error: Cannot find module '@nodeangularfullstack/shared'
```

**Solution**:

```bash
# Build shared package first
npm run build:shared

# Then restart services
npm --workspace=apps/dashboard-api run dev
```

---

## Development Workflow

### Typical Development Sequence

1. **Start PostgreSQL** (once per day)

   ```bash
   brew services start postgresql@14
   ```

2. **Pull latest changes**

   ```bash
   git pull origin main
   npm install  # Update dependencies if package.json changed
   ```

3. **Run migrations** (if database schema changed)

   ```bash
   ./scripts/db/run-separated-migrations.sh
   ```

4. **Build shared package** (if types changed)

   ```bash
   npm run build:shared
   ```

5. **Start services** (in separate terminals)

   ```bash
   # Terminal 1
   npm --workspace=apps/dashboard-api run dev

   # Terminal 2
   npm --workspace=apps/forms-api run dev

   # Terminal 3
   npm --workspace=apps/web run dev

   # Terminal 4 (optional)
   npm --workspace=apps/form-builder-ui run dev
   ```

6. **Develop and test**
   - Code changes auto-reload (hot module replacement)
   - Check browser console for frontend errors
   - Check terminal output for backend errors

7. **Stop services** (end of day)
   ```bash
   ./stop-dev.sh
   # Or Ctrl+C in each terminal
   ```

---

## Logs Location

All service logs are stored in `logs/` directory:

```
logs/
├── dashboard-api.log      # Dashboard API output
├── forms-api.log          # Forms API output
├── frontend.log           # Main dashboard output
├── form-builder-ui.log    # Form builder UI output
└── pgweb.log             # pgWeb output
```

**View logs in real-time**:

```bash
# Dashboard API logs
tail -f logs/dashboard-api.log

# Forms API logs
tail -f logs/forms-api.log

# Frontend logs
tail -f logs/frontend.log
```

---

## Quick Reference Commands

```bash
# Start PostgreSQL
brew services start postgresql@14

# Create databases
./scripts/db/create-separated-databases.sh

# Run migrations
./scripts/db/run-separated-migrations.sh

# Build shared package
npm run build:shared

# Start services (separate terminals)
npm --workspace=apps/dashboard-api run dev    # Terminal 1
npm --workspace=apps/forms-api run dev        # Terminal 2
npm --workspace=apps/web run dev              # Terminal 3
npm --workspace=apps/form-builder-ui run dev  # Terminal 4

# Stop all services
./stop-dev.sh

# View all logs
tail -f logs/*.log

# Kill specific port
lsof -ti:3000 | xargs kill

# Check database connections
PGPASSWORD='dbpassword' psql -h localhost -U dbuser -d nodeangularfullstack_auth -c "\l"
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Browser                           │
│  http://localhost:4200 (Dashboard)                         │
│  http://localhost:4201 (Form Builder UI)                   │
└────────────┬────────────────────────┬───────────────────────┘
             │                        │
             │                        │
    ┌────────▼────────┐      ┌───────▼────────┐
    │ Dashboard API   │      │ Forms API      │
    │ Port: 3000      │      │ Port: 3001     │
    └────────┬────────┘      └────────┬───────┘
             │                        │
             │                        │
    ┌────────▼────────┐      ┌───────▼────────┐
    │ authPool        │      │ authPool       │
    │ (read-only)     │      │ (read-only)    │
    └────────┬────────┘      └────────┬───────┘
             │                        │
             └────────────┬───────────┘
                          │
                 ┌────────▼────────┐
                 │ AUTH Database   │
                 │ (8 tables)      │
                 │ users, tenants  │
                 │ sessions, etc.  │
                 └─────────────────┘

    ┌────────────────┐      ┌────────────────┐
    │ dashboardPool  │      │ formsPool      │
    │ (read-write)   │      │ (read-write)   │
    └────────┬───────┘      └────────┬───────┘
             │                        │
    ┌────────▼────────┐      ┌───────▼────────┐
    │ DASHBOARD DB    │      │ FORMS DB       │
    │ (3 tables)      │      │ (5 tables)     │
    │ tools, configs  │      │ forms, themes  │
    └─────────────────┘      └────────────────┘
```

---

## Next Steps

- ✅ All 3 databases created and migrated
- ✅ Backend services running with multi-database support
- ✅ Frontend applications connected to APIs
- ⏳ Update `start-dev.sh` for automated multi-database startup (Phase 7)
- ⏳ Update CLAUDE.md and README.md documentation (Phase 7)

---

**Need Help?**

- Check logs in `logs/` directory
- Review troubleshooting section above
- Consult `docs/architecture/database-separation-implementation-summary.md`
- Check migration guide at `scripts/db/MIGRATION_README.md`
