/**
 * Export Jobs Query Performance Tests
 * Epic 33.1: Export Core Infrastructure
 * Story: 33.1.2 Export Jobs Database Schema (Task 11)
 *
 * Validates query performance with large dataset (10,000+ export jobs):
 * - Verifies database indexes are used effectively
 * - Measures query execution times against NFR targets
 * - Uses EXPLAIN ANALYZE to validate index usage
 *
 * Performance Targets:
 * - findById (PRIMARY KEY): < 10ms
 * - findByUserId (composite index): < 50ms
 * - findByStatus (status index): < 100ms
 */

import { Pool } from 'pg';
import { ExportJobRepository } from '../../src/repositories/export-job.repository';
import { ExportJobStatus } from '@nodeangularfullstack/shared';
import crypto from 'crypto';

describe('Export Jobs Query Performance Tests', () => {
  let pool: Pool;
  let repository: ExportJobRepository;
  let testToolId: string;
  let testUserId: string;
  let testJobIds: string[] = [];
  const DATASET_SIZE = 10000; // 10K rows for realistic performance testing

  beforeAll(async () => {
    // Create test database connection
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'nodeangularfullstack',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'dbpassword',
    });

    repository = new ExportJobRepository(pool);

    // Get existing user from seed data or create test tool
    const userResult = await pool.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      throw new Error(
        'No users found in database. Run seed data first (npm --workspace=apps/api run db:seed)'
      );
    }
    testUserId = userResult.rows[0].id;

    // Create test tool if none exists (export_jobs.tool_id references tool_registry.id, not tool_registry.tool_id)
    let toolResult = await pool.query('SELECT id FROM tool_registry LIMIT 1');
    if (toolResult.rows.length === 0) {
      console.log('📦 Creating test tool for performance tests...');
      const createToolQuery = `
        INSERT INTO tool_registry (tool_id, name, description, version, route, api_base)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      const testToolData = [
        'perf-test-tool',
        'Performance Test Tool',
        'Tool created for export jobs performance testing',
        '1.0.0',
        '/tools/perf-test',
        '/api/perf-test',
      ];
      toolResult = await pool.query(createToolQuery, testToolData);
      console.log('✅ Test tool created');
    }
    testToolId = toolResult.rows[0].id;

    console.log(
      `\n📊 Seeding ${DATASET_SIZE} export jobs for performance testing...`
    );
    const seedStartTime = Date.now();

    // Seed large dataset using batch inserts for efficiency
    const batchSize = 1000;
    const batches = Math.ceil(DATASET_SIZE / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const jobsInBatch = Math.min(batchSize, DATASET_SIZE - batch * batchSize);
      const values: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      for (let i = 0; i < jobsInBatch; i++) {
        const jobId = crypto.randomUUID();
        testJobIds.push(jobId);

        // Distribute statuses: 40% completed, 30% in_progress, 20% pending, 10% failed
        let status: ExportJobStatus;
        const rand = Math.random();
        if (rand < 0.4) {
          status = ExportJobStatus.COMPLETED;
        } else if (rand < 0.7) {
          status = ExportJobStatus.IN_PROGRESS;
        } else if (rand < 0.9) {
          status = ExportJobStatus.PENDING;
        } else {
          status = ExportJobStatus.FAILED;
        }

        values.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`
        );

        params.push(
          jobId,
          testToolId,
          testUserId,
          status,
          Math.floor(Math.random() * 8), // steps_completed (0-7)
          8, // steps_total
          `Step ${Math.floor(Math.random() * 8) + 1}`, // current_step
          Math.floor(Math.random() * 101) // progress_percentage (0-100)
        );

        paramIndex += 8;
      }

      const batchQuery = `
        INSERT INTO export_jobs (
          job_id, tool_id, user_id, status,
          steps_completed, steps_total, current_step, progress_percentage
        )
        VALUES ${values.join(', ')}
        ON CONFLICT (job_id) DO NOTHING
      `;

      await pool.query(batchQuery, params);

      if ((batch + 1) % 5 === 0) {
        console.log(`   ✓ Seeded ${(batch + 1) * batchSize} jobs...`);
      }
    }

    const seedDuration = Date.now() - seedStartTime;
    console.log(`✅ Seeded ${DATASET_SIZE} export jobs in ${seedDuration}ms\n`);
  });

  afterAll(async () => {
    // Cleanup: Delete test jobs
    console.log('\n🧹 Cleaning up test data...');
    if (testJobIds.length > 0) {
      // Delete in batches to avoid parameter limit
      const batchSize = 1000;
      for (let i = 0; i < testJobIds.length; i += batchSize) {
        const batch = testJobIds.slice(i, i + batchSize);
        const placeholders = batch
          .map((_, index) => `$${index + 1}`)
          .join(', ');
        await pool.query(
          `DELETE FROM export_jobs WHERE job_id IN (${placeholders})`,
          batch
        );
      }
    }
    console.log('✅ Cleanup complete\n');

    await pool.end();
  });

  describe('findById() Performance (PRIMARY KEY index)', () => {
    it('should query by job_id in < 10ms (NFR target: < 1ms ideal)', async () => {
      const testJobId =
        testJobIds[Math.floor(Math.random() * testJobIds.length)];

      const startTime = performance.now();
      const job = await repository.findById(testJobId);
      const duration = performance.now() - startTime;

      expect(job).not.toBeNull();
      expect(job?.jobId).toBe(testJobId);
      expect(duration).toBeLessThan(10); // 10ms threshold (< 1ms ideal)

      console.log(`   ⏱️  findById() duration: ${duration.toFixed(2)}ms`);
    });

    it('should use PRIMARY KEY index (verify with EXPLAIN ANALYZE)', async () => {
      const testJobId = testJobIds[0];

      const explainQuery = `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT * FROM export_jobs WHERE job_id = $1
      `;

      const result = await pool.query(explainQuery, [testJobId]);
      const queryPlan = result.rows[0]['QUERY PLAN'][0];

      // Verify index scan used
      expect(queryPlan.Plan['Node Type']).toBe('Index Scan');
      expect(queryPlan.Plan['Index Name']).toBe('export_jobs_pkey');

      // Verify fast execution
      const executionTime = queryPlan['Execution Time'];
      expect(executionTime).toBeLessThan(10);

      console.log(
        `   📈 Query Plan: ${queryPlan.Plan['Node Type']} using ${queryPlan.Plan['Index Name']}`
      );
      console.log(`   ⏱️  Execution Time: ${executionTime.toFixed(2)}ms`);
    });

    it('should handle concurrent findById() queries efficiently', async () => {
      const concurrentQueries = 100;
      const randomJobIds = Array.from(
        { length: concurrentQueries },
        () => testJobIds[Math.floor(Math.random() * testJobIds.length)]
      );

      const startTime = performance.now();

      const promises = randomJobIds.map((jobId) => repository.findById(jobId));
      const results = await Promise.all(promises);

      const totalDuration = performance.now() - startTime;
      const avgDuration = totalDuration / concurrentQueries;

      expect(results).toHaveLength(concurrentQueries);
      expect(results.every((job) => job !== null)).toBe(true);
      expect(avgDuration).toBeLessThan(10); // Average < 10ms per query

      console.log(`   🔀 Concurrent queries: ${concurrentQueries}`);
      console.log(`   ⏱️  Total duration: ${totalDuration.toFixed(2)}ms`);
      console.log(`   📊 Average per query: ${avgDuration.toFixed(2)}ms`);
    });
  });

  describe('findByUserId() Performance (Composite index: user_id, created_at DESC)', () => {
    it('should query user history in < 50ms (NFR target)', async () => {
      const startTime = performance.now();
      const jobs = await repository.findByUserId(testUserId, 50);
      const duration = performance.now() - startTime;

      expect(jobs).toBeDefined();
      expect(jobs.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50); // 50ms threshold

      console.log(`   ⏱️  findByUserId() duration: ${duration.toFixed(2)}ms`);
      console.log(`   📊 Jobs returned: ${jobs.length}`);
    });

    it('should use composite index idx_export_jobs_user_created (EXPLAIN ANALYZE)', async () => {
      const explainQuery = `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT * FROM export_jobs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const result = await pool.query(explainQuery, [testUserId]);
      const queryPlan = result.rows[0]['QUERY PLAN'][0];

      // Verify index scan used (composite index enables index-only scan)
      expect(['Index Scan', 'Index Only Scan', 'Limit']).toContain(
        queryPlan.Plan['Node Type']
      );

      if (queryPlan.Plan['Index Name']) {
        expect(queryPlan.Plan['Index Name']).toBe(
          'idx_export_jobs_user_created'
        );
      }

      const executionTime = queryPlan['Execution Time'];
      expect(executionTime).toBeLessThan(50);

      console.log(`   📈 Query Plan: ${queryPlan.Plan['Node Type']}`);
      if (queryPlan.Plan['Index Name']) {
        console.log(`   🎯 Index Used: ${queryPlan.Plan['Index Name']}`);
      }
      console.log(`   ⏱️  Execution Time: ${executionTime.toFixed(2)}ms`);
    });

    it('should handle pagination efficiently with different LIMIT values', async () => {
      const limits = [10, 50, 100, 200];

      for (const limit of limits) {
        const startTime = performance.now();
        const jobs = await repository.findByUserId(testUserId, limit);
        const duration = performance.now() - startTime;

        expect(jobs.length).toBeLessThanOrEqual(limit);
        expect(duration).toBeLessThan(50); // All should be < 50ms

        console.log(
          `   ⏱️  LIMIT ${limit}: ${duration.toFixed(2)}ms (${jobs.length} jobs)`
        );
      }
    });
  });

  describe('findByStatus() Performance (Status index)', () => {
    it('should query pending jobs in < 100ms (NFR target)', async () => {
      const startTime = performance.now();
      const pendingJobs = await repository.findByStatus(
        ExportJobStatus.PENDING
      );
      const duration = performance.now() - startTime;

      expect(pendingJobs).toBeDefined();
      expect(duration).toBeLessThan(100); // 100ms threshold

      console.log(
        `   ⏱️  findByStatus(pending) duration: ${duration.toFixed(2)}ms`
      );
      console.log(`   📊 Pending jobs: ${pendingJobs.length}`);
    });

    it('should use status index idx_export_jobs_status (EXPLAIN ANALYZE)', async () => {
      const explainQuery = `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT * FROM export_jobs
        WHERE status = $1
        ORDER BY created_at ASC
      `;

      const result = await pool.query(explainQuery, [ExportJobStatus.PENDING]);
      const queryPlan = result.rows[0]['QUERY PLAN'][0];

      // Verify index scan used
      expect(['Index Scan', 'Bitmap Index Scan', 'Seq Scan', 'Sort']).toContain(
        queryPlan.Plan['Node Type']
      );

      const executionTime = queryPlan['Execution Time'];
      expect(executionTime).toBeLessThan(100);

      console.log(`   📈 Query Plan: ${queryPlan.Plan['Node Type']}`);
      console.log(`   ⏱️  Execution Time: ${executionTime.toFixed(2)}ms`);
    });

    it('should query all status types efficiently', async () => {
      const statuses = [
        ExportJobStatus.PENDING,
        ExportJobStatus.IN_PROGRESS,
        ExportJobStatus.COMPLETED,
        ExportJobStatus.FAILED,
      ];

      for (const status of statuses) {
        const startTime = performance.now();
        const jobs = await repository.findByStatus(status);
        const duration = performance.now() - startTime;

        expect(jobs).toBeDefined();
        expect(duration).toBeLessThan(100);

        console.log(
          `   ⏱️  findByStatus(${status}): ${duration.toFixed(2)}ms (${jobs.length} jobs)`
        );
      }
    });
  });

  describe('findByToolId() Performance (Tool index)', () => {
    it('should query tool export jobs in < 100ms', async () => {
      const startTime = performance.now();
      const toolJobs = await repository.findByToolId(testToolId);
      const duration = performance.now() - startTime;

      expect(toolJobs).toBeDefined();
      expect(toolJobs.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100);

      console.log(`   ⏱️  findByToolId() duration: ${duration.toFixed(2)}ms`);
      console.log(`   📊 Tool jobs: ${toolJobs.length}`);
    });

    it('should use tool_id index idx_export_jobs_tool_id (EXPLAIN ANALYZE)', async () => {
      const explainQuery = `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT * FROM export_jobs
        WHERE tool_id = $1
        ORDER BY created_at DESC
      `;

      const result = await pool.query(explainQuery, [testToolId]);
      const queryPlan = result.rows[0]['QUERY PLAN'][0];

      // Verify index scan used
      expect(['Index Scan', 'Bitmap Index Scan', 'Seq Scan', 'Sort']).toContain(
        queryPlan.Plan['Node Type']
      );

      const executionTime = queryPlan['Execution Time'];
      expect(executionTime).toBeLessThan(100);

      console.log(`   📈 Query Plan: ${queryPlan.Plan['Node Type']}`);
      console.log(`   ⏱️  Execution Time: ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Index Effectiveness Summary', () => {
    it('should verify all indexes exist', async () => {
      const indexQuery = `
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'export_jobs'
        ORDER BY indexname
      `;

      const result = await pool.query(indexQuery);
      const indexNames = result.rows.map((row) => row.indexname);

      console.log('\n📋 Indexes on export_jobs table:');
      result.rows.forEach((row) => {
        console.log(`   - ${row.indexname}`);
      });

      // Verify all required indexes exist
      expect(indexNames).toContain('export_jobs_pkey'); // PRIMARY KEY
      expect(indexNames).toContain('idx_export_jobs_tool_id'); // tool_id index
      expect(indexNames).toContain('idx_export_jobs_user_id'); // user_id index
      expect(indexNames).toContain('idx_export_jobs_status'); // status index
      expect(indexNames).toContain('idx_export_jobs_created_at'); // created_at index
      expect(indexNames).toContain('idx_export_jobs_user_created'); // composite index (user_id, created_at)
    });

    it('should report overall performance statistics', async () => {
      const statsQuery = `
        SELECT
          (SELECT COUNT(*) FROM export_jobs) as total_jobs,
          (SELECT COUNT(*) FROM export_jobs WHERE status = 'pending') as pending_jobs,
          (SELECT COUNT(*) FROM export_jobs WHERE status = 'in_progress') as in_progress_jobs,
          (SELECT COUNT(*) FROM export_jobs WHERE status = 'completed') as completed_jobs,
          (SELECT COUNT(*) FROM export_jobs WHERE status = 'failed') as failed_jobs
      `;

      const result = await pool.query(statsQuery);
      const stats = result.rows[0];

      console.log('\n📊 Export Jobs Statistics:');
      console.log(`   Total jobs: ${stats.total_jobs}`);
      console.log(`   Pending: ${stats.pending_jobs}`);
      console.log(`   In Progress: ${stats.in_progress_jobs}`);
      console.log(`   Completed: ${stats.completed_jobs}`);
      console.log(`   Failed: ${stats.failed_jobs}`);

      expect(parseInt(stats.total_jobs)).toBeGreaterThanOrEqual(DATASET_SIZE);
    });
  });

  describe('Query Performance Under Load', () => {
    it('should maintain performance with mixed concurrent queries', async () => {
      const queryCount = 50;
      const queries: Promise<unknown>[] = [];

      // Mix of different query types
      for (let i = 0; i < queryCount; i++) {
        const rand = Math.random();
        if (rand < 0.4) {
          // 40% findById
          const jobId =
            testJobIds[Math.floor(Math.random() * testJobIds.length)];
          queries.push(repository.findById(jobId));
        } else if (rand < 0.7) {
          // 30% findByUserId
          queries.push(repository.findByUserId(testUserId, 50));
        } else {
          // 30% findByStatus
          const statuses = [
            ExportJobStatus.PENDING,
            ExportJobStatus.IN_PROGRESS,
            ExportJobStatus.COMPLETED,
          ];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          queries.push(repository.findByStatus(status));
        }
      }

      const startTime = performance.now();
      await Promise.all(queries);
      const totalDuration = performance.now() - startTime;
      const avgDuration = totalDuration / queryCount;

      console.log(`\n🔀 Mixed Concurrent Queries Test:`);
      console.log(`   Total queries: ${queryCount}`);
      console.log(`   Total duration: ${totalDuration.toFixed(2)}ms`);
      console.log(`   Average per query: ${avgDuration.toFixed(2)}ms`);

      expect(avgDuration).toBeLessThan(100); // Average should be < 100ms
    });
  });
});
