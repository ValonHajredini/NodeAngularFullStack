# CI/CD Setup Guide for DigitalOcean Deployment

This guide walks you through setting up automated deployments to your DigitalOcean Droplet using GitHub Actions.

## 📋 Prerequisites

- ✅ DigitalOcean Droplet running Ubuntu 20.04+
- ✅ SSH access to your server
- ✅ Node.js 18+ installed on server
- ✅ PM2 installed globally on server
- ✅ PostgreSQL running on server
- ✅ Project cloned at `/var/apps/NodeAngularFullStack` on server
- ✅ Nginx configured and running

## 🔐 Step 1: Generate SSH Key for GitHub Actions

On your **local machine**, generate a dedicated SSH key for deployments:

```bash
# Generate SSH key (no passphrase for automation)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# This creates:
# - ~/.ssh/github_actions_deploy (private key - for GitHub Secrets)
# - ~/.ssh/github_actions_deploy.pub (public key - for server)
```

## 🖥️ Step 2: Add Public Key to Server

Copy the public key to your DigitalOcean server:

```bash
# Option 1: Using ssh-copy-id (easiest)
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub your_user@your_server_ip

# Option 2: Manual copy
cat ~/.ssh/github_actions_deploy.pub
# Copy the output and paste it into ~/.ssh/authorized_keys on your server
```

On your **server**, verify the key is added:

```bash
cat ~/.ssh/authorized_keys
# You should see the github-actions-deploy key
```

## 🔑 Step 3: Configure GitHub Secrets

Go to your GitHub repository:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add the following secrets:

### Required Secrets:

1. **SSH_PRIVATE_KEY**
   ```bash
   # On your local machine, copy the private key:
   cat ~/.ssh/github_actions_deploy
   ```
   - Copy the entire output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)
   - Paste into GitHub secret value

2. **SSH_HOST**
   - Your DigitalOcean Droplet IP address
   - Example: `167.99.123.45`

3. **SSH_USER**
   - Your server username (usually `root` or custom user)
   - Example: `root` or `deploy`

4. **SSH_PORT** (Optional)
   - SSH port (default is 22)
   - Only add if you've changed the default SSH port
   - Example: `2222`

### Adding Secrets in GitHub:

```
Repository → Settings → Secrets and variables → Actions → New repository secret

Name: SSH_PRIVATE_KEY
Value: [Paste entire private key content]

Name: SSH_HOST
Value: 167.99.123.45

Name: SSH_USER
Value: root

Name: SSH_PORT (optional)
Value: 22
```

## 🚀 Step 4: Prepare Server for Deployment

SSH into your server and set up the project directory:

```bash
# SSH to your server
ssh your_user@your_server_ip

# Create project directory
sudo mkdir -p /var/apps/NodeAngularFullStack
sudo chown -R $USER:$USER /var/apps/NodeAngularFullStack

# Clone repository
cd /var/apps
git clone git@github.com:ValonHajredini/NodeAngularFullStack.git

# Or if already cloned, ensure it's on main branch
cd /var/apps/NodeAngularFullStack
git checkout main
git pull origin main

# Install global dependencies
npm install -g pm2

# Setup PM2 to start on boot
pm2 startup
# Follow the command output instructions

# Install project dependencies
npm ci --production

# Make deploy script executable
chmod +x deploy.sh

# Set up environment variables
cp .env.example .env.production
# Edit .env.production with production values
nano .env.production
```

## 📝 Step 5: Configure Server Environment

Create `.env.production` on your server with production values:

```bash
# /var/apps/NodeAngularFullStack/.env.production
NODE_ENV=production

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=nodeangularfullstack
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_key_min_32_chars

# API URLs
DASHBOARD_API_URL=https://api.legopdf.com
FORMS_API_URL=https://forms-api.legopdf.com
```

## 🧪 Step 6: Test SSH Connection

Test that GitHub Actions can SSH to your server:

```bash
# On your local machine
ssh -i ~/.ssh/github_actions_deploy your_user@your_server_ip

# If successful, you should be logged into your server
# Exit the SSH session
exit
```

## ✅ Step 7: Verify GitHub Actions Workflow

The workflow is located at `.github/workflows/deploy-production.yml`

### What it does:
1. ✅ Triggers on push to `main` branch
2. ✅ Runs type checking and linting
3. ✅ Builds all applications (frontend + backend)
4. ✅ SSHs to your DigitalOcean server
5. ✅ Pulls latest code
6. ✅ Runs `./deploy.sh` script
7. ✅ Runs health checks
8. ✅ Verifies PM2 services are running

### Manual trigger:
You can also manually trigger deployment from GitHub:
**Actions** → **Deploy to Production** → **Run workflow**

## 🔄 Deployment Flow

```
Push to main
    ↓
GitHub Actions starts
    ↓
Build all apps locally (CI environment)
    ↓
SSH to DigitalOcean server
    ↓
Pull latest code
    ↓
Run ./deploy.sh
    ├── Install dependencies
    ├── Build applications
    ├── Run migrations
    ├── Restart PM2 services
    └── Reload nginx
    ↓
Health checks
    ↓
✅ Deployment complete
```

## 🏥 Health Checks

The workflow automatically checks:
- Dashboard API: `http://localhost:3000/health`
- Forms API: `http://localhost:3001/health`
- PM2 process status

## 📊 Monitoring Deployment

### View logs in GitHub:
1. Go to **Actions** tab in your repository
2. Click on the latest workflow run
3. View detailed logs for each step

### View logs on server:
```bash
# SSH to server
ssh your_user@your_server_ip

# View PM2 logs
pm2 logs

# View deployment logs
tail -f /var/log/nginx/*.log
```

## 🐛 Troubleshooting

### SSH Connection Fails

**Problem:** `Permission denied (publickey)`

**Solution:**
```bash
# Verify public key is in authorized_keys on server
ssh your_user@your_server_ip
cat ~/.ssh/authorized_keys | grep github-actions

# Verify private key is correct in GitHub secrets
# It should include BEGIN and END lines
```

### Deployment Script Fails

**Problem:** `deploy.sh: command not found`

**Solution:**
```bash
# SSH to server
cd /var/apps/NodeAngularFullStack
chmod +x deploy.sh
```

### PM2 Services Not Starting

**Problem:** Services fail to start after deployment

**Solution:**
```bash
# SSH to server
pm2 logs
pm2 restart ecosystem.config.js
pm2 save
```

### Database Migrations Fail

**Problem:** Migration errors during deployment

**Solution:**
```bash
# SSH to server
cd /var/apps/NodeAngularFullStack

# Run migrations manually
npm --workspace=apps/dashboard-api run db:migrate
npm --workspace=apps/forms-api run db:migrate
```

### Health Checks Fail

**Problem:** Health endpoints return errors

**Solution:**
```bash
# Check if services are running
pm2 status

# Check service logs
pm2 logs dashboard-api
pm2 logs forms-api

# Test health endpoints manually
curl http://localhost:3000/health
curl http://localhost:3001/health
```

## 🔒 Security Best Practices

1. **Never commit secrets** - Use GitHub Secrets for all sensitive data
2. **Use dedicated SSH key** - Don't reuse your personal SSH key
3. **Limit SSH key permissions** - Deploy key should only have deployment access
4. **Rotate keys regularly** - Generate new SSH keys every 6-12 months
5. **Monitor deployments** - Review GitHub Actions logs regularly
6. **Enable 2FA** - Use two-factor authentication on GitHub and DigitalOcean

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [DigitalOcean Deployment Guide](https://docs.digitalocean.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## ✨ Next Steps

After setup is complete:
1. Make a test commit to `main` branch
2. Watch GitHub Actions run automatically
3. Verify deployment on your server
4. Check that your application is accessible at https://legopdf.com

---

**Need help?** Check the [DEPLOYMENT.md](../DEPLOYMENT.md) for manual deployment instructions.
