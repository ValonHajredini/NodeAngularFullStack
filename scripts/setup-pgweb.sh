#!/bin/bash

# pgWeb Database Management Setup Script
# This script sets up and starts the pgWeb container for database management

set -e

echo "🔧 Setting up pgWeb Database Management Interface..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose could not be found. Please install docker-compose."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found. Please create one with the required pgWeb variables."
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=("PGWEB_AUTH_USER" "PGWEB_AUTH_PASS" "PGWEB_DATABASE_URL")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set in .env file"
        exit 1
    fi
done

print_status "Starting PostgreSQL database..."
docker-compose up -d postgres

print_status "Waiting for PostgreSQL to be ready..."
timeout=60
counter=0
while ! docker-compose exec postgres pg_isready -U dbuser -d nodeangularfullstack > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        print_error "PostgreSQL failed to start within $timeout seconds"
        exit 1
    fi
    sleep 1
    ((counter++))
done

print_success "PostgreSQL is ready!"

print_status "Starting pgWeb container..."
docker-compose up -d pgweb

print_status "Waiting for pgWeb to be ready..."
counter=0
while ! curl -s http://localhost:8081/api/info > /dev/null 2>&1; do
    if [ $counter -ge 30 ]; then
        print_error "pgWeb failed to start within 30 seconds"
        exit 1
    fi
    sleep 1
    ((counter++))
done

print_success "pgWeb Database Management Interface is now running!"
echo ""
echo "🌐 Access pgWeb at: http://localhost:8081"
echo "👤 Username: $PGWEB_AUTH_USER"
echo "🔑 Password: $PGWEB_AUTH_PASS"
echo ""
echo "📊 Database Connection:"
echo "   - Host: postgres"
echo "   - Database: nodeangularfullstack"
echo "   - User: dbuser"
echo ""
echo "🔍 Available Features:"
echo "   - Browse database schema and tables"
echo "   - Execute SQL queries with syntax highlighting"
echo "   - Export data in CSV, JSON, SQL formats"
echo "   - View table relationships and indexes"
echo "   - Manage user data and roles"
echo ""
echo "🛑 To stop pgWeb: docker-compose stop pgweb"
echo "🔄 To restart pgWeb: docker-compose restart pgweb"
echo "📋 To view logs: docker-compose logs pgweb"