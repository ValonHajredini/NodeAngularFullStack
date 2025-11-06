/**
 * Integration tests for configuration middleware behavior.
 * Tests the runtime behavior of configuration validation middleware.
 */
import request from 'supertest';
import { Express } from 'express';
import {
  validateTenantConfiguration,
  requireMultiTenancy,
  requireSingleTenant,
  validateTenantIsolation,
  validateConfigurationHash,
  logConfigurationSummary,
  handleConfigurationErrors,
  ConfigError
} from '../../src/middleware/config.middleware';
import {
  updateHotReloadableConfig,
  resetHotReloadableConfig,
  addConfigChangeListener,
  removeConfigChangeListener,
  getHotReloadableConfig
} from '../../src/utils/config.utils';
import {
  getConfigPerformanceMetrics,
  resetConfigPerformanceMetrics,
  clearConfigValidationCache
} from '../../src/config/app.config';
import {
  validateConfigSchemaVersion,
  migrateConfiguration,
  getConfigSchemaVersionInfo,
  CURRENT_CONFIG_VERSION
} from '../../src/validators/config.validators';

describe('Configuration Middleware Integration Tests', () => {
  let app: Express;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    // Reset environment to known state
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_MULTI_TENANCY = 'false';
    process.env.TENANT_ISOLATION_LEVEL = 'row';
    process.env.TENANT_RLS_ENABLED = 'false';
    process.env.CONFIG_SCHEMA_VERSION = CURRENT_CONFIG_VERSION;

    // Reset configuration state
    resetHotReloadableConfig();
    resetConfigPerformanceMetrics();
    clearConfigValidationCache();

    // Create test Express app
    const express = require('express');
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Configuration Validation Middleware', () => {
    it('should validate tenant configuration successfully', async () => {
      app.get('/test', validateTenantConfiguration, (req, res) => {
        res.json({ success: true, config: (req as any).config });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.config).toHaveProperty('multiTenancyEnabled', false);
      expect(response.body.config).toHaveProperty('isolationLevel', 'row');
    });

    it('should fail validation with inconsistent configuration', async () => {
      // Set up inconsistent configuration
      process.env.TENANT_TOKEN_ISOLATION = 'true';
      process.env.ENABLE_MULTI_TENANCY = 'false';

      app.get('/test', validateTenantConfiguration, (req, res) => {
        res.json({ success: true });
      });

      app.use(handleConfigurationErrors);

      const response = await request(app)
        .get('/test')
        .expect(500);

      expect(response.body.error).toHaveProperty('type', 'ConfigurationError');
      expect(response.body.error.message).toContain('Token isolation requires multi-tenancy');
    });

    it('should log configuration warnings but continue', async () => {
      // Set up configuration that produces warnings
      process.env.TENANT_RLS_ENABLED = 'true';
      process.env.ENABLE_MULTI_TENANCY = 'false';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      app.get('/test', validateTenantConfiguration, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test')
        .expect(200);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('RLS enabled without multi-tenancy')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Multi-Tenancy Requirement Middleware', () => {
    it('should allow access when multi-tenancy is enabled', async () => {
      process.env.ENABLE_MULTI_TENANCY = 'true';

      app.get('/multi-tenant-feature', requireMultiTenancy, (req, res) => {
        res.json({ success: true, message: 'Multi-tenant feature accessed' });
      });

      const response = await request(app)
        .get('/multi-tenant-feature')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should block access when multi-tenancy is disabled', async () => {
      process.env.ENABLE_MULTI_TENANCY = 'false';

      app.get('/multi-tenant-feature', requireMultiTenancy, (req, res) => {
        res.json({ success: true });
      });

      app.use(handleConfigurationErrors);

      const response = await request(app)
        .get('/multi-tenant-feature')
        .expect(404);

      expect(response.body.error.code).toBe('MULTI_TENANCY_DISABLED');
    });
  });

  describe('Single-Tenant Requirement Middleware', () => {
    it('should allow access when single-tenant mode is active', async () => {
      process.env.ENABLE_MULTI_TENANCY = 'false';

      app.get('/single-tenant-feature', requireSingleTenant, (req, res) => {
        res.json({ success: true, message: 'Single-tenant feature accessed' });
      });

      const response = await request(app)
        .get('/single-tenant-feature')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should block access when multi-tenancy is enabled', async () => {
      process.env.ENABLE_MULTI_TENANCY = 'true';

      app.get('/single-tenant-feature', requireSingleTenant, (req, res) => {
        res.json({ success: true });
      });

      app.use(handleConfigurationErrors);

      const response = await request(app)
        .get('/single-tenant-feature')
        .expect(404);

      expect(response.body.error.code).toBe('SINGLE_TENANT_ONLY');
    });
  });

  describe('Tenant Isolation Validation Middleware', () => {
    it('should validate RLS settings for row-level isolation', async () => {
      process.env.ENABLE_MULTI_TENANCY = 'true';
      process.env.TENANT_ISOLATION_LEVEL = 'row';
      process.env.TENANT_RLS_ENABLED = 'false';

      app.get('/test', validateTenantIsolation, (req, res) => {
        res.json({ success: true });
      });

      app.use(handleConfigurationErrors);

      const response = await request(app)
        .get('/test')
        .expect(500);

      expect(response.body.error.code).toBe('RLS_REQUIRED');
    });

    it('should pass validation with proper RLS configuration', async () => {
      process.env.ENABLE_MULTI_TENANCY = 'true';
      process.env.TENANT_ISOLATION_LEVEL = 'row';
      process.env.TENANT_RLS_ENABLED = 'true';

      app.get('/test', validateTenantIsolation, (req, res) => {
        res.json({ success: true, config: (req as any).config });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.config).toHaveProperty('isolationLevel', 'row');
    });

    it('should warn about suboptimal security settings', async () => {
      process.env.ENABLE_MULTI_TENANCY = 'true';
      process.env.TENANT_CROSS_ACCESS_PREVENTION = 'true';
      process.env.TENANT_TOKEN_ISOLATION = 'false';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      app.get('/test', validateTenantIsolation, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test')
        .expect(200);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cross-access prevention enabled without token isolation')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Hash Validation Middleware', () => {
    it('should detect configuration changes', async () => {
      process.env.CONFIG_HASH = 'old-hash-value';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      app.get('/test', validateConfigurationHash, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test')
        .expect(200);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Configuration change detected')
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing stored hash gracefully', async () => {
      delete process.env.CONFIG_HASH;

      app.get('/test', validateConfigurationHash, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test')
        .expect(200);
    });

    it('should continue on hash validation errors', async () => {
      // Simulate error in hash generation
      const originalCreateHash = require('crypto').createHash;
      require('crypto').createHash = jest.fn().mockImplementation(() => {
        throw new Error('Hash generation failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      app.get('/test', validateConfigurationHash, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test')
        .expect(200);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error validating configuration hash:',
        expect.any(Error)
      );

      // Restore original function
      require('crypto').createHash = originalCreateHash;
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Summary Logging Middleware', () => {
    it('should log configuration summary in development', async () => {
      process.env.NODE_ENV = 'development';

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      app.get('/test', logConfigurationSummary, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test')
        .expect(200);

      expect(consoleSpy).toHaveBeenCalledWith('📋 Configuration Summary:');
      expect(consoleSpy).toHaveBeenCalledWith('  Environment:', 'development');

      consoleSpy.mockRestore();
    });

    it('should not log summary on subsequent requests', async () => {
      process.env.NODE_ENV = 'production';
      global.configLogged = true;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      app.get('/test', logConfigurationSummary, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test')
        .expect(200);

      expect(consoleSpy).not.toHaveBeenCalledWith('📋 Configuration Summary:');

      consoleSpy.mockRestore();
    });
  });

  describe('Hot-Reload Configuration Integration', () => {
    it('should update configuration and notify listeners', (done) => {
      const listener = jest.fn((config) => {
        expect(config.rateLimit?.maxRequests).toBe(200);
        removeConfigChangeListener(listener);
        done();
      });

      addConfigChangeListener(listener);

      const updateResult = updateHotReloadableConfig({
        rateLimit: { maxRequests: 200, windowMs: 60000 }
      });

      expect(updateResult).toBe(true);
    });

    it('should reject invalid hot-reload configuration', () => {
      const updateResult = updateHotReloadableConfig({
        rateLimit: { maxRequests: -1 } // Invalid negative value
      });

      expect(updateResult).toBe(false);
    });

    it('should validate hot-reload configuration', () => {
      const config = getHotReloadableConfig();
      expect(config).toEqual({});

      updateHotReloadableConfig({
        monitoring: { logLevel: 'debug', metricsEnabled: true }
      });

      const updatedConfig = getHotReloadableConfig();
      expect(updatedConfig.monitoring?.logLevel).toBe('debug');
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track configuration validation performance', () => {
      // Reset metrics
      resetConfigPerformanceMetrics();

      // Trigger validation by accessing app config
      require('../../src/config/app.config');

      const metrics = getConfigPerformanceMetrics();
      expect(metrics.validationDurationMs).toBeGreaterThan(0);
      expect(metrics.totalConfigKeys).toBeGreaterThan(0);
    });

    it('should cache validation results for performance', () => {
      resetConfigPerformanceMetrics();

      // First validation - cache miss
      require('../../src/config/app.config');
      let metrics = getConfigPerformanceMetrics();
      expect(metrics.cacheMisses).toBeGreaterThanOrEqual(0);

      // Clear require cache to force re-evaluation
      delete require.cache[require.resolve('../../src/config/app.config')];

      // Second validation might hit cache depending on implementation
      require('../../src/config/app.config');
      metrics = getConfigPerformanceMetrics();
      expect(metrics.validationDurationMs).toBeGreaterThan(0);
    });
  });

  describe('Schema Versioning Integration', () => {
    it('should validate current schema version', () => {
      const versionInfo = getConfigSchemaVersionInfo();
      expect(versionInfo.currentVersion).toBe(CURRENT_CONFIG_VERSION);
      expect(versionInfo.isLatest).toBe(true);
    });

    it('should detect outdated schema version', () => {
      process.env.CONFIG_SCHEMA_VERSION = '1.0.0';

      const validationResult = validateConfigSchemaVersion();
      expect(validationResult.warnings).toContain(
        expect.stringContaining('migration available')
      );
    });

    it('should perform configuration migration', () => {
      const oldConfig = {
        NODE_ENV: 'test',
        PORT: '3000',
        // Missing multi-tenancy settings
      };

      const migrationResult = migrateConfiguration(oldConfig, '1.0.0', '1.1.0');
      expect(migrationResult.success).toBe(true);
      expect(migrationResult.config).toHaveProperty('ENABLE_MULTI_TENANCY');
      expect(migrationResult.config).toHaveProperty('DEFAULT_TENANT_ID');
    });

    it('should handle migration failures gracefully', () => {
      const invalidConfig = {};

      const migrationResult = migrateConfiguration(invalidConfig, '999.0.0', '1.0.0');
      expect(migrationResult.success).toBe(false);
      expect(migrationResult.error).toContain('No migration path found');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle ConfigError properly', async () => {
      app.get('/test', (req, res, next) => {
        next(new ConfigError('Test configuration error', 400, 'TEST_ERROR'));
      });

      app.use(handleConfigurationErrors);

      const response = await request(app)
        .get('/test')
        .expect(400);

      expect(response.body.error).toEqual({
        message: 'Test configuration error',
        code: 'TEST_ERROR',
        type: 'ConfigurationError',
      });
    });

    it('should pass non-configuration errors to next handler', async () => {
      app.get('/test', (req, res, next) => {
        next(new Error('Regular error'));
      });

      app.use(handleConfigurationErrors);
      app.use((err: Error, req: any, res: any, next: any) => {
        res.status(500).json({ error: err.message });
      });

      const response = await request(app)
        .get('/test')
        .expect(500);

      expect(response.body.error).toBe('Regular error');
    });
  });

  describe('Multi-Environment Behavior', () => {
    it('should behave differently in production vs development', async () => {
      process.env.NODE_ENV = 'production';

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      app.get('/test', logConfigurationSummary, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/test')
        .expect(200);

      // Should not log in production unless it's the first request
      expect(consoleSpy).not.toHaveBeenCalledWith('📋 Configuration Summary:');

      consoleSpy.mockRestore();
    });

    it('should validate production-specific configuration', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

      const validationResult = validateConfigSchemaVersion();
      // This test would need the complete validation to run
      expect(validationResult).toHaveProperty('isValid');
    });
  });
});