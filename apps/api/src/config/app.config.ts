/**
 * Main application configuration module.
 * Centralizes all environment variable validation and configuration management.
 * NOTE: For tests, dotenv is pre-loaded in test-setup.ts
 */
import Joi from 'joi';
import { tenantConfig, TenantConfig } from './tenant.config';

/**
 * Performance monitoring metrics for configuration validation.
 */
export interface ConfigPerformanceMetrics {
  validationStartTime: number;
  validationEndTime: number;
  validationDurationMs: number;
  schemaValidationMs: number;
  consistencyCheckMs: number;
  totalConfigKeys: number;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * Performance monitoring state.
 */
let performanceMetrics: ConfigPerformanceMetrics = {
  validationStartTime: 0,
  validationEndTime: 0,
  validationDurationMs: 0,
  schemaValidationMs: 0,
  consistencyCheckMs: 0,
  totalConfigKeys: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

/**
 * Configuration validation cache for performance optimization.
 */
const validationCache = new Map<
  string,
  { result: AppConfig; timestamp: number }
>();
const CACHE_TTL_MS = 5000; // 5 second cache TTL for validation results

/**
 * Complete application configuration interface.
 * Combines all configuration modules for type-safe access.
 */
export interface AppConfig {
  /** Application environment and basic settings */
  app: {
    nodeEnv: string;
    port: number;
    frontendUrl: string;
  };
  /** Database connection configuration */
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  /** JWT authentication configuration */
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: number;
    refreshExpiresIn: number;
  };
  /** Redis cache configuration */
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  /** File storage configuration */
  storage: {
    endpoint: string;
    key: string;
    secret: string;
    bucket: string;
    region: string;
  };
  /** Email service configuration */
  email: {
    apiKey: string;
    from: string;
    fromName: string;
  };
  /** Monitoring and logging configuration */
  monitoring: {
    sentryDsn?: string;
    logtailToken?: string;
  };
  /** Rate limiting configuration */
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  /** CORS configuration */
  cors: {
    origins: string[];
  };
  /** External API configuration */
  api: {
    key: string;
  };
  /** Multi-tenancy configuration */
  tenant: TenantConfig;
  /** pgWeb database management configuration */
  pgweb: {
    authUser: string;
    authPass: string;
    readOnly: boolean;
    sessions: boolean;
    corsOrigin: string;
    databaseUrl: string;
  };
}

/**
 * Application configuration validation schema.
 * Validates all environment variables and provides defaults.
 */
const appConfigSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:4200'),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.alternatives()
    .try(Joi.string().pattern(/^\d+[smhdw]$/), Joi.number().positive())
    .default('1h'),
  JWT_REFRESH_EXPIRES_IN: Joi.alternatives()
    .try(Joi.string().pattern(/^\d+[smhdw]$/), Joi.number().positive())
    .default('7d'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow(''),
  REDIS_DB: Joi.number().integer().min(0).default(0),

  // File Storage
  DO_SPACES_ENDPOINT: Joi.string().uri().required(),
  DO_SPACES_KEY: Joi.string().required(),
  DO_SPACES_SECRET: Joi.string().required(),
  DO_SPACES_BUCKET: Joi.string().required(),
  DO_SPACES_REGION: Joi.string().required(),

  // Email
  SENDGRID_API_KEY: Joi.string().required(),
  EMAIL_FROM: Joi.string().email().required(),
  EMAIL_FROM_NAME: Joi.string().default('NodeAngularFullStack'),

  // Monitoring
  SENTRY_DSN: Joi.string().uri().allow(''),
  LOGTAIL_TOKEN: Joi.string().allow(''),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().positive().default(100),

  // CORS
  CORS_ORIGINS: Joi.string().default(
    'http://localhost:4200,http://localhost:3000'
  ),

  // API Keys
  API_KEY: Joi.string().required(),

  // pgWeb
  PGWEB_AUTH_USER: Joi.string().default('admin'),
  PGWEB_AUTH_PASS: Joi.string().min(8).required(),
  PGWEB_READ_ONLY: Joi.boolean().default(false),
  PGWEB_SESSIONS: Joi.boolean().default(true),
  PGWEB_CORS_ORIGIN: Joi.string().uri().default('http://localhost:4200'),
  PGWEB_DATABASE_URL: Joi.string().required(),
});

/**
 * Validates and returns the complete application configuration.
 * @throws {Error} When configuration validation fails
 * @returns {AppConfig} Validated configuration object
 */
export const validateAppConfig = (): AppConfig => {
  const startTime = performance.now();
  performanceMetrics.validationStartTime = startTime;
  performanceMetrics.totalConfigKeys = Object.keys(process.env).length;

  // Check cache first for performance optimization
  const cacheKey = generateConfigCacheKey(process.env);
  const cachedResult = getCachedValidationResult(cacheKey);

  if (cachedResult) {
    performanceMetrics.cacheHits++;
    performanceMetrics.validationEndTime = performance.now();
    performanceMetrics.validationDurationMs =
      performanceMetrics.validationEndTime - startTime;
    return cachedResult;
  }

  performanceMetrics.cacheMisses++;
  const schemaValidationStart = performance.now();

  const { error, value } = appConfigSchema.validate(process.env, {
    allowUnknown: true, // Allow tenant-specific environment variables
    stripUnknown: false,
  });

  performanceMetrics.schemaValidationMs =
    performance.now() - schemaValidationStart;

  if (error) {
    throw new Error(
      `Application configuration validation failed: ${error.message}`
    );
  }

  const consistencyCheckStart = performance.now();

  const config: AppConfig = {
    app: {
      nodeEnv: value.NODE_ENV,
      port: value.PORT,
      frontendUrl: value.FRONTEND_URL,
    },
    database: {
      host: value.DB_HOST,
      port: value.DB_PORT,
      name: value.DB_NAME,
      user: value.DB_USER,
      password: value.DB_PASSWORD,
      ssl: value.DB_SSL,
    },
    jwt: {
      secret: value.JWT_SECRET,
      refreshSecret: value.JWT_REFRESH_SECRET,
      expiresIn: value.JWT_EXPIRES_IN,
      refreshExpiresIn: value.JWT_REFRESH_EXPIRES_IN,
    },
    redis: {
      host: value.REDIS_HOST,
      port: value.REDIS_PORT,
      password: value.REDIS_PASSWORD ?? undefined,
      db: value.REDIS_DB,
    },
    storage: {
      endpoint: value.DO_SPACES_ENDPOINT,
      key: value.DO_SPACES_KEY,
      secret: value.DO_SPACES_SECRET,
      bucket: value.DO_SPACES_BUCKET,
      region: value.DO_SPACES_REGION,
    },
    email: {
      apiKey: value.SENDGRID_API_KEY,
      from: value.EMAIL_FROM,
      fromName: value.EMAIL_FROM_NAME,
    },
    monitoring: {
      sentryDsn: value.SENTRY_DSN ?? undefined,
      logtailToken: value.LOGTAIL_TOKEN ?? undefined,
    },
    rateLimit: {
      windowMs: value.RATE_LIMIT_WINDOW_MS,
      maxRequests: value.RATE_LIMIT_MAX_REQUESTS,
    },
    cors: {
      origins: value.CORS_ORIGINS.split(',').map((origin: string) =>
        origin.trim()
      ),
    },
    api: {
      key: value.API_KEY,
    },
    tenant: tenantConfig,
    pgweb: {
      authUser: value.PGWEB_AUTH_USER,
      authPass: value.PGWEB_AUTH_PASS,
      readOnly: value.PGWEB_READ_ONLY,
      sessions: value.PGWEB_SESSIONS,
      corsOrigin: value.PGWEB_CORS_ORIGIN,
      databaseUrl: value.PGWEB_DATABASE_URL,
    },
  };

  performanceMetrics.consistencyCheckMs =
    performance.now() - consistencyCheckStart;
  performanceMetrics.validationEndTime = performance.now();
  performanceMetrics.validationDurationMs =
    performanceMetrics.validationEndTime - startTime;

  // Cache the result for performance optimization
  setCachedValidationResult(cacheKey, config);

  // Log performance metrics if enabled
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.CONFIG_PERFORMANCE_LOGGING === 'true'
  ) {
    logConfigPerformanceMetrics();
  }

  return config;
};

/**
 * Generates a cache key for configuration validation results.
 * @param env - Environment variables object
 * @returns {string} Cache key
 */
function generateConfigCacheKey(env: NodeJS.ProcessEnv): string {
  const criticalKeys = [
    'NODE_ENV',
    'DB_HOST',
    'DB_PORT',
    'JWT_SECRET',
    'ENABLE_MULTI_TENANCY',
    'TENANT_ISOLATION_LEVEL',
  ];

  const keyValues = criticalKeys
    .map((key) => `${key}=${env[key] ?? ''}`)
    .join('|');

  return require('crypto').createHash('md5').update(keyValues).digest('hex');
}

/**
 * Gets cached validation result if available and not expired.
 * @param cacheKey - Cache key for the validation result
 * @returns {AppConfig | null} Cached configuration or null if expired/missing
 */
function getCachedValidationResult(cacheKey: string): AppConfig | null {
  const cached = validationCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  // Check if cache has expired
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    validationCache.delete(cacheKey);
    return null;
  }

  return cached.result;
}

/**
 * Caches validation result for performance optimization.
 * @param cacheKey - Cache key for the validation result
 * @param config - Configuration object to cache
 */
function setCachedValidationResult(cacheKey: string, config: AppConfig): void {
  // Limit cache size to prevent memory leaks
  if (validationCache.size > 10) {
    const oldestKey = validationCache.keys().next().value;
    if (oldestKey !== null && oldestKey !== undefined) {
      validationCache.delete(oldestKey);
    }
  }

  validationCache.set(cacheKey, {
    result: config,
    timestamp: Date.now(),
  });
}

/**
 * Logs configuration performance metrics.
 */
function logConfigPerformanceMetrics(): void {
  console.log('📊 Configuration Performance Metrics:');
  console.log(
    `  Total validation time: ${performanceMetrics.validationDurationMs.toFixed(2)}ms`
  );
  console.log(
    `  Schema validation: ${performanceMetrics.schemaValidationMs.toFixed(2)}ms`
  );
  console.log(
    `  Consistency checks: ${performanceMetrics.consistencyCheckMs.toFixed(2)}ms`
  );
  console.log(`  Total config keys: ${performanceMetrics.totalConfigKeys}`);
  console.log(`  Cache hits: ${performanceMetrics.cacheHits}`);
  console.log(`  Cache misses: ${performanceMetrics.cacheMisses}`);

  // Warn if validation is taking too long
  if (performanceMetrics.validationDurationMs > 100) {
    console.warn(
      '⚠️  Configuration validation is taking longer than expected (>100ms)'
    );
  }
}

/**
 * Gets current configuration performance metrics.
 * @returns {ConfigPerformanceMetrics} Current performance metrics
 */
export const getConfigPerformanceMetrics = (): ConfigPerformanceMetrics => {
  return { ...performanceMetrics };
};

/**
 * Resets configuration performance metrics.
 * Useful for testing or performance analysis.
 */
export const resetConfigPerformanceMetrics = (): void => {
  performanceMetrics = {
    validationStartTime: 0,
    validationEndTime: 0,
    validationDurationMs: 0,
    schemaValidationMs: 0,
    consistencyCheckMs: 0,
    totalConfigKeys: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };
  validationCache.clear();
};

/**
 * Clears the configuration validation cache.
 * Forces re-validation on next access.
 */
export const clearConfigValidationCache = (): void => {
  validationCache.clear();
  console.log('🗑️  Configuration validation cache cleared');
};

/**
 * Global application configuration instance.
 * Validates configuration on module load and provides cached access.
 */
export const appConfig = validateAppConfig();
