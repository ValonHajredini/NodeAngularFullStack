/**
 * Database Seeding Utility
 *
 * Manages test data for E2E tests.
 * Seeds admin users, clears test data, and validates tool registration.
 *
 * @module tests/e2e/utils/database
 */

import { Pool, PoolConfig } from 'pg';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

export class DatabaseSeeder {
  private pool: Pool;
  private apiBaseUrl: string;

  /**
   * Creates a new database seeder.
   * @param connectionString - PostgreSQL connection string
   * @param apiBaseUrl - Base URL for API endpoints
   */
  constructor(
    connectionString: string = process.env.DATABASE_URL || '',
    apiBaseUrl: string = process.env.API_BASE_URL || 'http://localhost:3000'
  ) {
    const poolConfig: PoolConfig = connectionString
      ? { connectionString }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          database: process.env.DB_NAME || 'nodeangularfullstack',
          user: process.env.DB_USER || 'dbuser',
          password: process.env.DB_PASSWORD || 'dbpassword',
        };

    this.pool = new Pool(poolConfig);
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Seeds an admin user for E2E testing.
   * Creates or updates user if already exists (idempotent).
   * @returns Admin user credentials
   * @throws {Error} If database operation fails
   */
  async seedAdminUser(): Promise<{ email: string; password: string }> {
    const email = 'e2e-admin@example.com';
    const password = 'E2eUser123!@#';
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified)
      VALUES ($1, $2, 'E2E', 'Admin', 'admin', true)
      ON CONFLICT (email)
      WHERE tenant_id IS NULL AND deleted_at IS NULL
      DO UPDATE SET
        password_hash = $2,
        first_name = 'E2E',
        last_name = 'Admin',
        role = 'admin',
        email_verified = true
      RETURNING id
    `;

    await this.pool.query(query, [email, hashedPassword]);
    console.log(`✓ Admin user seeded: ${email}`);

    return { email, password };
  }

  /**
   * Clears all E2E test tools from the registry.
   * Removes tools with ID starting with 'e2e-test-'.
   * @throws {Error} If database operation fails
   */
  async clearToolRegistry(): Promise<void> {
    await this.pool.query('DELETE FROM tool_registry WHERE tool_id LIKE $1', [
      'e2e-test-%',
    ]);
    console.log('✓ Test tools cleared from registry');
  }

  /**
   * Authenticates as admin and retrieves access token.
   * @param email - Admin email
   * @param password - Admin password
   * @returns JWT access token
   * @throws {Error} If authentication fails
   */
  async getAuthToken(email: string, password: string): Promise<string> {
    const response = await axios.post(`${this.apiBaseUrl}/api/auth/login`, {
      email,
      password,
    });

    return response.data.accessToken;
  }

  /**
   * Verifies that a tool is registered in the database.
   * @param toolId - Tool ID to check
   * @returns True if tool exists, false otherwise
   * @throws {Error} If database query fails
   */
  async verifyToolRegistered(toolId: string): Promise<boolean> {
    const query = 'SELECT * FROM tool_registry WHERE tool_id = $1';
    const result = await this.pool.query(query, [toolId]);
    return result.rows.length > 0;
  }

  /**
   * Gets a tool from the registry by ID.
   * @param toolId - Tool ID to retrieve
   * @returns Tool record or null if not found
   * @throws {Error} If database query fails
   */
  async getToolById(toolId: string): Promise<any | null> {
    const query = 'SELECT * FROM tool_registry WHERE tool_id = $1';
    const result = await this.pool.query(query, [toolId]);
    return result.rows[0] || null;
  }

  /**
   * Checks database connection health.
   * @returns True if connection successful, false otherwise
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  /**
   * Cleans up all test data.
   * Removes test tools and test users.
   * @throws {Error} If cleanup operations fail
   */
  async cleanup(): Promise<void> {
    await this.clearToolRegistry();
    await this.pool.query('DELETE FROM users WHERE email LIKE $1', ['e2e-%@%']);
    console.log('✓ Test data cleaned up');
  }

  /**
   * Closes the database connection pool.
   * Call this when done with the seeder.
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Executes a raw SQL query (for advanced test scenarios).
   * @param query - SQL query string
   * @param params - Query parameters
   * @returns Query result
   * @throws {Error} If query execution fails
   */
  async executeQuery(query: string, params: any[] = []): Promise<any> {
    return await this.pool.query(query, params);
  }
}
