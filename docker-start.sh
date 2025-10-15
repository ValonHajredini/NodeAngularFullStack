#!/bin/bash

# Docker Startup Script for NodeAngularFullStack
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting NodeAngularFullStack with Docker${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker from https://www.docker.com/get-started"
    exit 1
fi

# Resolve Docker Compose command (supports v1 and v2 plugin)
if command -v docker-compose &> /dev/null; then
    COMPOSE_COMMAND="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_COMMAND="docker compose"
else
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Install either Docker Compose V2 plugin (preferred) or the legacy docker-compose binary."
    echo "Docs: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if .env.docker.local exists, otherwise use .env.docker
if [ -f .env.docker.local ]; then
    echo -e "${GREEN}Using .env.docker.local configuration${NC}"
    ENV_FILE=".env.docker.local"
else
    echo -e "${YELLOW}Warning: .env.docker.local not found, using .env.docker${NC}"
    echo -e "${YELLOW}Copy .env.docker to .env.docker.local and customize for your environment${NC}"
    ENV_FILE=".env.docker"
fi

# Parse command line arguments
PROFILE=""
BUILD_FLAG=""
DETACH_FLAG="-d"

while [[ $# -gt 0 ]]; do
    case $1 in
        --with-pgweb)
            PROFILE="--profile tools"
            echo -e "${GREEN}pgWeb UI will be started${NC}"
            shift
            ;;
        --build)
            BUILD_FLAG="--build"
            echo -e "${GREEN}Forcing rebuild of Docker images${NC}"
            shift
            ;;
        --foreground)
            DETACH_FLAG=""
            echo -e "${GREEN}Running in foreground mode${NC}"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--with-pgweb] [--build] [--foreground]"
            exit 1
            ;;
    esac
done

echo ""
echo -e "${BLUE}Starting services...${NC}"

# Start Docker Compose
"${COMPOSE_COMMAND}" --env-file "$ENV_FILE" up $DETACH_FLAG $BUILD_FLAG $PROFILE

if [ -n "$DETACH_FLAG" ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Services started successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}Service URLs:${NC}"
    echo -e "  Frontend:     ${GREEN}http://localhost:$(grep WEB_PORT "$ENV_FILE" | cut -d '=' -f2 | tr -d ' ' || echo 80)${NC}"
    echo -e "  Backend API:  ${GREEN}http://localhost:$(grep API_PORT "$ENV_FILE" | cut -d '=' -f2 | tr -d ' ' || echo 3000)${NC}"
    echo -e "  API Docs:     ${GREEN}http://localhost:$(grep API_PORT "$ENV_FILE" | cut -d '=' -f2 | tr -d ' ' || echo 3000)/api-docs${NC}"
    echo -e "  Health Check: ${GREEN}http://localhost:$(grep API_PORT "$ENV_FILE" | cut -d '=' -f2 | tr -d ' ' || echo 3000)/health${NC}"

    if [ -n "$PROFILE" ]; then
        echo -e "  pgWeb UI:     ${GREEN}http://localhost:$(grep PGWEB_PORT "$ENV_FILE" | cut -d '=' -f2 | tr -d ' ' || echo 8080)${NC}"
    fi

    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo -e "  View logs:           ${YELLOW}${COMPOSE_COMMAND} logs -f${NC}"
    echo -e "  View API logs:       ${YELLOW}${COMPOSE_COMMAND} logs -f api${NC}"
    echo -e "  Stop services:       ${YELLOW}./docker-stop.sh${NC}"
    echo -e "  Restart services:    ${YELLOW}${COMPOSE_COMMAND} restart${NC}"
    echo -e "  Run migrations:      ${YELLOW}${COMPOSE_COMMAND} exec api npm run db:migrate${NC}"
    echo -e "  Seed database:       ${YELLOW}${COMPOSE_COMMAND} exec api npm run db:seed${NC}"
    echo ""
fi
