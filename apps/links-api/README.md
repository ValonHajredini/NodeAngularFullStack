# Links Service - Microservice POC

This is a proof-of-concept microservice for short link management, extracted from the
NodeAngularFullStack monolith. It demonstrates the microservices architecture pattern with isolated
database and service-to-service communication.

## Features

- ✅ Short link generation with QR codes
- ✅ Click analytics tracking
- ✅ Token-based authentication via Platform Service
- ✅ Expiration date support
- ✅ Resource type support (forms, surveys, SVG, generic)
- ✅ Database-per-service pattern
- ✅ Docker containerization
- ✅ Nginx API Gateway integration

## Architecture

```
Client (Frontend)
    ↓
Nginx API Gateway (:8080)
    ↓
Links Service (:3003) ← → Links Database (:5435)
    ↓ (Auth validation)
Platform Service (:3000)
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+ (for local development)

### Local Development (without Docker)

1. **Install dependencies:**

   ```bash
   cd apps/links-api
   npm install
   ```

2. **Set up environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Create database:**

   ```bash
   createdb links_db
   ```

4. **Run migrations:**

   ```bash
   npm run db:migrate
   ```

5. **Seed test data:**

   ```bash
   npm run db:seed
   ```

6. **Start the service:**
   ```bash
   npm run dev
   ```

The service will be available at http://localhost:3003

### Docker Development (POC environment)

1. **Start the entire POC stack:**
   ```bash
   docker-compose -f docker-compose.poc.yml up -d
   ```

This starts:

- Links Service (API) on port 3003
- Links Database (PostgreSQL) on port 5435
- API Gateway (Nginx) on port 8080

2. **Run migrations inside Docker:**

   ```bash
   docker exec -it links-api npm run db:migrate
   docker exec -it links-api npm run db:seed
   ```

3. **View logs:**

   ```bash
   docker-compose -f docker-compose.poc.yml logs -f links-api
   ```

4. **Stop the stack:**
   ```bash
   docker-compose -f docker-compose.poc.yml down
   ```

## API Endpoints

### Protected Endpoints (require JWT token)

**Generate Short Link**

```http
POST http://localhost:8080/api/links/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "originalUrl": "https://example.com/long-url",
  "resourceType": "form",
  "resourceId": "uuid-here",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Get User's Links**

```http
GET http://localhost:8080/api/links/me
Authorization: Bearer <token>
```

**Get Link Analytics**

```http
GET http://localhost:8080/api/links/{id}/analytics
Authorization: Bearer <token>
```

**Update Link**

```http
PATCH http://localhost:8080/api/links/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "expiresAt": "2026-01-31T23:59:59Z"
}
```

**Delete Link**

```http
DELETE http://localhost:8080/api/links/{id}
Authorization: Bearer <token>
```

### Public Endpoints (no authentication)

**Redirect Short Link**

```http
GET http://localhost:8080/{shortCode}
```

This redirects to the original URL and tracks analytics.

## Testing

**Run unit tests:**

```bash
npm run test:unit
```

**Run integration tests:**

```bash
npm run test:integration
```

**Run all tests with coverage:**

```bash
npm run test:coverage
```

## Database Schema

### short_links table

- `id` (UUID, primary key)
- `user_id` (UUID, references platform service users)
- `resource_type` (enum: form, survey, svg, generic)
- `resource_id` (UUID, nullable)
- `original_url` (text)
- `short_code` (varchar(10), unique)
- `token` (varchar(255), nullable)
- `expires_at` (timestamp, nullable)
- `click_count` (integer)
- `last_accessed_at` (timestamp)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### click_analytics table

- `id` (UUID, primary key)
- `short_link_id` (UUID, foreign key)
- `ip_address` (varchar(45))
- `user_agent` (text)
- `referrer` (text)
- `country_code` (varchar(2))
- `city` (varchar(100))
- `device_type` (enum: desktop, mobile, tablet, bot, unknown)
- `browser` (varchar(50))
- `os` (varchar(50))
- `accessed_at` (timestamp)

## Service Integration

This service communicates with the Platform Service for authentication validation:

```typescript
// Platform Service must implement this endpoint:
POST /api/auth/validate
Headers: X-Service-Token: <service-token>
Body: { "token": "<user-jwt-token>" }

Response: {
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

## Environment Variables

| Variable                  | Description                  | Default                 |
| ------------------------- | ---------------------------- | ----------------------- |
| `PORT`                    | Service port                 | `3003`                  |
| `NODE_ENV`                | Environment                  | `development`           |
| `DB_HOST`                 | Database host                | `localhost`             |
| `DB_PORT`                 | Database port                | `5435`                  |
| `DB_NAME`                 | Database name                | `links_db`              |
| `DB_USER`                 | Database user                | `dbuser`                |
| `DB_PASSWORD`             | Database password            | `dbpassword`            |
| `PLATFORM_API_URL`        | Platform service URL         | `http://localhost:3000` |
| `SERVICE_AUTH_TOKEN`      | Service authentication token | (required)              |
| `BASE_URL`                | Base URL for short links     | `http://localhost:3003` |
| `SHORT_CODE_LENGTH`       | Length of generated codes    | `8`                     |
| `DEFAULT_EXPIRATION_DAYS` | Default expiration           | `90`                    |
| `CORS_ORIGIN`             | CORS origin                  | `http://localhost:4200` |

## Project Structure

```
apps/links-api/
├── src/
│   ├── config/           # Database and app configuration
│   ├── controllers/      # HTTP request handlers
│   ├── middleware/       # Auth and error middleware
│   ├── repositories/     # Data access layer
│   ├── routes/           # Route definitions
│   ├── services/         # Business logic layer
│   ├── types/            # TypeScript type definitions
│   └── server.ts         # Express app entry point
├── database/
│   ├── migrations/       # SQL migration files
│   └── seeds/            # Test data seeding
├── tests/
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── Dockerfile            # Docker image definition
├── package.json
├── tsconfig.json
└── README.md
```

## Development Notes

### Code Quality

- Run `npm run lint` before committing
- Run `npm run typecheck` to catch type errors
- Maintain ≥90% test coverage

### Database Migrations

- Add new migrations with sequential numbering (002*\*, 003*\*, etc.)
- Never modify existing migration files
- Test migrations with both `migrate` and `rollback`

### Authentication

- Always validate JWT tokens via Platform Service
- Include `X-Service-Token` header for service-to-service calls
- Handle auth failures gracefully (401, 403, 503)

### Performance

- Connection pool size: 20 connections
- Request timeouts: 30 seconds
- Rate limiting: 10 requests/second per IP

## Troubleshooting

**Database connection failed:**

```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.poc.yml ps

# View database logs
docker-compose -f docker-compose.poc.yml logs links-db

# Restart database
docker-compose -f docker-compose.poc.yml restart links-db
```

**Auth validation fails:**

```bash
# Check if Platform Service is running
curl http://localhost:3000/health

# Verify SERVICE_AUTH_TOKEN matches Platform Service configuration
```

**Port already in use:**

```bash
# Check what's using the port
lsof -i :3003

# Kill the process or change PORT in .env
```

## Next Steps (Phase 1)

After validating this POC:

1. Extract Forms Service (forms, form_schemas, form_submissions)
2. Extract SVG Service (svg drawings)
3. Implement service discovery (Consul/Eureka)
4. Add distributed tracing (Jaeger)
5. Implement event bus (RabbitMQ/Kafka)
6. Set up centralized logging (ELK stack)

## License

See main project LICENSE file.
