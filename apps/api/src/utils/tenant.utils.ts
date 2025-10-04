/**
 * Tenant utility functions for multi-tenancy support and configuration.
 * Provides helper functions for tenant context management and optimization.
 */

/**
 * Environment configuration for multi-tenancy.
 */
interface MultiTenancyConfig {
  enabled: boolean;
  isolationLevel: 'row' | 'schema' | 'database';
  rlsEnabled: boolean;
  tokenIsolation: boolean;
  defaultTenantId: string;
}

/**
 * Tenant context interface for request processing.
 */
export interface TenantContext {
  id: string;
  slug: string;
  features?: string[];
  limits?: Record<string, number>;
  plan?: 'free' | 'starter' | 'professional' | 'enterprise';
  status?: 'active' | 'suspended' | 'inactive' | 'pending';
}

/**
 * Gets multi-tenancy configuration from environment variables.
 * @returns MultiTenancyConfig object with current settings
 * @example
 * const config = getMultiTenancyConfig();
 * if (config.enabled) {
 *   // Apply tenant filtering
 * }
 */
export function getMultiTenancyConfig(): MultiTenancyConfig {
  return {
    enabled: process.env.ENABLE_MULTI_TENANCY === 'true',
    isolationLevel: (process.env.TENANT_ISOLATION_LEVEL as any) || 'row',
    rlsEnabled: process.env.TENANT_RLS_ENABLED === 'true',
    tokenIsolation: process.env.TENANT_TOKEN_ISOLATION === 'true',
    defaultTenantId:
      process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000000',
  };
}

/**
 * Checks if multi-tenancy is enabled in the current environment.
 * @returns boolean indicating if multi-tenancy is enabled
 * @example
 * if (isMultiTenancyEnabled()) {
 *   // Use tenant-aware queries
 * } else {
 *   // Use single-tenant optimized queries
 * }
 */
export function isMultiTenancyEnabled(): boolean {
  return getMultiTenancyConfig().enabled;
}

/**
 * Gets the default tenant ID for single-tenant mode.
 * @returns string containing the default tenant UUID
 * @example
 * const tenantId = isMultiTenancyEnabled() ? userTenantId : getDefaultTenantId();
 */
export function getDefaultTenantId(): string {
  return getMultiTenancyConfig().defaultTenantId;
}

/**
 * Creates optimized query parameters based on tenancy mode.
 * @param baseParams - Base query parameters
 * @param tenantContext - Optional tenant context
 * @returns Optimized parameters array for database queries
 * @example
 * const params = createOptimizedQueryParams(['user-id'], tenantContext);
 * const result = await pool.query(query, params);
 */
export function createOptimizedQueryParams(
  baseParams: any[],
  tenantContext?: TenantContext
): any[] {
  if (!isMultiTenancyEnabled()) {
    return baseParams;
  }

  if (tenantContext) {
    return [...baseParams, tenantContext.id];
  }

  return baseParams;
}

/**
 * Builds tenant-aware WHERE clause for SQL queries.
 * @param tableName - Table name to apply tenant filtering
 * @param tenantContext - Optional tenant context
 * @param additionalConditions - Additional WHERE conditions
 * @returns Optimized WHERE clause string
 * @example
 * const whereClause = buildTenantWhereClause('users', tenantContext, 'is_active = true');
 * const query = `SELECT * FROM users ${whereClause}`;
 */
export function buildTenantWhereClause(
  tableName: string,
  tenantContext?: TenantContext,
  additionalConditions?: string
): string {
  const conditions: string[] = [];

  // Add tenant filtering if multi-tenancy is enabled and table supports it
  if (isMultiTenancyEnabled() && supportsTenancy(tableName) && tenantContext) {
    conditions.push(`${tableName}.tenant_id = $${getNextParamIndex()}`);
  }

  // Add additional conditions if provided
  if (additionalConditions) {
    conditions.push(additionalConditions);
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

/**
 * Checks if a table supports multi-tenancy based on table name.
 * @param tableName - Name of the database table
 * @returns boolean indicating if table has tenant_id column
 * @example
 * if (supportsTenancy('users')) {
 *   // Apply tenant filtering to users table
 * }
 */
export function supportsTenancy(tableName: string): boolean {
  const tenantAwareTables = [
    'users',
    'audit_logs',
    'sessions',
    'password_resets',
  ];

  return tenantAwareTables.includes(tableName);
}

/**
 * Validates tenant context for security and integrity.
 * @param tenantContext - Tenant context to validate
 * @throws {Error} When tenant context is invalid
 * @example
 * validateTenantContext(tenantContext);
 * // Proceed with tenant-aware operations
 */
export function validateTenantContext(tenantContext: TenantContext): void {
  if (!tenantContext) {
    throw new Error('Tenant context is required when multi-tenancy is enabled');
  }

  if (!tenantContext.id || typeof tenantContext.id !== 'string') {
    throw new Error('Valid tenant ID is required');
  }

  if (!tenantContext.slug || typeof tenantContext.slug !== 'string') {
    throw new Error('Valid tenant slug is required');
  }

  // UUID validation for tenant ID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantContext.id)) {
    throw new Error('Tenant ID must be a valid UUID');
  }

  // Slug validation (URL-safe)
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(tenantContext.slug)) {
    throw new Error(
      'Tenant slug must be URL-safe (lowercase letters, numbers, and hyphens only)'
    );
  }
}

/**
 * Creates a tenant context from minimal data.
 * @param tenantId - Tenant UUID
 * @param tenantSlug - Tenant slug
 * @param additionalData - Optional additional tenant data
 * @returns TenantContext object
 * @example
 * const context = createTenantContext('tenant-uuid', 'company-slug');
 */
export function createTenantContext(
  tenantId: string,
  tenantSlug: string,
  additionalData?: Partial<TenantContext>
): TenantContext {
  const context: TenantContext = {
    id: tenantId,
    slug: tenantSlug,
    ...additionalData,
  };

  validateTenantContext(context);
  return context;
}

/**
 * Optimizes query execution based on tenancy mode.
 * @param query - Base SQL query
 * @param params - Query parameters
 * @param tenantContext - Optional tenant context
 * @returns Optimized query and parameters
 * @example
 * const { query: optimizedQuery, params: optimizedParams } = optimizeQuery(
 *   'SELECT * FROM users WHERE id = $1',
 *   ['user-id'],
 *   tenantContext
 * );
 */
export function optimizeQuery(
  query: string,
  params: any[],
  tenantContext?: TenantContext
): { query: string; params: any[] } {
  // Single-tenant mode optimization: return query as-is
  if (!isMultiTenancyEnabled()) {
    return { query, params };
  }

  // Multi-tenant mode: add tenant filtering if context is provided
  if (
    tenantContext &&
    query.includes('FROM users') &&
    !query.includes('tenant_id')
  ) {
    // Add tenant filtering to user queries
    const whereClause = query.includes('WHERE')
      ? ' AND tenant_id = $'
      : ' WHERE tenant_id = $';
    const optimizedQuery = query.replace(
      /(\bFROM\s+users\b(?:\s+\w+)?)/i,
      `$1${whereClause}${params.length + 1}`
    );

    return {
      query: optimizedQuery,
      params: [...params, tenantContext.id],
    };
  }

  return { query, params };
}

/**
 * Gets tenant-specific configuration or default for single-tenant mode.
 * @param tenantContext - Optional tenant context
 * @param configKey - Configuration key to retrieve
 * @param defaultValue - Default value if not found
 * @returns Configuration value
 * @example
 * const maxUsers = getTenantConfig(tenantContext, 'maxUsers', 5);
 */
export function getTenantConfig<T>(
  tenantContext: TenantContext | undefined,
  configKey: string,
  defaultValue: T
): T {
  if (!isMultiTenancyEnabled() || !tenantContext) {
    return defaultValue;
  }

  // Extract configuration from tenant context
  if (tenantContext.limits && configKey in tenantContext.limits) {
    return tenantContext.limits[configKey] as T;
  }

  return defaultValue;
}

/**
 * Checks if a feature is enabled for the tenant.
 * @param tenantContext - Optional tenant context
 * @param featureName - Name of the feature to check
 * @returns boolean indicating if feature is enabled
 * @example
 * if (isTenantFeatureEnabled(tenantContext, 'customBranding')) {
 *   // Enable custom branding features
 * }
 */
export function isTenantFeatureEnabled(
  tenantContext: TenantContext | undefined,
  featureName: string
): boolean {
  if (!isMultiTenancyEnabled()) {
    return true; // All features enabled in single-tenant mode
  }

  if (!tenantContext?.features) {
    return false;
  }

  return tenantContext.features.includes(featureName);
}

/**
 * Creates a performance-optimized tenant filter for database operations.
 * @param tenantContext - Optional tenant context
 * @returns Tenant filter object or null for single-tenant optimization
 * @example
 * const filter = createTenantFilter(tenantContext);
 * if (filter) {
 *   query.where(filter);
 * }
 */
export function createTenantFilter(
  tenantContext?: TenantContext
): { tenant_id: string } | null {
  if (!isMultiTenancyEnabled()) {
    return null; // No filtering needed in single-tenant mode
  }

  if (!tenantContext) {
    throw new Error('Tenant context required in multi-tenant mode');
  }

  return { tenant_id: tenantContext.id };
}

/**
 * Helper function to get the next parameter index for query building.
 * This is a simple implementation that should be enhanced based on actual usage.
 * @returns Next parameter index
 */
let paramCounter = 0;
function getNextParamIndex(): number {
  return ++paramCounter;
}

/**
 * Resets the parameter counter (useful for testing).
 */
export function resetParamCounter(): void {
  paramCounter = 0;
}

/**
 * Logs tenant-related operations for audit and debugging.
 * @param operation - Operation being performed
 * @param tenantContext - Tenant context
 * @param additionalData - Additional data to log
 * @example
 * logTenantOperation('user_created', tenantContext, { userId: 'user-id' });
 */
export function logTenantOperation(
  operation: string,
  tenantContext?: TenantContext,
  additionalData?: Record<string, any>
): void {
  if (!isMultiTenancyEnabled()) {
    return; // Skip logging in single-tenant mode for performance
  }

  const logData = {
    timestamp: new Date().toISOString(),
    operation,
    tenantId: tenantContext?.id || 'unknown',
    tenantSlug: tenantContext?.slug || 'unknown',
    ...additionalData,
  };

  // TODO: Integrate with actual logging service
  console.log('[TENANT_OPERATION]', JSON.stringify(logData));
}

/**
 * Creates a tenant-aware cache key.
 * @param baseKey - Base cache key
 * @param tenantContext - Optional tenant context
 * @returns Tenant-specific cache key or base key for single-tenant mode
 * @example
 * const cacheKey = createTenantCacheKey('user_profile', tenantContext);
 */
export function createTenantCacheKey(
  baseKey: string,
  tenantContext?: TenantContext
): string {
  if (!isMultiTenancyEnabled()) {
    return baseKey; // No tenant prefix needed in single-tenant mode
  }

  if (!tenantContext) {
    return baseKey;
  }

  return `tenant:${tenantContext.id}:${baseKey}`;
}
