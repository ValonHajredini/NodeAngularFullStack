# CI/CD Setup Guide

This guide explains how to set up the CI/CD pipeline for automated Docker builds and deployment to
Digital Ocean.

## Overview

The CI/CD pipeline automatically:

1. ✅ Builds Docker images for `apps/web` and `apps/form-builder-ui`
2. ✅ Pushes images to GitHub Container Registry (ghcr.io)
3. ✅ Deploys to Digital Ocean droplet on push to `main` branch
4. ✅ Validates builds on pull requests

## Prerequisites

- GitHub repository with Actions enabled
- Digital Ocean droplet with Docker and Docker Compose installed
- SSH access to the droplet
- Repository cloned at `/var/apps/NodeAngularFullStack` on the droplet

## Required GitHub Secrets

Navigate to your repository → **Settings** → **Secrets and variables** → **Actions** → **New
repository secret**

Add the following secrets:

### 1. `DO_HOST`

**Description**: Your Digital Ocean droplet IP address or hostname **Value**: `165.232.100.56`
**Required**: Yes

### 2. `DO_USERNAME`

**Description**: SSH username for the droplet (usually `root` or your user) **Value**: Your SSH
username (e.g., `root` or `deployer`) **Required**: Yes

### 3. `DO_SSH_KEY`

**Description**: Private SSH key for authentication **Required**: Yes

**How to get this value:**

```bash
# On your local machine, generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/do_deploy_key

# Copy the PRIVATE key content (entire file including BEGIN/END lines)
cat ~/.ssh/do_deploy_key

# Copy the PUBLIC key to your Digital Ocean droplet
ssh-copy-id -i ~/.ssh/do_deploy_key.pub your-username@165.232.100.56

# Or manually add to ~/.ssh/authorized_keys on the droplet
```

**Paste the entire private key content** into the GitHub secret, including:

```
-----BEGIN OPENSSH PRIVATE KEY-----
...key content...
-----END OPENSSH PRIVATE KEY-----
```

### 4. `DO_PORT` (Optional)

**Description**: SSH port (defaults to 22 if not set) **Value**: `22` or your custom SSH port
**Required**: No (defaults to 22)

### 5. `GITHUB_TOKEN`

**Description**: Automatically provided by GitHub Actions **Required**: No (already available in
workflows)

## Digital Ocean Droplet Setup

### 1. Install Docker and Docker Compose

```bash
# SSH into your droplet
ssh root@165.232.100.56

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose (v2)
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Verify installations
docker --version
docker compose version
```

### 2. Clone Repository

```bash
# Create deployment directory
mkdir -p /var/apps
cd /var/apps

# Clone repository
git clone https://github.com/ValonHajredini/NodeAngularFullStack.git
cd NodeAngularFullStack

# Set up environment
echo "GITHUB_REPOSITORY=ValonHajredini/NodeAngularFullStack" > .env.production
```

### 3. Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS, and app ports
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 4200/tcp  # Web app
ufw allow 4201/tcp  # Form builder

# Enable firewall
ufw enable
```

### 4. Set Up Nginx Reverse Proxy (Optional but Recommended)

```bash
# Install Nginx
apt update && apt install nginx -y

# Create configuration for web app
cat > /etc/nginx/sites-available/nodeangularfullstack << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name form-builder.your-domain.com;

    location / {
        proxy_pass http://localhost:4201;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/nodeangularfullstack /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## Testing the Pipeline

### 1. Test Docker Builds Locally

```bash
# Build web app
docker build -f apps/web/Dockerfile -t test-web .

# Build form-builder-ui
docker build -f apps/form-builder-ui/Dockerfile -t test-form-builder .

# Verify images
docker images | grep test-
```

### 2. Test Deployment Script

```bash
# On Digital Ocean droplet
cd /var/apps/NodeAngularFullStack

# Pull latest code
git pull origin main

# Start services
GITHUB_REPOSITORY=ValonHajredini/NodeAngularFullStack docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 3. Trigger GitHub Actions

```bash
# Make a change and push to main
git add .
git commit -m "test: Trigger CI/CD pipeline"
git push origin main

# Or create a pull request to test builds without deployment
```

## Workflow Triggers

### Automatic Triggers

- **Push to `main`**: Full build, push, and deploy
- **Push to `develop`**: Build and push only (no deployment)
- **Pull Requests**: Build validation only

### Manual Trigger

Navigate to **Actions** tab → Select **CI/CD - Docker Build & Deploy** → **Run workflow**

## Monitoring

### View GitHub Actions Logs

1. Go to repository → **Actions** tab
2. Click on the latest workflow run
3. Expand job steps to see detailed logs

### View Container Logs on Droplet

```bash
# SSH into droplet
ssh root@165.232.100.56

# View all containers
docker ps

# View web app logs
docker logs nodeangularfullstack-web -f

# View form-builder logs
docker logs nodeangularfullstack-form-builder -f

# View docker-compose logs
cd /var/apps/NodeAngularFullStack
docker compose -f docker-compose.prod.yml logs -f
```

### Health Checks

```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"

# Test web app
curl http://localhost:4200

# Test form-builder
curl http://localhost:4201
```

## Troubleshooting

### Build Failures

**Issue**: Docker build fails with "ENOENT" or missing files

**Solution**: Ensure all files are committed and pushed to GitHub

```bash
git status
git add .
git commit -m "fix: Add missing files"
git push origin main
```

### Deployment Failures

**Issue**: SSH connection fails

**Solutions**:

1. Verify `DO_HOST` and `DO_USERNAME` secrets are correct
2. Check SSH key is properly formatted (including BEGIN/END lines)
3. Ensure public key is in `~/.ssh/authorized_keys` on droplet

**Issue**: Docker login fails on droplet

**Solution**: Ensure `GITHUB_TOKEN` has package read permissions

**Issue**: Containers fail to start

**Solutions**:

1. Check logs: `docker compose -f docker-compose.prod.yml logs`
2. Verify ports are not in use: `lsof -i :4200` and `lsof -i :4201`
3. Check disk space: `df -h`

### Image Pull Failures

**Issue**: Cannot pull images from ghcr.io

**Solution**: Make repository packages public or add GitHub token

```bash
# On droplet, login to GHCR
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

## Security Best Practices

1. ✅ **Use SSH Keys**: Never use passwords for SSH authentication
2. ✅ **Rotate Keys**: Regularly rotate SSH keys and update secrets
3. ✅ **Restrict SSH**: Use firewall rules to limit SSH access
4. ✅ **HTTPS Only**: Set up SSL certificates (use Certbot)
5. ✅ **Least Privilege**: Create dedicated deploy user instead of using root
6. ✅ **Secrets**: Never commit secrets to repository

## Automatic Updates (Optional)

Enable Watchtower for automatic container updates:

```bash
cd /var/apps/NodeAngularFullStack
docker compose -f docker-compose.prod.yml --profile watchtower up -d
```

Watchtower will automatically pull and deploy new images every 5 minutes.

## Rollback

If deployment fails, rollback to previous version:

```bash
# SSH into droplet
ssh root@165.232.100.56
cd /var/apps/NodeAngularFullStack

# Checkout previous commit
git log --oneline -10
git checkout <previous-commit-hash>

# Restart containers
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

## Support

For issues or questions:

- Check workflow logs in GitHub Actions
- Review container logs on droplet
- Open an issue in the repository

## Next Steps

- [ ] Set up SSL certificates with Certbot
- [ ] Configure domain names
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure log aggregation
- [ ] Set up automated backups
- [ ] Add staging environment

---

**Last Updated**: 2025-11-21 **Pipeline Status**: ✅ Ready for deployment
