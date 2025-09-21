import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

/**
 * Security Configuration Tests
 * Tests for SSL/TLS, security headers, and security middleware
 */
describe('Security Configuration Tests', () => {
  const rootDir = process.cwd();

  describe('Security Middleware', () => {
    test('should have security middleware file', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      expect(fs.existsSync(securityMiddleware)).toBe(true);
    });

    test('security middleware should include rate limiting', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('rateLimit');
      expect(content).toContain('createRateLimiters');
      expect(content).toContain('apiLimiter');
      expect(content).toContain('authLimiter');
    });

    test('security middleware should include helmet configuration', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('helmet');
      expect(content).toContain('createHelmetConfig');
      expect(content).toContain('contentSecurityPolicy');
      expect(content).toContain('hsts');
    });

    test('security middleware should include CORS configuration', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('createCorsConfig');
      expect(content).toContain('corsOrigins');
      expect(content).toContain('credentials: true');
    });

    test('security middleware should include trust proxy configuration', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('configureTrustProxy');
      expect(content).toContain('trust proxy');
      expect(content).toContain('x-forwarded-for');
    });

    test('security middleware should have production and development setups', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('setupProductionSecurity');
      expect(content).toContain('setupDevelopmentSecurity');
    });
  });

  describe('Rate Limiting Configuration', () => {
    test('should have different rate limits for different endpoints', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      // API rate limiter - 100 requests per minute
      expect(content).toContain('max: parseInt(config.RATE_LIMIT_MAX_REQUESTS) || 100');

      // Auth rate limiter - 5 attempts per 15 minutes
      expect(content).toContain('max: 5');
      expect(content).toContain('15 * 60 * 1000');
    });

    test('should skip rate limiting for health checks', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('skip: (req: Request) => req.path.includes(\'/health\')');
    });

    test('should have upload speed limiting', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('uploadSpeedLimiter');
      expect(content).toContain('slowDown');
    });
  });

  describe('Security Headers Configuration', () => {
    test('should configure Content Security Policy', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('contentSecurityPolicy');
      expect(content).toContain('defaultSrc: ["\'self\'"]');
      expect(content).toContain('scriptSrc');
      expect(content).toContain('styleSrc');
    });

    test('should configure HSTS', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('hsts');
      expect(content).toContain('maxAge: 31536000'); // 1 year
      expect(content).toContain('includeSubDomains: true');
      expect(content).toContain('preload: true');
    });

    test('should configure frame protection', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('frameguard');
      expect(content).toContain('action: \'deny\'');
    });

    test('should configure XSS protection', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('xssFilter: true');
    });

    test('should hide powered by header', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('hidePoweredBy: true');
      expect(content).toContain('removeHeader(\'X-Powered-By\')');
    });
  });

  describe('Nginx Security Configuration', () => {
    test('nginx should have security headers configured', () => {
      const nginxConfig = path.join(rootDir, 'infrastructure/docker/nginx.conf');
      const content = fs.readFileSync(nginxConfig, 'utf8');

      expect(content).toContain('X-Frame-Options "SAMEORIGIN"');
      expect(content).toContain('X-Content-Type-Options "nosniff"');
      expect(content).toContain('X-XSS-Protection "1; mode=block"');
      expect(content).toContain('Strict-Transport-Security');
    });

    test('nginx should have Content Security Policy', () => {
      const nginxConfig = path.join(rootDir, 'infrastructure/docker/nginx.conf');
      const content = fs.readFileSync(nginxConfig, 'utf8');

      expect(content).toContain('Content-Security-Policy');
      expect(content).toContain('default-src \'self\'');
    });

    test('nginx should hide server tokens', () => {
      const nginxConfig = path.join(rootDir, 'infrastructure/docker/nginx.conf');
      const content = fs.readFileSync(nginxConfig, 'utf8');

      expect(content).toContain('server_tokens off');
    });

    test('nginx should have rate limiting zones', () => {
      const nginxConfig = path.join(rootDir, 'infrastructure/docker/nginx.conf');
      const content = fs.readFileSync(nginxConfig, 'utf8');

      expect(content).toContain('limit_req_zone');
      expect(content).toContain('limit_conn_zone');
      expect(content).toContain('rate=100r/m'); // 100 requests per minute
    });

    test('nginx should apply rate limiting to locations', () => {
      const nginxConfig = path.join(rootDir, 'infrastructure/docker/nginx.conf');
      const content = fs.readFileSync(nginxConfig, 'utf8');

      expect(content).toContain('limit_req zone=api');
      expect(content).toContain('limit_req zone=static');
      expect(content).toContain('limit_conn conn_limit_per_ip');
    });

    test('nginx should have proper SSL/TLS configuration', () => {
      const nginxConfig = path.join(rootDir, 'infrastructure/docker/nginx.conf');
      const content = fs.readFileSync(nginxConfig, 'utf8');

      expect(content).toContain('Strict-Transport-Security');
      expect(content).toContain('max-age=31536000');
      expect(content).toContain('includeSubDomains');
    });
  });

  describe('SSL/TLS Documentation', () => {
    test('should have SSL configuration documentation', () => {
      const sslDoc = path.join(rootDir, 'infrastructure/digitalocean/ssl-configuration.md');
      expect(fs.existsSync(sslDoc)).toBe(true);
    });

    test('SSL documentation should cover Digital Ocean configuration', () => {
      const sslDoc = path.join(rootDir, 'infrastructure/digitalocean/ssl-configuration.md');
      const content = fs.readFileSync(sslDoc, 'utf8');

      expect(content).toContain('Digital Ocean App Platform');
      expect(content).toContain('Let\'s Encrypt');
      expect(content).toContain('ondigitalocean.app');
    });

    test('SSL documentation should include security best practices', () => {
      const sslDoc = path.join(rootDir, 'infrastructure/digitalocean/ssl-configuration.md');
      const content = fs.readFileSync(sslDoc, 'utf8');

      expect(content).toContain('HSTS');
      expect(content).toContain('Certificate Validation');
      expect(content).toContain('security headers');
    });

    test('SSL documentation should include monitoring guidance', () => {
      const sslDoc = path.join(rootDir, 'infrastructure/digitalocean/ssl-configuration.md');
      const content = fs.readFileSync(sslDoc, 'utf8');

      expect(content).toContain('Certificate Monitoring');
      expect(content).toContain('SSL Labs');
      expect(content).toContain('expiration');
    });
  });

  describe('Request Size Limiting', () => {
    test('should have request size limiter middleware', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('requestSizeLimiter');
      expect(content).toContain('content-length');
      expect(content).toContain('10 * 1024 * 1024'); // 10MB
    });

    test('should return 413 for oversized requests', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('413');
      expect(content).toContain('Request entity too large');
    });
  });

  describe('CORS Security', () => {
    test('should validate origins against whitelist', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('corsOrigins.includes(origin)');
      expect(content).toContain('Not allowed by CORS');
    });

    test('should allow localhost in development only', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('development');
      expect(content).toContain('localhost');
    });

    test('should include credentials and security headers', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('credentials: true');
      expect(content).toContain('Authorization');
      expect(content).toContain('X-API-Key');
    });
  });

  describe('Security Logging', () => {
    test('should log security events', () => {
      const securityMiddleware = path.join(rootDir, 'apps/api/src/middleware/security.middleware.ts');
      const content = fs.readFileSync(securityMiddleware, 'utf8');

      expect(content).toContain('console.log');
      expect(content).toContain('security middleware configured');
    });
  });
});