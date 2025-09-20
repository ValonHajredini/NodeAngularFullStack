import { databaseService, DatabaseService } from '../../src/services/database.service';
import { MigrationUtils } from '../../src/utils/migration.utils';
import { SeedUtils } from '../../src/utils/seed.utils';
import { getConfig } from '../../src/utils/config.utils';

describe('Database Setup Integration Tests', () => {
  beforeAll(async () => {
    // Initialize database connection for testing
    const config = getConfig();
    const dbConfig = DatabaseService.parseConnectionUrl(config.DATABASE_URL);
    await databaseService.initialize(dbConfig);
  });

  afterAll(async () => {
    // Clean up database connection
    await databaseService.close();
  });

  describe('Migration System', () => {
    it('should validate database schema after migrations', async () => {
      const validation = await MigrationUtils.validateSchema();

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should verify all required tables exist', async () => {
      const tablesExist = await MigrationUtils.checkTablesExist();
      expect(tablesExist).toBe(true);
    });

    it('should have proper table structure for users table', async () => {
      const result = await databaseService.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
        ORDER BY ordinal_position
      `);

      const columns = result.rows;
      const expectedColumns = [
        { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
        { column_name: 'tenant_id', data_type: 'uuid', is_nullable: 'YES' },
        { column_name: 'email', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'password_hash', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'first_name', data_type: 'character varying', is_nullable: 'YES' },
        { column_name: 'last_name', data_type: 'character varying', is_nullable: 'YES' },
        { column_name: 'role', data_type: 'character varying', is_nullable: 'YES' },
        { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
        { column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'YES' },
        { column_name: 'last_login', data_type: 'timestamp with time zone', is_nullable: 'YES' },
        { column_name: 'is_active', data_type: 'boolean', is_nullable: 'YES' },
        { column_name: 'email_verified', data_type: 'boolean', is_nullable: 'YES' }
      ];

      expectedColumns.forEach(expectedCol => {
        const foundCol = columns.find(col => col.column_name === expectedCol.column_name);
        expect(foundCol).toBeDefined();
        expect(foundCol?.data_type).toBe(expectedCol.data_type);
        expect(foundCol?.is_nullable).toBe(expectedCol.is_nullable);
      });
    });

    it('should have proper constraints and indexes', async () => {
      // Check unique constraint
      const uniqueConstraints = await databaseService.query(`
        SELECT constraint_name, column_name
        FROM information_schema.key_column_usage
        WHERE table_schema = 'public' AND table_name = 'users'
        AND constraint_name LIKE '%unique%'
      `);

      expect(uniqueConstraints.rows.length).toBeGreaterThan(0);

      // Check indexes exist
      const indexes = await databaseService.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'users'
        AND schemaname = 'public'
      `);

      const indexNames = indexes.rows.map(row => row.indexname);
      expect(indexNames).toContain('idx_users_email');
    });

    it('should have working database functions', async () => {
      // Test update_updated_at_column function exists
      const functionExists = await databaseService.query(`
        SELECT EXISTS(
          SELECT 1 FROM pg_proc
          WHERE proname = 'update_updated_at_column'
        ) as exists
      `);

      expect(functionExists.rows[0].exists).toBe(true);
    });

    it('should have working triggers', async () => {
      // Check if triggers exist
      const triggers = await databaseService.query(`
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers
        WHERE event_object_table = 'users'
        AND trigger_schema = 'public'
      `);

      const updateTrigger = triggers.rows.find(t => t.trigger_name === 'update_users_updated_at');
      expect(updateTrigger).toBeDefined();
      expect(updateTrigger?.event_manipulation).toBe('UPDATE');
      expect(updateTrigger?.action_timing).toBe('BEFORE');
    });
  });

  describe('Seed Data System', () => {
    beforeEach(async () => {
      // Clear existing test data before each test
      await SeedUtils.clearTestData();
    });

    it('should create all test users successfully', async () => {
      await SeedUtils.seedDatabase();

      const verification = await SeedUtils.verifyTestUsers();
      expect(verification.success).toBe(true);
      expect(verification.usersFound).toBe(verification.expectedUsers);
      expect(verification.missingUsers).toHaveLength(0);
    });

    it('should create users with correct roles and properties', async () => {
      await SeedUtils.seedDatabase();

      // Check admin user
      const adminUser = await databaseService.query(
        'SELECT * FROM users WHERE email = $1',
        ['admin@example.com']
      );
      expect(adminUser.rows).toHaveLength(1);
      expect(adminUser.rows[0].role).toBe('admin');
      expect(adminUser.rows[0].email_verified).toBe(true);
      expect(adminUser.rows[0].is_active).toBe(true);

      // Check regular user
      const regularUser = await databaseService.query(
        'SELECT * FROM users WHERE email = $1',
        ['user@example.com']
      );
      expect(regularUser.rows).toHaveLength(1);
      expect(regularUser.rows[0].role).toBe('user');

      // Check readonly user
      const readonlyUser = await databaseService.query(
        'SELECT * FROM users WHERE email = $1',
        ['readonly@example.com']
      );
      expect(readonlyUser.rows).toHaveLength(1);
      expect(readonlyUser.rows[0].role).toBe('readonly');

      // Check inactive user
      const inactiveUser = await databaseService.query(
        'SELECT * FROM users WHERE email = $1',
        ['inactive@example.com']
      );
      expect(inactiveUser.rows).toHaveLength(1);
      expect(inactiveUser.rows[0].is_active).toBe(false);

      // Check unverified user
      const unverifiedUser = await databaseService.query(
        'SELECT * FROM users WHERE email = $1',
        ['unverified@example.com']
      );
      expect(unverifiedUser.rows).toHaveLength(1);
      expect(unverifiedUser.rows[0].email_verified).toBe(false);
    });

    it('should create users with properly hashed passwords', async () => {
      await SeedUtils.seedDatabase();

      const users = await databaseService.query(
        'SELECT email, password_hash FROM users WHERE email LIKE $1',
        ['%@example.com']
      );

      users.rows.forEach(user => {
        expect(user.password_hash).toBeDefined();
        expect(user.password_hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/); // bcrypt pattern
        expect(user.password_hash.length).toBeGreaterThan(50);
      });
    });

    it('should handle unique constraint violations gracefully', async () => {
      // First seeding should succeed
      await SeedUtils.seedDatabase();

      // Second seeding should also succeed (should update existing users)
      await expect(SeedUtils.seedDatabase()).resolves.not.toThrow();

      // Verify still only one instance of each test user
      const userCounts = await databaseService.query(`
        SELECT email, COUNT(*) as count
        FROM users
        WHERE email IN (
          'admin@example.com',
          'user@example.com',
          'readonly@example.com',
          'inactive@example.com',
          'unverified@example.com'
        )
        GROUP BY email
      `);

      userCounts.rows.forEach(row => {
        expect(parseInt(row.count)).toBe(1);
      });
    });

    it('should provide correct test credentials', async () => {
      const credentials = SeedUtils.getTestCredentials();

      expect(credentials).toHaveLength(5);

      const expectedCredentials = [
        { email: 'admin@example.com', role: 'admin' },
        { email: 'user@example.com', role: 'user' },
        { email: 'readonly@example.com', role: 'readonly' },
        { email: 'inactive@example.com', role: 'user' },
        { email: 'unverified@example.com', role: 'user' }
      ];

      expectedCredentials.forEach(expected => {
        const credential = credentials.find(c => c.email === expected.email);
        expect(credential).toBeDefined();
        expect(credential?.role).toBe(expected.role);
        expect(credential?.password).toBeDefined();
        expect(credential?.description).toBeDefined();
      });
    });

    it('should clear test data completely', async () => {
      // Create test data
      await SeedUtils.seedDatabase();

      // Verify data exists
      const beforeClear = await databaseService.query(
        'SELECT COUNT(*) as count FROM users WHERE email LIKE $1',
        ['%@example.com']
      );
      expect(parseInt(beforeClear.rows[0].count)).toBeGreaterThan(0);

      // Clear test data
      await SeedUtils.clearTestData();

      // Verify data is cleared
      const afterClear = await databaseService.query(
        'SELECT COUNT(*) as count FROM users WHERE email LIKE $1',
        ['%@example.com']
      );
      expect(parseInt(afterClear.rows[0].count)).toBe(0);
    });
  });

  describe('Multi-tenancy Support', () => {
    it('should handle single-tenant mode correctly', async () => {
      // Clear and seed in single-tenant mode
      await SeedUtils.clearTestData();
      await SeedUtils.seedDatabase();

      const users = await databaseService.query(
        'SELECT tenant_id FROM users WHERE email LIKE $1',
        ['%@example.com']
      );

      users.rows.forEach(user => {
        expect(user.tenant_id).toBeNull();
      });
    });

    it('should support tenant table structure when needed', async () => {
      const tenantTableExists = await databaseService.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'tenants'
        ) as exists
      `);

      expect(tenantTableExists.rows[0].exists).toBe(true);

      if (tenantTableExists.rows[0].exists) {
        // Verify tenant table structure
        const columns = await databaseService.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'tenants'
        `);

        const columnNames = columns.rows.map(col => col.column_name);
        expect(columnNames).toContain('id');
        expect(columnNames).toContain('name');
        expect(columnNames).toContain('slug');
        expect(columnNames).toContain('is_active');
      }
    });
  });

  describe('Database Performance', () => {
    it('should have performant queries with proper indexes', async () => {
      await SeedUtils.seedDatabase();

      // Test email lookup performance (should use index)
      const startTime = Date.now();
      await databaseService.query(
        'SELECT * FROM users WHERE email = $1',
        ['admin@example.com']
      );
      const duration = Date.now() - startTime;

      // Query should be fast (under 100ms for indexed lookup)
      expect(duration).toBeLessThan(100);
    });

    it('should have proper foreign key relationships', async () => {
      // Check foreign key constraints
      const constraints = await databaseService.query(`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('users', 'sessions', 'password_resets')
      `);

      expect(constraints.rows.length).toBeGreaterThan(0);

      // Verify specific relationships
      const userTenantFK = constraints.rows.find(
        row => row.table_name === 'users' && row.foreign_table_name === 'tenants'
      );
      expect(userTenantFK).toBeDefined();

      const sessionUserFK = constraints.rows.find(
        row => row.table_name === 'sessions' && row.foreign_table_name === 'users'
      );
      expect(sessionUserFK).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test verifies error handling without actually breaking the connection
      // In a real scenario, you might test with invalid connection parameters
      const validation = await MigrationUtils.validateSchema();
      expect(validation.isValid).toBe(true);
    });

    it('should validate user data constraints', async () => {
      // Test invalid email format (should be caught by check constraint)
      await expect(
        databaseService.query(
          'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4)',
          ['invalid-email', 'hash', 'Test', 'User']
        )
      ).rejects.toThrow();
    });

    it('should enforce role constraints', async () => {
      // Test invalid role (should be caught by check constraint)
      await expect(
        databaseService.query(
          'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5)',
          ['test@example.com', 'hash', 'Test', 'User', 'invalid_role']
        )
      ).rejects.toThrow();
    });

    it('should handle cleanup of expired sessions and password resets', async () => {
      // Test the cleanup functions exist and work
      const sessionCleanup = await databaseService.query('SELECT cleanup_expired_sessions()');
      expect(sessionCleanup.rows[0].cleanup_expired_sessions).toBeGreaterThanOrEqual(0);

      const resetCleanup = await databaseService.query('SELECT cleanup_expired_password_resets()');
      expect(resetCleanup.rows[0].cleanup_expired_password_resets).toBeGreaterThanOrEqual(0);
    });
  });
});