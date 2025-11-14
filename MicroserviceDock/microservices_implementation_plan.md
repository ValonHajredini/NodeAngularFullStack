# Microservices Implementation Plan - Phased Approach

**Project:** NodeAngularFullStack Microservices Migration **Date:** 2025-10-23 **Approach:** Gradual
Microservices (Starting with POC) **Status:** Implementation Ready

---

## Table of Contents

1. [Implementation Strategy](#implementation-strategy)
2. [Phase 0: Proof of Concept](#phase-0-proof-of-concept-1-week)
3. [Phase 1: Foundation Setup](#phase-1-foundation-setup-2-weeks)
4. [Phase 2: Service Extraction](#phase-2-service-extraction-6-weeks)
5. [Phase 3: Production Deployment](#phase-3-production-deployment-2-weeks)
6. [Success Metrics](#success-metrics)
7. [Risk Mitigation](#risk-mitigation)
8. [Rollback Plan](#rollback-plan)

---

## Implementation Strategy

### Why Start with Short Links Service?

**Rationale:**

- ✅ **Simplest service** - minimal business logic
- ✅ **Lowest risk** - non-critical feature
- ✅ **Isolated** - no complex dependencies on forms/SVG
- ✅ **Stateless** - easy to scale and test
- ✅ **Fast to implement** - 1 week for POC
- ✅ **Learning opportunity** - proves microservices patterns work

**Service Characteristics:**

```
Short Links Service
├── 4 API endpoints (generate, get, analytics, redirect)
├── 3 database tables (short_links, link_clicks, qr_codes)
├── No user authentication required for public redirects
├── Stateless and cacheable
└── Perfect for Redis caching demo
```

### Migration Order

```mermaid
graph LR
    A[Current Monolith] --> B[Phase 0: POC<br/>Short Links]
    B --> C[Phase 1: Foundation<br/>Shared Libs]
    C --> D[Phase 2a: Forms Service]
    D --> E[Phase 2b: SVG Service]
    E --> F[Phase 2c: Platform Service]
    F --> G[Phase 3: Production]
```

---

## Phase 0: Proof of Concept (1 Week)

### Goal

Validate microservices architecture with minimal risk by extracting Short Links service.

### Deliverables Checklist

- [ ] Links service backend running on port 3003
- [ ] Links database (`links_db`) separated from main DB
- [ ] Data migration script for short links
- [ ] API Gateway routing to links service
- [ ] Basic authentication integration with Platform API
- [ ] Docker Compose setup for local development
- [ ] Integration tests passing
- [ ] Documentation updated

### Day-by-Day Plan

#### Day 1: Service Scaffolding

**Morning (4 hours):**

```bash
# Create service directory structure
mkdir -p apps/links-api/src/{controllers,services,repositories,routes,middleware,config}
mkdir -p apps/links-api/database/{migrations,seeds}
mkdir -p apps/links-api/tests/{unit,integration}

# Initialize npm package
cd apps/links-api
npm init -y

# Install dependencies
npm install express typescript @types/express @types/node
npm install pg @types/pg
npm install qrcode @types/qrcode
npm install axios dotenv
npm install -D ts-node nodemon jest @types/jest supertest
```

**Afternoon (4 hours):**

- [ ] Create `tsconfig.json` with strict mode
- [ ] Create `server.ts` entry point
- [ ] Set up Express app with middleware
- [ ] Create health check endpoint
- [ ] Test server starts on port 3003

**Output:**

```
apps/links-api/
├── src/
│   ├── server.ts          ✅ Basic Express server
│   ├── app.ts             ✅ App configuration
│   └── config/
│       └── database.ts    ✅ PostgreSQL connection
├── package.json           ✅ Dependencies
├── tsconfig.json          ✅ TypeScript config
└── .env.example           ✅ Environment template
```

---

#### Day 2: Database Setup

**Morning (4 hours):**

```sql
-- Create new database
CREATE DATABASE links_db;

-- Migration: 001_create_short_links_table.sql
CREATE TABLE short_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    original_url TEXT NOT NULL,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    token VARCHAR(255),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_short_links_code ON short_links(short_code);
CREATE INDEX idx_short_links_user ON short_links(user_id);
CREATE INDEX idx_short_links_resource ON short_links(resource_type, resource_id);

-- Migration: 002_create_link_clicks_table.sql
CREATE TABLE link_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_link_id UUID NOT NULL REFERENCES short_links(id) ON DELETE CASCADE,
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    country VARCHAR(2),
    city VARCHAR(100)
);

CREATE INDEX idx_link_clicks_link ON link_clicks(short_link_id);
CREATE INDEX idx_link_clicks_date ON link_clicks(clicked_at);

-- Migration: 003_create_qr_codes_table.sql
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_link_id UUID NOT NULL REFERENCES short_links(id) ON DELETE CASCADE,
    image_data TEXT NOT NULL,
    format VARCHAR(10) DEFAULT 'png',
    size INTEGER DEFAULT 256,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Afternoon (4 hours):**

- [ ] Create database connection pool
- [ ] Write migration runner script
- [ ] Create data migration script from monolith
- [ ] Test migrations work
- [ ] Seed with test data

**Data Migration Script:**

```typescript
// scripts/migrate-links-data.ts
import { Pool } from 'pg';

const sourceDb = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'nodeangularfullstack_db',
  user: 'dbuser',
  password: 'dbpassword',
});

const targetDb = new Pool({
  host: 'localhost',
  port: 5435,
  database: 'links_db',
  user: 'dbuser',
  password: 'dbpassword',
});

async function migrateShortLinks() {
  console.log('Starting short links migration...');

  // 1. Migrate short_links table
  const linksResult = await sourceDb.query(`
    SELECT * FROM short_links
  `);

  for (const link of linksResult.rows) {
    await targetDb.query(
      `
      INSERT INTO short_links
      (id, user_id, resource_type, resource_id, original_url, short_code, token, expires_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        link.id,
        link.user_id,
        link.resource_type || 'form',
        link.resource_id,
        link.original_url,
        link.short_code,
        link.token,
        link.expires_at,
        link.created_at,
        link.updated_at,
      ]
    );
  }

  console.log(`Migrated ${linksResult.rows.length} short links`);

  // 2. Validate migration
  const targetCount = await targetDb.query('SELECT COUNT(*) FROM short_links');
  console.log(`Target database has ${targetCount.rows[0].count} records`);

  await sourceDb.end();
  await targetDb.end();
}

migrateShortLinks().catch(console.error);
```

---

#### Day 3: Core Business Logic

**Morning (4 hours):**

**Repository Layer:**

```typescript
// src/repositories/links.repository.ts
import { Pool } from 'pg';
import { ShortLink, CreateShortLinkDto } from '@nodeangularfullstack/shared';

export class LinksRepository {
  constructor(private pool: Pool) {}

  async create(dto: CreateShortLinkDto): Promise<ShortLink> {
    const result = await this.pool.query(
      `
      INSERT INTO short_links
      (user_id, resource_type, resource_id, original_url, short_code, token, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [
        dto.userId,
        dto.resourceType,
        dto.resourceId,
        dto.originalUrl,
        dto.shortCode,
        dto.token,
        dto.expiresAt,
      ]
    );
    return result.rows[0];
  }

  async findByShortCode(shortCode: string): Promise<ShortLink | null> {
    const result = await this.pool.query('SELECT * FROM short_links WHERE short_code = $1', [
      shortCode,
    ]);
    return result.rows[0] || null;
  }

  async findByUserId(userId: string): Promise<ShortLink[]> {
    const result = await this.pool.query(
      'SELECT * FROM short_links WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async recordClick(shortLinkId: string, metadata: ClickMetadata): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO link_clicks (short_link_id, ip_address, user_agent, referrer)
      VALUES ($1, $2, $3, $4)
    `,
      [shortLinkId, metadata.ipAddress, metadata.userAgent, metadata.referrer]
    );
  }

  async getAnalytics(shortLinkId: string): Promise<LinkAnalytics> {
    const result = await this.pool.query(
      `
      SELECT
        COUNT(*) as total_clicks,
        COUNT(DISTINCT ip_address) as unique_visitors,
        DATE_TRUNC('day', clicked_at) as day,
        COUNT(*) as clicks_per_day
      FROM link_clicks
      WHERE short_link_id = $1
      GROUP BY day
      ORDER BY day DESC
    `,
      [shortLinkId]
    );

    return {
      totalClicks: parseInt(result.rows[0]?.total_clicks || '0'),
      uniqueVisitors: parseInt(result.rows[0]?.unique_visitors || '0'),
      clicksOverTime: result.rows,
    };
  }
}
```

**Afternoon (4 hours):**

**Service Layer:**

```typescript
// src/services/links.service.ts
import { LinksRepository } from '../repositories/links.repository';
import { generateShortCode } from '../utils/short-code-generator';
import QRCode from 'qrcode';

export class LinksService {
  constructor(private repository: LinksRepository) {}

  async generateShortLink(dto: CreateShortLinkDto): Promise<ShortLink> {
    // Generate unique short code
    let shortCode: string;
    let attempts = 0;
    do {
      shortCode = generateShortCode();
      const existing = await this.repository.findByShortCode(shortCode);
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error('Failed to generate unique short code');
    }

    // Create short link
    const shortLink = await this.repository.create({
      ...dto,
      shortCode,
      expiresAt: dto.expiresAt || null,
    });

    return shortLink;
  }

  async getShortLink(shortCode: string): Promise<ShortLink | null> {
    const link = await this.repository.findByShortCode(shortCode);

    // Check expiration
    if (link && link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return null; // Expired
    }

    return link;
  }

  async redirect(shortCode: string, metadata: ClickMetadata): Promise<string> {
    const link = await this.getShortLink(shortCode);

    if (!link) {
      throw new Error('Short link not found or expired');
    }

    // Record click asynchronously
    this.repository.recordClick(link.id, metadata).catch(console.error);

    return link.originalUrl;
  }

  async generateQRCode(shortCode: string): Promise<string> {
    const link = await this.getShortLink(shortCode);

    if (!link) {
      throw new Error('Short link not found');
    }

    const url = `${process.env['BASE_URL']}/${shortCode}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrDataUrl;
  }

  async getAnalytics(shortCode: string): Promise<LinkAnalytics> {
    const link = await this.getShortLink(shortCode);

    if (!link) {
      throw new Error('Short link not found');
    }

    return this.repository.getAnalytics(link.id);
  }
}
```

**Utility:**

```typescript
// src/utils/short-code-generator.ts
export function generateShortCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

---

#### Day 4: API Endpoints

**Morning (4 hours):**

**Controllers:**

```typescript
// src/controllers/links.controller.ts
import { Request, Response } from 'express';
import { LinksService } from '../services/links.service';

export class LinksController {
  constructor(private service: LinksService) {}

  /**
   * POST /api/links/generate
   * Generate a new short link
   */
  generateLink = async (req: Request, res: Response) => {
    try {
      const { originalUrl, resourceType, resourceId, expiresAt } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!originalUrl) {
        return res.status(400).json({ error: 'originalUrl is required' });
      }

      const shortLink = await this.service.generateShortLink({
        userId,
        originalUrl,
        resourceType: resourceType || 'external',
        resourceId: resourceId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      res.status(201).json(shortLink);
    } catch (error) {
      console.error('Error generating short link:', error);
      res.status(500).json({ error: 'Failed to generate short link' });
    }
  };

  /**
   * GET /api/links/:shortCode
   * Get short link details
   */
  getLink = async (req: Request, res: Response) => {
    try {
      const { shortCode } = req.params;
      const link = await this.service.getShortLink(shortCode);

      if (!link) {
        return res.status(404).json({ error: 'Short link not found' });
      }

      res.json(link);
    } catch (error) {
      console.error('Error getting short link:', error);
      res.status(500).json({ error: 'Failed to get short link' });
    }
  };

  /**
   * GET /api/links/:shortCode/analytics
   * Get analytics for short link
   */
  getAnalytics = async (req: Request, res: Response) => {
    try {
      const { shortCode } = req.params;
      const analytics = await this.service.getAnalytics(shortCode);

      res.json(analytics);
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  };

  /**
   * GET /api/links/:shortCode/qr
   * Generate QR code for short link
   */
  getQRCode = async (req: Request, res: Response) => {
    try {
      const { shortCode } = req.params;
      const qrDataUrl = await this.service.generateQRCode(shortCode);

      res.json({ qrCode: qrDataUrl });
    } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  };

  /**
   * GET /:shortCode
   * Public redirect endpoint
   */
  redirect = async (req: Request, res: Response) => {
    try {
      const { shortCode } = req.params;

      const metadata = {
        ipAddress: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
        referrer: req.headers['referer'] || '',
      };

      const originalUrl = await this.service.redirect(shortCode, metadata);

      res.redirect(302, originalUrl);
    } catch (error) {
      console.error('Error redirecting:', error);
      res.status(404).send('Short link not found');
    }
  };
}
```

**Afternoon (4 hours):**

**Routes:**

```typescript
// src/routes/links.routes.ts
import { Router } from 'express';
import { LinksController } from '../controllers/links.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export function createLinksRoutes(controller: LinksController): Router {
  const router = Router();

  // Protected routes (require authentication)
  router.post('/generate', authMiddleware, controller.generateLink);
  router.get('/:shortCode', authMiddleware, controller.getLink);
  router.get('/:shortCode/analytics', authMiddleware, controller.getAnalytics);
  router.get('/:shortCode/qr', controller.getQRCode); // Public QR code

  return router;
}

// src/routes/redirect.routes.ts
import { Router } from 'express';
import { LinksController } from '../controllers/links.controller';

export function createRedirectRoutes(controller: LinksController): Router {
  const router = Router();

  // Public redirect route (no authentication)
  router.get('/:shortCode', controller.redirect);

  return router;
}
```

**Server Setup:**

```typescript
// src/server.ts
import express from 'express';
import { Pool } from 'pg';
import { LinksRepository } from './repositories/links.repository';
import { LinksService } from './services/links.service';
import { LinksController } from './controllers/links.controller';
import { createLinksRoutes } from './routes/links.routes';
import { createRedirectRoutes } from './routes/redirect.routes';
import { databaseConfig } from './config/database';

const app = express();
const port = process.env['PORT'] || 3003;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const pool = new Pool(databaseConfig);

// Initialize dependencies
const repository = new LinksRepository(pool);
const service = new LinksService(repository);
const controller = new LinksController(service);

// Routes
app.use('/api/links', createLinksRoutes(controller));
app.use('/', createRedirectRoutes(controller));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'links-api', timestamp: new Date() });
});

// Start server
app.listen(port, () => {
  console.log(`Links API listening on port ${port}`);
});
```

---

#### Day 5: Authentication Integration

**Morning (4 hours):**

**Auth Middleware:**

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const PLATFORM_API_URL = process.env['PLATFORM_API_URL'] || 'http://localhost:3000';
const SERVICE_AUTH_TOKEN = process.env['SERVICE_AUTH_TOKEN'];

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // Validate token with Platform API
    const response = await axios.post(
      `${PLATFORM_API_URL}/api/auth/validate`,
      { token },
      {
        headers: {
          'X-Service-Token': SERVICE_AUTH_TOKEN,
        },
        timeout: 5000,
      }
    );

    // Attach user to request
    req.user = response.data.user;
    next();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication service unavailable' });
  }
}
```

**Afternoon (4 hours):**

**Platform API Validation Endpoint** (add to existing Platform API):

```typescript
// apps/api/src/controllers/auth.controller.ts (EXISTING API)

/**
 * POST /api/auth/validate
 * Service-to-service token validation
 */
export const validateToken = AsyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const serviceToken = req.headers['x-service-token'];

  // Validate service token
  if (serviceToken !== process.env['SERVICE_AUTH_TOKEN']) {
    return res.status(403).json({ error: 'Invalid service token' });
  }

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    // Verify JWT
    const decoded = jwt.verify(token, process.env['JWT_SECRET'] || '');

    // Get user from database
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

---

#### Day 6: Docker & API Gateway

**Morning (4 hours):**

**Dockerfile:**

```dockerfile
# infrastructure/docker/links-api.Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY apps/links-api/package*.json ./
COPY packages/shared/package.json ../packages/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY apps/links-api/src ./src
COPY apps/links-api/tsconfig.json ./
COPY packages/shared ../packages/shared

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3003

# Start server
CMD ["node", "dist/server.js"]
```

**Docker Compose Update:**

```yaml
# Add to infrastructure/docker-compose.yml

services:
  # ... existing services ...

  links-db:
    image: postgres:15
    container_name: links-db
    environment:
      POSTGRES_DB: links_db
      POSTGRES_USER: dbuser
      POSTGRES_PASSWORD: dbpassword
    ports:
      - '5435:5432'
    volumes:
      - links-db-data:/var/lib/postgresql/data

  links-api:
    build:
      context: ../..
      dockerfile: infrastructure/docker/links-api.Dockerfile
    container_name: links-api
    ports:
      - '3003:3003'
    environment:
      NODE_ENV: development
      PORT: 3003
      DATABASE_URL: postgresql://dbuser:dbpassword@links-db:5432/links_db
      PLATFORM_API_URL: http://platform-api:3000
      SERVICE_AUTH_TOKEN: ${SERVICE_AUTH_TOKEN}
      BASE_URL: http://localhost:8080
    depends_on:
      - links-db
      - platform-api
    volumes:
      - ../../apps/links-api:/app
      - /app/node_modules

volumes:
  links-db-data:
```

**Afternoon (4 hours):**

**Nginx API Gateway Update:**

```nginx
# infrastructure/nginx/api-gateway.conf

http {
    # ... existing upstreams ...

    upstream links_api {
        server links-api:3003;
    }

    server {
        listen 80;
        server_name localhost;

        # ... existing routes ...

        # Links API Routes
        location /api/links {
            proxy_pass http://links_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Short link redirect (public, no /api prefix)
        location ~ ^/[a-zA-Z0-9]{6,10}$ {
            proxy_pass http://links_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

**Test Commands:**

```bash
# Start all services
docker-compose up -d

# Check links-api health
curl http://localhost:3003/health

# Check through API Gateway
curl http://localhost:8080/api/links/health

# Test link generation (with auth token)
curl -X POST http://localhost:8080/api/links/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "originalUrl": "https://example.com/very/long/url",
    "resourceType": "form",
    "resourceId": "123e4567-e89b-12d3-a456-426614174000"
  }'

# Test redirect
curl -L http://localhost:8080/abc12345
```

---

#### Day 7: Testing & Documentation

**Morning (4 hours):**

**Unit Tests:**

```typescript
// tests/unit/links.service.test.ts
import { LinksService } from '../../src/services/links.service';
import { LinksRepository } from '../../src/repositories/links.repository';

describe('LinksService', () => {
  let service: LinksService;
  let mockRepository: jest.Mocked<LinksRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findByShortCode: jest.fn(),
      recordClick: jest.fn(),
      getAnalytics: jest.fn(),
    } as any;

    service = new LinksService(mockRepository);
  });

  describe('generateShortLink', () => {
    it('should generate unique short code', async () => {
      mockRepository.findByShortCode.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue({
        id: '123',
        userId: 'user1',
        shortCode: 'abc123',
        originalUrl: 'https://example.com',
      } as any);

      const result = await service.generateShortLink({
        userId: 'user1',
        originalUrl: 'https://example.com',
        resourceType: 'external',
      });

      expect(result.shortCode).toMatch(/^[a-zA-Z0-9]{8}$/);
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should retry if short code collision occurs', async () => {
      mockRepository.findByShortCode
        .mockResolvedValueOnce({ id: '1' } as any) // First attempt - collision
        .mockResolvedValueOnce(null); // Second attempt - success

      mockRepository.create.mockResolvedValue({
        id: '123',
        shortCode: 'def456',
      } as any);

      const result = await service.generateShortLink({
        userId: 'user1',
        originalUrl: 'https://example.com',
        resourceType: 'external',
      });

      expect(mockRepository.findByShortCode).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });
  });

  describe('redirect', () => {
    it('should record click and return original URL', async () => {
      const mockLink = {
        id: 'link1',
        originalUrl: 'https://example.com',
        expiresAt: null,
      };

      mockRepository.findByShortCode.mockResolvedValue(mockLink as any);
      mockRepository.recordClick.mockResolvedValue();

      const url = await service.redirect('abc123', {
        ipAddress: '127.0.0.1',
        userAgent: 'Test',
        referrer: '',
      });

      expect(url).toBe('https://example.com');
      expect(mockRepository.recordClick).toHaveBeenCalledWith('link1', expect.any(Object));
    });

    it('should reject expired links', async () => {
      const expiredLink = {
        id: 'link1',
        originalUrl: 'https://example.com',
        expiresAt: new Date('2020-01-01'),
      };

      mockRepository.findByShortCode.mockResolvedValue(expiredLink as any);

      await expect(
        service.redirect('abc123', { ipAddress: '127.0.0.1', userAgent: '', referrer: '' })
      ).rejects.toThrow('Short link not found or expired');
    });
  });
});
```

**Integration Tests:**

```typescript
// tests/integration/links.api.test.ts
import request from 'supertest';
import { app } from '../../src/app';

describe('Links API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Get auth token from Platform API
    const loginResponse = await request('http://localhost:3000')
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'User123!@#' });

    authToken = loginResponse.body.accessToken;
  });

  describe('POST /api/links/generate', () => {
    it('should generate short link with valid auth', async () => {
      const response = await request(app)
        .post('/api/links/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          originalUrl: 'https://example.com/very/long/url',
          resourceType: 'form',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('shortCode');
      expect(response.body.shortCode).toMatch(/^[a-zA-Z0-9]{8}$/);
    });

    it('should reject without auth token', async () => {
      const response = await request(app)
        .post('/api/links/generate')
        .send({ originalUrl: 'https://example.com' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /:shortCode', () => {
    it('should redirect to original URL', async () => {
      // First create a link
      const createResponse = await request(app)
        .post('/api/links/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ originalUrl: 'https://example.com/test' });

      const shortCode = createResponse.body.shortCode;

      // Test redirect
      const response = await request(app).get(`/${shortCode}`).redirects(0); // Don't follow redirects

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('https://example.com/test');
    });
  });
});
```

**Afternoon (4 hours):**

**Documentation:**

````markdown
# Links Service API Documentation

## Base URL

- Development: `http://localhost:3003`
- Production: `https://links-api.yourapp.com`

## Authentication

All endpoints except public redirect require Bearer token authentication.

## Endpoints

### Generate Short Link

**POST /api/links/generate**

Request:

```json
{
  "originalUrl": "https://example.com/very/long/url",
  "resourceType": "form",
  "resourceId": "uuid",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```
````

Response:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "shortCode": "abc12345",
  "originalUrl": "https://example.com/very/long/url",
  "resourceType": "form",
  "resourceId": "uuid",
  "expiresAt": "2025-12-31T23:59:59Z",
  "createdAt": "2025-10-23T12:00:00Z"
}
```

### Get Short Link

**GET /api/links/:shortCode**

Response:

```json
{
  "id": "uuid",
  "shortCode": "abc12345",
  "originalUrl": "https://example.com/very/long/url",
  "createdAt": "2025-10-23T12:00:00Z"
}
```

### Get Analytics

**GET /api/links/:shortCode/analytics**

Response:

```json
{
  "totalClicks": 150,
  "uniqueVisitors": 75,
  "clicksOverTime": [
    { "day": "2025-10-23", "clicks": 50 },
    { "day": "2025-10-22", "clicks": 100 }
  ]
}
```

### Get QR Code

**GET /api/links/:shortCode/qr**

Response:

```json
{
  "qrCode": "data:image/png;base64,..."
}
```

### Public Redirect

**GET /:shortCode**

Redirects (302) to original URL and records analytics.

````

**Run Tests:**
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests with coverage
npm run test:coverage
````

---

### Phase 0 Success Criteria

✅ **Technical Validation:**

- [ ] Links service runs independently on port 3003
- [ ] Database separated with successful data migration
- [ ] All 4 endpoints working correctly
- [ ] Authentication integration with Platform API functional
- [ ] Docker Compose setup complete
- [ ] Unit tests passing (≥80% coverage)
- [ ] Integration tests passing
- [ ] API Gateway routing working

✅ **Business Validation:**

- [ ] Can generate short links via new service
- [ ] Short link redirects work
- [ ] Analytics tracked correctly
- [ ] QR codes generated successfully
- [ ] No disruption to existing monolith features

✅ **Performance Validation:**

- [ ] Response time < 200ms for redirect
- [ ] Response time < 500ms for generation
- [ ] Service handles 100 concurrent requests

✅ **Documentation:**

- [ ] API documentation complete
- [ ] Setup instructions written
- [ ] Architecture diagram updated
- [ ] Migration runbook created

---

## Phase 1: Foundation Setup (2 Weeks)

### Goal

Establish shared libraries and infrastructure for all future services.

### Week 1: Shared Libraries

**Day 1-2: Shared UI Component Library**

```bash
# Create shared UI library
npx nx generate @nx/angular:library shared-ui \
  --directory=packages/shared-ui \
  --publishable \
  --importPath=@yourapp/shared-ui

# Extract components from apps/web/src/app/shared/
# - Button, Modal, Card, Toast, LoadingSpinner
# - DataTable, FormField, ToolCard

# Build and publish to npm workspace
cd packages/shared-ui
npm run build
```

**Day 3-4: Shared Types Library**

```bash
# Create shared types
npx nx generate @nx/js:library shared-types \
  --directory=packages/shared-types \
  --publishable \
  --importPath=@yourapp/shared-types

# Extract types from packages/shared/
# - auth.types.ts
# - forms.types.ts
# - svg.types.ts
# - links.types.ts
```

**Day 5: Shared Config Library**

```typescript
// packages/shared-config/src/api-endpoints.ts
export const API_ENDPOINTS = {
  PLATFORM_API: process.env['PLATFORM_API_URL'] || 'http://localhost:3000',
  FORMS_API: process.env['FORMS_API_URL'] || 'http://localhost:3001',
  SVG_API: process.env['SVG_API_URL'] || 'http://localhost:3002',
  LINKS_API: process.env['LINKS_API_URL'] || 'http://localhost:3003',
};
```

### Week 2: Infrastructure

**Day 1-2: CI/CD Pipeline Setup**

```yaml
# .github/workflows/links-api.yml
name: Links API CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'apps/links-api/**'
      - 'packages/shared-types/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:links-api
      - run: npm run build:links-api

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          docker build -t links-api:${{ github.sha }} .
          docker push yourregistry/links-api:${{ github.sha }}
```

**Day 3-4: Monitoring Setup**

```typescript
// packages/shared-backend/monitoring.ts
import { Request, Response, NextFunction } from 'express';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        service: process.env['SERVICE_NAME'],
      })
    );
  });

  next();
}
```

**Day 5: Load Testing**

```javascript
// tests/load/links-api.k6.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 }, // Ramp-up to 50 users
    { duration: '3m', target: 50 }, // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp-up to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 }, // Ramp-down to 0 users
  ],
};

export default function () {
  // Test redirect endpoint
  let response = http.get('http://localhost:3003/abc12345');
  check(response, {
    'redirect status is 302': (r) => r.status === 302,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

Run:

```bash
k6 run tests/load/links-api.k6.js
```

---

## Phase 2: Service Extraction (6 Weeks)

### Week 1-2: Forms Service

**Goals:**

- Extract form builder, themes, submissions
- Separate `forms_db` database
- Migrate all form-related endpoints

**Tasks:**

1. Create `apps/forms-api/` structure
2. Migrate controllers: forms, themes, submissions, public-forms
3. Set up `forms_db` with 4 tables
4. Migrate data from monolith
5. Integrate with Platform API for user validation
6. Integrate with Links API for short link generation
7. Write tests (≥80% coverage)
8. Deploy to Docker Compose

### Week 3-4: SVG Service

**Goals:**

- Extract SVG drawing functionality
- Separate `svg_db` database
- Migrate drawing endpoints

**Tasks:**

1. Create `apps/svg-api/` structure
2. Migrate controllers: drawings, shapes, templates, exports
3. Set up `svg_db` with 4 tables
4. Migrate data from monolith
5. Integrate with Platform API
6. Implement Sharp.js for image processing
7. Write tests (≥80% coverage)
8. Deploy to Docker Compose

### Week 5-6: Platform Service Consolidation

**Goals:**

- Consolidate remaining features into Platform service
- Refactor existing `apps/api/` to `apps/platform-api/`
- Remove extracted features from monolith

**Tasks:**

1. Rename `apps/api/` to `apps/platform-api/`
2. Remove forms, svg, links code
3. Keep only: auth, users, tenants, dashboard
4. Rename database to `platform_db`
5. Update all service references
6. Deploy to Docker Compose
7. Validate all services communicate correctly

---

## Phase 3: Production Deployment (2 Weeks)

### Week 1: Infrastructure Setup

**Day 1-2: DNS Configuration**

```
Configure subdomains:
- yourapp.com              → Main dashboard
- forms.yourapp.com        → Forms UI
- draw.yourapp.com         → SVG UI
- api.yourapp.com          → API Gateway
- links.yourapp.com        → Short link redirects
```

**Day 3-4: SSL Certificates**

```bash
# Using Let's Encrypt
certbot certonly --nginx -d yourapp.com
certbot certonly --nginx -d forms.yourapp.com
certbot certonly --nginx -d draw.yourapp.com
certbot certonly --nginx -d api.yourapp.com
certbot certonly --nginx -d links.yourapp.com
```

**Day 5: Database Clusters**

```
Set up managed PostgreSQL:
- Platform DB: 2 vCPU, 4GB RAM, Primary + 1 Replica
- Forms DB: 2 vCPU, 4GB RAM, Primary + 1 Replica
- SVG DB: 1 vCPU, 2GB RAM, Primary only
- Links DB: 1 vCPU, 2GB RAM, Primary only
```

### Week 2: Service Deployment

**Day 1-2: Backend Services**

```bash
# Deploy each service to production server
docker-compose -f docker-compose.prod.yml up -d platform-api
docker-compose -f docker-compose.prod.yml up -d forms-api
docker-compose -f docker-compose.prod.yml up -d svg-api
docker-compose -f docker-compose.prod.yml up -d links-api
```

**Day 3-4: Frontend Services**

```bash
# Build and deploy Angular apps
npm run build:dashboard --prod
npm run build:forms --prod
npm run build:svg --prod

# Upload to CDN or static hosting
```

**Day 5: Validation & Monitoring**

```bash
# Smoke tests
curl https://api.yourapp.com/health
curl https://api.yourapp.com/api/links/health
curl https://api.yourapp.com/api/forms/health

# Monitor for 24 hours
# - Check error rates
# - Check response times
# - Check database connections
# - Check inter-service communication
```

---

## Success Metrics

### Technical Metrics

| Metric               | Target  | Measurement           |
| -------------------- | ------- | --------------------- |
| Service Uptime       | 99.5%   | CloudWatch/Prometheus |
| Response Time (P95)  | < 500ms | APM tools             |
| Error Rate           | < 1%    | Application logs      |
| Test Coverage        | ≥ 80%   | Jest coverage report  |
| Build Time           | < 5 min | CI/CD pipeline        |
| Deployment Frequency | Daily   | GitHub Actions        |

### Business Metrics

| Metric                  | Target    | Measurement         |
| ----------------------- | --------- | ------------------- |
| Feature Deployment Time | < 2 hours | Release logs        |
| Service Isolation       | 100%      | Architecture review |
| Zero-Downtime Deploys   | 100%      | Deployment logs     |
| Developer Satisfaction  | ≥ 8/10    | Team survey         |

---

## Risk Mitigation

### High-Priority Risks

**Risk 1: Service-to-Service Communication Failures**

- **Mitigation**: Implement circuit breakers, retries, fallbacks
- **Detection**: Monitor inter-service call success rates
- **Response**: Automatic retry with exponential backoff

**Risk 2: Data Inconsistency Across Services**

- **Mitigation**: Eventual consistency patterns, event sourcing
- **Detection**: Data validation cron jobs
- **Response**: Reconciliation scripts to fix inconsistencies

**Risk 3: Performance Degradation**

- **Mitigation**: Load testing before production, caching strategy
- **Detection**: APM monitoring, alerting on P95 > 500ms
- **Response**: Scale horizontally, optimize database queries

**Risk 4: Increased Operational Complexity**

- **Mitigation**: Comprehensive documentation, runbooks
- **Detection**: Incident frequency tracking
- **Response**: Post-mortem reviews, process improvements

---

## Rollback Plan

### If POC Fails (Phase 0)

```
1. Stop links-api container
2. Restore short_links table to monolith database
3. Update API Gateway to route back to monolith
4. Validate links still work in monolith
5. Document lessons learned
```

### If Service Extraction Fails (Phase 2)

```
For each failed service:
1. Stop service container
2. Restore database tables to monolith
3. Revert code changes in monolith
4. Update API Gateway routing
5. Run full regression test suite
6. Monitor for 48 hours
```

### Emergency Rollback (Production)

```
1. Switch API Gateway to route all traffic to monolith
2. Scale down microservices containers
3. Restore database from backup if needed
4. Communicate outage to users
5. Post-mortem within 24 hours
```

---

## Next Steps After POC

If Phase 0 succeeds:

1. **Go/No-Go Decision Meeting**
   - Review POC results
   - Analyze metrics
   - Discuss team feedback
   - Decide on proceeding to Phase 1

2. **Team Training**
   - Docker & Kubernetes workshop
   - Microservices patterns training
   - Service mesh concepts

3. **Tooling Setup**
   - Monitoring: Prometheus + Grafana
   - Logging: ELK Stack
   - Tracing: Jaeger
   - APM: New Relic or Datadog

4. **Documentation**
   - Service catalog
   - API documentation
   - Runbooks for each service
   - On-call playbooks

---

## Timeline Summary

```
Phase 0: POC              1 week    ███░░░░░░░░░ (Complete by Week 1)
Phase 1: Foundation       2 weeks   ░░░███░░░░░░ (Weeks 2-3)
Phase 2: Extraction       6 weeks   ░░░░░░███████░░ (Weeks 4-9)
Phase 3: Production       2 weeks   ░░░░░░░░░░░░██ (Weeks 10-11)
                         ────────────────────────
Total:                   11 weeks
```

**Estimated Effort:**

- 2 developers × 11 weeks = 22 developer-weeks
- Cost: ~$88,000 (at $100/hour × 40 hours/week)

---

**Document Status:** Implementation Ready **Last Updated:** 2025-10-23 **Next Review:** After Phase
0 completion
