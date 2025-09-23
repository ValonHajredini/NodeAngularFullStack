# Development Environment Setup Guide

This guide provides commands to run the database, backend, and frontend services separately for the
NodeAngularFullStack project.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (installed via Homebrew)
- npm

## 1. PostgreSQL Database

### Start PostgreSQL Service

```bash
brew services start postgresql@14
```

### Stop PostgreSQL Service

```bash
brew services stop postgresql@14
```

### Check PostgreSQL Status

```bash
brew services list | grep postgresql
```

### Connect to PostgreSQL (for debugging)

```bash
psql -U dbuser -d nodeangularfullstack -h localhost
# Password: dbpassword
```

### Verify Database Connection

```bash
PGPASSWORD=dbpassword psql -h localhost -U dbuser -d nodeangularfullstack -c '\conninfo'
```

## 2. Backend API (Express.js)

### Navigate to Backend Directory

```bash
cd apps/api
```

### Install Dependencies (first time only)

```bash
npm install
```

### Run Database Migrations

```bash
npm run db:migrate
```

### Seed Database with Test Data

```bash
npm run db:seed
```

### Start Backend Development Server

```bash
npm run dev
```

The backend will run on: **http://localhost:3000**

### Alternative: Run from Project Root

```bash
# From project root directory
npm --workspace=apps/api run dev
```

### Other Backend Commands

```bash
# Reset database (clear and re-seed)
npm run db:reset

# Run tests
npm test

# Run linter
npm run lint

# Type checking
npm run typecheck
```

### API Documentation

Once the backend is running, access the Swagger documentation at: **http://localhost:3000/api-docs**

## 3. Frontend (Angular)

### Navigate to Frontend Directory

```bash
cd apps/web
```

### Install Dependencies (first time only)

```bash
npm install
```

### Start Frontend Development Server

```bash
npm run dev
```

The frontend will run on: **http://localhost:4200**

### Alternative: Run from Project Root

```bash
# From project root directory
npm --workspace=apps/web run dev
```

### Other Frontend Commands

```bash
# Build for production
npm run build

# Run tests
npm test

# Run linter
npm run lint

# Type checking
npm run typecheck
```

## 4. Quick Start - Run Everything

### Option A: Using Individual Commands (Recommended)

Open 3 terminal windows/tabs:

**Terminal 1 - PostgreSQL:**

```bash
brew services start postgresql@14
```

**Terminal 2 - Backend:**

```bash
cd apps/api
npm run db:migrate  # First time only
npm run db:seed     # First time only
npm run dev
```

**Terminal 3 - Frontend:**

```bash
cd apps/web
npm run dev
```

### Option B: Using Start Script

```bash
# From project root
./start-dev.sh
```

To stop all services:

```bash
./stop-dev.sh
```

## 5. Test Credentials

After seeding the database, you can login with these test accounts:

| Role     | Email                | Password    |
| -------- | -------------------- | ----------- |
| Admin    | admin@example.com    | Admin123!@# |
| User     | user@example.com     | User123!@#  |
| ReadOnly | readonly@example.com | Read123!@#  |

## 6. Environment Variables

The backend uses a `.env` file located at `apps/api/.env`. Key variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nodeangularfullstack
DB_USER=dbuser
DB_PASSWORD=dbpassword

# JWT
JWT_SECRET=development-jwt-secret-key-at-least-32-characters-long
JWT_REFRESH_SECRET=development-refresh-secret-key-at-least-32-characters-long
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Application
PORT=3000
FRONTEND_URL=http://localhost:4200
```

## 7. Troubleshooting

### Backend won't start

1. Check PostgreSQL is running: `brew services list | grep postgresql`
2. Verify `.env` file exists in `apps/api/`
3. Run migrations: `cd apps/api && npm run db:migrate`

### Database connection issues

```bash
# Test connection
PGPASSWORD=dbpassword psql -h localhost -U dbuser -d nodeangularfullstack -c 'SELECT 1'

# If database doesn't exist, create it:
createdb -h localhost -U dbuser nodeangularfullstack
```

### Port already in use

```bash
# Find process using port 3000 (backend)
lsof -i:3000

# Find process using port 4200 (frontend)
lsof -i:4200

# Kill process by PID
kill -9 <PID>
```

### Reset everything

```bash
# Stop all services
brew services stop postgresql@14
pkill -f "node"

# Start fresh
brew services start postgresql@14
cd apps/api && npm run db:reset && npm run dev
# In another terminal
cd apps/web && npm run dev
```

## 8. Service URLs

| Service      | URL                            | Description           |
| ------------ | ------------------------------ | --------------------- |
| Frontend     | http://localhost:4200          | Angular application   |
| Backend API  | http://localhost:3000          | Express.js REST API   |
| API Docs     | http://localhost:3000/api-docs | Swagger documentation |
| Health Check | http://localhost:3000/health   | API health status     |

---

**Note:** Always ensure PostgreSQL is running before starting the backend, and the backend is
running before using the frontend's API features.
