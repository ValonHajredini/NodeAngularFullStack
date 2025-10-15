#!/bin/bash

# Docker Stop Script for NodeAngularFullStack
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Stopping NodeAngularFullStack Docker${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env.docker.local exists, otherwise use .env.docker
if [ -f .env.docker.local ]; then
    ENV_FILE=".env.docker.local"
else
    ENV_FILE=".env.docker"
fi

# Stop all services
echo -e "${YELLOW}Stopping all services...${NC}"
docker-compose --env-file "$ENV_FILE" --profile tools down

echo ""
echo -e "${GREEN}All services stopped successfully!${NC}"
echo ""
echo -e "${BLUE}To remove volumes (database data):${NC}"
echo -e "  ${YELLOW}docker-compose down -v${NC}"
echo ""
