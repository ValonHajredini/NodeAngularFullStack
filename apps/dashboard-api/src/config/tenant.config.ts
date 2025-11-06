/**
 * Multi-tenancy configuration module.
 * Handles all tenant-specific environment variables and validation.
 */
import Joi from 'joi';

/**
 * Tenant isolation levels enum.
 * Defines different approaches to tenant data separation.
 */
export type TenantIsolationLevel = 'row' | 'schema' | 'database';

/**
 * Tenant plan types enum.
 * Defines available subscription tiers for tenants.
 */
export type TenantPlan = 'free' | 'starter' | 'professional' | 'enterprise';

/**
 * Multi-tenancy configuration interface.
 * Defines all tenant-related configuration options.
 */
export interface TenantConfig {
  /** Enable/disable multi-tenancy functionality */
  multiTenancyEnabled: boolean;
  /** Tenant data isolation level */
  isolationLevel: TenantIsolationLevel;
  /** Enable Row-Level Security policies */
  rlsEnabled: boolean;
  /** Prevent cross-tenant data access */
  crossAccessPrevention: boolean;
  /** Enable tenant-specific audit logging */
  auditLogging: boolean;
  /** Include tenant context in JWT tokens */
  tokenIsolation: boolean;
  /** Default subscription plan for new tenants */
  defaultPlan: TenantPlan;
  /** Default maximum users per tenant */
  maxUsersDefault: number;
  /** Default feature flags for new tenants */
  featuresDefault: Record<string, boolean>;
  /** Enable tenant data encryption */
  dataEncryption: boolean;
  /** Require tenant email verification */
  requireVerification: boolean;
  /** Default tenant ID for single-tenant mode */
  defaultTenantId: string;
}

/**
 * Tenant configuration validation schema.
 * Validates all multi-tenancy environment variables.
 */
const tenantConfigSchema = Joi.object({
  // Core Multi-Tenancy Settings
  ENABLE_MULTI_TENANCY: Joi.boolean().default(false),
  DEFAULT_TENANT_ID: Joi.string().default('default'),

  // Isolation Configuration
  TENANT_ISOLATION_LEVEL: Joi.string()
    .valid('row', 'schema', 'database')
    .default('row'),
  TENANT_RLS_ENABLED: Joi.boolean().default(true),
  TENANT_CROSS_ACCESS_PREVENTION: Joi.boolean().default(true),

  // Security Settings
  TENANT_AUDIT_LOGGING: Joi.boolean().default(true),
  TENANT_TOKEN_ISOLATION: Joi.boolean().default(true),
  TENANT_DATA_ENCRYPTION: Joi.boolean().default(false),
  TENANT_REQUIRE_VERIFICATION: Joi.boolean().default(true),

  // Tenant Defaults
  TENANT_DEFAULT_PLAN: Joi.string()
    .valid('free', 'starter', 'professional', 'enterprise')
    .default('free'),
  TENANT_MAX_USERS_DEFAULT: Joi.number().integer().min(1).default(5),
  TENANT_FEATURES_DEFAULT: Joi.string().default('{}'),
});

/**
 * Validates and returns tenant configuration.
 * @throws {Error} When tenant configuration validation fails
 * @returns {TenantConfig} Validated tenant configuration
 */
export const validateTenantConfig = (): TenantConfig => {
  const { error, value } = tenantConfigSchema.validate(process.env, {
    allowUnknown: true,
    stripUnknown: false,
  });

  if (error) {
    throw new Error(`Tenant configuration validation failed: ${error.message}`);
  }

  // Parse and validate features JSON
  let featuresDefault: Record<string, boolean> = {};
  try {
    featuresDefault = JSON.parse(value.TENANT_FEATURES_DEFAULT);
    if (typeof featuresDefault !== 'object' || featuresDefault === null || Array.isArray(featuresDefault)) {
      throw new Error('TENANT_FEATURES_DEFAULT must be a valid JSON object');
    }
  } catch (parseError) {
    throw new Error(`Invalid TENANT_FEATURES_DEFAULT JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }

  return {
    multiTenancyEnabled: value.ENABLE_MULTI_TENANCY,
    isolationLevel: value.TENANT_ISOLATION_LEVEL as TenantIsolationLevel,
    rlsEnabled: value.TENANT_RLS_ENABLED,
    crossAccessPrevention: value.TENANT_CROSS_ACCESS_PREVENTION,
    auditLogging: value.TENANT_AUDIT_LOGGING,
    tokenIsolation: value.TENANT_TOKEN_ISOLATION,
    defaultPlan: value.TENANT_DEFAULT_PLAN as TenantPlan,
    maxUsersDefault: value.TENANT_MAX_USERS_DEFAULT,
    featuresDefault,
    dataEncryption: value.TENANT_DATA_ENCRYPTION,
    requireVerification: value.TENANT_REQUIRE_VERIFICATION,
    defaultTenantId: value.DEFAULT_TENANT_ID,
  };
};

/**
 * Global tenant configuration instance.
 * Validates configuration on module load and provides cached access.
 */
export const tenantConfig = validateTenantConfig();

/**
 * Checks if multi-tenancy is enabled.
 * @returns {boolean} True if multi-tenancy is enabled
 */
export const isMultiTenancyEnabled = (): boolean => {
  return tenantConfig.multiTenancyEnabled;
};

/**
 * Gets the default tenant ID for single-tenant mode.
 * @returns {string} Default tenant identifier
 */
export const getDefaultTenantId = (): string => {
  return tenantConfig.defaultTenantId;
};

/**
 * Validates tenant configuration consistency.
 * Checks for logical conflicts in configuration settings.
 * @throws {Error} When configuration is inconsistent
 */
export const validateTenantConfigConsistency = (): void => {
  const config = tenantConfig;

  // Check for configuration conflicts
  if (config.tokenIsolation && !config.multiTenancyEnabled) {
    throw new Error('Invalid configuration: Token isolation requires multi-tenancy to be enabled');
  }

  if (config.rlsEnabled && !config.multiTenancyEnabled) {
    console.warn('WARNING: RLS enabled without multi-tenancy. This may cause unnecessary overhead.');
  }

  if (config.multiTenancyEnabled && !config.rlsEnabled && config.isolationLevel === 'row') {
    console.warn('WARNING: Multi-tenancy enabled with row-level isolation but RLS disabled. This may compromise data isolation.');
  }

  if (config.crossAccessPrevention && !config.multiTenancyEnabled) {
    console.warn('WARNING: Cross-access prevention enabled without multi-tenancy. This setting has no effect.');
  }

  if (config.auditLogging && !config.multiTenancyEnabled) {
    console.warn('WARNING: Tenant audit logging enabled without multi-tenancy. Logs may not contain tenant context.');
  }
};