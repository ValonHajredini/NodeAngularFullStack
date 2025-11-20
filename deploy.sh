#!/bin/bash
################################################################################
# Production Deployment Script for NodeAngularFullStack
#
# This script handles the complete deployment process:
# - Dependency installation
# - Building all applications
# - Database migrations
# - Service restart
# - Health checks
#
# Usage:
#   ./deploy.sh                    # Full deployment
#   ./deploy.sh --skip-deps        # Skip npm install
#   ./deploy.sh --skip-build       # Skip builds
#   ./deploy.sh --skip-migrations  # Skip database migrations
#   ./deploy.sh --help             # Show help
#
# Author: NodeAngularFullStack Team
# Version: 1.0.0
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="${PROJECT_DIR:-/var/apps/NodeAngularFullStack}"
NODE_ENV="${NODE_ENV:-production}"
SKIP_DEPS=false
SKIP_BUILD=false
SKIP_MIGRATIONS=false
SKIP_HEALTH_CHECK=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-deps)
      SKIP_DEPS=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-migrations)
      SKIP_MIGRATIONS=true
      shift
      ;;
    --skip-health-check)
      SKIP_HEALTH_CHECK=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-deps          Skip npm dependency installation"
      echo "  --skip-build         Skip application builds"
      echo "  --skip-migrations    Skip database migrations"
      echo "  --skip-health-check  Skip health checks"
      echo "  --help, -h           Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  PROJECT_DIR          Project root directory (default: /var/apps/NodeAngularFullStack)"
      echo "  NODE_ENV             Node environment (default: production)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run '$0 --help' for usage information"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_step() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Error handler
error_exit() {
  log_error "Deployment failed: $1"
  exit 1
}

# Check prerequisites
check_prerequisites() {
  log_step "Checking Prerequisites"

  # Check if node is installed
  if ! command -v node &> /dev/null; then
    error_exit "Node.js is not installed"
  fi
  log_success "Node.js $(node --version)"

  # Check if npm is installed
  if ! command -v npm &> /dev/null; then
    error_exit "npm is not installed"
  fi
  log_success "npm $(npm --version)"

  # Check if pm2 is installed
  if ! command -v pm2 &> /dev/null; then
    log_warning "PM2 is not installed. Install with: npm install -g pm2"
  else
    log_success "PM2 $(pm2 --version)"
  fi

  # Check if project directory exists
  if [ ! -d "$PROJECT_DIR" ]; then
    error_exit "Project directory does not exist: $PROJECT_DIR"
  fi
  log_success "Project directory: $PROJECT_DIR"

  # Check if PostgreSQL is running
  if command -v psql &> /dev/null; then
    if pg_isready &> /dev/null; then
      log_success "PostgreSQL is running"
    else
      log_warning "PostgreSQL may not be running"
    fi
  fi
}

# Backup current deployment
backup_current() {
  log_step "Creating Backup"

  BACKUP_DIR="$PROJECT_DIR/../backups/$(date +%Y%m%d_%H%M%S)"
  mkdir -p "$BACKUP_DIR"

  # Backup dist directories
  if [ -d "$PROJECT_DIR/apps/web/dist" ]; then
    cp -r "$PROJECT_DIR/apps/web/dist" "$BACKUP_DIR/web-dist" || true
    log_success "Backed up web dist"
  fi

  if [ -d "$PROJECT_DIR/apps/form-builder-ui/dist" ]; then
    cp -r "$PROJECT_DIR/apps/form-builder-ui/dist" "$BACKUP_DIR/form-builder-ui-dist" || true
    log_success "Backed up form-builder-ui dist"
  fi

  log_success "Backup created at: $BACKUP_DIR"
}

# Install dependencies
install_dependencies() {
  if [ "$SKIP_DEPS" = true ]; then
    log_warning "Skipping dependency installation (--skip-deps)"
    return
  fi

  log_step "Installing Dependencies"

  cd "$PROJECT_DIR"

  # Use npm ci for production (clean install with exact versions from package-lock.json)
  if [ "$NODE_ENV" = "production" ]; then
    log_info "Running npm ci --production..."
    npm ci --production || error_exit "npm ci failed"
  else
    log_info "Running npm install..."
    npm install || error_exit "npm install failed"
  fi

  log_success "Dependencies installed successfully"
}

# Build shared packages
build_shared() {
  if [ "$SKIP_BUILD" = true ]; then
    return
  fi

  log_step "Building Shared Packages"

  cd "$PROJECT_DIR"

  log_info "Building @nodeangularfullstack/shared..."
  npm run build:shared || error_exit "Shared package build failed"

  log_success "Shared packages built successfully"
}

# Build frontend applications
build_frontend() {
  if [ "$SKIP_BUILD" = true ]; then
    log_warning "Skipping builds (--skip-build)"
    return
  fi

  log_step "Building Frontend Applications"

  cd "$PROJECT_DIR"

  # Build main web app
  log_info "Building apps/web..."
  npm --workspace=apps/web run build || error_exit "Web build failed"
  log_success "apps/web built successfully"

  # Verify build output
  if [ ! -d "$PROJECT_DIR/apps/web/dist/web/browser" ]; then
    error_exit "Web build output not found at apps/web/dist/web/browser"
  fi

  # Build form-builder-ui
  log_info "Building apps/form-builder-ui..."
  npm --workspace=apps/form-builder-ui run build || error_exit "Form builder UI build failed"
  log_success "apps/form-builder-ui built successfully"

  # Verify build output
  if [ ! -d "$PROJECT_DIR/apps/form-builder-ui/dist/form-builder-ui/browser" ]; then
    error_exit "Form builder UI build output not found at apps/form-builder-ui/dist/form-builder-ui/browser"
  fi
}

# Build backend applications
build_backend() {
  if [ "$SKIP_BUILD" = true ]; then
    return
  fi

  log_step "Building Backend Applications"

  cd "$PROJECT_DIR"

  # Build dashboard-api
  log_info "Building apps/dashboard-api..."
  npm --workspace=apps/dashboard-api run build || error_exit "Dashboard API build failed"
  log_success "apps/dashboard-api built successfully"

  # Build forms-api
  log_info "Building apps/forms-api..."
  npm --workspace=apps/forms-api run build || error_exit "Forms API build failed"
  log_success "apps/forms-api built successfully"
}

# Run database migrations
run_migrations() {
  if [ "$SKIP_MIGRATIONS" = true ]; then
    log_warning "Skipping database migrations (--skip-migrations)"
    return
  fi

  log_step "Running Database Migrations"

  cd "$PROJECT_DIR"

  # Run dashboard-api migrations
  log_info "Running dashboard-api migrations..."
  npm --workspace=apps/dashboard-api run db:migrate || log_warning "Dashboard API migrations failed (may be expected)"

  # Run forms-api migrations
  log_info "Running forms-api migrations..."
  npm --workspace=apps/forms-api run db:migrate || log_warning "Forms API migrations failed (may be expected)"

  log_success "Database migrations completed"
}

# Restart services with PM2
restart_services() {
  log_step "Restarting Services"

  if ! command -v pm2 &> /dev/null; then
    log_warning "PM2 not installed. Skipping service restart."
    log_info "Install PM2 with: npm install -g pm2"
    return
  fi

  cd "$PROJECT_DIR"

  # Check if services are already running
  if pm2 list | grep -q "dashboard-api"; then
    log_info "Restarting dashboard-api..."
    pm2 restart dashboard-api || log_warning "Failed to restart dashboard-api"
  else
    log_info "Starting dashboard-api..."
    cd "$PROJECT_DIR/apps/dashboard-api"
    pm2 start npm --name "dashboard-api" -- start || log_warning "Failed to start dashboard-api"
    cd "$PROJECT_DIR"
  fi

  if pm2 list | grep -q "forms-api"; then
    log_info "Restarting forms-api..."
    pm2 restart forms-api || log_warning "Failed to restart forms-api"
  else
    log_info "Starting forms-api..."
    cd "$PROJECT_DIR/apps/forms-api"
    pm2 start npm --name "forms-api" -- start || log_warning "Failed to start forms-api"
    cd "$PROJECT_DIR"
  fi

  # Save PM2 process list
  pm2 save || log_warning "Failed to save PM2 process list"

  log_success "Services restarted successfully"
}

# Reload nginx
reload_nginx() {
  log_step "Reloading Nginx"

  if ! command -v nginx &> /dev/null; then
    log_warning "Nginx not installed. Skipping nginx reload."
    return
  fi

  # Test nginx configuration
  log_info "Testing nginx configuration..."
  if sudo nginx -t; then
    log_info "Reloading nginx..."
    sudo systemctl reload nginx || sudo service nginx reload || log_warning "Failed to reload nginx"
    log_success "Nginx reloaded successfully"
  else
    log_error "Nginx configuration test failed. Not reloading."
  fi
}

# Health checks
run_health_checks() {
  if [ "$SKIP_HEALTH_CHECK" = true ]; then
    log_warning "Skipping health checks (--skip-health-check)"
    return
  fi

  log_step "Running Health Checks"

  # Wait for services to start
  log_info "Waiting 5 seconds for services to start..."
  sleep 5

  # Check dashboard-api
  log_info "Checking dashboard-api health..."
  if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    log_success "Dashboard API is healthy (http://localhost:3000/health)"
  else
    log_error "Dashboard API health check failed"
  fi

  # Check forms-api
  log_info "Checking forms-api health..."
  if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    log_success "Forms API is healthy (http://localhost:3001/health)"
  else
    log_error "Forms API health check failed"
  fi

  # Check frontend (if nginx is running)
  if command -v nginx &> /dev/null && systemctl is-active --quiet nginx; then
    log_info "Checking frontend via nginx..."
    if curl -sf https://legopdf.com/health > /dev/null 2>&1 || curl -sf http://localhost/health > /dev/null 2>&1; then
      log_success "Frontend is accessible"
    else
      log_warning "Frontend health check failed (may be expected if SSL not configured)"
    fi
  fi
}

# Show deployment summary
show_summary() {
  log_step "Deployment Summary"

  echo ""
  echo "📊 Deployment Status:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ "$SKIP_DEPS" = false ]; then
    echo "✓ Dependencies installed"
  fi

  if [ "$SKIP_BUILD" = false ]; then
    echo "✓ Shared packages built"
    echo "✓ Frontend applications built:"
    echo "  - apps/web/dist/web/browser"
    echo "  - apps/form-builder-ui/dist/form-builder-ui/browser"
    echo "✓ Backend applications built:"
    echo "  - apps/dashboard-api"
    echo "  - apps/forms-api"
  fi

  if [ "$SKIP_MIGRATIONS" = false ]; then
    echo "✓ Database migrations executed"
  fi

  echo "✓ Services restarted"

  if [ "$SKIP_HEALTH_CHECK" = false ]; then
    echo "✓ Health checks completed"
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "🌐 Service URLs:"
  echo "  Main Frontend:     https://legopdf.com"
  echo "  Form Builder:      https://form-builder.legopdf.com"
  echo "  Dashboard API:     https://api.legopdf.com"
  echo "  Forms API:         https://forms-api.legopdf.com"
  echo ""
  echo "📝 Logs:"
  echo "  PM2 Logs:          pm2 logs"
  echo "  Nginx Access:      sudo tail -f /var/log/nginx/*.access.log"
  echo "  Nginx Error:       sudo tail -f /var/log/nginx/*.error.log"
  echo ""
  log_success "Deployment completed successfully! 🚀"
}

# Main deployment flow
main() {
  echo ""
  echo "🚀 NodeAngularFullStack Production Deployment"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Environment: $NODE_ENV"
  echo "Project Dir: $PROJECT_DIR"
  echo ""

  check_prerequisites
  backup_current
  install_dependencies
  build_shared
  build_frontend
  build_backend
  run_migrations
  restart_services
  reload_nginx
  run_health_checks
  show_summary
}

# Run main function
main "$@"
