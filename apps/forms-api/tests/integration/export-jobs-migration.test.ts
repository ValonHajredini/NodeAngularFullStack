/**
 * @fileoverview Integration tests for export_jobs table migration
 * Tests schema structure, indexes, constraints, and foreign keys
 * Epic 33.1: Export Core Infrastructure
 * Story 33.1.2: Export Jobs Database Schema (Task 9)
 */

import { databaseService } from '../../src/services/database.service';
import crypto from 'crypto';

describe('Export Jobs Migration Tests', () => {
  // Database is initialized by global test setup (tests/helpers/test-setup.ts)

  describe('Table Structure', () => {
    it('should have export_jobs table created', async () => {
      const result = await databaseService.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'export_jobs'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].table_name).toBe('export_jobs');
    });

    it('should have all required columns with correct types', async () => {
      const result = await databaseService.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'export_jobs'
        ORDER BY ordinal_position
      `);

      const columns = result.rows;
      const expectedColumns = [
        { column_name: 'job_id', data_type: 'uuid', is_nullable: 'NO' },
        { column_name: 'tool_id', data_type: 'uuid', is_nullable: 'NO' },
        { column_name: 'user_id', data_type: 'uuid', is_nullable: 'YES' },
        { column_name: 'status', data_type: 'USER-DEFINED', is_nullable: 'NO' }, // ENUM type
        {
          column_name: 'steps_completed',
          data_type: 'integer',
          is_nullable: 'NO',
        },
        { column_name: 'steps_total', data_type: 'integer', is_nullable: 'NO' },
        {
          column_name: 'current_step',
          data_type: 'character varying',
          is_nullable: 'YES',
        },
        {
          column_name: 'progress_percentage',
          data_type: 'integer',
          is_nullable: 'NO',
        },
        {
          column_name: 'package_path',
          data_type: 'character varying',
          is_nullable: 'YES',
        },
        {
          column_name: 'package_size_bytes',
          data_type: 'bigint',
          is_nullable: 'YES',
        },
        { column_name: 'error_message', data_type: 'text', is_nullable: 'YES' },
        {
          column_name: 'created_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'NO',
        },
        {
          column_name: 'updated_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'NO',
        },
        {
          column_name: 'started_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'YES',
        },
        {
          column_name: 'completed_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'YES',
        },
      ];

      expectedColumns.forEach((expectedCol) => {
        const foundCol = columns.find(
          (col) => col.column_name === expectedCol.column_name
        );
        expect(foundCol).toBeDefined();
        expect(foundCol?.data_type).toBe(expectedCol.data_type);
        expect(foundCol?.is_nullable).toBe(expectedCol.is_nullable);
      });
    });

    it('should have proper default values for columns', async () => {
      const result = await databaseService.query(`
        SELECT column_name, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'export_jobs'
        AND column_default IS NOT NULL
      `);

      const defaults = result.rows.reduce(
        (acc: Record<string, string>, row) => {
          acc[row.column_name] = row.column_default;
          return acc;
        },
        {}
      );

      // Check UUID generation for job_id (PostgreSQL 14+ uses gen_random_uuid)
      expect(defaults['job_id']).toMatch(/uuid_generate_v4|gen_random_uuid/);

      // Check default values
      expect(defaults['status']).toContain('pending');
      expect(defaults['steps_completed']).toContain('0');
      expect(defaults['steps_total']).toContain('0');
      expect(defaults['progress_percentage']).toContain('0');
      expect(defaults['created_at']).toContain('now()');
      expect(defaults['updated_at']).toContain('now()');
    });

    it('should have table and column comments', async () => {
      // Check table comment
      const tableComment = await databaseService.query(`
        SELECT obj_description('export_jobs'::regclass, 'pg_class') AS table_comment
      `);

      expect(tableComment.rows[0].table_comment).toBe(
        'Tracks export job lifecycle and progress for tool exports'
      );

      // Check specific column comments
      const columnComments = await databaseService.query(`
        SELECT
          a.attname AS column_name,
          col_description('export_jobs'::regclass, a.attnum) AS column_comment
        FROM pg_attribute a
        WHERE a.attrelid = 'export_jobs'::regclass
        AND a.attnum > 0
        AND NOT a.attisdropped
        AND col_description('export_jobs'::regclass, a.attnum) IS NOT NULL
        ORDER BY a.attnum
      `);

      expect(columnComments.rows.length).toBeGreaterThan(0);

      // Verify specific critical column comments
      const jobIdComment = columnComments.rows.find(
        (r) => r.column_name === 'job_id'
      );
      expect(jobIdComment?.column_comment).toContain(
        'Unique export job identifier'
      );

      const statusComment = columnComments.rows.find(
        (r) => r.column_name === 'status'
      );
      expect(statusComment?.column_comment).toContain('Current job status');
    });
  });

  describe('Indexes', () => {
    it('should have all required indexes created', async () => {
      const result = await databaseService.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'export_jobs'
        AND schemaname = 'public'
      `);

      const indexNames = result.rows.map((row) => row.indexname);

      // Primary key
      expect(indexNames).toContain('export_jobs_pkey');

      // Performance indexes
      expect(indexNames).toContain('idx_export_jobs_tool_id');
      expect(indexNames).toContain('idx_export_jobs_user_id');
      expect(indexNames).toContain('idx_export_jobs_status');
      expect(indexNames).toContain('idx_export_jobs_created_at');
      expect(indexNames).toContain('idx_export_jobs_user_created');
    });

    it('should have composite index (user_id, created_at DESC) for sorted history queries', async () => {
      const result = await databaseService.query(`
        SELECT indexdef
        FROM pg_indexes
        WHERE tablename = 'export_jobs'
        AND indexname = 'idx_export_jobs_user_created'
      `);

      expect(result.rows.length).toBe(1);
      const indexDef = result.rows[0].indexdef.toLowerCase();
      expect(indexDef).toContain('user_id');
      expect(indexDef).toContain('created_at');
      expect(indexDef).toContain('desc');
    });
  });

  describe('Constraints', () => {
    it('should have NOT NULL constraints on required fields', async () => {
      const result = await databaseService.query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'export_jobs'
        AND is_nullable = 'NO'
      `);

      const notNullColumns = result.rows.map((row) => row.column_name);

      // Verify required fields
      expect(notNullColumns).toContain('job_id');
      expect(notNullColumns).toContain('tool_id');
      expect(notNullColumns).toContain('status');
      expect(notNullColumns).toContain('steps_completed');
      expect(notNullColumns).toContain('steps_total');
      expect(notNullColumns).toContain('progress_percentage');
      expect(notNullColumns).toContain('created_at');
      expect(notNullColumns).toContain('updated_at');
    });

    it('should have CHECK constraint for status enum values', async () => {
      const result = await databaseService.query(`
        SELECT cc.constraint_name, cc.check_clause
        FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu
          ON cc.constraint_schema = ccu.constraint_schema
          AND cc.constraint_name = ccu.constraint_name
        WHERE cc.constraint_schema = 'public'
        AND ccu.table_name = 'export_jobs'
        AND ccu.column_name = 'status'
      `);

      expect(result.rows.length).toBeGreaterThan(0);

      const checkClause = result.rows[0].check_clause.toLowerCase();
      expect(checkClause).toContain('pending');
      expect(checkClause).toContain('in_progress');
      expect(checkClause).toContain('completed');
      expect(checkClause).toContain('failed');
      expect(checkClause).toContain('cancelled');
      expect(checkClause).toContain('cancelling');
      expect(checkClause).toContain('rolled_back');
    });

    it.skip('should have CHECK constraint for steps_completed <= steps_total', async () => {
      const result = await databaseService.query(`
        SELECT cc.constraint_name, cc.check_clause
        FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_table_usage ctu
          ON cc.constraint_schema = ctu.constraint_schema
          AND cc.constraint_name = ctu.constraint_name
        WHERE cc.constraint_schema = 'public'
        AND ctu.table_name = 'export_jobs'
        AND cc.check_clause LIKE '%steps%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);

      const checkClause = result.rows[0].check_clause.toLowerCase();
      expect(checkClause).toContain('steps_completed');
      expect(checkClause).toContain('steps_total');
      expect(checkClause).toMatch(/<=|less than or equal/);
    });

    it.skip('should have CHECK constraint for progress_percentage BETWEEN 0 AND 100', async () => {
      const result = await databaseService.query(`
        SELECT cc.constraint_name, cc.check_clause
        FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_table_usage ctu
          ON cc.constraint_schema = ctu.constraint_schema
          AND cc.constraint_name = ctu.constraint_name
        WHERE cc.constraint_schema = 'public'
        AND ctu.table_name = 'export_jobs'
        AND cc.check_clause LIKE '%progress%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);

      const checkClause = result.rows[0].check_clause.toLowerCase();
      expect(checkClause).toContain('progress_percentage');
      expect(checkClause).toMatch(/0\D.*100|between/);
    });

    it.skip('should have CHECK constraint for package_size_bytes >= 0', async () => {
      const result = await databaseService.query(`
        SELECT cc.constraint_name, cc.check_clause
        FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_table_usage ctu
          ON cc.constraint_schema = ctu.constraint_schema
          AND cc.constraint_name = ctu.constraint_name
        WHERE cc.constraint_schema = 'public'
        AND ctu.table_name = 'export_jobs'
        AND cc.check_clause LIKE '%package_size%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);

      const checkClause = result.rows[0].check_clause.toLowerCase();
      expect(checkClause).toContain('package_size_bytes');
      expect(checkClause).toMatch(/>=|greater than or equal/);
    });

    it('should enforce status enum constraint', async () => {
      // Attempt to insert invalid status should fail
      await expect(
        databaseService.query(`
          INSERT INTO export_jobs (tool_id, user_id, status)
          VALUES (
            (SELECT tool_id FROM tool_registry LIMIT 1),
            (SELECT id FROM users LIMIT 1),
            'invalid_status'
          )
        `)
      ).rejects.toThrow();
    });

    it('should enforce steps_completed <= steps_total constraint', async () => {
      // Attempt to insert steps_completed > steps_total should fail
      await expect(
        databaseService.query(`
          INSERT INTO export_jobs (tool_id, user_id, status, steps_completed, steps_total)
          VALUES (
            (SELECT tool_id FROM tool_registry LIMIT 1),
            (SELECT id FROM users LIMIT 1),
            'pending',
            10,
            5
          )
        `)
      ).rejects.toThrow();
    });

    it('should enforce progress_percentage range (0-100) constraint', async () => {
      // Attempt to insert progress_percentage > 100 should fail
      await expect(
        databaseService.query(`
          INSERT INTO export_jobs (tool_id, user_id, status, progress_percentage)
          VALUES (
            (SELECT tool_id FROM tool_registry LIMIT 1),
            (SELECT id FROM users LIMIT 1),
            'pending',
            150
          )
        `)
      ).rejects.toThrow();
    });
  });

  describe('Foreign Keys', () => {
    it('should have foreign key constraint on tool_id with CASCADE delete', async () => {
      const result = await databaseService.query(`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'export_jobs'
        AND kcu.column_name = 'tool_id'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].foreign_table_name).toBe('tool_registry');
      // tool_registry primary key column might be 'tool_id' or 'id'
      expect(['tool_id', 'id']).toContain(result.rows[0].foreign_column_name);
      expect(result.rows[0].delete_rule).toBe('CASCADE');
    });

    it('should have foreign key constraint on user_id with SET NULL delete', async () => {
      const result = await databaseService.query(`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'export_jobs'
        AND kcu.column_name = 'user_id'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].foreign_table_name).toBe('users');
      expect(result.rows[0].foreign_column_name).toBe('id');
      expect(result.rows[0].delete_rule).toBe('SET NULL');
    });
  });

  describe('Data Operations', () => {
    let testToolId: string;
    let testUserId: string;

    beforeAll(async () => {
      // Get existing tool id (UUID) and user id for test data
      // NOTE: export_jobs.tool_id references tool_registry.id (UUID), not tool_registry.tool_id (string)
      const toolResult = await databaseService.query(`
        SELECT id FROM tool_registry LIMIT 1
      `);

      // Skip data operation tests if no seed data available
      if (toolResult.rows.length === 0) {
        console.warn(
          '⚠️  Skipping data operation tests - no tool_registry seed data'
        );
        return;
      }

      testToolId = toolResult.rows[0].id;

      const userResult = await databaseService.query(`
        SELECT id FROM users LIMIT 1
      `);
      testUserId = userResult.rows[0].id;
    });

    afterEach(async () => {
      // Clean up test data (cast UUID to TEXT for LIKE operator)
      await databaseService.query(
        `DELETE FROM export_jobs WHERE job_id::text LIKE 'test-%'`
      );
    });

    it('should insert a complete export job record successfully', async () => {
      if (!testToolId || !testUserId) {
        console.warn('⚠️  Skipping - no seed data available');
        return;
      }

      const testJobId = crypto.randomUUID();
      const result = await databaseService.query(
        `
        INSERT INTO export_jobs (
          job_id, tool_id, user_id, status, steps_completed, steps_total,
          current_step, progress_percentage, package_path, package_size_bytes
        ) VALUES (
          $1,
          $2,
          $3,
          'in_progress',
          3,
          8,
          'Generating boilerplate...',
          37,
          '/exports/test-job.tar.gz',
          2048000
        )
        RETURNING *
      `,
        [testJobId, testToolId, testUserId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].job_id).toBe(testJobId);
      expect(result.rows[0].status).toBe('in_progress');
      expect(result.rows[0].steps_completed).toBe(3);
      expect(result.rows[0].progress_percentage).toBe(37);
      expect(result.rows[0].package_path).toBe('/exports/test-job.tar.gz');
      expect(parseInt(result.rows[0].package_size_bytes, 10)).toBe(2048000);
    });

    it('should insert minimal export job record with defaults', async () => {
      if (!testToolId || !testUserId) {
        console.warn('⚠️  Skipping - no seed data available');
        return;
      }

      const testJobId = crypto.randomUUID();
      const result = await databaseService.query(
        `
        INSERT INTO export_jobs (job_id, tool_id, user_id, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING *
      `,
        [testJobId, testToolId, testUserId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].job_id).toBe(testJobId);
      expect(result.rows[0].status).toBe('pending');
      expect(result.rows[0].steps_completed).toBe(0); // default value
      expect(result.rows[0].steps_total).toBe(0); // default value
      expect(result.rows[0].progress_percentage).toBe(0); // default value
      expect(result.rows[0].created_at).toBeDefined();
      expect(result.rows[0].updated_at).toBeDefined();
    });

    it('should query export jobs by status', async () => {
      if (!testToolId || !testUserId) {
        console.warn('⚠️  Skipping - no seed data available');
        return;
      }

      // Insert test jobs with different statuses
      const testJobIds = [
        crypto.randomUUID(),
        crypto.randomUUID(),
        crypto.randomUUID(),
      ];
      await databaseService.query(
        `
        INSERT INTO export_jobs (job_id, tool_id, user_id, status)
        VALUES
          ($1, $4, $5, 'pending'),
          ($2, $4, $5, 'in_progress'),
          ($3, $4, $5, 'completed')
      `,
        [...testJobIds, testToolId, testUserId]
      );

      // Query in_progress jobs
      const result = await databaseService.query(
        `
        SELECT job_id, status FROM export_jobs WHERE status = 'in_progress' AND job_id = $1
      `,
        [testJobIds[1]]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].status).toBe('in_progress');
    });

    it('should query export jobs by user_id', async () => {
      if (!testToolId || !testUserId) {
        console.warn('⚠️  Skipping - no seed data available');
        return;
      }

      const testJobId = crypto.randomUUID();
      await databaseService.query(
        `
        INSERT INTO export_jobs (job_id, tool_id, user_id, status)
        VALUES ($1, $2, $3, 'pending')
      `,
        [testJobId, testToolId, testUserId]
      );

      const result = await databaseService.query(
        `
        SELECT job_id, user_id FROM export_jobs WHERE user_id = $1 AND job_id = $2
      `,
        [testUserId, testJobId]
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
      expect(result.rows[0].user_id).toBe(testUserId);
    });

    it('should handle null user_id when user deleted (SET NULL cascade)', async () => {
      if (!testToolId) {
        console.warn('⚠️  Skipping - no seed data available');
        return;
      }

      const testJobId = crypto.randomUUID();
      const result = await databaseService.query(
        `
        INSERT INTO export_jobs (job_id, tool_id, user_id, status)
        VALUES ($1, $2, NULL, 'completed')
        RETURNING *
      `,
        [testJobId, testToolId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].user_id).toBeNull();
    });

    it('should update export job progress', async () => {
      if (!testToolId || !testUserId) {
        console.warn('⚠️  Skipping - no seed data available');
        return;
      }

      // Insert test job
      const testJobId = crypto.randomUUID();
      await databaseService.query(
        `
        INSERT INTO export_jobs (job_id, tool_id, user_id, status, steps_completed, steps_total)
        VALUES ($1, $2, $3, 'in_progress', 2, 8)
      `,
        [testJobId, testToolId, testUserId]
      );

      // Update job progress
      const result = await databaseService.query(
        `
        UPDATE export_jobs
        SET steps_completed = 5, progress_percentage = 62, current_step = 'Packaging files...'
        WHERE job_id = $1
        RETURNING *
      `,
        [testJobId]
      );

      expect(result.rows[0].steps_completed).toBe(5);
      expect(result.rows[0].progress_percentage).toBe(62);
      expect(result.rows[0].current_step).toBe('Packaging files...');
    });

    it('should handle completed export job with package info', async () => {
      if (!testToolId || !testUserId) {
        console.warn('⚠️  Skipping - no seed data available');
        return;
      }

      const testJobId = crypto.randomUUID();
      const result = await databaseService.query(
        `
        INSERT INTO export_jobs (
          job_id, tool_id, user_id, status, steps_completed, steps_total,
          progress_percentage, package_path, package_size_bytes, completed_at
        ) VALUES (
          $1,
          $2,
          $3,
          'completed',
          8,
          8,
          100,
          '/exports/forms-export-2025-01-01.tar.gz',
          5242880,
          NOW()
        )
        RETURNING *
      `,
        [testJobId, testToolId, testUserId]
      );

      expect(result.rows[0].status).toBe('completed');
      expect(result.rows[0].progress_percentage).toBe(100);
      expect(result.rows[0].package_path).toBeDefined();
      expect(result.rows[0].completed_at).toBeDefined();
    });

    it('should handle failed export job with error message', async () => {
      if (!testToolId || !testUserId) {
        console.warn('⚠️  Skipping - no seed data available');
        return;
      }

      const testJobId = crypto.randomUUID();
      const result = await databaseService.query(
        `
        INSERT INTO export_jobs (
          job_id, tool_id, user_id, status, error_message
        ) VALUES (
          $1,
          $2,
          $3,
          'failed',
          'Database connection timeout during export'
        )
        RETURNING *
      `,
        [testJobId, testToolId, testUserId]
      );

      expect(result.rows[0].status).toBe('failed');
      expect(result.rows[0].error_message).toBe(
        'Database connection timeout during export'
      );
    });
  });
});
