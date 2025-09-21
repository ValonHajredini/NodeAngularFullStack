# Complete Developer Workflow Guide

This comprehensive guide covers the entire development workflow from project setup to deployment,
designed to help new developers achieve maximum productivity with the NodeAngularFullStack
boilerplate.

## 📋 Table of Contents

1. [Initial Setup](#initial-setup)
2. [Development Environment](#development-environment)
3. [Feature Development Workflow](#feature-development-workflow)
4. [Testing Strategy](#testing-strategy)
5. [Debugging Guide](#debugging-guide)
6. [Code Quality & Standards](#code-quality--standards)
7. [Git Workflow](#git-workflow)
8. [Deployment Process](#deployment-process)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

## 🚀 Initial Setup

### Prerequisites Checklist

Before starting development, ensure you have:

- [ ] **Node.js 18+** and **npm 9+**
- [ ] **Docker Desktop 24+** and **Docker Compose 2.23+** (recommended)
- [ ] **Git** configured with your credentials
- [ ] **PostgreSQL 15+** (if not using Docker)
- [ ] **Redis 7+** (if not using Docker)
- [ ] **IDE/Editor** with TypeScript support (VS Code recommended)

### Quick Setup Commands

```bash
# 1. Clone and enter project
git clone <repository-url>
cd nodeangularfullstack

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your configuration

# 4. Start development environment
npm start
# This starts Docker services, backend, and frontend

# 5. Verify setup
curl http://localhost:3000/health  # Backend health check
open http://localhost:4200         # Frontend application
```

### Environment Configuration

**Required Environment Variables:**

```bash
# Database
DATABASE_URL=postgresql://dbuser:dbpassword@localhost:5432/nodeangularfullstack
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# API Configuration
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:4200

# Development
NODE_ENV=development
LOG_LEVEL=debug
```

**Validation Script:**

```bash
# Validate your environment setup
node scripts/validate-environment.js
```

## 🏗️ Development Environment

### Service Architecture

The development environment consists of:

| Service     | URL                            | Purpose                |
| ----------- | ------------------------------ | ---------------------- |
| Frontend    | http://localhost:4200          | Angular application    |
| Backend API | http://localhost:3000          | Express.js API         |
| Database    | localhost:5432                 | PostgreSQL database    |
| Cache       | localhost:6379                 | Redis cache            |
| pgAdmin     | http://localhost:8080          | Database management UI |
| API Docs    | http://localhost:3000/api-docs | Swagger documentation  |

### Development Commands

```bash
# Start everything (recommended)
npm start                    # Starts all services

# Individual services
npm run dev:api             # Backend only
npm run dev:web             # Frontend only
npm run docker:up           # Docker services only

# Stop services
npm stop                    # Stop all services
npm run docker:down         # Stop Docker services

# Build commands
npm run build               # Build all applications
npm run build:api           # Build backend only
npm run build:web           # Build frontend only

# Testing commands
npm test                    # Run all tests
npm run test:api            # Backend tests
npm run test:web            # Frontend tests
npm run test:e2e            # End-to-end tests

# Code quality
npm run lint                # Lint all code
npm run lint:fix            # Fix linting issues
npm run typecheck           # TypeScript type checking
```

### IDE Configuration

**VS Code Extensions (Recommended):**

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "angular.ng-template",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

**VS Code Settings:**

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.component.html": "html"
  }
}
```

## 🔄 Feature Development Workflow

### Step-by-Step Feature Development

#### 1. Planning Phase

```bash
# Create feature branch
git checkout -b feature/user-management

# Review requirements
# Check if feature exists in docs/stories/
# Identify shared types needed
# Plan API endpoints and components
```

#### 2. Define Shared Types

```typescript
// packages/shared/src/types/user.types.ts
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'readonly';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'readonly';
  password: string;
}
```

#### 3. Backend Implementation

```bash
# Controller -> Service -> Repository pattern
mkdir -p apps/api/src/controllers
mkdir -p apps/api/src/services
mkdir -p apps/api/src/repositories
mkdir -p apps/api/src/validators

# Create files following naming conventions
touch apps/api/src/controllers/users.controller.ts
touch apps/api/src/services/users.service.ts
touch apps/api/src/repositories/users.repository.ts
touch apps/api/src/validators/users.validators.ts
touch apps/api/src/routes/users.routes.ts
```

#### 4. Frontend Implementation

```bash
# Feature-based structure
mkdir -p apps/web/src/app/features/users/{components,pages,services}
mkdir -p apps/web/src/app/features/users/components/{user-list,user-form}
mkdir -p apps/web/src/app/features/users/pages/{users-page,user-detail}

# Create files following naming conventions
touch apps/web/src/app/features/users/services/users.service.ts
touch apps/web/src/app/features/users/users.routes.ts
```

#### 5. Testing Implementation

```bash
# Backend tests
mkdir -p apps/api/tests/unit/services
mkdir -p apps/api/tests/integration/controllers

# Frontend tests
# Tests are co-located with components

# E2E tests
mkdir -p tests/e2e/features
```

### Development Best Practices

**Type Safety:**

- Always define types in `packages/shared` first
- Import shared types in both frontend and backend
- Use strict TypeScript configuration

**Error Handling:**

- Use `ApiError` class for backend errors
- Implement proper error interceptors in frontend
- Provide user-friendly error messages

**State Management:**

- Use Angular signals for reactive state
- Keep component state minimal
- Implement proper loading and error states

**API Design:**

- Follow REST conventions
- Use consistent response formats
- Implement proper HTTP status codes
- Add request/response validation

## 🧪 Testing Strategy

### Testing Pyramid

```
    /\
   /  \     E2E Tests (Few)
  /    \    Integration Tests (Some)
 /      \   Unit Tests (Many)
/________\
```

### Backend Testing

**Unit Tests:**

```typescript
// apps/api/tests/unit/services/users.service.test.ts
import { UsersService } from '../../../src/services/users.service.js';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService();
  });

  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user' as const,
        password: 'password123',
      };

      const user = await service.createUser(userData);

      expect(user.email).toBe(userData.email);
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });
  });
});
```

**Integration Tests:**

```typescript
// apps/api/tests/integration/controllers/users.controller.test.ts
import request from 'supertest';
import { app } from '../../../src/app.js';

describe('Users Controller', () => {
  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        password: 'password123',
      };

      const response = await request(app).post('/api/users').send(userData).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
    });
  });
});
```

### Frontend Testing

**Component Tests:**

```typescript
// apps/web/src/app/features/users/components/user-list/user-list.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { UserListComponent } from './user-list.component';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init', () => {
    spyOn(component['usersService'], 'getUsers').and.returnValue(
      of({ data: { users: [], total: 0 } })
    );

    component.ngOnInit();

    expect(component['usersService'].getUsers).toHaveBeenCalled();
  });
});
```

### E2E Testing

**Playwright Tests:**

```typescript
// tests/e2e/users.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test('should create a new user', async ({ page }) => {
    await page.goto('/users');

    await page.click('[data-testid="add-user-button"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="first-name-input"]', 'John');
    await page.fill('[data-testid="last-name-input"]', 'Doe');
    await page.selectOption('[data-testid="role-select"]', 'user');
    await page.fill('[data-testid="password-input"]', 'password123');

    await page.click('[data-testid="submit-button"]');

    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=test@example.com')).toBeVisible();
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:api:unit         # Backend unit tests
npm run test:api:integration  # Backend integration tests
npm run test:web:unit         # Frontend unit tests
npm run test:e2e              # End-to-end tests

# Run tests in watch mode
npm run test:api:watch
npm run test:web:watch

# Generate coverage reports
npm run test:coverage
```

## 🐛 Debugging Guide

### Backend Debugging

**Using VS Code Debugger:**

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/apps/api/src/server.ts",
      "outFiles": ["${workspaceFolder}/apps/api/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      },
      "runtimeArgs": ["--loader", "ts-node/esm"],
      "console": "integratedTerminal"
    }
  ]
}
```

**Common Backend Issues:**

1. **Database Connection Errors:**

```bash
# Check database status
docker-compose ps db

# Check connection
psql -h localhost -p 5432 -U dbuser -d nodeangularfullstack

# Reset database
npm run db:reset
```

2. **JWT Token Issues:**

```typescript
// Verify JWT configuration
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
console.log('JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);
```

3. **CORS Issues:**

```typescript
// Check CORS configuration in app.ts
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  })
);
```

### Frontend Debugging

**Using Browser DevTools:**

1. Open Chrome DevTools (F12)
2. Go to Sources tab
3. Set breakpoints in TypeScript files
4. Use Console for signal inspection:

```typescript
// In browser console
ng.getComponent($0); // Get component instance from selected element
ng.getContext($0); // Get context from selected element
```

**Angular DevTools:** Install the Angular DevTools browser extension for:

- Component tree inspection
- Signal value monitoring
- Performance profiling

**Common Frontend Issues:**

1. **Route Guard Issues:**

```typescript
// Debug route guards
console.log('Guard result:', this.authGuard.canActivate());
```

2. **HTTP Interceptor Problems:**

```typescript
// Add logging to interceptors
console.log('Request:', req.url, req.headers);
console.log('Response:', res.status, res.body);
```

3. **Signal Update Issues:**

```typescript
// Monitor signal changes
effect(() => {
  console.log('Signal value changed:', this.mySignal());
});
```

### Network Debugging

**API Testing with curl:**

```bash
# Test authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Test authenticated endpoints
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Using Postman/Insomnia:** Import the API documentation from `http://localhost:3000/api-docs` for
testing.

## 📊 Code Quality & Standards

### Linting and Formatting

**ESLint Configuration:**

```bash
# Run linting
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Lint specific files
npx eslint apps/api/src/**/*.ts
npx eslint apps/web/src/**/*.ts
```

**Prettier Configuration:**

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

### Type Checking

```bash
# Check TypeScript types
npm run typecheck

# Check specific app
cd apps/api && npm run typecheck
cd apps/web && npm run typecheck
```

### Code Review Checklist

**Backend Code Review:**

- [ ] Proper error handling with `ApiError`
- [ ] Input validation with Joi schemas
- [ ] JSDoc comments on public methods
- [ ] Unit tests for business logic
- [ ] Integration tests for endpoints
- [ ] Proper logging for debugging
- [ ] Security considerations (SQL injection, XSS)

**Frontend Code Review:**

- [ ] Standalone components used
- [ ] Proper signal usage for state
- [ ] Type safety with shared types
- [ ] Accessibility considerations
- [ ] Responsive design implementation
- [ ] Error boundary handling
- [ ] Loading states implemented

### Performance Metrics

**Backend Performance:**

```bash
# Load testing with autocannon
npx autocannon -c 10 -d 5 http://localhost:3000/api/health
```

**Frontend Performance:**

- Lighthouse scores > 90
- First Contentful Paint < 2s
- Largest Contentful Paint < 2.5s
- Bundle size monitoring

## 🌿 Git Workflow

### Branch Strategy

```
main
├── develop
├── feature/user-management
├── feature/product-catalog
├── hotfix/critical-bug-fix
└── release/v1.2.0
```

**Branch Naming Convention:**

- `feature/feature-name` - New features
- `bugfix/bug-description` - Bug fixes
- `hotfix/critical-issue` - Critical production fixes
- `release/vX.Y.Z` - Release branches

### Commit Standards

**Conventional Commits:**

```bash
feat: add user management API endpoints
fix: resolve JWT token expiration handling
docs: update API documentation
test: add unit tests for user service
refactor: improve error handling in auth middleware
style: fix linting issues
perf: optimize database queries
chore: update dependencies
```

### Pre-commit Hooks

Husky is configured to run:

- ESLint
- Prettier
- TypeScript type checking
- Unit tests

### Pull Request Process

1. **Create feature branch:**

```bash
git checkout -b feature/new-feature
```

2. **Develop with regular commits:**

```bash
git add .
git commit -m "feat: implement user authentication"
```

3. **Push and create PR:**

```bash
git push origin feature/new-feature
# Create PR via GitHub interface
```

4. **PR Requirements:**

- [ ] All tests passing
- [ ] Code review approved
- [ ] Documentation updated
- [ ] No linting errors
- [ ] Branch up to date with main

## 🚀 Deployment Process

### Environment Preparation

**Staging Environment:**

```bash
# Build for staging
NODE_ENV=staging npm run build

# Deploy to staging
npm run deploy:staging
```

**Production Environment:**

```bash
# Build for production
NODE_ENV=production npm run build

# Deploy to production
npm run deploy:production
```

### Docker Deployment

**Build Production Images:**

```bash
# Build all images
npm run docker:build:prod

# Build specific services
docker build -f infrastructure/docker/Dockerfile.api -t api:latest .
docker build -f infrastructure/docker/Dockerfile.web -t web:latest .
```

**Docker Compose Production:**

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  api:
    image: api:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    ports:
      - '3000:3000'

  web:
    image: web:latest
    ports:
      - '80:80'
    depends_on:
      - api
```

### Health Checks

**API Health Check:**

```bash
curl http://localhost:3000/health
```

**Frontend Health Check:**

```bash
curl http://localhost:4200/health
```

### Monitoring

**Application Monitoring:**

- Sentry for error tracking
- Winston for structured logging
- Custom metrics for business logic

**Infrastructure Monitoring:**

- Docker container health
- Database performance
- Redis cache metrics

## ⚡ Performance Optimization

### Backend Optimization

**Database Optimization:**

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_category ON products(category);
```

**Caching Strategy:**

```typescript
// Redis caching for expensive operations
const cachedData = await redis.get(`user:${userId}`);
if (cachedData) {
  return JSON.parse(cachedData);
}

const userData = await database.getUser(userId);
await redis.setex(`user:${userId}`, 3600, JSON.stringify(userData));
```

**API Rate Limiting:**

```typescript
// Express rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Frontend Optimization

**Lazy Loading:**

```typescript
// Route-based code splitting
const routes: Routes = [
  {
    path: 'users',
    loadChildren: () => import('./features/users/users.routes').then((m) => m.userRoutes),
  },
];
```

**OnPush Change Detection:**

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ... component definition
})
```

**Bundle Analysis:**

```bash
# Analyze bundle size
npm run build:analyze

# Check for unused dependencies
npx depcheck
```

## 🔧 Troubleshooting

### Common Issues

**1. Port Already in Use:**

```bash
# Find process using port
lsof -ti:3000
lsof -ti:4200

# Kill process
kill -9 $(lsof -ti:3000)
```

**2. Docker Issues:**

```bash
# Reset Docker environment
npm run docker:clean
docker system prune -a

# Rebuild containers
npm run docker:build
```

**3. Database Connection:**

```bash
# Check database status
docker-compose ps db

# Reset database
npm run db:reset

# Check logs
docker-compose logs db
```

**4. Node Modules Issues:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
```

**5. TypeScript Errors:**

```bash
# Clear TypeScript cache
rm -rf apps/*/dist
rm -rf packages/*/dist

# Rebuild shared packages
cd packages/shared && npm run build
```

### Debug Scripts

**Environment Validation:**

```bash
node scripts/validate-environment.js
```

**Dependency Check:**

```bash
npm run check:deps
```

**Health Check All Services:**

```bash
npm run health:check
```

## 📚 Additional Resources

### Documentation Links

- [Architecture Guide](./docs/architecture/index.md)
- [API Documentation](http://localhost:3000/api-docs)
- [Component Library](./docs/component-library.md)
- [Deployment Guide](./docs/deployment.md)

### External Resources

- [Angular Documentation](https://angular.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### Community Support

- [GitHub Issues](../../issues)
- [Discussions](../../discussions)
- [Contributing Guide](../../CONTRIBUTING.md)

---

## 🎯 Success Metrics

Following this workflow should result in:

- **40% faster development** compared to starting from scratch
- **90%+ test coverage** for critical features
- **Consistent code quality** across team members
- **Reduced onboarding time** for new developers
- **Faster deployment cycles** with CI/CD automation

**Happy coding! 🚀**
