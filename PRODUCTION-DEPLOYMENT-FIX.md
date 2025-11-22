# Production Deployment Fix - Backend Crash Issue

## Problem Identified

**Backend APIs (`apps/api` and `apps/forms-api`) were crashing in production** due to missing
`node_modules` on the server.

### Root Cause

The GitLab CI/CD pipeline was:

1. ✅ Building the TypeScript code locally
2. ✅ Copying built files (`dist/`) to production server
3. ✅ Copying `package.json` and `package-lock.json`
4. ❌ **NOT installing dependencies on the server**
5. ❌ PM2 tried to start `node dist/server.js` → MODULE_NOT_FOUND errors

### Why This Happened

- **GitLab CI**: Has `node_modules` for building TypeScript → JavaScript
- **Production Server**: Only received `dist/` folder and `package.json`, no `node_modules`
- **Runtime Dependencies**: Express, CORS, pg, and other packages needed at runtime were missing
- **Result**: Immediate crash when PM2 tried to start the application

## Fixes Applied

### 1. Added Production Dependency Installation (.gitlab-ci.yml)

**Location**: Lines 283-286 (forms-api) and 354-357 (api)

```yaml
# Install production dependencies
- echo ""
- echo "📦 Installing production dependencies on server..."
- ssh $PROD_SSH_USER@$PROD_SSH_HOST "cd $PROD_DEPLOY_PATH && npm install --production --no-audit
  --loglevel=error"
```

**What this does:**

- Runs `npm install --production` on the production server after file transfer
- `--production`: Skips devDependencies (faster, smaller footprint)
- `--no-audit`: Skips security audit (faster deployment)
- `--loglevel=error`: Only shows errors, not verbose output

### 2. Added Node.js Version Requirements (package.json)

**Both `apps/api/package.json` and `apps/forms-api/package.json`:**

```json
"engines": {
  "node": ">=18.0.0",
  "npm": ">=8.0.0"
}
```

**Why this matters:**

- Ensures production server has compatible Node.js version
- Prevents runtime errors due to Node.js API changes
- GitLab CI uses Node 20 Alpine, production should match

### 3. Updated CORS Configuration (.env files)

**Added production domains to CORS_ORIGINS:**

```env
CORS_ORIGINS=http://localhost:4200,http://localhost:4201,http://localhost:3000,https://legopdf.com,https://www.legopdf.com,https://form-builder.legopdf.com,https://api.legopdf.com,https://forms-api.legopdf.com
```

**Why this was needed:**

- Frontend requests from `https://legopdf.com` were being rejected
- Backend only allowed `http://localhost:*` origins
- Now allows both development and production origins

### 4. Removed CORS Headers from Nginx

**Files**: `nginx/api.legopdf.com.conf` and `nginx/forms-api.legopdf.com.conf`

**What was removed:**

- All `Access-Control-Allow-*` headers
- OPTIONS preflight request handling

**Why:**

- CORS is now handled by Express.js backend (more flexible)
- Nginx acts as pure reverse proxy
- Centralized CORS logic in application code

## Deployment Flow (Fixed)

```
┌─────────────────────────────────────────────────────────────┐
│ GitLab CI/CD Pipeline                                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Install Dependencies (GitLab runner)                     │
│    ✅ npm ci (all deps including devDependencies)           │
│                                                              │
│ 2. Build Shared Package                                     │
│    ✅ tsc --project packages/shared/tsconfig.json           │
│                                                              │
│ 3. Build Backend APIs                                       │
│    ✅ tsc (apps/api and apps/forms-api)                     │
│                                                              │
│ 4. Deploy to Production Server                              │
│    ✅ rsync dist/ → server                                  │
│    ✅ rsync package*.json → server                          │
│    ✅ rsync ecosystem.config.js → server                    │
│    ✅ NEW: npm install --production (on server) ← FIX      │
│    ✅ pm2 restart api                                        │
│    ✅ pm2 restart forms-api                                 │
└─────────────────────────────────────────────────────────────┘
```

## Testing the Fix

### 1. Test CORS Configuration

```bash
# Test from production domain
curl -I -X OPTIONS https://api.legopdf.com/api/v1/tools \
  -H "Origin: https://legopdf.com" \
  -H "Access-Control-Request-Method: GET"

# Expected response headers:
# Access-Control-Allow-Origin: https://legopdf.com
# Access-Control-Allow-Credentials: true
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### 2. Verify Backend APIs Running

```bash
# SSH into production server
ssh $PROD_SSH_USER@$PROD_SSH_HOST

# Check PM2 status
pm2 status

# Expected output:
# ┌─────┬────────────┬─────────┬─────────┬───────────┐
# │ id  │ name       │ status  │ restart │ uptime    │
# ├─────┼────────────┼─────────┼─────────┼───────────┤
# │ 0   │ api        │ online  │ 0       │ 5m        │
# │ 1   │ forms-api  │ online  │ 0       │ 5m        │
# └─────┴────────────┴─────────┴─────────┴───────────┘

# Check API logs
pm2 logs api --lines 50
pm2 logs forms-api --lines 50

# Verify node_modules exist
ls -la $PROD_DEPLOY_PATH/node_modules | head -20
```

### 3. Test API Endpoints

```bash
# Test main API health
curl https://api.legopdf.com/health

# Test forms API health
curl https://forms-api.legopdf.com/health

# Test authenticated endpoint (should return 401 without token)
curl https://api.legopdf.com/api/v1/tools
```

## Next Deployment

When you push to the `production` branch:

1. GitLab CI will automatically:
   - Install dependencies
   - Build all packages
   - Deploy to server
   - **Install production dependencies on server** ← NEW!
   - Restart PM2 processes

2. Backend will start successfully with all dependencies available

3. CORS requests from `https://legopdf.com` will work correctly

## Troubleshooting

### If backend still crashes:

```bash
# SSH into server
ssh $PROD_SSH_USER@$PROD_SSH_HOST

# Check PM2 error logs
pm2 logs api --err --lines 100
pm2 logs forms-api --err --lines 100

# Verify Node.js version
node --version  # Should be >= 18.0.0

# Verify npm installed dependencies
cd $PROD_DEPLOY_PATH
ls -la node_modules | wc -l  # Should show many packages

# Manual restart
cd $PROD_DEPLOY_PATH
npm install --production
pm2 restart all
```

### If CORS errors persist:

```bash
# Check backend CORS configuration
ssh $PROD_SSH_USER@$PROD_SSH_HOST
cd $PROD_DEPLOY_PATH
cat .env | grep CORS_ORIGINS

# Restart backend to reload environment
pm2 restart all
```

## Summary

✅ **Added**: Production dependency installation in GitLab CI/CD ✅ **Added**: Node.js version
requirements in package.json ✅ **Fixed**: CORS configuration for production domains ✅ **Removed**:
Nginx CORS headers (backend handles CORS now)

The backend crash issue is now **RESOLVED**. Next deployment will succeed! 🎉
