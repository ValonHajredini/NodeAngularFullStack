import {
  generateConfigHash,
  validateConfigurationConsistency,
  detectConfigurationChanges,
  createConfigurationBackup,
  getConfigurationSummary,
  validateDeploymentReadiness
} from '../../src/utils/config.utils';

describe('Config Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Set up minimal required environment variables
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.FRONTEND_URL = 'http://localhost:4200';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'test';
    process.env.DB_USER = 'test';
    process.env.DB_PASSWORD = 'test';
    process.env.DB_SSL = 'false';
    process.env.JWT_SECRET = 'test-secret-key-at-least-32-chars-long';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long';
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
    process.env.RATE_LIMIT_WINDOW_MS = '900000';
    process.env.RATE_LIMIT_MAX_REQUESTS = '100';
    process.env.CORS_ORIGINS = 'http://localhost:4200';
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

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('generateConfigHash', () => {
    it('should generate consistent hash for same configuration', () => {
      const hash1 = generateConfigHash();
      const hash2 = generateConfigHash();

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hash length
    });

    it('should generate different hash when configuration changes', () => {
      const hash1 = generateConfigHash();

      process.env.ENABLE_MULTI_TENANCY = 'true';
      const hash2 = generateConfigHash();

      expect(hash1).not.toBe(hash2);
    });

    it('should accept custom keys for hashing', () => {
      const customHash = generateConfigHash(['NODE_ENV', 'PORT']);
      const fullHash = generateConfigHash();

      expect(customHash).not.toBe(fullHash);
    });
  });

  describe('validateConfigurationConsistency', () => {
    it('should pass validation with valid configuration', () => {
      expect(() => validateConfigurationConsistency()).not.toThrow();
    });

    it('should throw error for invalid multi-tenancy configuration', () => {
      process.env.ENABLE_MULTI_TENANCY = 'true';
      process.env.TENANT_TOKEN_ISOLATION = 'true';
      process.env.TENANT_ISOLATION_LEVEL = 'row';
      process.env.TENANT_RLS_ENABLED = 'false';

      expect(() => validateConfigurationConsistency()).toThrow();
    });
  });

  describe('detectConfigurationChanges', () => {
    it('should detect no changes when hash is same', () => {
      const currentHash = generateConfigHash();
      process.env.CONFIG_HASH = currentHash;

      const result = detectConfigurationChanges();

      expect(result.hasChanged).toBe(false);
      expect(result.currentHash).toBe(currentHash);
    });

    it('should detect changes when hash differs', () => {
      process.env.CONFIG_HASH = 'previous-hash';

      const result = detectConfigurationChanges();

      expect(result.hasChanged).toBe(true);
      expect(result.previousHash).toBe('previous-hash');
    });
  });

  describe('createConfigurationBackup', () => {
    it('should create configuration backup', () => {
      const backup = createConfigurationBackup();

      expect(backup.timestamp).toBeInstanceOf(Date);
      expect(backup.environment).toBe('test');
      expect(backup.hash).toBeDefined();
      expect(backup.config).toBeDefined();
      expect(backup.config.NODE_ENV).toBe('test');
    });
  });

  describe('getConfigurationSummary', () => {
    it('should return configuration summary', () => {
      const summary = getConfigurationSummary();

      expect(summary.environment).toBe('test');
      expect(summary.multiTenancy.enabled).toBe(false);
      expect(summary.database.host).toBe('localhost');
      expect(summary.configHash).toBeDefined();
    });
  });

  describe('validateDeploymentReadiness', () => {
    it('should validate development deployment', () => {
      process.env.NODE_ENV = 'development';

      const result = validateDeploymentReadiness('development');

      expect(result.isValid).toBe(true);
    });

    it('should detect production security issues', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

      const result = validateDeploymentReadiness('production');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Default JWT secret detected in production configuration');
    });
  });
});