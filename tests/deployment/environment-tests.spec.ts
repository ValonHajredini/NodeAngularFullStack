import { describe, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

/**
 * Environment Configuration Tests
 * Tests for production environment variable management
 */
describe('Environment Configuration Tests', () => {
  const rootDir = process.cwd();

  describe('Environment Files', () => {
    test('should have production environment example', () => {
      const prodEnvFile = path.join(rootDir, '.env.production.example');
      expect(fs.existsSync(prodEnvFile)).toBe(true);
    });

    test('should have Digital Ocean environment example', () => {
      const doEnvFile = path.join(rootDir, '.env.digitalocean.example');
      expect(fs.existsSync(doEnvFile)).toBe(true);
    });

    test('should have development environment file', () => {
      const devEnvFile = path.join(rootDir, '.env.development');
      expect(fs.existsSync(devEnvFile)).toBe(true);
    });

    test('should have general environment example', () => {
      const envFile = path.join(rootDir, '.env.example');
      expect(fs.existsSync(envFile)).toBe(true);
    });
  });

  describe('Required Environment Variables', () => {
    const requiredVars = [
      'NODE_ENV',
      'PORT',
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'CORS_ORIGINS'
    ];

    requiredVars.forEach(varName => {
      test(`production environment should include ${varName}`, () => {
        const prodEnvFile = path.join(rootDir, '.env.production.example');
        const content = fs.readFileSync(prodEnvFile, 'utf8');
        expect(content).toContain(`${varName}=`);
      });

      test(`Digital Ocean environment should include ${varName}`, () => {
        const doEnvFile = path.join(rootDir, '.env.digitalocean.example');
        const content = fs.readFileSync(doEnvFile, 'utf8');
        expect(content).toContain(`${varName}`);
      });
    });
  });

  describe('Security Configuration', () => {
    test('production environment should set NODE_ENV to production', () => {
      const prodEnvFile = path.join(rootDir, '.env.production.example');
      const content = fs.readFileSync(prodEnvFile, 'utf8');
      expect(content).toContain('NODE_ENV=production');
    });

    test('production environment should enable SSL', () => {
      const prodEnvFile = path.join(rootDir, '.env.production.example');
      const content = fs.readFileSync(prodEnvFile, 'utf8');
      expect(content).toContain('DB_SSL=true');
    });

    test('production environment should not contain localhost origins', () => {
      const prodEnvFile = path.join(rootDir, '.env.production.example');
      const content = fs.readFileSync(prodEnvFile, 'utf8');

      // Check CORS_ORIGINS line doesn't contain localhost
      const corsLine = content.split('\n').find(line => line.startsWith('CORS_ORIGINS='));
      if (corsLine) {
        expect(corsLine).not.toContain('localhost');
        expect(corsLine).not.toContain('127.0.0.1');
      }
    });

    test('JWT secrets should have placeholder values warning to change', () => {
      const prodEnvFile = path.join(rootDir, '.env.production.example');
      const content = fs.readFileSync(prodEnvFile, 'utf8');

      expect(content).toContain('CHANGE-THIS');
    });
  });

  describe('Digital Ocean Specific Configuration', () => {
    test('Digital Ocean environment should use App Platform database variable', () => {
      const doEnvFile = path.join(rootDir, '.env.digitalocean.example');
      const content = fs.readFileSync(doEnvFile, 'utf8');
      expect(content).toContain('${postgres-db.DATABASE_URL}');
    });

    test('Digital Ocean environment should use App Platform Redis variable', () => {
      const doEnvFile = path.join(rootDir, '.env.digitalocean.example');
      const content = fs.readFileSync(doEnvFile, 'utf8');
      expect(content).toContain('${redis.DATABASE_URL}');
    });

    test('Digital Ocean environment should use Spaces configuration', () => {
      const doEnvFile = path.join(rootDir, '.env.digitalocean.example');
      const content = fs.readFileSync(doEnvFile, 'utf8');

      expect(content).toContain('DO_SPACES_ENDPOINT=nyc3.digitaloceanspaces.com');
      expect(content).toContain('DO_SPACES_KEY=${DO_SPACES_KEY}');
      expect(content).toContain('DO_SPACES_SECRET=${DO_SPACES_SECRET}');
    });

    test('Digital Ocean environment should set production frontend URL', () => {
      const doEnvFile = path.join(rootDir, '.env.digitalocean.example');
      const content = fs.readFileSync(doEnvFile, 'utf8');
      expect(content).toContain('ondigitalocean.app');
    });
  });

  describe('Monitoring Configuration', () => {
    test('production environment should include Sentry configuration', () => {
      const prodEnvFile = path.join(rootDir, '.env.production.example');
      const content = fs.readFileSync(prodEnvFile, 'utf8');
      expect(content).toContain('SENTRY_DSN=');
    });

    test('production environment should include Logtail configuration', () => {
      const prodEnvFile = path.join(rootDir, '.env.production.example');
      const content = fs.readFileSync(prodEnvFile, 'utf8');
      expect(content).toContain('LOGTAIL_TOKEN=');
    });

    test('Digital Ocean environment should use secret variables for monitoring', () => {
      const doEnvFile = path.join(rootDir, '.env.digitalocean.example');
      const content = fs.readFileSync(doEnvFile, 'utf8');

      expect(content).toContain('SENTRY_DSN=${SENTRY_DSN}');
      expect(content).toContain('LOGTAIL_TOKEN=${LOGTAIL_TOKEN}');
    });
  });

  describe('Multi-tenancy Configuration', () => {
    test('production environment should have multi-tenancy options', () => {
      const prodEnvFile = path.join(rootDir, '.env.production.example');
      const content = fs.readFileSync(prodEnvFile, 'utf8');

      expect(content).toContain('ENABLE_MULTI_TENANCY');
      expect(content).toContain('TENANT_ISOLATION_LEVEL');
      expect(content).toContain('TENANT_RLS_ENABLED');
    });

    test('Digital Ocean environment should enable multi-tenancy by default', () => {
      const doEnvFile = path.join(rootDir, '.env.digitalocean.example');
      const content = fs.readFileSync(doEnvFile, 'utf8');
      expect(content).toContain('ENABLE_MULTI_TENANCY=true');
    });
  });

  describe('Rate Limiting Configuration', () => {
    test('production environment should have restrictive rate limits', () => {
      const prodEnvFile = path.join(rootDir, '.env.production.example');
      const content = fs.readFileSync(prodEnvFile, 'utf8');

      expect(content).toContain('RATE_LIMIT_WINDOW_MS=');
      expect(content).toContain('RATE_LIMIT_MAX_REQUESTS=');
    });

    test('Digital Ocean environment should have appropriate rate limits', () => {
      const doEnvFile = path.join(rootDir, '.env.digitalocean.example');
      const content = fs.readFileSync(doEnvFile, 'utf8');

      expect(content).toContain('RATE_LIMIT_WINDOW_MS=60000'); // 1 minute
      expect(content).toContain('RATE_LIMIT_MAX_REQUESTS=100');
    });
  });
});

/**
 * Environment Validation Script Tests
 */
describe('Environment Validation Scripts', () => {
  const scriptsDir = path.join(process.cwd(), 'scripts');

  test('should have secret generation script', () => {
    const scriptPath = path.join(scriptsDir, 'generate-secrets.js');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('should have environment validation script', () => {
    const scriptPath = path.join(scriptsDir, 'validate-environment.js');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  test('secret generation script should be executable', () => {
    const scriptPath = path.join(scriptsDir, 'generate-secrets.js');
    const stats = fs.statSync(scriptPath);
    expect(stats.mode & 0o111).not.toBe(0); // Check if any execute bit is set
  });

  test('environment validation script should be executable', () => {
    const scriptPath = path.join(scriptsDir, 'validate-environment.js');
    const stats = fs.statSync(scriptPath);
    expect(stats.mode & 0o111).not.toBe(0); // Check if any execute bit is set
  });

  describe('Secret Generation Script Content', () => {
    test('secret generation script should include all required secrets', () => {
      const scriptPath = path.join(scriptsDir, 'generate-secrets.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      const requiredSecrets = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'SESSION_SECRET',
        'ENCRYPTION_KEY',
        'API_KEY'
      ];

      requiredSecrets.forEach(secret => {
        expect(content).toContain(secret);
      });
    });

    test('secret generation script should support multiple output formats', () => {
      const scriptPath = path.join(scriptsDir, 'generate-secrets.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      expect(content).toContain('env');
      expect(content).toContain('json');
      expect(content).toContain('yaml');
      expect(content).toContain('digitalocean');
    });
  });

  describe('Environment Validation Script Content', () => {
    test('validation script should check required variables', () => {
      const scriptPath = path.join(scriptsDir, 'validate-environment.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      expect(content).toContain('REQUIRED_VARS');
      expect(content).toContain('NODE_ENV');
      expect(content).toContain('DATABASE_URL');
      expect(content).toContain('JWT_SECRET');
    });

    test('validation script should include security checks', () => {
      const scriptPath = path.join(scriptsDir, 'validate-environment.js');
      const content = fs.readFileSync(scriptPath, 'utf8');

      expect(content).toContain('SECURITY_CHECKS');
      expect(content).toContain('length >= 64');
      expect(content).toContain('production');
    });
  });
});