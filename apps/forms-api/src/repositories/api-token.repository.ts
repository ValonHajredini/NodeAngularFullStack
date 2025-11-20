import { Pool } from 'pg';
import { authPool } from '../config/multi-database.config';

/**
 * API token database entity interface matching the database schema.
 */
export interface ApiTokenEntity {
  id: string;
  userId: string;
  tenantId?: string;
  tokenHash: string;
  name: string;
  scopes: string[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  isActive: boolean;
}

/**
 * API token creation interface for new tokens.
 */
export interface CreateApiTokenData {
  userId: string;
  tenantId?: string;
  tokenHash: string;
  name: string;
  scopes: string[];
  expiresAt?: Date;
}

/**
 * API token update interface for modifications.
 */
export interface UpdateApiTokenData {
  name?: string;
  scopes?: string[];
  isActive?: boolean;
  lastUsedAt?: Date;
}

/**
 * API token repository for database operations.
 * Handles all API token-related database queries with proper error handling and tenant isolation.
 */
export class ApiTokenRepository {
  private get pool(): Pool {
    return authPool;
  }

  /**
   * Creates a new API token in the database.
   * @param tokenData - API token data for creation
   * @returns Promise containing the created API token
   * @throws {Error} When token creation fails or name already exists for user
   * @example
   * const token = await apiTokenRepository.create({
   *   userId: 'user-uuid',
   *   tenantId: 'tenant-uuid',
   *   tokenHash: 'hashed_token',
   *   name: 'Production API',
   *   scopes: ['read', 'write']
   * });
   */
  async create(tokenData: CreateApiTokenData): Promise<ApiTokenEntity> {
    const client = await this.pool.connect();

    try {
      const {
        userId,
        tenantId,
        tokenHash,
        name,
        scopes,
        expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
      } = tokenData;

      const query = `
        INSERT INTO api_tokens (
          user_id, tenant_id, token_hash, name, scopes, expires_at,
          created_at, updated_at, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true)
        RETURNING
          id, user_id as "userId", tenant_id as "tenantId", token_hash as "tokenHash",
          name, scopes, expires_at as "expiresAt",
          created_at as "createdAt", updated_at as "updatedAt",
          last_used_at as "lastUsedAt", is_active as "isActive"
      `;

      const values = [
        userId,
        tenantId || null,
        tokenHash,
        name,
        scopes,
        expiresAt,
      ];
      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create API token');
      }

      return result.rows[0] as ApiTokenEntity;
    } catch (error: any) {
      // Handle unique constraint violation for token name per user
      if (
        error.code === '23505' &&
        error.constraint?.includes('unique_token_name_per_user')
      ) {
        throw new Error('Token name already exists for this user');
      }

      throw new Error(`API token creation failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds an API token by token hash.
   * @param tokenHash - Hashed token value to search for
   * @returns Promise containing the token or null if not found
   * @example
   * const token = await apiTokenRepository.findByTokenHash('hashed_token');
   * if (token && token.isActive && token.expiresAt > new Date()) {
   *   console.log('Valid token found:', token.id);
   * }
   */
  async findByTokenHash(tokenHash: string): Promise<ApiTokenEntity | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id, user_id as "userId", tenant_id as "tenantId", token_hash as "tokenHash",
          name, scopes, expires_at as "expiresAt",
          created_at as "createdAt", updated_at as "updatedAt",
          last_used_at as "lastUsedAt", is_active as "isActive"
        FROM api_tokens
        WHERE token_hash = $1
      `;

      const result = await client.query(query, [tokenHash]);
      return result.rows.length > 0 ? (result.rows[0] as ApiTokenEntity) : null;
    } catch (error: any) {
      throw new Error(`Failed to find API token: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds an API token by ID with optional tenant filtering.
   * @param id - Token ID to find
   * @param tenantId - Optional tenant ID for isolation
   * @returns Promise containing the token or null if not found
   * @example
   * const token = await apiTokenRepository.findById('token-uuid', 'tenant-uuid');
   */
  async findById(
    id: string,
    tenantId?: string
  ): Promise<ApiTokenEntity | null> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          id, user_id as "userId", tenant_id as "tenantId", token_hash as "tokenHash",
          name, scopes, expires_at as "expiresAt",
          created_at as "createdAt", updated_at as "updatedAt",
          last_used_at as "lastUsedAt", is_active as "isActive"
        FROM api_tokens
        WHERE id = $1
      `;

      const params: any[] = [id];

      // Apply tenant filtering if multi-tenancy is enabled
      if (tenantId) {
        query += ' AND tenant_id = $2';
        params.push(tenantId);
      }

      const result = await client.query(query, params);
      return result.rows.length > 0 ? (result.rows[0] as ApiTokenEntity) : null;
    } catch (error: any) {
      throw new Error(`Failed to find API token: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds all API tokens for a user with optional tenant filtering.
   * @param userId - User ID to find tokens for
   * @param tenantId - Optional tenant ID for isolation
   * @returns Promise containing array of tokens
   * @example
   * const tokens = await apiTokenRepository.findByUserId('user-uuid', 'tenant-uuid');
   * const activeTokens = tokens.filter(token => token.isActive);
   */
  async findByUserId(
    userId: string,
    tenantId?: string
  ): Promise<ApiTokenEntity[]> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT
          id, user_id as "userId", tenant_id as "tenantId", token_hash as "tokenHash",
          name, scopes, expires_at as "expiresAt",
          created_at as "createdAt", updated_at as "updatedAt",
          last_used_at as "lastUsedAt", is_active as "isActive"
        FROM api_tokens
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;

      const params: any[] = [userId];

      // Apply tenant filtering if multi-tenancy is enabled
      if (tenantId) {
        query = query.replace(
          'WHERE user_id = $1',
          'WHERE user_id = $1 AND tenant_id = $2'
        );
        params.push(tenantId);
      }

      const result = await client.query(query, params);
      return result.rows as ApiTokenEntity[];
    } catch (error: any) {
      throw new Error(`Failed to find API tokens: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates an API token's information.
   * @param id - Token ID to update
   * @param updateData - Fields to update
   * @param tenantId - Optional tenant ID for isolation
   * @returns Promise containing the updated token or null if not found
   * @example
   * const updatedToken = await apiTokenRepository.update('token-uuid', {
   *   isActive: false,
   *   lastUsedAt: new Date()
   * });
   */
  async update(
    id: string,
    updateData: UpdateApiTokenData,
    tenantId?: string
  ): Promise<ApiTokenEntity | null> {
    const client = await this.pool.connect();

    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (updateData.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updateData.name);
      }
      if (updateData.scopes !== undefined) {
        fields.push(`scopes = $${paramIndex++}`);
        values.push(updateData.scopes);
      }
      if (updateData.isActive !== undefined) {
        fields.push(`is_active = $${paramIndex++}`);
        values.push(updateData.isActive);
      }
      if (updateData.lastUsedAt !== undefined) {
        fields.push(`last_used_at = $${paramIndex++}`);
        values.push(updateData.lastUsedAt);
      }

      // Always update the updated_at timestamp
      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      if (fields.length === 1) {
        // Only updated_at was added
        throw new Error('No fields to update');
      }

      let query = `
        UPDATE api_tokens
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
      `;

      values.push(id);

      // Apply tenant filtering if multi-tenancy is enabled
      if (tenantId) {
        query += ` AND tenant_id = $${paramIndex + 1}`;
        values.push(tenantId);
      }

      query += `
        RETURNING
          id, user_id as "userId", tenant_id as "tenantId", token_hash as "tokenHash",
          name, scopes, expires_at as "expiresAt",
          created_at as "createdAt", updated_at as "updatedAt",
          last_used_at as "lastUsedAt", is_active as "isActive"
      `;

      const result = await client.query(query, values);
      return result.rows.length > 0 ? (result.rows[0] as ApiTokenEntity) : null;
    } catch (error: any) {
      throw new Error(`Failed to update API token: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes an API token by ID.
   * @param id - Token ID to delete
   * @param tenantId - Optional tenant ID for isolation
   * @returns Promise containing true if deleted, false if not found
   * @example
   * const deleted = await apiTokenRepository.delete('token-uuid', 'tenant-uuid');
   * if (deleted) {
   *   console.log('Token deleted successfully');
   * }
   */
  async delete(id: string, tenantId?: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      let query = 'DELETE FROM api_tokens WHERE id = $1';
      const params: any[] = [id];

      // Apply tenant filtering if multi-tenancy is enabled
      if (tenantId) {
        query += ' AND tenant_id = $2';
        params.push(tenantId);
      }

      const result = await client.query(query, params);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error: any) {
      throw new Error(`Failed to delete API token: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates the last_used_at timestamp for token usage tracking.
   * @param tokenHash - Hashed token value
   * @returns Promise that resolves when updated
   * @example
   * await apiTokenRepository.updateLastUsed('hashed_token');
   */
  async updateLastUsed(tokenHash: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE api_tokens
        SET last_used_at = CURRENT_TIMESTAMP
        WHERE token_hash = $1
      `;

      await client.query(query, [tokenHash]);
    } catch (error: any) {
      // Non-critical error - log but don't throw
      console.error(
        `Failed to update token last used timestamp: ${error.message}`
      );
    } finally {
      client.release();
    }
  }
}
