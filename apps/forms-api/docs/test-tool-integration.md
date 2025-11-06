# Test Tool API Integration Guide

## ✅ Automatic Setup Complete

The following has been **automatically configured** for you:

### 1. Route Registration

**File:** `apps/api/src/server.ts`

```typescript
import { testToolRoutes } from './routes/test-tool.routes';

// In initializeRoutes():
this.app.use('/api/tools/test-tool', testToolRoutes);
```

### 2. Index Exports

All index files have been updated with proper exports:

- ✅ `apps/api/src/controllers/index.ts`
- ✅ `apps/api/src/services/index.ts`
- ✅ `apps/api/src/repositories/index.ts`
- ✅ `apps/api/src/validators/index.ts`
- ✅ `apps/api/src/routes/index.ts`
- ✅ `packages/shared/src/index.ts`

---

## 📋 Manual Steps Required

### Step 1: Database Migration

1. **Review the draft migration file:**

   ```bash
   cat apps/api/database/migrations/*test-tool*.draft
   ```

2. **Customize the migration** (optional):
   - Add/remove columns as needed
   - Adjust constraints and indexes
   - Modify default values

3. **Remove the .draft suffix:**

   ```bash
   cd apps/api/database/migrations
   mv *test-tool*.draft $(ls *test-tool*.draft | sed 's/.draft$//')
   ```

4. **Run the migration:**
   ```bash
   npm --workspace=apps/api run db:migrate
   ```

### Step 2: Build Shared Types

After modifying shared types, rebuild:

```bash
npm run build:shared
```

### Step 3: Restart API Server

```bash
npm --workspace=apps/api run dev
```

---

## 🔌 API Endpoints

Base URL: `/api/tools/test-tool`

| Method | Endpoint                   | Description               | Auth Required |
| ------ | -------------------------- | ------------------------- | ------------- |
| GET    | `/api/tools/test-tool`     | Get all Test Tool records | ✅ Yes        |
| GET    | `/api/tools/test-tool/:id` | Get Test Tool by ID       | ✅ Yes        |
| POST   | `/api/tools/test-tool`     | Create new Test Tool      | ✅ Yes        |
| PUT    | `/api/tools/test-tool/:id` | Update Test Tool          | ✅ Yes        |
| DELETE | `/api/tools/test-tool/:id` | Delete Test Tool          | ✅ Yes        |

---

## 🔐 Request Middleware Stack

Each request flows through:

1. **CORS** - Allow cross-origin requests
2. **Helmet** - Security headers
3. **Rate Limiting** - Prevent abuse (100 req/15min in prod)
4. **Body Parser** - Parse JSON request bodies (10MB limit)
5. **Auth Middleware** - Verify JWT token (routes marked with `authenticate`)
6. **Validation Middleware** - Validate request data using express-validator
7. **Controller** - Execute business logic
8. **Error Handler** - Catch and format errors

---

## 🧪 Testing with cURL

### 1. Get Authentication Token

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!@#"}' \
  | jq -r '.accessToken')

echo "Token: $TOKEN"
```

### 2. Test GET All

```bash
curl -X GET http://localhost:3000/api/tools/test-tool \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq
```

### 3. Test POST Create

```bash
curl -X POST http://localhost:3000/api/tools/test-tool \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Test Tool",
    "description": "This is a test record"
  }' \
  | jq
```

### 4. Test GET By ID

```bash
# Replace {id} with actual UUID from create response
curl -X GET http://localhost:3000/api/tools/test-tool/{id} \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

### 5. Test PUT Update

```bash
curl -X PUT http://localhost:3000/api/tools/test-tool/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Tool",
    "description": "Updated description"
  }' \
  | jq
```

### 6. Test DELETE

```bash
curl -X DELETE http://localhost:3000/api/tools/test-tool/{id} \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

---

## 📊 Request/Response Examples

### Create Request

```json
POST /api/tools/test-tool
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "My Test Tool",
  "description": "Description of the item"
}
```

### Create Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Test Tool",
    "description": "Description of the item",
    "status": "active",
    "settings": {},
    "createdBy": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "createdAt": "2025-10-25T12:00:00.000Z",
    "updatedAt": "2025-10-25T12:00:00.000Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Name must be at least 3 characters"
      }
    ]
  }
}
```

---

## 🛡️ Error Handling

The API uses standard HTTP status codes:

| Code | Meaning      | Example                  |
| ---- | ------------ | ------------------------ |
| 200  | Success      | GET, PUT successful      |
| 201  | Created      | POST successful          |
| 400  | Bad Request  | Validation failed        |
| 401  | Unauthorized | Missing or invalid JWT   |
| 403  | Forbidden    | Insufficient permissions |
| 404  | Not Found    | Resource doesn't exist   |
| 500  | Server Error | Unexpected error         |

---

## 🔍 Debugging

### Check if routes are registered:

```bash
# Start server and look for log message
npm --workspace=apps/api run dev

# Should see:
# 📐 Registering test-tool routes at /api/tools/test-tool
```

### Verify database table exists:

```bash
PGPASSWORD=yourpassword psql -h localhost -U youruser -d yourdb \
  -c "\d test_tool"
```

### Check logs:

```bash
# Server logs in console
# Look for route registration and request logs
```

---

## 📚 Next Steps

1. **Customize business logic** in `apps/api/src/services/test-tool.service.ts`
2. **Add custom validation** in `apps/api/src/validators/test-tool.validator.ts`
3. **Extend database schema** by modifying the migration file
4. **Write integration tests** in `apps/api/tests/integration/test-tool.test.ts`
5. **Update API documentation** in Swagger comments

---

## 🐛 Troubleshooting

### Routes not working?

- ✅ Check server.ts has the route registration
- ✅ Verify migration was run successfully
- ✅ Restart the API server
- ✅ Check for TypeScript compilation errors

### Database errors?

- ✅ Verify PostgreSQL is running
- ✅ Check database connection in .env
- ✅ Run migrations: `npm --workspace=apps/api run db:migrate`

### Type errors?

- ✅ Build shared types: `npm run build:shared`
- ✅ Restart TypeScript server in your IDE
- ✅ Check for circular dependencies

---

**Generated by @nodeangularfullstack/create-tool**
