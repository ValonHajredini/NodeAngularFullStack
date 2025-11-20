# LegoPDF Production Configuration Status

**Last Updated:** November 20, 2025  
**Domain:** legopdf.com

---

## ✅ COMPLETED CONFIGURATION

### 🔐 Security Secrets (Generated & Configured)
All cryptographically secure secrets have been generated and added to backend services:

```
✓ JWT_SECRET (96 characters)
✓ JWT_REFRESH_SECRET (96 characters)
✓ FORM_RENDER_TOKEN_SECRET (96 characters)
✓ API_KEY (64 characters)
✓ PGWEB_AUTH_PASS (32 characters)
```

### 🌐 Domain Configuration (Completed)
All domain URLs have been configured across all 4 services:

| Service | Domain | Status |
|---------|--------|--------|
| Main Web App | https://legopdf.com | ✓ Configured |
| Dashboard API | https://api.legopdf.com | ✓ Configured |
| Forms API | https://forms-api.legopdf.com | ✓ Configured |
| Form Builder UI | https://form-builder.legopdf.com | ✓ Configured |
| Admin Panel (pgWeb) | https://admin.legopdf.com | ✓ Configured |

### 📧 Email Configuration (Partially Completed)
```
✓ EMAIL_FROM=noreply@legopdf.com
✓ EMAIL_FROM_NAME=LegoPDF
✗ SENDGRID_API_KEY (needs API key from SendGrid)
```

### 📱 Application Name
```
✓ APP_NAME=LegoPDF (all services)
```

---

## ❌ MISSING CONFIGURATION

### 🗄️ Database Credentials (PostgreSQL)
**Required for:** dashboard-api, forms-api

```bash
DB_HOST=your-db-host.com              # PostgreSQL server hostname/IP
DB_PORT=5432                          # PostgreSQL port
DB_NAME=nodeangularfullstack_prod     # Production database name
DB_USER=your_db_user                  # Database username
DB_PASSWORD=your_secure_db_password   # Strong database password (16+ chars)
DB_SSL=true                           # MUST be true for production

# pgWeb connection string (update with real credentials):
PGWEB_DATABASE_URL=postgresql://user:pass@host:5432/nodeangularfullstack_prod?sslmode=require
```

**How to get:**
1. Create PostgreSQL database on your server or cloud provider
2. Create database user with full permissions
3. Note down hostname, username, password
4. Ensure SSL/TLS is enabled

---

### 💾 Redis Configuration
**Required for:** dashboard-api, forms-api

```bash
REDIS_HOST=your-redis-host.com    # Redis server hostname/IP
REDIS_PORT=6379                   # Redis port
REDIS_PASSWORD=your_redis_password # Redis password (if auth enabled)
REDIS_DB=0                        # Redis database number
```

**How to get:**
1. Install Redis on your server or use cloud provider (e.g., DigitalOcean, AWS ElastiCache)
2. Enable authentication and set strong password
3. Note down hostname and password

---

### 📁 File Storage (DigitalOcean Spaces)
**Required for:** dashboard-api, forms-api

```bash
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com  # Your region endpoint
DO_SPACES_KEY=your_spaces_access_key                    # Access key
DO_SPACES_SECRET=your_spaces_secret_key                 # Secret key
DO_SPACES_BUCKET=legopdf-storage                        # Bucket name
DO_SPACES_REGION=nyc3                                   # Region (nyc3, sfo3, etc.)
```

**How to get:**
1. Sign up for DigitalOcean: https://www.digitalocean.com
2. Navigate to "Spaces" → "Create Space"
3. Choose region (recommend: nyc3 or closest to your server)
4. Create Space with name like "legopdf-storage"
5. Go to API → Spaces Keys → Generate New Key
6. Copy Access Key and Secret Key

**Regions available:**
- `nyc3` - New York 3
- `sfo3` - San Francisco 3
- `ams3` - Amsterdam 3
- `sgp1` - Singapore 1
- `fra1` - Frankfurt 1

---

### 📧 Email Service (SendGrid)
**Required for:** dashboard-api, forms-api

```bash
SENDGRID_API_KEY=your_sendgrid_api_key   # SendGrid API key (starts with SG.)
```

**How to get:**
1. Sign up for SendGrid: https://sendgrid.com
2. Navigate to Settings → API Keys
3. Create API Key with "Mail Send" permission
4. Copy the API key (starts with `SG.`)
5. **IMPORTANT:** Verify sender domain (noreply@legopdf.com)
   - Settings → Sender Authentication → Verify Domain
   - Add DNS records provided by SendGrid

**SendGrid Plans:**
- Free: 100 emails/day
- Essentials: $19.95/mo - 50,000 emails/month
- Pro: $89.95/mo - 100,000 emails/month

---

### 📊 Monitoring (Optional but Recommended)
**Recommended for:** dashboard-api, forms-api

#### Sentry (Error Tracking)
```bash
SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

**How to get:**
1. Sign up: https://sentry.io
2. Create new project (Node.js/Express)
3. Copy DSN from project settings

#### Logtail (Log Aggregation)
```bash
LOGTAIL_TOKEN=your_logtail_token
```

**How to get:**
1. Sign up: https://logtail.com
2. Create new source
3. Copy source token

---

## 📊 Configuration Progress

### Dashboard API (`apps/dashboard-api/.env.production`)
**Progress:** 10/36 variables configured (28%)

#### Completed:
- ✓ JWT_SECRET
- ✓ JWT_REFRESH_SECRET
- ✓ FORM_RENDER_TOKEN_SECRET
- ✓ API_KEY
- ✓ PGWEB_AUTH_PASS
- ✓ FRONTEND_URL
- ✓ CORS_ORIGINS
- ✓ PGWEB_CORS_ORIGIN
- ✓ EMAIL_FROM
- ✓ EMAIL_FROM_NAME

#### Missing:
- ❌ DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, PGWEB_DATABASE_URL
- ❌ REDIS_HOST, REDIS_PASSWORD
- ❌ DO_SPACES_* (5 variables)
- ❌ SENDGRID_API_KEY
- ❌ SENTRY_DSN, LOGTAIL_TOKEN (optional)

---

### Forms API (`apps/forms-api/.env.production`)
**Progress:** 10/38 variables configured (26%)

#### Completed:
- ✓ JWT_SECRET
- ✓ JWT_REFRESH_SECRET
- ✓ FORM_RENDER_TOKEN_SECRET
- ✓ API_KEY
- ✓ PGWEB_AUTH_PASS
- ✓ FRONTEND_URL
- ✓ CORS_ORIGINS
- ✓ PGWEB_CORS_ORIGIN
- ✓ EMAIL_FROM
- ✓ EMAIL_FROM_NAME

#### Missing:
- ❌ DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, PGWEB_DATABASE_URL
- ❌ AUTH_DB_NAME, FORMS_DB_NAME (if using multi-database setup)
- ❌ REDIS_HOST, REDIS_PASSWORD
- ❌ DO_SPACES_* (5 variables)
- ❌ SENDGRID_API_KEY
- ❌ SENTRY_DSN, LOGTAIL_TOKEN (optional)

---

### Web Frontend (`apps/web/.env.production`)
**Progress:** 5/5 variables configured (100%) ✓

#### Completed:
- ✓ API_URL
- ✓ FORMS_API_URL
- ✓ SHORT_LINK_BASE_URL
- ✓ FORM_BUILDER_URL
- ✓ APP_NAME

---

### Form Builder UI (`apps/form-builder-ui/.env.production`)
**Progress:** 4/4 variables configured (100%) ✓

#### Completed:
- ✓ FORMS_API_URL
- ✓ SHORT_LINK_BASE_URL
- ✓ MAIN_APP_URL
- ✓ APP_NAME

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   legopdf.com (443)                         │
│              Main Web Application (Angular)                 │
│                    Port 4200 → 443                          │
└─────────────┬───────────────────────────────────────────────┘
              │
              ├─► api.legopdf.com (443)
              │   Dashboard/Auth API (Express)
              │   Port 3000 → 443
              │   • JWT authentication
              │   • User management
              │   • Dashboard endpoints
              │
              ├─► forms-api.legopdf.com (443)
              │   Forms/Themes API (Express)
              │   Port 3001 → 443
              │   • Form CRUD operations
              │   • Theme management
              │   • Short links & QR codes
              │   • Export orchestration
              │
              ├─► form-builder.legopdf.com (443)
              │   Form Builder UI (Angular)
              │   Port 4201 → 443
              │   • Visual form designer
              │   • Theme designer
              │   • Analytics dashboard
              │
              └─► admin.legopdf.com (443)
                  pgWeb Database UI
                  Port 8080 → 443
                  • Database management
                  • Read-only mode (recommended)
```

---

## 📝 DNS Configuration Required

Configure these DNS A records in your domain registrar:

| Subdomain | Type | Value |
|-----------|------|-------|
| @ (root) | A | YOUR_SERVER_IP |
| www | A | YOUR_SERVER_IP |
| api | A | YOUR_SERVER_IP |
| forms-api | A | YOUR_SERVER_IP |
| form-builder | A | YOUR_SERVER_IP |
| admin | A | YOUR_SERVER_IP |

**Example with IP 123.45.67.89:**
```
legopdf.com              A    123.45.67.89
www.legopdf.com          A    123.45.67.89
api.legopdf.com          A    123.45.67.89
forms-api.legopdf.com    A    123.45.67.89
form-builder.legopdf.com A    123.45.67.89
admin.legopdf.com        A    123.45.67.89
```

---

## 🔒 SSL Certificate Setup

Use Let's Encrypt (certbot) to generate free SSL certificates:

```bash
# Install certbot (Ubuntu/Debian)
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Generate certificates for all domains
sudo certbot certonly --nginx \
  -d legopdf.com \
  -d www.legopdf.com \
  -d api.legopdf.com \
  -d forms-api.legopdf.com \
  -d form-builder.legopdf.com \
  -d admin.legopdf.com

# Auto-renewal (certbot sets this up automatically)
sudo certbot renew --dry-run
```

---

## 🔧 Nginx Reverse Proxy Configuration

Example Nginx configuration for legopdf.com:

```nginx
# Main Web App (legopdf.com)
server {
    listen 443 ssl http2;
    server_name legopdf.com www.legopdf.com;
    
    ssl_certificate /etc/letsencrypt/live/legopdf.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/legopdf.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:4200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Dashboard API (api.legopdf.com)
server {
    listen 443 ssl http2;
    server_name api.legopdf.com;
    
    ssl_certificate /etc/letsencrypt/live/legopdf.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/legopdf.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Forms API (forms-api.legopdf.com)
server {
    listen 443 ssl http2;
    server_name forms-api.legopdf.com;
    
    ssl_certificate /etc/letsencrypt/live/legopdf.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/legopdf.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Form Builder UI (form-builder.legopdf.com)
server {
    listen 443 ssl http2;
    server_name form-builder.legopdf.com;
    
    ssl_certificate /etc/letsencrypt/live/legopdf.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/legopdf.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:4201;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ✅ Next Steps

1. **✓ Domain Configuration** - COMPLETED
2. **✓ Security Secrets** - COMPLETED
3. **□ Database Setup** - Configure PostgreSQL and add credentials
4. **□ Redis Setup** - Configure Redis and add credentials
5. **□ DigitalOcean Spaces** - Create Space and add credentials
6. **□ SendGrid Setup** - Create account, verify domain, add API key
7. **□ DNS Configuration** - Add A records for all subdomains
8. **□ SSL Certificates** - Generate Let's Encrypt certificates
9. **□ Nginx Configuration** - Setup reverse proxy
10. **□ Deploy Applications** - Build and deploy all services
11. **□ Test Endpoints** - Verify all services are accessible
12. **□ Monitoring Setup** - Configure Sentry & Logtail (optional)

---

## 📞 Configuration Files

- Dashboard API: `/var/apps/NodeAngularFullStack/apps/dashboard-api/.env.production`
- Forms API: `/var/apps/NodeAngularFullStack/apps/forms-api/.env.production`
- Web Frontend: `/var/apps/NodeAngularFullStack/apps/web/.env.production`
- Form Builder UI: `/var/apps/NodeAngularFullStack/apps/form-builder-ui/.env.production`

---

## 🔐 Security Reminders

- ✓ All .env.production files are in .gitignore
- ✓ Secrets are cryptographically secure random strings
- ⚠️ Store secrets in a password manager (1Password, LastPass, Bitwarden)
- ⚠️ Never commit secrets to version control
- ⚠️ Use different secrets for dev/staging/production
- ⚠️ Rotate secrets every 90 days
- ⚠️ Enable DB_SSL=true for production database connections
- ⚠️ Set PGWEB_READ_ONLY=true in production

---

**For detailed environment variable documentation, see:**
- `PRODUCTION_ENV_SETUP.md` - General production setup guide
- `docs/ENVIRONMENT_VARIABLES.md` - Complete environment variables reference
