# Development Workflow

## Local Development Setup

### Prerequisites
```bash
# Required software
node --version  # v20.x or higher
npm --version   # v10.x or higher
docker --version # v24.x or higher
docker-compose --version # v2.x or higher

# Optional but recommended
git --version   # v2.x or higher
```

### Initial Setup
```bash
# Clone repository
git clone https://github.com/your-org/nodeangularfullstack.git
cd nodeangularfullstack

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start Docker services
docker-compose up -d

# Run database migrations
npm run migrate

# Seed initial data
npm run seed

# Start development servers
npm run dev
```

### Development Commands
```bash
# Start all services
npm run dev

# Start frontend only
npm run dev:web

# Start backend only
npm run dev:api

# Run tests
npm run test           # All tests
npm run test:web       # Frontend tests
npm run test:api       # Backend tests
npm run test:e2e       # E2E tests
```

## Environment Configuration

### Required Environment Variables
```bash
# Frontend (.env.local)
VITE_API_URL=http://localhost:3000/api/v1
VITE_ENVIRONMENT=development

# Backend (.env)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
ENABLE_MULTI_TENANCY=false

# Shared
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=debug
```
