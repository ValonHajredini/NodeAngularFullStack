# Multi-Tenancy Configuration Guide

## Overview

NodeAngularFullStack supports flexible multi-tenancy configurations, allowing you to serve multiple
organizations (tenants) from a single application instance while maintaining complete data isolation
and security. This guide covers deployment scenarios, configuration options, and implementation
trade-offs.

## Table of Contents

1. [Tenancy Models](#tenancy-models)
2. [Configuration Options](#configuration-options)
3. [Deployment Scenarios](#deployment-scenarios)
4. [Database Isolation Strategies](#database-isolation-strategies)
5. [Frontend Multi-Tenancy](#frontend-multi-tenancy)
6. [Implementation Guide](#implementation-guide)
7. [Migration Strategies](#migration-strategies)
8. [Performance Considerations](#performance-considerations)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)

## Tenancy Models

### 1. Single-Tenant (Default)

**Description:** One application instance serves one organization.

**Characteristics:**

- Simplest deployment model
- Complete isolation by default
- No tenant context needed
- Easy to reason about and debug

**Use Cases:**

- Small to medium applications
- Organizations with strict data isolation requirements
- Proof of concepts and MVPs
- Internal company tools

**Configuration:**

```bash
MULTI_TENANT_MODE=false
DEFAULT_TENANT_ID=default
```

### 2. Multi-Tenant

**Description:** One application instance serves multiple organizations with shared infrastructure.

**Characteristics:**

- Shared application logic and database
- Tenant-aware data access patterns
- Resource sharing and cost efficiency
- Complex security and isolation requirements

**Use Cases:**

- SaaS applications
- Platforms serving multiple customers
- Cost-conscious deployments
- Applications with similar requirements across tenants

**Configuration:**

```bash
MULTI_TENANT_MODE=true
TENANT_IDENTIFICATION_STRATEGY=subdomain
# or
TENANT_IDENTIFICATION_STRATEGY=header
```

## Configuration Options

### Environment Variables

```bash
# Multi-Tenancy Configuration
MULTI_TENANT_MODE=true|false
TENANT_IDENTIFICATION_STRATEGY=subdomain|header|path|jwt
DEFAULT_TENANT_ID=default
TENANT_SUBDOMAIN_SUFFIX=.yourapp.com

# Database Configuration
DB_TENANT_ISOLATION=row_level|schema|database
DB_SHARED_SCHEMA_PREFIX=tenant_
DB_RLS_ENABLED=true

# Frontend Configuration
FRONTEND_TENANT_ROUTING=subdomain|path
TENANT_BRANDING_ENABLED=true
TENANT_CUSTOM_DOMAINS=true

# Security Configuration
TENANT_JWT_ISOLATION=true
TENANT_CORS_ISOLATION=true
CROSS_TENANT_ACCESS_PREVENTION=strict

# Performance Configuration
TENANT_CONNECTION_POOLING=true
TENANT_CACHING_STRATEGY=isolated|shared
TENANT_RATE_LIMITING=per_tenant
```

### Tenant Identification Strategies

#### 1. Subdomain Strategy

**Format:** `tenant.yourapp.com`

**Pros:**

- Clear tenant separation
- SEO-friendly URLs
- Easy to understand
- Natural branding opportunity

**Cons:**

- DNS configuration required
- SSL certificate management
- Limited to DNS-safe characters

**Implementation:**

```typescript
// apps/api/src/middleware/tenant-identification.middleware.ts
export const subdomainTenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const host = req.get('host') || '';
  const subdomain = host.split('.')[0];

  if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
    req.tenant = { id: subdomain, source: 'subdomain' };
  } else {
    req.tenant = { id: process.env.DEFAULT_TENANT_ID!, source: 'default' };
  }

  next();
};
```

#### 2. Header Strategy

**Format:** `X-Tenant-ID: tenant-uuid`

**Pros:**

- Simple implementation
- No DNS requirements
- Works with any client
- Flexible tenant naming

**Cons:**

- Manual header management
- Not user-friendly for browsers
- Potential for header spoofing

**Implementation:**

```typescript
export const headerTenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.get('X-Tenant-ID') || req.get('x-tenant-id');

  if (tenantId) {
    req.tenant = { id: tenantId, source: 'header' };
  } else {
    req.tenant = { id: process.env.DEFAULT_TENANT_ID!, source: 'default' };
  }

  next();
};
```

#### 3. JWT Strategy

**Format:** Tenant ID embedded in JWT token

**Pros:**

- Secure tenant identification
- Integrates with authentication
- Tamper-resistant
- Automatic propagation

**Cons:**

- Requires authentication for tenant context
- Token size increase
- Complex for public endpoints

**Implementation:**

```typescript
export const jwtTenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = extractTokenFromRequest(req);

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      req.tenant = { id: decoded.tenantId, source: 'jwt' };
      req.user = decoded;
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } else {
    req.tenant = { id: process.env.DEFAULT_TENANT_ID!, source: 'default' };
  }

  next();
};
```

## Deployment Scenarios

### Scenario 1: SaaS Application with Subdomain Tenancy

**Architecture:**

```
customer1.myapp.com ─┐
customer2.myapp.com ─┼─→ Load Balancer ─→ App Instances ─→ Multi-Tenant Database
customer3.myapp.com ─┘
```

**Configuration:**

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    environment:
      - MULTI_TENANT_MODE=true
      - TENANT_IDENTIFICATION_STRATEGY=subdomain
      - TENANT_SUBDOMAIN_SUFFIX=.myapp.com
      - DB_TENANT_ISOLATION=row_level
      - TENANT_BRANDING_ENABLED=true

  nginx:
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - '80:80'
      - '443:443'
```

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name *.myapp.com;

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Scenario 2: Enterprise Platform with Path-Based Tenancy

**Architecture:**

```
myplatform.com/tenant1 ─┐
myplatform.com/tenant2 ─┼─→ App Instances ─→ Schema-Isolated Database
myplatform.com/tenant3 ─┘
```

**Configuration:**

```bash
MULTI_TENANT_MODE=true
TENANT_IDENTIFICATION_STRATEGY=path
DB_TENANT_ISOLATION=schema
TENANT_PATH_PREFIX=/tenant/
```

### Scenario 3: Hybrid Single/Multi-Tenant

**Architecture:**

```
enterprise.myapp.com ────→ Single-Tenant Instance ─→ Dedicated Database
startup1.myapp.com ──┐
startup2.myapp.com ──┼───→ Multi-Tenant Instance ─→ Shared Database
startup3.myapp.com ──┘
```

**Configuration Management:**

```typescript
// Dynamic tenant configuration
interface TenantConfig {
  id: string;
  mode: 'single' | 'multi';
  databaseStrategy: 'dedicated' | 'shared';
  customDomain?: string;
  features: string[];
}

const tenantConfigs: Map<string, TenantConfig> = new Map([
  [
    'enterprise',
    {
      id: 'enterprise',
      mode: 'single',
      databaseStrategy: 'dedicated',
      customDomain: 'enterprise.myapp.com',
      features: ['advanced-analytics', 'custom-branding', 'sso'],
    },
  ],
  [
    'startup1',
    {
      id: 'startup1',
      mode: 'multi',
      databaseStrategy: 'shared',
      features: ['basic-analytics'],
    },
  ],
]);
```

## Database Isolation Strategies

### 1. Row-Level Security (RLS)

**Description:** All tenants share the same database schema with tenant-aware queries.

**Pros:**

- Single database to manage
- Efficient resource utilization
- Simple schema evolution
- Native PostgreSQL support

**Cons:**

- Risk of tenant data leakage
- Complex query patterns
- Performance impact from filtering
- Shared resource contention

**Implementation:**

```sql
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY users_tenant_isolation ON users
    FOR ALL
    TO authenticated
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY products_tenant_isolation ON products
    FOR ALL
    TO authenticated
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

**Application Code:**

```typescript
export class TenantAwareRepository {
  async setTenantContext(client: PoolClient, tenantId: string): Promise<void> {
    await client.query('SET app.current_tenant = $1', [tenantId]);
  }

  async findUsersByTenant(tenantId: string): Promise<User[]> {
    const client = await this.db.connect();
    try {
      await this.setTenantContext(client, tenantId);
      // RLS automatically filters by tenant
      const result = await client.query('SELECT * FROM users ORDER BY created_at DESC');
      return result.rows.map(mapToUser);
    } finally {
      client.release();
    }
  }
}
```

### 2. Schema-Based Isolation

**Description:** Each tenant gets its own database schema.

**Pros:**

- Better isolation than RLS
- Clear tenant boundaries
- Independent schema evolution
- Easier backup/restore per tenant

**Cons:**

- Schema management complexity
- Connection pooling challenges
- Cross-tenant analytics difficulty
- Migration coordination

**Implementation:**

```typescript
export class SchemaBasedTenantManager {
  async createTenantSchema(tenantId: string): Promise<void> {
    const schemaName = `tenant_${tenantId}`;

    await this.db.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

    // Create tables in tenant schema
    const createTables = [
      `CREATE TABLE ${schemaName}.users (...)`,
      `CREATE TABLE ${schemaName}.products (...)`,
      // ... other tables
    ];

    for (const sql of createTables) {
      await this.db.query(sql);
    }
  }

  async getSchemaName(tenantId: string): string {
    return `tenant_${tenantId}`;
  }

  async executeTenantQuery(tenantId: string, query: string, params?: any[]): Promise<any> {
    const schemaName = this.getSchemaName(tenantId);
    const client = await this.db.connect();

    try {
      await client.query(`SET search_path TO ${schemaName}`);
      return await client.query(query, params);
    } finally {
      client.release();
    }
  }
}
```

### 3. Database-Level Isolation

**Description:** Each tenant gets a completely separate database.

**Pros:**

- Maximum isolation and security
- Independent scaling
- Simplified backup/restore
- No cross-tenant queries possible

**Cons:**

- High operational overhead
- Resource inefficiency
- Complex connection management
- Difficult cross-tenant features

**Implementation:**

```typescript
export class DatabasePerTenantManager {
  private readonly connections = new Map<string, Pool>();

  async getTenantConnection(tenantId: string): Promise<Pool> {
    if (!this.connections.has(tenantId)) {
      const dbName = `tenant_${tenantId}`;
      const pool = new Pool({
        connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${dbName}`,
      });

      this.connections.set(tenantId, pool);
    }

    return this.connections.get(tenantId)!;
  }

  async createTenantDatabase(tenantId: string): Promise<void> {
    const dbName = `tenant_${tenantId}`;

    // Create database
    await this.adminDb.query(`CREATE DATABASE ${dbName}`);

    // Run migrations on new database
    const tenantPool = await this.getTenantConnection(tenantId);
    await this.runMigrations(tenantPool);
  }
}
```

## Frontend Multi-Tenancy

### 1. Subdomain-Based Frontend

**Angular Implementation:**

```typescript
// apps/web/src/app/core/services/tenant.service.ts
@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly tenantSubject = new BehaviorSubject<Tenant | null>(null);
  public readonly tenant$ = this.tenantSubject.asObservable();

  constructor() {
    this.initializeTenant();
  }

  private initializeTenant(): void {
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];

    if (subdomain && subdomain !== 'www') {
      this.loadTenantConfig(subdomain);
    }
  }

  private async loadTenantConfig(tenantId: string): Promise<void> {
    try {
      const response = await fetch(`/api/v1/tenants/${tenantId}/config`);
      const tenantConfig = await response.json();

      this.tenantSubject.next({
        id: tenantId,
        name: tenantConfig.name,
        branding: tenantConfig.branding,
        features: tenantConfig.features,
      });

      // Apply tenant branding
      this.applyTenantBranding(tenantConfig.branding);
    } catch (error) {
      console.error('Failed to load tenant config:', error);
    }
  }

  private applyTenantBranding(branding: TenantBranding): void {
    // Update document title
    document.title = branding.title || 'Default App Title';

    // Apply CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--primary-color', branding.primaryColor);
    root.style.setProperty('--secondary-color', branding.secondaryColor);

    // Update favicon
    if (branding.favicon) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = branding.favicon;
      }
    }
  }
}
```

### 2. Tenant-Aware HTTP Interceptor

```typescript
@Injectable()
export class TenantInterceptor implements HttpInterceptor {
  constructor(private readonly tenantService: TenantService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this.tenantService.tenant$.pipe(
      take(1),
      switchMap((tenant) => {
        if (tenant) {
          // Add tenant header to all API requests
          const tenantRequest = req.clone({
            setHeaders: {
              'X-Tenant-ID': tenant.id,
            },
          });
          return next.handle(tenantRequest);
        }
        return next.handle(req);
      })
    );
  }
}
```

### 3. Tenant-Specific Routing

```typescript
// Tenant-aware route guard
@Injectable({ providedIn: 'root' })
export class TenantFeatureGuard implements CanActivate {
  constructor(private readonly tenantService: TenantService) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const requiredFeature = route.data['feature'];

    return this.tenantService.tenant$.pipe(
      map((tenant) => {
        if (!tenant) return false;
        return tenant.features.includes(requiredFeature);
      })
    );
  }
}

// Route configuration
const routes: Routes = [
  {
    path: 'analytics',
    loadChildren: () => import('./analytics/analytics.module').then((m) => m.AnalyticsModule),
    canActivate: [TenantFeatureGuard],
    data: { feature: 'advanced-analytics' },
  },
];
```

## Implementation Guide

### Step 1: Enable Multi-Tenancy

```bash
# 1. Update environment variables
echo "MULTI_TENANT_MODE=true" >> .env
echo "TENANT_IDENTIFICATION_STRATEGY=subdomain" >> .env
echo "DB_TENANT_ISOLATION=row_level" >> .env

# 2. Run database migrations for multi-tenancy
npm run db:migrate:multitenancy
```

### Step 2: Add Tenant Middleware

```typescript
// apps/api/src/app.ts
import { tenantMiddleware } from './middleware/tenant.middleware';

app.use(tenantMiddleware);
```

### Step 3: Update Database Models

```typescript
// Add tenant_id to all models
export interface BaseEntity {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}
```

### Step 4: Implement Tenant-Aware Repositories

```typescript
export abstract class TenantAwareRepository<T extends BaseEntity> {
  constructor(
    protected readonly db: Pool,
    protected readonly tableName: string
  ) {}

  protected async findByTenant(tenantId: string, conditions?: any): Promise<T[]> {
    const whereClause = conditions
      ? `WHERE tenant_id = $1 AND ${this.buildWhereClause(conditions)}`
      : 'WHERE tenant_id = $1';

    const query = `SELECT * FROM ${this.tableName} ${whereClause}`;
    const result = await this.db.query(query, [tenantId, ...Object.values(conditions || {})]);

    return result.rows.map(this.mapRowToEntity);
  }

  protected abstract mapRowToEntity(row: any): T;

  private buildWhereClause(conditions: any): string {
    return Object.keys(conditions)
      .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
      .join(' AND ');
  }
}
```

### Step 5: Add Frontend Tenant Detection

```typescript
// apps/web/src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { TenantService } from './app/core/services/tenant.service';

async function bootstrap() {
  const tenantService = new TenantService();
  await tenantService.initialize();

  bootstrapApplication(AppComponent, {
    providers: [
      { provide: TenantService, useValue: tenantService },
      // ... other providers
    ],
  });
}

bootstrap();
```

## Migration Strategies

### From Single-Tenant to Multi-Tenant

#### Phase 1: Prepare Database Schema

```sql
-- Add tenant_id columns
ALTER TABLE users ADD COLUMN tenant_id UUID;
ALTER TABLE products ADD COLUMN tenant_id UUID;

-- Create default tenant
INSERT INTO tenants (id, name, created_at)
VALUES ('default', 'Default Tenant', NOW());

-- Populate tenant_id for existing data
UPDATE users SET tenant_id = 'default' WHERE tenant_id IS NULL;
UPDATE products SET tenant_id = 'default' WHERE tenant_id IS NULL;

-- Make tenant_id NOT NULL
ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
```

#### Phase 2: Update Application Code

```typescript
// Gradual rollout with feature flag
export class UserService {
  async findAll(tenantId?: string): Promise<User[]> {
    if (process.env.MULTI_TENANT_MODE === 'true' && tenantId) {
      return this.findByTenant(tenantId);
    }

    // Fallback to original behavior
    return this.findAllOriginal();
  }
}
```

#### Phase 3: Enable Multi-Tenancy

```bash
# Enable multi-tenancy gradually
MULTI_TENANT_MODE=true
TENANT_MIGRATION_MODE=true  # Allows fallback behavior
```

### From Multi-Tenant to Single-Tenant

```sql
-- Extract specific tenant data
CREATE DATABASE tenant_specific AS
SELECT * FROM users WHERE tenant_id = 'specific-tenant';

-- Remove tenant_id columns after extraction
ALTER TABLE users DROP COLUMN tenant_id;
```

## Performance Considerations

### 1. Connection Pooling

```typescript
export class TenantConnectionManager {
  private readonly pools = new Map<string, Pool>();
  private readonly maxPoolsPerTenant = 10;

  async getConnection(tenantId: string): Promise<PoolClient> {
    let pool = this.pools.get(tenantId);

    if (!pool) {
      pool = new Pool({
        connectionString: this.buildConnectionString(tenantId),
        max: this.maxPoolsPerTenant,
        idleTimeoutMillis: 30000,
      });

      this.pools.set(tenantId, pool);
    }

    return pool.connect();
  }

  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [tenantId, pool] of this.pools) {
      try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        results.set(tenantId, true);
      } catch (error) {
        results.set(tenantId, false);
      }
    }

    return results;
  }
}
```

### 2. Caching Strategy

```typescript
export class TenantAwareCache {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
  }

  private buildKey(tenantId: string, key: string): string {
    return `tenant:${tenantId}:${key}`;
  }

  async get(tenantId: string, key: string): Promise<string | null> {
    return this.redis.get(this.buildKey(tenantId, key));
  }

  async set(tenantId: string, key: string, value: string, ttl?: number): Promise<void> {
    const redisKey = this.buildKey(tenantId, key);

    if (ttl) {
      await this.redis.setex(redisKey, ttl, value);
    } else {
      await this.redis.set(redisKey, value);
    }
  }

  async invalidateTenant(tenantId: string): Promise<void> {
    const pattern = `tenant:${tenantId}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### 3. Query Optimization

```sql
-- Optimal indexes for multi-tenant queries
CREATE INDEX CONCURRENTLY idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX CONCURRENTLY idx_products_tenant_category ON products(tenant_id, category_id);
CREATE INDEX CONCURRENTLY idx_orders_tenant_date ON orders(tenant_id, created_at DESC);

-- Partial indexes for active tenants only
CREATE INDEX CONCURRENTLY idx_active_users_tenant
ON users(tenant_id, created_at)
WHERE is_active = true;
```

## Security Best Practices

### 1. Tenant Isolation Validation

```typescript
export class TenantSecurityMiddleware {
  async validateTenantAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userTenantId = req.user?.tenantId;
    const requestTenantId = req.tenant?.id;

    // Ensure user can only access their tenant's data
    if (userTenantId && requestTenantId && userTenantId !== requestTenantId) {
      return res.status(403).json({
        error: 'Cross-tenant access forbidden',
      });
    }

    next();
  }
}
```

### 2. Data Encryption

```typescript
export class TenantDataEncryption {
  private getTenantKey(tenantId: string): string {
    // Derive tenant-specific encryption key
    return crypto
      .pbkdf2Sync(process.env.MASTER_KEY!, tenantId, 100000, 32, 'sha256')
      .toString('hex');
  }

  encrypt(tenantId: string, data: string): string {
    const key = this.getTenantKey(tenantId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(tenantId: string, encryptedData: string): string {
    const key = this.getTenantKey(tenantId);
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipher('aes-256-cbc', key);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

### 3. Audit Logging

```typescript
export class TenantAuditLogger {
  async logTenantAction(
    tenantId: string,
    userId: string,
    action: string,
    resource: string,
    metadata?: any
  ): Promise<void> {
    const auditEntry = {
      tenantId,
      userId,
      action,
      resource,
      metadata,
      timestamp: new Date().toISOString(),
      ip: this.getClientIp(),
      userAgent: this.getUserAgent(),
    };

    // Store in tenant-specific audit log
    await this.db.query('INSERT INTO audit_logs (tenant_id, data) VALUES ($1, $2)', [
      tenantId,
      JSON.stringify(auditEntry),
    ]);

    // Also send to centralized monitoring
    this.sendToMonitoring(auditEntry);
  }
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Tenant Context Not Set

**Problem:** Queries returning empty results or wrong tenant data.

**Diagnosis:**

```typescript
// Add debugging middleware
export const debugTenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log('Tenant Debug:', {
    host: req.get('host'),
    tenantFromHeader: req.get('x-tenant-id'),
    tenantFromRequest: req.tenant,
    userTenant: req.user?.tenantId,
  });
  next();
};
```

**Solution:**

- Verify tenant identification middleware is properly configured
- Check middleware order in application setup
- Validate tenant resolution logic

#### 2. Cross-Tenant Data Leakage

**Problem:** Users seeing data from other tenants.

**Diagnosis:**

```sql
-- Check for missing tenant filters
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM users WHERE tenant_id = 'specific-tenant';

-- Verify RLS policies
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE tablename = 'users';
```

**Solution:**

- Audit all database queries for tenant filtering
- Enable query logging to identify missing filters
- Implement automated tests for tenant isolation

#### 3. Performance Issues with Multi-Tenancy

**Problem:** Slow queries after enabling multi-tenancy.

**Diagnosis:**

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_tup_read DESC;

-- Analyze query plans
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM products WHERE tenant_id = $1 AND category_id = $2;
```

**Solution:**

- Add composite indexes starting with tenant_id
- Consider partitioning for very large datasets
- Implement tenant-specific connection pools

#### 4. Frontend Tenant Detection Issues

**Problem:** Frontend not properly detecting tenant context.

**Diagnosis:**

```javascript
// Browser console debugging
console.log('Current hostname:', window.location.hostname);
console.log('Subdomain extraction:', window.location.hostname.split('.')[0]);
console.log('Tenant service state:', tenantService.getCurrentTenant());
```

**Solution:**

- Verify DNS configuration for subdomains
- Check for cookie/CORS issues across subdomains
- Validate tenant configuration loading

### Monitoring and Alerting

```typescript
export class TenantMonitoring {
  async checkTenantHealth(tenantId: string): Promise<TenantHealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabaseConnectivity(tenantId),
      this.checkCacheAvailability(tenantId),
      this.checkDataIntegrity(tenantId),
      this.checkPerformanceMetrics(tenantId),
    ]);

    return {
      tenantId,
      timestamp: new Date().toISOString(),
      overall: checks.every((check) => check.status === 'fulfilled') ? 'healthy' : 'degraded',
      checks: {
        database: checks[0].status === 'fulfilled',
        cache: checks[1].status === 'fulfilled',
        dataIntegrity: checks[2].status === 'fulfilled',
        performance: checks[3].status === 'fulfilled',
      },
    };
  }

  async alertOnTenantIssues(tenantId: string): Promise<void> {
    const health = await this.checkTenantHealth(tenantId);

    if (health.overall !== 'healthy') {
      await this.sendAlert({
        severity: 'high',
        message: `Tenant ${tenantId} health degraded`,
        details: health,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
```

This comprehensive guide provides everything needed to understand, configure, and implement
multi-tenancy in NodeAngularFullStack, from simple single-tenant setups to complex multi-tenant SaaS
architectures.
