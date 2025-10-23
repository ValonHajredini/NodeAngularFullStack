# Microservices POC Testing Guide

This guide walks through testing the Links Service microservice proof-of-concept.

## Prerequisites

- Docker Desktop running
- Platform Service (monolith) running on port 3000
- JWT token from Platform Service for API authentication

## Quick Start

### 1. Start the POC

```bash
./start-poc.sh
```

This will:

- Build the Links Service Docker image
- Start Links Database (PostgreSQL on port 5435)
- Start Links API (port 3003)
- Start API Gateway (Nginx on port 8080)
- Run database migrations
- Seed test data

### 2. Verify Services Are Running

```bash
# Check API Gateway health
curl http://localhost:8080/health

# Check Links Service health
curl http://localhost:3003/health

# View Docker containers
docker ps
```

Expected output:

```
CONTAINER ID   IMAGE             STATUS         PORTS
xxxxxxxxx      links-api         Up 10 seconds  0.0.0.0:3003->3003/tcp
xxxxxxxxx      postgres:15       Up 10 seconds  0.0.0.0:5435->5432/tcp
xxxxxxxxx      nginx:1.25        Up 10 seconds  0.0.0.0:8080->80/tcp
```

## Testing Workflow

### Step 1: Get JWT Token from Platform Service

First, log in to the Platform Service to get a JWT token:

```bash
# Login to Platform Service (monolith)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!@#"
  }'
```

Response:

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "8941f3c2-a64d-4eb0-b22b-58caedcc4697",
    "email": "admin@example.com"
  }
}
```

**Copy the token value** - you'll use it in the next steps.

### Step 2: Generate a Short Link

```bash
# Replace YOUR_JWT_TOKEN with the token from Step 1
TOKEN="YOUR_JWT_TOKEN"

curl -X POST http://localhost:8080/api/links/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "originalUrl": "https://example.com/my-long-url-here",
    "resourceType": "generic",
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

Expected response:

```json
{
  "message": "Short link created successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "8941f3c2-a64d-4eb0-b22b-58caedcc4697",
    "resourceType": "generic",
    "originalUrl": "https://example.com/my-long-url-here",
    "shortCode": "aB3xY9z2",
    "expiresAt": "2025-12-31T23:59:59.000Z",
    "clickCount": 0,
    "shortUrl": "http://localhost:8080/aB3xY9z2",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

**Note the `shortCode` value** - this is your generated short link.

### Step 3: Test Public Redirect

Open your browser or use curl:

```bash
# Replace SHORT_CODE with the value from Step 2
curl -L http://localhost:8080/SHORT_CODE
```

This should redirect you to the original URL and track analytics.

### Step 4: Get Your Short Links

```bash
curl http://localhost:8080/api/links/me \
  -H "Authorization: Bearer $TOKEN"
```

Response:

```json
{
  "message": "Links retrieved successfully",
  "data": [
    {
      "id": "...",
      "shortCode": "aB3xY9z2",
      "originalUrl": "https://example.com/my-long-url-here",
      "clickCount": 1,
      "createdAt": "2025-10-23T18:45:00.000Z"
    }
  ]
}
```

### Step 5: View Analytics

```bash
# Replace LINK_ID with the id from Step 2
curl http://localhost:8080/api/links/LINK_ID/analytics \
  -H "Authorization: Bearer $TOKEN"
```

Response:

```json
{
  "message": "Analytics retrieved successfully",
  "data": {
    "totalClicks": 1,
    "uniqueVisitors": 1,
    "clicksByDevice": {
      "desktop": 1
    },
    "clicksByCountry": {},
    "recentClicks": [
      {
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "deviceType": "desktop",
        "browser": "Chrome",
        "os": "Windows",
        "accessedAt": "2025-10-23T18:46:00.000Z"
      }
    ]
  }
}
```

### Step 6: Update Short Link

```bash
# Update expiration date
curl -X PATCH http://localhost:8080/api/links/LINK_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```

### Step 7: Delete Short Link

```bash
curl -X DELETE http://localhost:8080/api/links/LINK_ID \
  -H "Authorization: Bearer $TOKEN"
```

## Testing Microservices Architecture Features

### Database Isolation

Verify the Links Service has its own database:

```bash
# Connect to Links Database
docker exec -it links-db psql -U dbuser -d links_db

# Inside psql:
\dt              # List tables (should see short_links, click_analytics)
SELECT COUNT(*) FROM short_links;
\q               # Exit
```

### Service-to-Service Communication

The Links Service validates JWT tokens by calling the Platform Service:

```bash
# This happens automatically when you make authenticated requests
# You can view the logs to see the service-to-service calls:
docker-compose -f docker-compose.poc.yml logs links-api | grep "Platform"
```

### API Gateway Routing

The Nginx API Gateway routes requests to different services:

```bash
# Platform Service route (auth)
curl http://localhost:8080/api/auth/health

# Links Service route
curl http://localhost:8080/api/links/me \
  -H "Authorization: Bearer $TOKEN"

# Public redirect route (regex pattern matching)
curl -L http://localhost:8080/aB3xY9z2
```

## Running Tests

### Unit Tests

```bash
cd apps/links-api
npm run test:unit
```

### Integration Tests

```bash
# Make sure POC is running first
npm run test:integration
```

### Full Test Suite with Coverage

```bash
npm run test:coverage
```

## Troubleshooting

### Platform Service Not Available

**Error:** "Authentication service unavailable (503)"

**Solution:** Ensure Platform Service is running on port 3000:

```bash
# In a separate terminal
npm --workspace=apps/api run dev
```

### Database Connection Failed

**Error:** "Failed to connect to database"

**Solution:** Restart the database container:

```bash
docker-compose -f docker-compose.poc.yml restart links-db
sleep 5
docker exec -it links-api npm run db:migrate
```

### Port Already in Use

**Error:** "Port 3003 already in use"

**Solution:** Stop any existing services:

```bash
lsof -i :3003
# Kill the process or change PORT in docker-compose.poc.yml
```

### Invalid JWT Token

**Error:** "Unauthorized: Invalid or expired token (401)"

**Solutions:**

1. Get a fresh token from Platform Service (tokens expire after 1 hour)
2. Verify SERVICE_AUTH_TOKEN matches in both services
3. Check Platform Service logs for auth validation errors

## Comparing Monolith vs Microservices

### Monolith Approach (Current)

```bash
# Single database query
curl http://localhost:3000/api/short-links/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"originalUrl": "https://example.com"}'
```

### Microservices Approach (POC)

```bash
# Routed through API Gateway to Links Service
curl http://localhost:8080/api/links/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"originalUrl": "https://example.com"}'

# Different port, different database, different service
```

## Architecture Validation Checklist

- ✅ **Database Isolation**: Links Service has its own PostgreSQL instance
- ✅ **Service-to-Service Auth**: Links Service validates tokens via Platform Service
- ✅ **API Gateway**: Nginx routes requests to appropriate services
- ✅ **Independent Deployment**: Links Service can be deployed separately
- ✅ **Health Checks**: Each service has independent health endpoints
- ✅ **Docker Containerization**: Services run in isolated containers
- ✅ **Test Coverage**: Unit and integration tests pass independently

## Next Steps After POC Validation

If the POC demonstrates successful microservices architecture:

1. **Extract Forms Service**: Forms, form schemas, submissions
2. **Extract SVG Service**: Drawing tools, templates
3. **Implement Service Discovery**: Consul or Eureka for dynamic service registration
4. **Add Distributed Tracing**: Jaeger for request tracking across services
5. **Implement Event Bus**: RabbitMQ or Kafka for async communication
6. **Set Up Monitoring**: Prometheus + Grafana for metrics
7. **Configure CI/CD**: Separate pipelines for each service

## Cleanup

```bash
# Stop services (keeps data)
./stop-poc.sh

# Stop services and remove volumes (deletes data)
docker-compose -f docker-compose.poc.yml down -v

# Remove Docker images
docker rmi nodeangularfullstack-links-api
```

## Questions to Answer During POC

1. **Performance**: Is the network overhead acceptable? (measure latency)
2. **Complexity**: Is the added complexity worth the benefits?
3. **Development**: Can the team effectively manage multiple services?
4. **Deployment**: Are we ready for Docker orchestration (Kubernetes)?
5. **Cost**: Can we afford 3x infrastructure increase?
6. **Monitoring**: Do we have tools to monitor distributed systems?
7. **Debugging**: Can we trace requests across services?

## Success Metrics

- ✅ All API endpoints respond correctly
- ✅ JWT authentication works via Platform Service
- ✅ Analytics tracking functions properly
- ✅ QR code generation works
- ✅ Expiration logic functions correctly
- ✅ Database isolation verified
- ✅ Unit tests pass (≥90% coverage)
- ✅ Integration tests pass
- ✅ No breaking changes to existing functionality

---

**For questions or issues, refer to:**

- Links Service README: `apps/links-api/README.md`
- Microservices Conversion Doc: `convert_to_microservices_doc.md`
- Implementation Plan: `microservices_implementation_plan.md`
