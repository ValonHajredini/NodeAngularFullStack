#!/bin/bash

# NodeAngularFullStack Development Startup Script
# This script starts all services needed for development

set -e  # Exit on any error

echo "🚀 Starting NodeAngularFullStack Development Environment..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Port configuration (keep in sync with docker-compose.yml)
FRONTEND_PORT=4200
API_PORT=3000
POSTGRES_PORT=5432
PGWEB_PORT=8081

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Ensure Docker daemon is running (tries to start on macOS if possible)
ensure_docker_running() {
    if docker info >/dev/null 2>&1; then
        return 0
    fi

    echo -e "${YELLOW}⚠️  Docker daemon is not running.${NC}"

    if [[ "$OSTYPE" == "darwin"* ]] && command_exists open; then
        echo -e "${BLUE}▶️  Attempting to start Docker Desktop...${NC}"
        open -a Docker >/dev/null 2>&1 || true

        echo -e "${YELLOW}⏳ Waiting for Docker Desktop to start...${NC}"
        for attempt in {1..30}; do
            if docker info >/dev/null 2>&1; then
                echo -e "${GREEN}✅ Docker Desktop is running${NC}"
                return 0
            fi
            sleep 2
        done
    fi

    echo -e "${RED}❌ Please start the Docker daemon and rerun this script.${NC}"
    exit 1
}

# Function to check if port is in use
port_in_use() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}⏳ Waiting for $service_name to be ready...${NC}"

    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts - $service_name not ready yet...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done

    echo -e "${RED}❌ $service_name failed to start after $max_attempts attempts${NC}"
    return 1
}

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}❌ Docker Compose is not installed or not in PATH${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed or not in PATH${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed or not in PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites found${NC}"

# Ensure Docker daemon is running before continuing
ensure_docker_running

# Check if ports are available
echo -e "${BLUE}🔍 Checking port availability...${NC}"

if port_in_use $API_PORT; then
    echo -e "${YELLOW}⚠️  Port $API_PORT is in use - backend might already be running${NC}"
fi

if port_in_use $FRONTEND_PORT; then
    echo -e "${YELLOW}⚠️  Port $FRONTEND_PORT is in use - frontend might already be running${NC}"
fi

if port_in_use $POSTGRES_PORT; then
    echo -e "${YELLOW}⚠️  Port $POSTGRES_PORT is in use - PostgreSQL might already be running${NC}"
fi

if port_in_use $PGWEB_PORT; then
    echo -e "${YELLOW}⚠️  Port $PGWEB_PORT is in use - pgWeb database UI might already be running${NC}"
fi

# Step 1: Start Docker containers
echo -e "${BLUE}🐳 Starting Docker containers (PostgreSQL + pgAdmin)...${NC}"
docker-compose up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker containers started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start Docker containers${NC}"
    exit 1
fi

# Wait for PostgreSQL to be ready
echo -e "${BLUE}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Check if PostgreSQL is responding
max_db_attempts=30
db_attempt=1
while [ $db_attempt -le $max_db_attempts ]; do
    if docker-compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
        break
    fi
    echo -e "${YELLOW}   Attempt $db_attempt/$max_db_attempts - PostgreSQL not ready yet...${NC}"
    sleep 2
    db_attempt=$((db_attempt + 1))
done

if [ $db_attempt -gt $max_db_attempts ]; then
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
    exit 1
fi

# Step 2: Setup database
echo -e "${BLUE}🗄️  Setting up database...${NC}"
cd apps/api

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    npm install
fi

# Run database setup
echo -e "${BLUE}🔧 Running database migrations...${NC}"
npm run db:migrate

echo -e "${BLUE}🌱 Seeding database with test data...${NC}"
npm run db:seed

echo -e "${GREEN}✅ Database setup complete${NC}"

# Step 3: Start backend in background
echo -e "${BLUE}🔧 Starting backend API server...${NC}"
npm run dev > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!

# Store PID for cleanup
echo $BACKEND_PID > ../../.backend.pid

cd ../..

# Wait for backend to be ready
wait_for_service "http://localhost:${API_PORT}/health" "Backend API"

# Ensure database web UI is up
wait_for_service "http://localhost:${PGWEB_PORT}" "pgWeb Database UI"

# Step 4: Start frontend
echo -e "${BLUE}🌐 Starting frontend Angular development server...${NC}"
cd apps/web

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

# Check if Angular CLI is available
if ! command_exists ng; then
    echo -e "${YELLOW}📦 Installing Angular CLI globally...${NC}"
    npm install -g @angular/cli
fi

# Start frontend in background
ng serve > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!

# Store PID for cleanup
echo $FRONTEND_PID > ../../.frontend.pid

cd ../..

# Wait for frontend to be ready
wait_for_service "http://localhost:4200" "Frontend Angular"

# Step 5: Display success message and URLs
echo ""
echo -e "${GREEN}🎉 SUCCESS! All services are now running${NC}"
echo "=================================================="
echo -e "${BLUE}📋 Service URLs:${NC}"
echo -e "   Frontend (Angular):     ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "   Backend API:            ${GREEN}http://localhost:${API_PORT}${NC}"
echo -e "   API Documentation:      ${GREEN}http://localhost:${API_PORT}/api-docs${NC}"
echo -e "   pgWeb (Database UI):    ${GREEN}http://localhost:${PGWEB_PORT}${NC}"
echo -e "   API Health Check:       ${GREEN}http://localhost:${API_PORT}/health${NC}"
echo ""
echo -e "${BLUE}ℹ️  pgWeb is pre-configured to connect to Postgres using docker-compose environment variables.${NC}"
echo ""
echo -e "${BLUE}🧪 Test Users Available:${NC}"
echo -e "   Admin:    ${YELLOW}admin@example.com${NC} / ${YELLOW}Admin123!@#${NC}"
echo -e "   User:     ${YELLOW}user@example.com${NC} / ${YELLOW}User123!@#${NC}"
echo -e "   ReadOnly: ${YELLOW}readonly@example.com${NC} / ${YELLOW}Read123!@#${NC}"
echo ""
echo -e "${BLUE}📝 Log Files:${NC}"
echo -e "   Backend:  ${YELLOW}logs/backend.log${NC}"
echo -e "   Frontend: ${YELLOW}logs/frontend.log${NC}"
echo ""
echo -e "${YELLOW}💡 To stop all services, run: ${NC}./stop-dev.sh"
echo -e "${YELLOW}💡 To view logs in real-time: ${NC}tail -f logs/backend.log ${NC}or ${NC}tail -f logs/frontend.log"
echo ""
echo -e "${GREEN}🚀 Happy coding!${NC}"
