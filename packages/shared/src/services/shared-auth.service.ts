/**
 * SharedAuthService - Cross-database user and tenant validation service.
 *
 * This service provides centralized authentication and authorization validation
 * across microservices using the auth database as the source of truth.
 *
 * Key features:
 * - User and tenant validation against auth database
 * - In-memory caching with TTL to minimize cross-database queries
 * - Cache invalidation on updates
 * - Promise-based async API
 *
 * Usage patterns:
 * 1. Validate user exists before creating resources
 * 2. Validate tenant exists before tenant-scoped operations
 * 3. Fetch user/tenant details for application-layer joins
 *
 * @example
 * // In dashboard-api or forms-api service
 * import { SharedAuthService } from '@nodeangularfullstack/shared/services/shared-auth.service';
 * import { authPool } from './config/multi-database.config';
 *
 * const sharedAuthService = new SharedAuthService(authPool);
 *
 * // Validate user before creating form
 * const userValid = await sharedAuthService.validateUser(userId);
 * if (!userValid) throw new Error('Invalid user');
 *
 * @module shared-auth.service
 */
import { Pool } from 'pg';

/**
 * User interface for cached user data (internal to SharedAuthService).
 * Note: Not exported to avoid conflicts with main User type from user.interface.ts
 */
interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'admin' | 'user' | 'readonly';
  isActive: boolean;
  tenantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant interface for cached tenant data (internal to SharedAuthService).
 * Note: Not exported to avoid conflicts with main Tenant type from tenant.types.ts
 */
interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cache entry interface with TTL support.
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * SharedAuthService provides cross-database user/tenant validation with caching.
 */
export class SharedAuthService {
  private userCache: Map<string, CacheEntry<AuthUser>>;
  private tenantCache: Map<string, CacheEntry<AuthTenant>>;
  private authPool: Pool;
  private cleanupIntervalId?: NodeJS.Timeout; // Store interval ID for cleanup

  // Cache TTL in milliseconds
  private readonly USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly TENANT_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  /**
   * Creates a new SharedAuthService instance.
   * @param authPool - PostgreSQL connection pool for auth database
   */
  constructor(authPool: Pool) {
    this.authPool = authPool;
    this.userCache = new Map();
    this.tenantCache = new Map();

    // Start cache cleanup interval
    this.startCacheCleanup();
  }

  /**
   * Validates that a user exists and is active.
   * Uses caching to minimize database queries.
   *
   * @param userId - The user ID (UUID) to validate
   * @returns Promise resolving to true if user exists and is active, false otherwise
   *
   * @example
   * const isValid = await sharedAuthService.validateUser('123e4567-e89b-12d3-a456-426614174000');
   * if (!isValid) {
   *   throw new UnauthorizedError('Invalid user');
   * }
   */
  async validateUser(userId: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      return user !== null && user.isActive;
    } catch (error) {
      console.error(`Error validating user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Validates that a tenant exists and is active.
   * Uses caching to minimize database queries.
   *
   * @param tenantId - The tenant ID (UUID) to validate
   * @returns Promise resolving to true if tenant exists and is active, false otherwise
   *
   * @example
   * const isValid = await sharedAuthService.validateTenant('123e4567-e89b-12d3-a456-426614174000');
   * if (!isValid) {
   *   throw new ForbiddenError('Invalid tenant');
   * }
   */
  async validateTenant(tenantId: string): Promise<boolean> {
    try {
      const tenant = await this.getTenant(tenantId);
      return tenant !== null && tenant.isActive;
    } catch (error) {
      console.error(`Error validating tenant ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Gets user details by ID with caching.
   * Returns null if user not found.
   *
   * @param userId - The user ID (UUID) to fetch
   * @returns Promise resolving to User object or null
   *
   * @example
   * const user = await sharedAuthService.getUser('123e4567-e89b-12d3-a456-426614174000');
   * if (user) {
   *   console.log(`User: ${user.email}`);
   * }
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    // Check cache first
    const cached = this.getCachedUser(userId);
    if (cached) {
      return cached;
    }

    // Fetch from auth database
    try {
      const result = await this.authPool.query(
        `SELECT id, email, first_name, last_name, role, is_active, tenant_id, created_at, updated_at
         FROM users
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const user: AuthUser = {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        role: row.role,
        isActive: row.is_active,
        tenantId: row.tenant_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      // Cache the result
      this.cacheUser(user);

      return user;
    } catch (error) {
      console.error(`Error fetching user ${userId} from auth database:`, error);
      return null;
    }
  }

  /**
   * Gets tenant details by ID with caching.
   * Returns null if tenant not found.
   *
   * @param tenantId - The tenant ID (UUID) to fetch
   * @returns Promise resolving to Tenant object or null
   *
   * @example
   * const tenant = await sharedAuthService.getTenant('123e4567-e89b-12d3-a456-426614174000');
   * if (tenant) {
   *   console.log(`Tenant: ${tenant.name}`);
   * }
   */
  async getTenant(tenantId: string): Promise<AuthTenant | null> {
    // Check cache first
    const cached = this.getCachedTenant(tenantId);
    if (cached) {
      return cached;
    }

    // Fetch from auth database
    try {
      const result = await this.authPool.query(
        `SELECT id, name, slug, is_active, created_at, updated_at
         FROM tenants
         WHERE id = $1`,
        [tenantId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const tenant: AuthTenant = {
        id: row.id,
        name: row.name,
        slug: row.slug,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      // Cache the result
      this.cacheTenant(tenant);

      return tenant;
    } catch (error) {
      console.error(`Error fetching tenant ${tenantId} from auth database:`, error);
      return null;
    }
  }

  /**
   * Invalidates cached user data.
   * Call this after user updates in auth database.
   *
   * @param userId - The user ID to invalidate
   *
   * @example
   * await authService.updateUser(userId, updates);
   * sharedAuthService.invalidateUser(userId);
   */
  invalidateUser(userId: string): void {
    this.userCache.delete(userId);
  }

  /**
   * Invalidates cached tenant data.
   * Call this after tenant updates in auth database.
   *
   * @param tenantId - The tenant ID to invalidate
   *
   * @example
   * await authService.updateTenant(tenantId, updates);
   * sharedAuthService.invalidateTenant(tenantId);
   */
  invalidateTenant(tenantId: string): void {
    this.tenantCache.delete(tenantId);
  }

  /**
   * Clears all cached data.
   * Useful for testing or manual cache reset.
   */
  clearCache(): void {
    this.userCache.clear();
    this.tenantCache.clear();
  }

  /**
   * Gets cache statistics for monitoring.
   *
   * @returns Object with cache size and hit rate metrics
   */
  getCacheStats() {
    return {
      userCacheSize: this.userCache.size,
      tenantCacheSize: this.tenantCache.size,
    };
  }

  // Private helper methods

  private getCachedUser(userId: string): AuthUser | null {
    const entry = this.userCache.get(userId);
    if (!entry) {
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.USER_CACHE_TTL) {
      this.userCache.delete(userId);
      return null;
    }

    return entry.data;
  }

  private getCachedTenant(tenantId: string): AuthTenant | null {
    const entry = this.tenantCache.get(tenantId);
    if (!entry) {
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.TENANT_CACHE_TTL) {
      this.tenantCache.delete(tenantId);
      return null;
    }

    return entry.data;
  }

  private cacheUser(user: AuthUser): void {
    this.userCache.set(user.id, {
      data: user,
      timestamp: Date.now(),
    });
  }

  private cacheTenant(tenant: AuthTenant): void {
    this.tenantCache.set(tenant.id, {
      data: tenant,
      timestamp: Date.now(),
    });
  }

  private startCacheCleanup(): void {
    // Run cache cleanup every 10 minutes
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredCache();
    }, 10 * 60 * 1000);

    // Unref the interval so it doesn't prevent Node.js process from exiting
    if (this.cleanupIntervalId.unref) {
      this.cleanupIntervalId.unref();
    }
  }

  /**
   * Stops the cache cleanup interval and clears all caches.
   * Should be called when shutting down the service or during test cleanup.
   *
   * @example
   * // In test teardown
   * afterAll(() => {
   *   sharedAuthService.destroy();
   * });
   *
   * @since Story 30.5 (QA Fix - Memory Leak)
   */
  public destroy(): void {
    // Stop the cache cleanup interval
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }

    // Clear all caches
    this.userCache.clear();
    this.tenantCache.clear();
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();

    // Clean up expired user cache entries
    for (const [userId, entry] of this.userCache.entries()) {
      if (now - entry.timestamp > this.USER_CACHE_TTL) {
        this.userCache.delete(userId);
      }
    }

    // Clean up expired tenant cache entries
    for (const [tenantId, entry] of this.tenantCache.entries()) {
      if (now - entry.timestamp > this.TENANT_CACHE_TTL) {
        this.tenantCache.delete(tenantId);
      }
    }
  }
}
