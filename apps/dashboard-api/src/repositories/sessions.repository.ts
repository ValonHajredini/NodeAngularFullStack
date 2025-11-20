import { Pool } from 'pg';
import { authPool } from '../config/multi-database.config';

/**
 * Session interface matching the database schema.
 */
export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * Session creation interface.
 */
export interface CreateSessionData {
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Sessions repository for managing user sessions and refresh tokens.
 * Handles all session-related database operations.
 */
export class SessionsRepository {
  /**
   * Gets the auth database connection pool.
   * Sessions table is in the auth database.
   */
  private get pool(): Pool {
    return authPool;
  }

  /**
   * Creates a new session in the database.
   * @param sessionData - Session data for creation
   * @returns Promise containing the created session
   * @throws {Error} When session creation fails
   * @example
   * const session = await sessionsRepository.create({
   *   userId: 'user-uuid',
   *   refreshToken: 'jwt-refresh-token',
   *   expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
   *   ipAddress: '192.168.1.1',
   *   userAgent: 'Mozilla/5.0...'
   * });
   */
  async create(sessionData: CreateSessionData): Promise<Session> {
    const client = await this.pool.connect();

    try {
      const {
        userId,
        refreshToken,
        expiresAt,
        ipAddress,
        userAgent
      } = sessionData;

      const query = `
        INSERT INTO sessions (
          user_id, refresh_token, expires_at, ip_address, user_agent, created_at
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING
          id, user_id as "userId", refresh_token as "refreshToken",
          expires_at as "expiresAt", ip_address as "ipAddress",
          user_agent as "userAgent", created_at as "createdAt"
      `;

      const values = [userId, refreshToken, expiresAt, ipAddress || null, userAgent || null];
      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Failed to create session');
      }

      return result.rows[0] as Session;
    } catch (error: any) {
      throw new Error(`Session creation failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a session by refresh token.
   * @param refreshToken - Refresh token to search for
   * @returns Promise containing the session or null if not found
   * @example
   * const session = await sessionsRepository.findByRefreshToken('jwt-token');
   * if (session && session.expiresAt > new Date()) {
   *   console.log('Valid session found');
   * }
   */
  async findByRefreshToken(refreshToken: string): Promise<Session | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id, user_id as "userId", refresh_token as "refreshToken",
          expires_at as "expiresAt", ip_address as "ipAddress",
          user_agent as "userAgent", created_at as "createdAt"
        FROM sessions
        WHERE refresh_token = $1
      `;

      const result = await client.query(query, [refreshToken]);

      return result.rows.length > 0 ? (result.rows[0] as Session) : null;
    } catch (error: any) {
      throw new Error(`Failed to find session by refresh token: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a session by ID.
   * @param id - Session ID to search for
   * @returns Promise containing the session or null if not found
   * @example
   * const session = await sessionsRepository.findById('session-uuid');
   */
  async findById(id: string): Promise<Session | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id, user_id as "userId", refresh_token as "refreshToken",
          expires_at as "expiresAt", ip_address as "ipAddress",
          user_agent as "userAgent", created_at as "createdAt"
        FROM sessions
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);

      return result.rows.length > 0 ? (result.rows[0] as Session) : null;
    } catch (error: any) {
      throw new Error(`Failed to find session by ID: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Updates a session's refresh token (for token rotation).
   * @param id - Session ID to update
   * @param newRefreshToken - New refresh token
   * @param newExpiresAt - New expiration date
   * @returns Promise containing the updated session
   * @throws {Error} When session update fails
   * @example
   * const updatedSession = await sessionsRepository.updateRefreshToken(
   *   'session-uuid',
   *   'new-jwt-token',
   *   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
   * );
   */
  async updateRefreshToken(
    id: string,
    newRefreshToken: string,
    newExpiresAt: Date
  ): Promise<Session> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE sessions
        SET refresh_token = $2, expires_at = $3
        WHERE id = $1
        RETURNING
          id, user_id as "userId", refresh_token as "refreshToken",
          expires_at as "expiresAt", ip_address as "ipAddress",
          user_agent as "userAgent", created_at as "createdAt"
      `;

      const result = await client.query(query, [id, newRefreshToken, newExpiresAt]);

      if (result.rows.length === 0) {
        throw new Error('Session not found');
      }

      return result.rows[0] as Session;
    } catch (error: any) {
      throw new Error(`Session update failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes a session by ID.
   * @param id - Session ID to delete
   * @returns Promise containing boolean indicating success
   * @example
   * const deleted = await sessionsRepository.delete('session-uuid');
   * if (deleted) {
   *   console.log('Session deleted successfully');
   * }
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = 'DELETE FROM sessions WHERE id = $1';
      const result = await client.query(query, [id]);

      return result.rowCount !== null && result.rowCount > 0;
    } catch (error: any) {
      throw new Error(`Session deletion failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes a session by refresh token.
   * @param refreshToken - Refresh token of session to delete
   * @returns Promise containing boolean indicating success
   * @example
   * const deleted = await sessionsRepository.deleteByRefreshToken('jwt-token');
   */
  async deleteByRefreshToken(refreshToken: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = 'DELETE FROM sessions WHERE refresh_token = $1';
      const result = await client.query(query, [refreshToken]);

      return result.rowCount !== null && result.rowCount > 0;
    } catch (error: any) {
      throw new Error(`Session deletion by refresh token failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes all sessions for a user (logout from all devices).
   * @param userId - User ID whose sessions to delete
   * @returns Promise containing number of deleted sessions
   * @example
   * const deletedCount = await sessionsRepository.deleteAllByUserId('user-uuid');
   * console.log(`Deleted ${deletedCount} sessions`);
   */
  async deleteAllByUserId(userId: string): Promise<number> {
    const client = await this.pool.connect();

    try {
      const query = 'DELETE FROM sessions WHERE user_id = $1';
      const result = await client.query(query, [userId]);

      return result.rowCount || 0;
    } catch (error: any) {
      throw new Error(`Failed to delete sessions by user ID: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes expired sessions for cleanup.
   * @returns Promise containing number of deleted sessions
   * @example
   * const deletedCount = await sessionsRepository.deleteExpired();
   * console.log(`Cleaned up ${deletedCount} expired sessions`);
   */
  async deleteExpired(): Promise<number> {
    const client = await this.pool.connect();

    try {
      const query = 'DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP';
      const result = await client.query(query);

      return result.rowCount || 0;
    } catch (error: any) {
      throw new Error(`Failed to delete expired sessions: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Finds all active sessions for a user.
   * @param userId - User ID to search for
   * @returns Promise containing array of active sessions
   * @example
   * const sessions = await sessionsRepository.findActiveByUserId('user-uuid');
   * console.log(`User has ${sessions.length} active sessions`);
   */
  async findActiveByUserId(userId: string): Promise<Session[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT
          id, user_id as "userId", refresh_token as "refreshToken",
          expires_at as "expiresAt", ip_address as "ipAddress",
          user_agent as "userAgent", created_at as "createdAt"
        FROM sessions
        WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, [userId]);

      return result.rows as Session[];
    } catch (error: any) {
      throw new Error(`Failed to find active sessions by user ID: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Counts active sessions for a user.
   * @param userId - User ID to count for
   * @returns Promise containing session count
   * @example
   * const count = await sessionsRepository.countActiveByUserId('user-uuid');
   * if (count > 5) {
   *   console.log('User has too many active sessions');
   * }
   */
  async countActiveByUserId(userId: string): Promise<number> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT COUNT(*) as count
        FROM sessions
        WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
      `;

      const result = await client.query(query, [userId]);

      return parseInt(result.rows[0].count, 10);
    } catch (error: any) {
      throw new Error(`Failed to count active sessions by user ID: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Validates if a refresh token is still valid.
   * @param refreshToken - Refresh token to validate
   * @returns Promise containing validation result
   * @example
   * const isValid = await sessionsRepository.isRefreshTokenValid('jwt-token');
   * if (!isValid) {
   *   throw new Error('Invalid or expired refresh token');
   * }
   */
  async isRefreshTokenValid(refreshToken: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT 1
        FROM sessions
        WHERE refresh_token = $1 AND expires_at > CURRENT_TIMESTAMP
      `;

      const result = await client.query(query, [refreshToken]);

      return result.rows.length > 0;
    } catch (error: any) {
      throw new Error(`Failed to validate refresh token: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const sessionsRepository = new SessionsRepository();