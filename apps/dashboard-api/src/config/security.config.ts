/**
 * Security configuration module for multi-tenant and single-tenant deployments.
 * Handles security-specific environment variables and validation.
 */
import Joi from 'joi';
import { tenantConfig } from './tenant.config';
import { appConfig } from './app.config';

/**
 * Security configuration interface.
 */
export interface SecurityConfig {
  /** JWT token security settings */
  jwt: {
    algorithm: string;
    issuer: string;
    audience: string;
    maxAge: number;
    refreshMaxAge: number;
    requireHttps: boolean;
  };
  /** Database security settings */
  database: {
    requireSsl: boolean;
    connectionTimeout: number;
    queryTimeout: number;
    maxConnections: number;
  };
  /** API security settings */
  api: {
    enableHelmet: boolean;
    enableCors: boolean;
    enableRateLimit: boolean;
    requireApiKey: boolean;
    maxRequestSize: string;
  };
  /** Tenant-specific security settings */
  tenant: {
    enableRls: boolean;
    enableCrossAccessPrevention: boolean;
    enableDataEncryption: boolean;
    enableAuditLogging: boolean;
    enableTokenIsolation: boolean;
    requireVerification: boolean;
  };
  /** File upload security */
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
    scanForMalware: boolean;
    quarantineSuspicious: boolean;
  };
}

/**
 * Security configuration validation schema.
 */
const securityConfigSchema = Joi.object({
  // JWT Security
  JWT_ALGORITHM: Joi.string().default('HS256'),
  JWT_ISSUER: Joi.string().default('nodeangularfullstack'),
  JWT_AUDIENCE: Joi.string().default('nodeangularfullstack-users'),
  JWT_REQUIRE_HTTPS: Joi.boolean().default(false),

  // Database Security
  DB_CONNECTION_TIMEOUT: Joi.number().positive().default(30000),
  DB_QUERY_TIMEOUT: Joi.number().positive().default(10000),
  DB_MAX_CONNECTIONS: Joi.number().positive().default(20),

  // API Security
  ENABLE_HELMET: Joi.boolean().default(true),
  ENABLE_CORS: Joi.boolean().default(true),
  ENABLE_RATE_LIMIT: Joi.boolean().default(true),
  REQUIRE_API_KEY: Joi.boolean().default(false),
  MAX_REQUEST_SIZE: Joi.string().default('10mb'),

  // File Upload Security
  MAX_FILE_SIZE: Joi.number().positive().default(10485760), // 10MB
  ALLOWED_MIME_TYPES: Joi.string().default(
    'image/jpeg,image/png,image/gif,application/pdf,text/plain'
  ),
  SCAN_FOR_MALWARE: Joi.boolean().default(false),
  QUARANTINE_SUSPICIOUS: Joi.boolean().default(true),
});

/**
 * Validates and returns security configuration.
 * @returns {SecurityConfig} Validated security configuration
 */
export const validateSecurityConfig = (): SecurityConfig => {
  const { error, value } = securityConfigSchema.validate(process.env, {
    allowUnknown: true,
    stripUnknown: false,
  });

  if (error) {
    throw new Error(
      `Security configuration validation failed: ${error.message}`
    );
  }

  return {
    jwt: {
      algorithm: value.JWT_ALGORITHM,
      issuer: value.JWT_ISSUER,
      audience: value.JWT_AUDIENCE,
      maxAge: appConfig.jwt.expiresIn,
      refreshMaxAge: appConfig.jwt.refreshExpiresIn,
      requireHttps:
        value.JWT_REQUIRE_HTTPS ?? appConfig.app.nodeEnv === 'production',
    },
    database: {
      requireSsl: appConfig.database.ssl,
      connectionTimeout: value.DB_CONNECTION_TIMEOUT,
      queryTimeout: value.DB_QUERY_TIMEOUT,
      maxConnections: value.DB_MAX_CONNECTIONS,
    },
    api: {
      enableHelmet: value.ENABLE_HELMET,
      enableCors: value.ENABLE_CORS,
      enableRateLimit: value.ENABLE_RATE_LIMIT,
      requireApiKey: value.REQUIRE_API_KEY,
      maxRequestSize: value.MAX_REQUEST_SIZE,
    },
    tenant: {
      enableRls: tenantConfig.rlsEnabled,
      enableCrossAccessPrevention: tenantConfig.crossAccessPrevention,
      enableDataEncryption: tenantConfig.dataEncryption,
      enableAuditLogging: tenantConfig.auditLogging,
      enableTokenIsolation: tenantConfig.tokenIsolation,
      requireVerification: tenantConfig.requireVerification,
    },
    upload: {
      maxFileSize: value.MAX_FILE_SIZE,
      allowedMimeTypes: value.ALLOWED_MIME_TYPES.split(',').map(
        (type: string) => type.trim()
      ),
      scanForMalware: value.SCAN_FOR_MALWARE,
      quarantineSuspicious: value.QUARANTINE_SUSPICIOUS,
    },
  };
};

/**
 * Global security configuration instance.
 */
export const securityConfig = validateSecurityConfig();

/**
 * Validates production security requirements.
 * @throws {Error} When production security requirements are not met
 */
export const validateProductionSecurity = (): void => {
  if (appConfig.app.nodeEnv !== 'production') {
    return;
  }

  console.log('🔒 Validating production security requirements...');

  const errors: string[] = [];
  const warnings: string[] = [];

  // Critical security requirements for production
  if (appConfig.jwt.secret.length < 64) {
    errors.push('JWT_SECRET must be at least 64 characters long in production');
  }

  if (
    appConfig.jwt.secret.includes('change') ||
    appConfig.jwt.secret.includes('default')
  ) {
    errors.push(
      'JWT_SECRET appears to be a default value - must be changed for production'
    );
  }

  if (!appConfig.database.ssl) {
    warnings.push(
      'Database SSL is disabled in production - consider enabling for security'
    );
  }

  if (!appConfig.app.frontendUrl.startsWith('https://')) {
    errors.push('FRONTEND_URL must use HTTPS in production');
  }

  // Multi-tenant specific security checks
  if (tenantConfig.multiTenancyEnabled) {
    if (!tenantConfig.rlsEnabled && tenantConfig.isolationLevel === 'row') {
      errors.push(
        'Multi-tenant production deployment with row-level isolation requires RLS to be enabled'
      );
    }

    if (!tenantConfig.crossAccessPrevention) {
      warnings.push(
        'Cross-access prevention is disabled in multi-tenant production - consider enabling'
      );
    }

    if (!tenantConfig.dataEncryption) {
      warnings.push(
        'Tenant data encryption is disabled in production - consider enabling for sensitive data'
      );
    }

    if (!tenantConfig.auditLogging) {
      warnings.push(
        'Tenant audit logging is disabled in production - consider enabling for compliance'
      );
    }
  }

  // pgWeb security check
  if (
    appConfig.pgweb.authPass.includes('change') ||
    appConfig.pgweb.authPass.includes('password')
  ) {
    errors.push(
      'PGWEB_AUTH_PASS appears to be a default value - must be changed for production'
    );
  }

  if (!appConfig.pgweb.readOnly) {
    warnings.push(
      'pgWeb is not in read-only mode in production - consider enabling for safety'
    );
  }

  // Rate limiting checks
  if (!securityConfig.api.enableRateLimit) {
    warnings.push(
      'Rate limiting is disabled in production - consider enabling for DoS protection'
    );
  }

  // Monitoring checks
  if (
    (appConfig.monitoring.sentryDsn === null ||
      appConfig.monitoring.sentryDsn === undefined) &&
    (appConfig.monitoring.logtailToken === null ||
      appConfig.monitoring.logtailToken === undefined)
  ) {
    warnings.push(
      'No error monitoring configured for production - consider setting up Sentry or Logtail'
    );
  }

  // Log results
  if (errors.length > 0) {
    console.error('❌ Critical production security errors:');
    errors.forEach((error) => console.error(`   • ${error}`));
    throw new Error(
      `Production security validation failed: ${errors.join(', ')}`
    );
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Production security warnings:');
    warnings.forEach((warning) => console.warn(`   • ${warning}`));
  }

  console.log('✅ Production security validation passed');
};

/**
 * Gets tenant isolation security level description.
 * @returns {object} Security level information
 */
export const getTenantSecurityInfo = (): {
  mode: string;
  isolation: string;
  security: string;
  description: string;
  features?: {
    rowLevelSecurity: boolean;
    crossAccessPrevention: boolean;
    dataEncryption: boolean;
    auditLogging: boolean;
    tokenIsolation: boolean;
  };
} => {
  if (!tenantConfig.multiTenancyEnabled) {
    return {
      mode: 'single-tenant',
      isolation: 'none',
      security: 'application-level',
      description: 'Single tenant deployment with application-level security',
    };
  }

  const isolationLevel = tenantConfig.isolationLevel;
  const rlsEnabled = tenantConfig.rlsEnabled;

  return {
    mode: 'multi-tenant',
    isolation: isolationLevel,
    security: rlsEnabled ? 'database-enforced' : 'application-enforced',
    description: `Multi-tenant deployment with ${isolationLevel}-level isolation ${rlsEnabled ? 'and database-enforced security' : '(application-enforced only)'}`,
    features: {
      rowLevelSecurity: rlsEnabled,
      crossAccessPrevention: tenantConfig.crossAccessPrevention,
      dataEncryption: tenantConfig.dataEncryption,
      auditLogging: tenantConfig.auditLogging,
      tokenIsolation: tenantConfig.tokenIsolation,
    },
  };
};

/**
 * Security configuration summary for debugging and monitoring.
 */
export const getSecuritySummary = (): Record<string, unknown> => {
  return {
    environment: appConfig.app.nodeEnv,
    timestamp: new Date().toISOString(),
    tenant: getTenantSecurityInfo(),
    jwt: {
      algorithm: securityConfig.jwt.algorithm,
      requireHttps: securityConfig.jwt.requireHttps,
      maxAge: securityConfig.jwt.maxAge,
    },
    database: {
      ssl: securityConfig.database.requireSsl,
      connectionTimeout: securityConfig.database.connectionTimeout,
    },
    api: {
      helmet: securityConfig.api.enableHelmet,
      cors: securityConfig.api.enableCors,
      rateLimit: securityConfig.api.enableRateLimit,
      maxRequestSize: securityConfig.api.maxRequestSize,
    },
    upload: {
      maxFileSize: securityConfig.upload.maxFileSize,
      allowedTypes: securityConfig.upload.allowedMimeTypes.length,
      malwareScan: securityConfig.upload.scanForMalware,
    },
  };
};
