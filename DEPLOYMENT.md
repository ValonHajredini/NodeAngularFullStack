# Deployment Guide for legopdf.com

Complete guide for deploying NodeAngularFullStack to production server.

## 🚀 Quick Start

### One-Command Deployment

```bash
# On the server
cd /var/apps/NodeAngularFullStack
./deploy.sh
```

This runs the full deployment: dependencies → builds → migrations → restart → health checks.

## 📋 Deployment Options

### Full Deployment (Recommended)

```bash
./deploy.sh
```

### Partial Deployments

```bash
# Skip dependency installation (if already installed)
./deploy.sh --skip-deps

# Skip builds (if already built)
./deploy.sh --skip-build

# Skip database migrations
./deploy.sh --skip-migrations

# Skip health checks
./deploy.sh --skip-health-check

# Combine options
./deploy.sh --skip-deps --skip-migrations
```

### Get Help

```bash
./deploy.sh --help
```

## 🔧 What the Script Does

### 1. Checks Prerequisites ✓

- Node.js installation
- npm installation
- PM2 installation
- PostgreSQL status
- Project directory exists

### 2. Creates Backup 💾

- Backs up current `dist` directories
- Saves to `../backups/YYYYMMDD_HHMMSS/`

### 3. Installs Dependencies 📦

- Runs `npm ci --production` for production
- Installs all workspace dependencies from root

### 4. Builds Applications 🔨

- Builds `@nodeangularfullstack/shared`
- Builds `apps/web` → `dist/web/browser`
- Builds `apps/form-builder-ui` → `dist/form-builder-ui/browser`
- Builds `apps/dashboard-api`
- Builds `apps/forms-api`

### 5. Runs Migrations 🗄️

- Executes dashboard-api migrations
- Executes forms-api migrations

### 6. Restarts Services 🔄

- Restarts/starts `dashboard-api` via PM2
- Restarts/starts `forms-api` via PM2
- Saves PM2 process list

### 7. Reloads Nginx 🌐

- Tests nginx configuration
- Reloads nginx if test passes

### 8. Health Checks 🏥

- Tests `http://localhost:3000/health` (dashboard-api)
- Tests `http://localhost:3001/health` (forms-api)
- Tests frontend accessibility

### 9. Shows Summary 📊

- Displays deployment status
- Shows service URLs
- Lists log locations

## 📂 Directory Structure After Deployment

```
/var/apps/NodeAngularFullStack/
├── apps/
│   ├── web/
│   │   └── dist/
│   │       └── web/
│   │           └── browser/         ← nginx serves from here
│   ├── form-builder-ui/
│   │   └── dist/
│   │       └── form-builder-ui/
│   │           └── browser/         ← nginx serves from here
│   ├── dashboard-api/               ← PM2 runs from here (port 3000)
│   └── forms-api/                   ← PM2 runs from here (port 3001)
├── node_modules/                    ← Shared dependencies
├── deploy.sh                        ← This script
└── package-lock.json                ← Version lock file
```

## 🔐 Environment Variables

The script uses these environment variables:

```bash
# Project directory (default: /var/apps/NodeAngularFullStack)
export PROJECT_DIR=/var/apps/NodeAngularFullStack

# Node environment (default: production)
export NODE_ENV=production

# Run deployment
./deploy.sh
```

## 📝 Manual Deployment Steps

If you prefer to run steps manually:

```bash
# 1. Navigate to project
cd /var/apps/NodeAngularFullStack

# 2. Install dependencies
npm ci --production

# 3. Build shared package
npm run build:shared

# 4. Build frontend apps
npm --workspace=apps/web run build
npm --workspace=apps/form-builder-ui run build

# 5. Build backend apps
npm --workspace=apps/dashboard-api run build
npm --workspace=apps/forms-api run build

# 6. Run migrations
npm --workspace=apps/dashboard-api run db:migrate
npm --workspace=apps/forms-api run db:migrate

# 7. Restart services
pm2 restart dashboard-api
pm2 restart forms-api

# 8. Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

## 🚨 Troubleshooting

### Deployment Fails at Dependencies

```bash
# Clean install
rm -rf node_modules
npm cache clean --force
./deploy.sh
```

### Build Fails

```bash
# Check Node.js version
node --version  # Should be 18+

# Check disk space
df -h

# Try building individual apps
npm --workspace=apps/web run build
```

### Services Don't Start

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs

# Restart manually
pm2 restart all
```

### Health Checks Fail

```bash
# Check if services are running
pm2 status

# Check service logs
pm2 logs dashboard-api
pm2 logs forms-api

# Test endpoints manually
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### Nginx Errors

```bash
# Test nginx config
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/*.error.log

# Restart nginx
sudo systemctl restart nginx
```

## 🔄 PM2 Process Management

The deployment script uses PM2 to manage backend services (dashboard-api and forms-api).

### Using Ecosystem Configuration (Recommended)

The project includes `ecosystem.config.js` for centralized PM2 configuration:

```bash
# Start all services
cd /var/apps/NodeAngularFullStack
pm2 start ecosystem.config.js

# Restart all services
pm2 restart ecosystem.config.js

# Stop all services
pm2 stop ecosystem.config.js

# Delete all services from PM2
pm2 delete ecosystem.config.js

# View logs for specific service
pm2 logs dashboard-api
pm2 logs forms-api
```

### Manual Service Management

If you need to manage services individually:

```bash
# Start services manually
cd /var/apps/NodeAngularFullStack/apps/dashboard-api
pm2 start npm --name "dashboard-api" -- start

cd /var/apps/NodeAngularFullStack/apps/forms-api
pm2 start npm --name "forms-api" -- start

# Restart specific service
pm2 restart dashboard-api
pm2 restart forms-api

# Stop specific service
pm2 stop dashboard-api
```

### PM2 Auto-Restart on Boot

```bash
# Setup PM2 to start on system boot
pm2 startup

# Save current process list
pm2 save
```

### Common PM2 Commands

```bash
# View all processes
pm2 list

# Monitor resource usage
pm2 monit

# View logs in real-time
pm2 logs

# Clear all logs
pm2 flush

# Reload process (0-second downtime)
pm2 reload dashboard-api

# Show detailed process info
pm2 show dashboard-api
```

## 📊 Monitoring After Deployment

### View PM2 Processes

```bash
pm2 status
pm2 monit
```

### View Application Logs

```bash
# Real-time logs
pm2 logs

# Specific app logs
pm2 logs dashboard-api
pm2 logs forms-api

# Last 100 lines
pm2 logs --lines 100
```

### View Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/web.legopdf.com.access.log
sudo tail -f /var/log/nginx/api.legopdf.com.access.log

# Error logs
sudo tail -f /var/log/nginx/*.error.log
```

## 🔄 Rollback

If deployment fails, restore from backup:

```bash
# Find latest backup
ls -lt ../backups/

# Restore dist directories
cp -r ../backups/YYYYMMDD_HHMMSS/web-dist apps/web/dist
cp -r ../backups/YYYYMMDD_HHMMSS/form-builder-ui-dist apps/form-builder-ui/dist

# Restart services
pm2 restart all
```

## 🎯 Best Practices

1. **Always test locally first**: Run `npm run build` locally before deploying
2. **Use git tags**: Tag releases for easy rollback
3. **Monitor logs**: Check logs after deployment for errors
4. **Verify health checks**: Ensure all health endpoints respond
5. **Keep backups**: Backups are created automatically by the script
6. **Use PM2 ecosystem file**: Consider using PM2 ecosystem.config.js for complex setups

## 📚 Additional Resources

- [nginx README](nginx/README.md) - Nginx configuration guide
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [PostgreSQL Backup](https://www.postgresql.org/docs/current/backup.html)

---

**Created**: November 2024 **Version**: 1.0.0 **Script**: deploy.sh
