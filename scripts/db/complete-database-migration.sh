#!/bin/bash
# Complete Database Migration Orchestrator
# Runs the full migration process: backup → schema setup → data migration → verification
# Usage: ./scripts/db/complete-database-migration.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

clear

echo -e "${MAGENTA}╔════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║   Database Migration Orchestrator     ║${NC}"
echo -e "${MAGENTA}║   Monolithic → Separated Databases    ║${NC}"
echo -e "${MAGENTA}╔════════════════════════════════════════╗${NC}"
echo ""
echo -e "${YELLOW}This script will:${NC}"
echo -e "  1. ${BLUE}Backup${NC} the monolithic database"
echo -e "  2. ${BLUE}Create${NC} the 3 separated databases (if not exists)"
echo -e "  3. ${BLUE}Run${NC} schema migrations on separated databases"
echo -e "  4. ${BLUE}Migrate${NC} data from monolithic to separated databases"
echo -e "  5. ${BLUE}Verify${NC} data integrity and generate report"
echo ""
echo -e "${RED}⚠️  WARNING: This is a significant operation!${NC}"
echo -e "${RED}   Make sure you have:${NC}"
echo -e "${RED}   - PostgreSQL running${NC}"
echo -e "${RED}   - Correct database credentials${NC}"
echo -e "${RED}   - Sufficient disk space for backups${NC}"
echo ""

# Confirm before proceeding
read -p "$(echo -e ${YELLOW}Do you want to proceed? \(yes/no\): ${NC})" -r
echo
if [[ ! $REPLY =~ ^[Yy](es)?$ ]]; then
    echo -e "${RED}Migration cancelled.${NC}"
    exit 0
fi

# Start timestamp
START_TIME=$(date +%s)
echo -e "${GREEN}Migration started at: $(date)${NC}"
echo ""

# Step 1: Backup monolithic database
echo -e "${MAGENTA}╔════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║ Step 1: Backup Monolithic Database    ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════╝${NC}"
echo ""

if [ -f "./scripts/db/backup-monolithic-database.sh" ]; then
    ./scripts/db/backup-monolithic-database.sh
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backup completed successfully${NC}"
    else
        echo -e "${RED}✗ Backup failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Error: Backup script not found${NC}"
    exit 1
fi

echo ""
read -p "$(echo -e ${YELLOW}Press Enter to continue to Step 2...${NC})"
echo ""

# Step 2: Create separated databases
echo -e "${MAGENTA}╔════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║ Step 2: Create Separated Databases    ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════╝${NC}"
echo ""

if [ -f "./scripts/db/create-separated-databases.sh" ]; then
    echo -e "${BLUE}Creating databases (will skip if already exist)...${NC}"
    ./scripts/db/create-separated-databases.sh || echo -e "${YELLOW}Databases may already exist, continuing...${NC}"
    echo -e "${GREEN}✓ Database creation step completed${NC}"
else
    echo -e "${RED}✗ Error: Create databases script not found${NC}"
    exit 1
fi

echo ""
read -p "$(echo -e ${YELLOW}Press Enter to continue to Step 3...${NC})"
echo ""

# Step 3: Run schema migrations
echo -e "${MAGENTA}╔════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║ Step 3: Run Schema Migrations         ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════╝${NC}"
echo ""

if [ -f "./scripts/db/run-separated-migrations.sh" ]; then
    ./scripts/db/run-separated-migrations.sh
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Schema migrations completed successfully${NC}"
    else
        echo -e "${RED}✗ Schema migrations failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Error: Run migrations script not found${NC}"
    exit 1
fi

echo ""
read -p "$(echo -e ${YELLOW}Press Enter to continue to Step 4...${NC})"
echo ""

# Step 4: Migrate data
echo -e "${MAGENTA}╔════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║ Step 4: Migrate Data                  ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════╝${NC}"
echo ""

if [ -f "./scripts/db/migrate-to-separated-databases.sh" ]; then
    ./scripts/db/migrate-to-separated-databases.sh
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Data migration completed successfully${NC}"
    else
        echo -e "${RED}✗ Data migration failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Error: Data migration script not found${NC}"
    exit 1
fi

echo ""

# Calculate duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Final summary
echo ""
echo -e "${MAGENTA}╔════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║   Migration Complete! 🎉                ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ All steps completed successfully${NC}"
echo -e "${GREEN}✓ Duration: ${MINUTES}m ${SECONDS}s${NC}"
echo -e "${GREEN}✓ Migration completed at: $(date)${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. ${BLUE}Review migration report${NC} in ./backups/database/"
echo -e "  2. ${BLUE}Update .env files${NC} to use separated databases"
echo -e "  3. ${BLUE}Run integration tests:${NC} npm run test"
echo -e "  4. ${BLUE}Test APIs:${NC} Start dashboard-api and forms-api"
echo -e "  5. ${BLUE}Verify cross-database validation${NC} works correctly"
echo ""
echo -e "${YELLOW}⚠️  Keep the monolithic database backup until:${NC}"
echo -e "  - All tests pass"
echo -e "  - Both APIs are verified working"
echo -e "  - Production deployment is successful"
echo ""
echo -e "${GREEN}Backup location: ./backups/database/${NC}"
echo -e "${GREEN}Migration reports: ./backups/database/${NC}"
echo ""
