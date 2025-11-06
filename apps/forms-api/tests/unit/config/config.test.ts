/**
 * Configuration validation tests.
 * Tests all configuration modules and validation logic.
 */
import { validateCompleteConfig, validateTenantConfigConsistency } from '../../../src/validators/config.validators';
import { validateTenantConfig } from '../../../src/config/tenant.config';

describe('Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env for each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Tenant Configuration', () => {
    it('should validate multi-tenancy configuration', () => {
      process.env.ENABLE_MULTI_TENANCY = 'true';
      process.env.TENANT_ISOLATION_LEVEL = 'row';
      process.env.TENANT_RLS_ENABLED = 'true';
      process.env.TENANT_CROSS_ACCESS_PREVENTION = 'true';
      process.env.TENANT_AUDIT_LOGGING = 'true';
      process.env.TENANT_TOKEN_ISOLATION = 'true';
      process.env.TENANT_DEFAULT_PLAN = 'free';
      process.env.TENANT_MAX_USERS_DEFAULT = '5';
      process.env.TENANT_FEATURES_DEFAULT = '{"api_access":true}';
      process.env.TENANT_DATA_ENCRYPTION = 'false';
      process.env.TENANT_REQUIRE_VERIFICATION = 'true';
      process.env.DEFAULT_TENANT_ID = 'test';

      const config = validateTenantConfig();

      expect(config.multiTenancyEnabled).toBe(true);
      expect(config.isolationLevel).toBe('row');
      expect(config.rlsEnabled).toBe(true);
      expect(config.crossAccessPrevention).toBe(true);
      expect(config.auditLogging).toBe(true);
      expect(config.tokenIsolation).toBe(true);
      expect(config.defaultPlan).toBe('free');
      expect(config.maxUsersDefault).toBe(5);
      expect(config.featuresDefault).toEqual({ api_access: true });
      expect(config.dataEncryption).toBe(false);
      expect(config.requireVerification).toBe(true);
    });

    it('should validate single-tenant configuration', () => {
      process.env.ENABLE_MULTI_TENANCY = 'false';
      process.env.DEFAULT_TENANT_ID = 'single';
      process.env.TENANT_ISOLATION_LEVEL = 'row';
      process.env.TENANT_RLS_ENABLED = 'false';
      process.env.TENANT_CROSS_ACCESS_PREVENTION = 'false';
      process.env.TENANT_AUDIT_LOGGING = 'false';
      process.env.TENANT_TOKEN_ISOLATION = 'false';
      process.env.TENANT_FEATURES_DEFAULT = '{}';

      const config = validateTenantConfig();

      expect(config.multiTenancyEnabled).toBe(false);
      expect(config.defaultTenantId).toBe('single');
      expect(config.rlsEnabled).toBe(false);
      expect(config.crossAccessPrevention).toBe(false);
      expect(config.auditLogging).toBe(false);
      expect(config.tokenIsolation).toBe(false);
    });

    it('should reject invalid isolation level', () => {
      process.env.ENABLE_MULTI_TENANCY = 'true';
      process.env.TENANT_ISOLATION_LEVEL = 'invalid';
      process.env.DEFAULT_TENANT_ID = 'test';
      process.env.TENANT_FEATURES_DEFAULT = '{}';

      expect(() => validateTenantConfig()).toThrow();
    });

    it('should reject invalid features JSON', () => {
      process.env.ENABLE_MULTI_TENANCY = 'true';
      process.env.DEFAULT_TENANT_ID = 'test';
      process.env.TENANT_FEATURES_DEFAULT = 'invalid-json';

      expect(() => validateTenantConfig()).toThrow(/Invalid TENANT_FEATURES_DEFAULT JSON/);
    });

    it('should reject non-object features JSON', () => {
      process.env.ENABLE_MULTI_TENANCY = 'true';
      process.env.DEFAULT_TENANT_ID = 'test';
      process.env.TENANT_FEATURES_DEFAULT = '"string"';

      expect(() => validateTenantConfig()).toThrow(/must be a valid JSON object/);
    });
  });

  describe('Configuration Consistency', () => {
    it('should detect token isolation without multi-tenancy', () => {
      const mockEnv = {
        ENABLE_MULTI_TENANCY: 'false',
        TENANT_TOKEN_ISOLATION: 'true',
      };

      const result = validateTenantConfigConsistency(mockEnv);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Token isolation requires multi-tenancy to be enabled');
    });

    it('should detect row-level isolation without RLS', () => {
      const mockEnv = {
        ENABLE_MULTI_TENANCY: 'true',
        TENANT_ISOLATION_LEVEL: 'row',
        TENANT_RLS_ENABLED: 'false',
      };

      const result = validateTenantConfigConsistency(mockEnv);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Row-level isolation requires RLS to be enabled for data security');
    });

    it('should warn about RLS without multi-tenancy', () => {
      const mockEnv = {
        ENABLE_MULTI_TENANCY: 'false',
        TENANT_RLS_ENABLED: 'true',
      };

      const result = validateTenantConfigConsistency(mockEnv);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('RLS enabled without multi-tenancy may cause unnecessary overhead');
    });

    it('should warn about cross-access prevention without multi-tenancy', () => {
      const mockEnv = {
        ENABLE_MULTI_TENANCY: 'false',
        TENANT_CROSS_ACCESS_PREVENTION: 'true',
      };

      const result = validateTenantConfigConsistency(mockEnv);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Cross-access prevention has no effect without multi-tenancy');
    });

    it('should warn about audit logging without multi-tenancy', () => {
      const mockEnv = {
        ENABLE_MULTI_TENANCY: 'false',
        TENANT_AUDIT_LOGGING: 'true',
      };

      const result = validateTenantConfigConsistency(mockEnv);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Tenant audit logging may not contain tenant context without multi-tenancy');
    });
  });

  describe('Complete Configuration Validation', () => {
    beforeEach(() => {
      // Set all required environment variables
      process.env.NODE_ENV = 'development';
      process.env.PORT = '3000';
      process.env.FRONTEND_URL = 'http://localhost:4200';
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'test';
      process.env.DB_USER = 'test';
      process.env.DB_PASSWORD = 'test';
      process.env.DB_SSL = 'false';
      process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long';
      process.env.JWT_EXPIRES_IN = '3600';
      process.env.JWT_REFRESH_EXPIRES_IN = '604800';
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      process.env.REDIS_PASSWORD = '';
      process.env.REDIS_DB = '0';
      process.env.DO_SPACES_ENDPOINT = 'https://nyc3.digitaloceanspaces.com';
      process.env.DO_SPACES_KEY = 'test-key';
      process.env.DO_SPACES_SECRET = 'test-secret';
      process.env.DO_SPACES_BUCKET = 'test-bucket';
      process.env.DO_SPACES_REGION = 'nyc3';
      process.env.SENDGRID_API_KEY = 'test-api-key';
      process.env.EMAIL_FROM = 'test@example.com';
      process.env.EMAIL_FROM_NAME = 'Test App';
      process.env.SENTRY_DSN = '';
      process.env.LOGTAIL_TOKEN = '';
      process.env.RATE_LIMIT_WINDOW_MS = '900000';
      process.env.RATE_LIMIT_MAX_REQUESTS = '100';
      process.env.CORS_ORIGINS = 'http://localhost:4200,http://localhost:3000';
      process.env.API_KEY = 'test-api-key';
      process.env.ENABLE_MULTI_TENANCY = 'false';
      process.env.DEFAULT_TENANT_ID = 'test';
      process.env.TENANT_ISOLATION_LEVEL = 'row';
      process.env.TENANT_RLS_ENABLED = 'false';
      process.env.TENANT_CROSS_ACCESS_PREVENTION = 'false';
      process.env.TENANT_AUDIT_LOGGING = 'false';
      process.env.TENANT_TOKEN_ISOLATION = 'false';
      process.env.TENANT_DEFAULT_PLAN = 'free';
      process.env.TENANT_MAX_USERS_DEFAULT = '5';
      process.env.TENANT_FEATURES_DEFAULT = '{}';
      process.env.TENANT_DATA_ENCRYPTION = 'false';
      process.env.TENANT_REQUIRE_VERIFICATION = 'true';
      process.env.PGWEB_AUTH_USER = 'admin';
      process.env.PGWEB_AUTH_PASS = 'test-password';
      process.env.PGWEB_READ_ONLY = 'false';
      process.env.PGWEB_SESSIONS = 'true';
      process.env.PGWEB_CORS_ORIGIN = 'http://localhost:4200';
      process.env.PGWEB_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    });

    it('should validate complete configuration successfully', () => {
      const result = validateCompleteConfig();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect multi-tenant configuration errors', () => {
      process.env.ENABLE_MULTI_TENANCY = 'true';
      process.env.TENANT_TOKEN_ISOLATION = 'true';
      process.env.TENANT_ISOLATION_LEVEL = 'row';
      process.env.TENANT_RLS_ENABLED = 'false';

      const result = validateCompleteConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('Row-level isolation requires RLS')
      )).toBe(true);
    });

    it('should generate appropriate warnings', () => {
      process.env.ENABLE_MULTI_TENANCY = 'false';
      process.env.TENANT_RLS_ENABLED = 'true';
      process.env.TENANT_CROSS_ACCESS_PREVENTION = 'true';

      const result = validateCompleteConfig();

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});