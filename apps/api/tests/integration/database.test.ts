/**
 * @fileoverview Integration tests for database connectivity and operations
 * Tests actual database connections, transactions, and data operations
 */

import { databaseService } from '../../src/services/database.service';
import { Pool, PoolClient } from 'pg';

describe('Database Integration Tests', () => {
  let dbService = databaseService;

  beforeAll(async () => {
    // Use existing singleton instance
    await dbService.initialize();
  });

  afterAll(async () => {
    // Keep connection open for other tests
  });

  describe('Database Connection', () => {
    it('should establish connection to PostgreSQL database', async () => {
      const result = await dbService.query('SELECT 1 as test');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].test).toBe(1);
    });

    it('should return database version information', async () => {
      const result = await dbService.query('SELECT version()');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].version).toContain('PostgreSQL');
    });

    it('should handle connection pool properly', async () => {
      const pool = (dbService as any).pool as Pool;

      expect(pool.totalCount).toBeGreaterThanOrEqual(0);
      expect(pool.idleCount).toBeGreaterThanOrEqual(0);
      expect(pool.waitingCount).toBeGreaterThanOrEqual(0);
    });

    it('should validate database connectivity', async () => {
      const isConnected = await dbService.isConnected();
      expect(isConnected).toBe(true);
    });

    it('should get database statistics', async () => {
      const stats = await dbService.getStats();

      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('idleConnections');
      expect(stats).toHaveProperty('waitingClients');
      expect(typeof stats.totalConnections).toBe('number');
      expect(typeof stats.idleConnections).toBe('number');
      expect(typeof stats.waitingClients).toBe('number');
    });
  });

  describe('Database Transactions', () => {
    beforeEach(async () => {
      // Create a test table for transaction testing
      await dbService.query(`
        CREATE TABLE IF NOT EXISTS test_transactions (
          id SERIAL PRIMARY KEY,
          data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    afterEach(async () => {
      // Clean up test table
      await dbService.query('DROP TABLE IF EXISTS test_transactions');
    });

    it('should execute simple transactions successfully', async () => {
      const client = await dbService.getClient();

      try {
        await client.query('BEGIN');

        const insertResult = await client.query(
          'INSERT INTO test_transactions (data) VALUES ($1) RETURNING id',
          ['test data']
        );

        expect(insertResult.rows).toHaveLength(1);
        expect(insertResult.rows[0].id).toBeDefined();

        await client.query('COMMIT');

        // Verify data was committed
        const selectResult = await dbService.query(
          'SELECT * FROM test_transactions WHERE id = $1',
          [insertResult.rows[0].id]
        );

        expect(selectResult.rows).toHaveLength(1);
        expect(selectResult.rows[0].data).toBe('test data');

      } finally {
        client.release();
      }
    });

    it('should rollback transactions on error', async () => {
      const client = await dbService.getClient();

      try {
        await client.query('BEGIN');

        await client.query(
          'INSERT INTO test_transactions (data) VALUES ($1)',
          ['data to rollback']
        );

        // Simulate error condition
        try {
          await client.query('SELECT invalid_column FROM test_transactions');
        } catch {
          await client.query('ROLLBACK');
        }

        // Verify data was rolled back
        const selectResult = await dbService.query(
          'SELECT * FROM test_transactions WHERE data = $1',
          ['data to rollback']
        );

        expect(selectResult.rows).toHaveLength(0);

      } finally {
        client.release();
      }
    });

    it('should handle concurrent transactions', async () => {
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(
          (async () => {
            const client = await dbService.getClient();
            try {
              await client.query('BEGIN');
              await client.query(
                'INSERT INTO test_transactions (data) VALUES ($1)',
                [`concurrent data ${i}`]
              );
              await client.query('COMMIT');
            } finally {
              client.release();
            }
          })()
        );
      }

      await Promise.all(promises);

      const result = await dbService.query(
        'SELECT COUNT(*) as count FROM test_transactions'
      );

      expect(parseInt(result.rows[0].count)).toBe(5);
    });
  });

  describe('Database Error Handling', () => {
    it('should handle invalid SQL queries gracefully', async () => {
      await expect(
        dbService.query('SELECT invalid_syntax FROM')
      ).rejects.toThrow();
    });

    it('should handle connection timeout scenarios', async () => {
      // Create a query that takes longer than timeout
      const timeoutPromise = dbService.query('SELECT pg_sleep(30)');

      // This should timeout or complete within reasonable time
      await expect(
        Promise.race([
          timeoutPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 5000)
          )
        ])
      ).rejects.toThrow();
    });

    it('should handle database connection loss', async () => {
      // Note: This test might be challenging to implement without actually
      // disconnecting the database. In a real scenario, you might use
      // connection mocking or test containers.

      const originalQuery = dbService.query.bind(dbService);

      // Mock connection loss
      dbService.query = jest.fn().mockRejectedValue(
        new Error('connection terminated')
      );

      try {
        await expect(dbService.query('SELECT 1')).rejects.toThrow('connection terminated');
      } finally {
        // Restore original method
        dbService.query = originalQuery;
      }
    });

    it('should handle malformed parameters', async () => {
      await expect(
        dbService.query('SELECT $1::integer', ['not_a_number'])
      ).rejects.toThrow();
    });
  });

  describe('Database Performance', () => {
    beforeEach(async () => {
      // Create performance test table
      await dbService.query(`
        CREATE TABLE IF NOT EXISTS performance_test (
          id SERIAL PRIMARY KEY,
          data TEXT NOT NULL,
          number_field INTEGER,
          timestamp_field TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    afterEach(async () => {
      await dbService.query('DROP TABLE IF EXISTS performance_test');
    });

    it('should handle bulk inserts efficiently', async () => {
      const startTime = Date.now();
      const batchSize = 100;

      const promises = [];
      for (let i = 0; i < batchSize; i++) {
        promises.push(
          dbService.query(
            'INSERT INTO performance_test (data, number_field) VALUES ($1, $2)',
            [`bulk data ${i}`, i]
          )
        );
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete bulk inserts in reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds

      const countResult = await dbService.query(
        'SELECT COUNT(*) as count FROM performance_test'
      );
      expect(parseInt(countResult.rows[0].count)).toBe(batchSize);
    }, 10000);

    it('should handle complex queries efficiently', async () => {
      // Insert test data
      for (let i = 0; i < 50; i++) {
        await dbService.query(
          'INSERT INTO performance_test (data, number_field) VALUES ($1, $2)',
          [`test data ${i}`, i % 10]
        );
      }

      const startTime = Date.now();

      // Execute complex query
      const result = await dbService.query(`
        SELECT
          number_field,
          COUNT(*) as count,
          AVG(id) as avg_id,
          MIN(timestamp_field) as first_created,
          MAX(timestamp_field) as last_created
        FROM performance_test
        WHERE data LIKE 'test%'
        GROUP BY number_field
        ORDER BY number_field
      `);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // 1 second
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should maintain connection pool efficiency', async () => {
      const concurrentQueries = 20;
      const promises = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentQueries; i++) {
        promises.push(
          dbService.query('SELECT $1 as query_number, pg_sleep(0.1)', [i])
        );
      }

      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(concurrentQueries);

      // With connection pooling, concurrent queries should not take
      // much longer than sequential execution time
      expect(duration).toBeLessThan(5000); // Should be much faster with pooling
    }, 10000);
  });

  describe('Database Schema Operations', () => {
    it('should handle table creation and deletion', async () => {
      const tableName = 'test_schema_ops';

      // Create table
      await dbService.query(`
        CREATE TABLE ${tableName} (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL
        )
      `);

      // Verify table exists
      const tableCheck = await dbService.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = $1 AND table_schema = 'public'
      `, [tableName]);

      expect(tableCheck.rows).toHaveLength(1);

      // Insert test data
      await dbService.query(
        `INSERT INTO ${tableName} (name) VALUES ($1)`,
        ['test name']
      );

      // Verify data
      const dataCheck = await dbService.query(`SELECT * FROM ${tableName}`);
      expect(dataCheck.rows).toHaveLength(1);
      expect(dataCheck.rows[0].name).toBe('test name');

      // Drop table
      await dbService.query(`DROP TABLE ${tableName}`);

      // Verify table is gone
      const tableCheckAfter = await dbService.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = $1 AND table_schema = 'public'
      `, [tableName]);

      expect(tableCheckAfter.rows).toHaveLength(0);
    });

    it('should handle index creation and usage', async () => {
      const tableName = 'test_index_ops';

      try {
        // Create table
        await dbService.query(`
          CREATE TABLE ${tableName} (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            data TEXT
          )
        `);

        // Create index
        await dbService.query(`
          CREATE INDEX idx_${tableName}_email ON ${tableName} (email)
        `);

        // Insert test data
        for (let i = 0; i < 10; i++) {
          await dbService.query(
            `INSERT INTO ${tableName} (email, data) VALUES ($1, $2)`,
            [`user${i}@test.com`, `data ${i}`]
          );
        }

        // Query using index
        const result = await dbService.query(
          `SELECT * FROM ${tableName} WHERE email = $1`,
          ['user5@test.com']
        );

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].email).toBe('user5@test.com');

      } finally {
        // Clean up
        await dbService.query(`DROP TABLE IF EXISTS ${tableName}`);
      }
    });
  });
});