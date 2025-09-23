#!/bin/bash

# NodeAngularFullStack Development Stop Script
# Stops locally running services started by start-dev.sh

set -euo pipefail

echo "🛑 Stopping NodeAngularFullStack Development Environment..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

kill_by_pid_file() {
    local pid_file=$1
    local service_name=$2

    if [ -f "$pid_file" ]; then
        local pid
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${BLUE}🛑 Stopping $service_name (PID: $pid)...${NC}"
            kill "$pid" >/dev/null 2>&1 || true
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${YELLOW}⚠️  Force killing $service_name...${NC}"
                kill -9 "$pid" >/dev/null 2>&1 || true
            fi
            echo -e "${GREEN}✅ $service_name stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  $service_name was not running${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}⚠️  No PID file found for $service_name${NC}"
    fi
}

kill_by_port() {
    local port=$1
    local service_name=$2

    local pid
    pid=$(lsof -ti:"$port" || true)
    if [ -n "$pid" ]; then
        echo -e "${BLUE}🛑 Stopping $service_name on port $port (PID: $pid)...${NC}"
        kill "$pid" >/dev/null 2>&1 || true
        sleep 1
        local still_running
        still_running=$(lsof -ti:"$port" || true)
        if [ -n "$still_running" ]; then
            echo -e "${YELLOW}⚠️  Force killing remaining processes on port $port...${NC}"
            kill -9 $still_running >/dev/null 2>&1 || true
        fi
        echo -e "${GREEN}✅ $service_name stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  No process found on port $port for $service_name${NC}"
    fi
}

# Stop frontend Angular server
echo -e "${BLUE}🌐 Stopping frontend...${NC}"
kill_by_pid_file ".frontend.pid" "Frontend Angular"
kill_by_port 4200 "Frontend (port 4200)"

# Stop backend API server
echo -e "${BLUE}🔧 Stopping backend...${NC}"
kill_by_pid_file ".backend.pid" "Backend API"
kill_by_port 3000 "Backend API (port 3000)"

# Stop pgWeb database UI
echo -e "${BLUE}🗄️  Stopping pgWeb Database UI...${NC}"
kill_by_pid_file ".pgweb.pid" "pgWeb"
kill_by_port 8080 "pgWeb (port 8080)"

# Clean up log files if they exist
echo -e "${BLUE}🧹 Cleaning up runtime artifacts...${NC}"
if [ -d "logs" ]; then
    rm -f logs/*.log
fi
rm -f .frontend.pid .backend.pid .pgweb.pid

# Provide reminder about PostgreSQL service
if command -v brew >/dev/null 2>&1; then
    echo ""
    echo -e "${YELLOW}ℹ️  PostgreSQL continues to run via brew services.${NC}"
    echo -e "${YELLOW}   Stop it with:${NC} brew services stop postgresql@14"
fi

echo ""
echo -e "${GREEN}✅ All local services stopped successfully!${NC}"
echo -e "${BLUE}💡 To start again, run: ${NC}./start-dev.sh"
echo ""
