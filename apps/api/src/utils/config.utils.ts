/**
 * Configuration utility functions.
 * Provides helper functions for configuration management, validation, and monitoring.
 */
import crypto from 'crypto';
import { tenantConfig, appConfig } from '../config';
import {
  validateCompleteConfig,
  ConfigValidationResult,
} from '../validators/config.validators';

/**
 * Runtime environment configuration interface.
 * Provides loose typing for environment variables with key access.
 */
export interface EnvConfig {
  [key: string]: string | number | boolean | undefined;
  NODE_ENV: string;
  PORT: number;
  FRONTEND_URL: string;
  RATE_LIMIT_WINDOW_MS: string;
  RATE_LIMIT_MAX_REQUESTS: string;
  CORS_ORIGINS: string;
  DATABASE_URL: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
}

/**
 * Runtime environment configuration map.
 * Falls back to sensible defaults when values are missing.
 */
export const config: EnvConfig = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:4200',
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS ?? '900000',
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS ?? '100',
  CORS_ORIGINS: process.env.CORS_ORIGINS ?? 'http://localhost:4200',
  DB_HOST: process.env.DB_HOST ?? 'localhost',
  DB_PORT: process.env.DB_PORT ?? '5432',
  DB_NAME: process.env.DB_NAME ?? 'nodeangularfullstack',
  DB_USER: process.env.DB_USER ?? 'dbuser',
  DB_PASSWORD: process.env.DB_PASSWORD ?? 'dbpassword',
  DATABASE_URL:
    process.env.DATABASE_URL ??
    `postgresql://${process.env.DB_USER ?? 'dbuser'}:${process.env.DB_PASSWORD ?? 'dbpassword'}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'nodeangularfullstack'}`,
  JWT_SECRET:
    process.env.JWT_SECRET ??
    'development-jwt-secret-key-at-least-32-characters-long',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ??
    'development-refresh-secret-key-at-least-32-characters-long',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '1h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
} as EnvConfig;

/**
 * Configuration change detection interface.
 */
export interface ConfigChangeResult {
  hasChanged: boolean;
  currentHash: string;
  previousHash?: string;
  changedKeys: string[];
  timestamp: Date;
}

/**
 * Configuration backup interface.
 */
export interface ConfigBackup {
  timestamp: Date;
  environment: string;
  hash: string;
  config: Record<string, string>;
}

/**
 * Configuration audit log entry interface.
 */
export interface ConfigAuditEntry {
  timestamp: Date;
  action:
    | 'startup'
    | 'validation'
    | 'change_detected'
    | 'backup_created'
    | 'restore_attempted'
    | 'hot_reload';
  environment: string;
  details: string;
  configHash: string;
  warnings?: string[];
  errors?: string[];
}

/**
 * Hot-reloadable configuration interface.
 */
export interface HotReloadableConfig {
  rateLimit?: {
    windowMs?: number;
    maxRequests?: number;
  };
  cors?: {
    origins?: string[];
  };
  monitoring?: {
    logLevel?: string;
    metricsEnabled?: boolean;
  };
  features?: {
    enableDebugMode?: boolean;
    enableMetrics?: boolean;
  };
}

/**
 * In-memory configuration audit log.
 * In production, this should be stored in a persistent storage.
 */
const configAuditLog: ConfigAuditEntry[] = [];

/**
 * In-memory hot-reloadable configuration cache.
 */
let hotReloadableConfigCache: HotReloadableConfig = {};

/**
 * Configuration change listeners for hot-reloading.
 */
const configChangeListeners: Array<(config: HotReloadableConfig) => void> = [];

/**
 * Generates a hash for the current configuration.
 * Uses critical configuration keys to detect meaningful changes.
 * @param customKeys - Optional array of specific keys to include in hash
 * @returns {string} SHA-256 hash of configuration
 */
export const generateConfigHash = (customKeys?: string[]): string => {
  const criticalKeys = customKeys || [
    'NODE_ENV',
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_SSL',
    'ENABLE_MULTI_TENANCY',
    'TENANT_ISOLATION_LEVEL',
    'TENANT_RLS_ENABLED',
    'TENANT_TOKEN_ISOLATION',
    'TENANT_CROSS_ACCESS_PREVENTION',
    'JWT_SECRET',
    'REDIS_HOST',
    'REDIS_PORT',
  ];

  const configString = criticalKeys
    .map((key) => `${key}=${process.env[key] || ''}`)
    .sort()
    .join('|');

  return crypto.createHash('sha256').update(configString).digest('hex');
};

/**
 * Validates configuration consistency on startup.
 * Performs comprehensive validation and logs results.
 * @throws {Error} When critical configuration errors are found
 */
export const validateConfigurationConsistency = (): void => {
  console.log('🔍 Validating application configuration...');

  const validationResult = validateCompleteConfig();

  // Log validation summary
  logConfigAudit('validation', 'Configuration validation completed', {
    warnings: validationResult.warnings,
    errors: validationResult.errors,
  });

  // Handle warnings
  if (validationResult.warnings.length > 0) {
    console.warn('⚠️  Configuration warnings detected:');
    validationResult.warnings.forEach((warning) => {
      console.warn(`   • ${warning}`);
    });
  }

  // Handle errors
  if (!validationResult.isValid) {
    console.error('❌ Critical configuration errors detected:');
    validationResult.errors.forEach((error) => {
      console.error(`   • ${error}`);
    });
    throw new Error(
      `Configuration validation failed: ${validationResult.errors.join(', ')}`
    );
  }

  console.log('✅ Configuration validation passed');
};

/**
 * Detects configuration changes since last startup.
 * Compares current config hash with stored hash from previous run.
 * @returns {ConfigChangeResult} Change detection result
 */
export const detectConfigurationChanges = (): ConfigChangeResult => {
  const currentHash = generateConfigHash();
  const previousHash = process.env.CONFIG_HASH;

  const result: ConfigChangeResult = {
    hasChanged: false,
    currentHash,
    previousHash,
    changedKeys: [],
    timestamp: new Date(),
  };

  if (previousHash && currentHash !== previousHash) {
    result.hasChanged = true;
    result.changedKeys = detectChangedKeys(previousHash, currentHash);

    logConfigAudit(
      'change_detected',
      `Configuration change detected. Hash changed from ${previousHash?.substring(0, 8)} to ${currentHash.substring(0, 8)}`,
      {
        changedKeys: result.changedKeys,
      }
    );

    console.warn('⚠️  Configuration change detected!');
    console.warn(`   Previous hash: ${previousHash?.substring(0, 16)}...`);
    console.warn(`   Current hash:  ${currentHash.substring(0, 16)}...`);
    console.warn(
      '   💡 Application restart required for changes to take effect.'
    );
  }

  return result;
};

/**
 * Creates a backup of the current configuration.
 * Stores configuration state for potential restoration.
 * @returns {ConfigBackup} Configuration backup
 */
export const createConfigurationBackup = (): ConfigBackup => {
  const backup: ConfigBackup = {
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'unknown',
    hash: generateConfigHash(),
    config: {
      NODE_ENV: process.env.NODE_ENV || '',
      PORT: process.env.PORT || '',
      DB_HOST: process.env.DB_HOST || '',
      DB_PORT: process.env.DB_PORT || '',
      DB_NAME: process.env.DB_NAME || '',
      ENABLE_MULTI_TENANCY: process.env.ENABLE_MULTI_TENANCY || '',
      TENANT_ISOLATION_LEVEL: process.env.TENANT_ISOLATION_LEVEL || '',
      TENANT_RLS_ENABLED: process.env.TENANT_RLS_ENABLED || '',
      // Add other critical config keys as needed
    },
  };

  logConfigAudit('backup_created', 'Configuration backup created', {
    environment: backup.environment,
    hash: backup.hash,
  });

  return backup;
};

/**
 * Logs configuration audit entry.
 * Maintains audit trail of configuration operations.
 * @param action - Type of configuration action
 * @param details - Details about the action
 * @param metadata - Additional metadata for the audit entry
 */
export const logConfigAudit = (
  action: ConfigAuditEntry['action'],
  details: string,
  metadata?: {
    warnings?: string[];
    errors?: string[];
    changedKeys?: string[];
    environment?: string;
    hash?: string;
  }
): void => {
  const entry: ConfigAuditEntry = {
    timestamp: new Date(),
    action,
    environment: process.env.NODE_ENV || 'unknown',
    details,
    configHash: generateConfigHash(),
    warnings: metadata?.warnings,
    errors: metadata?.errors,
  };

  configAuditLog.push(entry);

  // Limit audit log size in memory (keep last 100 entries)
  if (configAuditLog.length > 100) {
    configAuditLog.splice(0, configAuditLog.length - 100);
  }

  // In production, you would also log to external system
  if (process.env.NODE_ENV === 'production') {
    console.log(`[CONFIG AUDIT] ${action}: ${details}`);
  }
};

/**
 * Gets configuration audit log entries.
 * Returns recent configuration audit history.
 * @param limit - Maximum number of entries to return
 * @returns {ConfigAuditEntry[]} Array of audit entries
 */
export const getConfigAuditLog = (limit: number = 50): ConfigAuditEntry[] => {
  return configAuditLog.slice(-limit);
};

/**
 * Generates configuration summary for debugging.
 * Provides human-readable configuration overview.
 * @returns {object} Configuration summary
 */
export const getConfigurationSummary = () => {
  return {
    environment: appConfig.app.nodeEnv,
    timestamp: new Date().toISOString(),
    configHash: generateConfigHash(),
    multiTenancy: {
      enabled: tenantConfig.multiTenancyEnabled,
      isolationLevel: tenantConfig.isolationLevel,
      rlsEnabled: tenantConfig.rlsEnabled,
      tokenIsolation: tenantConfig.tokenIsolation,
      defaultPlan: tenantConfig.defaultPlan,
    },
    database: {
      host: appConfig.database.host,
      port: appConfig.database.port,
      ssl: appConfig.database.ssl,
    },
    security: {
      jwtConfigured: !!appConfig.jwt.secret,
      corsOrigins: appConfig.cors.origins.length,
    },
    audit: {
      totalEntries: configAuditLog.length,
      lastValidation: configAuditLog
        .filter((entry) => entry.action === 'validation')
        .pop()?.timestamp,
    },
  };
};

/**
 * Validates environment for deployment readiness.
 * Checks configuration for production deployment requirements.
 * @param targetEnv - Target environment ('production', 'staging', etc.)
 * @returns {ConfigValidationResult} Deployment readiness result
 */
export const validateDeploymentReadiness = (
  targetEnv: string = 'production'
): ConfigValidationResult => {
  const result = validateCompleteConfig();

  if (targetEnv === 'production') {
    // Additional production-specific checks
    if (process.env.JWT_SECRET?.includes('change-in-production')) {
      result.errors.push(
        'Default JWT secret detected in production configuration'
      );
      result.isValid = false;
    }

    if (process.env.PGWEB_AUTH_PASS?.includes('change-this-password')) {
      result.errors.push(
        'Default pgWeb password detected in production configuration'
      );
      result.isValid = false;
    }

    if (!process.env.SENTRY_DSN && !process.env.LOGTAIL_TOKEN) {
      result.warnings.push('No error monitoring configured for production');
    }
  }

  return result;
};

/**
 * Helper function to detect which configuration keys changed.
 * Compares two configuration hashes to identify changed keys.
 * @param previousHash - Previous configuration hash
 * @param currentHash - Current configuration hash
 * @returns {string[]} Array of changed configuration keys
 */
const detectChangedKeys = (
  previousHash: string,
  currentHash: string
): string[] => {
  // This is a simplified implementation
  // In practice, you'd need to store individual key hashes to detect specific changes
  const criticalKeys = [
    'ENABLE_MULTI_TENANCY',
    'TENANT_ISOLATION_LEVEL',
    'TENANT_RLS_ENABLED',
    'DB_HOST',
    'DB_PORT',
  ];

  // For now, return all critical keys as potentially changed
  // A more sophisticated implementation would compare individual key hashes
  // TODO: Implement actual comparison logic using previousHash and currentHash
  console.debug(
    `Configuration change detected: ${previousHash?.substring(0, 8)} -> ${currentHash.substring(0, 8)}`
  );
  return criticalKeys;
};

/**
 * Registers a listener for hot-reloadable configuration changes.
 * @param listener - Function to call when configuration changes
 */
export const addConfigChangeListener = (
  listener: (config: HotReloadableConfig) => void
): void => {
  configChangeListeners.push(listener);
};

/**
 * Removes a configuration change listener.
 * @param listener - Listener function to remove
 */
export const removeConfigChangeListener = (
  listener: (config: HotReloadableConfig) => void
): void => {
  const index = configChangeListeners.indexOf(listener);
  if (index > -1) {
    configChangeListeners.splice(index, 1);
  }
};

/**
 * Gets the current hot-reloadable configuration.
 * @returns {HotReloadableConfig} Current hot-reloadable configuration
 */
export const getHotReloadableConfig = (): HotReloadableConfig => {
  return { ...hotReloadableConfigCache };
};

/**
 * Updates hot-reloadable configuration settings.
 * Only allows updating non-critical settings that don't require restart.
 * @param newConfig - New configuration values to update
 * @returns {boolean} True if update was successful
 */
export const updateHotReloadableConfig = (
  newConfig: Partial<HotReloadableConfig>
): boolean => {
  try {
    // Validate the new configuration before applying
    const validatedConfig = validateHotReloadableConfig(newConfig);

    if (!validatedConfig.isValid) {
      console.warn(
        '⚠️  Hot-reload configuration validation failed:',
        validatedConfig.errors
      );
      return false;
    }

    // Merge new configuration with existing cache
    hotReloadableConfigCache = {
      ...hotReloadableConfigCache,
      ...newConfig,
    };

    // Log the hot-reload action
    logConfigAudit(
      'hot_reload',
      `Hot-reloaded configuration: ${JSON.stringify(newConfig)}`,
      {
        warnings: validatedConfig.warnings,
      }
    );

    // Notify all listeners of the configuration change
    configChangeListeners.forEach((listener) => {
      try {
        listener(hotReloadableConfigCache);
      } catch (error) {
        console.error('Error in configuration change listener:', error);
      }
    });

    console.log('✅ Configuration hot-reloaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to hot-reload configuration:', error);
    return false;
  }
};

/**
 * Validates hot-reloadable configuration values.
 * Ensures only safe, non-critical settings are being updated.
 * @param config - Configuration to validate
 * @returns {object} Validation result with errors and warnings
 */
export const validateHotReloadableConfig = (
  config: Partial<HotReloadableConfig>
) => {
  const result = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[],
  };

  // Validate rate limiting settings
  if (config.rateLimit) {
    if (
      config.rateLimit.windowMs &&
      (config.rateLimit.windowMs < 1000 || config.rateLimit.windowMs > 3600000)
    ) {
      result.errors.push(
        'Rate limit window must be between 1 second and 1 hour'
      );
      result.isValid = false;
    }
    if (
      config.rateLimit.maxRequests &&
      (config.rateLimit.maxRequests < 1 || config.rateLimit.maxRequests > 10000)
    ) {
      result.errors.push('Rate limit max requests must be between 1 and 10000');
      result.isValid = false;
    }
  }

  // Validate CORS origins
  if (config.cors?.origins) {
    for (const origin of config.cors.origins) {
      try {
        new URL(origin);
      } catch {
        if (origin !== '*') {
          result.warnings.push(`Invalid CORS origin: ${origin}`);
        }
      }
    }
  }

  // Validate monitoring settings
  if (config.monitoring?.logLevel) {
    const validLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLevels.includes(config.monitoring.logLevel)) {
      result.errors.push(
        `Invalid log level: ${config.monitoring.logLevel}. Must be one of: ${validLevels.join(', ')}`
      );
      result.isValid = false;
    }
  }

  return result;
};

/**
 * Resets hot-reloadable configuration to defaults.
 * Useful for testing or emergency reset scenarios.
 */
export const resetHotReloadableConfig = (): void => {
  hotReloadableConfigCache = {};

  logConfigAudit(
    'hot_reload',
    'Hot-reloadable configuration reset to defaults'
  );

  // Notify listeners of the reset
  configChangeListeners.forEach((listener) => {
    try {
      listener(hotReloadableConfigCache);
    } catch (error) {
      console.error(
        'Error in configuration change listener during reset:',
        error
      );
    }
  });

  console.log('🔄 Hot-reloadable configuration reset to defaults');
};

/**
 * Gets a summary of current hot-reloadable configuration status.
 * @returns {object} Configuration status summary
 */
export const getHotReloadableConfigStatus = () => {
  return {
    timestamp: new Date().toISOString(),
    activeConfig: hotReloadableConfigCache,
    listenerCount: configChangeListeners.length,
    lastHotReload: configAuditLog
      .filter((entry) => entry.action === 'hot_reload')
      .pop()?.timestamp,
  };
};
