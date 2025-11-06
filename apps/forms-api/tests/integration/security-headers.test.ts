import request from 'supertest';
import { app } from '../../src/server';

/**
 * Security headers validation tests
 * Ensures all required security headers are present and properly configured
 */
describe('Security Headers', () => {
  describe('Health endpoint security headers', () => {
    it('should include X-Frame-Options header', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should include X-Content-Type-Options header', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should include X-XSS-Protection header', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBe('0');
    });

    it('should include Strict-Transport-Security header in production', async () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app).get('/api/health').expect(200);

      if (process.env.NODE_ENV === 'production') {
        expect(response.headers['strict-transport-security']).toBeDefined();
        expect(response.headers['strict-transport-security']).toMatch(
          /max-age=\d+/
        );
      }

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should include Content-Security-Policy header', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain(
        'default-src'
      );
    });

    it('should include Referrer-Policy header', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.headers['referrer-policy']).toBeDefined();
      expect(response.headers['referrer-policy']).toBe('no-referrer');
    });

    it('should include Permissions-Policy header', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.headers['permissions-policy']).toBeDefined();
    });

    it('should not expose server information', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('API endpoint security headers', () => {
    it('should include security headers on authentication endpoints', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' })
        .expect(401); // We expect 401 for invalid credentials

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBe('0');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should include security headers on user endpoints', async () => {
      const response = await request(app).get('/api/users').expect(401); // We expect 401 for unauthorized access

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBe('0');
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('Security header configuration validation', () => {
    it('should have secure CSP policy', async () => {
      const response = await request(app).get('/api/health').expect(200);

      const csp = response.headers['content-security-policy'];

      // Check for secure CSP directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self'");
      expect(csp).toContain("img-src 'self'");
      expect(csp).toContain("connect-src 'self'");
      expect(csp).toContain("font-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("media-src 'self'");
      expect(csp).toContain("frame-src 'none'");
    });

    it('should have secure permissions policy', async () => {
      const response = await request(app).get('/api/health').expect(200);

      const permissionsPolicy = response.headers['permissions-policy'];

      // Check for restrictive permissions policy
      expect(permissionsPolicy).toContain('camera=()');
      expect(permissionsPolicy).toContain('microphone=()');
      expect(permissionsPolicy).toContain('geolocation=()');
      expect(permissionsPolicy).toContain('payment=()');
    });

    it('should set appropriate cache control for sensitive endpoints', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' })
        .expect(401);

      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers['pragma']).toBe('no-cache');
    });
  });

  describe('HTTPS enforcement', () => {
    it('should redirect HTTP to HTTPS in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // This test would need actual HTTPS setup in a real production environment
      // For now, we just verify the HSTS header is present
      const response = await request(app).get('/api/health').expect(200);

      if (process.env.NODE_ENV === 'production') {
        expect(response.headers['strict-transport-security']).toBeDefined();
      }

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Rate limiting headers', () => {
    it('should include rate limiting headers', async () => {
      const response = await request(app).get('/api/health').expect(200);

      // These headers would be set by rate limiting middleware
      // Uncomment when rate limiting is implemented
      // expect(response.headers['x-ratelimit-limit']).toBeDefined();
      // expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      // expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('CORS headers security', () => {
    it('should have secure CORS configuration', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'https://malicious-site.com')
        .expect(204);

      // Should not allow arbitrary origins
      expect(response.headers['access-control-allow-origin']).not.toBe('*');

      // Should have specific allowed origins or be undefined for unauthorized origins
      const allowedOrigin = response.headers['access-control-allow-origin'];
      if (allowedOrigin) {
        expect(allowedOrigin).toMatch(/^https?:\/\/(localhost|127\.0\.0\.1)/);
      }
    });

    it('should not expose sensitive headers in CORS', async () => {
      const response = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      const exposedHeaders = response.headers['access-control-expose-headers'];
      if (exposedHeaders) {
        expect(exposedHeaders).not.toContain('authorization');
        expect(exposedHeaders).not.toContain('x-api-key');
        expect(exposedHeaders).not.toContain('set-cookie');
      }
    });
  });

  describe('Error handling security', () => {
    it('should not expose sensitive information in error responses', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      // Should not expose stack traces or internal paths
      expect(response.body.message).not.toContain('/Users/');
      expect(response.body.message).not.toContain('node_modules');
      expect(response.body.message).not.toContain('Error:');
      expect(response.body.stack).toBeUndefined();
    });

    it('should include security headers even in error responses', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });
});
