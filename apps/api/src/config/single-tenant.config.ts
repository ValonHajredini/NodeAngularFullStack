/**
 * Single-tenant mode configuration and optimization utilities.
 * Provides optimizations and helpers for single-tenant deployments.
 */
import { tenantConfig, getDefaultTenantId } from './tenant.config';

/**
 * Single-tenant optimization flags interface.
 */
export interface SingleTenantOptimizations {
  /** Skip tenant validation middleware */
  skipTenantValidation: boolean;
  /** Disable tenant-related database queries */
  disableTenantQueries: boolean;
  /** Skip tenant context in JWT tokens */
  skipTenantTokens: boolean;
  /** Disable tenant audit logging */
  disableTenantAudit: boolean;
  /** Use simplified database queries */
  useSimplifiedQueries: boolean;
}

/**
 * Gets single-tenant optimization configuration.
 * Returns optimization flags based on multi-tenancy setting.
 * @returns {SingleTenantOptimizations} Optimization flags
 */
export const getSingleTenantOptimizations = (): SingleTenantOptimizations => {
  const isMultiTenant = tenantConfig.multiTenancyEnabled;

  return {
    skipTenantValidation: !isMultiTenant,
    disableTenantQueries: !isMultiTenant,
    skipTenantTokens: !isMultiTenant || !tenantConfig.tokenIsolation,
    disableTenantAudit: !isMultiTenant || !tenantConfig.auditLogging,
    useSimplifiedQueries: !isMultiTenant,
  };
};

/**
 * Validates single-tenant mode configuration.
 * Ensures configuration is optimal for single-tenant deployment.
 * @throws {Error} When single-tenant configuration is suboptimal
 */
export const validateSingleTenantConfig = (): void => {
  if (tenantConfig.multiTenancyEnabled) {
    return; // Skip validation for multi-tenant mode
  }

  console.log('🔧 Validating single-tenant configuration...');

  const warnings: string[] = [];
  const optimizations: string[] = [];

  // Check for unnecessary overhead in single-tenant mode
  if (tenantConfig.rlsEnabled) {
    warnings.push('RLS is enabled in single-tenant mode, which may cause unnecessary overhead');
    optimizations.push('Consider setting TENANT_RLS_ENABLED=false for better performance');
  }

  if (tenantConfig.crossAccessPrevention) {
    warnings.push('Cross-access prevention is enabled but has no effect in single-tenant mode');
    optimizations.push('Consider setting TENANT_CROSS_ACCESS_PREVENTION=false');
  }

  if (tenantConfig.tokenIsolation) {
    warnings.push('Token isolation is enabled but unnecessary in single-tenant mode');
    optimizations.push('Consider setting TENANT_TOKEN_ISOLATION=false for simpler tokens');
  }

  if (tenantConfig.auditLogging) {
    warnings.push('Tenant audit logging is enabled but may not provide value in single-tenant mode');
    optimizations.push('Consider setting TENANT_AUDIT_LOGGING=false unless specifically needed');
  }

  // Log warnings and optimizations
  if (warnings.length > 0) {
    console.warn('⚠️  Single-tenant configuration warnings:');
    warnings.forEach(warning => console.warn(`   • ${warning}`));
  }

  if (optimizations.length > 0) {
    console.log('💡 Single-tenant optimization suggestions:');
    optimizations.forEach(opt => console.log(`   • ${opt}`));
  }

  if (warnings.length === 0) {
    console.log('✅ Single-tenant configuration is optimized');
  }
};

/**
 * Gets the effective tenant ID for single-tenant mode.
 * Returns the default tenant ID for all operations.
 * @returns {string} Default tenant identifier
 */
export const getEffectiveTenantId = (): string => {
  return getDefaultTenantId();
};

/**
 * Checks if tenant-related features should be disabled.
 * Returns true if multi-tenancy is disabled and feature should be skipped.
 * @param feature - Feature name for logging
 * @returns {boolean} True if feature should be disabled
 */
export const shouldDisableTenantFeature = (feature: string): boolean => {
  const optimizations = getSingleTenantOptimizations();
  const shouldDisable = !tenantConfig.multiTenancyEnabled;

  if (shouldDisable && process.env.NODE_ENV === 'development') {
    console.debug(`🔧 Disabling tenant feature '${feature}' in single-tenant mode`);
  }

  return shouldDisable;
};

/**
 * Provides graceful fallback for multi-tenant features.
 * Returns appropriate default values when multi-tenancy is disabled.
 * @param multiTenantValue - Value to use in multi-tenant mode
 * @param singleTenantValue - Value to use in single-tenant mode
 * @returns {T} Appropriate value based on tenancy mode
 */
export const tenantFallback = <T>(multiTenantValue: T, singleTenantValue: T): T => {
  return tenantConfig.multiTenancyEnabled ? multiTenantValue : singleTenantValue;
};

/**
 * Single-tenant mode documentation and deployment guide.
 */
export const SINGLE_TENANT_DEPLOYMENT_GUIDE = {
  description: 'Single-tenant mode provides simplified deployment with optimized performance',
  benefits: [
    'Simplified configuration management',
    'Reduced complexity in database queries',
    'No tenant isolation overhead',
    'Faster application startup',
    'Simpler token management',
  ],
  configuration: {
    required: {
      ENABLE_MULTI_TENANCY: 'false',
      DEFAULT_TENANT_ID: 'Unique identifier for your application instance',
    },
    recommended: {
      TENANT_RLS_ENABLED: 'false',
      TENANT_CROSS_ACCESS_PREVENTION: 'false',
      TENANT_TOKEN_ISOLATION: 'false',
      TENANT_AUDIT_LOGGING: 'false',
    },
    optional: {
      TENANT_REQUIRE_VERIFICATION: 'true (for user email verification)',
    },
  },
  migration: {
    toMultiTenant: [
      '1. Set ENABLE_MULTI_TENANCY=true',
      '2. Configure tenant isolation level',
      '3. Enable RLS if using row-level isolation',
      '4. Update database schema with tenant columns',
      '5. Migrate existing data to include tenant context',
      '6. Test tenant isolation thoroughly',
    ],
  },
};