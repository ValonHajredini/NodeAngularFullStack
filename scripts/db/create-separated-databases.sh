#!/bin/bash

# Create Separated Databases Script
# Creates three PostgreSQL databases for microservices architecture:
# - nodeangularfullstack_auth (shared auth database)
# - nodeangularfullstack_dashboard (dashboard API database)
# - nodeangularfullstack_forms (forms API database)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f ".env.development" ]; then
    echo -e "${BLUE}🧾 Loading environment variables from .env.development${NC}"
    set -a
    source .env.development
    set +a
else
    echo -e "${RED}❌ .env.development not found${NC}"
    exit 1
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
# Use postgres superuser for database creation (dbuser lacks CREATE DATABASE permission)
CREATE_DB_USER="${CREATE_DB_USER:-postgres}"
CREATE_DB_PASSWORD="${CREATE_DB_PASSWORD:-}"
DB_USER="${DB_USER:-dbuser}"
DB_PASSWORD="${DB_PASSWORD:-dbpassword}"

AUTH_DB_NAME="${AUTH_DB_NAME:-nodeangularfullstack_auth}"
DASHBOARD_DB_NAME="${DASHBOARD_DB_NAME:-nodeangularfullstack_dashboard}"
FORMS_DB_NAME="${FORMS_DB_NAME:-nodeangularfullstack_forms}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Database Separation Setup Script                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to create a database if it doesn't exist
create_database() {
    local db_name=$1
    local db_description=$2

    echo -e "${YELLOW}📦 Checking database: ${db_name}${NC}"

    # Check if database exists (using superuser for CREATE DATABASE)
    if PGPASSWORD="$CREATE_DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$CREATE_DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$db_name"; then
        echo -e "${GREEN}✅ Database '${db_name}' already exists${NC}"
    else
        echo -e "${YELLOW}🔨 Creating database '${db_name}' (${db_description})...${NC}"
        PGPASSWORD="$CREATE_DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$CREATE_DB_USER" "$db_name"
        echo -e "${GREEN}✅ Database '${db_name}' created successfully${NC}"

        # Grant privileges to application user
        echo -e "${YELLOW}🔑 Granting privileges to '$DB_USER'...${NC}"
        PGPASSWORD="$CREATE_DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$CREATE_DB_USER" -d "$db_name" <<-EOSQL
            GRANT ALL PRIVILEGES ON DATABASE $db_name TO $DB_USER;
            GRANT ALL ON SCHEMA public TO $DB_USER;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
EOSQL
        echo -e "${GREEN}✅ Privileges granted successfully${NC}"
    fi

    echo ""
}

# Verify PostgreSQL connectivity (using superuser for CREATE DATABASE)
echo -e "${BLUE}📡 Verifying PostgreSQL connectivity...${NC}"
if ! PGPASSWORD="$CREATE_DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$CREATE_DB_USER" -d postgres -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${RED}❌ Unable to connect to PostgreSQL at ${DB_HOST}:${DB_PORT} as ${CREATE_DB_USER}${NC}"
    echo -e "${YELLOW}💡 Ensure PostgreSQL is running: brew services start postgresql@14${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL connection verified${NC}"
echo ""

# Create the three databases
create_database "$AUTH_DB_NAME" "Shared Authentication Database"
create_database "$DASHBOARD_DB_NAME" "Dashboard API Database"
create_database "$FORMS_DB_NAME" "Forms API Database"

echo -e "${GREEN}🎉 SUCCESS! All three databases have been created${NC}"
echo ""
echo -e "${BLUE}📋 Database Summary:${NC}"
echo -e "   Auth Database:      ${GREEN}${AUTH_DB_NAME}${NC}"
echo -e "   Dashboard Database: ${GREEN}${DASHBOARD_DB_NAME}${NC}"
echo -e "   Forms Database:     ${GREEN}${FORMS_DB_NAME}${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "   1. Run migration split script: ${YELLOW}./scripts/db/split-migrations.sh${NC}"
echo -e "   2. Run migrations: ${YELLOW}npm --workspace=apps/dashboard-api run db:migrate${NC}"
echo -e "   3. Run data migration: ${YELLOW}./scripts/db/migrate-data.sh${NC}"
echo ""
echo -e "${GREEN}🚀 Ready to proceed with migration!${NC}"
