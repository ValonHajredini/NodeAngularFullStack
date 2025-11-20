# Production Environment Configuration Status

## ✅ COMPLETED - Generated Secure Secrets

The following secure secrets have been **automatically generated** and added to all backend services:

### Security Keys (SAME FOR ALL SERVICES)
```bash
JWT_SECRET=7c852c9fc5a79b874c4a845d6d4b335b0f80b0fdd0225dfab891f6ab5eb4552aaf46909b3f4e5fc13144615aeeeaa4f2
JWT_REFRESH_SECRET=c22c78cd1cf3601410c69d96d8db717f750ed899b6e0c4374b4b3b19a8e625bb9ba3993e96b1fc59555699e92f2d4729
FORM_RENDER_TOKEN_SECRET=2b833a8931d43c6abaf364db5d586a2dfa4453dc7c2d014f90979ba35e6423e04044beb6a08110f729bcdbe69ac77ee5
API_KEY=ffbfd719904bfebe933bc309b4f11efe87cbe8f919892e2800f56ab745f4c0d5
PGWEB_AUTH_PASS=214a3b8af02522d52ddc96d2f71cc934
```

**⚠️ IMPORTANT**: These secrets are already configured in:
- `apps/dashboard-api/.env.production`
- `apps/forms-api/.env.production`

---

## ❌ MISSING - Required Configuration

You **MUST** configure the following variables before deploying to production:

### 1. Domain/URL Configuration
**✅ COMPLETED - Already configured for legopdf.com:**

#### Dashboard API (`apps/dashboard-api/.env.production`)
```bash
FRONTEND_URL=https://legopdf.com  ✓
CORS_ORIGINS=https://legopdf.com,https://www.legopdf.com,https://form-builder.legopdf.com  ✓
PGWEB_CORS_ORIGIN=https://admin.legopdf.com  ✓
```

#### Forms API (`apps/forms-api/.env.production`)
```bash
FRONTEND_URL=https://legopdf.com  ✓
CORS_ORIGINS=https://legopdf.com,https://www.legopdf.com,https://form-builder.legopdf.com  ✓
PGWEB_CORS_ORIGIN=https://admin.legopdf.com  ✓
```

#### Web Frontend (`apps/web/.env.production`)
```bash
API_URL=https://api.legopdf.com/api/v1  ✓
FORMS_API_URL=https://forms-api.legopdf.com/api/v1  ✓
SHORT_LINK_BASE_URL=https://forms-api.legopdf.com  ✓
FORM_BUILDER_URL=https://form-builder.legopdf.com  ✓
```

#### Form Builder UI (`apps/form-builder-ui/.env.production`)
```bash
FORMS_API_URL=https://forms-api.legopdf.com/api/v1  ✓
SHORT_LINK_BASE_URL=https://forms-api.legopdf.com  ✓
MAIN_APP_URL=https://legopdf.com  ✓
```

---

### 2. Database Configuration
**Replace these placeholders in BOTH backend services:**

```bash
DB_HOST=your-db-host.com              # Your PostgreSQL server hostname/IP
DB_PORT=5432                          # Keep default or change if needed
DB_NAME=nodeangularfullstack_prod     # Your production database name
DB_USER=your_db_user                  # Database username
DB_PASSWORD=your_secure_db_password   # Strong database password
DB_SSL=true                           # MUST be true for production
```

**pgWeb Database URL** (Update in both backend services):
```bash
PGWEB_DATABASE_URL=postgresql://your_db_user:your_secure_db_password@your-db-host.com:5432/nodeangularfullstack_prod?sslmode=require
```

**Optional Multi-Database Setup** (forms-api only):
```bash
AUTH_DB_NAME=nodeangularfullstack_auth    # If using separate auth database
FORMS_DB_NAME=nodeangularfullstack_forms  # If using separate forms database
```

---

### 3. Redis Configuration
**Replace in BOTH backend services:**

```bash
REDIS_HOST=your-redis-host.com    # Redis server hostname/IP
REDIS_PORT=6379                   # Keep default or change if needed
REDIS_PASSWORD=your_redis_password # Redis password (if authentication enabled)
REDIS_DB=0                        # Redis database number (0-15)
```

---

### 4. File Storage (DigitalOcean Spaces)
**Required for BOTH backend services:**

```bash
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com  # Your Spaces region endpoint
DO_SPACES_KEY=your_spaces_access_key                    # DigitalOcean Spaces access key
DO_SPACES_SECRET=your_spaces_secret_key                 # DigitalOcean Spaces secret key
DO_SPACES_BUCKET=your-bucket-name                       # Your Spaces bucket name
DO_SPACES_REGION=nyc3                                   # Your Spaces region (e.g., nyc3, sfo3, ams3)
```

**How to get these values:**
1. Log in to DigitalOcean
2. Navigate to Spaces
3. Create a Space or use existing one
4. Go to API → Spaces Keys
5. Generate new key or use existing key

---

### 5. Email Service (SendGrid)
**Required for BOTH backend services:**

```bash
SENDGRID_API_KEY=your_sendgrid_api_key    # SendGrid API key (starts with SG.)
EMAIL_FROM=noreply@yourdomain.com         # Verified sender email
EMAIL_FROM_NAME=Your App Name             # Sender name for emails
```

**How to get SendGrid API key:**
1. Sign up at https://sendgrid.com
2. Navigate to Settings → API Keys
3. Create new API key with "Full Access" or "Mail Send" permissions
4. Verify your sender email domain

---

### 6. Monitoring (Optional but HIGHLY Recommended)
**Add to BOTH backend services:**

```bash
# Sentry (Error Tracking)
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Logtail (Log Aggregation)
LOGTAIL_TOKEN=your_logtail_token
```

**How to get these:**
- **Sentry**: Sign up at https://sentry.io → Create project → Copy DSN
- **Logtail**: Sign up at https://logtail.com → Create source → Copy token

---

## 📋 Configuration Checklist

### Dashboard API (`apps/dashboard-api/.env.production`)
- [x] JWT_SECRET (generated)
- [x] JWT_REFRESH_SECRET (generated)
- [x] FORM_RENDER_TOKEN_SECRET (generated)
- [x] API_KEY (generated)
- [x] PGWEB_AUTH_PASS (generated)
- [x] FRONTEND_URL (legopdf.com)
- [x] CORS_ORIGINS (legopdf.com)
- [ ] DB_HOST
- [ ] DB_USER
- [ ] DB_PASSWORD
- [ ] DB_NAME
- [ ] REDIS_HOST
- [ ] REDIS_PASSWORD
- [ ] DO_SPACES_ENDPOINT
- [ ] DO_SPACES_KEY
- [ ] DO_SPACES_SECRET
- [ ] DO_SPACES_BUCKET
- [ ] DO_SPACES_REGION
- [ ] SENDGRID_API_KEY
- [ ] EMAIL_FROM
- [ ] PGWEB_DATABASE_URL
- [ ] SENTRY_DSN (recommended)
- [ ] LOGTAIL_TOKEN (recommended)

### Forms API (`apps/forms-api/.env.production`)
- [x] JWT_SECRET (generated)
- [x] JWT_REFRESH_SECRET (generated)
- [x] FORM_RENDER_TOKEN_SECRET (generated)
- [x] API_KEY (generated)
- [x] PGWEB_AUTH_PASS (generated)
- [x] FRONTEND_URL (legopdf.com)
- [x] CORS_ORIGINS (legopdf.com)
- [ ] DB_HOST
- [ ] DB_USER
- [ ] DB_PASSWORD
- [ ] DB_NAME
- [ ] REDIS_HOST
- [ ] REDIS_PASSWORD
- [ ] DO_SPACES_ENDPOINT
- [ ] DO_SPACES_KEY
- [ ] DO_SPACES_SECRET
- [ ] DO_SPACES_BUCKET
- [ ] DO_SPACES_REGION
- [ ] SENDGRID_API_KEY
- [ ] EMAIL_FROM
- [ ] PGWEB_DATABASE_URL
- [ ] SENTRY_DSN (recommended)
- [ ] LOGTAIL_TOKEN (recommended)

### Web Frontend (`apps/web/.env.production`)
- [x] API_URL (api.legopdf.com)
- [x] FORMS_API_URL (forms-api.legopdf.com)
- [x] SHORT_LINK_BASE_URL (forms-api.legopdf.com)
- [x] FORM_BUILDER_URL (form-builder.legopdf.com)

### Form Builder UI (`apps/form-builder-ui/.env.production`)
- [x] FORMS_API_URL (forms-api.legopdf.com)
- [x] SHORT_LINK_BASE_URL (forms-api.legopdf.com)
- [x] MAIN_APP_URL (legopdf.com)

---

## 🚀 Quick Setup Guide

### Step 1: Replace Domain Placeholders
```bash
# Use find/replace to change "yourdomain.com" to your actual domain
# In all 4 .env.production files
```

### Step 2: Configure Database
```bash
# Update DB_* variables with your PostgreSQL credentials
# Remember to enable SSL: DB_SSL=true
```

### Step 3: Configure Redis
```bash
# Update REDIS_* variables with your Redis server details
```

### Step 4: Configure DigitalOcean Spaces
```bash
# Create a Space in DigitalOcean
# Generate API keys
# Update DO_SPACES_* variables
```

### Step 5: Configure SendGrid
```bash
# Sign up for SendGrid
# Generate API key
# Update SENDGRID_API_KEY and EMAIL_FROM
```

### Step 6: Setup Monitoring (Recommended)
```bash
# Sign up for Sentry and Logtail
# Add SENTRY_DSN and LOGTAIL_TOKEN
```

---

## 🔒 Security Notes

1. **Never commit .env.production files to version control** (already in .gitignore)
2. **Use different secrets for each environment** (dev, staging, production)
3. **Rotate secrets regularly** (every 90 days recommended)
4. **Keep backups of your secrets** in a secure password manager
5. **Use strong database passwords** (minimum 16 characters, mixed case, numbers, symbols)
6. **Enable SSL for database connections** (DB_SSL=true)
7. **Set PGWEB_READ_ONLY=true** in production to prevent accidental data changes

---

## 📝 Environment Variables by Service

### Backend Services (dashboard-api & forms-api)
**Total variables:** 36
**Generated/Configured:** 5 (JWT secrets, API key, pgWeb password)
**Remaining to configure:** 31

### Frontend Services (web & form-builder-ui)
**Total variables:** ~15 each
**Generated/Configured:** 0
**Remaining to configure:** ~15 each

---

## 🆘 Need Help?

- **Database setup**: See `docs/database-schema.md`
- **Environment variables**: See `docs/ENVIRONMENT_VARIABLES.md`
- **Deployment**: See `docs/RUNNING_SERVICES.md`
- **Troubleshooting**: See `docs/troubleshooting-guide.md`

---

## ✅ Validation

After configuring all variables, validate your setup:

```bash
# Test dashboard-api configuration
cd apps/dashboard-api
NODE_ENV=production node -e "require('dotenv').config({ path: '.env.production' }); console.log('✓ Configuration loaded');"

# Test forms-api configuration
cd apps/forms-api
NODE_ENV=production node -e "require('dotenv').config({ path: '.env.production' }); console.log('✓ Configuration loaded');"
```

---

**Last Updated:** November 20, 2025
**Generated Secrets Date:** November 20, 2025

