/**
 * Performance optimization utilities for single-tenant mode.
 * Provides zero-overhead optimizations when multi-tenancy is disabled.
 */
import { performance } from 'perf_hooks';
import { tenantConfig } from '../config/tenant.config';
import { TenantContext } from './tenant.utils';

/**
 * Performance-optimized query builder for single-tenant mode.
 * Skips tenant filtering and context processing when not needed.
 */
export class PerformanceUtils {
  /**
   * Creates optimized database query parameters based on tenancy mode.
   * In single-tenant mode, skips tenant filtering for better performance.
   * @param baseQuery - Base SQL query
   * @param params - Query parameters
   * @param tenantContext - Optional tenant context (ignored in single-tenant mode)
   * @returns Optimized query and parameters
   */
  static optimizeQuery(
    baseQuery: string,
    params: any[],
    tenantContext?: TenantContext
  ): { query: string; params: any[] } {
    // Single-tenant mode: return query as-is for maximum performance
    if (!tenantConfig.multiTenancyEnabled) {
      return { query: baseQuery, params };
    }

    // Multi-tenant mode: apply tenant filtering
    if (tenantContext && this.queryNeedsTenantFiltering(baseQuery)) {
      return this.addTenantFiltering(baseQuery, params, tenantContext.id);
    }

    return { query: baseQuery, params };
  }

  /**
   * Performance-optimized middleware wrapper that conditionally applies middleware.
   * Skips middleware execution entirely in single-tenant mode when not needed.
   * @param middleware - Middleware function to conditionally apply
   * @param condition - Condition to check (defaults to multi-tenancy enabled)
   * @returns Optimized middleware function
   */
  static conditionalMiddleware<T extends Function>(
    middleware: T,
    condition: () => boolean = () => tenantConfig.multiTenancyEnabled
  ): T {
    return ((req: any, res: any, next: any) => {
      if (condition()) {
        return middleware(req, res, next);
      }
      next(); // Skip middleware entirely
    }) as unknown as T;
  }

  /**
   * Zero-overhead tenant context creation for single-tenant mode.
   * Returns null to skip context processing entirely.
   * @param tenantId - Tenant ID (ignored in single-tenant mode)
   * @param slug - Tenant slug (ignored in single-tenant mode)
   * @returns Tenant context or null for single-tenant optimization
   */
  static createOptimizedTenantContext(
    tenantId?: string,
    slug?: string
  ): TenantContext | null {
    // Single-tenant mode: return null to skip all tenant processing
    if (!tenantConfig.multiTenancyEnabled) {
      return null;
    }

    // Multi-tenant mode: create full context
    if (tenantId && slug) {
      return {
        id: tenantId,
        slug,
        features: [], // Will be populated by actual tenant data
        limits: {}, // Will be populated by actual tenant data
        status: 'active',
      };
    }

    return null;
  }

  /**
   * Performance-optimized authentication token processing.
   * Skips tenant context extraction in single-tenant mode.
   * @param tokenPayload - JWT token payload
   * @returns Optimized user data extraction
   */
  static extractUserFromToken(tokenPayload: any): {
    user: any;
    tenantContext?: TenantContext;
  } {
    const user = {
      id: tokenPayload.userId,
      email: tokenPayload.email,
      role: tokenPayload.role,
      tenantId: tokenPayload.tenantId,
    };

    // Single-tenant mode: skip tenant context extraction
    if (!tenantConfig.multiTenancyEnabled || !tenantConfig.tokenIsolation) {
      return { user };
    }

    // Multi-tenant mode: extract tenant context if present
    let tenantContext: TenantContext | undefined;
    if (tokenPayload.tenant) {
      tenantContext = {
        id: tokenPayload.tenant.id,
        slug: tokenPayload.tenant.slug,
        plan: tokenPayload.tenant.plan,
        features: tokenPayload.tenant.features || [],
        limits: tokenPayload.tenant.limits || {},
        status: tokenPayload.tenant.status || 'active',
      };
    }

    return { user, tenantContext };
  }

  /**
   * High-performance caching key generator.
   * Uses simple keys in single-tenant mode, tenant-prefixed keys in multi-tenant mode.
   * @param baseKey - Base cache key
   * @param tenantContext - Optional tenant context
   * @returns Optimized cache key
   */
  static generateCacheKey(
    baseKey: string,
    tenantContext?: TenantContext
  ): string {
    // Single-tenant mode: use simple keys for maximum cache performance
    if (!tenantConfig.multiTenancyEnabled || !tenantContext) {
      return baseKey;
    }

    // Multi-tenant mode: prefix with tenant ID
    return `t:${tenantContext.id}:${baseKey}`;
  }

  /**
   * Optimized database connection pooling for single vs multi-tenant modes.
   * @returns Pool configuration optimized for deployment mode
   */
  static getOptimizedPoolConfig(): {
    max: number;
    min: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  } {
    // Single-tenant mode: smaller pool size since no tenant isolation needed
    if (!tenantConfig.multiTenancyEnabled) {
      return {
        max: 10, // Smaller pool for single-tenant
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };
    }

    // Multi-tenant mode: larger pool to handle tenant isolation overhead
    return {
      max: 20, // Larger pool for multi-tenant
      min: 5,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 5000,
    };
  }

  /**
   * Performance monitoring for tenant-aware operations.
   * Tracks overhead introduced by multi-tenancy features.
   * @param operation - Operation name
   * @param startTime - Operation start time
   * @param tenantContext - Optional tenant context
   */
  static logPerformanceMetric(
    operation: string,
    startTime: number,
    _tenantContext?: TenantContext // Prefixed with underscore to indicate intentionally unused
  ): void {
    const duration = Date.now() - startTime;
    const mode = tenantConfig.multiTenancyEnabled
      ? 'multi-tenant'
      : 'single-tenant';

    // Log performance metrics for monitoring
    console.debug(`[PERF] ${operation} (${mode}): ${duration}ms`, {
      operation,
      mode,
      duration,
      hasTenantContext: !!_tenantContext,
    });

    // In production, this would integrate with metrics collection system
    // metrics.timing(`operation.${operation}.${mode}`, duration);
  }

  /**
   * Memory-efficient tenant data processing.
   * Minimizes object creation and processing in single-tenant mode.
   * @param data - Raw data to process
   * @param tenantContext - Optional tenant context
   * @returns Processed data optimized for deployment mode
   */
  static processDataForTenancy<T>(
    data: T[],
    tenantContext?: TenantContext
  ): T[] {
    // Single-tenant mode: return data as-is (zero processing overhead)
    if (!tenantConfig.multiTenancyEnabled) {
      return data;
    }

    // Multi-tenant mode: apply tenant filtering if context is available
    if (tenantContext && Array.isArray(data)) {
      return data.filter((item: any) => {
        // Assume items have tenantId property for filtering
        return !item.tenantId || item.tenantId === tenantContext.id;
      });
    }

    return data;
  }

  /**
   * Optimized validation pipeline for different tenancy modes.
   * @param validations - Array of validation functions
   * @param tenantContext - Optional tenant context
   * @returns Validation results
   */
  static runOptimizedValidations(
    validations: Array<() => boolean | Promise<boolean>>,
    _tenantContext?: TenantContext
  ): Promise<boolean[]> {
    // Single-tenant mode: run basic validations only
    if (!tenantConfig.multiTenancyEnabled) {
      const basicValidations = validations.slice(
        0,
        Math.ceil(validations.length / 2)
      );
      return Promise.all(basicValidations.map((v) => v()));
    }

    // Multi-tenant mode: run all validations including tenant-specific ones
    return Promise.all(validations.map((v) => v()));
  }

  /**
   * Checks if a query needs tenant filtering based on table names.
   * @param query - SQL query to analyze
   * @returns True if query needs tenant filtering
   */
  private static queryNeedsTenantFiltering(query: string): boolean {
    const tenantAwareTables = [
      'users',
      'audit_logs',
      'sessions',
      'password_resets',
    ];
    const lowerQuery = query.toLowerCase();

    return tenantAwareTables.some(
      (table) =>
        lowerQuery.includes(`from ${table}`) ||
        lowerQuery.includes(`join ${table}`) ||
        lowerQuery.includes(`update ${table}`) ||
        lowerQuery.includes(`insert into ${table}`)
    );
  }

  /**
   * Adds tenant filtering to a SQL query.
   * @param query - Base SQL query
   * @param params - Query parameters
   * @param tenantId - Tenant ID for filtering
   * @returns Modified query with tenant filtering
   */
  private static addTenantFiltering(
    query: string,
    params: any[],
    tenantId: string
  ): { query: string; params: any[] } {
    // This is a simplified implementation
    // In production, you'd want more sophisticated query parsing
    const hasWhere = query.toLowerCase().includes('where');
    const tenantFilter = hasWhere
      ? ` AND tenant_id = $${params.length + 1}`
      : ` WHERE tenant_id = $${params.length + 1}`;

    return {
      query: query + tenantFilter,
      params: [...params, tenantId],
    };
  }
}

/**
 * Performance benchmarking utilities for comparing single vs multi-tenant performance.
 */
export class TenantPerformanceBenchmark {
  private static benchmarks: Map<string, number[]> = new Map();

  /**
   * Starts a performance benchmark for an operation.
   * @param operationName - Name of the operation to benchmark
   * @returns Benchmark completion function
   */
  static startBenchmark(operationName: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      const mode = tenantConfig.multiTenancyEnabled ? 'multi' : 'single';
      const key = `${operationName}_${mode}`;

      if (!this.benchmarks.has(key)) {
        this.benchmarks.set(key, []);
      }

      this.benchmarks.get(key)!.push(duration);
    };
  }

  /**
   * Gets benchmark statistics for performance analysis.
   * @returns Performance statistics by operation and mode
   */
  static getBenchmarkStats(): Record<
    string,
    {
      count: number;
      min: number;
      max: number;
      avg: number;
      mode: string;
    }
  > {
    const stats: Record<string, any> = {};

    for (const [key, durations] of this.benchmarks.entries()) {
      const count = durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      const avg = durations.reduce((a, b) => a + b, 0) / count;
      const mode = key.includes('_multi') ? 'multi-tenant' : 'single-tenant';

      stats[key] = { count, min, max, avg, mode };
    }

    return stats;
  }

  /**
   * Resets all benchmark data.
   */
  static resetBenchmarks(): void {
    this.benchmarks.clear();
  }
}

// Export singleton instances for easy access
export const performanceUtils = PerformanceUtils;
export const benchmarkUtils = TenantPerformanceBenchmark;
