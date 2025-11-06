#!/bin/bash

# NodeAngularFullStack Development Startup Script
# Starts PostgreSQL-dependent services using local installations (no Docker)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

ensure_command() {
    local cmd=$1
    local guidance=$2
    if ! command_exists "$cmd"; then
        echo -e "${RED}❌ Required command '$cmd' is not available.${NC}"
        if [ -n "$guidance" ]; then
            echo -e "${YELLOW}💡 $guidance${NC}"
        fi
        exit 1
    fi
}

port_in_use() {
    lsof -Pi :"$1" -sTCP:LISTEN -t >/dev/null 2>&1
}

stop_process_on_port() {
    local port=$1
    local service_name=$2

    if port_in_use "$port"; then
        echo -e "${YELLOW}⚠️  Port $port is in use. Stopping existing $service_name...${NC}"
        local pids
        pids=$(lsof -ti :"$port" || true)
        if [ -n "$pids" ]; then
            echo -e "${BLUE}🛑 Killing processes: $pids${NC}"
            echo "$pids" | xargs -I {} kill {} >/dev/null 2>&1 || true
            sleep 2
        fi

        if port_in_use "$port"; then
            echo -e "${RED}❌ Unable to free port $port for $service_name.${NC}"
            exit 1
        fi

        echo -e "${GREEN}✅ Port $port is now free for $service_name${NC}"
    fi
}

wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=${3:-30}

    echo -e "${YELLOW}⏳ Waiting for $service_name to become available...${NC}"
    for attempt in $(seq 1 "$max_attempts"); do
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts - still waiting for $service_name...${NC}"
        sleep 2
    done

    echo -e "${RED}❌ $service_name failed to respond at $url${NC}"
    return 1
}

to_lower() {
    echo "$1" | tr '[:upper:]' '[:lower:]'
}

normalize_bool() {
    local value=$(to_lower "$1")
    case "$value" in
        true|1|yes|y) echo "true" ;;
        *) echo "false" ;;
    esac
}

# Prefer Homebrew PostgreSQL binaries if they exist
if ! command_exists psql && [ -d "/opt/homebrew/opt/postgresql@14/bin" ]; then
    export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"
fi

FRONTEND_PORT="${FRONTEND_PORT:-4200}"
API_PORT="${PORT:-3000}"
FORM_BUILDER_PORT="${FORM_BUILDER_PORT:-4201}"
PGWEB_PORT="${PGWEB_PORT:-8080}"

ENV_FILE="${ENV_FILE:-.env.development}"
if [ -f "$ROOT_DIR/$ENV_FILE" ]; then
    echo -e "${BLUE}🧾 Loading environment variables from $ENV_FILE${NC}"
    set -a
    # shellcheck disable=SC1090
    source "$ROOT_DIR/$ENV_FILE"
    set +a
else
    echo -e "${YELLOW}⚠️  No environment file found at $ENV_FILE. Using built-in defaults.${NC}"
fi

FRONTEND_PORT="${FRONTEND_PORT:-4200}"
API_PORT="${PORT:-3000}"
FORM_BUILDER_PORT="${FORM_BUILDER_PORT:-4201}"
PGWEB_PORT="${PGWEB_PORT:-8080}"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-nodeangularfullstack}"
DB_USER="${DB_USER:-dbuser}"
DB_PASSWORD="${DB_PASSWORD:-dbpassword}"

PGWEB_AUTH_USER="${PGWEB_AUTH_USER:-admin}"
PGWEB_AUTH_PASS="${PGWEB_AUTH_PASS:-development-password}"
PGWEB_READ_ONLY="$(normalize_bool "${PGWEB_READ_ONLY:-false}")"
PGWEB_SESSIONS="$(normalize_bool "${PGWEB_SESSIONS:-true}")"
PGWEB_CORS_ORIGIN="${PGWEB_CORS_ORIGIN:-http://localhost:4200}"

PGWEB_DATABASE_URL="${PGWEB_DATABASE_URL:-}"
if [ -z "$PGWEB_DATABASE_URL" ]; then
    PGWEB_DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"
fi

echo ""
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
ensure_command node "Install Node.js 20+ from https://nodejs.org/"
ensure_command npm "Install Node.js which bundles npm"
ensure_command psql "Install PostgreSQL (e.g., brew install postgresql@14)"
ensure_command pgweb "Install pgweb (e.g., brew install pgweb)"

if ! command_exists ng; then
    echo -e "${YELLOW}⚠️  Angular CLI not found. Installing globally...${NC}"
    npm install -g @angular/cli >/dev/null 2>&1
fi

echo -e "${BLUE}📡 Verifying PostgreSQL connectivity...${NC}"
POSTGRES_CHECK="false"
for attempt in $(seq 1 10); do
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
        POSTGRES_CHECK="true"
        break
    fi
    echo -e "${YELLOW}   Attempt $attempt/10 - waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}...${NC}"
    sleep 2
done

if [ "$POSTGRES_CHECK" != "true" ]; then
    echo -e "${RED}❌ Unable to connect to PostgreSQL using the provided credentials.${NC}"
    echo -e "${YELLOW}   Host: $DB_HOST${NC}"
    echo -e "${YELLOW}   Port: $DB_PORT${NC}"
    echo -e "${YELLOW}   Database: $DB_NAME${NC}"
    echo -e "${YELLOW}   User: $DB_USER${NC}"
    echo ""
    echo -e "${YELLOW}💡 Ensure PostgreSQL is running (e.g., brew services start postgresql@14) and that the user/database exist.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL connection verified${NC}"

stop_process_on_port "$API_PORT" "Backend API"
stop_process_on_port "$FRONTEND_PORT" "Frontend Angular"
stop_process_on_port "$FORM_BUILDER_PORT" "Form Builder UI"
stop_process_on_port "$PGWEB_PORT" "pgWeb"

echo -e "${BLUE}🔧 Preparing backend dependencies...${NC}"
if [ ! -d "apps/api/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    npm --workspace=apps/api install
fi

echo -e "${BLUE}🗄️  Running database migrations...${NC}"
npm --workspace=apps/api run db:migrate

echo -e "${BLUE}🌱 Seeding database with development data...${NC}"
npm --workspace=apps/api run db:seed

echo -e "${BLUE}🔧 Starting backend API server...${NC}"
npm --workspace=apps/api run dev > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > .backend.pid

wait_for_service "http://localhost:${API_PORT}/health" "Backend API"

echo -e "${BLUE}🌐 Starting pgWeb database UI...${NC}"
PGWEB_CMD=(pgweb "--bind" "127.0.0.1" "--listen" ":${PGWEB_PORT}" "--url" "$PGWEB_DATABASE_URL" "--cors-origin" "$PGWEB_CORS_ORIGIN")
if [ -n "$PGWEB_AUTH_USER" ] && [ -n "$PGWEB_AUTH_PASS" ]; then
    PGWEB_CMD+=("--auth-user" "$PGWEB_AUTH_USER" "--auth-pass" "$PGWEB_AUTH_PASS")
fi
if [ "$PGWEB_READ_ONLY" = "true" ]; then
    PGWEB_CMD+=("--readonly")
fi
if [ "$PGWEB_SESSIONS" != "true" ]; then
    PGWEB_CMD+=("--no-sessions")
fi

"${PGWEB_CMD[@]}" > "$LOG_DIR/pgweb.log" 2>&1 &
PGWEB_PID=$!
echo $PGWEB_PID > .pgweb.pid

wait_for_service "http://localhost:${PGWEB_PORT}" "pgWeb"

echo -e "${BLUE}🌐 Preparing frontend Angular application...${NC}"
if [ ! -d "apps/web/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm --workspace=apps/web install
fi

echo -e "${BLUE}🚀 Starting Angular development server...${NC}"
npm --workspace=apps/web run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > .frontend.pid

wait_for_service "http://localhost:${FRONTEND_PORT}" "Frontend Angular"

echo -e "${BLUE}🌐 Preparing Form Builder UI application...${NC}"
if [ ! -d "apps/form-builder-ui/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Form Builder UI dependencies...${NC}"
    npm --workspace=apps/form-builder-ui install
fi

echo -e "${BLUE}🚀 Starting Form Builder UI development server...${NC}"
npm --workspace=apps/form-builder-ui run dev > "$LOG_DIR/form-builder-ui.log" 2>&1 &
FORM_BUILDER_PID=$!
echo $FORM_BUILDER_PID > .form-builder-ui.pid

wait_for_service "http://localhost:${FORM_BUILDER_PORT}" "Form Builder UI"

echo ""
echo -e "${GREEN}🎉 SUCCESS! Local development environment is ready${NC}"
echo "=================================================="
echo -e "${BLUE}📋 Service URLs:${NC}"
echo -e "   Main App (Angular):     ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "   Form Builder UI:        ${GREEN}http://localhost:${FORM_BUILDER_PORT}${NC}"
echo -e "   Backend API:            ${GREEN}http://localhost:${API_PORT}${NC}"
echo -e "   API Docs:               ${GREEN}http://localhost:${API_PORT}/api-docs${NC}"
echo -e "   pgWeb (Database UI):    ${GREEN}http://localhost:${PGWEB_PORT}${NC}"
echo -e "   API Health Check:       ${GREEN}http://localhost:${API_PORT}/health${NC}"
echo ""
echo -e "${BLUE}🧪 Test User Credentials:${NC}"
echo -e "   Admin:    ${YELLOW}admin@example.com${NC} / ${YELLOW}Admin123!@#${NC}"
echo -e "   User:     ${YELLOW}user@example.com${NC} / ${YELLOW}User123!@#${NC}"
echo -e "   ReadOnly: ${YELLOW}readonly@example.com${NC} / ${YELLOW}Read123!@#${NC}"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "   Backend:          ${YELLOW}logs/backend.log${NC}"
echo -e "   Main App:         ${YELLOW}logs/frontend.log${NC}"
echo -e "   Form Builder UI:  ${YELLOW}logs/form-builder-ui.log${NC}"
echo -e "   pgWeb:            ${YELLOW}logs/pgweb.log${NC}"
echo ""
echo -e "${BLUE}🔗 SSO Multi-Tenant Architecture:${NC}"
echo -e "   ${YELLOW}Main App → Form Builder${NC} (SSO enabled via JWT token passing)"
echo -e "   Click 'Form Builder' in navigation to test SSO authentication"
echo ""
echo -e "${YELLOW}💡 To stop all services, run: ${NC}./stop-dev.sh"
echo -e "${GREEN}🚀 Happy coding without Docker!${NC}"
