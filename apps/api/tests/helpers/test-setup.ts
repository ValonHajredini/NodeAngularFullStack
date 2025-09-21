/**
 * Comprehensive test setup and teardown utilities for API testing.
 * Handles database connections, test data management, and environment setup.
 */

import { Pool } from 'pg';
import { databaseService } from '../../src/services/database.service';

let pool: Pool;

/**
 * Initialize test database connection and run migrations.
 */
export const setupTestDatabase = async (): Promise<void> => {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'nodeangularfullstack',
    username: process.env.DB_USER || 'dbuser',
    password: process.env.DB_PASSWORD || 'dbpassword',
    ssl: false,
  };

  try {
    await databaseService.initialize(dbConfig);
    pool = databaseService.getPool();
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
};

/**
 * Clean database before each test while preserving structure.
 */
export const cleanTestDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    // Begin transaction for cleanup
    await client.query('BEGIN');

    // Clean test data but preserve seed users
    await client.query(`
      DELETE FROM audit_logs
      WHERE user_id NOT IN (
        SELECT id FROM users
        WHERE email IN ('admin@example.com', 'user@example.com', 'readonly@example.com')
      )
    `);

    await client.query(`
      DELETE FROM sessions
      WHERE user_id NOT IN (
        SELECT id FROM users
        WHERE email IN ('admin@example.com', 'user@example.com', 'readonly@example.com')
      )
    `);

    await client.query(`
      DELETE FROM users
      WHERE email NOT IN ('admin@example.com', 'user@example.com', 'readonly@example.com')
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Close database connections after tests.
 */
export const teardownTestDatabase = async (): Promise<void> => {
  if (databaseService) {
    await databaseService.close();
  }
};

/**
 * Create a test transaction for isolated test execution.
 */
export const beginTestTransaction = async (): Promise<any> => {
  const client = await pool.connect();
  await client.query('BEGIN');
  return client;
};

/**
 * Rollback test transaction to clean up test data.
 */
export const rollbackTestTransaction = async (client: any): Promise<void> => {
  try {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
};

/**
 * Setup functions for Jest test environment.
 */
beforeAll(async () => {
  await setupTestDatabase();
});

beforeEach(async () => {
  await cleanTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});