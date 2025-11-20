#!/bin/bash
# Run Migrations on Separated Databases
# Applies schema migrations to auth, dashboard, and forms databases
# Usage: ./scripts/db/run-separated-migrations.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Run Migrations on Separated Databases${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Configuration
AUTH_DB="nodeangularfullstack_auth"
DASHBOARD_DB="nodeangularfullstack_dashboard"
FORMS_DB="nodeangularfullstack_forms"

# Database credentials
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Migration directories
DASHBOARD_AUTH_MIGRATIONS="./apps/dashboard-api/database/migrations-auth"
DASHBOARD_MIGRATIONS="./apps/dashboard-api/database/migrations-dashboard"
FORMS_AUTH_MIGRATIONS="./apps/forms-api/database/migrations-auth"
FORMS_MIGRATIONS="./apps/forms-api/database/migrations-forms"

# Helper function to run migration files
run_migrations() {
    local db=$1
    local migrations_dir=$2
    local description=$3

    echo -e "${YELLOW}Running $description migrations on '$db'...${NC}"

    if [ ! -d "$migrations_dir" ]; then
        echo -e "${RED}✗ Error: Migration directory not found: $migrations_dir${NC}"
        return 1
    fi

    # Count migration files
    migration_count=$(find "$migrations_dir" -name "*.sql" 2>/dev/null | wc -l | tr -d ' ')

    if [ "$migration_count" -eq 0 ]; then
        echo -e "${YELLOW}  ⊘ No migration files found in $migrations_dir${NC}"
        return 0
    fi

    echo -e "${BLUE}  Found $migration_count migration files${NC}"

    # Run each migration file in order
    for migration_file in "$migrations_dir"/*.sql; do
        if [ -f "$migration_file" ]; then
            filename=$(basename "$migration_file")
            echo -e "${BLUE}    Applying: $filename${NC}"

            # Execute migration
            PGPASSWORD="$DB_PASSWORD" psql \
                -h "$DB_HOST" \
                -p "$DB_PORT" \
                -U "$DB_USER" \
                -d "$db" \
                -f "$migration_file" \
                -q \
                -v ON_ERROR_STOP=1

            echo -e "${GREEN}    ✓ $filename applied successfully${NC}"
        fi
    done

    echo -e "${GREEN}  ✓ All $description migrations completed${NC}"
    echo ""
}

# Step 1: Verify target databases exist
echo -e "${YELLOW}Step 1: Verifying target databases...${NC}"
for db in "$AUTH_DB" "$DASHBOARD_DB" "$FORMS_DB"; do
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$db"; then
        echo -e "${GREEN}✓ Target database '$db' found${NC}"
    else
        echo -e "${RED}✗ Error: Target database '$db' not found${NC}"
        echo -e "${YELLOW}  Run ./scripts/db/create-separated-databases.sh first${NC}"
        exit 1
    fi
done
echo ""

# Step 2: Run AUTH migrations
echo -e "${YELLOW}Step 2: Running AUTH migrations...${NC}"
run_migrations "$AUTH_DB" "$DASHBOARD_AUTH_MIGRATIONS" "AUTH"

# Step 3: Run DASHBOARD migrations
echo -e "${YELLOW}Step 3: Running DASHBOARD migrations...${NC}"
run_migrations "$DASHBOARD_DB" "$DASHBOARD_MIGRATIONS" "DASHBOARD"

# Step 4: Run FORMS migrations (AUTH + FORMS)
echo -e "${YELLOW}Step 4: Running FORMS migrations...${NC}"
echo -e "${BLUE}Note: FORMS database shares AUTH schema for read-only access${NC}"
echo ""
# We don't run AUTH migrations on FORMS_DB since forms-api only reads from AUTH_DB
run_migrations "$FORMS_DB" "$FORMS_MIGRATIONS" "FORMS"

# Step 5: Verify schemas
echo -e "${YELLOW}Step 5: Verifying database schemas...${NC}"

verify_tables() {
    local db=$1
    local expected_tables=$2

    echo -e "${BLUE}  Checking tables in '$db'...${NC}"

    local table_count=$(PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$db" \
        -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
    )

    echo -e "${GREEN}    ✓ $table_count tables found in $db${NC}"

    # List tables
    echo -e "${BLUE}    Tables in $db:${NC}"
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$db" \
        -tAc "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" | \
        while read table; do
            echo -e "${GREEN}      - $table${NC}"
        done

    echo ""
}

verify_tables "$AUTH_DB" "AUTH"
verify_tables "$DASHBOARD_DB" "DASHBOARD"
verify_tables "$FORMS_DB" "FORMS"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Migrations Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}All database schemas have been created.${NC}"
echo -e "${GREEN}You can now run the data migration:${NC}"
echo -e "  ${YELLOW}./scripts/db/migrate-to-separated-databases.sh${NC}"
echo ""
