import { authPool } from '../config/multi-database.config';

/**
 * Password reset token interface
 */
export interface PasswordReset {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

/**
 * Repository for managing password reset tokens.
 * Handles CRUD operations for password reset functionality.
 */
export class PasswordResetRepository {
  /**
   * Creates a new password reset token.
   * @param resetData - Password reset token data
   * @returns Promise resolving to created password reset record
   * @throws {Error} When creation fails
   * @example
   * const reset = await passwordResetRepository.create({
   *   userId: 'user-uuid',
   *   token: 'secure-random-token',
   *   expiresAt: new Date(Date.now() + 3600000) // 1 hour
   * });
   */
  async create(resetData: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<PasswordReset> {
    try {
      const query = `
        INSERT INTO password_resets (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, token, expires_at, used, created_at
      `;

      const values = [resetData.userId, resetData.token, resetData.expiresAt];
      const result = await authPool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create password reset token');
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        token: row.token,
        expiresAt: new Date(row.expires_at),
        used: row.used,
        createdAt: new Date(row.created_at),
      };
    } catch (error) {
      console.error('Error creating password reset token:', error);
      throw new Error(`Failed to create password reset token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Finds a password reset token by its value.
   * @param token - Reset token string
   * @returns Promise resolving to password reset record or null if not found
   * @throws {Error} When query fails
   * @example
   * const reset = await passwordResetRepository.findByToken('reset-token-123');
   * if (reset && !reset.used && reset.expiresAt > new Date()) {
   *   // Token is valid
   * }
   */
  async findByToken(token: string): Promise<PasswordReset | null> {
    try {
      const query = `
        SELECT id, user_id, token, expires_at, used, created_at
        FROM password_resets
        WHERE token = $1
      `;

      const values = [token];
      const result = await authPool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        token: row.token,
        expiresAt: new Date(row.expires_at),
        used: row.used,
        createdAt: new Date(row.created_at),
      };
    } catch (error) {
      console.error('Error finding password reset token:', error);
      throw new Error(`Failed to find password reset token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Finds password reset tokens by user ID.
   * @param userId - User UUID
   * @param includeExpired - Whether to include expired tokens
   * @returns Promise resolving to array of password reset records
   * @throws {Error} When query fails
   * @example
   * const resets = await passwordResetRepository.findByUserId('user-uuid', false);
   */
  async findByUserId(userId: string, includeExpired: boolean = false): Promise<PasswordReset[]> {
    try {
      let query = `
        SELECT id, user_id, token, expires_at, used, created_at
        FROM password_resets
        WHERE user_id = $1
      `;

      if (!includeExpired) {
        query += ' AND expires_at > CURRENT_TIMESTAMP AND used = false';
      }

      query += ' ORDER BY created_at DESC';

      const values = [userId];
      const result = await authPool.query(query, values);

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        token: row.token,
        expiresAt: new Date(row.expires_at),
        used: row.used,
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      console.error('Error finding password reset tokens by user ID:', error);
      throw new Error(`Failed to find password reset tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Marks a password reset token as used.
   * @param tokenId - Reset token UUID
   * @returns Promise resolving to updated password reset record
   * @throws {Error} When update fails or token not found
   * @example
   * await passwordResetRepository.markAsUsed('token-uuid');
   */
  async markAsUsed(tokenId: string): Promise<PasswordReset> {
    try {
      const query = `
        UPDATE password_resets
        SET used = true
        WHERE id = $1
        RETURNING id, user_id, token, expires_at, used, created_at
      `;

      const values = [tokenId];
      const result = await authPool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Password reset token not found');
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        token: row.token,
        expiresAt: new Date(row.expires_at),
        used: row.used,
        createdAt: new Date(row.created_at),
      };
    } catch (error) {
      console.error('Error marking password reset token as used:', error);
      throw new Error(`Failed to mark token as used: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes a password reset token.
   * @param tokenId - Reset token UUID
   * @returns Promise resolving to boolean indicating success
   * @throws {Error} When deletion fails
   * @example
   * await passwordResetRepository.delete('token-uuid');
   */
  async delete(tokenId: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM password_resets WHERE id = $1';
      const values = [tokenId];
      const result = await authPool.query(query, values);

      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting password reset token:', error);
      throw new Error(`Failed to delete password reset token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes all password reset tokens for a user.
   * @param userId - User UUID
   * @returns Promise resolving to number of deleted tokens
   * @throws {Error} When deletion fails
   * @example
   * const deletedCount = await passwordResetRepository.deleteByUserId('user-uuid');
   */
  async deleteByUserId(userId: string): Promise<number> {
    try {
      const query = 'DELETE FROM password_resets WHERE user_id = $1';
      const values = [userId];
      const result = await authPool.query(query, values);

      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting password reset tokens by user ID:', error);
      throw new Error(`Failed to delete password reset tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleans up expired and used password reset tokens.
   * @returns Promise resolving to number of deleted tokens
   * @throws {Error} When cleanup fails
   * @example
   * const cleanedCount = await passwordResetRepository.cleanup();
   * console.log(`Cleaned up ${cleanedCount} expired tokens`);
   */
  async cleanup(): Promise<number> {
    try {
      const query = `
        DELETE FROM password_resets
        WHERE expires_at < CURRENT_TIMESTAMP OR used = true
      `;

      const result = await authPool.query(query);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning up password reset tokens:', error);
      throw new Error(`Failed to cleanup password reset tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates a secure random token for password reset.
   * @param length - Token length (default: 32)
   * @returns Secure random token string
   * @example
   * const token = PasswordResetRepository.generateSecureToken();
   */
  static generateSecureToken(length: number = 32): string {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Validates if a password reset token is valid (not expired and not used).
   * @param reset - Password reset record
   * @returns Boolean indicating if token is valid
   * @example
   * const isValid = PasswordResetRepository.isTokenValid(resetRecord);
   */
  static isTokenValid(reset: PasswordReset): boolean {
    if (!reset) return false;
    if (reset.used) return false;
    if (reset.expiresAt <= new Date()) return false;
    return true;
  }
}

// Export singleton instance
export const passwordResetRepository = new PasswordResetRepository();