# API Documentation

## Overview

The NodeAngularFullStack API provides a comprehensive RESTful interface for authentication, user
management, and multi-tenant operations. This documentation covers all available endpoints,
authentication patterns, and extension guidelines.

## Quick Start

### Base URL

- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://your-api-domain.com/api/v1`

### Authentication

All protected endpoints require a JWT Bearer token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### Interactive API Documentation

Visit the Swagger UI interface:

- **Development**: `http://localhost:3000/api/docs`
- **Production**: `https://your-api-domain.com/api/docs`

## Table of Contents

1. [Authentication Endpoints](./authentication.md)
   - Registration, Login, Token Management
   - Password Reset Flow
   - Profile Management

2. [User Management](./user-management.md)
   - User CRUD Operations
   - Role-Based Access Control
   - Pagination and Filtering

3. [Health Check Endpoints](./health-checks.md)
   - Application Health
   - Kubernetes Probes
   - Database Connectivity

4. [Error Handling](./error-handling.md)
   - Error Response Format
   - Status Codes
   - Troubleshooting Guide

5. [Adding New Endpoints](./adding-endpoints.md)
   - Step-by-Step Guide
   - Code Examples
   - Best Practices

6. [Multi-Tenancy](./multi-tenancy.md)
   - Tenant Isolation
   - Configuration Options
   - Implementation Patterns

7. [Rate Limiting](./rate-limiting.md)
   - Limits and Quotas
   - Headers and Responses
   - Bypass Options

8. [API Examples](./examples.md)
   - Complete Workflows
   - Code Samples
   - SDK Usage

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "value": "invalid-email",
      "constraint": "must be a valid email address"
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789"
  }
}
```

### Pagination Response

```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789"
  }
}
```

## HTTP Status Codes

| Code | Description           | Usage                                             |
| ---- | --------------------- | ------------------------------------------------- |
| 200  | OK                    | Successful GET, PATCH, PUT requests               |
| 201  | Created               | Successful POST requests                          |
| 204  | No Content            | Successful DELETE requests                        |
| 400  | Bad Request           | Invalid request data or parameters                |
| 401  | Unauthorized          | Authentication required or invalid token          |
| 403  | Forbidden             | Valid authentication but insufficient permissions |
| 404  | Not Found             | Resource not found                                |
| 409  | Conflict              | Resource already exists (e.g., duplicate email)   |
| 422  | Unprocessable Entity  | Valid request format but semantic errors          |
| 429  | Too Many Requests     | Rate limit exceeded                               |
| 500  | Internal Server Error | Unexpected server error                           |

## Common Headers

### Request Headers

```
Content-Type: application/json
Authorization: Bearer <jwt-token>
X-Request-ID: <unique-request-id>
X-Tenant-ID: <tenant-id> (for multi-tenant mode)
```

### Response Headers

```
Content-Type: application/json
X-Request-ID: <unique-request-id>
X-Rate-Limit-Remaining: <requests-remaining>
X-Rate-Limit-Reset: <reset-timestamp>
```

## Getting Started Examples

### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### 2. Login and Get Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Access Protected Endpoint

```bash
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer <your-jwt-token>"
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { ApiClient } from '@your-org/api-client';

const client = new ApiClient({
  baseURL: 'http://localhost:3000/api/v1',
  apiKey: 'your-api-key',
});

// Register user
const user = await client.auth.register({
  email: 'user@example.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
});

// Login
const session = await client.auth.login({
  email: 'user@example.com',
  password: 'SecurePass123!',
});

// Set token for subsequent requests
client.setToken(session.accessToken);

// Get user profile
const profile = await client.auth.getProfile();
```

### Python

```python
import requests

base_url = "http://localhost:3000/api/v1"

# Register user
response = requests.post(f"{base_url}/auth/register", json={
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
})
user = response.json()

# Login
response = requests.post(f"{base_url}/auth/login", json={
    "email": "user@example.com",
    "password": "SecurePass123!"
})
session = response.json()

# Set headers for authenticated requests
headers = {
    "Authorization": f"Bearer {session['accessToken']}"
}

# Get user profile
response = requests.get(f"{base_url}/auth/profile", headers=headers)
profile = response.json()
```

## Environment Variables

### Required Configuration

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/database
DATABASE_SSL=false

# JWT Configuration
JWT_SECRET=your-256-bit-secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # requests per window

# CORS
CORS_ORIGINS=http://localhost:4200,https://yourdomain.com

# Optional: Multi-tenancy
MULTI_TENANT_MODE=false
DEFAULT_TENANT_ID=default

# Optional: External Services
SENDGRID_API_KEY=your-sendgrid-key
REDIS_URL=redis://localhost:6379
```

## Testing

### Running API Tests

```bash
# Unit tests
npm run test:api

# Integration tests
npm run test:api:integration

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

### Test Data Setup

```bash
# Seed test data
npm run db:seed:test

# Reset test database
npm run db:reset:test
```

## Monitoring and Debugging

### Health Check

```bash
curl http://localhost:3000/api/v1/health
```

### Debug Mode

Set `LOG_LEVEL=debug` in environment variables to enable detailed logging.

### Request Tracing

Include `X-Request-ID` header for request tracing across logs.

## Support

- **Documentation**: [Full API Documentation](./README.md)
- **OpenAPI Spec**: `/api/docs` endpoint
- **Issues**: [GitHub Issues](https://github.com/your-org/your-repo/issues)
- **Support Email**: support@your-domain.com

## Version History

| Version | Date       | Changes                         |
| ------- | ---------- | ------------------------------- |
| 1.0.0   | 2024-01-15 | Initial API release             |
| 1.1.0   | 2024-02-01 | Added user management endpoints |
| 1.2.0   | 2024-03-01 | Enhanced authentication flow    |
