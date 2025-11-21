# GitLab CI/CD Setup Guide

This guide will help you set up automated deployment to production using GitLab CI/CD.

## Overview

The GitLab CI/CD pipeline automatically builds and deploys your application when you push to the
`production` branch. It handles:

- **Shared Package**: Builds the shared TypeScript package used by all apps
- **Backend APIs**: Deploys dashboard-api and forms-api using PM2 process manager
- **Frontend Apps**: Builds and deploys both web and form-builder-ui Angular applications

## Pipeline Stages

```
1. build-shared        → Build packages/shared
2. deploy-backend      → Deploy backend APIs with PM2
3. deploy-frontend     → Build and deploy Angular frontends
```

## Prerequisites

### 1. Server Requirements

Your production server must have:

- **Node.js 18+** installed
- **PM2** installed globally (`npm install -g pm2`)
- **PostgreSQL 14+** running and accessible
- **SSH access** enabled
- **Sufficient disk space** for builds and logs

### 2. Server Directory Structure

The deployment script expects this directory structure on your server:

```
/var/www/NodeAngularFullStack/          # Main deployment directory
├── apps/
│   ├── dashboard-api/                  # Dashboard/Auth API (port 3000)
│   ├── forms-api/                      # Forms/Themes/Export API (port 3001)
│   └── ...
├── packages/
│   └── shared/                         # Shared TypeScript package
├── frontend/
│   ├── web/                           # Main UI build output
│   └── form-builder/                  # Form Builder UI build output
├── logs/                              # PM2 log files
├── ecosystem.config.js                # PM2 configuration
├── scripts/
│   └── deploy-backend.sh              # Backend deployment script
└── .env                               # Production environment variables
```

### 3. Environment Variables on Server

Create a `.env` file in the deployment directory with:

```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=nodeangularfullstack
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password

# JWT Secrets
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# API Configuration
NODE_ENV=production
PORT=3000
FORMS_API_PORT=3001

# CORS
CORS_ORIGIN=https://legopdf.com,https://form-builder.legopdf.com

# File Upload
MAX_FILE_SIZE=10485760

# Other production configs...
```

## GitLab CI/CD Configuration

### Required GitLab CI/CD Variables

Go to your GitLab project: **Settings → CI/CD → Variables** and add:

| Variable Name             | Type     | Protected | Masked | Description                                  |
| ------------------------- | -------- | --------- | ------ | -------------------------------------------- |
| `PROD_SSH_USER`           | Variable | ✅        | ❌     | SSH username (e.g., `deploy`)                |
| `PROD_SSH_HOST`           | Variable | ✅        | ❌     | Server IP or hostname (e.g., `123.45.67.89`) |
| `PROD_DEPLOY_PATH`        | Variable | ✅        | ❌     | Deployment directory (e.g., `/var/www/...`)  |
| `PROD_DEPLOY_FRONT_BUILD` | Variable | ✅        | ❌     | Frontend build config (e.g., `production`)   |
| `PROD_SSH_PRIVATE_KEY`    | File     | ✅        | ✅     | Base64-encoded SSH private key               |

### Generating SSH Private Key (Base64)

**Step 1: Generate SSH key pair on your local machine**

```bash
ssh-keygen -t ed25519 -C "gitlab-ci-deploy" -f ~/.ssh/gitlab-ci-deploy
```

**Step 2: Copy public key to production server**

```bash
ssh-copy-id -i ~/.ssh/gitlab-ci-deploy.pub your_user@your_server
```

**Step 3: Base64 encode the private key**

```bash
base64 -i ~/.ssh/gitlab-ci-deploy | pbcopy  # macOS
base64 -w 0 ~/.ssh/gitlab-ci-deploy         # Linux
```

**Step 4: Add to GitLab CI/CD Variables**

- Go to **Settings → CI/CD → Variables**
- Click **Add variable**
- Key: `PROD_SSH_PRIVATE_KEY`
- Type: **File**
- Value: Paste the base64-encoded private key
- Check **Protected** and **Masked**
- Click **Add variable**

### Example Variable Values

```bash
PROD_SSH_USER=deploy
PROD_SSH_HOST=123.45.67.89
PROD_DEPLOY_PATH=/var/www/NodeAngularFullStack
PROD_DEPLOY_FRONT_BUILD=production
PROD_SSH_PRIVATE_KEY=<base64-encoded-ssh-key>
```

## Server Setup Instructions

### 1. Create Deployment User

```bash
# On your production server
sudo adduser deploy
sudo usermod -aG sudo deploy
```

### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Verify installations
node --version    # Should be v20.x.x
npm --version     # Should be 10.x.x
pm2 --version     # Should be 5.x.x
```

### 3. Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE nodeangularfullstack;
CREATE USER your_db_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE nodeangularfullstack TO your_db_user;
\q
```

### 4. Create Deployment Directory

```bash
# Create directory structure
sudo mkdir -p /var/www/NodeAngularFullStack/{apps,packages,frontend,logs,scripts}
sudo chown -R deploy:deploy /var/www/NodeAngularFullStack
```

### 5. Configure PM2 for Auto-Startup

```bash
# Generate startup script
pm2 startup

# Follow the instructions displayed (run the command as sudo)
# This ensures PM2 starts on server reboot
```

### 6. Configure Nginx (Optional but Recommended)

Create Nginx configuration for reverse proxy:

```nginx
# /etc/nginx/sites-available/nodeangularfullstack

# Main UI
server {
    listen 80;
    server_name legopdf.com www.legopdf.com;

    root /var/www/NodeAngularFullStack/frontend/web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Form Builder UI
server {
    listen 80;
    server_name form-builder.legopdf.com;

    root /var/www/NodeAngularFullStack/frontend/form-builder;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Forms API
server {
    listen 80;
    server_name forms-api.legopdf.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration:

```bash
sudo ln -s /etc/nginx/sites-available/nodeangularfullstack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Configure SSL with Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate SSL certificates
sudo certbot --nginx -d legopdf.com -d www.legopdf.com
sudo certbot --nginx -d form-builder.legopdf.com
sudo certbot --nginx -d forms-api.legopdf.com

# Auto-renewal is configured automatically
```

## Deployment Workflow

### 1. Development Workflow

```bash
# Work on your feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to GitLab
git push origin feature/my-feature

# Create merge request to production branch
```

### 2. Production Deployment

```bash
# Merge to production branch
git checkout production
git merge feature/my-feature

# Push to trigger CI/CD pipeline
git push origin production
```

### 3. Monitor Deployment

1. Go to **GitLab → CI/CD → Pipelines**
2. Click on the running pipeline
3. View real-time logs for each job:
   - `build_shared_package`
   - `deploy_backend_apis`
   - `deploy_frontend_main_ui`
   - `deploy_frontend_form_builder`

### 4. Verify Deployment on Server

```bash
# SSH into production server
ssh deploy@your_server

# Check PM2 processes
pm2 list

# View logs
pm2 logs dashboard-api
pm2 logs forms-api

# Check frontend files
ls -la /var/www/NodeAngularFullStack/frontend/web
ls -la /var/www/NodeAngularFullStack/frontend/form-builder
```

## Pipeline Jobs Explained

### Job 1: `build_shared_package`

- **Purpose**: Builds the shared TypeScript package
- **Image**: `node:20-alpine`
- **Artifacts**: `packages/shared/dist/`
- **Duration**: ~1-2 minutes

### Job 2: `deploy_backend_apis`

- **Purpose**: Deploys backend APIs with PM2
- **Dependencies**: `build_shared_package`
- **Steps**:
  1. Copy source files to server via rsync
  2. Execute `scripts/deploy-backend.sh` on server
  3. Build TypeScript on server
  4. Run database migrations
  5. Reload PM2 processes
- **Duration**: ~3-5 minutes

### Job 3: `deploy_frontend_main_ui`

- **Purpose**: Builds and deploys main UI (apps/web)
- **Dependencies**: `build_shared_package`, `deploy_backend_apis`
- **Steps**:
  1. Build Angular app with production config
  2. Copy `apps/web/dist/web/browser/` to server
  3. Deploy to `/frontend/web/`
- **Duration**: ~4-6 minutes

### Job 4: `deploy_frontend_form_builder`

- **Purpose**: Builds and deploys form builder UI
- **Dependencies**: `build_shared_package`, `deploy_backend_apis`
- **Steps**:
  1. Build Angular app with production config
  2. Copy `apps/form-builder-ui/dist/form-builder-ui/browser/` to server
  3. Deploy to `/frontend/form-builder/`
- **Duration**: ~4-6 minutes

## Troubleshooting

### Pipeline Fails: SSH Connection Error

**Error**: `Permission denied (publickey)`

**Solution**:

1. Verify SSH key is base64-encoded correctly
2. Check public key is in `~/.ssh/authorized_keys` on server
3. Ensure GitLab variable `PROD_SSH_PRIVATE_KEY` is type **File**

### Pipeline Fails: Build Errors

**Error**: `npm ERR! code ELIFECYCLE`

**Solution**:

1. Check TypeScript errors locally: `npm run typecheck`
2. Verify all dependencies are in `package.json`
3. Clear cache and retry: Go to **CI/CD → Pipelines → Clear runner caches**

### PM2 Processes Not Starting

**Error**: PM2 shows processes as "errored" or "stopped"

**Solution**:

```bash
# SSH into server
ssh deploy@your_server

# Check PM2 logs
pm2 logs dashboard-api --lines 50
pm2 logs forms-api --lines 50

# Restart processes
pm2 restart ecosystem.config.js

# Check environment variables
cat /var/www/NodeAngularFullStack/.env
```

### Frontend Not Accessible

**Error**: 404 or blank page

**Solution**:

1. Check Nginx configuration: `sudo nginx -t`
2. Verify build files exist: `ls /var/www/NodeAngularFullStack/frontend/web`
3. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
4. Restart Nginx: `sudo systemctl restart nginx`

### Database Migration Fails

**Error**: Migration fails during deployment

**Solution**:

```bash
# SSH into server
ssh deploy@your_server
cd /var/www/NodeAngularFullStack/apps/dashboard-api

# Run migrations manually
npm run db:migrate

# Check database connection
psql -U your_db_user -d nodeangularfullstack -c "SELECT 1"
```

## Rollback Instructions

### Rollback to Previous Deployment

```bash
# SSH into server
ssh deploy@your_server
cd /var/www/NodeAngularFullStack

# Stop current processes
pm2 stop ecosystem.config.js

# Restore previous git commit (if using git on server)
git checkout <previous-commit-hash>

# Rebuild and restart
npm ci
npm --workspace=packages/shared run build
npm --workspace=apps/dashboard-api run build
npm --workspace=apps/forms-api run build
pm2 restart ecosystem.config.js
```

### Rollback Frontend Only

```bash
# Restore previous frontend build from artifacts
# Download artifacts from previous successful pipeline
# Copy to server:
scp -r apps/web/dist/web/browser/* deploy@your_server:/var/www/NodeAngularFullStack/frontend/web/
```

## Monitoring and Maintenance

### View PM2 Process Status

```bash
pm2 list
pm2 monit        # Real-time monitoring
pm2 logs         # View all logs
pm2 flush        # Clear log files
```

### Check Server Resources

```bash
# Disk usage
df -h

# Memory usage
free -h

# CPU usage
top

# Node process memory
pm2 monit
```

### Update Dependencies on Server

```bash
# SSH into server
ssh deploy@your_server
cd /var/www/NodeAngularFullStack

# Update dependencies
npm update

# Rebuild and restart
npm --workspace=apps/dashboard-api run build
npm --workspace=apps/forms-api run build
pm2 restart ecosystem.config.js
```

## Security Best Practices

1. **SSH Key Management**:
   - Use ED25519 keys (more secure than RSA)
   - Rotate keys every 6-12 months
   - Never commit private keys to repository

2. **Environment Variables**:
   - Store sensitive values in GitLab CI/CD Variables (masked)
   - Use different credentials for dev/staging/production
   - Regularly rotate JWT secrets and database passwords

3. **Server Hardening**:
   - Keep system packages updated
   - Configure firewall (ufw or iptables)
   - Disable root SSH login
   - Use fail2ban to prevent brute-force attacks

4. **Database Security**:
   - Use strong passwords
   - Enable SSL for PostgreSQL connections
   - Regular backups (pg_dump)
   - Restrict database access to localhost

## Performance Optimization

### Enable Nginx Caching

```nginx
# Add to Nginx config
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Enable Gzip Compression

```nginx
# Add to Nginx config
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### PM2 Cluster Mode (Optional)

For high-traffic applications, enable cluster mode:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'dashboard-api',
      script: 'npm',
      args: 'start',
      cwd: './apps/dashboard-api',
      instances: 2, // Changed from 1
      exec_mode: 'cluster', // Changed from 'fork'
      // ... rest of config
    },
  ],
};
```

## Support

For issues or questions:

1. Check GitLab pipeline logs
2. Review server logs via PM2
3. Check Nginx error logs
4. Verify environment variables
5. Test locally with production build

---

**Last Updated**: 2025-11-21
