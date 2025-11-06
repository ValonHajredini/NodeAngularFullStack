/**
 * Configuration module exports.
 * Provides centralized access to all application configuration.
 */

// Main application configuration
export { appConfig, validateAppConfig, type AppConfig } from './app.config';

// Tenant-specific configuration
export {
  tenantConfig,
  validateTenantConfig,
  validateTenantConfigConsistency,
  isMultiTenancyEnabled,
  getDefaultTenantId,
  type TenantConfig,
  type TenantIsolationLevel,
  type TenantPlan,
} from './tenant.config';

// Security configuration
export {
  securityConfig,
  validateSecurityConfig,
  validateProductionSecurity,
  getTenantSecurityInfo,
  getSecuritySummary,
  type SecurityConfig,
} from './security.config';

// Single-tenant configuration utilities
export {
  getSingleTenantOptimizations,
  validateSingleTenantConfig,
  getEffectiveTenantId,
  shouldDisableTenantFeature,
  tenantFallback,
  SINGLE_TENANT_DEPLOYMENT_GUIDE,
  type SingleTenantOptimizations,
} from './single-tenant.config';

// Swagger documentation configuration
export * from './swagger.config';