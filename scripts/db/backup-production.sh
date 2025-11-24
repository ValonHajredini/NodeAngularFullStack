#!/bin/bash
################################################################################
# Production Database Backup Script
#
# Purpose: Creates comprehensive backups of production databases before migration
# Usage: ./scripts/db/backup-production.sh
#
# Creates:
# - Full database backups (custom format for pg_restore)
# - Schema-only SQL dumps (for inspection)
# - Data-only SQL dumps (for migration)
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
BACKUP_BASE="/var/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE/$TIMESTAMP"

# Database configuration (production)
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-legopdf}"
DB_PASSWORD="${DB_PASSWORD}"  # Must be set via environment or prompt

# Database names (production)
AUTH_DB="api_prod"
FORMS_DB="forms_api_prod"

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

# Create backup directory
create_backup_dir() {
  log_step "Creating Backup Directory"

  if [ ! -d "$BACKUP_BASE" ]; then
    sudo mkdir -p "$BACKUP_BASE"
    sudo chown $(whoami):$(whoami) "$BACKUP_BASE"
    log_info "Created backup base directory: $BACKUP_BASE"
  fi

  mkdir -p "$BACKUP_DIR"
  log_success "Backup directory: $BACKUP_DIR"
}

# Backup database (full, schema, and data)
backup_database() {
  local DB_NAME=$1
  local DB_LABEL=$2

  log_step "Backing Up $DB_LABEL ($DB_NAME)"

  # Full backup (custom format - for pg_restore)
  log_info "Creating full backup..."
  PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F c \
    -f "$BACKUP_DIR/${DB_NAME}_full.backup"

  local FULL_SIZE=$(du -h "$BACKUP_DIR/${DB_NAME}_full.backup" | cut -f1)
  log_success "Full backup: ${DB_NAME}_full.backup ($FULL_SIZE)"

  # Schema-only backup (for inspection)
  log_info "Creating schema-only backup..."
  PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --schema-only \
    -f "$BACKUP_DIR/${DB_NAME}_schema.sql"

  local SCHEMA_SIZE=$(du -h "$BACKUP_DIR/${DB_NAME}_schema.sql" | cut -f1)
  log_success "Schema backup: ${DB_NAME}_schema.sql ($SCHEMA_SIZE)"

  # Data-only backup (for migration)
  log_info "Creating data-only backup..."
  PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --data-only \
    -f "$BACKUP_DIR/${DB_NAME}_data.sql"

  local DATA_SIZE=$(du -h "$BACKUP_DIR/${DB_NAME}_data.sql" | cut -f1)
  log_success "Data backup: ${DB_NAME}_data.sql ($DATA_SIZE)"
}

# Backup specific tables
backup_tables() {
  local DB_NAME=$1
  shift
  local TABLES=("$@")

  log_info "Backing up specific tables from $DB_NAME..."

  local TABLE_ARGS=""
  for table in "${TABLES[@]}"; do
    TABLE_ARGS="$TABLE_ARGS --table=$table"
  done

  PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --data-only \
    $TABLE_ARGS \
    -f "$BACKUP_DIR/${DB_NAME}_selected_tables.sql"

  local TABLES_SIZE=$(du -h "$BACKUP_DIR/${DB_NAME}_selected_tables.sql" | cut -f1)
  log_success "Selected tables backup: ${DB_NAME}_selected_tables.sql ($TABLES_SIZE)"
}

# Generate backup manifest
create_manifest() {
  log_step "Creating Backup Manifest"

  cat > "$BACKUP_DIR/MANIFEST.txt" <<EOF
NodeAngularFullStack Production Database Backup
================================================

Backup Timestamp: $TIMESTAMP
Backup Location: $BACKUP_DIR
Database Host: $DB_HOST
Database User: $DB_USER

Databases Backed Up:
- $AUTH_DB (Authentication & Dashboard)
- $FORMS_DB (Forms & Themes)

Files Created:
$(ls -lh "$BACKUP_DIR")

Backup Sizes:
$(du -sh "$BACKUP_DIR")

Restoration Instructions:
========================

To restore full database:
  PGPASSWORD='your-password' pg_restore \\
    -h localhost \\
    -U legopdf \\
    -d <database_name> \\
    --clean \\
    --if-exists \\
    $BACKUP_DIR/<database_name>_full.backup

To restore schema only:
  PGPASSWORD='your-password' psql \\
    -h localhost \\
    -U legopdf \\
    -d <database_name> \\
    -f $BACKUP_DIR/<database_name>_schema.sql

To restore data only:
  PGPASSWORD='your-password' psql \\
    -h localhost \\
    -U legopdf \\
    -d <database_name> \\
    -f $BACKUP_DIR/<database_name>_data.sql

EOF

  log_success "Manifest created: $BACKUP_DIR/MANIFEST.txt"
}

# Verify backups
verify_backups() {
  log_step "Verifying Backups"

  local ALL_OK=true

  for DB_NAME in "$AUTH_DB" "$FORMS_DB"; do
    if [ ! -f "$BACKUP_DIR/${DB_NAME}_full.backup" ]; then
      log_error "Missing: ${DB_NAME}_full.backup"
      ALL_OK=false
    elif [ ! -s "$BACKUP_DIR/${DB_NAME}_full.backup" ]; then
      log_error "Empty: ${DB_NAME}_full.backup"
      ALL_OK=false
    else
      log_success "Valid: ${DB_NAME}_full.backup"
    fi
  done

  if [ "$ALL_OK" = true ]; then
    log_success "All backups verified successfully"
  else
    log_error "Some backups are missing or empty"
    return 1
  fi
}

# Display summary
show_summary() {
  log_step "Backup Summary"

  echo ""
  echo "📊 Backup Status:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✓ Location: $BACKUP_DIR"
  echo "✓ Timestamp: $TIMESTAMP"
  echo "✓ Databases: $AUTH_DB, $FORMS_DB"
  echo ""
  echo "📁 Files Created:"
  ls -lh "$BACKUP_DIR" | tail -n +2 | awk '{printf "  - %-40s %5s\n", $9, $5}'
  echo ""
  echo "💾 Total Size:"
  du -sh "$BACKUP_DIR" | awk '{printf "  %s\n", $1}'
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  log_success "Production database backup completed! 🚀"
  echo ""
  echo "📝 Next Steps:"
  echo "  1. Verify backups: cat $BACKUP_DIR/MANIFEST.txt"
  echo "  2. Run data migration: ./scripts/db/migrate-forms-data-production.sh"
  echo "  3. Deploy changes: git push github main"
}

# Main execution
main() {
  echo ""
  echo "🚀 Production Database Backup Script"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Timestamp: $TIMESTAMP"
  echo "Target Databases: $AUTH_DB, $FORMS_DB"
  echo ""

  # Check if password is provided
  if [ -z "${DB_PASSWORD:-}" ]; then
    log_error "DB_PASSWORD environment variable not set"
    echo ""
    echo "Usage:"
    echo "  export DB_PASSWORD='your-production-password'"
    echo "  ./scripts/db/backup-production.sh"
    exit 1
  fi

  # Execute backup steps
  create_backup_dir
  backup_database "$AUTH_DB" "Authentication DB"
  backup_database "$FORMS_DB" "Forms DB"

  # Backup forms-specific tables from auth DB
  log_step "Backing Up Forms Tables from Auth DB"
  backup_tables "$AUTH_DB" "forms" "form_schemas" "form_submissions" "form_themes" "short_links"

  create_manifest
  verify_backups
  show_summary
}

# Run main function
main "$@"
