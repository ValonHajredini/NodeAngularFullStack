# Nginx Configuration Files for legopdf.com

Production-ready nginx configurations for the NodeAngularFullStack application deployed across
multiple subdomains.

## 📋 Server Architecture

```
┌─────────────────────────────────────────────────┐
│           legopdf.com (Main Domain)             │
│  ┌───────────────────────────────────────────┐  │
│  │  web.legopdf.com                          │  │
│  │  Main Angular UI (apps/web)               │  │
│  │  Static files from dist/web               │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│       api.legopdf.com (Dashboard API)           │
│  ┌───────────────────────────────────────────┐  │
│  │  Node.js Express API (Port 3000)          │  │
│  │  Authentication, Users, Dashboard         │  │
│  │  apps/dashboard-api                       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  form-builder.legopdf.com (Form Builder UI)     │
│  ┌───────────────────────────────────────────┐  │
│  │  Angular Form Builder (apps/form-builder-ui)│
│  │  Static files from dist/form-builder-ui  │  │
│  │  + Proxy to forms-api for public forms   │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│     forms-api.legopdf.com (Forms API)           │
│  ┌───────────────────────────────────────────┐  │
│  │  Node.js Express API (Port 3001)          │  │
│  │  Forms, Themes, Tool Registry, Exports    │  │
│  │  apps/forms-api                           │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## 📁 Configuration Files

| File                            | Subdomain                        | Type           | Port/Path                                                                          |
| ------------------------------- | -------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `web.legopdf.com.conf`          | `legopdf.com`, `www.legopdf.com` | Angular Static | `/var/apps/NodeAngularFullStack/apps/web/dist/web/browser`                         |
| `api.legopdf.com.conf`          | `api.legopdf.com`                | Node.js Proxy  | `localhost:3000`                                                                   |
| `form-builder.legopdf.com.conf` | `form-builder.legopdf.com`       | Angular Static | `/var/apps/NodeAngularFullStack/apps/form-builder-ui/dist/form-builder-ui/browser` |
| `forms-api.legopdf.com.conf`    | `forms-api.legopdf.com`          | Node.js Proxy  | `localhost:3001`                                                                   |

## 🚀 Deployment Instructions

### Step 1: Copy Configuration Files to Server

```bash
# On your local machine
scp nginx/*.conf user@your-server:/tmp/

# On the server
sudo mv /tmp/*.conf /etc/nginx/sites-available/
```

### Step 2: Create Symbolic Links

```bash
# Enable sites by creating symlinks
sudo ln -s /etc/nginx/sites-available/web.legopdf.com.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.legopdf.com.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/form-builder.legopdf.com.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/forms-api.legopdf.com.conf /etc/nginx/sites-enabled/
```

### Step 3: Test Nginx Configuration

```bash
# Test configuration syntax
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### Step 4: Configure SSL Certificates with Certbot

**IMPORTANT**: Uncomment the SSL certificate paths in each config file after running certbot.

```bash
# Install certbot (if not already installed)
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate certificates for all subdomains
sudo certbot --nginx -d legopdf.com -d www.legopdf.com
sudo certbot --nginx -d api.legopdf.com
sudo certbot --nginx -d form-builder.legopdf.com
sudo certbot --nginx -d forms-api.legopdf.com

# Certbot will automatically:
# 1. Generate SSL certificates
# 2. Update nginx configs
# 3. Set up auto-renewal
```

### Step 5: Verify Auto-Renewal

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

## 🔧 DNS Configuration Required

Configure the following DNS records with your DNS provider:

```
Type    Name              Value                  TTL
─────────────────────────────────────────────────────
A       legopdf.com       YOUR_SERVER_IP         3600
A       www               YOUR_SERVER_IP         3600
A       api               YOUR_SERVER_IP         3600
A       form-builder      YOUR_SERVER_IP         3600
A       forms-api         YOUR_SERVER_IP         3600
```

## 📦 Application Deployment

### Build Applications

```bash
# On your local machine (or CI/CD pipeline)
cd /path/to/NodeAngularFullStack

# Build frontend applications
npm --workspace=apps/web run build
npm --workspace=apps/form-builder-ui run build

# Build backend applications
npm --workspace=apps/dashboard-api run build
npm --workspace=apps/forms-api run build
```

### Deploy to Server

```bash
# Copy built files to server (Angular 17+ uses /browser subdirectory)
rsync -avz --delete apps/web/dist/web/browser/ user@your-server:/var/apps/NodeAngularFullStack/apps/web/dist/web/browser/
rsync -avz --delete apps/form-builder-ui/dist/form-builder-ui/browser/ user@your-server:/var/apps/NodeAngularFullStack/apps/form-builder-ui/dist/form-builder-ui/browser/

# Copy backend code
rsync -avz --delete apps/dashboard-api/ user@your-server:/var/apps/NodeAngularFullStack/apps/dashboard-api/
rsync -avz --delete apps/forms-api/ user@your-server:/var/apps/NodeAngularFullStack/apps/forms-api/

# Copy shared packages
rsync -avz --delete packages/ user@your-server:/var/apps/NodeAngularFullStack/packages/
```

## 🔄 Process Management with PM2

### Using Ecosystem Configuration (Recommended)

The project includes `ecosystem.config.js` for centralized PM2 management:

```bash
# Install PM2 globally on server
npm install -g pm2

# Start all backend services using ecosystem file
cd /var/apps/NodeAngularFullStack
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Manual Service Management

If you prefer to manage services individually:

```bash
# Start backend services manually
cd /var/apps/NodeAngularFullStack/apps/dashboard-api
pm2 start npm --name "dashboard-api" -- start

cd /var/apps/NodeAngularFullStack/apps/forms-api
pm2 start npm --name "forms-api" -- start

# Save PM2 process list
pm2 save
```

See [DEPLOYMENT.md](../DEPLOYMENT.md#-pm2-process-management) for complete PM2 documentation.

## 🔒 Security Checklist

- [x] HTTPS/SSL enabled via Let's Encrypt
- [x] HTTP to HTTPS redirect configured
- [x] Security headers configured (HSTS, CSP, X-Frame-Options, etc.)
- [x] CORS properly configured for cross-origin requests
- [x] Rate limiting handled by backend applications
- [x] File upload size limits configured
- [x] WebSocket support enabled for real-time features
- [ ] Firewall configured (UFW or iptables)
- [ ] Fail2ban configured for brute force protection
- [ ] Database access restricted to localhost only
- [ ] Regular security updates scheduled

## 📊 Monitoring and Logs

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/web.legopdf.com.access.log
sudo tail -f /var/log/nginx/api.legopdf.com.access.log
sudo tail -f /var/log/nginx/form-builder.legopdf.com.access.log
sudo tail -f /var/log/nginx/forms-api.legopdf.com.access.log

# Error logs
sudo tail -f /var/log/nginx/*.error.log
```

### PM2 Logs

```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs dashboard-api
pm2 logs forms-api

# Monitor processes
pm2 monit
```

## 🔧 Troubleshooting

### Issue: 502 Bad Gateway

**Cause**: Backend service is not running or not accessible.

**Solution**:

```bash
# Check if services are running
pm2 status

# Restart services
pm2 restart dashboard-api
pm2 restart forms-api

# Check service logs
pm2 logs
```

### Issue: 404 Not Found on Angular Routes

**Cause**: Nginx not configured for SPA routing.

**Solution**: Already handled with `try_files $uri $uri/ /index.html;` in configs.

### Issue: CORS Errors

**Cause**: CORS headers not properly configured.

**Solution**:

- Check that backend APIs are running with CORS enabled
- Verify that frontend URLs match the allowed origins in backend configuration
- Check nginx CORS headers in the config files

### Issue: WebSocket Connection Failed

**Cause**: Proxy not configured for WebSocket upgrade.

**Solution**: Already handled with:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

## 📝 Environment Variables

Create `.env.production` files for each backend service:

**apps/dashboard-api/.env.production**:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/nodeangularfullstack
FRONTEND_URL=https://legopdf.com
JWT_SECRET=your-secret-key
CORS_ORIGINS=https://legopdf.com,https://form-builder.legopdf.com
```

**apps/forms-api/.env.production**:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/nodeangularfullstack
FRONTEND_URL=https://form-builder.legopdf.com
JWT_SECRET=your-secret-key
CORS_ORIGINS=https://legopdf.com,https://form-builder.legopdf.com
```

## 🎯 Health Checks

All services expose `/health` endpoints:

```bash
# Check frontend health
curl https://legopdf.com/health
curl https://form-builder.legopdf.com/health

# Check backend health
curl https://api.legopdf.com/health
curl https://forms-api.legopdf.com/health
```

## 📚 Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Created**: November 2024 **Author**: NodeAngularFullStack Team **Version**: 1.0.0
