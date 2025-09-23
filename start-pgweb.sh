#!/bin/bash

# pgWeb Database Management UI Startup Script
# Starts pgWeb with authentication and proper configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PGWEB_PORT=8081
PGWEB_AUTH_USER="admin"
PGWEB_AUTH_PASS="development-password"
DB_URL="postgresql://dbuser:dbpassword@localhost:5432/nodeangularfullstack?sslmode=disable"

echo -e "${BLUE}🌐 Starting pgWeb Database Management UI...${NC}"

# Check if pgWeb is installed
if ! command -v pgweb &> /dev/null; then
    echo -e "${RED}❌ pgWeb is not installed${NC}"
    echo -e "${YELLOW}💡 Install with: brew install pgweb${NC}"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 -U dbuser &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not running${NC}"
    echo -e "${YELLOW}💡 Start PostgreSQL with: brew services start postgresql@14${NC}"
    exit 1
fi

# Check if database exists
if ! PGPASSWORD=dbpassword psql -h localhost -U dbuser -d nodeangularfullstack -c '\q' &> /dev/null; then
    echo -e "${RED}❌ Database 'nodeangularfullstack' does not exist${NC}"
    echo -e "${YELLOW}💡 Run database migrations first: cd apps/api && npm run db:migrate${NC}"
    exit 1
fi

# Check if port is already in use
if lsof -Pi :$PGWEB_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port $PGWEB_PORT is already in use${NC}"
    echo -e "${BLUE}🔍 Finding process using port $PGWEB_PORT...${NC}"
    PID=$(lsof -ti:$PGWEB_PORT)
    if [ ! -z "$PID" ]; then
        echo -e "${YELLOW}🛑 Killing existing process: $PID${NC}"
        kill -9 $PID 2>/dev/null || true
        sleep 2
    fi
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"
echo -e "${BLUE}🔐 Starting pgWeb with authentication...${NC}"
echo -e "${BLUE}📊 Database: nodeangularfullstack @ localhost:5432${NC}"
echo -e "${BLUE}🌐 Web UI: http://localhost:$PGWEB_PORT${NC}"
echo -e "${BLUE}👤 Username: $PGWEB_AUTH_USER${NC}"
echo -e "${BLUE}🔑 Password: $PGWEB_AUTH_PASS${NC}"
echo ""
echo -e "${YELLOW}📋 pgWeb Features:${NC}"
echo -e "  • Browse database tables and data"
echo -e "  • Execute SQL queries with syntax highlighting"
echo -e "  • Export data (CSV, JSON, SQL)"
echo -e "  • View database schema and relationships"
echo -e "  • Import data from files"
echo -e "  • Real-time query execution"
echo ""
echo -e "${BLUE}🚀 Starting pgWeb server...${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop pgWeb${NC}"
echo ""

# Start pgWeb with configuration
pgweb \
  --bind=localhost \
  --listen=$PGWEB_PORT \
  --auth-user="$PGWEB_AUTH_USER" \
  --auth-pass="$PGWEB_AUTH_PASS" \
  --sessions \
  --cors \
  --cors-origin="http://localhost:4200" \
  --prefix="" \
  --no-ssh