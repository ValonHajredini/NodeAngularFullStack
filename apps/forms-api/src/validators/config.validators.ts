/**
 * Configuration validation schemas and utilities.
 * Provides comprehensive validation for all environment variables and configuration settings.
 */
import Joi from 'joi';
import { TenantIsolationLevel } from '../config/tenant.config';

/**
 * Configuration schema version interface.
 */
export interface ConfigSchemaVersion {
  version: string;
  schemaName: string;
  createdAt: Date;
  deprecatedAt?: Date;
  migrationPath?: string;
  description: string;
  breaking: boolean;
}

/**
 * Configuration migration function interface.
 */
export interface ConfigMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (config: any) => any;
  validate: (config: any) => boolean;
  description: string;
}

/**
 * Current configuration schema version.
 */
export const CURRENT_CONFIG_VERSION = '1.2.0';

/**
 * Configuration schema version registry.
 */
export const CONFIG_SCHEMA_VERSIONS: ConfigSchemaVersion[] = [
  {
    version: '1.0.0',
    schemaName: 'Initial Configuration Schema',
    createdAt: new Date('2025-09-15'),
    deprecatedAt: new Date('2025-09-21'),
    migrationPath: '1.0.0 -> 1.1.0 -> 1.2.0',
    description: 'Initial configuration schema with basic application settings',
    breaking: false,
  },
  {
    version: '1.1.0',
    schemaName: 'Multi-Tenancy Configuration Schema',
    createdAt: new Date('2025-09-18'),
    description: 'Added multi-tenancy configuration options and tenant isolation settings',
    breaking: true,
  },
  {
    version: '1.2.0',
    schemaName: 'Enhanced Security Configuration Schema',
    createdAt: new Date('2025-09-21'),
    description: 'Added enhanced security controls, performance monitoring, and hot-reload capabilities',
    breaking: false,
  },
];

/**
 * Configuration migration registry.
 */
export const CONFIG_MIGRATIONS: ConfigMigration[] = [
  {
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    description: 'Migrate from basic config to multi-tenancy support',
    migrate: (config: any) => {
      return {
        ...config,
        ENABLE_MULTI_TENANCY: config.ENABLE_MULTI_TENANCY || 'false',
        DEFAULT_TENANT_ID: config.DEFAULT_TENANT_ID || 'default',
        TENANT_ISOLATION_LEVEL: config.TENANT_ISOLATION_LEVEL || 'row',
        TENANT_RLS_ENABLED: config.TENANT_RLS_ENABLED || 'false',
        TENANT_CROSS_ACCESS_PREVENTION: config.TENANT_CROSS_ACCESS_PREVENTION || 'false',
        TENANT_AUDIT_LOGGING: config.TENANT_AUDIT_LOGGING || 'false',
        TENANT_TOKEN_ISOLATION: config.TENANT_TOKEN_ISOLATION || 'false',
        TENANT_DEFAULT_PLAN: config.TENANT_DEFAULT_PLAN || 'free',
        TENANT_MAX_USERS_DEFAULT: config.TENANT_MAX_USERS_DEFAULT || '5',
        TENANT_FEATURES_DEFAULT: config.TENANT_FEATURES_DEFAULT || '{}',
        TENANT_DATA_ENCRYPTION: config.TENANT_DATA_ENCRYPTION || 'false',
        TENANT_REQUIRE_VERIFICATION: config.TENANT_REQUIRE_VERIFICATION || 'true',
      };
    },
    validate: (config: any) => {
      const requiredKeys = [
        'ENABLE_MULTI_TENANCY', 'DEFAULT_TENANT_ID', 'TENANT_ISOLATION_LEVEL',
        'TENANT_RLS_ENABLED', 'TENANT_DEFAULT_PLAN'
      ];
      return requiredKeys.every(key => key in config);
    },
  },
  {
    fromVersion: '1.1.0',
    toVersion: '1.2.0',
    description: 'Add enhanced security and performance monitoring',
    migrate: (config: any) => {
      return {
        ...config,
        CONFIG_PERFORMANCE_LOGGING: config.CONFIG_PERFORMANCE_LOGGING || 'false',
        CONFIG_HOT_RELOAD_ENABLED: config.CONFIG_HOT_RELOAD_ENABLED || 'true',
        CONFIG_SCHEMA_VERSION: CURRENT_CONFIG_VERSION,
      };
    },
    validate: (config: any) => {
      return 'CONFIG_SCHEMA_VERSION' in config;
    },
  },
];

/**
 * Environment validation schema for all application settings.
 * Ensures all required environment variables are present and valid.
 */
export const environmentSchema = Joi.object({
  // Application Core
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  PORT: Joi.number().port().required(),
  FRONTEND_URL: Joi.string().uri().required(),

  // Database Configuration
  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().port().required(),
  DB_NAME: Joi.string().min(1).required(),
  DB_USER: Joi.string().min(1).required(),
  DB_PASSWORD: Joi.string().min(1).required(),
  DB_SSL: Joi.boolean().required(),

  // JWT Authentication
  JWT_SECRET: Joi.string().min(32).required()
    .messages({
      'string.min': 'JWT_SECRET must be at least 32 characters long for security',
    }),
  JWT_REFRESH_SECRET: Joi.string().min(32).required()
    .messages({
      'string.min': 'JWT_REFRESH_SECRET must be at least 32 characters long for security',
    }),
  JWT_EXPIRES_IN: Joi.number().positive().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.number().positive().required(),

  // Redis Cache
  REDIS_HOST: Joi.string().hostname().required(),
  REDIS_PORT: Joi.number().port().required(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().integer().min(0).max(15).required(),

  // File Storage
  DO_SPACES_ENDPOINT: Joi.string().uri().required(),
  DO_SPACES_KEY: Joi.string().min(1).required(),
  DO_SPACES_SECRET: Joi.string().min(1).required(),
  DO_SPACES_BUCKET: Joi.string().min(1).required(),
  DO_SPACES_REGION: Joi.string().min(1).required(),

  // Email Service
  SENDGRID_API_KEY: Joi.string().min(1).required(),
  EMAIL_FROM: Joi.string().email().required(),
  EMAIL_FROM_NAME: Joi.string().min(1).required(),

  // Monitoring (Optional)
  SENTRY_DSN: Joi.string().uri().allow('').optional(),
  LOGTAIL_TOKEN: Joi.string().allow('').optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().positive().required(),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().positive().required(),

  // CORS
  CORS_ORIGINS: Joi.string().required(),

  // API Keys
  API_KEY: Joi.string().min(1).required(),

  // Multi-Tenancy Configuration
  ENABLE_MULTI_TENANCY: Joi.boolean().required(),
  DEFAULT_TENANT_ID: Joi.string().min(1).required(),
  TENANT_ISOLATION_LEVEL: Joi.string().valid('row', 'schema', 'database').required(),
  TENANT_RLS_ENABLED: Joi.boolean().required(),
  TENANT_CROSS_ACCESS_PREVENTION: Joi.boolean().required(),
  TENANT_AUDIT_LOGGING: Joi.boolean().required(),
  TENANT_TOKEN_ISOLATION: Joi.boolean().required(),
  TENANT_DEFAULT_PLAN: Joi.string().valid('free', 'starter', 'professional', 'enterprise').required(),
  TENANT_MAX_USERS_DEFAULT: Joi.number().integer().min(1).required(),
  TENANT_FEATURES_DEFAULT: Joi.string().required(),
  TENANT_DATA_ENCRYPTION: Joi.boolean().required(),
  TENANT_REQUIRE_VERIFICATION: Joi.boolean().required(),

  // pgWeb Database Management
  PGWEB_AUTH_USER: Joi.string().min(1).required(),
  PGWEB_AUTH_PASS: Joi.string().min(8).required()
    .messages({
      'string.min': 'PGWEB_AUTH_PASS must be at least 8 characters long for security',
    }),
  PGWEB_READ_ONLY: Joi.boolean().required(),
  PGWEB_SESSIONS: Joi.boolean().required(),
  PGWEB_CORS_ORIGIN: Joi.string().uri().required(),
  PGWEB_DATABASE_URL: Joi.string().uri().required(),
});

/**
 * Multi-tenancy specific validation schema.
 * Focused validation for tenant-related configuration.
 */
export const tenantConfigSchema = Joi.object({
  ENABLE_MULTI_TENANCY: Joi.boolean().required(),
  DEFAULT_TENANT_ID: Joi.string().min(1).required(),
  TENANT_ISOLATION_LEVEL: Joi.string().valid('row', 'schema', 'database').required(),
  TENANT_RLS_ENABLED: Joi.boolean().required(),
  TENANT_CROSS_ACCESS_PREVENTION: Joi.boolean().required(),
  TENANT_AUDIT_LOGGING: Joi.boolean().required(),
  TENANT_TOKEN_ISOLATION: Joi.boolean().required(),
  TENANT_DEFAULT_PLAN: Joi.string().valid('free', 'starter', 'professional', 'enterprise').required(),
  TENANT_MAX_USERS_DEFAULT: Joi.number().integer().min(1).max(10000).required(),
  TENANT_FEATURES_DEFAULT: Joi.string().custom((value, helpers) => {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return helpers.error('any.invalid');
      }
      return value;
    } catch {
      return helpers.error('any.invalid');
    }
  }).required().messages({
    'any.invalid': 'TENANT_FEATURES_DEFAULT must be a valid JSON object',
  }),
  TENANT_DATA_ENCRYPTION: Joi.boolean().required(),
  TENANT_REQUIRE_VERIFICATION: Joi.boolean().required(),
});

/**
 * Database configuration validation schema.
 * Validates database connection parameters.
 */
export const databaseConfigSchema = Joi.object({
  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().port().required(),
  DB_NAME: Joi.string().alphanum().min(1).max(63).required(),
  DB_USER: Joi.string().min(1).max(63).required(),
  DB_PASSWORD: Joi.string().min(1).required(),
  DB_SSL: Joi.boolean().required(),
});

/**
 * Security configuration validation schema.
 * Validates security-related settings.
 */
export const securityConfigSchema = Joi.object({
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.number().positive().max(86400).required(), // Max 24 hours
  JWT_REFRESH_EXPIRES_IN: Joi.number().positive().max(2592000).required(), // Max 30 days
  API_KEY: Joi.string().min(16).required(),
  PGWEB_AUTH_PASS: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .message('PGWEB_AUTH_PASS must contain at least one lowercase, uppercase, and numeric character'),
});

/**
 * Configuration validation result interface.
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config?: any;
}

/**
 * Validates the complete environment configuration.
 * @param env - Environment variables object (defaults to process.env)
 * @returns {ConfigValidationResult} Validation result with errors and warnings
 */
export const validateEnvironmentConfig = (env: NodeJS.ProcessEnv = process.env): ConfigValidationResult => {
  const { error, value, warning } = environmentSchema.validate(env, {
    allowUnknown: true,
    stripUnknown: false,
    abortEarly: false,
  });

  const result: ConfigValidationResult = {
    isValid: !error,
    errors: [],
    warnings: [],
    config: value,
  };

  if (error) {
    result.errors = error.details.map(detail => detail.message);
  }

  if (warning) {
    result.warnings = warning.details.map(detail => detail.message);
  }

  return result;
};

/**
 * Validates tenant configuration consistency.
 * Checks for logical conflicts in multi-tenancy settings.
 * @param env - Environment variables object (defaults to process.env)
 * @returns {ConfigValidationResult} Validation result with consistency checks
 */
export const validateTenantConfigConsistency = (env: NodeJS.ProcessEnv = process.env): ConfigValidationResult => {
  const result: ConfigValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const multiTenancyEnabled = env.ENABLE_MULTI_TENANCY === 'true';
  const rlsEnabled = env.TENANT_RLS_ENABLED === 'true';
  const tokenIsolation = env.TENANT_TOKEN_ISOLATION === 'true';
  const crossAccessPrevention = env.TENANT_CROSS_ACCESS_PREVENTION === 'true';
  const auditLogging = env.TENANT_AUDIT_LOGGING === 'true';
  const isolationLevel = env.TENANT_ISOLATION_LEVEL as TenantIsolationLevel;

  // Critical configuration conflicts (errors)
  if (tokenIsolation && !multiTenancyEnabled) {
    result.errors.push('Token isolation requires multi-tenancy to be enabled');
    result.isValid = false;
  }

  if (multiTenancyEnabled && isolationLevel === 'row' && !rlsEnabled) {
    result.errors.push('Row-level isolation requires RLS to be enabled for data security');
    result.isValid = false;
  }

  // Warning-level inconsistencies
  if (rlsEnabled && !multiTenancyEnabled) {
    result.warnings.push('RLS enabled without multi-tenancy may cause unnecessary overhead');
  }

  if (crossAccessPrevention && !multiTenancyEnabled) {
    result.warnings.push('Cross-access prevention has no effect without multi-tenancy');
  }

  if (auditLogging && !multiTenancyEnabled) {
    result.warnings.push('Tenant audit logging may not contain tenant context without multi-tenancy');
  }

  return result;
};

/**
 * Validates production readiness of configuration.
 * Checks for production-specific requirements and security settings.
 * @param env - Environment variables object (defaults to process.env)
 * @returns {ConfigValidationResult} Production readiness validation result
 */
export const validateProductionConfig = (env: NodeJS.ProcessEnv = process.env): ConfigValidationResult => {
  const result: ConfigValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const nodeEnv = env.NODE_ENV;

  if (nodeEnv === 'production') {
    // Critical production requirements
    if (env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      result.errors.push('Default JWT_SECRET detected in production - must be changed');
      result.isValid = false;
    }

    if (env.PGWEB_AUTH_PASS === 'change-this-password-in-production') {
      result.errors.push('Default PGWEB_AUTH_PASS detected in production - must be changed');
      result.isValid = false;
    }

    if (env.DB_SSL !== 'true') {
      result.warnings.push('Database SSL is disabled in production - consider enabling for security');
    }

    if (!env.SENTRY_DSN) {
      result.warnings.push('No error monitoring configured - consider setting up Sentry');
    }

    if (env.TENANT_DATA_ENCRYPTION !== 'true' && env.ENABLE_MULTI_TENANCY === 'true') {
      result.warnings.push('Tenant data encryption is disabled in multi-tenant production environment');
    }
  }

  return result;
};

/**
 * Comprehensive configuration validation function.
 * Runs all validation checks and returns combined results.
 * @param env - Environment variables object (defaults to process.env)
 * @returns {ConfigValidationResult} Complete validation result
 */
export const validateCompleteConfig = (env: NodeJS.ProcessEnv = process.env): ConfigValidationResult => {
  const envValidation = validateEnvironmentConfig(env);
  const tenantValidation = validateTenantConfigConsistency(env);
  const productionValidation = validateProductionConfig(env);
  const versionValidation = validateConfigSchemaVersion(env);

  const result: ConfigValidationResult = {
    isValid: envValidation.isValid && tenantValidation.isValid && productionValidation.isValid && versionValidation.isValid,
    errors: [
      ...envValidation.errors,
      ...tenantValidation.errors,
      ...productionValidation.errors,
      ...versionValidation.errors,
    ],
    warnings: [
      ...envValidation.warnings,
      ...tenantValidation.warnings,
      ...productionValidation.warnings,
      ...versionValidation.warnings,
    ],
    config: envValidation.config,
  };

  return result;
};

/**
 * Validates configuration schema version and suggests migrations if needed.
 * @param env - Environment variables object (defaults to process.env)
 * @returns {ConfigValidationResult} Version validation result
 */
export const validateConfigSchemaVersion = (env: NodeJS.ProcessEnv = process.env): ConfigValidationResult => {
  const result: ConfigValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const currentVersion = env.CONFIG_SCHEMA_VERSION;

  if (!currentVersion) {
    result.warnings.push('No configuration schema version specified. Consider adding CONFIG_SCHEMA_VERSION environment variable');
    return result;
  }

  // Check if current version is supported
  const supportedVersion = CONFIG_SCHEMA_VERSIONS.find(v => v.version === currentVersion);

  if (!supportedVersion) {
    result.errors.push(`Unknown configuration schema version: ${currentVersion}. Supported versions: ${CONFIG_SCHEMA_VERSIONS.map(v => v.version).join(', ')}`);
    result.isValid = false;
    return result;
  }

  // Check if version is deprecated
  if (supportedVersion.deprecatedAt && supportedVersion.deprecatedAt < new Date()) {
    result.warnings.push(`Configuration schema version ${currentVersion} is deprecated. Consider migrating to version ${CURRENT_CONFIG_VERSION}`);
  }

  // Check if migration is needed
  if (currentVersion !== CURRENT_CONFIG_VERSION) {
    const migrationPath = findMigrationPath(currentVersion, CURRENT_CONFIG_VERSION);
    if (migrationPath.length > 0) {
      result.warnings.push(`Configuration schema migration available: ${currentVersion} -> ${CURRENT_CONFIG_VERSION}`);
    } else {
      result.warnings.push(`No direct migration path found from ${currentVersion} to ${CURRENT_CONFIG_VERSION}`);
    }
  }

  return result;
};

/**
 * Finds migration path between two configuration schema versions.
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @returns {ConfigMigration[]} Array of migrations to apply in sequence
 */
export const findMigrationPath = (fromVersion: string, toVersion: string): ConfigMigration[] => {
  if (fromVersion === toVersion) {
    return [];
  }

  const path: ConfigMigration[] = [];
  let currentVersion = fromVersion;

  // Simple linear migration path (can be enhanced for complex dependency graphs)
  while (currentVersion !== toVersion) {
    const migration = CONFIG_MIGRATIONS.find(m => m.fromVersion === currentVersion);

    if (!migration) {
      // No migration path found
      return [];
    }

    path.push(migration);
    currentVersion = migration.toVersion;

    // Prevent infinite loops
    if (path.length > 10) {
      return [];
    }
  }

  return path;
};

/**
 * Applies configuration migration from one version to another.
 * @param config - Configuration object to migrate
 * @param fromVersion - Source version
 * @param toVersion - Target version
 * @returns {object} Migration result with migrated config and validation status
 */
export const migrateConfiguration = (config: any, fromVersion: string, toVersion: string) => {
  const migrationPath = findMigrationPath(fromVersion, toVersion);

  if (migrationPath.length === 0) {
    return {
      success: false,
      error: `No migration path found from ${fromVersion} to ${toVersion}`,
      config: null,
    };
  }

  let migratedConfig = { ...config };
  const appliedMigrations: string[] = [];

  try {
    for (const migration of migrationPath) {
      // Apply migration
      migratedConfig = migration.migrate(migratedConfig);

      // Validate migration result
      if (!migration.validate(migratedConfig)) {
        return {
          success: false,
          error: `Migration validation failed for ${migration.fromVersion} -> ${migration.toVersion}`,
          config: null,
          appliedMigrations,
        };
      }

      appliedMigrations.push(`${migration.fromVersion} -> ${migration.toVersion}`);
    }

    return {
      success: true,
      config: migratedConfig,
      appliedMigrations,
      description: `Successfully migrated configuration from ${fromVersion} to ${toVersion}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      config: null,
      appliedMigrations,
    };
  }
};

/**
 * Gets information about current configuration schema version.
 * @returns {object} Version information
 */
export const getConfigSchemaVersionInfo = () => {
  const currentVersionInfo = CONFIG_SCHEMA_VERSIONS.find(v => v.version === CURRENT_CONFIG_VERSION);
  const userVersion = process.env.CONFIG_SCHEMA_VERSION;

  return {
    currentVersion: CURRENT_CONFIG_VERSION,
    userVersion,
    versionInfo: currentVersionInfo,
    isLatest: userVersion === CURRENT_CONFIG_VERSION,
    availableVersions: CONFIG_SCHEMA_VERSIONS.map(v => v.version),
    migrationPath: userVersion && userVersion !== CURRENT_CONFIG_VERSION
      ? findMigrationPath(userVersion, CURRENT_CONFIG_VERSION)
      : [],
  };
};

/**
 * Validates that a specific configuration schema version is supported.
 * @param version - Version to validate
 * @returns {boolean} True if version is supported
 */
export const isConfigSchemaVersionSupported = (version: string): boolean => {
  return CONFIG_SCHEMA_VERSIONS.some(v => v.version === version);
};

/**
 * Gets deprecated configuration schema versions.
 * @returns {ConfigSchemaVersion[]} Array of deprecated versions
 */
export const getDeprecatedConfigSchemaVersions = (): ConfigSchemaVersion[] => {
  return CONFIG_SCHEMA_VERSIONS.filter(v => v.deprecatedAt && v.deprecatedAt < new Date());
};