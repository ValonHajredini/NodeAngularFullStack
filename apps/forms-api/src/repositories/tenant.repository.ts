import { Pool } from 'pg';
import { authPool } from '../config/multi-database.config';

/**
 * Tenant interface matching the enhanced database schema.
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  maxUsers: number;
  status: 'active' | 'suspended' | 'inactive' | 'pending';
  settings: {
    branding?: {
      primaryColor?: string;
      logo?: string;
    };
    features: {
      [key: string]: boolean;
    };
    isolation: {
      level: 'row' | 'schema' | 'database';
      rls: boolean;
    };
    limits: {
      maxStorage: number;
      maxApiCalls: number;
    };
    security: {
      requireMFA: boolean;
      sessionTimeout: number;
      ipWhitelist?: string[];
    };
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for creating a new tenant.
 */
export interface CreateTenantData {
  name: string;
  slug: string;
  plan?: 'free' | 'starter' | 'professional' | 'enterprise';
  maxUsers?: number;
  status?: 'active' | 'suspended' | 'inactive' | 'pending';
  settings?: Partial<Tenant['settings']>;
}

/**
 * Interface for updating tenant data.
 */
export interface UpdateTenantData {
  name?: string;
  slug?: string;
  plan?: 'free' | 'starter' | 'professional' | 'enterprise';
  maxUsers?: number;
  status?: 'active' | 'suspended' | 'inactive' | 'pending';
  settings?: Partial<Tenant['settings']>;
  isActive?: boolean;
}

/**
 * Interface for tenant metrics and usage statistics.
 */
export interface TenantMetrics {
  userCount: number;
  activeUsers: number;
  storageUsed: number;
  apiCallsThisMonth: number;
  lastActivity: Date | null;
}

/**
 * Tenant repository for database operations.
 * Handles all tenant-related database queries with proper validation.
 * Uses AUTH database for read-only access to tenant data.
 */
export class TenantRepository {
  private get pool(): Pool {
    return authPool;
  }

  /**
   * Creates a new tenant with default settings.
   * @param tenantData - Tenant data for creation
   * @returns Promise containing the created tenant
   * @throws {Error} When tenant creation fails or slug already exists
   * @example
   * const tenant = await tenantRepository.create({
   *   name: 'Acme Corp',
   *   slug: 'acme-corp',
   *   plan: 'professional'
   * });
   */
  async create(tenantData: CreateTenantData): Promise<Tenant> {
    const client = await this.pool.connect();

    try {
      const {
        name,
        slug,
        plan = 'free',
        maxUsers = 5,
        status = 'active',
        settings = {}
      } = tenantData;

      // Create default settings structure
      const defaultSettings = {
        branding: {
          primaryColor: '#2563eb',
          logo: null
        },
        features: {
          userManagement: true,
          apiAccess: true,
          customBranding: plan !== 'free',
          advancedReports: ['professional', 'enterprise'].includes(plan),
          sso: plan === 'enterprise'
        },
        isolation: {
          level: 'row' as const,
          rls: true
        },
        limits: {
          maxStorage: plan === 'free' ? 1073741824 : plan === 'starter' ? 5368709120 : 107374182400, // 1GB, 5GB, 100GB
          maxApiCalls: plan === 'free' ? 10000 : plan === 'starter' ? 50000 : 1000000
        },
        security: {
          requireMFA: false,
          sessionTimeout: 3600,
          ipWhitelist: null
        },
        ...settings
      };

      const query = `
        INSERT INTO tenants (
          name, slug, plan, max_users, status, settings,
          created_at, updated_at, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true)
        RETURNING
          id, name, slug, plan, max_users as "maxUsers", status,
          settings, is_active as "isActive",
          created_at as "createdAt", updated_at as "updatedAt"
      `;

      const values = [name, slug, plan, maxUsers, status, JSON.stringify(defaultSettings)];
      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create tenant');
      }

      return result.rows[0] as Tenant;
    } catch (error: any) {
      // Handle unique constraint violation for slug
      if (error.code === '23505' && error.constraint?.includes('slug')) {
        throw new Error('Tenant slug already exists');
      }

      throw new Error(`Tenant creation failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a tenant by ID.
   * @param id - Tenant ID to search for
   * @returns Promise containing the tenant or null if not found
   * @example
   * const tenant = await tenantRepository.findById('tenant-uuid');
   */
  async findById(id: string): Promise<Tenant | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id, name, slug, plan, max_users as "maxUsers", status,
          settings, is_active as "isActive",
          created_at as "createdAt", updated_at as "updatedAt"
        FROM tenants
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);
      return result.rows.length > 0 ? (result.rows[0] as Tenant) : null;
    } catch (error: any) {
      throw new Error(`Failed to find tenant by ID: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a tenant by slug.
   * @param slug - Tenant slug to search for
   * @returns Promise containing the tenant or null if not found
   * @example
   * const tenant = await tenantRepository.findBySlug('acme-corp');
   */
  async findBySlug(slug: string): Promise<Tenant | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id, name, slug, plan, max_users as "maxUsers", status,
          settings, is_active as "isActive",
          created_at as "createdAt", updated_at as "updatedAt"
        FROM tenants
        WHERE slug = $1 AND is_active = true
      `;

      const result = await client.query(query, [slug]);
      return result.rows.length > 0 ? (result.rows[0] as Tenant) : null;
    } catch (error: any) {
      throw new Error(`Failed to find tenant by slug: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates a tenant's information.
   * @param id - Tenant ID to update
   * @param updateData - Data to update
   * @returns Promise containing the updated tenant
   * @throws {Error} When tenant update fails or tenant not found
   * @example
   * const updatedTenant = await tenantRepository.update('tenant-uuid', {
   *   name: 'New Company Name',
   *   plan: 'enterprise'
   * });
   */
  async update(id: string, updateData: UpdateTenantData): Promise<Tenant> {
    const client = await this.pool.connect();

    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (updateData.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(updateData.name);
      }

      if (updateData.slug !== undefined) {
        updateFields.push(`slug = $${paramIndex++}`);
        values.push(updateData.slug);
      }

      if (updateData.plan !== undefined) {
        updateFields.push(`plan = $${paramIndex++}`);
        values.push(updateData.plan);
      }

      if (updateData.maxUsers !== undefined) {
        updateFields.push(`max_users = $${paramIndex++}`);
        values.push(updateData.maxUsers);
      }

      if (updateData.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(updateData.status);
      }

      if (updateData.settings !== undefined) {
        updateFields.push(`settings = settings || $${paramIndex++}`);
        values.push(JSON.stringify(updateData.settings));
      }

      if (updateData.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(updateData.isActive);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Always update the updated_at field
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE tenants
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id, name, slug, plan, max_users as "maxUsers", status,
          settings, is_active as "isActive",
          created_at as "createdAt", updated_at as "updatedAt"
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Tenant not found');
      }

      return result.rows[0] as Tenant;
    } catch (error: any) {
      // Handle unique constraint violation for slug
      if (error.code === '23505' && error.constraint?.includes('slug')) {
        throw new Error('Tenant slug already exists');
      }

      throw new Error(`Tenant update failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates only tenant settings.
   * @param id - Tenant ID to update
   * @param settings - Settings to merge with existing settings
   * @returns Promise containing the updated tenant
   * @throws {Error} When tenant update fails
   * @example
   * const tenant = await tenantRepository.updateSettings('tenant-uuid', {
   *   branding: { primaryColor: '#ff0000' },
   *   features: { customBranding: true }
   * });
   */
  async updateSettings(id: string, settings: Partial<Tenant['settings']>): Promise<Tenant> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE tenants
        SET
          settings = settings || $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING
          id, name, slug, plan, max_users as "maxUsers", status,
          settings, is_active as "isActive",
          created_at as "createdAt", updated_at as "updatedAt"
      `;

      const result = await client.query(query, [JSON.stringify(settings), id]);

      if (result.rows.length === 0) {
        throw new Error('Tenant not found');
      }

      return result.rows[0] as Tenant;
    } catch (error: any) {
      throw new Error(`Tenant settings update failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Soft deletes a tenant by setting isActive to false.
   * @param id - Tenant ID to delete
   * @returns Promise containing boolean indicating success
   * @example
   * const deleted = await tenantRepository.delete('tenant-uuid');
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE tenants
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error: any) {
      throw new Error(`Tenant deletion failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Gets all tenants with pagination and filtering.
   * @param options - Pagination and filter options
   * @returns Promise containing paginated tenant results
   * @example
   * const result = await tenantRepository.findWithPagination({
   *   page: 1,
   *   limit: 20,
   *   status: 'active'
   * });
   */
  async findWithPagination(options: {
    page?: number;
    limit?: number;
    search?: string;
    plan?: string;
    status?: 'active' | 'suspended' | 'inactive' | 'pending' | 'all';
  }): Promise<{
    tenants: Tenant[];
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const client = await this.pool.connect();

    try {
      const {
        page = 1,
        limit = 20,
        search,
        plan,
        status = 'active'
      } = options;

      const offset = (page - 1) * limit;
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Status filter
      if (status === 'active') {
        conditions.push(`is_active = true AND status = 'active'`);
      } else if (status !== 'all') {
        conditions.push(`status = $${paramIndex++}`);
        values.push(status);
      }

      // Plan filter
      if (plan) {
        conditions.push(`plan = $${paramIndex++}`);
        values.push(plan);
      }

      // Search filter (searches in name and slug)
      if (search) {
        conditions.push(`(
          name ILIKE $${paramIndex} OR
          slug ILIKE $${paramIndex}
        )`);
        values.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as count
        FROM tenants
        ${whereClause}
      `;

      // Data query
      const dataQuery = `
        SELECT
          id, name, slug, plan, max_users as "maxUsers", status,
          settings, is_active as "isActive",
          created_at as "createdAt", updated_at as "updatedAt"
        FROM tenants
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const countValues = values.slice(); // Copy for count query
      const dataValues = [...values, limit, offset];

      const [countResult, dataResult] = await Promise.all([
        client.query(countQuery, countValues),
        client.query(dataQuery, dataValues)
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
      const pages = Math.ceil(total / limit);

      return {
        tenants: dataResult.rows as Tenant[],
        total,
        page,
        limit,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      };
    } catch (error: any) {
      throw new Error(`Failed to find tenants with pagination: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Gets tenant metrics and usage statistics.
   * @param tenantId - Tenant ID to get metrics for
   * @returns Promise containing tenant metrics
   * @example
   * const metrics = await tenantRepository.getMetrics('tenant-uuid');
   */
  async getMetrics(tenantId: string): Promise<TenantMetrics> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          (SELECT COUNT(*) FROM users WHERE tenant_id = $1) as user_count,
          (SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND is_active = true) as active_users,
          (SELECT MAX(last_login) FROM users WHERE tenant_id = $1) as last_activity
      `;

      const result = await client.query(query, [tenantId]);
      const row = result.rows[0];

      return {
        userCount: parseInt(row.user_count, 10),
        activeUsers: parseInt(row.active_users, 10),
        storageUsed: 0, // TODO: Implement storage calculation
        apiCallsThisMonth: 0, // TODO: Implement API call tracking
        lastActivity: row.last_activity ? new Date(row.last_activity) : null
      };
    } catch (error: any) {
      throw new Error(`Failed to get tenant metrics: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Checks if a tenant has a specific feature enabled.
   * @param tenantId - Tenant ID to check
   * @param featureName - Name of the feature to check
   * @returns Promise containing boolean indicating if feature is enabled
   * @example
   * const hasSSO = await tenantRepository.hasFeature('tenant-uuid', 'sso');
   */
  async hasFeature(tenantId: string, featureName: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT tenant_has_feature($1, $2) as has_feature
      `;

      const result = await client.query(query, [tenantId, featureName]);
      return result.rows[0].has_feature;
    } catch (error: any) {
      throw new Error(`Failed to check tenant feature: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Gets tenant limits and usage.
   * @param tenantId - Tenant ID to get limits for
   * @returns Promise containing tenant limits
   * @example
   * const limits = await tenantRepository.getLimits('tenant-uuid');
   */
  async getLimits(tenantId: string): Promise<{
    maxUsers: number;
    currentUsers: number;
    maxStorage: number;
    currentStorage: number;
    maxApiCalls: number;
    currentApiCalls: number;
  }> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          t.max_users,
          get_tenant_limits(t.id) as limits,
          (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND is_active = true) as current_users
        FROM tenants t
        WHERE t.id = $1
      `;

      const result = await client.query(query, [tenantId]);

      if (result.rows.length === 0) {
        throw new Error('Tenant not found');
      }

      const row = result.rows[0];
      const limits = row.limits;

      return {
        maxUsers: row.max_users,
        currentUsers: parseInt(row.current_users, 10),
        maxStorage: limits.maxStorage || 0,
        currentStorage: 0, // TODO: Calculate actual storage usage
        maxApiCalls: limits.maxApiCalls || 0,
        currentApiCalls: 0 // TODO: Calculate actual API calls
      };
    } catch (error: any) {
      throw new Error(`Failed to get tenant limits: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Validates tenant slug availability.
   * @param slug - Slug to validate
   * @param excludeId - Optional tenant ID to exclude from check (for updates)
   * @returns Promise containing boolean indicating if slug is available
   * @example
   * const available = await tenantRepository.isSlugAvailable('new-company');
   */
  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      let query = 'SELECT 1 FROM tenants WHERE slug = $1';
      const values: any[] = [slug];

      if (excludeId) {
        query += ' AND id != $2';
        values.push(excludeId);
      }

      const result = await client.query(query, values);
      return result.rows.length === 0;
    } catch (error: any) {
      throw new Error(`Failed to check slug availability: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const tenantRepository = new TenantRepository();