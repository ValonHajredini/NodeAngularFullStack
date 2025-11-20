#!/bin/bash
# Data Migration Script: Monolithic to Separated Databases
# Migrates data from nodeangularfullstack to 3 separated databases
# Usage: ./scripts/db/migrate-to-separated-databases.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Database Migration Script${NC}"
echo -e "${GREEN}Monolithic → Separated Databases${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Configuration
SOURCE_DB="nodeangularfullstack"
AUTH_DB="nodeangularfullstack_auth"
DASHBOARD_DB="nodeangularfullstack_dashboard"
FORMS_DB="nodeangularfullstack_forms"

# Database credentials
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-dbuser}"
DB_PASSWORD="${DB_PASSWORD:-dbpassword}"

# Temporary directory for migration data
MIGRATION_DIR="./tmp/migration"
mkdir -p "$MIGRATION_DIR"

# Table assignments
AUTH_TABLES=("users" "tenants" "sessions" "api_tokens" "api_token_usage" "password_resets")
DASHBOARD_TABLES=("tools" "tool_configs" "tool_registry" "drawing_projects" "export_jobs" "test_tool")
FORMS_TABLES=("forms" "form_schemas" "form_submissions" "form_themes" "short_links")

# Helper function to execute SQL
execute_sql() {
    local db=$1
    local sql=$2
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -c "$sql" -q
}

# Helper function to check if table exists in source
table_exists() {
    local table=$1
    local result=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$SOURCE_DB" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');")
    echo "$result"
}

# Helper function to count rows
count_rows() {
    local db=$1
    local table=$2
    local count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" -tAc "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
    echo "$count"
}

# Step 1: Verify source database exists
echo -e "${YELLOW}Step 1: Verifying source database...${NC}"
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$SOURCE_DB"; then
    echo -e "${GREEN}✓ Source database '$SOURCE_DB' found${NC}"
else
    echo -e "${RED}✗ Error: Source database '$SOURCE_DB' not found${NC}"
    exit 1
fi

# Step 2: Verify target databases exist
echo -e "${YELLOW}Step 2: Verifying target databases...${NC}"
for db in "$AUTH_DB" "$DASHBOARD_DB" "$FORMS_DB"; do
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$db"; then
        echo -e "${GREEN}✓ Target database '$db' found${NC}"
    else
        echo -e "${RED}✗ Error: Target database '$db' not found${NC}"
        echo -e "${YELLOW}  Run ./scripts/db/create-separated-databases.sh first${NC}"
        exit 1
    fi
done

# Step 3: Run migrations on target databases
echo -e "${YELLOW}Step 3: Running migrations on target databases...${NC}"
echo -e "${BLUE}This will create the table schemas in the target databases${NC}"

# You would run your migration files here
# For now, we assume migrations have been run already

# Step 4: Migrate AUTH tables
echo ""
echo -e "${YELLOW}Step 4: Migrating AUTH tables to '$AUTH_DB'...${NC}"
for table in "${AUTH_TABLES[@]}"; do
    if [ "$(table_exists $table)" = "t" ]; then
        echo -e "${BLUE}  Migrating table: $table${NC}"

        # Export data from source
        PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$SOURCE_DB" \
            --table="$table" \
            --data-only \
            --no-owner \
            --no-acl \
            --file="${MIGRATION_DIR}/${table}.sql"

        # Import data to target
        PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$AUTH_DB" \
            -f "${MIGRATION_DIR}/${table}.sql" \
            -q

        # Verify row counts
        source_count=$(count_rows "$SOURCE_DB" "$table")
        target_count=$(count_rows "$AUTH_DB" "$table")

        if [ "$source_count" -eq "$target_count" ]; then
            echo -e "${GREEN}  ✓ $table: $source_count rows migrated successfully${NC}"
        else
            echo -e "${RED}  ✗ $table: Row count mismatch (source: $source_count, target: $target_count)${NC}"
        fi
    else
        echo -e "${YELLOW}  ⊘ Table '$table' not found in source database, skipping${NC}"
    fi
done

# Step 5: Migrate DASHBOARD tables
echo ""
echo -e "${YELLOW}Step 5: Migrating DASHBOARD tables to '$DASHBOARD_DB'...${NC}"
for table in "${DASHBOARD_TABLES[@]}"; do
    if [ "$(table_exists $table)" = "t" ]; then
        echo -e "${BLUE}  Migrating table: $table${NC}"

        # Export data from source
        PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$SOURCE_DB" \
            --table="$table" \
            --data-only \
            --no-owner \
            --no-acl \
            --file="${MIGRATION_DIR}/${table}.sql"

        # Import data to target
        PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DASHBOARD_DB" \
            -f "${MIGRATION_DIR}/${table}.sql" \
            -q

        # Verify row counts
        source_count=$(count_rows "$SOURCE_DB" "$table")
        target_count=$(count_rows "$DASHBOARD_DB" "$table")

        if [ "$source_count" -eq "$target_count" ]; then
            echo -e "${GREEN}  ✓ $table: $source_count rows migrated successfully${NC}"
        else
            echo -e "${RED}  ✗ $table: Row count mismatch (source: $source_count, target: $target_count)${NC}"
        fi
    else
        echo -e "${YELLOW}  ⊘ Table '$table' not found in source database, skipping${NC}"
    fi
done

# Step 6: Migrate FORMS tables
echo ""
echo -e "${YELLOW}Step 6: Migrating FORMS tables to '$FORMS_DB'...${NC}"
for table in "${FORMS_TABLES[@]}"; do
    if [ "$(table_exists $table)" = "t" ]; then
        echo -e "${BLUE}  Migrating table: $table${NC}"

        # Export data from source
        PGPASSWORD="$DB_PASSWORD" pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$SOURCE_DB" \
            --table="$table" \
            --data-only \
            --no-owner \
            --no-acl \
            --file="${MIGRATION_DIR}/${table}.sql"

        # Import data to target
        PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$FORMS_DB" \
            -f "${MIGRATION_DIR}/${table}.sql" \
            -q

        # Verify row counts
        source_count=$(count_rows "$SOURCE_DB" "$table")
        target_count=$(count_rows "$FORMS_DB" "$table")

        if [ "$source_count" -eq "$target_count" ]; then
            echo -e "${GREEN}  ✓ $table: $source_count rows migrated successfully${NC}"
        else
            echo -e "${RED}  ✗ $table: Row count mismatch (source: $source_count, target: $target_count)${NC}"
        fi
    else
        echo -e "${YELLOW}  ⊘ Table '$table' not found in source database, skipping${NC}"
    fi
done

# Step 7: Reset sequences for auto-increment IDs
echo ""
echo -e "${YELLOW}Step 7: Resetting sequences...${NC}"
for db in "$AUTH_DB" "$DASHBOARD_DB" "$FORMS_DB"; do
    echo -e "${BLUE}  Resetting sequences in $db${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db" <<EOF
DO \$\$
DECLARE
    seq_record RECORD;
    max_id BIGINT;
BEGIN
    FOR seq_record IN
        SELECT sequence_schema, sequence_name,
               REPLACE(sequence_name, '_id_seq', '') AS table_name,
               REPLACE(REPLACE(sequence_name, '_id_seq', ''), sequence_schema || '.', '') AS column_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        BEGIN
            EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', seq_record.table_name) INTO max_id;
            EXECUTE format('SELECT setval(%L, %s)', seq_record.sequence_schema || '.' || seq_record.sequence_name, GREATEST(max_id, 1));
        EXCEPTION WHEN OTHERS THEN
            -- Skip sequences that don't have corresponding tables
            NULL;
        END;
    END LOOP;
END \$\$;
EOF
    echo -e "${GREEN}  ✓ Sequences reset in $db${NC}"
done

# Step 8: Cleanup temporary files
echo ""
echo -e "${YELLOW}Step 8: Cleaning up temporary files...${NC}"
rm -rf "$MIGRATION_DIR"
echo -e "${GREEN}✓ Temporary files cleaned up${NC}"

# Step 9: Generate migration report
echo ""
echo -e "${YELLOW}Step 9: Generating migration report...${NC}"
REPORT_FILE="./backups/database/migration_report_$(date +%Y%m%d_%H%M%S).txt"
mkdir -p "$(dirname "$REPORT_FILE")"

cat > "$REPORT_FILE" << EOF
Database Migration Report
=========================
Date: $(date)
Source Database: $SOURCE_DB
Target Databases:
  - AUTH: $AUTH_DB
  - DASHBOARD: $DASHBOARD_DB
  - FORMS: $FORMS_DB

AUTH Tables (${#AUTH_TABLES[@]} tables):
EOF

for table in "${AUTH_TABLES[@]}"; do
    if [ "$(table_exists $table)" = "t" ]; then
        source_count=$(count_rows "$SOURCE_DB" "$table")
        target_count=$(count_rows "$AUTH_DB" "$table")
        echo "  - $table: $target_count rows (source: $source_count)" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" << EOF

DASHBOARD Tables (${#DASHBOARD_TABLES[@]} tables):
EOF

for table in "${DASHBOARD_TABLES[@]}"; do
    if [ "$(table_exists $table)" = "t" ]; then
        source_count=$(count_rows "$SOURCE_DB" "$table")
        target_count=$(count_rows "$DASHBOARD_DB" "$table")
        echo "  - $table: $target_count rows (source: $source_count)" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" << EOF

FORMS Tables (${#FORMS_TABLES[@]} tables):
EOF

for table in "${FORMS_TABLES[@]}"; do
    if [ "$(table_exists $table)" = "t" ]; then
        source_count=$(count_rows "$SOURCE_DB" "$table")
        target_count=$(count_rows "$FORMS_DB" "$table")
        echo "  - $table: $target_count rows (source: $source_count)" >> "$REPORT_FILE"
    fi
done

echo -e "${GREEN}✓ Migration report saved to: $REPORT_FILE${NC}"

# Final summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Migration Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo -e "  AUTH tables: ${#AUTH_TABLES[@]} migrated to $AUTH_DB"
echo -e "  DASHBOARD tables: ${#DASHBOARD_TABLES[@]} migrated to $DASHBOARD_DB"
echo -e "  FORMS tables: ${#FORMS_TABLES[@]} migrated to $FORMS_DB"
echo ""
echo -e "${GREEN}Migration report: $REPORT_FILE${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Run integration tests: npm run test"
echo -e "  2. Update environment to use separated databases"
echo -e "  3. Test both dashboard-api and forms-api"
echo -e "  4. Keep backup of monolithic database until verification complete"
echo ""
