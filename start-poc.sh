#!/bin/bash

# Start POC (Proof of Concept) - Links Service Microservices Demo
# This script starts the Links Service with its isolated database and API Gateway

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting Microservices POC - Links Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

# Install dependencies for links-api if needed
if [ ! -d "apps/links-api/node_modules" ]; then
    echo "📦 Installing dependencies for Links Service..."
    cd apps/links-api
    npm install
    cd ../..
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.poc.yml down -v > /dev/null 2>&1 || true

# Build and start containers
echo "🐳 Building and starting Docker containers..."
docker-compose -f docker-compose.poc.yml up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run database migrations
echo "📊 Running database migrations..."
docker exec -it links-api npm run db:migrate

# Seed test data
echo "🌱 Seeding test data..."
docker exec -it links-api npm run db:seed

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ POC Started Successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Services Running:"
echo "   • Links Service:    http://localhost:3003"
echo "   • Links Database:   localhost:5435"
echo "   • API Gateway:      http://localhost:8080"
echo ""
echo "🧪 Test Endpoints:"
echo "   • Health Check:     http://localhost:8080/health"
echo "   • Links Health:     http://localhost:3003/health"
echo ""
echo "📖 Next Steps:"
echo "   1. Ensure Platform Service is running (port 3000)"
echo "   2. Get JWT token from Platform Service"
echo "   3. Test generating short links via API Gateway"
echo ""
echo "💡 Useful Commands:"
echo "   • View logs:        docker-compose -f docker-compose.poc.yml logs -f"
echo "   • Stop services:    ./stop-poc.sh"
echo "   • Run tests:        cd apps/links-api && npm test"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
