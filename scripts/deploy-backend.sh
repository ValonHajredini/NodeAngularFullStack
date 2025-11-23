#!/bin/bash

###############################################################################
# Backend Deployment Script for Production
#
# This script is executed on the production server by GitLab CI/CD.
# It handles building, migrating, and reloading backend APIs with PM2.
#
# Usage: ./scripts/deploy-backend.sh /path/to/deployment/directory
#
# Prerequisites:
#   - Node.js 18+ installed on server
#   - PM2 installed globally (npm install -g pm2)
#   - PostgreSQL running and accessible
#   - Environment variables configured (.env files)
###############################################################################

set -e  # Exit on error

DEPLOY_PATH="${1:-/var/www/NodeAngularFullStack}"

echo "=================================================="
echo "Backend Deployment Script"
echo "=================================================="
echo "Deploy path: $DEPLOY_PATH"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "PM2 version: $(pm2 --version)"
echo "=================================================="

cd "$DEPLOY_PATH"

# ============================================
# Step 1: Install Dependencies
# ============================================
echo ""
echo "[1/6] Installing dependencies (including dev for builds)..."
# Force dev dependencies so TypeScript/ESLint/etc. are available for builds even if NODE_ENV=production.
npm ci --prefer-offline --no-audit --ignore-scripts --include=dev

# ============================================
# Step 2: Build Shared Package
# ============================================
echo ""
echo "[2/6] Building shared package..."
cd "$DEPLOY_PATH/packages/shared"
npm ci --prefer-offline --no-audit --ignore-scripts --include=dev
npm run build

# ============================================
# Step 3: Build Main API
# ============================================
echo ""
echo "[3/6] Building api..."
cd "$DEPLOY_PATH/apps/api"
npm ci --prefer-offline --no-audit --ignore-scripts --include=dev
npm run build

# ============================================
# Step 4: Build Forms API
# ============================================
echo ""
echo "[4/6] Building forms-api..."
cd "$DEPLOY_PATH/apps/forms-api"
npm ci --prefer-offline --no-audit --ignore-scripts --include=dev
npm run build

# ============================================
# Step 5: Run Database Migrations
# ============================================
echo ""
echo "[5/6] Running database migrations..."

# Main API migrations (auth, users)
cd "$DEPLOY_PATH/apps/api"
if [ -f "database/migrations" ]; then
  echo "Running api migrations..."
  npm run db:migrate || echo "Warning: api migrations failed or already applied"
fi

# Forms API migrations (forms, themes, exports)
cd "$DEPLOY_PATH/apps/forms-api"
if [ -f "database/migrations" ]; then
  echo "Running forms-api migrations..."
  npm run db:migrate || echo "Warning: forms-api migrations failed or already applied"
fi

# ============================================
# Step 6: Reload PM2 Processes
# ============================================
echo ""
echo "[6/6] Reloading PM2 processes..."
cd "$DEPLOY_PATH"

# Check if PM2 processes are already running
if pm2 list | grep -q "api\|forms-api"; then
  echo "PM2 processes found. Reloading..."
  pm2 reload ecosystem.config.js
else
  echo "PM2 processes not found. Starting..."
  pm2 start ecosystem.config.js
fi

# Save PM2 process list for auto-restart on server reboot
pm2 save

echo ""
echo "=================================================="
echo "✅ Backend deployment completed successfully!"
echo "=================================================="
echo ""
echo "Service status:"
pm2 list
echo ""
echo "To view logs:"
echo "  pm2 logs dashboard-api"
echo "  pm2 logs forms-api"
echo ""
echo "To monitor processes:"
echo "  pm2 monit"
echo ""
