# Troubleshooting and Debugging Guide

## Overview

This comprehensive guide covers common issues, debugging approaches, and performance optimization
techniques for the NodeAngularFullStack application. It includes specific solutions for setup
problems, runtime errors, and production issues.

## Table of Contents

1. [Development Environment Issues](#development-environment-issues)
2. [Database and Connection Problems](#database-and-connection-problems)
3. [Authentication and Authorization Issues](#authentication-and-authorization-issues)
4. [Frontend Build and Runtime Issues](#frontend-build-and-runtime-issues)
5. [API and Backend Issues](#api-and-backend-issues)
6. [Multi-Tenancy Problems](#multi-tenancy-problems)
7. [Performance Issues](#performance-issues)
8. [Production Debugging](#production-debugging)
9. [Monitoring and Logging](#monitoring-and-logging)
10. [Common Error Codes](#common-error-codes)

## Development Environment Issues

### Issue: Docker Containers Won't Start

**Symptoms:**

- `docker-compose up` fails
- Containers exit immediately
- Port conflicts

**Diagnosis:**

```bash
# Check container logs
docker-compose logs api
docker-compose logs web
docker-compose logs postgres

# Check container status
docker-compose ps

# Check port conflicts
netstat -tulpn | grep :3000
netstat -tulpn | grep :4200
netstat -tulpn | grep :5432
```

**Solutions:**

1. **Port Conflicts:**

```bash
# Kill processes using required ports
sudo lsof -ti:3000 | xargs kill -9
sudo lsof -ti:4200 | xargs kill -9
sudo lsof -ti:5432 | xargs kill -9

# Or change ports in docker-compose.yml
services:
  web:
    ports:
      - "4201:4200"  # Use different host port
```

2. **Permission Issues:**

```bash
# Fix Docker permissions (Linux)
sudo chown -R $USER:$USER .
sudo chmod -R 755 .

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

3. **Memory Issues:**

```bash
# Increase Docker memory allocation
# Docker Desktop: Settings > Resources > Advanced

# Clean up Docker resources
docker system prune -a
docker volume prune
```

### Issue: Environment Variables Not Loading

**Symptoms:**

- Application can't connect to database
- Features not working as expected
- "Environment variable not set" errors

**Diagnosis:**

```bash
# Check if .env file exists
ls -la .env*

# Verify environment variables are loaded
docker-compose exec api printenv | grep DB_
docker-compose exec api printenv | grep JWT_
```

**Solutions:**

1. **Create Missing Environment Files:**

```bash
# Copy example files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Check file permissions
chmod 644 .env
```

2. **Validate Environment Variables:**

```typescript
// apps/api/src/utils/env-validation.ts
export function validateEnvironment(): void {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'NODE_ENV'];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ Environment validation passed');
}
```

### Issue: Node Modules Installation Problems

**Symptoms:**

- `npm install` fails
- Module not found errors
- Version conflicts

**Diagnosis:**

```bash
# Check Node and npm versions
node --version
npm --version

# Check for package-lock conflicts
ls package-lock.json apps/*/package-lock.json

# Check npm cache
npm cache verify
```

**Solutions:**

1. **Clean Installation:**

```bash
# Remove all node_modules and lock files
rm -rf node_modules package-lock.json
rm -rf apps/*/node_modules apps/*/package-lock.json

# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

2. **Version Conflicts:**

```bash
# Update Node.js to recommended version
nvm install 18.19.0
nvm use 18.19.0

# Check for conflicting packages
npm ls
npm audit fix
```

## Database and Connection Problems

### Issue: Database Connection Refused

**Symptoms:**

- "Connection refused" errors
- API can't start
- Database health checks fail

**Diagnosis:**

```bash
# Check if PostgreSQL container is running
docker-compose ps postgres

# Test direct connection
docker-compose exec postgres psql -U postgres -d nodeangularfullstack

# Check connection from API container
docker-compose exec api psql "$DATABASE_URL"
```

**Solutions:**

1. **Container Networking:**

```bash
# Ensure containers are on same network
docker network ls
docker network inspect nodeangularfullstack_default

# Verify service names in docker-compose.yml
services:
  api:
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/nodeangularfullstack
```

2. **Database Initialization:**

```bash
# Recreate database container
docker-compose down postgres
docker volume rm nodeangularfullstack_postgres_data
docker-compose up postgres

# Run migrations
npm run db:migrate
npm run db:seed
```

### Issue: Migration Failures

**Symptoms:**

- Migration commands fail
- Database schema out of sync
- "Relation does not exist" errors

**Diagnosis:**

```sql
-- Check migration status
SELECT * FROM schema_migrations ORDER BY version;

-- Check table existence
\dt

-- Check for failed transactions
SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction';
```

**Solutions:**

1. **Reset Migration State:**

```bash
# Rollback problematic migration
npm run db:migrate:down

# Reset to specific migration
npm run db:migrate:down:to 20240101000000

# Rerun migrations
npm run db:migrate
```

2. **Manual Migration Fixes:**

```sql
-- Fix migration manually if needed
BEGIN;

-- Your schema changes here
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Update migration table
INSERT INTO schema_migrations (version) VALUES ('20240115120000');

COMMIT;
```

### Issue: Database Performance Problems

**Symptoms:**

- Slow query responses
- High CPU usage on database
- Connection pool exhaustion

**Diagnosis:**

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check table sizes
SELECT schemaname, tablename, pg_total_relation_size(schemaname||'.'||tablename) as size
FROM pg_tables
ORDER BY size DESC;
```

**Solutions:**

1. **Add Missing Indexes:**

```sql
-- Common indexes for multi-tenant apps
CREATE INDEX CONCURRENTLY idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX CONCURRENTLY idx_products_tenant_active ON products(tenant_id, is_active);

-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;
```

2. **Optimize Connection Pool:**

```typescript
// apps/api/src/utils/database.ts
export const database = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s
  statement_timeout: 30000, // Statement timeout
  query_timeout: 30000, // Query timeout
});
```

## Authentication and Authorization Issues

### Issue: JWT Token Problems

**Symptoms:**

- "Invalid token" errors
- Users logged out unexpectedly
- Token verification failures

**Diagnosis:**

```typescript
// Debug JWT tokens
import jwt from 'jsonwebtoken';

// Decode token without verification (for debugging)
const decoded = jwt.decode(token, { complete: true });
console.log('Token header:', decoded?.header);
console.log('Token payload:', decoded?.payload);

// Check token expiration
const payload = jwt.decode(token) as any;
const now = Math.floor(Date.now() / 1000);
console.log('Token expires at:', new Date(payload.exp * 1000));
console.log('Current time:', new Date());
console.log('Is expired:', payload.exp < now);
```

**Solutions:**

1. **Token Secret Issues:**

```bash
# Ensure JWT_SECRET is set and consistent
echo $JWT_SECRET

# Generate new secret if needed
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update all instances with same secret
```

2. **Clock Synchronization:**

```bash
# Check system time
date
timedatectl status

# Sync time if needed (Linux)
sudo ntpdate -s time.nist.gov
```

3. **Token Refresh Implementation:**

```typescript
// apps/web/src/app/core/interceptors/auth.interceptor.ts
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(this.addAuthHeader(req)).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !req.url.includes('/auth/refresh')) {
          return this.handle401Error(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((response: any) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(response.accessToken);
          return next.handle(this.addAuthHeader(request));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(() => err);
        })
      );
    }

    return this.refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap(() => next.handle(this.addAuthHeader(request)))
    );
  }
}
```

### Issue: CORS Problems

**Symptoms:**

- Browser blocks API requests
- "Access-Control-Allow-Origin" errors
- Preflight request failures

**Diagnosis:**

```javascript
// Browser DevTools Console
fetch('/api/v1/health', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
})
  .then((response) => console.log(response))
  .catch((error) => console.error('CORS Error:', error));
```

**Solutions:**

1. **Configure CORS Properly:**

```typescript
// apps/api/src/app.ts
import cors from 'cors';

const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:4200',
      'http://localhost:3000',
    ];

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
```

2. **Development Proxy Setup:**

```json
// apps/web/proxy.conf.json
{
  "/api/*": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

## Frontend Build and Runtime Issues

### Issue: Angular Build Failures

**Symptoms:**

- `ng build` fails
- TypeScript compilation errors
- Memory issues during build

**Diagnosis:**

```bash
# Check Angular version
ng version

# Detailed build output
ng build --verbose

# Check memory usage
ng build --progress --stats-json
```

**Solutions:**

1. **Memory Issues:**

```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Or in package.json
{
  "scripts": {
    "build": "NODE_OPTIONS=--max-old-space-size=4096 ng build"
  }
}
```

2. **TypeScript Configuration:**

```json
// apps/web/tsconfig.json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  },
  "angularCompilerOptions": {
    "enableIvy": true,
    "fullTemplateTypeCheck": false,
    "strictInjectionParameters": false
  }
}
```

### Issue: Runtime Angular Errors

**Symptoms:**

- White screen of death
- Component not rendering
- Service injection errors

**Diagnosis:**

```javascript
// Browser DevTools Console
// Check for errors
console.error.length;

// Check Angular context
ng.probe(document.querySelector('app-root'));

// Check providers
ng.probe(document.querySelector('app-root')).injector.get(SomeService);
```

**Solutions:**

1. **Component Debugging:**

```typescript
// Add debugging to component
@Component({
  selector: 'app-debug',
  template: `
    <div>
      <pre>{{ debugInfo | json }}</pre>
    </div>
  `,
})
export class DebugComponent implements OnInit, OnDestroy {
  debugInfo: any = {};

  ngOnInit() {
    this.debugInfo = {
      route: this.route.snapshot,
      user: this.authService.currentUser,
      environment: environment,
    };

    console.log('Component initialized:', this.debugInfo);
  }

  ngOnDestroy() {
    console.log('Component destroyed');
  }
}
```

2. **Service Error Handling:**

```typescript
@Injectable({ providedIn: 'root' })
export class ErrorHandlingService {
  constructor() {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.logError(event.error);
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.logError(event.reason);
    });
  }

  private logError(error: any): void {
    // Send to error tracking service
    if (environment.production) {
      // Sentry, LogRocket, etc.
    }
  }
}
```

## API and Backend Issues

### Issue: Express Server Won't Start

**Symptoms:**

- Server crashes on startup
- Port already in use errors
- Module import failures

**Diagnosis:**

```bash
# Check what's using the port
lsof -i :3000

# Test import/require statements
node -e "require('./apps/api/dist/app.js')"

# Check server logs
docker-compose logs api -f
```

**Solutions:**

1. **Port Conflicts:**

```bash
# Kill process using port
kill -9 $(lsof -ti:3000)

# Use different port
export PORT=3001
```

2. **Module Resolution:**

```typescript
// apps/api/src/app.ts
import path from 'path';
import { fileURLToPath } from 'url';

// For ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug module resolution
console.log('Current directory:', __dirname);
console.log('Process cwd:', process.cwd());
```

### Issue: API Response Issues

**Symptoms:**

- Slow API responses
- Memory leaks
- Request timeouts

**Diagnosis:**

```typescript
// Add request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);

    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });

  next();
};
```

**Solutions:**

1. **Request Timeout Configuration:**

```typescript
// apps/api/src/app.ts
import timeout from 'connect-timeout';

app.use(timeout('30s'));
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.timedout) next();
});
```

2. **Memory Leak Detection:**

```typescript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
  });

  // Alert if memory usage is high
  if (usage.heapUsed > 500 * 1024 * 1024) {
    // 500MB
    console.warn('High memory usage detected');
  }
}, 30000);
```

## Multi-Tenancy Problems

### Issue: Tenant Context Not Set

**Symptoms:**

- Empty query results
- Cross-tenant data access
- "Tenant not found" errors

**Diagnosis:**

```typescript
// Debug tenant middleware
export const debugTenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log('Tenant Debug Info:', {
    hostname: req.hostname,
    subdomain: req.hostname.split('.')[0],
    headers: {
      'x-tenant-id': req.get('x-tenant-id'),
      host: req.get('host'),
    },
    tenant: req.tenant,
    user: req.user ? { id: req.user.id, tenantId: req.user.tenantId } : null,
  });

  next();
};
```

**Solutions:**

1. **Middleware Order:**

```typescript
// Ensure correct middleware order
app.use(tenantIdentificationMiddleware);
app.use(authenticationMiddleware);
app.use(tenantSecurityMiddleware);
```

2. **Fallback Tenant Logic:**

```typescript
export const tenantIdentificationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  let tenantId: string | null = null;

  // Try multiple identification strategies
  const strategies = [
    () => extractFromSubdomain(req),
    () => extractFromHeader(req),
    () => extractFromJWT(req),
    () => process.env.DEFAULT_TENANT_ID,
  ];

  for (const strategy of strategies) {
    tenantId = strategy();
    if (tenantId) break;
  }

  if (!tenantId) {
    return res.status(400).json({
      error: 'Unable to identify tenant',
    });
  }

  req.tenant = { id: tenantId };
  next();
};
```

### Issue: RLS Policy Problems

**Symptoms:**

- Data from wrong tenant appears
- Query returns no results unexpectedly
- Permission denied errors

**Diagnosis:**

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'users';

-- Test policy execution
SET app.current_tenant = 'test-tenant';
SELECT * FROM users;

-- Check current settings
SHOW app.current_tenant;
```

**Solutions:**

1. **Policy Debugging:**

```sql
-- Temporarily disable RLS for debugging
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Test query without RLS
SELECT * FROM users;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

2. **Policy Correction:**

```sql
-- Drop and recreate policy
DROP POLICY IF EXISTS users_tenant_isolation ON users;

CREATE POLICY users_tenant_isolation ON users
    FOR ALL
    TO authenticated
    USING (
        tenant_id = COALESCE(
            current_setting('app.current_tenant', true)::UUID,
            (SELECT tenant_id FROM users WHERE id = current_setting('app.current_user', true)::UUID LIMIT 1)
        )
    );
```

## Performance Issues

### Issue: Slow Database Queries

**Symptoms:**

- High response times
- Database CPU usage spikes
- Connection pool exhaustion

**Diagnosis:**

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, calls, total_exec_time, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'products'
ORDER BY n_distinct DESC;
```

**Solutions:**

1. **Query Optimization:**

```sql
-- Add composite indexes
CREATE INDEX CONCURRENTLY idx_products_tenant_category_active
ON products(tenant_id, category_id, is_active)
WHERE is_active = true;

-- Analyze query plans
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM products
WHERE tenant_id = $1 AND category_id = $2 AND is_active = true;
```

2. **Connection Pool Optimization:**

```typescript
// apps/api/src/utils/database.ts
export const createConnectionPool = (tenantId?: string) => {
  const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === 'production' ? 20 : 10,
    min: 2,
    idle: 10000,
    acquire: 30000,
    evict: 1000,
    handleDisconnects: true,
    // Tenant-specific configuration
    ...(tenantId && {
      application_name: `app_${tenantId}`,
    }),
  };

  return new Pool(poolConfig);
};
```

### Issue: Memory Leaks

**Symptoms:**

- Increasing memory usage over time
- Out of memory errors
- Slow garbage collection

**Diagnosis:**

```typescript
// Memory monitoring
const v8 = require('v8');

setInterval(() => {
  const stats = v8.getHeapStatistics();
  const usage = process.memoryUsage();

  console.log('Memory Stats:', {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
    external: Math.round(usage.external / 1024 / 1024) + 'MB',
    rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
  });

  // Generate heap snapshot if memory is high
  if (usage.heapUsed > 500 * 1024 * 1024) {
    const snapshot = v8.writeHeapSnapshot();
    console.log('Heap snapshot written to:', snapshot);
  }
}, 60000);
```

**Solutions:**

1. **Connection Cleanup:**

```typescript
// Proper cleanup in repositories
export class BaseRepository {
  async executeQuery<T>(query: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    } finally {
      client.release(); // Always release connection
    }
  }
}
```

2. **Event Listener Cleanup:**

```typescript
// Angular component cleanup
@Component({...})
export class MyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.dataService.getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        // Handle data
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

## Production Debugging

### Issue: Silent Failures in Production

**Symptoms:**

- Features work in development but fail in production
- No error logs
- Inconsistent behavior

**Diagnosis:**

```typescript
// Enhanced error tracking
import * as Sentry from '@sentry/node';

// Capture unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  Sentry.captureException(error);

  // Graceful shutdown
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  Sentry.captureException(reason);
});
```

**Solutions:**

1. **Comprehensive Logging:**

```typescript
// apps/api/src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'nodeangularfullstack-api',
    version: process.env.APP_VERSION,
  },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    ...(process.env.NODE_ENV !== 'production'
      ? [
          new winston.transports.Console({
            format: winston.format.simple(),
          }),
        ]
      : []),
  ],
});
```

2. **Health Check Monitoring:**

```typescript
// apps/api/src/controllers/health.controller.ts
export class HealthController {
  async comprehensive(req: Request, res: Response): Promise<void> {
    const checks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      version: process.env.APP_VERSION,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      checks: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        memory: this.checkMemory(),
        disk: await this.checkDisk(),
      },
    };

    const hasFailures = Object.values(checks.checks).some((check) => !check.healthy);

    res.status(hasFailures ? 503 : 200).json(checks);
  }

  private checkMemory() {
    const usage = process.memoryUsage();
    const maxMemory = 1024 * 1024 * 1024; // 1GB

    return {
      healthy: usage.heapUsed < maxMemory * 0.8,
      details: {
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
        percentage: Math.round((usage.heapUsed / maxMemory) * 100) + '%',
      },
    };
  }
}
```

## Monitoring and Logging

### Centralized Logging Setup

```typescript
// apps/api/src/middleware/request-logging.middleware.ts
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = req.id || generateRequestId();

  // Add request ID to all logs
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Log request start
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    tenant: req.tenant?.id,
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      tenant: req.tenant?.id,
    });

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        duration,
      });
    }
  });

  next();
};
```

### Performance Monitoring

```typescript
// apps/api/src/utils/performance-monitor.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
  }

  getStats(name: string) {
    const values = this.metrics.get(name) || [];

    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.recordMetric(`${req.method}_${req.route?.path || req.path}`, duration);
        this.recordMetric('overall_response_time', duration);
      });

      next();
    };
  }
}
```

## Common Error Codes

### Backend Error Codes

| Code           | Description            | Typical Cause          | Solution                         |
| -------------- | ---------------------- | ---------------------- | -------------------------------- |
| `ECONNREFUSED` | Connection refused     | Database not running   | Start database service           |
| `ENOTFOUND`    | Host not found         | DNS resolution failure | Check hostname/DNS               |
| `EADDRINUSE`   | Address already in use | Port conflict          | Change port or kill process      |
| `ENOMEM`       | Out of memory          | Memory exhaustion      | Increase memory or optimize code |
| `EMFILE`       | Too many open files    | File descriptor limit  | Increase limit or fix leaks      |

### Frontend Error Codes

| Error                                         | Description              | Typical Cause          | Solution                      |
| --------------------------------------------- | ------------------------ | ---------------------- | ----------------------------- |
| `ChunkLoadError`                              | Failed to load chunk     | Build/deployment issue | Clear cache, rebuild          |
| `ExpressionChangedAfterItHasBeenCheckedError` | Angular change detection | Async state changes    | Use OnPush or setTimeout      |
| `NullInjectorError`                           | Service not provided     | Missing provider       | Add to providers array        |
| `Cannot read property of undefined`           | Undefined access         | Async data not loaded  | Add null checks or async pipe |

### Database Error Codes

| Code    | Description             | Typical Cause             | Solution                      |
| ------- | ----------------------- | ------------------------- | ----------------------------- |
| `23505` | Unique violation        | Duplicate key             | Handle uniqueness constraint  |
| `23503` | Foreign key violation   | Referenced record missing | Ensure referenced data exists |
| `42P01` | Relation does not exist | Table/view missing        | Run migrations                |
| `42703` | Column does not exist   | Schema mismatch           | Update schema or query        |
| `53300` | Too many connections    | Connection pool exhausted | Optimize pool size            |

### Quick Debug Commands

```bash
# Check all container logs
docker-compose logs -f

# Check specific service
docker-compose logs api -f --tail=100

# Execute commands in containers
docker-compose exec api npm run db:migrate
docker-compose exec postgres psql -U postgres

# Check resource usage
docker stats
docker system df

# Clean up resources
docker system prune -a
docker volume prune

# Test API endpoints
curl -X GET http://localhost:3000/api/v1/health
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test database connectivity
docker-compose exec api node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? err : res.rows[0]);
  pool.end();
});
"
```

This comprehensive troubleshooting guide should help identify and resolve most issues encountered
while developing and deploying NodeAngularFullStack applications.
