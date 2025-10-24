#!/bin/bash

# Stop POC (Proof of Concept) - Links Service Microservices Demo

echo "🛑 Stopping Microservices POC..."

docker-compose -f docker-compose.poc.yml down

echo "✅ POC stopped successfully"
echo ""
echo "💡 To remove volumes (database data), run:"
echo "   docker-compose -f docker-compose.poc.yml down -v"
