/**
 * @fileoverview Integration tests for tool_registry table migration
 * Tests schema structure, indexes, constraints, and triggers
 * Epic 30: Tool Registration and Export System
 * Story 30.1.1: Tool Registry Database Schema
 */

import { databaseService } from '../../src/services/database.service';

describe('Tool Registry Migration Tests', () => {
  // Database is initialized by global test setup (tests/helpers/test-setup.ts)

  describe('Table Structure', () => {
    it('should have tool_registry table created', async () => {
      const result = await databaseService.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'tool_registry'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].table_name).toBe('tool_registry');
    });

    it('should have all required columns with correct types', async () => {
      const result = await databaseService.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tool_registry'
        ORDER BY ordinal_position
      `);

      const columns = result.rows;
      const expectedColumns = [
        { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
        {
          column_name: 'tool_id',
          data_type: 'character varying',
          is_nullable: 'NO',
        },
        {
          column_name: 'name',
          data_type: 'character varying',
          is_nullable: 'NO',
        },
        { column_name: 'description', data_type: 'text', is_nullable: 'YES' },
        {
          column_name: 'version',
          data_type: 'character varying',
          is_nullable: 'NO',
        },
        {
          column_name: 'icon',
          data_type: 'character varying',
          is_nullable: 'YES',
        },
        {
          column_name: 'route',
          data_type: 'character varying',
          is_nullable: 'NO',
        },
        {
          column_name: 'api_base',
          data_type: 'character varying',
          is_nullable: 'NO',
        },
        { column_name: 'permissions', data_type: 'ARRAY', is_nullable: 'YES' },
        {
          column_name: 'status',
          data_type: 'character varying',
          is_nullable: 'YES',
        },
        {
          column_name: 'is_exported',
          data_type: 'boolean',
          is_nullable: 'YES',
        },
        {
          column_name: 'exported_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'YES',
        },
        {
          column_name: 'service_url',
          data_type: 'character varying',
          is_nullable: 'YES',
        },
        {
          column_name: 'database_name',
          data_type: 'character varying',
          is_nullable: 'YES',
        },
        {
          column_name: 'manifest_json',
          data_type: 'jsonb',
          is_nullable: 'YES',
        },
        {
          column_name: 'created_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'YES',
        },
        {
          column_name: 'updated_at',
          data_type: 'timestamp with time zone',
          is_nullable: 'YES',
        },
        { column_name: 'created_by', data_type: 'uuid', is_nullable: 'YES' },
      ];

      expectedColumns.forEach((expectedCol) => {
        const foundCol = columns.find(
          (col) => col.column_name === expectedCol.column_name
        );
        expect(foundCol).toBeDefined();
        expect(foundCol?.is_nullable).toBe(expectedCol.is_nullable);

        // Special handling for ARRAY type
        if (expectedCol.data_type === 'ARRAY') {
          expect(foundCol?.data_type).toBe('ARRAY');
        } else {
          expect(foundCol?.data_type).toBe(expectedCol.data_type);
        }
      });
    });

    it('should have proper default values for columns', async () => {
      const result = await databaseService.query(`
        SELECT column_name, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tool_registry'
        AND column_default IS NOT NULL
      `);

      const defaults = result.rows.reduce(
        (acc: Record<string, string>, row) => {
          acc[row.column_name] = row.column_default;
          return acc;
        },
        {}
      );

      // Check UUID generation for id
      expect(defaults['id']).toContain('uuid_generate_v4');

      // Check default values
      expect(defaults['status']).toContain('beta');
      expect(defaults['is_exported']).toContain('false');
      expect(defaults['created_at']).toContain('CURRENT_TIMESTAMP');
      expect(defaults['updated_at']).toContain('CURRENT_TIMESTAMP');
    });

    it('should have table and column comments', async () => {
      // Check table comment
      const tableComment = await databaseService.query(`
        SELECT obj_description('tool_registry'::regclass, 'pg_class') AS table_comment
      `);

      expect(tableComment.rows[0].table_comment).toBe(
        'Tool metadata registry for tool discovery and lifecycle management'
      );

      // Check specific column comments
      const columnComments = await databaseService.query(`
        SELECT
          a.attname AS column_name,
          col_description('tool_registry'::regclass, a.attnum) AS column_comment
        FROM pg_attribute a
        WHERE a.attrelid = 'tool_registry'::regclass
        AND a.attnum > 0
        AND NOT a.attisdropped
        AND col_description('tool_registry'::regclass, a.attnum) IS NOT NULL
        ORDER BY a.attnum
      `);

      expect(columnComments.rows.length).toBeGreaterThan(0);

      // Verify specific critical column comments
      const toolIdComment = columnComments.rows.find(
        (r) => r.column_name === 'tool_id'
      );
      expect(toolIdComment?.column_comment).toContain('Unique tool identifier');

      const manifestComment = columnComments.rows.find(
        (r) => r.column_name === 'manifest_json'
      );
      expect(manifestComment?.column_comment).toContain(
        'Complete tool manifest as JSONB'
      );
    });
  });

  describe('Indexes', () => {
    it('should have all required indexes created', async () => {
      const result = await databaseService.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'tool_registry'
        AND schemaname = 'public'
      `);

      const indexNames = result.rows.map((row) => row.indexname);

      // Primary key
      expect(indexNames).toContain('tool_registry_pkey');

      // Unique constraint index
      expect(indexNames).toContain('tool_registry_tool_id_key');

      // Performance indexes
      expect(indexNames).toContain('idx_tool_registry_tool_id');
      expect(indexNames).toContain('idx_tool_registry_status');
      expect(indexNames).toContain('idx_tool_registry_is_exported');
      expect(indexNames).toContain('idx_tool_registry_created_at');
    });

    it('should have descending index on created_at for chronological queries', async () => {
      const result = await databaseService.query(`
        SELECT indexdef
        FROM pg_indexes
        WHERE tablename = 'tool_registry'
        AND indexname = 'idx_tool_registry_created_at'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].indexdef).toContain('DESC');
    });

    it('should have unique constraint on tool_id', async () => {
      const result = await databaseService.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'tool_registry'
        AND constraint_type = 'UNIQUE'
      `);

      const uniqueConstraints = result.rows.map((row) => row.constraint_name);
      expect(uniqueConstraints).toContain('tool_registry_tool_id_key');
    });
  });

  describe('Constraints', () => {
    it('should have NOT NULL constraints on required fields', async () => {
      const result = await databaseService.query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tool_registry'
        AND is_nullable = 'NO'
      `);

      const notNullColumns = result.rows.map((row) => row.column_name);

      // Verify required fields
      expect(notNullColumns).toContain('id');
      expect(notNullColumns).toContain('tool_id');
      expect(notNullColumns).toContain('name');
      expect(notNullColumns).toContain('version');
      expect(notNullColumns).toContain('route');
      expect(notNullColumns).toContain('api_base');
    });

    it('should have CHECK constraint for status enum values', async () => {
      const result = await databaseService.query(`
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_schema = 'public'
        AND constraint_name LIKE '%tool_registry%status%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);

      const checkClause = result.rows[0].check_clause.toLowerCase();
      expect(checkClause).toContain('beta');
      expect(checkClause).toContain('active');
      expect(checkClause).toContain('deprecated');
    });

    it('should enforce status enum constraint', async () => {
      // Attempt to insert invalid status should fail
      await expect(
        databaseService.query(`
          INSERT INTO tool_registry (tool_id, name, version, route, api_base, status)
          VALUES ('test-invalid-status', 'Test Tool', '1.0.0', '/test', '/api/test', 'invalid_status')
        `)
      ).rejects.toThrow();
    });

    it('should enforce unique tool_id constraint', async () => {
      // Insert a test tool
      await databaseService.query(`
        INSERT INTO tool_registry (tool_id, name, version, route, api_base)
        VALUES ('test-unique', 'Test Tool', '1.0.0', '/test', '/api/test')
      `);

      // Attempt to insert duplicate tool_id should fail
      await expect(
        databaseService.query(`
          INSERT INTO tool_registry (tool_id, name, version, route, api_base)
          VALUES ('test-unique', 'Another Tool', '2.0.0', '/another', '/api/another')
        `)
      ).rejects.toThrow();

      // Cleanup
      await databaseService.query(
        `DELETE FROM tool_registry WHERE tool_id = 'test-unique'`
      );
    });
  });

  describe('Foreign Keys', () => {
    it('should have foreign key constraint on created_by', async () => {
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
        AND tc.table_name = 'tool_registry'
        AND kcu.column_name = 'created_by'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].foreign_table_name).toBe('users');
      expect(result.rows[0].foreign_column_name).toBe('id');
      expect(result.rows[0].delete_rule).toBe('SET NULL');
    });
  });

  describe('Triggers', () => {
    it('should have updated_at trigger attached', async () => {
      const result = await databaseService.query(`
        SELECT trigger_name, event_manipulation, action_timing, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'tool_registry'
        AND trigger_schema = 'public'
      `);

      const updateTrigger = result.rows.find(
        (t) => t.trigger_name === 'trigger_tool_registry_updated_at'
      );
      expect(updateTrigger).toBeDefined();
      expect(updateTrigger?.event_manipulation).toBe('UPDATE');
      expect(updateTrigger?.action_timing).toBe('BEFORE');
      expect(updateTrigger?.action_statement).toContain(
        'update_updated_at_column'
      );
    });

    it('should auto-update updated_at timestamp on record update', async () => {
      // Insert test record
      const insertResult = await databaseService.query(`
        INSERT INTO tool_registry (tool_id, name, version, route, api_base, status)
        VALUES ('test-trigger', 'Test Tool', '1.0.0', '/test', '/api/test', 'beta')
        RETURNING id, created_at, updated_at
      `);

      const originalUpdatedAt = insertResult.rows[0].updated_at;

      // Wait 100ms to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Update the record
      const updateResult = await databaseService.query(`
        UPDATE tool_registry
        SET name = 'Updated Test Tool'
        WHERE tool_id = 'test-trigger'
        RETURNING updated_at
      `);

      const newUpdatedAt = updateResult.rows[0].updated_at;

      // Verify updated_at changed
      expect(new Date(newUpdatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );

      // Cleanup
      await databaseService.query(
        `DELETE FROM tool_registry WHERE tool_id = 'test-trigger'`
      );
    });
  });

  describe('Data Operations', () => {
    afterEach(async () => {
      // Clean up test data
      await databaseService.query(
        `DELETE FROM tool_registry WHERE tool_id LIKE 'test-%'`
      );
    });

    it('should insert a complete tool record successfully', async () => {
      const result = await databaseService.query(`
        INSERT INTO tool_registry (
          tool_id, name, description, version, icon, route, api_base,
          permissions, status, is_exported, manifest_json
        ) VALUES (
          'test-complete',
          'Test Complete Tool',
          'A comprehensive test tool',
          '1.0.0',
          '🛠️',
          '/tools/test',
          '/api/test',
          ARRAY['admin', 'user'],
          'active',
          false,
          '{"routes": {"primary": "/tools/test"}, "endpoints": {"base": "/api/test", "paths": ["/create", "/update"]}}'::jsonb
        )
        RETURNING *
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].tool_id).toBe('test-complete');
      expect(result.rows[0].name).toBe('Test Complete Tool');
      expect(result.rows[0].status).toBe('active');
      expect(result.rows[0].is_exported).toBe(false);
      expect(result.rows[0].manifest_json).toBeDefined();
      expect(result.rows[0].manifest_json.routes.primary).toBe('/tools/test');
    });

    it('should insert minimal tool record with defaults', async () => {
      const result = await databaseService.query(`
        INSERT INTO tool_registry (tool_id, name, version, route, api_base)
        VALUES ('test-minimal', 'Minimal Tool', '1.0.0', '/minimal', '/api/minimal')
        RETURNING *
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].tool_id).toBe('test-minimal');
      expect(result.rows[0].status).toBe('beta'); // default value
      expect(result.rows[0].is_exported).toBe(false); // default value
      expect(result.rows[0].created_at).toBeDefined();
      expect(result.rows[0].updated_at).toBeDefined();
    });

    it('should query tools by status', async () => {
      // Insert test tools with different statuses
      await databaseService.query(`
        INSERT INTO tool_registry (tool_id, name, version, route, api_base, status)
        VALUES
          ('test-beta', 'Beta Tool', '0.9.0', '/beta', '/api/beta', 'beta'),
          ('test-active', 'Active Tool', '1.0.0', '/active', '/api/active', 'active'),
          ('test-deprecated', 'Deprecated Tool', '0.1.0', '/deprecated', '/api/deprecated', 'deprecated')
      `);

      // Query active tools
      const activeResult = await databaseService.query(`
        SELECT tool_id, status FROM tool_registry WHERE status = 'active' AND tool_id LIKE 'test-%'
      `);

      expect(activeResult.rows.length).toBeGreaterThanOrEqual(1);
      expect(activeResult.rows[0].status).toBe('active');

      // Query by export status
      const exportedResult = await databaseService.query(`
        SELECT tool_id, is_exported FROM tool_registry WHERE is_exported = false AND tool_id LIKE 'test-%'
      `);

      expect(exportedResult.rows.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle JSONB manifest queries', async () => {
      await databaseService.query(`
        INSERT INTO tool_registry (tool_id, name, version, route, api_base, manifest_json)
        VALUES (
          'test-jsonb',
          'JSONB Test Tool',
          '1.0.0',
          '/jsonb',
          '/api/jsonb',
          '{"routes": {"primary": "/jsonb", "children": ["/sub1", "/sub2"]}, "config": {"feature": "enabled"}}'::jsonb
        )
      `);

      // Query JSONB field
      const result = await databaseService.query(`
        SELECT manifest_json FROM tool_registry WHERE tool_id = 'test-jsonb'
      `);

      expect(result.rows[0].manifest_json.routes.primary).toBe('/jsonb');
      expect(result.rows[0].manifest_json.routes.children).toHaveLength(2);
      expect(result.rows[0].manifest_json.config.feature).toBe('enabled');
    });
  });
});
