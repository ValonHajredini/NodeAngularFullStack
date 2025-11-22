# PM2 Deployment & Default User Seeding Guide

This guide explains how PM2 manages your backend services and how default users are automatically
seeded on first deployment.

## 📋 Table of Contents

1. [PM2 Process Management](#pm2-process-management)
2. [Default User Seeding](#default-user-seeding)
3. [Deployment Workflow](#deployment-workflow)
4. [Manual Commands](#manual-commands)
5. [Troubleshooting](#troubleshooting)

---

## 🔧 PM2 Process Management

### What is PM2?

PM2 is a production process manager for Node.js applications. It provides:

✅ **Auto-restart** on crashes ✅ **Zero-downtime** restarts ✅ **Memory management** with automatic
restarts ✅ **Centralized logging** ✅ **Process monitoring** ✅ **Startup scripts** for auto-start
on server reboot

### Current Configuration

**File:** `ecosystem.config.js`

```javascript
{
  apps: [
    {
      name: 'api', // Main backend API
      script: 'npm',
      args: 'start',
      cwd: './apps/api',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'forms-api', // Forms backend API
      script: 'npm',
      args: 'start',
      cwd: './apps/forms-api',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ];
}
```

### Service Details

| Service   | Port | Purpose                          | PM2 Name  |
| --------- | ---- | -------------------------------- | --------- |
| API       | 3000 | Auth, users, admin functionality | api       |
| Forms API | 3001 | Forms, themes, templates         | forms-api |

### How PM2 Works in Deployment

The `deploy.sh` script automatically:

1. **Checks if services are running** in PM2
2. **If running** → Restarts via `pm2 restart ecosystem.config.js`
3. **If not running** → Starts via `pm2 start ecosystem.config.js`
4. **Saves configuration** via `pm2 save`
5. **Displays status** via `pm2 list`

This ensures **zero-downtime deployments** and **intelligent process management**.

---

## 👤 Default User Seeding

### What is User Seeding?

On first deployment (when the database has no users), the system automatically creates 3 default
users so you can immediately login and administer the system.

### Default Users Created

| Email                | Password   | Role      | Purpose              |
| -------------------- | ---------- | --------- | -------------------- |
| admin@example.com    | User123!@# | admin     | Full system access   |
| user@example.com     | User123!@# | user      | Standard user access |
| readonly@example.com | User123!@# | read_only | View-only access     |

⚠️ **IMPORTANT:** Change these passwords immediately after first login in production!

### How Seeding Works

**Files Created:**

- `apps/api/database/seeds/001_seed_default_users.ts`
- `apps/forms-api/database/seeds/001_seed_default_users.ts`

**Seeding Logic:**

```typescript
1. Connect to database
2. Check if ANY users exist: SELECT COUNT(*) FROM users
3. If count > 0:
   - Skip seeding (users already exist)
   - Display "Users already exist" message
4. If count = 0:
   - Hash password with bcrypt (10 rounds)
   - Create 3 default users
   - Display credentials
```

**Idempotent Design:** The seed script is **safe to run multiple times**. It only creates users if
none exist.

### When Seeding Runs

**Automatic (during deployment):**

```bash
./deploy.sh  # Runs migrations → Runs user seed automatically
```

**Manual (on-demand):**

```bash
# Seed default users manually
npm --workspace=apps/api run db:seed:users

# Or for forms-api
npm --workspace=apps/forms-api run db:seed:users
```

---

## 🚀 Deployment Workflow

### Full Deployment Process

When you run `./deploy.sh`, here's what happens:

```
1. ✅ Check prerequisites (Node, npm, PM2, PostgreSQL)
2. 💾 Backup current deployment
3. 📦 Install dependencies (npm ci --production)
4. 🔨 Build shared packages
5. 🎨 Build frontend applications (web, form-builder-ui)
6. ⚙️  Build backend applications (api, forms-api)
7. 🗄️  Run database migrations
   ├── api migrations
   ├── forms-api migrations
   └── 👤 Seed default users (if no users exist)
8. 🔄 Restart PM2 services
   ├── Check if running → Restart
   └── If not running → Start
9. 🔁 Reload nginx
10. 🏥 Run health checks
11. 📊 Display deployment summary
```

### Deployment Output (User Seeding)

When seeding runs for the first time, you'll see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Seeding Default Users
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Checking for existing users and seeding if necessary...

🔍 Checking if users exist...
📦 No users found. Creating default users...
📝 Creating default users...
✅ Created user: admin@example.com (admin)
✅ Created user: user@example.com (user)
✅ Created user: readonly@example.com (read_only)

✅ Default users created successfully!

📋 Login Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin:
  Email:    admin@example.com
  Password: User123!@#
  Role:     admin

Regular User:
  Email:    user@example.com
  Password: User123!@#
  Role:     user

Read-Only User:
  Email:    readonly@example.com
  Password: User123!@#
  Role:     read_only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  IMPORTANT: Change these passwords in production!

✓ Database seeding completed
```

---

## 🛠️ Manual Commands

### PM2 Management

```bash
# View all PM2 processes
pm2 list

# View logs for all services
pm2 logs

# View logs for specific service
pm2 logs api
pm2 logs forms-api

# Monitor resources in real-time
pm2 monit

# Restart all services
pm2 restart ecosystem.config.js

# Restart specific service
pm2 restart api
pm2 restart forms-api

# Stop all services
pm2 stop ecosystem.config.js

# Start all services
pm2 start ecosystem.config.js

# Delete all PM2 processes
pm2 delete all

# Save PM2 process list
pm2 save

# Setup PM2 startup script (run once)
pm2 startup
```

### Database Seeding

```bash
# Seed default users (safe to run multiple times)
npm --workspace=apps/api run db:seed:users

# Seed all data (themes, forms, etc.)
npm --workspace=apps/api run db:seed

# Reset database and re-seed
npm --workspace=apps/api run db:reset
```

### Deployment

```bash
# Full deployment
./deploy.sh

# Skip dependency installation
./deploy.sh --skip-deps

# Skip builds
./deploy.sh --skip-build

# Skip migrations (and seeding)
./deploy.sh --skip-migrations

# Skip health checks
./deploy.sh --skip-health-check

# Help
./deploy.sh --help
```

---

## 🔍 Troubleshooting

### PM2 Services Show "errored" Status

**Check logs:**

```bash
pm2 logs api --lines 50
pm2 logs forms-api --lines 50
```

**Common causes:**

- Port already in use (kill with `lsof -ti:3000 | xargs kill -9`)
- Missing `.env` file
- Database connection failed
- Build failed (check `dist/` directory exists)

**Solution:**

```bash
# Delete all PM2 processes
pm2 delete all

# Rebuild backend
npm --workspace=apps/api run build
npm --workspace=apps/forms-api run build

# Start fresh
pm2 start ecosystem.config.js
pm2 save
```

### User Seeding Fails

**Error:** "relation 'users' does not exist" **Solution:** Run migrations first

```bash
npm --workspace=apps/api run db:migrate
npm --workspace=apps/api run db:seed:users
```

**Error:** "Users already exist. Skipping seed." **This is normal!** It means users are already in
the database. The seed is working correctly.

**To force re-seed (DANGER - deletes all users!):**

```bash
# Delete all users from database
PGPASSWORD=dbpassword psql -h localhost -U dbuser -d nodeangularfullstack \
  -c "TRUNCATE TABLE users CASCADE;"

# Re-run seed
npm --workspace=apps/api run db:seed:users
```

### PM2 Not Starting After Reboot

**Setup PM2 startup script (run once):**

```bash
pm2 startup
# Follow the displayed command (will use sudo)

# Then save current process list
pm2 save
```

Now PM2 will auto-start your services on server reboot.

### Database Connection Failed

**Check PostgreSQL is running:**

```bash
pg_isready
# Should show: accepting connections

# If not running, start it
sudo systemctl start postgresql
```

**Check database credentials in `.env`:**

```bash
grep "^DB_" /var/apps/NodeAngularFullStack/apps/api/.env
```

---

## 📝 Summary

### PM2 Benefits

✅ **Production-ready** process management ✅ **Auto-restart** on crashes ✅ **Zero-downtime**
deployments ✅ **Memory monitoring** and auto-restart ✅ **Centralized logging** ✅ **Easy scaling**
(can increase instances)

### User Seeding Benefits

✅ **Immediate access** after first deployment ✅ **Idempotent** (safe to run multiple times) ✅
**Automatic** (runs during deployment) ✅ **Secure** (bcrypt password hashing) ✅ **Role-based**
(admin, user, read-only)

### Best Practices

1. ✅ Always run `pm2 save` after starting services
2. ✅ Setup `pm2 startup` for auto-start on reboot
3. ✅ Monitor logs with `pm2 logs` regularly
4. ✅ Change default passwords immediately in production
5. ✅ Use `./deploy.sh` for deployments (handles everything)

---

## 🔗 Related Files

- `ecosystem.config.js` - PM2 configuration
- `deploy.sh` - Deployment script
- `apps/api/database/seeds/001_seed_default_users.ts` - User seed script
- `apps/forms-api/database/seeds/001_seed_default_users.ts` - User seed script
- `apps/api/package.json` - Includes `db:seed:users` command
- `apps/forms-api/package.json` - Includes `db:seed:users` command
