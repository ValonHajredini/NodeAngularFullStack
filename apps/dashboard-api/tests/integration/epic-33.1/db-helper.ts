/**
 * Epic 33.1 Database Helper
 * Provides database connection and query utilities for integration tests.
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { databaseService } from '../../../src/services/database.service';

/**
 * Test database connection helper for Epic 33.1.
 */
export class TestDatabaseHelper {
  private pool: Pool;
  private static instance: TestDatabaseHelper;

  private constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Initialize test database helper.
   * @returns TestDatabaseHelper instance
   */
  static async initialize(): Promise<TestDatabaseHelper> {
    if (!TestDatabaseHelper.instance) {
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'nodeangularfullstack',
        username: process.env.DB_USER || 'dbuser',
        password: process.env.DB_PASSWORD || 'dbpassword',
        ssl: false,
      };

      await databaseService.initialize(dbConfig);
      const pool = databaseService.getPool();

      TestDatabaseHelper.instance = new TestDatabaseHelper(pool);
    }

    return TestDatabaseHelper.instance;
  }

  /**
   * Get database pool.
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Execute a query.
   */
  async query(text: string, params?: any[]): Promise<QueryResult> {
    return this.pool.query(text, params);
  }

  /**
   * Get a client from the pool.
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Execute a query in a transaction.
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if a table exists.
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.query(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      )
    `,
      [tableName]
    );

    return result.rows[0].exists;
  }

  /**
   * Check if an index exists.
   */
  async indexExists(indexName: string): Promise<boolean> {
    const result = await this.query(
      `
      SELECT EXISTS (
        SELECT FROM pg_indexes
        WHERE indexname = $1
      )
    `,
      [indexName]
    );

    return result.rows[0].exists;
  }

  /**
   * Get table row count.
   */
  async getTableRowCount(tableName: string): Promise<number> {
    const result = await this.query(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Truncate a table.
   */
  async truncateTable(
    tableName: string,
    cascade: boolean = false
  ): Promise<void> {
    const cascadeClause = cascade ? 'CASCADE' : '';
    await this.query(`TRUNCATE TABLE ${tableName} ${cascadeClause}`);
  }

  /**
   * Delete test data from export_jobs.
   */
  async deleteTestExportJobs(): Promise<void> {
    await this.query(`
      DELETE FROM export_jobs
      WHERE job_id::text LIKE 'test-%' OR job_id::text LIKE '%integration-test%'
    `);
  }

  /**
   * Delete test data from tool_registry.
   */
  async deleteTestToolRegistry(): Promise<void> {
    // Delete tool_registry records (this will cascade to form_schemas and form_submissions via foreign keys)
    await this.query(`
      DELETE FROM tool_registry
      WHERE tool_id::text LIKE 'test-%' OR name LIKE '%Test%'
    `);

    // Delete forms records (cleanup test forms)
    await this.query(`
      DELETE FROM forms
      WHERE title LIKE '%Test%' OR description LIKE '%test%'
    `);
  }

  /**
   * Get export job statistics.
   */
  async getExportJobStatistics(): Promise<{
    total: number;
    byStatus: { [status: string]: number };
  }> {
    const totalResult = await this.query(
      'SELECT COUNT(*) as count FROM export_jobs'
    );
    const statusResult = await this.query(`
      SELECT status, COUNT(*) as count
      FROM export_jobs
      GROUP BY status
    `);

    const byStatus: { [status: string]: number } = {};
    for (const row of statusResult.rows) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    return {
      total: parseInt(totalResult.rows[0].count, 10),
      byStatus,
    };
  }

  /**
   * Close database connection.
   */
  async close(): Promise<void> {
    if (databaseService) {
      await databaseService.close();
    }
    TestDatabaseHelper.instance = null as any;
  }
}
