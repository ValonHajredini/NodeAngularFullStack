import { Pool } from 'pg';
import { databaseService } from '../services/database.service';

/**
 * User interface matching the database schema.
 */
export interface User {
  id: string;
  tenantId?: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  emailVerified: boolean;
}

/**
 * User creation interface for registration.
 */
export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
  role?: string;
}

/**
 * User update interface for profile modifications.
 */
export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  lastLogin?: Date;
  isActive?: boolean;
  emailVerified?: boolean;
}

/**
 * User repository for database operations.
 * Handles all user-related database queries with proper error handling.
 */
export class UsersRepository {
  private get pool(): Pool {
    return databaseService.getPool();
  }

  /**
   * Creates a new user in the database.
   * @param userData - User data for creation
   * @returns Promise containing the created user
   * @throws {Error} When user creation fails or email already exists
   * @example
   * const user = await usersRepository.create({
   *   email: 'user@example.com',
   *   passwordHash: 'hashed_password',
   *   firstName: 'John',
   *   lastName: 'Doe'
   * });
   */
  async create(userData: CreateUserData): Promise<User> {
    const client = await this.pool.connect();

    try {
      const {
        email,
        passwordHash,
        firstName,
        lastName,
        tenantId,
        role = 'user',
      } = userData;

      const query = `
        INSERT INTO users (
          tenant_id, email, password_hash, first_name, last_name, role,
          created_at, updated_at, is_active, email_verified
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true, false)
        RETURNING
          id, tenant_id as "tenantId", email, password_hash as "passwordHash",
          first_name as "firstName", last_name as "lastName", role,
          avatar_url as "avatarUrl", created_at as "createdAt", updated_at as "updatedAt",
          last_login as "lastLogin", is_active as "isActive",
          email_verified as "emailVerified"
      `;

      const values = [
        tenantId || null,
        email,
        passwordHash,
        firstName,
        lastName,
        role,
      ];
      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create user');
      }

      return result.rows[0] as User;
    } catch (error: any) {
      // Handle unique constraint violation for email
      if (error.code === '23505' && error.constraint?.includes('email')) {
        throw new Error('Email already exists');
      }

      throw new Error(`User creation failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a user by email address.
   * @param email - Email address to search for
   * @param tenantId - Optional tenant ID for multi-tenant mode
   * @returns Promise containing the user or null if not found
   * @example
   * const user = await usersRepository.findByEmail('user@example.com');
   * if (user) {
   *   console.log('User found:', user.id);
   * }
   */
  async findByEmail(email: string, tenantId?: string): Promise<User | null> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          id, tenant_id as "tenantId", email, password_hash as "passwordHash",
          first_name as "firstName", last_name as "lastName", role,
          avatar_url as "avatarUrl", created_at as "createdAt", updated_at as "updatedAt",
          last_login as "lastLogin", is_active as "isActive",
          email_verified as "emailVerified"
        FROM users
        WHERE email = $1
      `;

      const values: any[] = [email];

      // Add tenant filtering if multi-tenancy is enabled
      if (tenantId !== undefined) {
        query += ' AND tenant_id = $2';
        values.push(tenantId);
      } else {
        query += ' AND tenant_id IS NULL';
      }

      const result = await client.query(query, values);

      return result.rows.length > 0 ? (result.rows[0] as User) : null;
    } catch (error: any) {
      throw new Error(`Failed to find user by email: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a user by ID.
   * @param id - User ID to search for
   * @returns Promise containing the user or null if not found
   * @example
   * const user = await usersRepository.findById('user-uuid');
   * if (user) {
   *   console.log('User:', user.email);
   * }
   */
  async findById(id: string): Promise<User | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id, tenant_id as "tenantId", email, password_hash as "passwordHash",
          first_name as "firstName", last_name as "lastName", role,
          avatar_url as "avatarUrl", created_at as "createdAt", updated_at as "updatedAt",
          last_login as "lastLogin", is_active as "isActive",
          email_verified as "emailVerified"
        FROM users
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);

      return result.rows.length > 0 ? (result.rows[0] as User) : null;
    } catch (error: any) {
      throw new Error(`Failed to find user by ID: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates a user's information.
   * @param id - User ID to update
   * @param updateData - Data to update
   * @returns Promise containing the updated user
   * @throws {Error} When user update fails or user not found
   * @example
   * const updatedUser = await usersRepository.update('user-uuid', {
   *   firstName: 'Jane',
   *   lastLogin: new Date()
   * });
   */
  async update(id: string, updateData: UpdateUserData): Promise<User> {
    const client = await this.pool.connect();

    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (updateData.email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        values.push(updateData.email);
      }

      if (updateData.firstName !== undefined) {
        updateFields.push(`first_name = $${paramIndex++}`);
        values.push(updateData.firstName);
      }

      if (updateData.lastName !== undefined) {
        updateFields.push(`last_name = $${paramIndex++}`);
        values.push(updateData.lastName);
      }

      if (updateData.avatarUrl !== undefined) {
        updateFields.push(`avatar_url = $${paramIndex++}`);
        values.push(updateData.avatarUrl);
      }

      if (updateData.lastLogin !== undefined) {
        updateFields.push(`last_login = $${paramIndex++}`);
        values.push(updateData.lastLogin);
      }

      if (updateData.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(updateData.isActive);
      }

      if (updateData.emailVerified !== undefined) {
        updateFields.push(`email_verified = $${paramIndex++}`);
        values.push(updateData.emailVerified);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Always update the updated_at field
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE users
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id, tenant_id as "tenantId", email, password_hash as "passwordHash",
          first_name as "firstName", last_name as "lastName", role,
          avatar_url as "avatarUrl", created_at as "createdAt", updated_at as "updatedAt",
          last_login as "lastLogin", is_active as "isActive",
          email_verified as "emailVerified"
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0] as User;
    } catch (error: any) {
      // Handle unique constraint violation for email
      if (error.code === '23505' && error.constraint?.includes('email')) {
        throw new Error('Email already exists');
      }

      throw new Error(`User update failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Soft deletes a user by setting isActive to false.
   * @param id - User ID to delete
   * @returns Promise containing boolean indicating success
   * @example
   * const deleted = await usersRepository.delete('user-uuid');
   * if (deleted) {
   *   console.log('User deleted successfully');
   * }
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE users
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);

      return result.rowCount !== null && result.rowCount > 0;
    } catch (error: any) {
      throw new Error(`User deletion failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Checks if an email exists in the database.
   * @param email - Email to check
   * @param tenantId - Optional tenant ID for multi-tenant mode
   * @returns Promise containing boolean indicating if email exists
   * @example
   * const exists = await usersRepository.emailExists('user@example.com');
   * if (exists) {
   *   console.log('Email already registered');
   * }
   */
  async emailExists(email: string, tenantId?: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      let query = 'SELECT 1 FROM users WHERE email = $1';
      const values: any[] = [email];

      // Add tenant filtering if multi-tenancy is enabled
      if (tenantId !== undefined) {
        query += ' AND tenant_id = $2';
        values.push(tenantId);
      } else {
        query += ' AND tenant_id IS NULL';
      }

      const result = await client.query(query, values);

      return result.rows.length > 0;
    } catch (error: any) {
      throw new Error(`Email existence check failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates user's last login timestamp.
   * @param id - User ID to update
   * @returns Promise indicating success
   * @example
   * await usersRepository.updateLastLogin('user-uuid');
   */
  async updateLastLogin(id: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE users
        SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      await client.query(query, [id]);
    } catch (error: any) {
      throw new Error(`Failed to update last login: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Gets all users for a tenant (admin functionality).
   * @param tenantId - Tenant ID to filter by
   * @param limit - Maximum number of users to return
   * @param offset - Number of users to skip
   * @returns Promise containing array of users
   * @example
   * const users = await usersRepository.findByTenant('tenant-uuid', 10, 0);
   */
  async findByTenant(
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<User[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id, tenant_id as "tenantId", email, password_hash as "passwordHash",
          first_name as "firstName", last_name as "lastName", role,
          avatar_url as "avatarUrl", created_at as "createdAt", updated_at as "updatedAt",
          last_login as "lastLogin", is_active as "isActive",
          email_verified as "emailVerified"
        FROM users
        WHERE tenant_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await client.query(query, [tenantId, limit, offset]);

      return result.rows as User[];
    } catch (error: any) {
      throw new Error(`Failed to find users by tenant: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Counts total users for a tenant.
   * @param tenantId - Tenant ID to count for
   * @returns Promise containing user count
   * @example
   * const count = await usersRepository.countByTenant('tenant-uuid');
   */
  async countByTenant(tenantId: string): Promise<number> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT COUNT(*) as count
        FROM users
        WHERE tenant_id = $1 AND is_active = true
      `;

      const result = await client.query(query, [tenantId]);

      return parseInt(result.rows[0].count, 10);
    } catch (error: any) {
      throw new Error(`Failed to count users by tenant: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates a user's password hash.
   * @param userId - User ID
   * @param hashedPassword - New hashed password
   * @returns Promise resolving when password is updated
   * @throws {Error} When update fails or user not found
   * @example
   * await usersRepository.updatePassword('user-uuid', 'hashed-password');
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE users
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND is_active = true
      `;
      const result = await client.query(query, [hashedPassword, userId]);

      if (result.rowCount === 0) {
        throw new Error('User not found or inactive');
      }
    } catch (error: any) {
      throw new Error(`Failed to update password: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Gets paginated users with search and filter capabilities.
   * @param options - Pagination and filter options
   * @returns Promise containing paginated user results
   * @example
   * const result = await usersRepository.findWithPagination({
   *   page: 1,
   *   limit: 20,
   *   search: 'john',
   *   role: 'user'
   * });
   */
  async findWithPagination(options: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    tenantId?: string;
    status?: 'active' | 'inactive' | 'all';
  }): Promise<{
    users: User[];
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
        role,
        tenantId,
        status = 'active',
      } = options;

      const offset = (page - 1) * limit;
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Base WHERE conditions
      if (tenantId !== undefined) {
        conditions.push(`tenant_id = $${paramIndex++}`);
        values.push(tenantId);
      } else {
        conditions.push(`tenant_id IS NULL`);
      }

      // Status filter
      if (status === 'active') {
        conditions.push(`is_active = true`);
      } else if (status === 'inactive') {
        conditions.push(`is_active = false`);
      }
      // 'all' status doesn't add condition

      // Role filter
      if (role) {
        conditions.push(`role = $${paramIndex++}`);
        values.push(role);
      }

      // Search filter (searches in email, firstName, lastName)
      if (search) {
        conditions.push(`(
          email ILIKE $${paramIndex} OR
          first_name ILIKE $${paramIndex} OR
          last_name ILIKE $${paramIndex} OR
          CONCAT(first_name, ' ', last_name) ILIKE $${paramIndex}
        )`);
        values.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as count
        FROM users
        ${whereClause}
      `;

      // Data query
      const dataQuery = `
        SELECT
          id, tenant_id as "tenantId", email, password_hash as "passwordHash",
          first_name as "firstName", last_name as "lastName", role,
          avatar_url as "avatarUrl", created_at as "createdAt", updated_at as "updatedAt",
          last_login as "lastLogin", is_active as "isActive",
          email_verified as "emailVerified"
        FROM users
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const countValues = values.slice(); // Copy for count query
      const dataValues = [...values, limit, offset];

      const [countResult, dataResult] = await Promise.all([
        client.query(countQuery, countValues),
        client.query(dataQuery, dataValues),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
      const pages = Math.ceil(total / limit);

      return {
        users: dataResult.rows as User[],
        total,
        page,
        limit,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      };
    } catch (error: any) {
      throw new Error(`Failed to find users with pagination: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Soft deletes a user by adding deleted_at timestamp.
   * @param id - User ID to soft delete
   * @returns Promise containing boolean indicating success
   * @example
   * const deleted = await usersRepository.softDelete('user-uuid');
   */
  async softDelete(id: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE users
        SET deleted_at = CURRENT_TIMESTAMP, is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const result = await client.query(query, [id]);

      return result.rowCount !== null && result.rowCount > 0;
    } catch (error: any) {
      throw new Error(`User soft deletion failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates a user's avatar URL.
   * @param userId - User ID to update
   * @param avatarUrl - New avatar URL or null to remove
   * @returns Promise containing the updated user
   * @throws {Error} When user update fails or user not found
   * @example
   * const user = await usersRepository.updateAvatar('user-uuid', 'https://cdn.example.com/avatar.jpg');
   */
  async updateAvatar(userId: string, avatarUrl: string | null): Promise<User> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE users
        SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND is_active = true
        RETURNING
          id, tenant_id as "tenantId", email, password_hash as "passwordHash",
          first_name as "firstName", last_name as "lastName", role,
          avatar_url as "avatarUrl", created_at as "createdAt", updated_at as "updatedAt",
          last_login as "lastLogin", is_active as "isActive",
          email_verified as "emailVerified"
      `;

      const result = await client.query(query, [avatarUrl, userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found or inactive');
      }

      return result.rows[0] as User;
    } catch (error: any) {
      throw new Error(`Avatar update failed: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const usersRepository = new UsersRepository();
