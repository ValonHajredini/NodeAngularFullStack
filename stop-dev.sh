#!/bin/bash

# NodeAngularFullStack Development Stop Script
# This script stops all services

echo "🛑 Stopping NodeAngularFullStack Development Environment..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to kill process by PID file
kill_by_pid_file() {
    local pid_file=$1
    local service_name=$2

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${BLUE}🛑 Stopping $service_name (PID: $pid)...${NC}"
            kill "$pid"
            sleep 2
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${YELLOW}⚠️  Force killing $service_name...${NC}"
                kill -9 "$pid"
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

# Function to kill processes by port
kill_by_port() {
    local port=$1
    local service_name=$2

    local pid=$(lsof -ti:$port)
    if [ -n "$pid" ]; then
        echo -e "${BLUE}🛑 Stopping $service_name on port $port (PID: $pid)...${NC}"
        kill $pid 2>/dev/null
        sleep 2
        # Force kill if still running
        local still_running=$(lsof -ti:$port)
        if [ -n "$still_running" ]; then
            echo -e "${YELLOW}⚠️  Force killing $service_name...${NC}"
            kill -9 $still_running 2>/dev/null
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

# Stop Docker containers
echo -e "${BLUE}🐳 Stopping Docker containers...${NC}"
if command -v docker-compose >/dev/null 2>&1; then
    docker-compose down
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Docker containers stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker containers might have already been stopped${NC}"
    fi
else
    echo -e "${RED}❌ Docker Compose not found${NC}"
fi

# Clean up any remaining processes
echo -e "${BLUE}🧹 Cleaning up remaining processes...${NC}"

# Kill any remaining node processes that might be related to our project
pkill -f "nodemon.*server.ts" 2>/dev/null || true
pkill -f "ng serve" 2>/dev/null || true
pkill -f "webpack-dev-server" 2>/dev/null || true

# Clean up log files if they exist
if [ -d "logs" ]; then
    echo -e "${BLUE}🧹 Cleaning up log files...${NC}"
    rm -rf logs/*.log
fi

# Clean up PID files
rm -f .frontend.pid .backend.pid

echo ""
echo -e "${GREEN}✅ All services stopped successfully!${NC}"
echo -e "${BLUE}💡 To start again, run: ${NC}./start-dev.sh"
echo ""