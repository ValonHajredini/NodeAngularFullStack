#!/bin/bash
# Backup Monolithic Database Script
# Creates a complete backup of the nodeangularfullstack database before migration
# Usage: ./scripts/db/backup-monolithic-database.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Monolithic Database Backup Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Configuration
SOURCE_DB="nodeangularfullstack"
BACKUP_DIR="./backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/nodeangularfullstack_backup_${TIMESTAMP}.sql"
BACKUP_COMPRESSED="${BACKUP_FILE}.gz"

# Database credentials (from .env.development)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-dbuser}"
DB_PASSWORD="${DB_PASSWORD:-dbpassword}"

# Create backup directory if it doesn't exist
echo -e "${YELLOW}Creating backup directory...${NC}"
mkdir -p "$BACKUP_DIR"

# Check if source database exists
echo -e "${YELLOW}Checking if source database exists...${NC}"
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$SOURCE_DB"; then
    echo -e "${GREEN}✓ Source database '$SOURCE_DB' found${NC}"
else
    echo -e "${RED}✗ Error: Source database '$SOURCE_DB' not found${NC}"
    exit 1
fi

# Create backup
echo -e "${YELLOW}Creating backup of '$SOURCE_DB'...${NC}"
echo -e "${YELLOW}Backup location: $BACKUP_FILE${NC}"

PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$SOURCE_DB" \
    --format=plain \
    --no-owner \
    --no-acl \
    --verbose \
    --file="$BACKUP_FILE" 2>&1 | grep -v "^$" || true

# Check if backup was successful
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✓ Backup created successfully (Size: $BACKUP_SIZE)${NC}"

    # Compress backup
    echo -e "${YELLOW}Compressing backup...${NC}"
    gzip "$BACKUP_FILE"

    if [ -f "$BACKUP_COMPRESSED" ]; then
        COMPRESSED_SIZE=$(du -h "$BACKUP_COMPRESSED" | cut -f1)
        echo -e "${GREEN}✓ Backup compressed successfully (Size: $COMPRESSED_SIZE)${NC}"
        echo -e "${GREEN}✓ Compressed backup location: $BACKUP_COMPRESSED${NC}"
    else
        echo -e "${RED}✗ Error: Failed to compress backup${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Error: Backup failed${NC}"
    exit 1
fi

# Create backup metadata
METADATA_FILE="${BACKUP_DIR}/backup_metadata_${TIMESTAMP}.txt"
cat > "$METADATA_FILE" << EOF
Backup Metadata
===============
Database: $SOURCE_DB
Timestamp: $TIMESTAMP
Date: $(date)
Host: $DB_HOST
Port: $DB_PORT
User: $DB_USER
Backup File: $BACKUP_COMPRESSED
Compressed Size: $COMPRESSED_SIZE
Original Size: $BACKUP_SIZE

Tables Backed Up:
-----------------
EOF

# List all tables in the backup
echo -e "${YELLOW}Generating table list...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$SOURCE_DB" -c "\dt" >> "$METADATA_FILE"

echo -e "${GREEN}✓ Backup metadata saved to: $METADATA_FILE${NC}"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Backup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Compressed Backup: $BACKUP_COMPRESSED${NC}"
echo -e "${GREEN}Metadata: $METADATA_FILE${NC}"
echo -e "${GREEN}Compressed Size: $COMPRESSED_SIZE${NC}"
echo ""
echo -e "${YELLOW}To restore this backup, use:${NC}"
echo -e "  gunzip -c $BACKUP_COMPRESSED | PGPASSWORD='$DB_PASSWORD' psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $SOURCE_DB"
echo ""
