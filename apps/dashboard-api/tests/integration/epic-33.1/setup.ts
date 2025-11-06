/**
 * Epic 33.1 Integration Test Setup
 * Provides specialized test database configuration and helpers for export infrastructure testing.
 */

import { Pool, PoolClient } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import { databaseService } from '../../../src/services/database.service';

// Test export working directory
export const TEST_EXPORT_DIR = '/tmp/test-exports';

// Test database pool
let testPool: Pool;

/**
 * Initialize Epic 33.1 test environment.
 * Sets up database connection, runs migrations, and prepares filesystem.
 */
export const setupEpic33_1Tests = async (): Promise<void> => {
  // Initialize database connection
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'nodeangularfullstack',
    username: process.env.DB_USER || 'dbuser',
    password: process.env.DB_PASSWORD || 'dbpassword',
    ssl: false,
  };

  await databaseService.initialize(dbConfig);
  testPool = databaseService.getPool();

  // Ensure export_jobs table exists (run migrations if needed)
  await ensureExportJobsTableExists();

  // Prepare test filesystem
  await prepareTestFilesystem();
};

/**
 * Ensure export_jobs table exists in test database.
 */
const ensureExportJobsTableExists = async (): Promise<void> => {
  const client = await testPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS export_jobs (
        job_id VARCHAR(255) PRIMARY KEY,
        tool_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        steps_total INTEGER NOT NULL DEFAULT 0,
        steps_completed INTEGER NOT NULL DEFAULT 0,
        current_step_name VARCHAR(255),
        package_path TEXT,
        error_message TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_export_jobs_tool
          FOREIGN KEY (tool_id)
          REFERENCES tool_registry(tool_id)
          ON DELETE CASCADE
      )
    `);

    // Create indexes if they don't exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_export_jobs_tool_id ON export_jobs(tool_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at ON export_jobs(created_at DESC)
    `);
  } finally {
    client.release();
  }
};

/**
 * Prepare test filesystem for exports.
 * Creates test directories and sets permissions.
 */
const prepareTestFilesystem = async (): Promise<void> => {
  try {
    // Create test export directory if it doesn't exist
    await fs.mkdir(TEST_EXPORT_DIR, { recursive: true });

    // Clean any existing test export files
    const files = await fs.readdir(TEST_EXPORT_DIR);
    await Promise.all(
      files.map((file) =>
        fs.rm(path.join(TEST_EXPORT_DIR, file), {
          recursive: true,
          force: true,
        })
      )
    );
  } catch (error) {
    console.error('Failed to prepare test filesystem:', error);
    throw error;
  }
};

/**
 * Clean Epic 33.1 test data from database.
 * Removes export jobs and test tool registry entries.
 */
export const cleanEpic33_1TestData = async (): Promise<void> => {
  const client = await testPool.connect();
  try {
    await client.query('BEGIN');

    // Delete test export jobs (CASCADE will handle dependent records)
    await client.query(`
      DELETE FROM export_jobs
      WHERE job_id LIKE 'test-%' OR job_id LIKE '%integration-test%'
    `);

    // Delete test tool registry entries (CASCADE will handle export_jobs)
    await client.query(`
      DELETE FROM tool_registry
      WHERE tool_id LIKE 'test-%' OR tool_name LIKE '%Test%'
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
 * Clean test filesystem after tests.
 * Removes all generated export packages and working directories.
 */
export const cleanTestFilesystem = async (): Promise<void> => {
  try {
    const files = await fs.readdir(TEST_EXPORT_DIR);
    await Promise.all(
      files.map((file) =>
        fs.rm(path.join(TEST_EXPORT_DIR, file), {
          recursive: true,
          force: true,
        })
      )
    );
  } catch (error) {
    console.error('Failed to clean test filesystem:', error);
  }
};

/**
 * Get test database pool for direct queries.
 */
export const getTestPool = (): Pool => {
  if (!testPool) {
    throw new Error(
      'Test pool not initialized. Call setupEpic33_1Tests() first.'
    );
  }
  return testPool;
};

/**
 * Create a test transaction for isolated test execution.
 */
export const beginTestTransaction = async (): Promise<PoolClient> => {
  const client = await testPool.connect();
  await client.query('BEGIN');
  return client;
};

/**
 * Rollback test transaction and release client.
 */
export const rollbackTestTransaction = async (
  client: PoolClient
): Promise<void> => {
  try {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
};

/**
 * Teardown Epic 33.1 test environment.
 * Cleans up database connections and filesystem.
 */
export const teardownEpic33_1Tests = async (): Promise<void> => {
  await cleanEpic33_1TestData();
  await cleanTestFilesystem();

  if (databaseService) {
    await databaseService.close();
  }
};
